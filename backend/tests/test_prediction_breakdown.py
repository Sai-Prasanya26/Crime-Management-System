"""
Comprehensive test suite verifying the category-wise and crime-type-wise forecasting endpoint
(/api/v1/predictions/breakdown) in the Predictions module.
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestPredictionBreakdown(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    def test_01_breakdown_census_baseline_district(self):
        """1. Verify category and crime-type breakdown for a Census baseline district (Neemuch #312)."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=312&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 312)
        self.assertEqual(data["district_name"], "Neemuch")
        self.assertFalse(data["is_derived_from_parent"])
        self.assertEqual(data["period"], "2026-11")
        self.assertTrue(data["total_predicted_count"] > 0)

        # Verify all 4 database-supported categories exist
        categories = data["categories"]
        self.assertEqual(len(categories), 4)
        cat_names = {c["category_name"] for c in categories}
        self.assertEqual(cat_names, {"Other Crime", "Violent Crime", "Fire Accident", "Traffic Fatality"})

        # Verify category shares sum to 100% (within 0.5% due to display rounding)
        cat_share_sum = sum(c["share_of_total_percent"] for c in categories)
        self.assertAlmostEqual(cat_share_sum, 100.0, delta=0.5)

        # Verify category predicted counts sum to total_predicted_count (within display rounding)
        cat_pred_sum = sum(c["predicted_count"] for c in categories)
        self.assertAlmostEqual(cat_pred_sum, data["total_predicted_count"], delta=0.05)

        # Verify all 21 database-supported crime types exist
        crime_types = data["crime_types"]
        self.assertEqual(len(crime_types), 21)

        # Check each crime type has required fields
        for ct in crime_types:
            self.assertIn("crime_type_id", ct)
            self.assertIn("crime_code", ct)
            self.assertIn("crime_name", ct)
            self.assertIn("severity_level", ct)
            self.assertIn("share_of_category_percent", ct)
            self.assertIn("share_of_total_percent", ct)
            self.assertIn("is_sparse", ct)

        # Verify crime types sum to their respective category counts
        for c in categories:
            cid = c["category_id"]
            types_in_cat = [ct for ct in crime_types if ct["category_id"] == cid]
            types_pred_sum = sum(ct["predicted_count"] for ct in types_in_cat)
            self.assertAlmostEqual(types_pred_sum, c["predicted_count"], delta=0.05)

    def test_02_breakdown_carved_district_lineage(self):
        """2. Verify child district identity and parent lineage for carved district Vav-Tharad (#806)."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=806&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 806)
        self.assertEqual(data["district_name"], "Vav-Tharad")
        self.assertTrue(data["is_derived_from_parent"])
        self.assertEqual(data["parent_district_id"], 135)
        self.assertEqual(data["parent_district_name"], "Banas Kantha")
        self.assertIn("Banas Kantha", data["provenance_notes"])

        self.assertEqual(len(data["categories"]), 4)
        self.assertEqual(len(data["crime_types"]), 21)
        self.assertTrue(data["total_predicted_count"] > 0)

    def test_03_historical_period_breakdown(self):
        """3. Verify breakdown for historical period (May 2025) uses prior year baseline."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=312&year=2025&month=5",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["is_historical"])
        self.assertEqual(data["period"], "2025-05")
        for cat in data["categories"]:
            self.assertEqual(cat["baseline_period"], "2024-05")

    def test_04_zero_baseline_handling(self):
        """4. Verify zero baseline counts return null percentage change with valid numeric baseline."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=312&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check any item where baseline is 0.0 has percentage_change is None
        for ct in data["crime_types"]:
            if ct["historical_baseline_count"] == 0.0:
                self.assertIsNone(ct["percentage_change"])

    def test_05_invalid_parameters_error_handling(self):
        """5. Verify invalid month returns 422 Unprocessable Entity and nonexistent district returns 404."""
        bad_month_resp = client.get(
            "/api/v1/predictions/breakdown?district_id=312&year=2026&month=13",
            headers=self.auth_headers,
        )
        self.assertEqual(bad_month_resp.status_code, 422)

        not_found_resp = client.get(
            "/api/v1/predictions/breakdown?district_id=999999&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(not_found_resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
