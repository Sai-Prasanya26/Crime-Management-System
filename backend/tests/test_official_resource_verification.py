"""
Phase 7D Verification Test Suite: Official Resource Data Verification & Optimization Foundation.

Validates:
1. Core database integrity:
   - 191,679 historical crime incidents strictly intact.
   - 640 Census 2011 districts and demographics intact.
   - 36 modern States/UTs covered in state_resources (288 rows).
2. Zero fabrication invariants:
   - Zero negative resource quantities.
   - Zero duplicate compound keys.
   - Preservation of NULL for unrecorded ground inventories.
3. New Phase 7D API Endpoints:
   - GET /api/v1/resources/types
   - GET /api/v1/resources/summary
   - GET /api/v1/resources/comparison
   - GET /api/v1/resources/separation-of-concerns
4. Demand and shortfall service interfaces:
   - Normative demand generation from crime metrics and risk scores.
   - Strict NULL preservation during shortfall evaluation for unrecorded ground inventories.
   - Distinct separation between historical deployment, official availability, calculated demand, and recommendations.
"""

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.core.security import create_access_token
from backend.app.schemas.optimization_foundation import (
    GeographyContext,
    CrimeMetricsContext,
    RiskMetricsContext,
    PredictionMetricsContext,
)
from backend.app.services.optimization_foundation_service import (
    OptimizationFoundationService,
    OPTIMIZATION_PIPELINE_STAGES,
)


class TestOfficialResourceVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Login to obtain admin JWT token
        login_resp = cls.client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        if login_resp.status_code == 200:
            token = login_resp.json()["access_token"]
        else:
            token = "dummy_token"
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_core_database_integrity(self):
        """Historical crime incidents, states, districts, and demographics must remain intact."""
        incident_count = self.db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
        self.assertEqual(incident_count, 191679, "Historical crime incident volume must remain exactly 191,679.")

        census_dist_count = self.db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
        self.assertEqual(census_dist_count, 640, "Canonical Census 2011 district count must remain 640.")

        total_dist_count = self.db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
        self.assertEqual(total_dist_count, 803, "Total districts in database must remain 803.")

        demo_count = self.db.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()
        self.assertEqual(demo_count, 640, "Canonical district demographics must remain 640.")

    def test_02_state_resources_integrity(self):
        """Official state_resources table must contain 288 verified rows across 36 active States/UTs."""
        total_sr = self.db.execute(text("SELECT COUNT(*) FROM state_resources")).scalar()
        self.assertEqual(total_sr, 288, "state_resources must contain exactly 288 records (36 States/UTs * 8 types).")

        # Zero negative quantities
        neg_count = self.db.execute(text("""
            SELECT COUNT(*) FROM state_resources 
            WHERE available_quantity < 0 
               OR (actual_quantity IS NOT NULL AND actual_quantity < 0)
               OR (sanctioned_quantity IS NOT NULL AND sanctioned_quantity < 0)
        """)).scalar()
        self.assertEqual(neg_count, 0, "state_resources must contain zero negative quantities.")

        # Zero duplicate compound keys
        dups = self.db.execute(text("""
            SELECT state_id, resource_type_id, reference_year, COUNT(*) as c
            FROM state_resources
            GROUP BY state_id, resource_type_id, reference_year
            HAVING c > 1
        """)).fetchall()
        self.assertEqual(len(dups), 0, "state_resources must have zero compound key duplicates.")

        # Provenance completeness
        missing_meta = self.db.execute(text("""
            SELECT COUNT(*) FROM state_resources
            WHERE source_name IS NULL OR source_name = ''
               OR source_publication IS NULL OR source_publication = ''
        """)).scalar()
        self.assertEqual(missing_meta, 0, "Every state_resources record must possess institutional source metadata.")

    def test_03_district_resources_zero_fabrication(self):
        """district_resources must contain 114 official records and 4,396 strictly unrecorded rows."""
        off_count = self.db.execute(text("""
            SELECT COUNT(*) FROM district_resources WHERE data_status LIKE 'OFFICIAL%'
        """)).scalar()
        self.assertEqual(off_count, 114, "Official district resources must match the verified 114 records.")

        unrec_violations = self.db.execute(text("""
            SELECT COUNT(*) FROM district_resources
            WHERE data_status = 'UNRECORDED' AND (actual_count IS NOT NULL OR gap_count IS NOT NULL)
        """)).scalar()
        self.assertEqual(unrec_violations, 0, "Unrecorded ground inventory must strictly retain NULL actual and gap counts.")

        zero_count = self.db.execute(text("SELECT COUNT(*) FROM district_resources WHERE actual_count = 0")).scalar()
        self.assertEqual(zero_count, 0, "No unrecorded records may be converted to 0.")

    def test_04_api_resource_types(self):
        """GET /api/v1/resources/types must return all active resource types."""
        resp = self.client.get("/api/v1/resources/types", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        types = resp.json()
        self.assertIsInstance(types, list)
        self.assertGreater(len(types), 50)
        first = types[0]
        self.assertIn("resource_name", first)
        self.assertIn("category", first)
        self.assertIn("unit_of_measure", first)

    def test_05_api_resource_summary(self):
        """GET /api/v1/resources/summary must return official grouped state summaries with freshness notes."""
        resp = self.client.get("/api/v1/resources/summary", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_states"], 36)
        self.assertIn("data_freshness_notes", data)
        self.assertIn("police_personnel", data["data_freshness_notes"])

        # Check a specific state item
        first_state = data["items"][0]
        self.assertIn("state", first_state)
        self.assertIn("reference_year", first_state)
        self.assertIn("source", first_state)
        self.assertIn("resources", first_state)
        self.assertGreater(len(first_state["resources"]), 0)

        # Filter by state_id
        resp_filtered = self.client.get("/api/v1/resources/summary?state_id=36", headers=self.headers)
        self.assertEqual(resp_filtered.status_code, 200)
        data_filtered = resp_filtered.json()
        self.assertEqual(data_filtered["total_states"], 1)
        self.assertEqual(data_filtered["items"][0]["state"], "TELANGANA")

    def test_06_api_resource_comparison(self):
        """GET /api/v1/resources/comparison must return analytical crime vs resource comparison."""
        resp = self.client.get("/api/v1/resources/comparison", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("disclaimer", data)
        self.assertIn("items", data)
        self.assertEqual(len(data["items"]), 36)

        # Inspect top state item
        top_state = data["items"][0]
        self.assertIn("state_name", top_state)
        self.assertIn("total_crime_incidents", top_state)
        self.assertIn("crime_rate_per_100k", top_state)
        self.assertIn("police_personnel", top_state)
        self.assertIn("police_per_100k", top_state)
        self.assertIn("police_stations", top_state)
        self.assertGreater(top_state["total_crime_incidents"], 0)
        self.assertGreater(top_state["police_personnel"], 0)

    def test_07_api_separation_of_concerns(self):
        """GET /api/v1/resources/separation-of-concerns must document distinct operational data domains."""
        resp = self.client.get("/api/v1/resources/separation-of-concerns", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("domains", data)
        domains = data["domains"]
        self.assertIn("A_HISTORICAL_DEPLOYMENT", domains)
        self.assertIn("B_OFFICIAL_AVAILABILITY", domains)
        self.assertIn("C_FUTURE_DEMAND", domains)
        self.assertIn("D_FUTURE_RECOMMENDATION", domains)
        self.assertIn("crime_incidents.police_deployed_count", domains["A_HISTORICAL_DEPLOYMENT"]["field"])

    def test_08_service_demand_and_shortfall_interfaces(self):
        """OptimizationFoundationService demand & shortfall interfaces must function with strict NULL preservation."""
        geo = GeographyContext(
            geography_level="DISTRICT",
            geography_id=1,
            geography_name="Nicobars",
            population=36842,
            population_density=20.0,
        )
        crime_metrics = CrimeMetricsContext(
            total_incidents=150,
            severity_index=0.45,
            trend_index=0.05,
            historical_police_deployed_avg=2.8,  # Historical incident-level artifact only
        )
        risk_metrics = RiskMetricsContext(
            overall_risk_score=42.5,
            risk_level="MODERATE",
            risk_multiplier=1.05,
        )
        pred_metrics = PredictionMetricsContext(
            forecast_period="2026-01-01",
            predicted_crime_count=12.0,
        )

        demand_result = OptimizationFoundationService.calculate_resource_demand(
            geography=geo,
            period="2026-01-01",
            crime_metrics=crime_metrics,
            risk_metrics=risk_metrics,
            prediction_metrics=pred_metrics,
        )

        self.assertEqual(len(demand_result.demand_items), 4)
        personnel_req = next(i for i in demand_result.demand_items if i.resource_type_id == 1)
        self.assertGreater(personnel_req.calculated_required_quantity, 0)

        # Test shortfall calculation with unrecorded inventory (empty dict)
        shortfall_unrec = OptimizationFoundationService.calculate_resource_shortfall(
            demand_result=demand_result,
            available_inventory={},
        )
        for item in shortfall_unrec.items:
            self.assertIsNone(item.official_available_quantity, "Unrecorded inventory must yield None available_quantity.")
            self.assertIsNone(item.shortfall_quantity, "Unrecorded inventory must yield None shortfall_quantity.")
            self.assertIsNone(item.recommended_quantity, "Recommended quantity must remain None until optimization phase.")
            self.assertEqual(item.data_status, "UNRECORDED")

        # Test shortfall calculation with verified recorded inventory
        recorded_inv = {
            1: {
                "available_quantity": 50,
                "data_status": "OFFICIAL_RECORDED",
                "source_name": "BPR&D DoPO",
                "reference_year": 2024,
            }
        }
        shortfall_rec = OptimizationFoundationService.calculate_resource_shortfall(
            demand_result=demand_result,
            available_inventory=recorded_inv,
        )
        p_item = next(i for i in shortfall_rec.items if i.resource_type_id == 1)
        self.assertEqual(p_item.official_available_quantity, 50)
        expected_shortfall = max(p_item.calculated_required_quantity - 50, 0)
        self.assertEqual(p_item.shortfall_quantity, expected_shortfall)
        self.assertEqual(p_item.data_status, "OFFICIAL_RECORDED")
        self.assertIsNone(p_item.recommended_quantity)


if __name__ == "__main__":
    unittest.main()
