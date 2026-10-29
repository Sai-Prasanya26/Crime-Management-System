"""
Comprehensive test suite verifying filter-aware behavior, state-join correctness,
and child-district identity preservation in the Top Jurisdictions table (/api/v1/analytics/top-districts).
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestTopDistrictsFiltering(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {token}"}

    def test_01_telangana_warangal_2025(self):
        """1. Telangana + Warangal (672) + 2025 returns Warangal with 87 incidents and State: TELANGANA."""
        resp = client.get(
            "/api/v1/analytics/top-districts?state_id=36&district_id=672&start_date=2025-01-01&end_date=2025-12-31",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 1)
        item = data["items"][0]
        self.assertEqual(item["district_id"], 672)
        self.assertEqual(item["district_name"], "Warangal")
        self.assertEqual(item["state_name"], "TELANGANA")
        self.assertEqual(item["incident_count"], 87)
        self.assertTrue(item["is_derived_from_parent"])
        self.assertEqual(item["parent_district_id"], 24)
        self.assertEqual(item["parent_district_name"], "Warangal")

    def test_02_telangana_all_districts_2025(self):
        """2. Telangana without district selected returns top Telangana districts, all with State: TELANGANA."""
        resp = client.get(
            "/api/v1/analytics/top-districts?state_id=36&start_date=2025-01-01&end_date=2025-12-31",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 10)
        for item in data["items"]:
            self.assertEqual(item["state_name"], "TELANGANA", f"District {item['district_name']} should have state TELANGANA")
        # Verify top district is Rangareddy with 160 incidents
        self.assertEqual(data["items"][0]["district_name"], "Rangareddy")
        self.assertEqual(data["items"][0]["incident_count"], 160)

    def test_03_nationwide_all_states_2025(self):
        """3. All states with no district selected returns top nationwide jurisdictions with correct state names."""
        resp = client.get(
            "/api/v1/analytics/top-districts?start_date=2025-01-01&end_date=2025-12-31&limit=5",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 5)
        # Top 1 nationwide should be Thane (239 incidents, MAHARASHTRA)
        self.assertEqual(data["items"][0]["district_name"], "Thane")
        self.assertEqual(data["items"][0]["state_name"], "MAHARASHTRA")
        self.assertEqual(data["items"][0]["incident_count"], 239)

    def test_04_maharashtra_thane_2025(self):
        """4. Another state and district: Maharashtra + Thane (363) + 2025."""
        resp = client.get(
            "/api/v1/analytics/top-districts?state_id=21&district_id=363&start_date=2025-01-01&end_date=2025-12-31",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 1)
        item = data["items"][0]
        self.assertEqual(item["district_id"], 363)
        self.assertEqual(item["district_name"], "Thane")
        self.assertEqual(item["state_name"], "MAHARASHTRA")
        self.assertEqual(item["incident_count"], 239)

    def test_05_andhra_pradesh_current_vs_historical(self):
        """5. Andhra Pradesh: Hyderabad (ID 9) absent in current mode; present in historical mode."""
        resp_curr = client.get(
            "/api/v1/analytics/top-districts?state_id=2&geography_mode=current&limit=25",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_curr.status_code, 200)
        curr_ids = [d["district_id"] for d in resp_curr.json()["items"]]
        self.assertNotIn(9, curr_ids, "Hyderabad (ID 9) must NOT be in Current AP")
        for item in resp_curr.json()["items"]:
            self.assertEqual(item["state_name"], "ANDHRA PRADESH")

        resp_hist = client.get(
            "/api/v1/analytics/top-districts?state_id=2&geography_mode=historical&limit=25",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_hist.status_code, 200)
        hist_ids = [d["district_id"] for d in resp_hist.json()["items"]]
        self.assertIn(9, hist_ids, "Hyderabad (ID 9) MUST be in Historical AP")


if __name__ == "__main__":
    unittest.main()

