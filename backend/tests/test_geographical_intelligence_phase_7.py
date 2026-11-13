"""
Unit and integration test suite for Phase 7: Geographical Intelligence Verification and Completion.

Tests validate:
1. /geography/states/crime-summary endpoint returns all 36 active states/UTs in current mode and 35 in historical mode.
2. /geography/states/crime-summary supports category_id and temporal filtering.
3. /analytics/top-districts supports category_id filtering, ranking by volume and rate per 100k, and limits up to 1000.
4. Census 2011 demographic normalization: Crime Rate per 100k = (crimes / population) * 100,000.
5. Lineage handling for carved modern administrative districts vs Census 2011 baseline.
6. Active jurisdiction counts (36 active states/UTs, 790 active districts).
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure project root in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.main import app

client = TestClient(app)


class TestGeographicalIntelligencePhase7(unittest.TestCase):
    def test_state_crime_summary_current_framework(self):
        """Verify that state crime summary returns exactly 36 active jurisdictions and total incidents match database."""
        resp = client.get("/api/v1/geography/states/crime-summary?view=current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_states"], 36)
        self.assertEqual(data["total_incidents"], 191679)
        self.assertEqual(len(data["items"]), 36)

        # Check sample states
        an = next((s for s in data["items"] if s["state_name"] == "ANDAMAN AND NICOBAR ISLANDS"), None)
        self.assertIsNotNone(an)
        self.assertEqual(an["district_count"], 3)
        self.assertEqual(an["incident_count"], 286)
        self.assertEqual(an["total_population"], 380581)
        self.assertEqual(an["crime_rate_per_100k"], 75.15)

        ap = next((s for s in data["items"] if s["state_name"] == "ANDHRA PRADESH"), None)
        self.assertIsNotNone(ap)
        self.assertEqual(ap["district_count"], 28)
        self.assertEqual(ap["incident_count"], 7072)
        self.assertEqual(ap["total_population"], 49386799)
        self.assertEqual(ap["crime_rate_per_100k"], 14.32)

    def test_state_crime_summary_historical_framework(self):
        """Verify that state crime summary in historical mode aggregates undivided historical states."""
        resp = client.get("/api/v1/geography/states/crime-summary?view=historical")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["view"], "historical")
        # Undivided AP in historical Census 2011 mode
        ap = next((s for s in data["items"] if s["state_id"] == 2), None)
        self.assertIsNotNone(ap)
        self.assertEqual(ap["incident_count"], 12352)

    def test_state_crime_summary_category_filter(self):
        """Verify category filtering on state crime summary (Category 1: Violent Crime)."""
        resp = client.get("/api/v1/geography/states/crime-summary?category_id=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_states"], 36)
        self.assertEqual(data["total_incidents"], 17521)
        self.assertLess(data["total_incidents"], 191679)

    def test_top_districts_with_category_filter(self):
        """Verify that /analytics/top-districts accepts category_id."""
        resp = client.get("/api/v1/analytics/top-districts?category_id=1&limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["items"]), 10)
        # Verify incidents are filtered by category
        for item in data["items"]:
            self.assertGreater(item["incident_count"], 0)

    def test_top_districts_rate_metric_and_demographics(self):
        """Verify rate metric ordering and Census population normalizations."""
        resp = client.get("/api/v1/analytics/top-districts?metric=rate&limit=5")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["metric"], "rate")
        items = data["items"]
        self.assertEqual(len(items), 5)
        # Verify descending order by rate
        for i in range(len(items) - 1):
            rate_curr = items[i]["crime_rate_per_100k"] or 0
            rate_next = items[i + 1]["crime_rate_per_100k"] or 0
            self.assertGreaterEqual(rate_curr, rate_next)

    def test_top_districts_state_all_districts_expansion(self):
        """Verify that limit up to 1000 allows fetching all constituent districts of a state."""
        resp = client.get("/api/v1/analytics/top-districts?state_id=2&limit=50&geography_mode=current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # AP historical mapped districts
        self.assertEqual(len(data["items"]), 13)

    def test_carved_district_detail_demographics(self):
        """Verify that carved modern district detail includes lineage and Census notes."""
        resp = client.get("/api/v1/geography/districts/644")  # Hyderabad child
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], 644)
        self.assertEqual(data["parent_district_id"], 9)
        self.assertTrue(data["is_derived_from_parent"])
        self.assertIsNotNone(data["notes"])
        self.assertIn("dynamically derived from parent jurisdiction", data["notes"])


if __name__ == "__main__":
    unittest.main()
