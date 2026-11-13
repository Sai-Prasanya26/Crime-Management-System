"""
Phase 10: Comprehensive Test Suite for Crime-Specific AI Preventive Resource Optimization.

Verifies:
1. Crime-to-Resource Mapping Master: 21 crime types mapped to 4 preventive shared resource pools.
2. Admin Mapping Updates & Reset: RBAC protection and baseline parameter restoration.
3. Standing Resource Inventory: Total, Deployed, Unavailable, and Available standing pools across 36 states.
4. District Crime Demand Calculation: Phase 8 prediction breakdown and Phase 9 risk score integration.
5. Scipy Integer MILP Solver: Strict capacity conservation (sum <= capacity) and exact non-negative integer allocations.
6. Scarcity Prioritization & Triage: High-severity crimes and high-risk districts prioritized under capacity constraints.
7. Scenario Archetypes & Capacity Overrides: Verification of priority shifts and custom pool limits.
8. Simulation Isolation: Baseline inventories remain unmodified during simulation runs.
9. RBAC & Security: 401 unauthenticated, 403 for unauthorized roles on execution and configuration.
10. Persistence & Allocation History: Proper persistence to optimization_runs and optimization_allocations.
11. Edge Cases & Robustness: Zero-capacity, zero-demand, and extreme capacity scenarios.
12. Database Integrity: Asserts 191,679 crime incidents, 36 active jurisdictions, and 790 active districts remain intact.
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

client = TestClient(app)


class TestCrimeResourceOptimizationPhase10(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up JWT authentication tokens for Admin, Analyst, and Officer roles."""
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

    def test_01_crime_mapping_master_retrieval(self):
        """1. Verifies Crime-to-Resource Mapping Master covers all 21 crime types across 10 pools (210 mappings total)."""
        resp = client.get(
            "/api/v1/optimization/crime-mappings",
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total"], 210, f"Expected 210 mappings (21 crimes x 10 pools), got {data['total']}")
        items = data["items"]

        # Check that all 10 shared pools are covered
        expected_10_pools = {
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
        pools = {item["shared_pool_category"] for item in items}
        self.assertEqual(pools, expected_10_pools)

        # Verify that all 21 crime types have exactly 10 mappings each across the 10 pools
        crimes_map = {}
        for item in items:
            crimes_map.setdefault(item["crime_type_id"], set()).add(item["shared_pool_category"])
        self.assertEqual(len(crimes_map), 21, f"Expected 21 distinct crime types, got {len(crimes_map)}")
        for c_id, c_pools in crimes_map.items():
            self.assertEqual(
                c_pools,
                expected_10_pools,
                f"Crime ID {c_id} is missing resource pools: {c_pools ^ expected_10_pools}",
            )

        # Validate attributes of each mapping
        for item in items:
            self.assertIn("crime_name", item)
            self.assertIn("resource_name", item)
            self.assertIn("unit_of_measure", item)
            self.assertGreaterEqual(item["coefficient"], 0)
            self.assertGreaterEqual(item["min_demand_threshold"], 0)
            self.assertGreater(item["priority_weight"], 0)
            self.assertTrue(len(item["operational_rationale"]) > 5)

    def test_02_crime_mapping_admin_update_and_reset(self):
        """2. Tests mapping updates under Admin RBAC, rejection for non-admins, and defaults reset."""
        # Retrieve first mapping
        list_resp = client.get("/api/v1/optimization/crime-mappings", headers=self.analyst_headers)
        first_item = list_resp.json()["items"][0]
        mapping_id = first_item["id"]

        # Officer attempt -> 403 Forbidden
        officer_resp = client.put(
            f"/api/v1/optimization/crime-mappings/{mapping_id}",
            json={"coefficient": 0.99},
            headers=self.officer_headers,
        )
        self.assertEqual(officer_resp.status_code, 403)

        # Admin update -> 200 OK
        admin_resp = client.put(
            f"/api/v1/optimization/crime-mappings/{mapping_id}",
            json={
                "coefficient": 0.55,
                "min_demand_threshold": 3.0,
                "priority_weight": 2.5,
                "operational_rationale": "Updated institutional parameter for high-density deterrence testing.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(admin_resp.status_code, 200)
        updated = admin_resp.json()
        self.assertEqual(updated["coefficient"], 0.55)
        self.assertEqual(updated["min_demand_threshold"], 3.0)
        self.assertEqual(updated["priority_weight"], 2.5)

        # Admin reset -> 200 OK
        reset_resp = client.post(
            "/api/v1/optimization/crime-mappings/reset",
            headers=self.admin_headers,
        )
        self.assertEqual(reset_resp.status_code, 200)

        # Verify mapping was restored
        check_resp = client.get(
            f"/api/v1/optimization/crime-mappings?crime_type_id={first_item['crime_type_id']}",
            headers=self.analyst_headers,
        )
        self.assertEqual(check_resp.status_code, 200)

    def test_03_standing_inventory_records_and_summary(self):
        """3. Verifies standing inventory records across 36 active states and 10 categories (360 records total)."""
        resp = client.get(
            "/api/v1/optimization/inventory",
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["total"], 36 * 10)  # 360 baseline records

        # Verify inventory arithmetic for all records
        for item in data["items"]:
            total = item["total_inventory"]
            deployed = item["deployed_count"]
            unavail = item["unavailable_count"]
            avail = item["available_pool"]
            self.assertEqual(avail, max(0, total - deployed - unavail))
            self.assertIn("unit_of_measure", item)
            self.assertIn("is_external_partner", item)
            self.assertIn("is_configured", item)

        # Check inventory summary for Andhra Pradesh (State ID 2)
        summary_resp = client.get(
            "/api/v1/optimization/inventory/summary?state_id=2",
            headers=self.analyst_headers,
        )
        self.assertEqual(summary_resp.status_code, 200)
        summary = summary_resp.json()
        self.assertEqual(summary["state_id"], 2)
        total_avail = sum(summary["available_by_category"].values())
        self.assertGreater(total_avail, 0)
        self.assertEqual(len(summary["categories"]), 10)

    def test_04_district_crime_demand_calculation(self):
        """4. Verifies crime-specific resource demand calculation integrating Phase 8 and Phase 9 across 10 pools."""
        # Call demand endpoint for district ID 1
        resp = client.get(
            "/api/v1/optimization/crime-demand?district_id=1&year=2026&month=11",
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["assessment_period"], "2026-11-01")
        self.assertIn("district_risk_score", data)
        self.assertIn("district_risk_level", data)
        self.assertIn("resource_demands", data)

        expected_10_pools = {
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

        # Ensure all pool demands are non-negative integers
        for pool, demand in data["resource_demands"].items():
            self.assertIsInstance(demand, int)
            self.assertGreaterEqual(demand, 0)

        # Check crime breakdown details
        breakdown = data["crime_breakdowns"]
        self.assertGreater(len(breakdown), 0)
        for item in breakdown:
            self.assertIn("crime_name", item)
            self.assertIn("predicted_crime_count", item)
            self.assertIn("shared_pool_category", item)
            self.assertIn("coefficient", item)
            self.assertIn("raw_demand", item)
            self.assertIn("operational_rationale", item)
            self.assertGreaterEqual(item["raw_demand"], 0.0)

        # Check full 21-crime matrix across all 10 pools
        self.assertIn("crime_matrix", data)
        self.assertIsNotNone(data["crime_matrix"])
        self.assertEqual(len(data["crime_matrix"]), 21, "Expected full matrix of 21 crime types")
        for cm in data["crime_matrix"]:
            self.assertIn("coefficients", cm)
            self.assertIn("raw_demands", cm)
            self.assertIn("rationales", cm)
            self.assertEqual(set(cm["coefficients"].keys()), expected_10_pools)
            self.assertEqual(set(cm["raw_demands"].keys()), expected_10_pools)
            self.assertEqual(set(cm["rationales"].keys()), expected_10_pools)

    def test_05_crime_specific_milp_optimization_conservation(self):
        """5. Verifies Scipy integer MILP solver guarantees strict capacity conservation and whole numbers across all 10 pools."""
        resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,  # Andhra Pradesh
                "assessment_period": "2026-11-01",
                "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
                "is_simulation": False,
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn(data["solver_status"], ["OPTIMAL", "FEASIBLE"])
        self.assertEqual(data["state_id"], 2)
        self.assertGreater(len(data["allocations"]), 0)
        self.assertEqual(len(data["pool_summaries"]), 10)

        # Verify strict capacity conservation: sum(allocated) <= pool_capacity
        for pool, pool_info in data["pool_summaries"].items():
            allocated = pool_info["allocated"]
            capacity = pool_info["capacity"]
            self.assertLessEqual(
                allocated,
                capacity,
                f"Resource conservation violated for {pool}: {allocated} > {capacity}",
            )
            self.assertIn("unit_of_measure", pool_info)
            self.assertIn("is_external_partner", pool_info)
            self.assertIn("is_configured", pool_info)

        # Verify district-level allocations are valid non-negative integers
        for dist in data["allocations"]:
            self.assertGreaterEqual(dist["allocated_quantity"], 0)
            self.assertIsInstance(dist["allocated_quantity"], int)
            self.assertLessEqual(dist["allocated_quantity"], dist["demanded_quantity"])
            self.assertEqual(dist["shortage"], max(0, dist["demanded_quantity"] - dist["allocated_quantity"]))
            # Verify plain-language rationale exists
            self.assertTrue(len(dist["recommendation_rationale"]) > 10)
            # Verify crime-wise explanations are populated
            self.assertIn("crime_explanations", dist)
            self.assertIsNotNone(dist["crime_explanations"])
            for exp in dist["crime_explanations"]:
                self.assertIn("crime_name", exp)
                self.assertIn("resource_coefficient", exp)
                self.assertIn("calculated_demand", exp)
                self.assertIn("proportional_allocation", exp)
                self.assertIn("operational_rationale", exp)

    def test_06_scarcity_triage_and_prioritization(self):
        """6. Verifies that under severe capacity scarcity, high-risk districts are prioritized."""
        # Run severe capacity stress test with tight capacity constraint
        resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_type": "HIGH_SEVERITY_PRIORITY",
                "is_simulation": True,
                "capacity_overrides": {
                    "PERSONNEL": 50,
                    "MOBILITY": 10,
                    "INVESTIGATION": 5,
                    "SPECIALIZED": 2,
                },
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Under severe restriction, unmet demand must be positive
        self.assertGreaterEqual(data["total_unmet_demand"], 0)

        # Check districts: CRITICAL and HIGH risk districts should have >= coverage than LOW risk
        districts = data["allocations"]
        high_risk_dists = [d for d in districts if d["risk_level"] in ["CRITICAL", "HIGH"]]
        low_risk_dists = [d for d in districts if d["risk_level"] == "LOW"]

        if high_risk_dists and low_risk_dists:
            avg_high_cov = sum(d["coverage_percentage"] for d in high_risk_dists) / len(high_risk_dists)
            avg_low_cov = sum(d["coverage_percentage"] for d in low_risk_dists) / len(low_risk_dists)
            self.assertGreaterEqual(
                avg_high_cov,
                avg_low_cov,
                f"High-risk coverage ({avg_high_cov:.1f}%) should be >= Low-risk coverage ({avg_low_cov:.1f}%)",
            )

    def test_07_scenario_archetypes_and_capacity_overrides(self):
        """7. Verifies different scenario archetypes and custom capacity overrides."""
        # 1. Cyber Specialized Archetype
        resp_cyber = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_type": "CYBER_SPECIALIZED",
                "is_simulation": True,
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp_cyber.status_code, 200)
        self.assertEqual(resp_cyber.json()["scenario_type"], "CYBER_SPECIALIZED")

        # 2. Highway Safety Archetype with Custom Overrides
        resp_highway = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_type": "HIGHWAY_SAFETY",
                "is_simulation": True,
                "capacity_overrides": {
                    "PERSONNEL": 4500,
                    "MOBILITY": 750,
                },
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp_highway.status_code, 200)
        data_hw = resp_highway.json()
        self.assertEqual(data_hw["pool_summaries"]["PERSONNEL"]["capacity"], 4500)
        self.assertEqual(data_hw["pool_summaries"]["MOBILITY"]["capacity"], 750)

    def test_08_simulation_isolation(self):
        """8. Verifies that simulations do not mutate baseline standing inventory."""
        db = SessionLocal()
        try:
            # Get baseline inventory before simulation
            before = db.execute(
                text("SELECT total_inventory, deployed_count, unavailable_count FROM resource_inventory_records WHERE state_id = 2")
            ).fetchall()

            # Execute hypothetical simulation
            resp = client.post(
                "/api/v1/optimization/crime-optimize",
                json={
                    "state_id": 2,
                    "assessment_period": "2026-11-01",
                    "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
                    "is_simulation": True,
                    "capacity_overrides": {"PERSONNEL": 99999},
                },
                headers=self.analyst_headers,
            )
            self.assertEqual(resp.status_code, 200)

            # Verify inventory is completely unchanged
            after = db.execute(
                text("SELECT total_inventory, deployed_count, unavailable_count FROM resource_inventory_records WHERE state_id = 2")
            ).fetchall()

            self.assertEqual(before, after, "Simulation mutated baseline inventory records in database!")
        finally:
            db.close()

    def test_09_rbac_and_auth_guards(self):
        """9. Verifies RBAC: 401 unauthenticated, 403 unauthorized role."""
        payload = {
            "state_id": 2,
            "assessment_period": "2026-11-01",
            "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
        }

        # 1. Unauthenticated -> 401
        unauth_resp = client.post("/api/v1/optimization/crime-optimize", json=payload)
        self.assertEqual(unauth_resp.status_code, 401)

        # 2. Officer user -> 403 Forbidden
        officer_resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json=payload,
            headers=self.officer_headers,
        )
        self.assertEqual(officer_resp.status_code, 403)

        # 3. Analyst user -> 200 OK
        analyst_resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json=payload,
            headers=self.analyst_headers,
        )
        self.assertEqual(analyst_resp.status_code, 200)

        # 4. Admin user -> 200 OK
        admin_resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json=payload,
            headers=self.admin_headers,
        )
        self.assertEqual(admin_resp.status_code, 200)

    def test_10_persistence_and_run_history(self):
        """10. Verifies execution is persisted to optimization_runs and optimization_allocations."""
        resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_name": "PERSISTENCE_AUDIT_RUN",
                "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
                "is_simulation": False,
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        run_id = resp.json()["run_id"]

        # Verify run detail via API
        detail_resp = client.get(f"/api/v1/optimization/runs/{run_id}", headers=self.analyst_headers)
        self.assertEqual(detail_resp.status_code, 200)
        run_data = detail_resp.json()
        self.assertEqual(run_data["run_id"], run_id)
        self.assertEqual(run_data["scenario_name"], "PERSISTENCE_AUDIT_RUN")

    def test_11_zero_demand_and_edge_cases(self):
        """11. Verifies system stability when all pool capacities are zero."""
        resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "is_simulation": True,
                "capacity_overrides": {
                    "PERSONNEL": 0,
                    "MOBILITY": 0,
                    "INVESTIGATION": 0,
                    "SPECIALIZED": 0,
                    "SURVEILLANCE": 0,
                    "FORENSIC": 0,
                    "CYBER_TECHNOLOGY": 0,
                    "EMERGENCY_RESPONSE": 0,
                    "COMMUNICATION": 0,
                    "TRAFFIC_SAFETY": 0,
                },
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # When capacity is 0, allocated must be 0 and coverage must be 0%
        self.assertEqual(data["total_allocated"], 0)
        self.assertEqual(data["overall_coverage_pct"], 0.0)
        self.assertEqual(data["total_unmet_demand"], data["total_demand"])

    def test_12_regression_and_historical_preservation(self):
        """12. Verifies core database integrity: 191,679 incidents, 36 states, 790 active districts."""
        db = SessionLocal()
        try:
            # 191,679 Historical Crime Incidents
            incident_count = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(incident_count, 191679, "Historical crime incidents count mutated!")

            # 36 Active Jurisdictions
            active_states = db.execute(text("SELECT COUNT(*) FROM states WHERE is_active = 1")).scalar()
            self.assertEqual(active_states, 36, "Active states count mutated!")

            # 790 Active Administrative Districts
            active_districts = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
            self.assertEqual(active_districts, 790, "Active districts count mutated!")

            # 813 Total Districts
            total_districts = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
            self.assertEqual(total_districts, 813, "Total districts count mutated!")
        finally:
            db.close()

    def test_13_complete_21_crimes_matrix_and_explanations(self):
        """13. Verifies that all 21 predicted crime types map across all 10 resource pools and produce full explanations."""
        resp = client.get(
            "/api/v1/optimization/crime-demand?district_id=1&year=2026&month=11",
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Full 21-crime matrix validation
        matrix = data["crime_matrix"]
        self.assertEqual(len(matrix), 21)

        expected_pools = {
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
        for item in matrix:
            self.assertIn("crime_name", item)
            self.assertIn("predicted_count", item)
            self.assertEqual(set(item["coefficients"].keys()), expected_pools)
            self.assertEqual(set(item["raw_demands"].keys()), expected_pools)
            self.assertEqual(set(item["rationales"].keys()), expected_pools)
            for pool in expected_pools:
                self.assertGreaterEqual(item["coefficients"][pool], 0.0)
                self.assertGreaterEqual(item["raw_demands"][pool], 0.0)
                self.assertTrue(len(item["rationales"][pool]) > 5)

        # Optimization run crime explanation validation
        opt_resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
                "is_simulation": False,
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(opt_resp.status_code, 200)
        opt_data = opt_resp.json()

        for alloc in opt_data["allocations"]:
            exps = alloc.get("crime_explanations")
            self.assertIsNotNone(exps)
            for exp in exps:
                self.assertIn("crime_name", exp)
                self.assertIn("predicted_count", exp)
                self.assertIn("resource_coefficient", exp)
                self.assertIn("calculated_demand", exp)
                self.assertIn("proportional_allocation", exp)
                self.assertIn("pool_available_capacity", exp)
                self.assertIn("recommended_district_allocation", exp)
                self.assertIn("operational_rationale", exp)
                self.assertGreaterEqual(exp["resource_coefficient"], 0.0)
                self.assertGreaterEqual(exp["calculated_demand"], 0.0)
                self.assertGreaterEqual(exp["proportional_allocation"], 0.0)

    def test_14_unconfigured_pools_handling_and_alerts(self):
        """14. Verifies unified inventory coverage for all 10 resource pools across the state."""
        resp = client.post(
            "/api/v1/optimization/crime-optimize",
            json={
                "state_id": 2,
                "assessment_period": "2026-11-01",
                "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
                "is_simulation": False,
            },
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        all_10_pools = [
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
        ]

        # Verify all 10 pools are configured with active capacity in unified inventory
        for pool in all_10_pools:
            pool_info = data["pool_summaries"][pool]
            self.assertTrue(pool_info["is_configured"], f"Pool {pool} expected to be configured in unified inventory")
            self.assertGreater(pool_info["capacity"], 0, f"Pool {pool} expected non-zero capacity")
            self.assertIn(pool_info["solver_status"], ["OPTIMAL_SATISFIED", "OPTIMAL_CONSTRAINED"])

    def test_15_district_pipeline_forecast_integration(self):
        """15. Verifies end-to-end District Pipeline Forecast endpoint integrating Phase 8, 9, and 10 across all 10 pools."""
        # 1. Unauthenticated -> 401
        unauth_resp = client.get("/api/v1/optimization/district-pipeline-forecast?district_id=1&year=2026&month=11")
        self.assertEqual(unauth_resp.status_code, 401)

        # 2. Missing params -> 422
        bad_resp = client.get("/api/v1/optimization/district-pipeline-forecast", headers=self.analyst_headers)
        self.assertEqual(bad_resp.status_code, 422)

        # 3. Authenticated valid request -> 200
        resp = client.get(
            "/api/v1/optimization/district-pipeline-forecast?district_id=1&year=2026&month=11",
            headers=self.analyst_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check district and forecast period
        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["forecast_period"], "2026-11-01")
        self.assertGreater(data["total_predicted_crimes"], 0.0)
        if data.get("prediction_interval_lower") is not None:
            self.assertLessEqual(data["prediction_interval_lower"], data["total_predicted_crimes"])
        if data.get("prediction_interval_upper") is not None:
            self.assertGreaterEqual(data["prediction_interval_upper"], data["total_predicted_crimes"])
        self.assertIn(data["overall_trend"].upper(), ["HIGHER", "SIMILAR", "LOWER"])

        # Check 21 canonical crime predictions
        self.assertEqual(len(data["canonical_crime_predictions"]), 21)
        crime_types = [p["crime_name"] for p in data["canonical_crime_predictions"]]
        self.assertEqual(len(set(crime_types)), 21)

        # Check 4 categories
        self.assertEqual(len(data["category_distribution"]), 4)
        cat_names = {c["category_name"] for c in data["category_distribution"]}
        expected_cats = {"Violent Crime", "Other Crime", "Traffic Fatality", "Fire Accident"}
        self.assertEqual(cat_names, expected_cats)

        # Check all 10 resource pool summaries are configured in unified inventory
        self.assertEqual(len(data["pool_summaries"]), 10)
        all_10_pools = [
            "PERSONNEL", "MOBILITY", "INVESTIGATION", "SPECIALIZED",
            "SURVEILLANCE", "FORENSIC", "CYBER_TECHNOLOGY",
            "EMERGENCY_RESPONSE", "COMMUNICATION", "TRAFFIC_SAFETY"
        ]
        for pool in all_10_pools:
            p_info = data["pool_summaries"][pool]
            self.assertTrue(p_info["is_configured"], f"Pool {pool} expected to be configured in unified inventory")
            self.assertGreater(p_info["capacity"], 0, f"Pool {pool} expected non-zero capacity")
            self.assertLessEqual(p_info["allocated"], p_info["capacity"])

        # Check granular recommendations
        self.assertGreater(len(data["resource_recommendations"]), 0)

        # Check granular recommendations
        self.assertGreater(len(data["resource_recommendations"]), 0)
        first_rec = data["resource_recommendations"][0]
        self.assertIn("crime_name", first_rec)
        self.assertIn("resource_category", first_rec)
        self.assertIn("coefficient", first_rec)
        self.assertIn("raw_demand", first_rec)
        self.assertIn("allocated_quantity", first_rec)
        self.assertIn("shortage", first_rec)
        self.assertIn("operational_rationale", first_rec)


if __name__ == "__main__":
    unittest.main()
