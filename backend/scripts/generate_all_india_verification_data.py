import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import SessionLocal
from backend.app.models.geography import State, District
from backend.app.models.budget import StateBudget, DistrictBudgetAllocation
from backend.app.services.budget_service import BudgetService

def generate_report_data():
    db = SessionLocal()
    try:
        states = db.query(State).order_by(State.id).all()
        active_districts = db.query(District).filter(District.is_current_admin == True).all()

        state_dist_map = {}
        for d in active_districts:
            state_dist_map.setdefault(d.state_id, []).append(d)

        print(f"Total States: {len(states)}")
        print(f"Total Active Districts: {len(active_districts)}")

        state_stats_2026 = []
        state_stats_2027 = []

        total_police_req_2026 = 0.0
        total_avail_budget_2026 = 0.0
        total_police_req_2027 = 0.0
        total_avail_budget_2027 = 0.0

        for s in states:
            dists = state_dist_map.get(s.id, [])
            if not dists:
                continue

            sb_2026 = db.query(StateBudget).filter(StateBudget.state_id == s.id, StateBudget.budget_year == 2026).first()
            sb_2027 = db.query(StateBudget).filter(StateBudget.state_id == s.id, StateBudget.budget_year == 2027).first()

            s_outlay_2026 = float(sb_2026.annual_budget) if sb_2026 and sb_2026.annual_budget else 0.0
            s_outlay_2027 = float(sb_2027.annual_budget) if sb_2027 and sb_2027.annual_budget else 0.0

            s_dist_alloc_2026 = 0.0
            s_dist_req_2026 = 0.0
            s_dist_alloc_2027 = 0.0
            s_dist_req_2027 = 0.0

            for d in dists:
                # 2026-11
                res_2026 = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=2026, month=11)
                s_dist_alloc_2026 += (res_2026.configured_budget or 0.0)
                s_dist_req_2026 += res_2026.total_police_budget_requirement

                # 2027-01
                res_2027 = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=2027, month=1)
                s_dist_alloc_2027 += (res_2027.configured_budget or 0.0)
                s_dist_req_2027 += res_2027.total_police_budget_requirement

            total_avail_budget_2026 += s_dist_alloc_2026
            total_police_req_2026 += s_dist_req_2026
            total_avail_budget_2027 += s_dist_alloc_2027
            total_police_req_2027 += s_dist_req_2027

            state_stats_2026.append({
                "state_id": s.id,
                "state_name": s.state_name,
                "district_count": len(dists),
                "state_outlay_cr": round(s_outlay_2026 / 1e7, 2),
                "dist_alloc_cr": round(s_dist_alloc_2026 / 1e7, 2),
                "dist_req_cr": round(s_dist_req_2026 / 1e7, 2),
                "balance_cr": round((s_dist_alloc_2026 - s_dist_req_2026) / 1e7, 2),
                "dist_alloc_2027_cr": round(s_dist_alloc_2027 / 1e7, 2),
                "dist_req_2027_cr": round(s_dist_req_2027 / 1e7, 2),
            })

        print("\n--- STATE SUMMARY TABLE ---")
        print("| State ID | State / UT Name | Districts | State Outlay (Cr) | 2026 District Grants (Cr) | 2026 Police Cost (Cr) | 2026 Balance (Cr) | 2027 Grants (Cr) | Status |")
        print("|---|---|---|---|---|---|---|---|---|")
        for st in state_stats_2026:
            status = "Surplus" if st["balance_cr"] >= 0 else "Deficit"
            print(f"| {st['state_id']} | {st['state_name']} | {st['district_count']} | ₹{st['state_outlay_cr']:.2f} | ₹{st['dist_alloc_cr']:.2f} | ₹{st['dist_req_cr']:.2f} | ₹{st['balance_cr']:.2f} | ₹{st['dist_alloc_2027_cr']:.2f} | {status} |")

        print(f"\nALL-INDIA TOTALS (2026):")
        print(f"Total District Allocation Pool: ₹{total_avail_budget_2026 / 1e7:.2f} Cr")
        print(f"Total Police Requirement: ₹{total_police_req_2026 / 1e7:.2f} Cr")
        print(f"Net Balance: ₹{(total_avail_budget_2026 - total_police_req_2026) / 1e7:.2f} Cr")

        print(f"\nALL-INDIA TOTALS (2027):")
        print(f"Total District Allocation Pool: ₹{total_avail_budget_2027 / 1e7:.2f} Cr")
        print(f"Total Police Requirement: ₹{total_police_req_2027 / 1e7:.2f} Cr")
        print(f"Net Balance: ₹{(total_avail_budget_2027 - total_police_req_2027) / 1e7:.2f} Cr")

    finally:
        db.close()

if __name__ == "__main__":
    generate_report_data()
