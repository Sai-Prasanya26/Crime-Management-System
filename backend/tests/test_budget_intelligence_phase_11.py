"""
Phase 11: Budget Intelligence Module Comprehensive Test Suite.

Verifies:
1. Canonical 10-Pool Coverage: All 10 Phase 10 resource pools in ResourceCostMaster with provenance.
2. CAPEX and OPEX Separation: Strict mathematical division between capital procurement and recurring operational/maintenance.
3. Existing Inventory Crediting: Procurement = max(0, recommended - inventory); unrecorded baseline safeguards.
4. Partner Agency Isolation: Ambulances (EMERGENCY_RESPONSE) tracked separately and excluded from police budget totals.
5. Zero-Fabrication Standard: Missing budgets labeled NOT_CONFIGURED without assuming zero.
6. State Budget Summary & Gap Analysis: Verified allocation vs demand comparisons.
7. District-Level Register & 10-Pool Breakdown: Itemized calculations for all 10 pools per district.
8. Full 10-Pool Macro Overview API: System-wide financial requirement aggregation and warnings.
9. Scenario Simulator Isolation: In-memory simulation leaves database records unmutated.
10. Scenario Persistence: Saved scenario CRUD.
11. Cost Master Administration & RBAC: Admin updates permitted; Officer (403) and Public (401) restricted.
12. Single State & District Detail Endpoints: Validates /state/{id} and /district/{id}.
13. Audit & Calculation History: Preserved historical traceability.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.budget import (
    ResourceCostMaster,
    StateBudget,
    DistrictBudgetAllocation,
    BudgetScenario,
    BudgetCalculationHistory,
)
from backend.app.services.budget_service import BudgetService

client = TestClient(app)


class TestBudgetIntelligencePhase11(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1. Admin Login
        login_admin = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_admin.status_code == 200, f"Admin login failed: {login_admin.text}"
        cls.admin_token = login_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Analyst Login
        login_analyst = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert login_analyst.status_code == 200, f"Analyst login failed: {login_analyst.text}"
        cls.analyst_token = login_analyst.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        # 3. Officer Login (Restricted role)
        login_officer = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert login_officer.status_code == 200, f"Officer login failed: {login_officer.text}"
        cls.officer_token = login_officer.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_resource_cost_master_canonical_10_pools(self):
        """1. Verifies ResourceCostMaster contains all 10 canonical Phase 10 resource pools."""
        resp = client.get("/api/v1/budget/cost-master", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()

        self.assertGreaterEqual(len(items), 10, "Expected at least 10 cost master records.")

        categories = {item["resource_category"] for item in items}
        expected_categories = {
            "PERSONNEL",
            "MOBILITY",
            "INVESTIGATION",
            "SPECIALIZED",
            "SURVEILLANCE",
            "FORENSIC",
            "CYBER_TECHNOLOGY",
            "EMERGENCY_RESPONSE",
            "COMMUNICATION",
            "TRAFFIC_SAFETY",
        }
        for cat in expected_categories:
            self.assertIn(cat, categories, f"Expected category {cat} in cost master.")

        # Check partner agency flag
        emergency_item = next(it for it in items if it["resource_category"] == "EMERGENCY_RESPONSE")
        self.assertTrue(emergency_item["is_partner_agency"], "EMERGENCY_RESPONSE must be marked is_partner_agency=True.")

        personnel_item = next(it for it in items if it["resource_category"] == "PERSONNEL")
        self.assertFalse(personnel_item["is_partner_agency"], "PERSONNEL must not be marked partner agency.")

    def test_02_capex_and_opex_separation(self):
        """2. Verifies mathematical division between capital acquisition and recurring operating/maintenance."""
        resp = client.get("/api/v1/budget/district/1", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        capex = data["total_capex_procurement"]
        opex_annual = data["total_opex_annual"]
        maintenance = data["total_maintenance_annual"]
        partner_cost = data["total_partner_agency_cost"]
        police_total = data["total_police_budget_requirement"]
        gross_total = data["total_estimated_requirement"]

        # CAPEX, OPEX, Maintenance are non-negative
        self.assertGreaterEqual(capex, 0)
        self.assertGreaterEqual(opex_annual, 0)
        self.assertGreaterEqual(maintenance, 0)

        # Police requirement = capex (for police pools) + opex (for police pools) + maintenance (for police pools)
        # Gross total = police_total + partner_cost
        self.assertAlmostEqual(gross_total, police_total + partner_cost, places=1)

        # Check each pool item in breakdown
        for pool in data["pool_breakdown"]:
            total_calc = pool["total_acquisition_cost"] + pool["annual_operating_cost"] + pool["annual_maintenance_cost"]
            self.assertAlmostEqual(pool["total_annual_requirement"], total_calc, places=1)
            self.assertAlmostEqual(pool["annual_operating_cost"], pool["monthly_operating_cost"] * 12, places=1)

    def test_03_existing_inventory_crediting_and_unrecorded_guard(self):
        """3. Verifies procurement crediting (procurement = max(0, recommended - inventory)) and unrecorded flags."""
        resp = client.get("/api/v1/budget/district/1", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        for pool in data["pool_breakdown"]:
            rec = pool["recommended_units"]
            inv = pool["existing_inventory_units"]
            proc = pool["procurement_units"]

            if pool["inventory_status"] == "UNRECORDED":
                # Unrecorded baseline: procurement equals recommended (replacement ceiling)
                self.assertEqual(proc, rec)
            else:
                self.assertEqual(proc, max(0, rec - inv))

    def test_04_partner_agency_cost_separation(self):
        """4. Verifies Ambulances (EMERGENCY_RESPONSE) are excluded from direct police budget totals."""
        resp = client.get("/api/v1/budget/full-overview?year=2026&month=11", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        police_req = data["total_police_budget_requirement"]
        partner_cost = data["total_partner_agency_cost"]
        gross_req = data["total_gross_estimated_requirement"]

        self.assertGreater(partner_cost, 0, "Partner agency cost for ambulances should be positive.")
        self.assertAlmostEqual(gross_req, police_req + partner_cost, places=1)

        # Ensure ambulance costs are flagged in category breakdown
        cat_breakdown = data["category_expenditure_breakdown"]
        self.assertIn("EMERGENCY_RESPONSE", cat_breakdown)
        self.assertTrue(cat_breakdown["EMERGENCY_RESPONSE"]["is_partner_agency"])

    def test_05_missing_statutory_budget_not_configured(self):
        """5. Verifies unconfigured budgets return None and NOT_CONFIGURED without fabricating numbers."""
        resp = client.get("/api/v1/budget/states/summary", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()

        unconfigured = [it for it in items if it["budget_verification_status"] == "NOT_CONFIGURED"]
        self.assertGreater(len(unconfigured), 0, "Expected unconfigured states to be present.")

        for u in unconfigured:
            self.assertIsNone(u["configured_annual_budget"])
            self.assertIsNone(u["budget_gap_or_surplus"])

    def test_06_state_budget_summary_and_gap_analysis(self):
        """6. Verifies state budget summary returns state-level requirement and statutory gap/surplus."""
        resp = client.get("/api/v1/budget/states/summary?year=2026&month=11", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()

        self.assertGreaterEqual(len(items), 30, "Expected at least 30 state summary records.")

        # For configured states, verify budget_gap_or_surplus = configured - police_requirement
        configured = [it for it in items if it["configured_annual_budget"] is not None]
        self.assertGreater(len(configured), 0, "Expected at least some configured states.")

        for c in configured:
            expected_gap = c["configured_annual_budget"] - c["total_police_budget_requirement"]
            self.assertAlmostEqual(c["budget_gap_or_surplus"], expected_gap, places=1)

    def test_07_district_budget_register_and_10pool_endpoint(self):
        """7. Verifies district budget register pagination, filtering, and itemized 10-pool details."""
        resp = client.get("/api/v1/budget/districts/summary?limit=10", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertEqual(len(data["items"]), 10)

        # Check first district
        dist = data["items"][0]
        self.assertIn("district_id", dist)
        self.assertIn("pool_breakdown", dist)
        self.assertEqual(len(dist["pool_breakdown"]), 10, "District breakdown must contain all 10 pools.")

        # Test single district endpoint
        d_id = dist["district_id"]
        single_resp = client.get(f"/api/v1/budget/district/{d_id}", headers=self.analyst_headers)
        self.assertEqual(single_resp.status_code, 200)
        single_data = single_resp.json()
        self.assertEqual(single_data["district_id"], d_id)

    def test_08_full_overview_endpoint(self):
        """8. Verifies full 10-pool macroeconomic overview endpoint returns complete fiscal metrics."""
        resp = client.get("/api/v1/budget/full-overview", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("total_gross_estimated_requirement", data)
        self.assertIn("total_police_budget_requirement", data)
        self.assertIn("total_partner_agency_cost", data)
        self.assertIn("category_expenditure_breakdown", data)
        self.assertIn("capex_vs_opex_summary", data)
        self.assertIn("warnings", data)
        self.assertIn("planning_disclaimer", data)

    def test_09_budget_simulation_isolation(self):
        """9. Verifies scenario simulation is strictly in-memory and does not alter database tables."""
        db = SessionLocal()
        try:
            initial_cost_count = db.query(ResourceCostMaster).count()
            initial_budget_count = db.query(StateBudget).count()
        finally:
            db.close()

        sim_payload = {
            "period_year": 2026,
            "period_month": 11,
            "total_budget_limit": 5000000000.0,  # ₹500 Cr
            "category_budget_limits": {"PERSONNEL": 3000000000.0},
            "operating_assumptions": {
                "category_pct_adjustments": {"MOBILITY": 20, "SURVEILLANCE": 50},
                "prioritize_by_risk": True,
            },
        }

        resp = client.post("/api/v1/budget/simulate", json=sim_payload, headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        res_data = resp.json()

        self.assertIn("scenario_id", res_data)
        self.assertIn("baseline_police_requirement", res_data)
        self.assertIn("proposed_police_requirement", res_data)
        self.assertIn("category_summary", res_data)

        # Verify DB counts are completely unchanged
        db = SessionLocal()
        try:
            self.assertEqual(db.query(ResourceCostMaster).count(), initial_cost_count)
            self.assertEqual(db.query(StateBudget).count(), initial_budget_count)
        finally:
            db.close()

    def test_10_save_and_list_budget_scenarios(self):
        """10. Verifies saving and retrieving budget scenarios."""
        scenario_data = {
            "name": "Phase 11 Unit Test Scenario",
            "description": "Automated validation scenario",
            "budget_year": 2026,
            "budget_month": 11,
            "total_budget_limit": 1000000000.0,
            "operating_assumptions": {"prioritize_by_risk": True},
        }

        create_resp = client.post("/api/v1/budget/scenarios", json=scenario_data, headers=self.analyst_headers)
        self.assertEqual(create_resp.status_code, 201)
        created = create_resp.json()
        self.assertEqual(created["name"], scenario_data["name"])

        # List scenarios
        list_resp = client.get("/api/v1/budget/scenarios", headers=self.analyst_headers)
        self.assertEqual(list_resp.status_code, 200)
        scenarios = list_resp.json()
        names = [s["name"] for s in scenarios]
        self.assertIn("Phase 11 Unit Test Scenario", names)

    def test_11_cost_master_crud_and_rbac(self):
        """11. Verifies Cost Master RBAC (Admin 200, Officer 403, Unauth 401)."""
        # 1. Unauthenticated -> 401
        unauth_resp = client.put("/api/v1/budget/cost-master/1", json={"notes": "Unauth attempt"})
        self.assertEqual(unauth_resp.status_code, 401)

        # 2. Officer (non-admin) -> 403
        officer_resp = client.put(
            "/api/v1/budget/cost-master/1",
            json={"notes": "Officer attempt"},
            headers=self.officer_headers,
        )
        self.assertEqual(officer_resp.status_code, 403)

        # 3. Admin -> 200
        admin_resp = client.put(
            "/api/v1/budget/cost-master/1",
            json={"notes": "Admin test update"},
            headers=self.admin_headers,
        )
        self.assertEqual(admin_resp.status_code, 200)
        self.assertEqual(admin_resp.json()["notes"], "Admin test update")

    def test_12_single_state_detail_endpoint(self):
        """12. Verifies GET /api/v1/budget/state/{state_id} endpoint."""
        resp = client.get("/api/v1/budget/state/2", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["state_id"], 2)
        self.assertIn("total_police_budget_requirement", data)

        # Invalid state ID -> 404
        bad_resp = client.get("/api/v1/budget/state/999999", headers=self.analyst_headers)
        self.assertEqual(bad_resp.status_code, 404)

    def test_13_budget_calculation_history(self):
        """13. Verifies GET /api/v1/budget/history returns calculation audit logs."""
        resp = client.get("/api/v1/budget/history", headers=self.analyst_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)


if __name__ == "__main__":
    unittest.main()
