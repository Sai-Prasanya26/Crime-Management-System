"""
Comprehensive test suite verifying state-level prediction filtering,
historical-to-current boundary resolution, duplicate prevention, and response schema integrity (/api/v1/predictions).
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestStatePredictionFiltering(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    def test_01_telangana_state_predictions(self):
        """1. Telangana state-level predictions: state_id=36 returns exactly 340 predictions across 10 baseline districts, all with state_name='TELANGANA'."""
        resp = client.get(
            "/api/v1/predictions?state_id=36&limit=100",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 340)
        self.assertEqual(len(data["items"]), 100)
        for item in data["items"]:
            self.assertEqual(item["state_id"], 36)
            self.assertEqual(item["state_name"], "TELANGANA")
            self.assertIn("forecast_period", item)
            self.assertIn("predicted_crime_count", item)

    def test_02_ladakh_state_predictions(self):
        """2. Ladakh state-level predictions: state_id=37 returns exactly 68 predictions across 2 baseline districts (Kargil, Leh), all with state_name='LADAKH'."""
        resp = client.get(
            "/api/v1/predictions?state_id=37&limit=100",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 68)
        self.assertEqual(len(data["items"]), 68)
        dids = {item["district_id"] for item in data["items"]}
        self.assertEqual(dids, {198, 203})  # Historical Kargil and Leh
        for item in data["items"]:
            self.assertEqual(item["state_id"], 37)
            self.assertEqual(item["state_name"], "LADAKH")

    def test_03_other_state_predictions(self):
        """3. Other state-level predictions: AP (442), J&K (680), and DNHDD (102) return exact disjoint counts."""
        # Andhra Pradesh (state_id=2): excludes Telangana (13 districts * 34 = 442)
        resp_ap = client.get("/api/v1/predictions?state_id=2&limit=500", headers=self.auth_headers)
        self.assertEqual(resp_ap.status_code, 200)
        data_ap = resp_ap.json()
        self.assertEqual(data_ap["total"], 442)
        ap_dids = {it["district_id"] for it in data_ap["items"]}
        self.assertNotIn(4, ap_dids)  # Adilabad must not be in AP
        self.assertNotIn(9, ap_dids)  # Hyderabad must not be in AP

        # Jammu & Kashmir (state_id=14): excludes Ladakh (20 districts * 34 = 680)
        resp_jk = client.get("/api/v1/predictions?state_id=14&limit=1000", headers=self.auth_headers)
        self.assertEqual(resp_jk.status_code, 200)
        data_jk = resp_jk.json()
        self.assertEqual(data_jk["total"], 680)
        jk_dids = {it["district_id"] for it in data_jk["items"]}
        self.assertNotIn(198, jk_dids)  # Kargil must not be in J&K
        self.assertNotIn(203, jk_dids)  # Leh must not be in J&K

        # DNHDD (state_id=8): unified territory (3 districts * 34 = 102)
        resp_dnh = client.get("/api/v1/predictions?state_id=8&limit=200", headers=self.auth_headers)
        self.assertEqual(resp_dnh.status_code, 200)
        data_dnh = resp_dnh.json()
        self.assertEqual(data_dnh["total"], 102)

    def test_04_district_level_prediction_filtering(self):
        """4. District-level prediction filtering: preserves canonical (Neemuch #312) and carved (Hyderabad #644) district handling."""
        # Canonical district
        resp_can = client.get("/api/v1/predictions?district_id=312&limit=50", headers=self.auth_headers)
        self.assertEqual(resp_can.status_code, 200)
        data_can = resp_can.json()
        self.assertEqual(data_can["total"], 34)
        item_can = data_can["items"][0]
        self.assertEqual(item_can["district_id"], 312)
        self.assertEqual(item_can["district_name"], "Neemuch")
        self.assertFalse(item_can["is_derived_from_parent"])
        self.assertIsNone(item_can["parent_district_id"])

        # Carved child district
        resp_car = client.get("/api/v1/predictions?district_id=644&limit=50", headers=self.auth_headers)
        self.assertEqual(resp_car.status_code, 200)
        data_car = resp_car.json()
        self.assertEqual(data_car["total"], 34)
        item_car = data_car["items"][0]
        self.assertEqual(item_car["district_id"], 644)
        self.assertEqual(item_car["district_name"], "Hyderabad")
        self.assertEqual(item_car["state_id"], 36)
        self.assertEqual(item_car["state_name"], "TELANGANA")
        self.assertTrue(item_car["is_derived_from_parent"])
        self.assertEqual(item_car["parent_district_id"], 9)

    def test_05_date_range_filtering(self):
        """5. Date-range filtering: forecast_period filter returns exactly one prediction per covered district."""
        # In Telangana (10 districts), filtering by period 2026-11-01 returns exactly 10 predictions
        resp = client.get(
            "/api/v1/predictions?state_id=36&forecast_period=2026-11-01",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 10)
        self.assertEqual(len(data["items"]), 10)
        for it in data["items"]:
            self.assertEqual(it["forecast_period"], "2026-11-01")
            self.assertEqual(it["state_id"], 36)

    def test_06_pagination(self):
        """6. Pagination: verifies skip, limit, and disjoint non-overlapping page items."""
        resp_p1 = client.get(
            "/api/v1/predictions?state_id=36&skip=0&limit=15",
            headers=self.auth_headers,
        )
        resp_p2 = client.get(
            "/api/v1/predictions?state_id=36&skip=15&limit=15",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_p1.status_code, 200)
        self.assertEqual(resp_p2.status_code, 200)
        p1 = resp_p1.json()
        p2 = resp_p2.json()
        self.assertEqual(p1["total"], 340)
        self.assertEqual(p2["total"], 340)
        self.assertEqual(len(p1["items"]), 15)
        self.assertEqual(len(p2["items"]), 15)
        p1_ids = {it["id"] for it in p1["items"]}
        p2_ids = {it["id"] for it in p2["items"]}
        self.assertTrue(p1_ids.isdisjoint(p2_ids), "Pagination pages must contain disjoint items")

    def test_07_duplicate_prediction_prevention(self):
        """7. Duplicate prediction prevention: multiple carved districts mapping to one parent never multiply prediction rows."""
        # Telangana has 33 modern districts mapped to 10 historical districts.
        # Querying all Telangana predictions must return exactly 340 records, with 340 unique IDs.
        resp = client.get(
            "/api/v1/predictions?state_id=36&limit=500",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 340)
        self.assertEqual(len(data["items"]), 340)
        ids = [it["id"] for it in data["items"]]
        self.assertEqual(len(ids), len(set(ids)), "All prediction IDs must be unique (zero duplicates)")

    def test_08_historical_to_current_district_mapping(self):
        """8. Historical-to-current district mapping: verifies mapped state identity and parent district resolution."""
        # Query carved Hyderabad (#644) under Telangana (#36)
        resp = client.get(
            "/api/v1/predictions?state_id=36&district_id=644",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 34)
        for it in data["items"]:
            self.assertEqual(it["district_id"], 644)
            self.assertEqual(it["district_name"], "Hyderabad")
            self.assertEqual(it["state_id"], 36)
            self.assertEqual(it["state_name"], "TELANGANA")
            self.assertTrue(it["is_derived_from_parent"])
            self.assertEqual(it["parent_district_id"], 9)
            self.assertIsNotNone(it["parent_district_name"])

    def test_09_unmapped_district_handling(self):
        """9. Unmapped district handling: nonexistent district_id or state_id returns 0 records cleanly."""
        # Nonexistent state
        resp_state = client.get("/api/v1/predictions?state_id=99999", headers=self.auth_headers)
        self.assertEqual(resp_state.status_code, 200)
        self.assertEqual(resp_state.json()["total"], 0)
        self.assertEqual(len(resp_state.json()["items"]), 0)

        # Nonexistent district
        resp_dist = client.get("/api/v1/predictions?district_id=99999", headers=self.auth_headers)
        self.assertEqual(resp_dist.status_code, 200)
        self.assertEqual(resp_dist.json()["total"], 0)
        self.assertEqual(len(resp_dist.json()["items"]), 0)

        # Mismatched state and district (AP #2 + Hyderabad #644)
        resp_mismatch = client.get("/api/v1/predictions?state_id=2&district_id=644", headers=self.auth_headers)
        self.assertEqual(resp_mismatch.status_code, 200)
        self.assertEqual(resp_mismatch.json()["total"], 0)

    def test_10_api_response_consistency(self):
        """10. API response consistency: verifies PredictionItemResponse fields, data types, and /monthly parity."""
        # Root endpoint
        resp_root = client.get("/api/v1/predictions?state_id=36&limit=1", headers=self.auth_headers)
        self.assertEqual(resp_root.status_code, 200)
        item_root = resp_root.json()["items"][0]

        # Monthly endpoint
        resp_month = client.get("/api/v1/predictions/monthly?state_id=36&limit=1", headers=self.auth_headers)
        self.assertEqual(resp_month.status_code, 200)
        item_month = resp_month.json()["items"][0]

        required_keys = [
            "id", "district_id", "district_name", "state_id", "state_name",
            "forecast_period", "predicted_crime_count", "forecast_status",
            "model_version", "model_name", "is_derived_from_parent",
        ]
        for key in required_keys:
            self.assertIn(key, item_root)
            self.assertIn(key, item_month)

        self.assertIsInstance(item_root["predicted_crime_count"], (int, float))
        self.assertIsInstance(item_root["id"], int)
        self.assertIsInstance(item_root["district_id"], int)
        self.assertIsInstance(item_root["state_id"], int)
        self.assertEqual(item_root["id"], item_month["id"])


if __name__ == "__main__":
    unittest.main()
