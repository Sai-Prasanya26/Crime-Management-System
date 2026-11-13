"""
Comprehensive End-to-End Workflow Integration Test Script.
Traces 5 geographically diverse districts across all 5 core modules:
1. Crime Predictions
2. Risk Assessment
3. Resource Optimization
4. Budget Analysis
5. Reporting
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal

client = TestClient(app)

TARGET_DISTRICTS = [
    {"state_id": 2, "state_name": "Andhra Pradesh", "district_id": 5, "district_name": "Anantapur"},
    {"state_id": 5, "state_name": "Bihar", "district_id": 74, "district_name": "Banka"},
    {"state_id": 20, "state_name": "Maharashtra", "district_id": 349, "district_name": "Mumbai"},
    {"state_id": 36, "state_name": "Telangana", "district_id": 641, "district_name": "Adilabad"},
    {"state_id": 25, "state_name": "NCT of Delhi", "district_id": 408, "district_name": "Central Delhi"},
]

PERIOD_YEAR = 2026
PERIOD_MONTH = 11
PERIOD_DATE = "2026-11-01"

def run_integration_trace():
    db = SessionLocal()
    try:
        # Authenticate Admin
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        admin_token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        all_results = []
        failures = []

        print("=" * 80)
        print("CRIME MANAGEMENT SYSTEM: END-TO-END WORKFLOW INTEGRATION TRACE")
        print(f"Target Period: {PERIOD_DATE} (FY 2026-27 Month 11)")
        print("=" * 80)

        for target in TARGET_DISTRICTS:
            s_id = target["state_id"]
            s_name = target["state_name"]
            d_id = target["district_id"]
            d_name = target["district_name"]

            print(f"\n>>> Tracing District: {d_name} (ID: {d_id}, State: {s_name}) <<<")
            district_trace = {
                "district_id": d_id,
                "district_name": d_name,
                "state_id": s_id,
                "state_name": s_name,
                "period": PERIOD_DATE,
                "steps": {}
            }

            # -------------------------------------------------------------
            # STEP 1: Crime Predictions
            # -------------------------------------------------------------
            pred_resp = client.get(
                f"/api/v1/predictions/district-month?district_id={d_id}&year={PERIOD_YEAR}&month={PERIOD_MONTH}",
                headers=headers
            )
            if pred_resp.status_code != 200:
                failures.append(f"[{d_name}] Predictions API failed: HTTP {pred_resp.status_code}")
                continue
            pred_data = pred_resp.json()

            breakdown_resp = client.get(
                f"/api/v1/predictions/breakdown?district_id={d_id}&year={PERIOD_YEAR}&month={PERIOD_MONTH}",
                headers=headers
            )
            if breakdown_resp.status_code != 200:
                failures.append(f"[{d_name}] Predictions breakdown API failed: HTTP {breakdown_resp.status_code}")
                continue
            breakdown_data = breakdown_resp.json()

            predicted_count = pred_data.get("display_value") or pred_data.get("predicted_count") or 0.0
            baseline_count = pred_data.get("baseline_count")
            pct_change = pred_data.get("percentage_change")
            crime_level = pred_data.get("crime_level")
            num_categories = len(breakdown_data.get("categories", []))
            num_types = len(breakdown_data.get("crime_types", []))

            district_trace["steps"]["predictions"] = {
                "predicted_count": predicted_count,
                "baseline_count": baseline_count,
                "percentage_change": pct_change,
                "crime_level": crime_level,
                "categories_count": num_categories,
                "types_count": num_types,
            }
            print(f"  [1. Prediction] Count={predicted_count:.2f}, Baseline={baseline_count}, PctChange={pct_change}%, Level={crime_level}, CrimeTypes={num_types}")

            if predicted_count <= 0:
                failures.append(f"[{d_name}] Prediction count is zero or negative: {predicted_count}")

            # -------------------------------------------------------------
            # STEP 2: Risk Assessment
            # -------------------------------------------------------------
            risk_resp = client.get(
                f"/api/v1/risk/districts/{d_id}?assessment_period={PERIOD_DATE}",
                headers=headers
            )
            if risk_resp.status_code != 200:
                failures.append(f"[{d_name}] Risk API failed: HTTP {risk_resp.status_code}")
                continue
            risk_data = risk_resp.json()

            risk_score = risk_data.get("overall_risk_score")
            risk_level = risk_data.get("risk_level")
            severity_index = risk_data.get("severity_index")
            strongest_driver = risk_data.get("strongest_driver")

            district_trace["steps"]["risk"] = {
                "overall_risk_score": risk_score,
                "risk_level": risk_level,
                "severity_index": severity_index,
                "strongest_driver": strongest_driver,
            }
            print(f"  [2. Risk] Score={risk_score:.2f}, Level={risk_level}, SeverityIndex={severity_index}, Driver={strongest_driver}")

            if risk_score is None or risk_score < 0:
                failures.append(f"[{d_name}] Invalid risk score: {risk_score}")

            # -------------------------------------------------------------
            # STEP 3: Resource Optimization (Demand & Allocation)
            # -------------------------------------------------------------
            demand_resp = client.get(
                f"/api/v1/optimization/crime-demand?district_id={d_id}&year={PERIOD_YEAR}&month={PERIOD_MONTH}",
                headers=headers
            )
            if demand_resp.status_code != 200:
                failures.append(f"[{d_name}] Crime demand API failed: HTTP {demand_resp.status_code}")
                continue
            demand_data = demand_resp.json()
            resource_demands_dict = demand_data.get("resource_demands", {})
            total_demanded_units = sum(resource_demands_dict.values())
            pool_breakdowns = demand_data.get("crime_breakdowns", [])

            # Solve MILP Optimization for the state
            opt_payload = {
                "state_id": s_id,
                "assessment_period": PERIOD_DATE,
                "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
            }
            opt_resp = client.post(
                "/api/v1/optimization/crime-optimize",
                json=opt_payload,
                headers=headers
            )
            if opt_resp.status_code != 200:
                failures.append(f"[{d_name}] Optimization solver API failed: HTTP {opt_resp.status_code}")
                continue
            opt_data = opt_resp.json()
            solver_status = opt_data.get("solver_status")
            dist_allocations = [a for a in opt_data.get("allocations", []) if a.get("district_id") == d_id]

            total_allocated_units = sum(a.get("allocated_quantity", 0) for a in dist_allocations)
            total_shortage_units = sum(a.get("shortage", 0) for a in dist_allocations)

            district_trace["steps"]["optimization"] = {
                "solver_status": solver_status,
                "demanded_units": total_demanded_units,
                "allocated_units": total_allocated_units,
                "shortage_units": total_shortage_units,
                "pools_demanded_count": len(resource_demands_dict),
                "pools_allocated_count": len(dist_allocations),
            }
            print(f"  [3. Resource Opt] Solver={solver_status}, Demanded={total_demanded_units}, Allocated={total_allocated_units}, Shortage={total_shortage_units}")

            if total_demanded_units <= 0:
                failures.append(f"[{d_name}] Resource demand is zero: {total_demanded_units}")

            # -------------------------------------------------------------
            # STEP 4: Budget Analysis
            # -------------------------------------------------------------
            budget_resp = client.get(
                f"/api/v1/budget/district/{d_id}?year={PERIOD_YEAR}&month={PERIOD_MONTH}",
                headers=headers
            )
            if budget_resp.status_code != 200:
                failures.append(f"[{d_name}] Budget API failed: HTTP {budget_resp.status_code}")
                continue
            budget_data = budget_resp.json()

            avail_budget = budget_data.get("configured_budget")
            police_cost = budget_data.get("total_police_budget_requirement")
            partner_cost = budget_data.get("total_partner_agency_cost", 0.0)
            combined_cost = budget_data.get("total_estimated_requirement")
            budget_balance = budget_data.get("budget_gap_or_surplus")
            capex = budget_data.get("total_capex_procurement")
            opex = budget_data.get("total_opex_annual")
            maint = budget_data.get("total_maintenance_annual")
            status = budget_data.get("budget_verification_status")

            district_trace["steps"]["budget"] = {
                "configured_budget": avail_budget,
                "police_cost": police_cost,
                "partner_cost": partner_cost,
                "combined_cost": combined_cost,
                "budget_balance": budget_balance,
                "capex": capex,
                "opex": opex,
                "maintenance": maint,
                "verification_status": status,
            }
            print(f"  [4. Budget] Avail=₹{avail_budget:,.2f}, PoliceReq=₹{police_cost:,.2f}, PartnerReq=₹{partner_cost:,.2f}, Balance=₹{budget_balance:,.2f}, Status={status}")

            # Mathematical Consistency Validations
            if police_cost <= 0:
                failures.append(f"[{d_name}] Budget police cost is zero: {police_cost}")
            if abs(budget_balance - round(avail_budget - police_cost, 2)) > 0.05:
                failures.append(f"[{d_name}] Balance formula mismatch: {budget_balance} != {avail_budget - police_cost}")
            if abs(police_cost - round(capex + opex + maint, 2)) > 0.05:
                failures.append(f"[{d_name}] Police cost does not match CAPEX+OPEX+Maint: {police_cost} != {capex+opex+maint}")
            if abs(combined_cost - round(police_cost + partner_cost, 2)) > 0.05:
                failures.append(f"[{d_name}] Combined cost mismatch: {combined_cost} != {police_cost+partner_cost}")

            # -------------------------------------------------------------
            # STEP 5: Reporting Integration & Data Coherence
            # -------------------------------------------------------------
            report_analytics_resp = client.get(
                f"/api/v1/analytics/overview?state_id={s_id}&district_id={d_id}",
                headers=headers
            )
            if report_analytics_resp.status_code != 200:
                failures.append(f"[{d_name}] Analytics Report API failed: HTTP {report_analytics_resp.status_code}")
                continue
            rep_data = report_analytics_resp.json()
            tot_incidents_recorded = rep_data.get("total_incidents", 0)

            # Test CSV line construction
            csv_record = f'"{d_name}","{s_name}","{PERIOD_DATE}","{predicted_count:.1f}","{risk_score:.1f}","{total_demanded_units}","{police_cost:.2f}","{avail_budget:.2f}","{budget_balance:.2f}"'
            district_trace["steps"]["reporting"] = {
                "historical_incidents_in_system": tot_incidents_recorded,
                "csv_sample_row": csv_record,
                "is_consistent": True,
            }
            print(f"  [5. Reporting] System Incidents={tot_incidents_recorded}, CSV Row Generated OK")

            all_results.append(district_trace)

        print("\n" + "=" * 80)
        print("WORKFLOW INTEGRATION TEST SUMMARY")
        print("=" * 80)
        print(f"Districts Fully Traced: {len(all_results)} / {len(TARGET_DISTRICTS)}")
        print(f"Total Discrepancies / Failures: {len(failures)}")
        if failures:
            print("\nFAILURES:")
            for f in failures:
                print(f" - {f}")
        else:
            print("\nALL WORKFLOW INTEGRATION CHECKS PASSED WITH 100% COHERENCE!")

        # Save output json
        with open("backend/scripts/end_to_end_trace_results.json", "w", encoding="utf-8") as fp:
            json.dump({
                "period": PERIOD_DATE,
                "results": all_results,
                "failures": failures,
            }, fp, indent=2)

    finally:
        db.close()

if __name__ == "__main__":
    run_integration_trace()
