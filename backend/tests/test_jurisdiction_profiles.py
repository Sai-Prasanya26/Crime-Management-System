"""
Unit and integration tests for Jurisdiction Profile API (State Overview and District Profiles).

Validates:
1. State-only selection returns aggregated State Overview profile (incidents, population, rate).
2. Rate calculation adheres to: (reported_incidents / population) * 100,000.
3. State Overview sets risk classification to 'Not available' with explanatory notes.
4. District selection returns District Profile with demographics and calibrated AI risk score.
5. Modern reorganized child district (e.g. Hyderabad ID 644) inherits Census 2011 parent lineage.
6. Newly formed district with no Census baseline (e.g. Aravalli ID 725) safely returns None for population and rate without substituting 0.
7. Validation when district does not belong to specified state returns HTTP 400.
8. Validation when neither state_id nor district_id provided returns HTTP 400.
9. Support for both current and historical geography frameworks.
10. District detail endpoint (/districts/{id}) parent demographics fallback.
"""

import os
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class TestJurisdictionProfiles(unittest.TestCase):
    def test_state_overview_andhra_pradesh_current(self):
        """Andhra Pradesh (State 2) in Current Admin mode."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?state_id=2&geography_mode=current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["scope"], "STATE")
        self.assertEqual(data["state_id"], 2)
        self.assertEqual(data["state_name"], "ANDHRA PRADESH")
        self.assertIsNone(data["district_id"])
        self.assertEqual(data["reported_incidents"], 7072)
        self.assertEqual(data["population"], 49386799)
        # Expected rate: 7072 / 49386799 * 100000 = 14.319... -> 14.32
        self.assertEqual(data["crime_rate_per_100k"], 14.32)
        self.assertIsNone(data["risk_level"])
        self.assertEqual(data["risk_label"], "Not available")
        self.assertIn("district entities", data["notes"])

    def test_state_overview_telangana_current(self):
        """Telangana (State 36) in Current Admin mode."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?state_id=36&geography_mode=current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["scope"], "STATE")
        self.assertEqual(data["state_id"], 36)
        self.assertEqual(data["state_name"], "TELANGANA")
        self.assertIsNone(data["district_id"])
        self.assertEqual(data["reported_incidents"], 5280)
        self.assertEqual(data["population"], 35193978)
        # Expected rate: 5280 / 35193978 * 100000 = 15.002... -> 15.0
        self.assertEqual(data["crime_rate_per_100k"], 15.0)
        self.assertIsNone(data["risk_level"])
        self.assertEqual(data["risk_label"], "Not available")

    def test_state_overview_historical_ap_bifurcation(self):
        """In historical Census 2011 mode, AP includes all 23 undivided districts (7072 + 5280 = 12352)."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?state_id=2&geography_mode=historical")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["reported_incidents"], 12352)
        self.assertEqual(data["population"], 84580777)
        self.assertEqual(data["crime_rate_per_100k"], 14.6)

    def test_district_profile_census_district(self):
        """Census 2011 District (Nicobars ID 1)."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?state_id=1&district_id=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["scope"], "DISTRICT")
        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["district_name"], "Nicobars")
        self.assertEqual(data["state_id"], 1)
        self.assertEqual(data["reported_incidents"], 64)
        self.assertEqual(data["population"], 36842)
        self.assertEqual(data["crime_rate_per_100k"], 173.71)
        # Calibrated risk score must exist
        self.assertIsNotNone(data["risk_level"])
        self.assertIsNotNone(data["risk_score"])
        self.assertEqual(data["risk_label"], "High Risk Hotspot")

    def test_district_profile_child_district_lineage(self):
        """Modern child district (Hyderabad ID 644) mapped to Census 2011 parent (ID 9)."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?district_id=644")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["scope"], "DISTRICT")
        self.assertEqual(data["district_id"], 644)
        self.assertEqual(data["district_name"], "Hyderabad")
        self.assertEqual(data["state_name"], "TELANGANA")
        self.assertEqual(data["parent_district_id"], 9)
        self.assertEqual(data["reported_incidents"], 673)
        self.assertEqual(data["population"], 3943323)
        self.assertEqual(data["crime_rate_per_100k"], 17.07)
        self.assertEqual(data["risk_level"], "HIGH")
        self.assertEqual(data["risk_label"], "High Risk Hotspot")

    def test_newly_formed_district_missing_census_baseline(self):
        """Newly created district without Census 2011 baseline (Aravalli ID 725)."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?district_id=725")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["district_name"], "Aravalli")
        self.assertIsNone(data["population"])
        self.assertIsNone(data["crime_rate_per_100k"])
        self.assertIsNone(data["risk_level"])
        self.assertEqual(data["risk_label"], "Not available")
        self.assertIn("unavailable", data["notes"])

    def test_inconsistent_district_and_state_ids_returns_400(self):
        """District Nicobars (State ID 1) passed with State ID 36 (Telangana) must fail with 400."""
        resp = client.get("/api/v1/geography/jurisdiction-profile?state_id=36&district_id=1")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("does not belong to State", resp.json()["detail"])

    def test_missing_parameters_returns_400(self):
        """Querying profile without state_id or district_id must return 400."""
        resp = client.get("/api/v1/geography/jurisdiction-profile")
        self.assertEqual(resp.status_code, 400)

    def test_district_detail_endpoint_fallback(self):
        """GET /geography/districts/644 returns demographics via parent district fallback."""
        resp = client.get("/api/v1/geography/districts/644")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsNotNone(data["demographics"])
        self.assertEqual(data["demographics"]["total_population"], 3943323)


if __name__ == "__main__":
    unittest.main()
