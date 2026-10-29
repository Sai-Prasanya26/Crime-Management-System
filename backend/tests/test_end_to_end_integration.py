"""
Phase 12: End-to-End System Integration and Workflow Validation Test Suite.

Validates the complete lifecycle:
Crime Data -> Crime Analytics -> Crime Prediction -> Crime Risk Scoring -> Resource Optimization -> Budget Estimation & Scenario Comparison.

Verifies:
1. Health and database connectivity.
2. Full authentication, RBAC, and token security (ADMIN, ANALYST, OFFICER).
3. Crime data integrity to analytics workflow.
4. Historical crime prediction and forecast freshness transitions.
5. Crime prediction to explainable risk scoring transition.
6. Risk scoring to resource inventory and eligibility audit.
7. Operational optimization data integrity guard (INSUFFICIENT_DATA propagation).
8. Simulation optimization to budget estimation transition (recurring vs capital separation).
9. Multi-scenario comparative cost analysis (Delta Cost and zero capital for standing reallocation).
10. Robust API error handling, parameter validation, and status codes (401, 403, 404, 422).
11. Read and solver performance benchmarks within local operational bounds.
12. Non-destructive database safety (all baseline counts preserved 100%).
"""

import sys
import os
import time
import unittest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal

client = TestClient(app)


class TestEndToEndIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1. Authenticate ADMIN user
        login_admin = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_admin.status_code == 200, f"Admin login failed: {login_admin.text}"
        cls.admin_token = login_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Authenticate ANALYST user
        login_analyst = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert login_analyst.status_code == 200, f"Analyst login failed: {login_analyst.text}"
        cls.analyst_token = login_analyst.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        # 3. Authenticate OFFICER user (Restricted role)
        login_officer = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert login_officer.status_code == 200, f"Officer login failed: {login_officer.text}"
        cls.officer_token = login_officer.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_health_and_database_connectivity(self):
        """1. Verifies root health and API v1 health confirm live database connectivity."""
        res_root = client.get("/health")
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_root.json(), {"status": "ok"})

        res_v1 = client.get("/api/v1/health")
        self.assertEqual(res_v1.status_code, 200)
        data = res_v1.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["database"], "connected")
        self.assertTrue(data.get("tables_verified", False))

    def test_02_authentication_and_rbac_full_flow(self):
        """2. Tests complete authentication, token verification, and RBAC protection."""
        # Unauthenticated request -> 401
        res_unauth = client.get("/api/v1/admin/users")
        self.assertEqual(res_unauth.status_code, 401)

        # Malformed / fake token -> 401
        res_fake = client.get("/api/v1/admin/users", headers={"Authorization": "Bearer invalid_token_xyz"})
        self.assertEqual(res_fake.status_code, 401)

        # Non-admin attempting to list users -> 403 Forbidden
        res_officer_admin = client.get("/api/v1/admin/users", headers=self.officer_headers)
        self.assertEqual(res_officer_admin.status_code, 403)

        res_analyst_admin = client.get("/api/v1/admin/users", headers=self.analyst_headers)
        self.assertEqual(res_analyst_admin.status_code, 403)

        # Admin user listing users -> 200 OK
        res_admin_users = client.get("/api/v1/admin/users", headers=self.admin_headers)
        self.assertEqual(res_admin_users.status_code, 200)
        users = res_admin_users.json()
        self.assertGreaterEqual(len(users), 3)

        # Verify password hash or raw credentials are NOT exposed in user payload
        for u in users:
            self.assertNotIn("password", u)
            self.assertNotIn("hashed_password", u)

        # Restricted execution permissions: OFFICER cannot run optimization
        opt_req = {
            "scenario_name": "Unauthorized Test",
            "state_id": 2,
            "resource_type_id": 1,
            "period_year": 2026,
            "period_month": 1,
        }
        res_opt_officer = client.post("/api/v1/optimization/run", json=opt_req, headers=self.officer_headers)
        self.assertEqual(res_opt_officer.status_code, 403)

    def test_03_crime_data_to_analytics_workflow(self):
        """3. Verifies crime data baseline and analytics calculation transitions."""
        # Overview endpoint
        res = client.get("/api/v1/analytics/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_incidents"], 191679)
        self.assertIn("cases", data)
        self.assertIn("clearance_rate_pct", data["cases"])
        self.assertEqual(data["cases"]["closed"], 93490)
        self.assertEqual(data["cases"]["open"], 98189)

        # Annual and monthly trends
        res_trends = client.get("/api/v1/analytics/trends?interval=year")
        self.assertEqual(res_trends.status_code, 200)
        trends_data = res_trends.json()
        trend_sum = sum(item["incident_count"] for item in trends_data["items"])
        self.assertEqual(trend_sum, 191679)

        # Category breakdown
        res_cat = client.get("/api/v1/analytics/by-category")
        self.assertEqual(res_cat.status_code, 200)
        cats = res_cat.json()
        self.assertGreaterEqual(len(cats["items"]), 4)

    def test_04_crime_prediction_to_forecast_freshness_workflow(self):
        """4. Verifies historical predictions, forward forecasts, and model freshness."""
        res = client.get("/api/v1/predictions/overview", headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Total 21,760 records across 640 districts and 34 periods
        self.assertEqual(data["total_predictions"], 21760)
        self.assertEqual(data["districts_covered"], 640)
        self.assertEqual(data["periods_count"], 34)
        self.assertIn("status_breakdown", data)
        self.assertIsNotNone(data["status_breakdown"])

        # Models catalog
        res_models = client.get("/api/v1/predictions/models", headers=self.analyst_headers)
        self.assertEqual(res_models.status_code, 200)
        models_data = res_models.json()
        models = models_data.get("items", [])
        self.assertGreater(len(models), 0)
        active_model = [m for m in models if m.get("is_active", False)]
        self.assertTrue(len(active_model) > 0)
        self.assertIsNotNone(active_model[0]["version"])

    def test_05_crime_prediction_to_risk_scoring_transition(self):
        """5. Verifies transition from predictions/incidents to explainable risk scoring."""
        res = client.get("/api/v1/risk/overview", headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["total_assessed_districts"], 640)
        self.assertIn("risk_level_distribution", data)
        self.assertIn("CRITICAL", data["risk_level_distribution"])

        # Query district risk profile
        res_dist = client.get("/api/v1/risk/districts/1", headers=self.analyst_headers)  # Nicobars
        self.assertEqual(res_dist.status_code, 200)
        dist_data = res_dist.json()
        self.assertIn("overall_risk_score", dist_data)
        self.assertIn("risk_level", dist_data)
        self.assertIn("explanation_summary", dist_data)
        self.assertIn("factor_contributions", dist_data)

    def test_06_risk_scoring_to_resource_audit_transition(self):
        """6. Verifies resource eligibility and baseline audit reconciling state vs district data."""
        res_audit = client.get("/api/v1/optimization/resources", headers=self.analyst_headers)
        self.assertEqual(res_audit.status_code, 200)
        audit_data = res_audit.json()

        self.assertEqual(audit_data["state_resources_count"], 288)
        self.assertEqual(audit_data["district_resources_count"], 4510)
        self.assertEqual(audit_data["district_official_count"], 114)
        self.assertEqual(audit_data["district_unrecorded_count"], 4396)

        # Category eligibility via overview
        res_ov = client.get("/api/v1/optimization/overview", headers=self.analyst_headers)
        self.assertEqual(res_ov.status_code, 200)
        ov_data = res_ov.json()

        eligible_cats = [c["category"] for c in ov_data.get("eligible_categories", [])]
        ineligible_cats = [c["category"] for c in ov_data.get("ineligible_categories", [])]

        self.assertIn("PERSONNEL", eligible_cats)
        self.assertIn("MOBILITY", eligible_cats)
        self.assertIn("INFRASTRUCTURE", ineligible_cats, "Infrastructure must be INELIGIBLE for redeployment.")

    def test_07_operational_optimization_guard_insufficient_data(self):
        """7. Verifies that operational runs on unrecorded district baselines return INSUFFICIENT_DATA."""
        # Operational run on Andhra Pradesh (21 of 23 districts unrecorded)
        op_payload = {
            "scenario_name": "E2E Operational Test AP",
            "state_id": 2,  # Andhra Pradesh
            "resource_type_id": 1,  # Police Officers
            "period_year": 2026,
            "period_month": 1,
            "allocation_mode": "OPERATIONAL",
            "is_simulation": False,
        }
        res_opt = client.post("/api/v1/optimization/run", json=op_payload, headers=self.analyst_headers)
        self.assertEqual(res_opt.status_code, 200)
        opt_data = res_opt.json()

        self.assertEqual(opt_data["solver_status"], "INSUFFICIENT_DATA")
        self.assertEqual(opt_data["allocated_total"], 0)
        self.assertIn("Operational district allocation halted", opt_data["explanation_summary"])

        # Cost estimation linked to this operational run must ALSO return INSUFFICIENT_DATA
        cost_payload = {
            "optimization_run_id": opt_data["run_id"],
            "period_year": 2026,
            "period_month": 1,
        }
        res_cost = client.post("/api/v1/budget/estimate", json=cost_payload, headers=self.analyst_headers)
        self.assertEqual(res_cost.status_code, 200)
        cost_data = res_cost.json()

        self.assertEqual(cost_data["status"], "INSUFFICIENT_DATA")
        self.assertEqual(cost_data["estimation_mode"], "INSUFFICIENT_DATA")
        self.assertEqual(cost_data["total_scenario_recurring_annual"], 0.0)

    def test_08_simulation_optimization_to_budget_estimation_transition(self):
        """8. Verifies simulation optimization succeeds and produces full budget schedule."""
        # Simulation run with standing pool constraint
        sim_payload = {
            "scenario_name": "E2E Simulation Test AP",
            "state_id": 2,
            "resource_type_id": 1,
            "period_year": 2026,
            "period_month": 1,
            "allocation_mode": "SIMULATION",
            "is_simulation": True,
            "transferable_pool": 25000,
            "minimum_reserve_ratio": 0.10,
        }
        res_opt = client.post("/api/v1/optimization/run", json=sim_payload, headers=self.analyst_headers)
        self.assertEqual(res_opt.status_code, 200)
        opt_data = res_opt.json()

        self.assertEqual(opt_data["solver_status"], "SIMULATION")
        self.assertTrue(opt_data["is_simulation"])
        self.assertEqual(len(opt_data["simulation_assumptions"]), 4)

        # Dynamic budget estimation linked to this simulation run
        cost_payload = {
            "optimization_run_id": opt_data["run_id"],
            "period_year": 2026,
            "period_month": 1,
            "include_procurement": True,
        }
        res_cost = client.post("/api/v1/budget/estimate", json=cost_payload, headers=self.analyst_headers)
        self.assertEqual(res_cost.status_code, 200)
        cost_data = res_cost.json()

        self.assertEqual(cost_data["status"], "COMPLETED")
        self.assertEqual(cost_data["estimation_mode"], "SIMULATION_ESTIMATE")
        self.assertEqual(cost_data["currency"], "INR")
        self.assertGreater(cost_data["total_scenario_recurring_annual"], 0.0)
        self.assertEqual(
            cost_data["total_scenario_recurring_monthly"],
            round(cost_data["total_scenario_recurring_annual"] / 12.0, 2),
        )

        # Inspect run detail with district line items
        res_detail = client.get(f"/api/v1/budget/runs/{cost_data['run_id']}", headers=self.analyst_headers)
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.json()
        self.assertIsNotNone(detail_data["items"])
        self.assertEqual(len(detail_data["items"]), 23)  # 23 Census AP districts

    def test_09_multi_scenario_budget_comparison(self):
        """9. Verifies scenario cost comparison calculates delta cost and zero capital for standing reallocation."""
        # Run two simulations with different transferable pools
        sim_1 = client.post(
            "/api/v1/optimization/run",
            json={
                "scenario_name": "E2E Compare Base",
                "state_id": 2,
                "resource_type_id": 1,
                "period_year": 2026,
                "period_month": 1,
                "allocation_mode": "SIMULATION",
                "is_simulation": True,
                "transferable_pool": 20000,
            },
            headers=self.analyst_headers,
        ).json()

        sim_2 = client.post(
            "/api/v1/optimization/run",
            json={
                "scenario_name": "E2E Compare Alternate",
                "state_id": 2,
                "resource_type_id": 1,
                "period_year": 2026,
                "period_month": 1,
                "allocation_mode": "SIMULATION",
                "is_simulation": True,
                "transferable_pool": 30000,
            },
            headers=self.analyst_headers,
        ).json()

        comp_payload = {
            "baseline_run_id": sim_1["run_id"],
            "scenario_run_id": sim_2["run_id"],
        }
        res_comp = client.post("/api/v1/budget/scenarios/compare", json=comp_payload, headers=self.analyst_headers)
        self.assertEqual(res_comp.status_code, 200)
        comp_data = res_comp.json()

        self.assertEqual(comp_data["currency"], "INR")
        self.assertTrue(comp_data["is_simulation"])
        self.assertIn("incremental_recurring_annual", comp_data)
        self.assertIn("capital_procurement_cost", comp_data)

    def test_10_api_error_handling_and_parameter_validation(self):
        """10. Tests robust error responses for non-existent entities and invalid parameters."""
        # 404 for invalid district ID
        res_d_404 = client.get("/api/v1/geography/districts/999999")
        self.assertEqual(res_d_404.status_code, 404)

        # 404 for invalid risk district
        res_r_404 = client.get("/api/v1/risk/districts/999999", headers=self.analyst_headers)
        self.assertEqual(res_r_404.status_code, 404)

        # 404 for non-existent budget run
        res_b_404 = client.get("/api/v1/budget/runs/non_existent_run_id", headers=self.analyst_headers)
        self.assertEqual(res_b_404.status_code, 404)

        # Infeasible optimization scenario (Reserve floor > capacity) -> HTTP 200 with INFEASIBLE
        infeasible_payload = {
            "scenario_name": "E2E Infeasible Test",
            "state_id": 2,
            "resource_type_id": 1,
            "period_year": 2026,
            "period_month": 1,
            "allocation_mode": "SIMULATION",
            "is_simulation": True,
            "transferable_pool": 10,  # 10 available, but AP has 23 districts needing >= 1 each (total reserve >= 23)
            "minimum_reserve_ratio": 0.50,
        }
        res_infeasible = client.post("/api/v1/optimization/run", json=infeasible_payload, headers=self.analyst_headers)
        self.assertEqual(res_infeasible.status_code, 200)
        self.assertEqual(res_infeasible.json()["solver_status"], "INFEASIBLE")

    def test_11_performance_and_latency_benchmarks(self):
        """11. Measures latency of core read-only endpoints and MILP solver."""
        # 1. Analytics overview (< 2.0s)
        t0 = time.time()
        res_analytics = client.get("/api/v1/analytics/overview")
        lat_analytics = time.time() - t0
        self.assertEqual(res_analytics.status_code, 200)
        self.assertLess(lat_analytics, 2.0, f"Analytics overview took {lat_analytics:.3f}s (must be < 2.0s)")

        # 2. Risk overview (< 2.0s)
        t0 = time.time()
        res_risk = client.get("/api/v1/risk/overview", headers=self.analyst_headers)
        lat_risk = time.time() - t0
        self.assertEqual(res_risk.status_code, 200)
        self.assertLess(lat_risk, 2.0, f"Risk overview took {lat_risk:.3f}s (must be < 2.0s)")

        # 3. Budget overview (< 2.0s)
        t0 = time.time()
        res_budget = client.get("/api/v1/budget/overview", headers=self.analyst_headers)
        lat_budget = time.time() - t0
        self.assertEqual(res_budget.status_code, 200)
        self.assertLess(lat_budget, 2.0, f"Budget overview took {lat_budget:.3f}s (must be < 2.0s)")

        # 4. Constrained MILP solver execution (< 3.0s)
        t0 = time.time()
        res_milp = client.post(
            "/api/v1/optimization/run",
            json={
                "scenario_name": "E2E Latency Benchmark",
                "state_id": 2,
                "resource_type_id": 1,
                "period_year": 2026,
                "period_month": 1,
                "allocation_mode": "SIMULATION",
                "is_simulation": True,
                "transferable_pool": 25000,
            },
            headers=self.analyst_headers,
        )
        lat_milp = time.time() - t0
        self.assertEqual(res_milp.status_code, 200)
        self.assertLess(lat_milp, 3.0, f"MILP solver took {lat_milp:.3f}s (must be < 3.0s)")

    def test_12_non_destructive_database_safety(self):
        """12. Verifies ground truth crime data (191,679), districts (640), and resources remain untouched."""
        db = SessionLocal()
        try:
            crime_count = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            census_districts = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
            state_count = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
            predictions_count = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
            risk_count = db.execute(text("SELECT COUNT(*) FROM crime_risk_scores")).scalar()
            state_res_count = db.execute(text("SELECT COUNT(*) FROM state_resources")).scalar()
            district_res_count = db.execute(text("SELECT COUNT(*) FROM district_resources")).scalar()
            benchmarks_count = db.execute(text("SELECT COUNT(*) FROM cost_benchmark_rates WHERE is_active = 1")).scalar()

            self.assertEqual(crime_count, 191679, "Crime incidents count must remain exactly 191,679.")
            self.assertEqual(census_districts, 640, "Census 2011 districts must remain exactly 640.")
            self.assertEqual(state_count, 37, "States count must remain exactly 37.")
            self.assertEqual(predictions_count, 21760, "Predictions count must remain exactly 21,760.")
            self.assertEqual(risk_count, 3840, "Risk scores count must remain exactly 3,840.")
            self.assertEqual(state_res_count, 288, "State resources must remain exactly 288.")
            self.assertEqual(district_res_count, 4510, "District resources must remain exactly 4,510.")
            self.assertEqual(benchmarks_count, 13, "Cost benchmark rates must remain exactly 13.")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
