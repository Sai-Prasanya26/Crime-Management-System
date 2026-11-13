import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.geography import State, District
from backend.app.models.budget import StateBudget, DistrictBudgetAllocation
from backend.app.services.budget_service import BudgetService

class TestAllIndiaBudgetCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Admin Login to obtain Bearer token for protected endpoints
        login_res = cls.client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        if login_res.status_code == 200:
            cls.admin_token = login_res.json()["access_token"]
            cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        else:
            cls.admin_headers = {}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_all_states_have_budget_records_2026_and_2027(self):
        """Verify all 37 State/UT entities have valid budget records for 2026 and 2027."""
        states = self.db.query(State).all()
        self.assertGreaterEqual(len(states), 36)

        for year in [2026, 2027]:
            state_budgets = self.db.query(StateBudget).filter(StateBudget.budget_year == year).all()
            self.assertEqual(
                len(state_budgets), len(states),
                f"Expected {len(states)} state budget records for {year}, got {len(state_budgets)}"
            )
            for sb in state_budgets:
                self.assertIsNotNone(sb.annual_budget)
                self.assertGreater(sb.annual_budget, 0, f"State {sb.state_id} has <= 0 annual_budget in {year}")
                self.assertIn(sb.verification_status, ["OFFICIAL_SOURCE", "SANCTIONED_BUDGET", "ADMIN_ESTIMATE"])

    def test_02_all_790_districts_have_budget_allocations_2026_and_2027(self):
        """Verify all 790 active districts have budget allocations matching their canonical state_id."""
        active_districts = self.db.query(District).filter(District.is_current_admin == True).all()
        self.assertEqual(len(active_districts), 790, f"Expected 790 active canonical districts, found {len(active_districts)}")

        dist_state_map = {d.id: d.state_id for d in active_districts}

        for year in [2026, 2027]:
            allocations = self.db.query(DistrictBudgetAllocation).filter(
                DistrictBudgetAllocation.budget_year == year,
                DistrictBudgetAllocation.district_id.in_(list(dist_state_map.keys()))
            ).all()

            self.assertEqual(
                len(allocations), 790,
                f"Expected 790 district allocations for year {year}, found {len(allocations)}"
            )

            for alloc in allocations:
                self.assertIsNotNone(alloc.annual_budget)
                self.assertGreater(alloc.annual_budget, 0, f"District {alloc.district_id} allocation <= 0 in {year}")
                expected_state_id = dist_state_map[alloc.district_id]
                self.assertEqual(
                    alloc.state_id, expected_state_id,
                    f"District {alloc.district_id} state_id mismatch: alloc={alloc.state_id}, dist={expected_state_id}"
                )

    def test_03_zero_cost_eliminated_across_reorganized_districts(self):
        """Verify child reorganized districts return positive police requirement, resolving baseline from parent."""
        test_districts = [641, 642, 644, 689, 690]  # Adilabad, Bhadradri Kothagudem, Hyderabad, Daman, Diu
        for did in test_districts:
            for yr, mo in [(2026, 11), (2027, 1)]:
                res = BudgetService.calculate_district_10pool_budget(self.db, district_id=did, year=yr, month=mo)
                self.assertIsNotNone(res.configured_budget, f"District {did} configured budget is None for {yr}-{mo}")
                self.assertGreater(
                    res.total_police_budget_requirement, 0,
                    f"District {did} has ₹0 police requirement in {yr}-{mo}"
                )
                self.assertIsNotNone(res.budget_gap_or_surplus)

    def test_04_budget_calculation_integrity_and_isolation(self):
        """Verify available budget, balance formula, CAPEX/OPEX summation, and partner isolation."""
        test_dids = [1, 28, 45, 100, 200, 300, 400, 500, 600, 644, 700, 790]
        for did in test_dids:
            res = BudgetService.calculate_district_10pool_budget(self.db, district_id=did, year=2026, month=11)
            self.assertIsNotNone(res.configured_budget)
            self.assertGreater(res.configured_budget, 0)
            self.assertGreater(res.total_police_budget_requirement, 0)

            # Verification of mathematical consistency: Available Budget - Police Cost = Balance
            expected_balance = round(res.configured_budget - res.total_police_budget_requirement, 2)
            self.assertAlmostEqual(res.budget_gap_or_surplus, expected_balance, places=2)

            # Verification of CAPEX + OPEX + Maintenance summation = Police Requirement
            breakdown_sum = round(res.total_capex_procurement + res.total_opex_annual + res.total_maintenance_annual, 2)
            self.assertAlmostEqual(res.total_police_budget_requirement, breakdown_sum, places=2)

            # Verification of partner agency isolation
            self.assertGreaterEqual(res.total_partner_agency_cost, 0)
            # Total estimated cost must equal police requirement + partner requirement
            combined_sum = round(res.total_police_budget_requirement + res.total_partner_agency_cost, 2)
            self.assertAlmostEqual(res.total_estimated_requirement, combined_sum, places=2)

    def test_05_api_district_budget_endpoint_responses(self):
        """Verify API response structure and status code for multiple districts and periods."""
        test_cases = [
            (1, 2026, 11),
            (28, 2026, 11),
            (641, 2026, 11),
            (644, 2026, 11),
            (689, 2027, 1),
            (700, 2027, 1),
        ]
        for did, yr, mo in test_cases:
            resp = self.client.get(
                f"/api/v1/budget/district/{did}?year={yr}&month={mo}",
                headers=self.admin_headers
            )
            self.assertEqual(resp.status_code, 200, f"Failed for district {did} in {yr}-{mo}: {resp.text}")
            data = resp.json()
            self.assertEqual(data["district_id"], did)
            self.assertIsNotNone(data["configured_budget"])
            self.assertGreater(data["configured_budget"], 0)
            self.assertGreater(data["total_police_budget_requirement"], 0)
            self.assertIn("budget_verification_status", data)

if __name__ == "__main__":
    unittest.main()
