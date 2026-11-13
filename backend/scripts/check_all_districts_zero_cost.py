import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import SessionLocal
from backend.app.models.geography import District
from backend.app.services.budget_service import BudgetService

def check_all_districts_zero_cost():
    db = SessionLocal()
    try:
        active_districts = db.query(District).filter(District.is_current_admin == True).order_by(District.id).all()
        print(f"Testing {len(active_districts)} active districts...")

        for yr, mo in [(2026, 11), (2027, 1)]:
            zero_req = []
            nonzero_req = []
            none_budget = []
            
            for d in active_districts:
                res = BudgetService.calculate_district_10pool_budget(db, district_id=d.id, year=yr, month=mo)
                if res.configured_budget is None:
                    none_budget.append(d.id)
                if res.total_police_budget_requirement == 0:
                    zero_req.append((d.id, d.district_name, d.state_id))
                else:
                    nonzero_req.append(d.id)

            print(f"\n--- Period: {yr}-{mo:02d} ---")
            print(f"Districts with Configured Budget: {len(active_districts) - len(none_budget)} / {len(active_districts)}")
            print(f"Districts with Positive Police Requirement: {len(nonzero_req)} / {len(active_districts)}")
            print(f"Districts with ₹0 Police Requirement: {len(zero_req)} / {len(active_districts)}")
            if zero_req:
                print(f"Sample districts returning ₹0 in {yr}-{mo:02d}:")
                for it in zero_req[:10]:
                    print(f"   District {it[0]} ({it[1]}, State {it[2]})")

    finally:
        db.close()

if __name__ == "__main__":
    check_all_districts_zero_cost()
