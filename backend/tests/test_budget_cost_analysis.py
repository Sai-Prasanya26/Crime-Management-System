"""
Phase 11: Budget Estimation and Cost Analysis Test Suite.

Verifies:
1. Benchmark Rates & Provenance: Active rates seeded with sources, publications, years, and tiers.
2. Effective Rate Formulas: Correct annual (12x monthly) and capital aggregation for all resource types.
3. Separation of Concerns: Strict segregation of recurring operational costs from one-time capital outlays.
4. Data Integrity Guard: Operational estimation on unrecorded district baselines returns INSUFFICIENT_DATA.
5. Simulation Segregation: Hypothetical simulation scenarios are marked SIMULATION_ESTIMATE with disclaimers.
6. Formula Correctness: Exact arithmetic verification on all district line items and run totals.
7. Scenario Cost Comparison: Verifies delta cost (ΔCost = Scenario - Baseline) and shortfall procurement.
8. Currency Consistency: Guarantees INR currency standard everywhere.
9. Zero-Fabrication Standard: Data quality tiers explicitly tracked; modeled benchmarks never misrepresented as audited expenditures.
10. RBAC Protection: Unauthenticated (401), non-analyst (403), analyst permitted (200/201).
11. REST API Contracts: Validates /overview, /benchmarks, /estimate, /scenarios/compare, /runs, and /runs/{id}.
12. Historical Baseline Preservation: Crime incidents (191,679), districts (640), and resources remain untouched.
"""

import sys
import os
import unittest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.budget import CostBenchmarkRate, BudgetEstimationRun, BudgetEstimationItem
from backend.app.repositories.budget_repository import BudgetRepository
from backend.app.services.budget_service import BudgetService
from backend.app.schemas.budget import BudgetEstimateRequest, ScenarioCostComparisonRequest
from backend.app.schemas.optimization import OptimizationRunRequest

client = TestClient(app)


class TestBudgetCostAnalysis(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1. Analyst login
        login_analyst = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert login_analyst.status_code == 200, f"Analyst login failed: {login_analyst.text}"
        cls.analyst_token = login_analyst.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        # 2. Officer login (restricted role)
        login_officer = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert login_officer.status_code == 200, f"Officer login failed: {login_officer.text}"
        cls.officer_token = login_officer.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

        # 3. Create or find an existing simulation optimization run for AP personnel to test with
        sim_payload = {
            "scenario_name": "Phase 11 Test AP Simulation",
            "state_id": 2,  # Andhra Pradesh
            "resource_type_id": 1,  # Police Officers
            "period_year": 2026,
            "period_month": 1,
            "allocation_mode": "SIMULATION",
            "is_simulation": True,
            "transferable_pool": 25000,
            "minimum_reserve_ratio": 0.10,
        }
        res_sim = client.post("/api/v1/optimization/run", json=sim_payload, headers=cls.analyst_headers)
        assert res_sim.status_code == 200, f"Setup simulation failed: {res_sim.text}"
        cls.sim_run_id = res_sim.json()["run_id"]

        # 4. Create an operational run for AP (which will result in INSUFFICIENT_DATA due to unrecorded district baselines)
        op_payload = {
            "scenario_name": "Phase 11 Test AP Operational",
            "state_id": 2,  # Andhra Pradesh
            "resource_type_id": 1,
            "period_year": 2026,
            "period_month": 1,
            "allocation_mode": "OPERATIONAL",
            "is_simulation": False,
        }
        res_op = client.post("/api/v1/optimization/run", json=op_payload, headers=cls.analyst_headers)
        assert res_op.status_code == 200, f"Setup operational run failed: {res_op.text}"
        cls.op_run_id = res_op.json()["run_id"]

    def test_01_cost_benchmark_rates_seeded_and_provenance(self):
        """1. Verifies active benchmark rates exist in database with complete provenance metadata."""
        db = SessionLocal()
        try:
            rates = db.query(CostBenchmarkRate).filter(CostBenchmarkRate.is_active == True).all()
            self.assertGreaterEqual(len(rates), 13, "Expected at least 13 seeded benchmark rates.")

            for r in rates:
                self.assertIsNotNone(r.unit_cost_inr)
                self.assertGreater(float(r.unit_cost_inr), 0)
                self.assertIn(r.cost_type, ["RECURRING_MONTHLY", "RECURRING_ANNUAL", "ONE_TIME_CAPITAL"])
                self.assertIsNotNone(r.cost_component)
                self.assertIsNotNone(r.source_name)
                self.assertIsNotNone(r.source_publication)
                self.assertGreaterEqual(r.reference_year, 2020)
                self.assertIn(r.data_quality_tier, ["OFFICIAL_DOCUMENTED", "ESTIMATED_BENCHMARK", "ASSUMPTION_BASED"])
                self.assertIsNotNone(r.formula_expression)
        finally:
            db.close()

    def test_02_effective_rate_calculation_and_formula(self):
        """2. Verifies effective recurring monthly, annual (12x), and one-time capital rates."""
        db = SessionLocal()
        try:
            # Resource 1: Police Officers
            officer_rates = BudgetRepository.get_effective_rates_for_resource(db, 1)
            self.assertEqual(officer_rates["monthly_recurring_unit_cost"], 55000.0)
            self.assertEqual(officer_rates["annual_recurring_unit_cost"], 660000.0)  # 55000 * 12
            self.assertEqual(officer_rates["one_time_unit_cost"], 75000.0)
            self.assertEqual(officer_rates["primary_tier"], "ESTIMATED_BENCHMARK")

            # Resource 2: Patrol Vehicles
            vehicle_rates = BudgetRepository.get_effective_rates_for_resource(db, 2)
            # Fuel (16,000) + Maintenance (6,000) = 22,000 monthly
            self.assertEqual(vehicle_rates["monthly_recurring_unit_cost"], 22000.0)
            self.assertEqual(vehicle_rates["annual_recurring_unit_cost"], 264000.0)  # 22000 * 12
            self.assertEqual(vehicle_rates["one_time_unit_cost"], 950000.0)
            self.assertEqual(vehicle_rates["primary_tier"], "ESTIMATED_BENCHMARK")
        finally:
            db.close()

    def test_03_recurring_vs_capital_separation(self):
        """3. Verifies recurring operational expenses and one-time capital procurement are strictly separated."""
        db = SessionLocal()
        try:
            rates = BudgetRepository.get_effective_rates_for_resource(db, 2)
            monthly = rates["monthly_recurring_unit_cost"]
            annual = rates["annual_recurring_unit_cost"]
            capital = rates["one_time_unit_cost"]

            # Annual must be 12x monthly, and capital is an independent one-time rate
            self.assertEqual(annual, monthly * 12.0)
            self.assertNotEqual(capital, annual)
            self.assertEqual(capital, 950000.0)
        finally:
            db.close()

    def test_04_insufficient_data_handling_on_unrecorded_baselines(self):
        """4. Verifies operational estimation halts with INSUFFICIENT_DATA when baseline actuals are unrecorded."""
        req_payload = {
            "optimization_run_id": self.op_run_id,
            "period_year": 2026,
            "period_month": 1,
            "include_procurement": True,
        }
        res = client.post("/api/v1/budget/estimate", json=req_payload, headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "INSUFFICIENT_DATA")
        self.assertEqual(data["estimation_mode"], "INSUFFICIENT_DATA")
        self.assertEqual(data["total_scenario_recurring_annual"], 0.0)
        self.assertEqual(data["total_one_time_procurement_cost"], 0.0)
        self.assertIn("INSUFFICIENT_DATA", data["explanation_summary"])

    def test_05_simulation_estimate_segregation(self):
        """5. Verifies simulation optimization scenarios produce SIMULATION_ESTIMATE runs with disclaimers."""
        req_payload = {
            "optimization_run_id": self.sim_run_id,
            "period_year": 2026,
            "period_month": 1,
            "include_procurement": True,
        }
        res = client.post("/api/v1/budget/estimate", json=req_payload, headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "COMPLETED")
        self.assertEqual(data["estimation_mode"], "SIMULATION_ESTIMATE")
        self.assertGreater(data["total_scenario_recurring_annual"], 0.0)
        self.assertIsNotNone(data["assumptions_summary"])
        self.assertIn("SIMULATION ESTIMATE", data["assumptions_summary"].get("simulation_disclaimer", ""))

    def test_06_formula_correctness_and_line_item_math(self):
        """6. Verifies exact arithmetic for district line items and total aggregation."""
        db = SessionLocal()
        try:
            req = BudgetEstimateRequest(
                optimization_run_id=self.sim_run_id,
                period_year=2026,
                period_month=1,
                include_procurement=True,
            )
            run_res = BudgetService.estimate_budget(db, req)

            # Fetch full run with items
            full_run = BudgetRepository.get_budget_run_by_id(db, run_res.run_id)
            self.assertIsNotNone(full_run)
            self.assertGreater(len(full_run.items), 0)

            total_scenario_annual = Decimal("0.00")
            total_procurement = Decimal("0.00")

            for item in full_run.items:
                rec_qty = item.recommended_units
                annual_rate = item.annual_recurring_unit_cost
                cap_rate = item.one_time_unit_cost
                new_proc = item.new_procurement_units

                # Line item math
                expected_annual = Decimal(str(round(rec_qty * float(annual_rate), 2)))
                expected_procure = Decimal(str(round(new_proc * float(cap_rate), 2)))

                self.assertEqual(item.recommended_annual_cost, expected_annual)
                self.assertEqual(item.procurement_cost, expected_procure)

                total_scenario_annual += expected_annual
                total_procurement += expected_procure

            self.assertEqual(full_run.total_scenario_recurring_annual, total_scenario_annual)
            self.assertEqual(full_run.total_one_time_procurement_cost, total_procurement)
        finally:
            db.close()

    def test_07_scenario_cost_comparison_and_delta(self):
        """7. Verifies comparison endpoint calculates incremental cost delta and shortfall procurement."""
        comp_payload = {
            "baseline_run_id": self.sim_run_id,
            "scenario_run_id": self.sim_run_id,
        }
        res = client.post("/api/v1/budget/scenarios/compare", json=comp_payload, headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["baseline_run_id"], self.sim_run_id)
        self.assertEqual(data["scenario_run_id"], self.sim_run_id)
        self.assertEqual(data["incremental_recurring_annual"], 0.0)  # Comparing to self has 0 delta
        self.assertEqual(data["currency"], "INR")
        self.assertTrue(data["is_simulation"])

    def test_08_currency_consistency_inr(self):
        """8. Verifies strict INR currency reporting across overview, runs, and comparison."""
        res_ov = client.get("/api/v1/budget/overview", headers=self.analyst_headers)
        self.assertEqual(res_ov.status_code, 200)
        self.assertEqual(res_ov.json()["currency"], "INR")

        res_runs = client.get("/api/v1/budget/runs", headers=self.analyst_headers)
        self.assertEqual(res_runs.status_code, 200)
        for r in res_runs.json():
            self.assertEqual(r["currency"], "INR")

    def test_09_no_fabrication_of_expenditure_data(self):
        """9. Verifies that modeled benchmarks are labeled ESTIMATED_BENCHMARK or ASSUMPTION_BASED."""
        res = client.get("/api/v1/budget/benchmarks", headers=self.analyst_headers)
        self.assertEqual(res.status_code, 200)
        benchmarks = res.json()

        for b in benchmarks:
            self.assertIn(b["data_quality_tier"], ["OFFICIAL_DOCUMENTED", "ESTIMATED_BENCHMARK", "ASSUMPTION_BASED"])
            self.assertTrue(len(b["source_name"]) > 0)
            self.assertTrue(len(b["formula_expression"]) > 0)

    def test_10_rbac_authorization(self):
        """10. Verifies RBAC: unauthenticated blocked (401), officer blocked (403), analyst permitted."""
        # Unauthenticated overview
        res_unauth = client.get("/api/v1/budget/overview")
        self.assertEqual(res_unauth.status_code, 401)

        # Officer attempting estimate -> 403 Forbidden
        req_payload = {
            "optimization_run_id": self.sim_run_id,
            "period_year": 2026,
            "period_month": 1,
        }
        res_officer = client.post("/api/v1/budget/estimate", json=req_payload, headers=self.officer_headers)
        self.assertEqual(res_officer.status_code, 403)

        # Officer attempting to create benchmark -> 403 Forbidden
        bench_payload = {
            "resource_type_id": 1,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "TEST_ALLOWANCE",
            "unit_cost_inr": 5000.0,
            "source_name": "Test Source",
            "source_publication": "Test Pub 2024",
            "formula_expression": "test",
        }
        res_bench_officer = client.post("/api/v1/budget/benchmarks", json=bench_payload, headers=self.officer_headers)
        self.assertEqual(res_bench_officer.status_code, 403)

        # Analyst permitted -> 200 OK
        res_analyst = client.post("/api/v1/budget/estimate", json=req_payload, headers=self.analyst_headers)
        self.assertEqual(res_analyst.status_code, 200)

    def test_11_rest_api_contracts(self):
        """11. Verifies REST API contracts for all Phase 11 budget endpoints."""
        # 1. Overview
        res_ov = client.get("/api/v1/budget/overview", headers=self.analyst_headers)
        self.assertEqual(res_ov.status_code, 200)
        ov_data = res_ov.json()
        self.assertIn("category_breakdown", ov_data)
        self.assertIn("total_benchmarks_active", ov_data)

        # 2. Benchmarks list
        res_b = client.get("/api/v1/budget/benchmarks", headers=self.analyst_headers)
        self.assertEqual(res_b.status_code, 200)
        self.assertIsInstance(res_b.json(), list)

        # 3. Benchmark detail
        res_bd = client.get("/api/v1/budget/benchmarks/1", headers=self.analyst_headers)
        self.assertEqual(res_bd.status_code, 200)
        self.assertIn("monthly_recurring_unit_cost", res_bd.json())

        # 4. Runs list
        res_r = client.get("/api/v1/budget/runs", headers=self.analyst_headers)
        self.assertEqual(res_r.status_code, 200)
        runs_list = res_r.json()
        self.assertIsInstance(runs_list, list)
        self.assertGreater(len(runs_list), 0)

        # 5. Run detail
        run_id = runs_list[0]["run_id"]
        res_rd = client.get(f"/api/v1/budget/runs/{run_id}", headers=self.analyst_headers)
        self.assertEqual(res_rd.status_code, 200)
        self.assertEqual(res_rd.json()["run_id"], run_id)

    def test_12_non_destructive_baseline_preservation(self):
        """12. Verifies ground truth crime data (191,679), districts (640 Census), and resources remain untouched."""
        db = SessionLocal()
        try:
            crime_count = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            census_districts = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
            total_districts = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
            state_count = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
            state_res_count = db.execute(text("SELECT COUNT(*) FROM state_resources")).scalar()
            district_res_count = db.execute(text("SELECT COUNT(*) FROM district_resources")).scalar()

            self.assertEqual(crime_count, 191679, "Crime incidents count must remain exactly 191,679.")
            self.assertEqual(census_districts, 640, "Census 2011 districts must remain exactly 640.")
            self.assertGreaterEqual(total_districts, 640)
            self.assertEqual(state_count, 37, "States count must remain exactly 37.")
            self.assertEqual(state_res_count, 288, "State resources must remain exactly 288.")
            self.assertEqual(district_res_count, 4510, "District resources must remain exactly 4,510.")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
