"""
Comprehensive test suite verifying that carved districts have null actual_count for historical periods
and expose parent-derived baseline counts without falsification (Phase A - Fix 2).
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestCarvedDistrictHistoricalActuals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    def test_01_canonical_district_historical_has_true_actual(self):
        """Verifies Census 2011 canonical district (Neemuch #312) returns true actual_count and HISTORICAL_ACTUAL."""
        resp = client.get(
            "/api/v1/predictions/district-month?district_id=312&year=2024&month=6",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 312)
        self.assertEqual(data["district_name"], "Neemuch")
        self.assertFalse(data["is_derived_from_parent"])
        self.assertIsNone(data["parent_district_id"])
        self.assertIsNone(data["parent_baseline_count"])
        self.assertEqual(data["data_type"], "HISTORICAL_ACTUAL")
        self.assertTrue(data["is_historical"])
        self.assertFalse(data["is_forecast"])
        self.assertIsNotNone(data["actual_count"])
        self.assertGreater(data["actual_count"], 0)

    def test_02_carved_district_historical_returns_strict_null_actual(self):
        """Verifies carved district (Vav-Tharad #806) returns actual_count: null, DERIVED_HISTORICAL_BASELINE, and parent_baseline_count."""
        resp = client.get(
            "/api/v1/predictions/district-month?district_id=806&year=2024&month=6",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 806)
        self.assertTrue(data["is_derived_from_parent"])
        self.assertIsNotNone(data["parent_district_id"])
        self.assertEqual(data["data_type"], "DERIVED_HISTORICAL_BASELINE")
        self.assertTrue(data["is_historical"])
        self.assertFalse(data["is_forecast"])
        # CRUCIAL: actual_count must be strict null because no independent observations exist
        self.assertIsNone(data["actual_count"])
        # Parent baseline count must be exposed for analytical continuity
        self.assertIsNotNone(data["parent_baseline_count"])
        self.assertGreater(data["parent_baseline_count"], 0)
        self.assertIn("had no independent actual incident records", data["explanation"])

    def test_03_carved_district_actual_vs_predicted_series(self):
        """Verifies actual-vs-predicted timeline for carved district sets actual_count: null and DERIVED_HISTORICAL_BASELINE."""
        resp = client.get(
            "/api/v1/predictions/actual-vs-predicted?district_id=806",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["is_derived_from_parent"])
        self.assertIsNotNone(data["parent_district_id"])
        # Error metrics should be null for carved child since child has no direct actuals
        self.assertIsNone(data["overall_mae"])

        pts = data["comparison_points"]
        self.assertGreater(len(pts), 0)
        hist_pts = [p for p in pts if p["period"] <= "2025-12-01"]
        self.assertGreater(len(hist_pts), 0)

        for pt in hist_pts:
            self.assertIsNone(pt["actual_count"])
            self.assertIsNotNone(pt["parent_baseline_count"])
            self.assertEqual(pt["forecast_status"], "DERIVED_HISTORICAL_BASELINE")
            self.assertIsNone(pt["error"])

    def test_04_carved_district_breakdown_historical(self):
        """Verifies prediction breakdown for carved district returns total_actual_count: null and DERIVED_HISTORICAL_BASELINE."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=806&year=2024&month=6",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["is_derived_from_parent"])
        self.assertEqual(data["data_type"], "DERIVED_HISTORICAL_BASELINE")
        self.assertIsNone(data["total_actual_count"])
        self.assertIsNotNone(data["parent_baseline_count"])
        self.assertGreater(data["parent_baseline_count"], 0)

    def test_05_carved_district_future_forecast_intact(self):
        """Verifies forward forecast (2027) for carved district still generates valid predictions."""
        resp = client.get(
            "/api/v1/predictions/district-month?district_id=806&year=2027&month=3",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["is_derived_from_parent"])
        self.assertEqual(data["data_type"], "FORECAST")
        self.assertTrue(data["is_forecast"])
        self.assertFalse(data["is_historical"])
        self.assertIsNotNone(data["predicted_count"])
        self.assertIsNone(data["actual_count"])
        self.assertIsNone(data["parent_baseline_count"])


if __name__ == "__main__":
    unittest.main()
