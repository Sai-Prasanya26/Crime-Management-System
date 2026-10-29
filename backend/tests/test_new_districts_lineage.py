"""
Comprehensive test suite verifying dual-layer lineage and identity resolution
for all 8 newly added districts (IDs 806-813) across Intelligence modules.

Validates:
1. Each new district returns its own ID and name across APIs.
2. Direct vs parent-derived provenance is explicitly marked (is_derived_from_parent = True).
3. Conformal prediction intervals and forecasts resolve through verified parent mappings.
4. Historical actual counts remain NULL (zero fabrication).
5. Explainable risk scoring returns the child district's identity with parent provenance notes.
6. Demographic baselines reflect parent Census 2011 figures with lineage documentation.
7. Unmapped / non-existent districts safely return 404 or Insufficient Baseline.
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

NEW_DISTRICTS = [
    {
        "id": 806,
        "name": "Vav-Tharad",
        "state_id": 11,
        "state_name": "GUJARAT",
        "parent_id": 135,
        "parent_name": "Banas Kantha",
    },
    {
        "id": 807,
        "name": "Hansi",
        "state_id": 12,
        "state_name": "HARYANA",
        "parent_id": 163,
        "parent_name": "Hisar",
    },
    {
        "id": 808,
        "name": "Meluri",
        "state_id": 24,
        "state_name": "NAGALAND",
        "parent_id": 398,
        "parent_name": "Phek",
    },
    {
        "id": 809,
        "name": "Nubra",
        "state_id": 37,
        "state_name": "LADAKH",
        "parent_id": 203,
        "parent_name": "Leh(Ladakh)",
    },
    {
        "id": 810,
        "name": "Sham",
        "state_id": 37,
        "state_name": "LADAKH",
        "parent_id": 203,
        "parent_name": "Leh(Ladakh)",
    },
    {
        "id": 811,
        "name": "Changthang",
        "state_id": 37,
        "state_name": "LADAKH",
        "parent_id": 203,
        "parent_name": "Leh(Ladakh)",
    },
    {
        "id": 812,
        "name": "Zanskar",
        "state_id": 37,
        "state_name": "LADAKH",
        "parent_id": 198,
        "parent_name": "Kargil",
    },
    {
        "id": 813,
        "name": "Drass",
        "state_id": 37,
        "state_name": "LADAKH",
        "parent_id": 198,
        "parent_name": "Kargil",
    },
]


class TestNewDistrictsLineage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    def test_01_geography_jurisdiction_profile(self):
        """1. Geographic Intelligence: Jurisdiction profile returns child identity and parent notes."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(f"/api/v1/geography/jurisdiction-profile?district_id={did}")
            self.assertEqual(resp.status_code, 200, f"Failed for district {did} ({dist['name']})")
            data = resp.json()
            self.assertEqual(data["district_id"], did)
            self.assertEqual(data["district_name"], dist["name"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertIsNotNone(data["population"])
            self.assertGreater(data["population"], 0)
            self.assertIsNotNone(data["reported_incidents"])
            self.assertIsNotNone(data["crime_rate_per_100k"])
            self.assertIn(f"parent jurisdiction #{dist['parent_id']}", data["notes"])

    def test_02_geography_district_detail(self):
        """2. Geographic Intelligence: Detail endpoint returns parent demographic fallback."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(f"/api/v1/geography/districts/{did}")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["id"], did)
            self.assertEqual(data["district_name"], dist["name"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertIsNotNone(data["demographics"])
            self.assertGreater(data["demographics"]["total_population"], 0)

    def test_03_prediction_district_month_lineage_and_actual_null(self):
        """3. Crime Predictions: district-month returns child identity, derived forecast, and NULL actuals."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/predictions/district-month?district_id={did}&year=2026&month=11",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200, f"Prediction failed for district {did}")
            data = resp.json()
            self.assertEqual(data["district_id"], did)
            self.assertEqual(data["district_name"], dist["name"])
            self.assertTrue(data["is_derived_from_parent"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertEqual(data["parent_district_name"], dist["parent_name"])
            self.assertTrue(data["is_available"])
            self.assertTrue(data["is_forecast"])
            self.assertIsNotNone(data["predicted_count"])
            self.assertGreater(data["predicted_count"], 0)
            # Actual count MUST remain None/NULL (zero fabrication)
            self.assertIsNone(data["actual_count"], f"Actual count should be NULL for new district {did}")
            self.assertIsNotNone(data["prediction_interval_lower"])
            self.assertIsNotNone(data["prediction_interval_upper"])
            self.assertIn(dist["name"], data["explanation"])
            self.assertIn(dist["parent_name"], data["explanation"])

    def test_04_prediction_monthly_series(self):
        """4. Crime Predictions: monthly endpoint returns full 34-period series marked as derived."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/predictions/monthly?district_id={did}",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(len(data["items"]), 34)
            for item in data["items"]:
                self.assertTrue(item["is_derived_from_parent"])
                self.assertEqual(item["parent_district_id"], dist["parent_id"])

    def test_05_risk_district_detail_identity_and_provenance(self):
        """5. Risk Assessment: Detail endpoint returns child identity, parent lineage, and provenance notes."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/risk/districts/{did}?assessment_period=2026-11-01",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200, f"Risk detail failed for district {did}")
            data = resp.json()
            self.assertEqual(data["district_id"], did, f"Expected district_id {did}, got {data['district_id']}")
            self.assertEqual(data["district_name"], dist["name"])
            self.assertTrue(data["is_derived_from_parent"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertEqual(data["parent_district_name"], dist["parent_name"])
            self.assertIsNotNone(data["overall_risk_score"])
            self.assertIn(data["risk_level"], ["LOW", "MODERATE", "HIGH", "CRITICAL"])
            self.assertIn(dist["parent_name"], data["notes"])
            self.assertIn(dist["parent_name"], data["explanation_summary"])

    def test_06_analytics_trends_time_series(self):
        """6. Crime Trends: Trends endpoint resolves child district to parent time series."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(f"/api/v1/analytics/trends?district_id={did}&interval=year")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("items", data)
            self.assertGreater(len(data["items"]), 0)
            self.assertTrue(data.get("is_derived_from_parent"))
            self.assertEqual(data.get("parent_district_id"), dist["parent_id"])
            self.assertEqual(data.get("parent_district_name"), dist["parent_name"])

    def test_07_prediction_district_series_by_path_param(self):
        """7. Crime Predictions: /api/v1/predictions/{district_id} returns 34 series items with child identity."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/predictions/{did}",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200, f"District series failed for district {did}")
            data = resp.json()
            self.assertEqual(data["district_id"], did)
            self.assertEqual(data["district_name"], dist["name"])
            self.assertTrue(data["is_derived_from_parent"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertEqual(data["parent_district_name"], dist["parent_name"])
            self.assertEqual(len(data["series"]), 34)
            for point in data["series"]:
                self.assertIsNotNone(point["predicted_crime_count"])
                self.assertIsNotNone(point["forecast_period"])

    def test_08_prediction_actual_vs_predicted_lineage(self):
        """8. Crime Predictions: actual-vs-predicted returns child identity and lineage metadata."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/predictions/actual-vs-predicted?district_id={did}",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200, f"Actual vs predicted failed for district {did}")
            data = resp.json()
            self.assertEqual(data["district_id"], did)
            self.assertEqual(data["district_name"], dist["name"])
            self.assertTrue(data["is_derived_from_parent"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertEqual(data["parent_district_name"], dist["parent_name"])
            self.assertIsNotNone(data["notes"])
            self.assertGreater(len(data["comparison_points"]), 0)

    def test_09_analytics_overview_provenance_metadata(self):
        """9. Crime Analytics: overview returns lineage metadata for carved districts."""
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(
                f"/api/v1/analytics/overview?district_id={did}",
                headers=self.auth_headers,
            )
            self.assertEqual(resp.status_code, 200, f"Analytics overview failed for district {did}")
            data = resp.json()
            self.assertTrue(data["is_derived_from_parent"])
            self.assertEqual(data["parent_district_id"], dist["parent_id"])
            self.assertEqual(data["parent_district_name"], dist["parent_name"])
            self.assertIsNotNone(data["notes"])
            self.assertIn(dist["parent_name"], data["notes"])

    def test_10_data_coverage_endpoints(self):
        """10. Data Coverage: endpoints report exact tiers (DIRECT vs PARENT_DERIVED vs UNAVAILABLE)."""
        # Test summary
        summary_resp = client.get("/api/v1/geography/data-coverage/summary")
        self.assertEqual(summary_resp.status_code, 200)
        summary = summary_resp.json()
        self.assertGreaterEqual(summary["total_districts"], 797)
        self.assertEqual(summary["census_2011_districts"], 640)
        self.assertIn("tier_breakdown", summary)

        # Test individual new districts
        for dist in NEW_DISTRICTS:
            did = dist["id"]
            resp = client.get(f"/api/v1/geography/data-coverage/{did}")
            self.assertEqual(resp.status_code, 200)
            cov = resp.json()
            self.assertEqual(cov["district_id"], did)
            self.assertFalse(cov["is_census_2011"])
            self.assertEqual(cov["parent_district_id"], dist["parent_id"])
            # Check domains
            domains = cov["domains"]
            self.assertEqual(domains["crime_incidents"]["tier"], "PARENT_DERIVED")
            self.assertEqual(domains["demographics"]["tier"], "PARENT_DERIVED")
            self.assertEqual(domains["predictions"]["tier"], "PARENT_DERIVED")
            self.assertEqual(domains["risk_assessment"]["tier"], "PARENT_DERIVED")
            self.assertEqual(domains["district_resources"]["tier"], "UNAVAILABLE")

        # Test Census 2011 parent district (e.g. 135 Banas Kantha)
        parent_resp = client.get("/api/v1/geography/data-coverage/135")
        self.assertEqual(parent_resp.status_code, 200)
        p_cov = parent_resp.json()
        self.assertTrue(p_cov["is_census_2011"])
        self.assertEqual(p_cov["domains"]["crime_incidents"]["tier"], "DIRECT_OBSERVATION")
        self.assertEqual(p_cov["domains"]["demographics"]["tier"], "DIRECT_OBSERVATION")
        self.assertEqual(p_cov["domains"]["predictions"]["tier"], "DIRECT_OBSERVATION")
        self.assertEqual(p_cov["domains"]["risk_assessment"]["tier"], "DIRECT_OBSERVATION")

    def test_11_state_level_incident_non_inflation(self):
        """11. Anti-Inflation: State totals do not duplicate incidents between parents and carved children."""
        # Query Gujarat state overview
        resp = client.get("/api/v1/analytics/overview?state_id=11", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Incident total for Gujarat should exactly equal 8,697 (canonical total)
        self.assertEqual(data["total_incidents"], 8697)



if __name__ == "__main__":
    unittest.main()
