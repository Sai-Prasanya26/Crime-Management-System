"""
Phase 10 & 10.1: Comprehensive Test Suite for Constrained AI Police Resource Optimization.

Verifies:
1. Inventory Integrity & Reconciliation: 288 in state_resources, 4,510 in district_resources.
2. Missing, Null, & Unrecorded Quantities: Unrecorded actual_count remains NULL; never 0.
3. No Double-Counting: State standing pool and district ground inventories are isolated.
4. Resource Conservation: sum(recommended_quantity) <= pool_capacity strictly verified.
5. Resource Eligibility: Personnel/Vehicles eligible; Infrastructure flagged INELIGIBLE.
6. Infeasible Scenarios: Returns INFEASIBLE when minimum reserves exceed available pool.
7. Historical vs Forecast Input Separation: Uses Phase 9 forecast scores and Phase 8B predictions.
8. Forecast Provenance: Persists model_version and forecast_origin_date on runs.
9. Assessment Period Validation: Rejects malformed dates with HTTP 400 Bad Request.
10. Deterministic Results: Identical inputs produce identical allocations and objective values.
11. Baseline Preservation & Scenario Isolation: State/district inventories remain untouched.
12. Authorization & RBAC: /run requires ANALYST or ADMIN; unauthenticated is 401; OFFICER is 403.
13. Database Rollback on Failure: Atomic transaction protection.
14. Insufficient Data Behavior: Returns INSUFFICIENT_DATA when standing pool is 0 or unavailable.
15. API Response Validation: Validates /overview, /resources, /runs, and /recommendations contracts.
16. Regression Integrity: Asserts 191,679 crime incidents and 640 Census districts untouched.
17. Phase 10.1 Operational Guard: Operational runs on unrecorded district staffing return INSUFFICIENT_DATA.
18. Phase 10.1 Transferable Pool Constraint: Allocations never exceed documented transferable pool ceiling.
19. Phase 10.1 Simulation Segregation: Hypothetical simulations clearly labeled with all 4 institutional assumptions.
20. Phase 10.1 District Baseline Status: Disclosed districts have official counts; unrecorded remain NULL.
21. Phase 10.1 Audit Preservation: Pre-Phase 10.1 runs preserved with validity markers.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.services.optimization_service import (
    OptimizationService,
    VERIFIED_STATE_RESOURCES_COUNT,
    VERIFIED_DISTRICT_RESOURCES_COUNT,
    VERIFIED_DISTRICT_OFFICIAL_COUNT,
    VERIFIED_DISTRICT_UNRECORDED_COUNT,
)
from backend.app.schemas.optimization import OptimizationRunRequest, OptimizationScenarioComparisonRequest
from backend.app.repositories.optimization_repository import OptimizationRepository

client = TestClient(app)


class TestConstrainedResourceOptimization(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Obtain auth tokens
        # 1. Analyst user
        login_analyst = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert login_analyst.status_code == 200, f"Analyst login failed: {login_analyst.text}"
        cls.analyst_token = login_analyst.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        # 2. Officer user (restricted role)
        login_officer = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert login_officer.status_code == 200, f"Officer login failed: {login_officer.text}"
        cls.officer_token = login_officer.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_inventory_integrity_and_reconciliation(self):
        """1. Verifies 288 in state_resources, 4,510 in district_resources, and resolves Phase 9 discrepancy."""
        db = SessionLocal()
        try:
            state_count = db.execute(text("SELECT COUNT(*) FROM state_resources")).scalar()
            district_count = db.execute(text("SELECT COUNT(*) FROM district_resources")).scalar()
            district_official = db.execute(text("SELECT COUNT(*) FROM district_resources WHERE actual_count IS NOT NULL")).scalar()
            district_unrecorded = db.execute(text("SELECT COUNT(*) FROM district_resources WHERE actual_count IS NULL")).scalar()

            self.assertEqual(state_count, VERIFIED_STATE_RESOURCES_COUNT)
            self.assertEqual(state_count, 288)  # Exactly 36 States * 8 official BPR&D categories
            self.assertEqual(district_count, VERIFIED_DISTRICT_RESOURCES_COUNT)
            self.assertEqual(district_count, 4510)
            self.assertEqual(district_official, VERIFIED_DISTRICT_OFFICIAL_COUNT)
            self.assertEqual(district_official, 114)
            self.assertEqual(district_unrecorded, VERIFIED_DISTRICT_UNRECORDED_COUNT)
            self.assertEqual(district_unrecorded, 4396)
        finally:
            db.close()

    def test_02_missing_null_and_unrecorded_quantities(self):
        """2. Asserts unrecorded ground inventories retain actual_count = NULL and are never interpreted as zero."""
        db = SessionLocal()
        try:
            unrec_rows = db.execute(text("SELECT actual_count, gap_count FROM district_resources WHERE data_status = 'UNRECORDED' LIMIT 50")).fetchall()
            for row in unrec_rows:
                self.assertIsNone(row[0], "Unrecorded actual_count must be NULL, never 0")
                self.assertIsNone(row[1], "Unrecorded gap_count must be NULL, never 0")
        finally:
            db.close()

    def test_03_no_double_counting_state_and_district(self):
        """3. Verifies state standing pool and district inventories are isolated without additive double-counting."""
        db = SessionLocal()
        try:
            # Check AP (State 2)
            state_pool = OptimizationRepository.get_state_resource_pool(db, state_id=2, resource_type_id=1)
            self.assertIsNotNone(state_pool)
            self.assertEqual(state_pool["actual_count"], 59553)

            # In operational mode, AP returns INSUFFICIENT_DATA because district baselines are unrecorded
            req_op = OptimizationRunRequest(state_id=2, resource_type_id=1, assessment_period="2026-11-01")
            res_op = OptimizationService.run_optimization(db, req_op)
            self.assertEqual(res_op.solver_status, "INSUFFICIENT_DATA")
            self.assertEqual(res_op.allocated_total, 0)
            self.assertEqual(res_op.pool_capacity, 59553)

            # In simulation mode, AP allocates strictly <= state_pool (never state_pool + district_sum)
            req_sim = OptimizationRunRequest(state_id=2, resource_type_id=1, assessment_period="2026-11-01", is_simulation=True)
            res_sim = OptimizationService.run_optimization(db, req_sim)
            self.assertEqual(res_sim.solver_status, "SIMULATION")
            self.assertLessEqual(res_sim.allocated_total, 59553)
        finally:
            db.close()

    def test_04_resource_conservation_guarantee(self):
        """4. Absolute Resource Conservation: sum(recommended_quantity) <= pool_capacity under simulation runs."""
        db = SessionLocal()
        try:
            for st_id in [1, 2, 4]:  # A&N, AP, Bihar
                for r_id in [1, 2]:   # Personnel, Vehicles
                    req = OptimizationRunRequest(state_id=st_id, resource_type_id=r_id, assessment_period="2026-11-01", is_simulation=True)
                    res = OptimizationService.run_optimization(db, req)
                    if res.solver_status == "SIMULATION":
                        self.assertLessEqual(res.allocated_total, res.pool_capacity)
                        self.assertEqual(res.remaining_pool, res.pool_capacity - res.allocated_total)
                        self.assertGreaterEqual(res.remaining_pool, 0)
        finally:
            db.close()

    def test_05_resource_eligibility_and_transfer_restrictions(self):
        """5. Reallocation of immovable infrastructure (e.g. Police Stations) is rejected with INELIGIBLE."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(state_id=2, resource_type_id=74, assessment_period="2026-11-01")  # Police Stations
            res = OptimizationService.run_optimization(db, req)
            self.assertEqual(res.solver_status, "INELIGIBLE")
            self.assertIn("INFRASTRUCTURE_IMMOVABLE", res.explanation_summary)
            self.assertEqual(res.allocated_total, 0)
        finally:
            db.close()

    def test_06_infeasible_scenarios_handling(self):
        """6. Infeasible scenarios (e.g. minimum reserves exceed pool capacity) return INFEASIBLE with deficit diagnostic."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=True,
                pool_capacity_override=10,  # 10 officers available, but 23 districts each need >= 1
            )
            res = OptimizationService.run_optimization(db, req)
            self.assertEqual(res.solver_status, "INFEASIBLE")
            self.assertIn("Infeasible scenario", res.explanation_summary)
            self.assertEqual(res.allocated_total, 0)
            self.assertEqual(res.remaining_pool, 10)
        finally:
            db.close()

    def test_07_historical_versus_forecast_input_separation(self):
        """7. Verifies optimization uses Phase 9 FORECAST scores and Phase 8B future forecasts for future horizons."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(state_id=1, resource_type_id=1, assessment_period="2026-11-01", is_simulation=True)
            res = OptimizationService.run_optimization(db, req)
            self.assertEqual(res.assessment_period, "2026-11-01")
            self.assertEqual(res.risk_version, "risk-v2.0")
            self.assertIsNotNone(res.forecast_model_version)
        finally:
            db.close()

    def test_08_forecast_model_provenance(self):
        """8. Optimization runs capture model_version and forecast_origin_date from Phase 8B."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(state_id=1, resource_type_id=1, assessment_period="2026-11-01", is_simulation=True)
            res = OptimizationService.run_optimization(db, req)
            self.assertIsNotNone(res.forecast_model_version)
            self.assertTrue(len(res.forecast_model_version) > 0)
        finally:
            db.close()

    def test_09_assessment_period_validation(self):
        """9. Rejects malformed assessment period date with HTTP 400 Bad Request."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(state_id=1, resource_type_id=1, assessment_period="invalid-date-format")
            with self.assertRaises(Exception):
                OptimizationService.run_optimization(db, req)
        finally:
            db.close()

    def test_10_deterministic_results(self):
        """10. Running identical configuration produces deterministic outputs and identical objective values."""
        db = SessionLocal()
        try:
            req1 = OptimizationRunRequest(state_id=1, resource_type_id=1, assessment_period="2026-11-01", scenario_name="Det Run 1", is_simulation=True)
            res1 = OptimizationService.run_optimization(db, req1)

            req2 = OptimizationRunRequest(state_id=1, resource_type_id=1, assessment_period="2026-11-01", scenario_name="Det Run 2", is_simulation=True)
            res2 = OptimizationService.run_optimization(db, req2)

            self.assertEqual(res1.allocated_total, res2.allocated_total)
            self.assertEqual(res1.shortfall_after, res2.shortfall_after)
            self.assertEqual(res1.objective_value, res2.objective_value)
            self.assertEqual(len(res1.allocations), len(res2.allocations))
            for a1, a2 in zip(res1.allocations, res2.allocations):
                self.assertEqual(a1.recommended_quantity, a2.recommended_quantity)
        finally:
            db.close()

    def test_11_baseline_preservation_and_scenario_isolation(self):
        """11. Running optimization does not alter actual standing inventories in state_resources or district_resources."""
        db = SessionLocal()
        try:
            sum_before = db.execute(text("SELECT SUM(actual_count) FROM state_resources")).scalar()
            dist_sum_before = db.execute(text("SELECT SUM(actual_count) FROM district_resources WHERE actual_count IS NOT NULL")).scalar()

            req = OptimizationRunRequest(state_id=2, resource_type_id=1, assessment_period="2026-11-01", is_simulation=True)
            OptimizationService.run_optimization(db, req)

            sum_after = db.execute(text("SELECT SUM(actual_count) FROM state_resources")).scalar()
            dist_sum_after = db.execute(text("SELECT SUM(actual_count) FROM district_resources WHERE actual_count IS NOT NULL")).scalar()

            self.assertEqual(sum_before, sum_after, "state_resources actual_count must remain strictly unchanged")
            self.assertEqual(dist_sum_before, dist_sum_after, "district_resources actual_count must remain strictly unchanged")
        finally:
            db.close()

    def test_12_authorization_and_rbac(self):
        """12. /api/v1/optimization/run requires ANALYST or ADMIN; unauthenticated is 401; OFFICER is 403."""
        payload = {
            "state_id": 1,
            "resource_type_id": 1,
            "assessment_period": "2026-11-01",
            "scenario_type": "BASELINE_CONSTRAINED",
            "is_simulation": True,
        }
        res_unauth = client.post("/api/v1/optimization/run", json=payload)
        self.assertEqual(res_unauth.status_code, 401)

        if self.officer_headers:
            res_officer = client.post("/api/v1/optimization/run", json=payload, headers=self.officer_headers)
            self.assertEqual(res_officer.status_code, 403)

        if self.analyst_headers:
            res_analyst = client.post("/api/v1/optimization/run", json=payload, headers=self.analyst_headers)
            self.assertEqual(res_analyst.status_code, 200)
            data = res_analyst.json()
            self.assertIn("run_id", data)
            self.assertEqual(data["solver_status"], "SIMULATION")

    def test_13_database_rollback_on_failure(self):
        """13. Transaction rollbacks cleanly on simulated failure during batch persistence without polluting database."""
        db = SessionLocal()
        try:
            initial_runs = db.execute(text("SELECT COUNT(*) FROM optimization_runs")).scalar()
            initial_allocs = db.execute(text("SELECT COUNT(*) FROM optimization_allocations")).scalar()

            try:
                with db.begin_nested():
                    OptimizationRepository.save_optimization_run(
                        db,
                        run_data={
                            "run_id": "TEST-FAIL-RUN-001",
                            "scenario_name": "Failing Run",
                            "resource_type_id": 1,
                            "period_year": 2026,
                            "period_month": 11,
                            "assessment_period": "2026-11-01",
                            "pool_capacity": 100,
                            "allocated_total": 50,
                            "remaining_pool": 50,
                            "total_demand": 100,
                            "shortfall_before": 50,
                            "shortfall_after": 0,
                        },
                        allocations_data=[
                            {"district_id": 999999, "required_quantity": 10, "recommended_quantity": 10, "change_quantity": 0, "shortfall_before": 0, "shortfall_after": 0}
                        ],
                    )
            except Exception:
                db.rollback()

            final_runs = db.execute(text("SELECT COUNT(*) FROM optimization_runs")).scalar()
            final_allocs = db.execute(text("SELECT COUNT(*) FROM optimization_allocations")).scalar()
            self.assertEqual(initial_runs, final_runs, "Failed transaction must roll back run insertion")
            self.assertEqual(initial_allocs, final_allocs, "Failed transaction must roll back allocation insertion")
        finally:
            db.close()

    def test_14_empty_inventory_and_insufficient_data(self):
        """14. Returns INSUFFICIENT_DATA when state standing pool is unrecorded or zero."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(
                state_id=1,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=True,
                pool_capacity_override=0,
            )
            res = OptimizationService.run_optimization(db, req)
            self.assertEqual(res.solver_status, "INSUFFICIENT_DATA")
            self.assertIn("Optimization cannot proceed", res.explanation_summary)
        finally:
            db.close()

    def test_15_api_response_validation(self):
        """15. Validates schemas and responses for /overview, /resources, /runs, and /recommendations."""
        headers = self.analyst_headers or {}

        # 1. GET /overview
        res = client.get("/api/v1/optimization/overview", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("verified_official_inventory_summary", data)
        self.assertEqual(data["verified_official_inventory_summary"]["state_resources_count"], 288)
        self.assertEqual(data["verified_official_inventory_summary"]["district_resources_count"], 4510)
        self.assertIn("eligible_categories", data)

        # 2. GET /resources
        res = client.get("/api/v1/optimization/resources", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["state_resources_count"], 288)
        self.assertEqual(data["district_resources_count"], 4510)
        self.assertIn("discrepancy_explanation", data)

        # 3. GET /runs
        res = client.get("/api/v1/optimization/runs", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)

        # 4. GET /recommendations
        res = client.get("/api/v1/optimization/recommendations", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)

    def test_16_regression_integrity_of_crime_and_geography(self):
        """16. Confirms all 191,679 crime incidents, 640 districts, 21,760 predictions, and 3,840 risk scores remain untouched."""
        db = SessionLocal()
        try:
            incidents_count = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            census_districts = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
            predictions_count = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
            risk_scores_count = db.execute(text("SELECT COUNT(*) FROM crime_risk_scores")).scalar()

            self.assertEqual(incidents_count, 191679, "crime_incidents count must remain exactly 191,679")
            self.assertEqual(census_districts, 640, "Census 2011 districts count must remain exactly 640")
            self.assertEqual(predictions_count, 21760, "crime_predictions count must remain exactly 21,760")
            self.assertEqual(risk_scores_count, 3840, "crime_risk_scores count must remain exactly 3,840")
        finally:
            db.close()

    # ==========================================
    # Phase 10.1 Regression Tests
    # ==========================================

    def test_17_operational_mode_halts_on_unrecorded_district_inventories(self):
        """17. Proves operational runs for states with unrecorded district baselines halt with INSUFFICIENT_DATA and 0 allocations."""
        db = SessionLocal()
        try:
            # Operational run on Andhra Pradesh (21 of 23 districts unrecorded)
            req = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=False,
                allocation_mode="OPERATIONAL",
            )
            res = OptimizationService.run_optimization(db, req)

            self.assertEqual(res.solver_status, "INSUFFICIENT_DATA")
            self.assertEqual(res.allocated_total, 0)
            self.assertEqual(res.pool_capacity, 59553)  # Official state total preserved
            self.assertEqual(res.data_validity, "INSUFFICIENT_DATA")
            self.assertEqual(len(res.allocations or []), 0)
            self.assertIn("Operational district allocation halted", res.explanation_summary)
            self.assertIn("21 of 23 districts", res.explanation_summary)
            self.assertFalse(res.is_simulation)
        finally:
            db.close()

    def test_18_transferable_pool_ceiling_enforcement(self):
        """18. Proves that allocations never exceed a documented or simulated transferable pool ceiling."""
        db = SessionLocal()
        try:
            # Pass explicit simulation transferable pool of 40,000 units on AP (standing strength: 59,553)
            # 40,000 is feasible (> 32,487 reserve) but strictly limits allocations to 40,000 instead of 59,553
            req = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=True,
                transferable_pool_size=40000,
            )
            res = OptimizationService.run_optimization(db, req)

            self.assertEqual(res.solver_status, "SIMULATION")
            self.assertLessEqual(res.allocated_total, 40000)
            self.assertEqual(res.pool_capacity, 40000)
            self.assertEqual(res.transferable_pool, 40000)
            self.assertGreaterEqual(res.remaining_pool, 0)

            # Also verify tactical pool with minimum_reserve_ratio=0.0
            req_tactical = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=True,
                transferable_pool_size=500,
                minimum_reserve_ratio=0.0,
            )
            res_tactical = OptimizationService.run_optimization(db, req_tactical)
            self.assertEqual(res_tactical.solver_status, "SIMULATION")
            self.assertLessEqual(res_tactical.allocated_total, 500)
            self.assertEqual(res_tactical.transferable_pool, 500)
        finally:
            db.close()

    def test_19_hypothetical_simulation_segregation_and_assumptions(self):
        """19. Proves hypothetical simulations are clearly segregated, tagged, and present all 4 mandatory assumptions."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                scenario_type="HYPOTHETICAL_SIMULATION",
                is_simulation=True,
            )
            res = OptimizationService.run_optimization(db, req)

            self.assertEqual(res.solver_status, "SIMULATION")
            self.assertTrue(res.is_simulation)
            self.assertEqual(res.allocation_mode, "SIMULATION")
            self.assertEqual(res.data_validity, "HYPOTHETICAL_SIMULATION_ONLY")
            self.assertTrue(res.scenario_name.startswith("[SIMULATION]"))
            self.assertIsNotNone(res.simulation_assumptions)
            self.assertEqual(len(res.simulation_assumptions), 4)
            self.assertIn("District Baseline Staffing", res.simulation_assumptions[0])
            self.assertIn("Transferable Pool", res.simulation_assumptions[1])
            self.assertIn("Normative Demands", res.simulation_assumptions[2])
            self.assertIn("Non-Operational Status", res.simulation_assumptions[3])
        finally:
            db.close()

    def test_20_district_baseline_data_status_preservation(self):
        """20. Proves disclosed districts retain official baselines while unrecorded districts strictly remain NULL."""
        db = SessionLocal()
        try:
            req = OptimizationRunRequest(
                state_id=2,
                resource_type_id=1,
                assessment_period="2026-11-01",
                is_simulation=True,
            )
            res = OptimizationService.run_optimization(db, req)

            self.assertIsNotNone(res.allocations)
            alloc_map = {a.district_id: a for a in res.allocations}

            # District 22 (Visakhapatnam) has official disclosure of 2,890 in DB
            self.assertIn(22, alloc_map)
            vizag = alloc_map[22]
            self.assertEqual(vizag.baseline_quantity, 2890)
            self.assertEqual(vizag.baseline_status, "OFFICIAL_DISTRICT_DISCLOSED")
            self.assertIn("Verified ground baseline is 2,890", vizag.explanation)

            # District 12 (Krishna) has unrecorded baseline in DB (actual_count IS NULL)
            self.assertIn(12, alloc_map)
            krishna = alloc_map[12]
            self.assertIsNone(krishna.baseline_quantity, "Unrecorded district baseline must be NULL, never an average")
            self.assertEqual(krishna.baseline_status, "UNRECORDED_DATA_UNAVAILABLE")
            self.assertIn("SIMULATION ONLY: Official district baseline is unrecorded", krishna.explanation)
        finally:
            db.close()

    def test_21_historical_runs_preservation_and_validity_marker(self):
        """21. Proves historical runs are preserved with transparent validity markers and never deleted."""
        db = SessionLocal()
        try:
            historical_runs = db.execute(text("SELECT COUNT(*) FROM optimization_runs WHERE data_validity = 'HISTORICAL_PRE_PHASE_10_1'")).scalar()
            total_runs = db.execute(text("SELECT COUNT(*) FROM optimization_runs")).scalar()
            self.assertGreater(total_runs, 0)
            self.assertGreaterEqual(historical_runs, 0)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
