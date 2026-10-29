"""
Regression tests for Current Admin vs Historical Census Geography Switching in Analytics Engine.
Validates:
1. National KPI card jurisdiction values and subtitles in current (36 entities, 797 districts) vs historical (35 states, 640 districts).
2. AP bifurcation: Modern AP (13 parent districts, 7,072 incidents) vs Undivided Census 2011 AP (23 districts, 12,352 incidents).
3. Telangana resolution: Modern Telangana (10 parent districts, 5,280 incidents).
4. Incident integrity: Modern AP (7,072) + Modern Telangana (5,280) == Historical AP (12,352).
5. Longitudinal trends query propagation across both modes.
6. Top districts query propagation: Hyderabad presence in historical AP vs current Telangana.
7. Category, type, and weapon distribution query propagation across both modes.
"""

import os
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class TestGeographyModeSwitch(unittest.TestCase):
    def test_national_overview_current_mode(self):
        """Current mode: 36 administrative entities (28 States + 8 UTs), 797 modern districts."""
        resp = client.get("/api/v1/analytics/overview?geography_mode=current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_incidents"], 191679)
        self.assertEqual(data["total_states"], 36)
        self.assertEqual(data["total_districts"], 797)
        self.assertEqual(data["geography_mode"], "current")
        self.assertEqual(data["jurisdiction_label"], "Administrative Entities")
        self.assertEqual(data["jurisdiction_value"], "36 States & UTs")
        self.assertEqual(data["jurisdiction_subtext"], "797 Modern Administrative Districts (28 States, 8 UTs)")

    def test_national_overview_historical_mode(self):
        """Historical mode: 35 Census 2011 states/UTs, 640 Census 2011 districts."""
        resp = client.get("/api/v1/analytics/overview?geography_mode=historical")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_incidents"], 191679)
        self.assertEqual(data["total_states"], 35)
        self.assertEqual(data["total_districts"], 640)
        self.assertEqual(data["geography_mode"], "historical")
        self.assertEqual(data["jurisdiction_label"], "Census 2011 Districts")
        self.assertEqual(data["jurisdiction_value"], "640 Districts")
        self.assertEqual(data["jurisdiction_subtext"], "35 Census 2011 States & UTs")

    def test_national_overview_default_mode(self):
        """Default mode without geography_mode parameter must default to current."""
        resp = client.get("/api/v1/analytics/overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_incidents"], 191679)
        self.assertEqual(data["total_states"], 36)
        self.assertEqual(data["total_districts"], 797)
        self.assertEqual(data["geography_mode"], "current")

    def test_ap_bifurcation_and_telangana_resolution(self):
        """
        Tests AP bifurcation resolution:
        - Modern AP (state_id=2, current) -> 7,072 incidents across 13 historical parents, 28 modern districts.
        - Modern TG (state_id=36, current) -> 5,280 incidents across 10 historical parents, 33 modern districts.
        - Undivided AP (state_id=2, historical) -> 12,352 incidents across all 23 Census 2011 districts.
        - Integrity check: 7,072 + 5,280 == 12,352.
        """
        # Modern AP
        resp_ap_curr = client.get("/api/v1/analytics/overview?state_id=2&geography_mode=current")
        self.assertEqual(resp_ap_curr.status_code, 200)
        data_ap_curr = resp_ap_curr.json()
        self.assertEqual(data_ap_curr["total_incidents"], 7072)
        self.assertEqual(data_ap_curr["total_districts"], 28)
        self.assertEqual(data_ap_curr["jurisdiction_label"], "Administrative Districts")
        self.assertEqual(data_ap_curr["jurisdiction_value"], "28 Districts")
        self.assertIn("Current Admin", data_ap_curr["jurisdiction_subtext"])

        # Modern Telangana
        resp_tg_curr = client.get("/api/v1/analytics/overview?state_id=36&geography_mode=current")
        self.assertEqual(resp_tg_curr.status_code, 200)
        data_tg_curr = resp_tg_curr.json()
        self.assertEqual(data_tg_curr["total_incidents"], 5280)
        self.assertEqual(data_tg_curr["total_districts"], 33)
        self.assertEqual(data_tg_curr["jurisdiction_label"], "Administrative Districts")
        self.assertEqual(data_tg_curr["jurisdiction_value"], "33 Districts")
        self.assertIn("Current Admin", data_tg_curr["jurisdiction_subtext"])

        # Historical Undivided AP
        resp_ap_hist = client.get("/api/v1/analytics/overview?state_id=2&geography_mode=historical")
        self.assertEqual(resp_ap_hist.status_code, 200)
        data_ap_hist = resp_ap_hist.json()
        self.assertEqual(data_ap_hist["total_incidents"], 12352)
        self.assertEqual(data_ap_hist["total_districts"], 23)
        self.assertEqual(data_ap_hist["jurisdiction_label"], "Census 2011 Districts")
        self.assertEqual(data_ap_hist["jurisdiction_value"], "23 Districts")
        self.assertIn("Census 2011 Undivided", data_ap_hist["jurisdiction_subtext"])

        # Mathematical sum check
        self.assertEqual(
            data_ap_curr["total_incidents"] + data_tg_curr["total_incidents"],
            data_ap_hist["total_incidents"],
            "Sum of bifurcated incidents must exactly equal historical undivided AP incidents",
        )

    def test_trends_geography_mode_propagation(self):
        """Trends endpoint correctly aggregates by geographic layer."""
        # Current AP trends sum
        resp_ap_yr = client.get("/api/v1/analytics/trends?interval=year&state_id=2&geography_mode=current")
        self.assertEqual(resp_ap_yr.status_code, 200)
        sum_ap_curr = sum(item["incident_count"] for item in resp_ap_yr.json()["items"])
        self.assertEqual(sum_ap_curr, 7072)

        # Historical AP trends sum
        resp_ap_hist_yr = client.get("/api/v1/analytics/trends?interval=year&state_id=2&geography_mode=historical")
        self.assertEqual(resp_ap_hist_yr.status_code, 200)
        sum_ap_hist = sum(item["incident_count"] for item in resp_ap_hist_yr.json()["items"])
        self.assertEqual(sum_ap_hist, 12352)

        # Telangana trends sum
        resp_tg_yr = client.get("/api/v1/analytics/trends?interval=year&state_id=36&geography_mode=current")
        self.assertEqual(resp_tg_yr.status_code, 200)
        sum_tg_curr = sum(item["incident_count"] for item in resp_tg_yr.json()["items"])
        self.assertEqual(sum_tg_curr, 5280)

    def test_top_districts_mode_propagation(self):
        """Hyderabad appears in historical AP but not current AP; appears in Telangana."""
        # Current AP: Hyderabad (ID 9) must NOT be present
        resp_ap = client.get("/api/v1/analytics/top-districts?state_id=2&geography_mode=current&limit=25")
        self.assertEqual(resp_ap.status_code, 200)
        ap_ids = [d["district_id"] for d in resp_ap.json()["items"]]
        self.assertNotIn(9, ap_ids, "Hyderabad (ID 9) must not be in Current AP top districts")

        # Historical AP: Hyderabad (ID 9) MUST be present
        resp_ap_hist = client.get("/api/v1/analytics/top-districts?state_id=2&geography_mode=historical&limit=25")
        self.assertEqual(resp_ap_hist.status_code, 200)
        ap_hist_ids = [d["district_id"] for d in resp_ap_hist.json()["items"]]
        self.assertIn(9, ap_hist_ids, "Hyderabad (ID 9) must be in Historical AP top districts")

        # Telangana: Hyderabad (ID 9) MUST be present
        resp_tg = client.get("/api/v1/analytics/top-districts?state_id=36&geography_mode=current&limit=25")
        self.assertEqual(resp_tg.status_code, 200)
        tg_ids = [d["district_id"] for d in resp_tg.json()["items"]]
        self.assertIn(9, tg_ids, "Hyderabad (ID 9) must be in Telangana top districts")

    def test_breakdowns_mode_propagation(self):
        """Categories, types, and weapons endpoints correctly apply geography_mode filters."""
        # Category breakdown
        cat_ap_curr = client.get("/api/v1/analytics/by-category?state_id=2&geography_mode=current")
        self.assertEqual(cat_ap_curr.status_code, 200)
        self.assertEqual(cat_ap_curr.json()["total_incidents"], 7072)

        cat_ap_hist = client.get("/api/v1/analytics/by-category?state_id=2&geography_mode=historical")
        self.assertEqual(cat_ap_hist.status_code, 200)
        self.assertEqual(cat_ap_hist.json()["total_incidents"], 12352)

        # Type breakdown
        type_ap_curr = client.get("/api/v1/analytics/by-type?state_id=2&geography_mode=current")
        self.assertEqual(type_ap_curr.status_code, 200)
        self.assertEqual(type_ap_curr.json()["total_incidents"], 7072)

        type_ap_hist = client.get("/api/v1/analytics/by-type?state_id=2&geography_mode=historical")
        self.assertEqual(type_ap_hist.status_code, 200)
        self.assertEqual(type_ap_hist.json()["total_incidents"], 12352)

        # Weapons breakdown
        wp_ap_curr = client.get("/api/v1/analytics/weapons?state_id=2&geography_mode=current")
        self.assertEqual(wp_ap_curr.status_code, 200)
        self.assertEqual(wp_ap_curr.json()["total_incidents"], 7072)

        wp_ap_hist = client.get("/api/v1/analytics/weapons?state_id=2&geography_mode=historical")
        self.assertEqual(wp_ap_hist.status_code, 200)
        self.assertEqual(wp_ap_hist.json()["total_incidents"], 12352)


if __name__ == "__main__":
    unittest.main()
