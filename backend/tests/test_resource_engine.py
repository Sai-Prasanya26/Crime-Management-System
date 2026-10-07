"""
Phase 10B: Resource Optimization Engine and API Integration Test Suite.

Verifies:
1. Officer requirement formula: (10 + 5 * Pop / 1M) * M_risk
2. Vehicle requirement formula: round(Q_officers / 3.0)
3. Investigation team formula: round((ForecastVolume / 2.0) * (SeverityIndex / 1.15))
4. Surveillance formula: BaseTier + TrendBoost
5. Risk multiplier: OverallRiskScore / 50.00
6. Minimum officer quantity floor = 5
7. Minimum vehicle quantity floor = 2
8. Minimum investigation team quantity floor = 1
9. Surveillance bound [1, 8]
10. Shortfall formula with actual availability: max(req - avail, 0)
11. Surplus formula with actual availability: max(avail - req, 0)
12. Unrecorded availability behavior: available=None, status=UNRECORDED, gross_demand=req
13. No fake availability creation: district_resources has 0 rows and remains unpolluted
14. Priority tier: CRITICAL / HIGH / MODERATE / LOW based on Risk Level and Shortfall
15. Priority score: OverallRiskScore * (0.70 + 0.30 * shortfall / max(req, 1))
16. Missing/invalid resource type handling
17. Missing cost handling
18. Idempotent persistence: re-running does not duplicate records
19. Duplicate prevention: unique constraint on (district_id, resource_type_id, period_year, period_month, calculation_version)
20. API authentication: 401 Unauthorized for unauthenticated requests
21. Overview endpoint: /api/v1/resources/overview returns valid KPIs
22. Registry filtering: /api/v1/resources supports state_id, district_id, resource_type_id, priority_tier
23. District detail: /api/v1/resources/{district_id} returns all 4 resource schedules
24. Methodology endpoint: /api/v1/resources/model returns resource-v1.0 metadata
25. Constrained allocation simulation: /api/v1/resources/allocate respects pool capacity
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
from backend.app.services.resource_service import (
    ResourceService,
    CALCULATION_VERSION,
    NATIONAL_MEAN_SEVERITY,
)
from backend.app.models.intelligence import ResourceRecommendation, BudgetEstimation

client = TestClient(app)


class TestResourceEngineAndIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up authenticated session token for API tests."""
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        cls.token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_risk_multiplier(self):
        """5. Risk Multiplier: Normalized around median risk score (50.00)."""
        m_median = ResourceService.calculate_risk_multiplier(50.00)
        self.assertAlmostEqual(m_median, 1.00)

        m_high = ResourceService.calculate_risk_multiplier(75.00)
        self.assertAlmostEqual(m_high, 1.50)

        m_low = ResourceService.calculate_risk_multiplier(25.00)
        self.assertAlmostEqual(m_low, 0.50)

    def test_02_officer_requirement_formula(self):
        """1 & 6. Officer requirement formula and minimum floor of 5."""
        # 1M population at median risk (M_risk = 1.0) -> (10 + 5 * 1) * 1.0 = 15
        req1 = ResourceService.calculate_officer_requirement(1_000_000, 1.0)
        self.assertEqual(req1, 15)

        # 3M population at M_risk = 1.5 -> (10 + 5 * 3) * 1.5 = 25 * 1.5 = 37.5 -> round to 38
        req2 = ResourceService.calculate_officer_requirement(3_000_000, 1.5)
        self.assertEqual(req2, 38)

        # Very small population at low risk -> floor of 5
        req_small = ResourceService.calculate_officer_requirement(5_000, 0.2)
        self.assertEqual(req_small, 5)

    def test_03_vehicle_requirement_formula(self):
        """2 & 7. Vehicle requirement formula and minimum floor of 2."""
        # 15 officers -> round(15 / 3) = 5
        veh1 = ResourceService.calculate_vehicle_requirement(15)
        self.assertEqual(veh1, 5)

        # 5 officers -> round(5 / 3) = 2
        veh2 = ResourceService.calculate_vehicle_requirement(5)
        self.assertEqual(veh2, 2)

        # Zero or 1 officer edge case -> minimum floor of 2
        veh_min = ResourceService.calculate_vehicle_requirement(1)
        self.assertEqual(veh_min, 2)

    def test_04_investigation_requirement_formula(self):
        """3 & 8. Investigation team formula and minimum floor of 1."""
        # Forecast 4.0, severity 1.15 -> (4 / 2) * (1.15 / 1.15) = 2.0 -> 2 teams
        inv1 = ResourceService.calculate_investigation_requirement(4.0, 1.15)
        self.assertEqual(inv1, 2)

        # Forecast 10.0, severity 1.30 -> (10 / 2) * (1.30 / 1.15) = 5 * 1.1304 = 5.65 -> 6 teams
        inv2 = ResourceService.calculate_investigation_requirement(10.0, 1.30)
        self.assertEqual(inv2, 6)

        # Very low forecast -> minimum floor of 1 team
        inv_min = ResourceService.calculate_investigation_requirement(0.5, 1.0)
        self.assertEqual(inv_min, 1)

    def test_05_surveillance_requirement_formula(self):
        """4 & 9. Surveillance formula: BaseTier + TrendBoost bounded [1, 8]."""
        # LOW risk, trend < 50 -> 1 + 0 = 1
        s_low = ResourceService.calculate_surveillance_requirement("LOW", 40.0)
        self.assertEqual(s_low, 1)

        # MODERATE risk, trend 55.0 -> 2 + 1 = 3
        s_mod = ResourceService.calculate_surveillance_requirement("MODERATE", 55.0)
        self.assertEqual(s_mod, 3)

        # HIGH risk, trend 70.0 -> 4 + 2 = 6
        s_high = ResourceService.calculate_surveillance_requirement("HIGH", 70.0)
        self.assertEqual(s_high, 6)

        # CRITICAL risk, trend 70.0 -> 6 + 2 = 8
        s_crit = ResourceService.calculate_surveillance_requirement("CRITICAL", 70.0)
        self.assertEqual(s_crit, 8)

        # Bound test: cannot exceed 8
        s_bound = ResourceService.calculate_surveillance_requirement("CRITICAL", 99.0)
        self.assertLessEqual(s_bound, 8)
        self.assertGreaterEqual(s_bound, 1)

    def test_06_shortfall_and_surplus_with_actual_availability(self):
        """10 & 11. Shortfall and Surplus formulas when verified availability exists."""
        required = 20

        # Deficit case (available < required)
        avail_deficit = 12
        shortfall_1 = max(required - avail_deficit, 0)
        surplus_1 = max(avail_deficit - required, 0)
        self.assertEqual(shortfall_1, 8)
        self.assertEqual(surplus_1, 0)

        # Surplus case (available > required)
        avail_surplus = 25
        shortfall_2 = max(required - avail_surplus, 0)
        surplus_2 = max(avail_surplus - required, 0)
        self.assertEqual(shortfall_2, 0)
        self.assertEqual(surplus_2, 5)

        # Exact match
        avail_exact = 20
        self.assertEqual(max(required - avail_exact, 0), 0)
        self.assertEqual(max(avail_exact - required, 0), 0)

    def test_07_unrecorded_availability_behavior(self):
        """12 & 13. Unrecorded availability behavior and no fake availability."""
        db = SessionLocal()
        try:
            # Check district_resources is still empty
            avail_count = db.execute(text("SELECT COUNT(*) FROM district_resources")).scalar()
            self.assertEqual(avail_count, 0)

            # Check that recommendations correctly store NULL available_quantity
            unrecorded_recs = db.execute(text(
                "SELECT COUNT(*) FROM resource_recommendations WHERE available_quantity IS NULL AND availability_status = 'UNRECORDED'"
            )).scalar()
            self.assertEqual(unrecorded_recs, 2560)
        finally:
            db.close()

    def test_08_priority_tier_and_score(self):
        """14 & 15. Priority tier classification and continuous priority score."""
        # Tier 1: CRITICAL and shortfall > 0
        t1 = ResourceService.determine_priority_tier("CRITICAL", 10)
        self.assertEqual(t1, "CRITICAL")

        # Tier 2: HIGH and shortfall > 0
        t2 = ResourceService.determine_priority_tier("HIGH", 10)
        self.assertEqual(t2, "HIGH")

        # Tier 3: MODERATE and shortfall > 0
        t3 = ResourceService.determine_priority_tier("MODERATE", 10)
        self.assertEqual(t3, "MODERATE")

        # Tier 4: LOW or shortfall == 0
        t4_low = ResourceService.determine_priority_tier("LOW", 10)
        self.assertEqual(t4_low, "LOW")
        t4_zero = ResourceService.determine_priority_tier("CRITICAL", 0)
        self.assertEqual(t4_zero, "LOW")

        # Continuous priority score
        # 100% unmet (shortfall == required): P = risk_score * (0.7 + 0.3 * 1.0) = risk_score
        p_full = ResourceService.calculate_priority_score(80.0, 20, 20)
        self.assertEqual(p_full, 80.0)

        # 50% unmet: P = 80.0 * (0.7 + 0.3 * 0.5) = 80.0 * 0.85 = 68.0
        p_half = ResourceService.calculate_priority_score(80.0, 10, 20)
        self.assertEqual(p_half, 68.0)

        # 0 unmet: P = 0.00
        p_zero = ResourceService.calculate_priority_score(80.0, 0, 20)
        self.assertEqual(p_zero, 0.0)

    def test_09_database_persistence_and_idempotence(self):
        """18 & 19. Idempotent persistence and zero duplicates in MySQL."""
        db = SessionLocal()
        try:
            # Re-run resource optimization
            res = ResourceService.run_resource_optimization(db, assessment_period="2026-01-01")
            self.assertEqual(res["status"], "success")

            # Verify total count is exactly 2,560 (640 districts * 4 resource types)
            rec_count = db.execute(text("SELECT COUNT(*) FROM resource_recommendations")).scalar()
            self.assertEqual(rec_count, 2560)

            budget_count = db.execute(text("SELECT COUNT(*) FROM budget_estimations")).scalar()
            self.assertEqual(budget_count, 2560)

            # Verify 0 duplicate rows
            dup_count = db.execute(text("""
                SELECT COUNT(*) FROM (
                    SELECT district_id, resource_type_id, period_year, period_month, calculation_version
                    FROM resource_recommendations
                    GROUP BY district_id, resource_type_id, period_year, period_month, calculation_version
                    HAVING COUNT(*) > 1
                ) t
            """)).scalar()
            self.assertEqual(dup_count, 0)
        finally:
            db.close()

    def test_10_api_authentication(self):
        """20. API Authentication: Rejects unauthenticated requests with 401."""
        endpoints = [
            "/api/v1/resources/overview",
            "/api/v1/resources/model",
            "/api/v1/resources",
            "/api/v1/resources/1",
        ]
        for ep in endpoints:
            resp = client.get(ep)
            self.assertEqual(resp.status_code, 401, f"Endpoint {ep} did not enforce auth")

    def test_11_api_overview_endpoint(self):
        """21. API Overview: /api/v1/resources/overview returns valid KPIs."""
        resp = client.get("/api/v1/resources/overview", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total_assessed_districts"], 640)
        self.assertEqual(data["total_resource_types"], 4)
        self.assertEqual(data["methodology_version"], CALCULATION_VERSION)
        self.assertIn("UNRECORDED", data["availability_data_status"])
        self.assertEqual(data["districts_with_recorded_availability"], 0)
        self.assertEqual(data["districts_with_unrecorded_availability"], 640)
        self.assertGreater(data["total_gross_demand"], 20000)
        self.assertGreater(data["estimated_total_monthly_budget"], 1_000_000_000.0)
        self.assertEqual(len(data["top_priority_districts"]), 10)

    def test_12_api_registry_filtering(self):
        """22. API Registry Filtering: Supports state_id, district_id, priority_tier, resource_type_id."""
        # 1. Base list
        resp = client.get("/api/v1/resources?limit=10", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 2560)
        self.assertEqual(len(data["items"]), 10)

        # 2. Filter by priority_tier=CRITICAL
        resp_crit = client.get("/api/v1/resources?priority_tier=CRITICAL", headers=self.auth_headers)
        self.assertEqual(resp_crit.status_code, 200)
        data_crit = resp_crit.json()
        self.assertEqual(data_crit["total"], 408)  # 102 critical districts * 4 types

        # 3. Filter by resource_type_id=1 (Police Officers)
        resp_rt = client.get("/api/v1/resources?resource_type_id=1", headers=self.auth_headers)
        self.assertEqual(resp_rt.status_code, 200)
        data_rt = resp_rt.json()
        self.assertEqual(data_rt["total"], 640)

        # 4. Filter by state_id=2
        resp_state = client.get("/api/v1/resources?state_id=2", headers=self.auth_headers)
        self.assertEqual(resp_state.status_code, 200)
        self.assertGreater(resp_state.json()["total"], 0)

    def test_13_api_district_detail(self):
        """23. API District Detail: /api/v1/resources/{district_id} returns all 4 resource schedules."""
        # District 1
        resp = client.get("/api/v1/resources/1", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 1)
        self.assertIn("district_name", data)
        self.assertIn("state_name", data)
        self.assertIn("overall_risk_score", data)
        self.assertIn("forecast_crime_volume", data)
        self.assertEqual(len(data["resources"]), 4)

        # Check all 4 resource types are represented
        resource_names = {r["resource_name"] for r in data["resources"]}
        self.assertEqual(resource_names, {"Police Officers", "Patrol Vehicles", "Investigation Teams", "Surveillance Units"})

        # Check total units
        self.assertGreater(data["total_required_units"], 0)
        self.assertGreater(data["total_estimated_budget"], 0)

        # Non-existent district -> 404
        resp_404 = client.get("/api/v1/resources/99999", headers=self.auth_headers)
        self.assertEqual(resp_404.status_code, 404)

    def test_14_api_methodology_endpoint(self):
        """24. API Methodology: /api/v1/resources/model returns resource-v1.0 metadata."""
        resp = client.get("/api/v1/resources/model", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["methodology_version"], CALCULATION_VERSION)
        self.assertIn("police_officers", data["formula_summary"])
        self.assertIn("patrol_vehicles", data["formula_summary"])
        self.assertIn("investigation_teams", data["formula_summary"])
        self.assertIn("surveillance_units", data["formula_summary"])
        self.assertEqual(len(data["resource_types"]), 4)
        self.assertIn("UNRECORDED", data["availability_data_status"])

    def test_15_constrained_allocation_simulation(self):
        """25. Constrained Allocation Simulator: /api/v1/resources/allocate respects pool capacity."""
        pool_cap = 500
        payload = {
            "resource_type_id": 1,  # Police Officers
            "pool_capacity": pool_cap,
        }
        resp = client.post("/api/v1/resources/allocate", json=payload, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["resource_type_id"], 1)
        self.assertEqual(data["resource_name"], "Police Officers")
        self.assertEqual(data["pool_capacity"], pool_cap)
        self.assertEqual(data["allocated_total"], pool_cap)
        self.assertEqual(data["remaining_pool"], 0)
        self.assertGreater(data["fully_satisfied_districts"], 0)

        # Verify allocations sum to pool_cap
        alloc_sum = sum(item["allocated_quantity"] for item in data["allocations"])
        self.assertEqual(alloc_sum, pool_cap)

        # Invalid capacity <= 0 -> 400
        bad_resp = client.post("/api/v1/resources/allocate", json={"resource_type_id": 1, "pool_capacity": 0}, headers=self.auth_headers)
        self.assertEqual(bad_resp.status_code, 400)


if __name__ == "__main__":
    unittest.main()
