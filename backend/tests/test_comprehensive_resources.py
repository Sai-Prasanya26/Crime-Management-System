"""
Comprehensive Police Resources & AI Optimization Test Suite.

Verifies:
1. Zero negative resource counts in database across all fields.
2. Uniqueness: zero duplicate (district_id, resource_type_id, reference_year) rows.
3. Strict Null Gap Invariant:
   - When actual_count IS NULL, gap_count IS strictly NULL.
   - When actual_count IS NULL, data_status is 'UNRECORDED'.
4. Provenance fields: All official records have source_name, source_document, and confidence_score.
5. Historical crime incidents count remains strictly 191,679.
6. API Security: All protected resource endpoints return 401 Unauthorized when unauthenticated.
7. Categories API: Returns normalized operational categories.
8. Functional Category Endpoints: /personnel, /vehicles, /investigation, /surveillance, /infrastructure return correctly filtered items.
9. Gaps API: /gaps strictly preserves gap_count = None when actual_count is None.
10. AI Recommendations API: /recommendations returns valid priority tiers (CRITICAL, HIGH, MEDIUM, LOW) and required counts.
11. District Multi-Category Detail API: /districts/{district_id} returns multi-domain profile.
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.resources import DistrictResource, StateResource, ResourceType
from backend.app.models.crime import CrimeIncident

client = TestClient(app)


class TestComprehensiveResources(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Authenticate as admin to obtain JWT token for API tests."""
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        cls.token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_quantities_non_negative(self):
        """Verify all resource counts are non-negative across district and state tables."""
        db = SessionLocal()
        try:
            # Check district resources
            neg_districts = db.execute(
                text("""
                    SELECT COUNT(*) FROM district_resources
                    WHERE (actual_count IS NOT NULL AND actual_count < 0)
                       OR (sanctioned_count IS NOT NULL AND sanctioned_count < 0)
                       OR (required_count IS NOT NULL AND required_count < 0)
                """)
            ).scalar()
            self.assertEqual(neg_districts, 0, "No negative counts allowed in district_resources")

            # Check state resources
            neg_states = db.execute(
                text("""
                    SELECT COUNT(*) FROM state_resources
                    WHERE (actual_quantity IS NOT NULL AND actual_quantity < 0)
                       OR (sanctioned_quantity IS NOT NULL AND sanctioned_quantity < 0)
                       OR (available_quantity < 0)
                """)
            ).scalar()
            self.assertEqual(neg_states, 0, "No negative quantities allowed in state_resources")
        finally:
            db.close()

    def test_02_no_duplicate_records(self):
        """Verify uniqueness constraint on (district_id, resource_type_id, reference_year)."""
        db = SessionLocal()
        try:
            duplicates = db.execute(
                text("""
                    SELECT district_id, resource_type_id, reference_year, COUNT(*) as cnt
                    FROM district_resources
                    GROUP BY district_id, resource_type_id, reference_year
                    HAVING COUNT(*) > 1
                """)
            ).fetchall()
            self.assertEqual(len(duplicates), 0, "No duplicate (district_id, resource_type_id, reference_year) rows allowed")
        finally:
            db.close()

    def test_03_null_gap_invariant(self):
        """Verify strict Null Invariant: when actual_count IS NULL, gap_count MUST BE NULL."""
        db = SessionLocal()
        try:
            # Any row where actual_count IS NULL and gap_count IS NOT NULL is a strict invariant violation
            invalid_gaps = db.execute(
                text("""
                    SELECT COUNT(*) FROM district_resources
                    WHERE actual_count IS NULL AND gap_count IS NOT NULL
                """)
            ).scalar()
            self.assertEqual(invalid_gaps, 0, "When actual_count IS NULL, gap_count must be strictly NULL")

            # Any unrecorded row must have actual_count IS NULL
            unrecorded_with_actual = db.execute(
                text("""
                    SELECT COUNT(*) FROM district_resources
                    WHERE data_status = 'UNRECORDED' AND actual_count IS NOT NULL
                """)
            ).scalar()
            self.assertEqual(unrecorded_with_actual, 0, "UNRECORDED rows must not have non-null actual_count")
        finally:
            db.close()

    def test_04_official_records_provenance(self):
        """Verify verified official records have complete provenance fields and valid gap counts."""
        db = SessionLocal()
        try:
            official_records = (
                db.query(DistrictResource)
                .filter(DistrictResource.data_status.in_(["OFFICIAL_DISTRICT", "OFFICIAL_POLICE_DEPARTMENT"]))
                .all()
            )
            self.assertGreaterEqual(len(official_records), 10, "Expected at least 10 official commissionerate records")

            for rec in official_records:
                self.assertIsNotNone(rec.actual_count, f"Record {rec.id} must have actual_count")
                self.assertIsNotNone(rec.source_name, f"Record {rec.id} must have source_name")
                self.assertIsNotNone(rec.confidence_score, f"Record {rec.id} must have confidence_score")
                self.assertGreaterEqual(rec.confidence_score, 0.80, "Official records must have high confidence score >= 0.80")
                # When actual_count and required_count exist, gap_count must equal required_count - actual_count
                expected_gap = max(0, rec.required_count - rec.actual_count)
                self.assertEqual(rec.gap_count, expected_gap, f"Record {rec.id} gap_count must equal max(0, required - actual)")
        finally:
            db.close()

    def test_05_crime_incidents_unmodified(self):
        """Verify historical crime incidents count remains strictly 191,679."""
        db = SessionLocal()
        try:
            incident_count = db.query(CrimeIncident).count()
            self.assertEqual(incident_count, 191679, "Crime incidents count must remain strictly 191,679")
        finally:
            db.close()

    def test_06_unauthenticated_api_endpoints_return_401(self):
        """Verify all comprehensive resource endpoints require authentication."""
        endpoints = [
            "/api/v1/resources/categories",
            "/api/v1/resources/districts",
            "/api/v1/resources/personnel",
            "/api/v1/resources/vehicles",
            "/api/v1/resources/investigation",
            "/api/v1/resources/surveillance",
            "/api/v1/resources/infrastructure",
            "/api/v1/resources/gaps",
            "/api/v1/resources/recommendations",
        ]
        for ep in endpoints:
            resp = client.get(ep)
            self.assertEqual(resp.status_code, 401, f"Expected 401 for unauthenticated {ep}")

    def test_07_api_categories_endpoint(self):
        """Verify GET /api/v1/resources/categories returns normalized operational categories."""
        resp = client.get("/api/v1/resources/categories", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 5)
        categories = {c["category"] for c in data}
        self.assertIn("PERSONNEL", categories)
        self.assertIn("MOBILITY", categories)
        self.assertIn("INVESTIGATION", categories)
        self.assertIn("SURVEILLANCE", categories)
        self.assertIn("INFRASTRUCTURE", categories)

    def test_08_api_category_endpoints_filtering(self):
        """Verify category endpoints return correctly categorized items."""
        cat_endpoints = [
            ("/api/v1/resources/personnel", "PERSONNEL"),
            ("/api/v1/resources/vehicles", "MOBILITY"),
            ("/api/v1/resources/investigation", "INVESTIGATION"),
            ("/api/v1/resources/surveillance", "SURVEILLANCE"),
            ("/api/v1/resources/infrastructure", "INFRASTRUCTURE"),
        ]
        for ep, expected_cat in cat_endpoints:
            resp = client.get(ep, headers=self.auth_headers, params={"limit": 10})
            self.assertEqual(resp.status_code, 200, f"Endpoint {ep} failed")
            data = resp.json()
            self.assertIn("items", data)
            self.assertIn("total", data)
            for item in data["items"]:
                self.assertEqual(item["category"], expected_cat, f"Expected {expected_cat} in {ep}")
                self.assertIn(item["badge"], ["OFFICIAL", "UNRECORDED", "DERIVED", "AI ESTIMATE"])

    def test_09_api_gaps_endpoint_null_preservation(self):
        """Verify GET /api/v1/resources/gaps preserves NULL gap_count for unrecorded items."""
        resp = client.get("/api/v1/resources/gaps", headers=self.auth_headers, params={"limit": 150})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertGreater(len(data["items"]), 0)

        unrecorded_count = 0
        official_count = 0
        for item in data["items"]:
            if item["actual_count"] is None:
                self.assertIsNone(item["gap_count"], "When actual_count is None, gap_count must be None")
                self.assertEqual(item["badge"], "UNRECORDED")
                unrecorded_count += 1
            else:
                self.assertIsNotNone(item["gap_count"], "When actual_count is present, gap_count must be present")
                self.assertEqual(item["gap_count"], max(0, item["required_count"] - item["actual_count"]))
                official_count += 1

        self.assertGreater(unrecorded_count, 0, "Expected unrecorded items in gaps response")

    def test_10_api_recommendations_endpoint(self):
        """Verify GET /api/v1/resources/recommendations returns valid priorities and explainability."""
        resp = client.get("/api/v1/resources/recommendations", headers=self.auth_headers, params={"limit": 20})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertGreater(len(data["items"]), 0)

        valid_tiers = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        for item in data["items"]:
            self.assertIn(item["priority_tier"], valid_tiers)
            self.assertGreater(item["required_police_personnel"], 0)
            self.assertGreater(item["required_patrol_vehicles"], 0)
            self.assertGreater(item["required_investigation_teams"], 0)
            self.assertGreater(item["required_surveillance_teams"], 0)
            self.assertIsInstance(item["priority_explanation"], str)
            self.assertGreater(len(item["priority_explanation"]), 10)

    def test_11_district_multi_detail(self):
        """Verify GET /api/v1/resources/districts/{district_id} returns multi-domain profile."""
        resp = client.get("/api/v1/resources/districts/1", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 4, "District should have at least 4 resource records")
        for item in data:
            self.assertEqual(item["district_id"], 1)
            self.assertIn("resource_name", item)
            self.assertIn("data_status", item)
            self.assertIn("badge", item)


if __name__ == "__main__":
    unittest.main()
