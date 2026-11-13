"""
Read-Only Functional Verification Script for All-India Budget Intelligence.
Tests representative districts from all 28 States and 8 Union Territories (+ Ladakh).
Validates 2026 and 2027 figures, mathematical consistency, zero-cost elimination,
and Phase 8 prediction preservation.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.geography import State, District
from backend.app.services.budget_service import BudgetService
from sqlalchemy import text

client = TestClient(app)

def run_verification():
    db = SessionLocal()
    try:
        # Admin Login
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        if login_res.status_code != 200:
            print(f"[FAIL] Login failed: {login_res.text}")
            return False
        admin_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        states = db.query(State).order_by(State.id).all()
        print(f"Total States/UTs in database: {len(states)}")

        # Map active districts per state
        active_districts = db.query(District).filter(District.is_current_admin == True).order_by(District.id).all()
        state_district_map = {}
        for d in active_districts:
            state_district_map.setdefault(d.state_id, []).append(d)

        print(f"Total Active Canonical Districts: {len(active_districts)}")

        results = []
        failures = []

        # Iterate over all 37 jurisdictions (28 States + 8 UTs + Ladakh)
        for s in states:
            dists = state_district_map.get(s.id, [])
            if not dists:
                failures.append(f"State {s.id} ({s.state_name}) has 0 active districts.")
                continue

            # Pick 2 representative districts: first (often capital/major) and last or carved
            sample_dists = [dists[0]]
            if len(dists) > 1:
                sample_dists.append(dists[-1])

            state_res = {
                "state_id": s.id,
                "state_name": s.state_name,
                "total_districts": len(dists),
                "samples_tested": []
            }

            for d in sample_dists:
                for yr, mo in [(2026, 11), (2027, 1)]:
                    # 1. Test live API endpoint
                    resp = client.get(f"/api/v1/budget/district/{d.id}?year={yr}&month={mo}", headers=headers)
                    if resp.status_code != 200:
                        failures.append(f"API Failed for District {d.id} ({d.district_name}) in {yr}-{mo}: HTTP {resp.status_code}")
                        continue

                    data = resp.json()

                    # 2. Extract values
                    avail_budget = data.get("configured_budget")
                    police_cost = data.get("total_police_budget_requirement")
                    partner_cost = data.get("total_partner_agency_cost", 0.0)
                    total_est = data.get("total_estimated_requirement")
                    balance = data.get("budget_gap_or_surplus")
                    capex = data.get("total_capex_procurement")
                    opex = data.get("total_opex_annual")
                    maint = data.get("total_maintenance_annual")
                    status = data.get("budget_verification_status")

                    # 3. Verification Checks
                    # Check A: Available budget must exist and be > 0
                    if avail_budget is None or avail_budget <= 0:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Available budget is missing or <= 0")

                    # Check B: Police requirement must be positive (NO ₹0 bug)
                    if police_cost is None or police_cost <= 0:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Police requirement is ₹0 or missing")

                    # Check C: Balance formula: Available Budget - Police Cost = Balance
                    expected_bal = round(avail_budget - police_cost, 2)
                    if abs(balance - expected_bal) > 0.05:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Balance mismatch. Got {balance}, expected {expected_bal}")

                    # Check D: CAPEX + OPEX + Maintenance = Police Requirement
                    breakdown_sum = round(capex + opex + maint, 2)
                    if abs(police_cost - breakdown_sum) > 0.05:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Police cost mismatch with breakdown. Got {police_cost}, expected {breakdown_sum}")

                    # Check E: Combined Requirement = Police Cost + Partner Cost
                    combined_sum = round(police_cost + partner_cost, 2)
                    if abs(total_est - combined_sum) > 0.05:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Total estimated cost mismatch. Got {total_est}, expected {combined_sum}")

                    # Check F: Partner cost not deducted from police available budget
                    # Balance strictly matches avail_budget - police_cost (verified above in Check C)

                    # Check G: Provenance status is valid
                    if status not in ["OFFICIAL_SOURCE", "SANCTIONED_BUDGET", "ADMIN_ESTIMATE"]:
                        failures.append(f"District {d.id} ({d.district_name}) {yr}-{mo}: Unexpected verification status: {status}")

                    state_res["samples_tested"].append({
                        "district_id": d.id,
                        "district_name": d.district_name,
                        "year": yr,
                        "month": mo,
                        "avail_budget_inr": avail_budget,
                        "police_cost_inr": police_cost,
                        "partner_cost_inr": partner_cost,
                        "balance_inr": balance,
                        "capex_inr": capex,
                        "opex_inr": opex,
                        "maint_inr": maint,
                        "status": status,
                    })

            results.append(state_res)

        print(f"\nCompleted verification for {len(results)} States/UTs.")
        print(f"Total Failures: {len(failures)}")
        if failures:
            print("\nFAILURES DETECTED:")
            for f in failures[:20]:
                print(f" - {f}")
        else:
            print("\nALL CHECKS PASSED PERFECTLY!")

        # 4. Check Phase 8 prediction preservation for child vs parent
        print("\n--- CHECKING PHASE 8 PREDICTION PRESERVATION ON CARVED DISTRICTS ---")
        child_test_cases = [
            (641, 9, "Adilabad (child) vs Parent (9)"),
            (642, 9, "Bhadradri Kothagudem (child) vs Parent (9)"),
            (644, 9, "Hyderabad (644) vs District 9"),
        ]
        for child_id, parent_id, label in child_test_cases:
            child_pred = db.execute(
                text("SELECT predicted_crime_count FROM crime_predictions WHERE district_id = :did AND prediction_date = '2026-11-01'"),
                {"did": child_id}
            ).scalar()
            parent_pred = db.execute(
                text("SELECT predicted_crime_count FROM crime_predictions WHERE district_id = :did AND prediction_date = '2026-11-01'"),
                {"did": parent_id}
            ).scalar()
            
            # API endpoint output
            api_pred = client.get(f"/api/v1/predictions/district-month?district_id={child_id}&year=2026&month=11", headers=headers).json()
            disp_val = api_pred.get("display_value")
            
            print(f"Case {label}:")
            print(f"   Stored Child Prediction: {child_pred}")
            print(f"   Stored Parent Prediction: {parent_pred}")
            print(f"   API display_value: {disp_val}")
            if child_pred is not None and abs(float(child_pred) - float(disp_val)) < 0.01:
                print("   [OK] API returns exact child Phase 8 prediction!")
            else:
                print("   [MISMATCH] Stored child prediction does not match API display_value!")

        # Save summary JSON for report generation
        with open("backend/scripts/verification_summary.json", "w", encoding="utf-8") as fp:
            json.dump({
                "total_states": len(states),
                "total_districts": len(active_districts),
                "states": results,
                "failures": failures,
            }, fp, indent=2)

    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
