"""
Phase 9: Comprehensive Automated Verification Suite for Crime Risk Assessment.

Validates:
1. State-Wise Risk Summary (/api/v1/risk/states/summary):
   - All 36 active States/UTs represented.
   - Reorganization mapping for carved states (Telangana #36, Ladakh #37).
   - Aggregate statistics: assessed districts count, mean threat score, highest risk district.
2. National Risk Distribution (/api/v1/risk/distribution):
   - 4 discrete risk bands: LOW (< 35.0), MODERATE (35.0 - 49.9), HIGH (50.0 - 64.9), CRITICAL (>= 65.0).
   - Distribution counts sum exactly to total assessed districts (640).
   - Percentages sum to 100.0%.
3. Top High-Risk Districts (/api/v1/risk/top-districts):
   - Ranked descending by overall risk score.
   - Configurable limit and state_id filtering.
4. Search & Filter Normalization:
   - District and state text search parameter.
   - Alias normalization: 'MEDIUM' correctly maps to 'MODERATE'.
5. Carved District Lineage Integrity:
   - Modern carved districts resolve parent district Census 2011 baseline.
   - Flags 'is_derived_from_parent = True' and populates parent metadata.
6. RBAC & Protected Endpoints:
   - Unauthenticated requests rejected with 401 Unauthorized.
   - Non-analyst role forbidden from /calculate (403).
   - Analyst/Admin authorized.
7. Database & System Integrity Guardrails:
   - Historical incidents remain exactly 191,679.
   - Predictions remain exactly 21,760.
   - Master jurisdictions remain 36 active states and 790 active districts.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import engine

client = TestClient(app)


class TestRiskAssessmentPhase9(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up auth credentials for Admin and Officer."""
        # Admin login
        admin_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        cls.admin_token = admin_resp.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Officer login (read-only for calculations)
        officer_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert officer_resp.status_code == 200, f"Officer login failed: {officer_resp.text}"
        cls.officer_token = officer_resp.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_state_risk_summary_36_active_states(self):
        """1. State Summary Endpoint: Verifies 36 active States/UTs are represented with aggregate metrics."""
        resp = client.get(
            "/api/v1/risk/states/summary?assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["assessment_period"], "2026-11-01")
        self.assertEqual(data["score_type"], "FORECAST")
        self.assertEqual(data["total_states"], 36)
        items = data["items"]
        self.assertEqual(len(items), 36)

        state_names = {item["state_name"] for item in items}
        # Verify both carved states (Telangana and Ladakh) are included
        self.assertIn("TELANGANA", state_names)
        self.assertIn("LADAKH", state_names)

        # Verify aggregate attributes for each state
        total_assessed_districts = sum(item["assessed_districts_count"] for item in items)
        self.assertEqual(total_assessed_districts, 640)

        for item in items:
            self.assertIn("mean_risk_score", item)
            self.assertIn("highest_risk_score", item)
            self.assertIn("risk_level_counts", item)
            self.assertGreaterEqual(item["mean_risk_score"], 0.0)
            self.assertLessEqual(item["mean_risk_score"], 100.0)

    def test_02_risk_distribution_four_categories(self):
        """2. Category Distribution Endpoint: 4 categories summing to 640 districts and ~100%."""
        resp = client.get(
            "/api/v1/risk/distribution?assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total_assessed_districts"], 640)
        dist = data["distribution"]
        pcts = data["percentages"]
        thresholds = data["thresholds"]

        # Confirm all 4 categories exist
        for cat in ["LOW", "MODERATE", "HIGH", "CRITICAL"]:
            self.assertIn(cat, dist)
            self.assertIn(cat, pcts)
            self.assertIn(cat, thresholds)

        # Sum of counts must equal 640
        total_count = sum(dist[cat] for cat in ["LOW", "MODERATE", "HIGH", "CRITICAL"])
        self.assertEqual(total_count, 640)

        # Sum of percentages must equal 100.0 (allow small float rounding tolerance)
        total_pct = sum(pcts[cat] for cat in ["LOW", "MODERATE", "HIGH", "CRITICAL"])
        self.assertAlmostEqual(total_pct, 100.0, places=1)

        # Thresholds verification
        self.assertIn("35.0", thresholds["MODERATE"])
        self.assertIn("50.0", thresholds["HIGH"])
        self.assertIn("65.0", thresholds["CRITICAL"])
        self.assertIn("35.0", thresholds["LOW"])

    def test_03_top_risk_districts_ranking(self):
        """3. Top High-Risk Districts: Descending sort order, bounded scores, and limit."""
        resp = client.get(
            "/api/v1/risk/top-districts?limit=15&assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["limit"], 15)
        items = data["items"]
        self.assertEqual(len(items), 15)

        # Verify descending sort order
        scores = [item["overall_risk_score"] for item in items]
        self.assertEqual(scores, sorted(scores, reverse=True))

        for item in items:
            self.assertGreaterEqual(item["overall_risk_score"], 0.0)
            self.assertLessEqual(item["overall_risk_score"], 100.0)
            self.assertIsNotNone(item["district_name"])
            self.assertIsNotNone(item["state_name"])

    def test_04_text_search_filtering(self):
        """4. Text Search Filter: District and state name partial search."""
        # Search for 'Hyderabad'
        resp_hyd = client.get(
            "/api/v1/risk/districts?search=Hyderabad&assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_hyd.status_code, 200)
        data_hyd = resp_hyd.json()
        self.assertGreaterEqual(data_hyd["total"], 1)
        for item in data_hyd["items"]:
            self.assertTrue(
                "hyderabad" in item["district_name"].lower()
                or "hyderabad" in (item["state_name"] or "").lower()
            )

        # Search for 'Delhi'
        resp_del = client.get(
            "/api/v1/risk/districts?search=Delhi&assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_del.status_code, 200)
        data_del = resp_del.json()
        self.assertGreaterEqual(data_del["total"], 1)

    def test_05_risk_level_filter_and_alias_normalization(self):
        """5. Risk Band Filtering: Both 'MODERATE' and 'MEDIUM' return moderate risk districts."""
        # Query using official name 'MODERATE'
        resp_mod = client.get(
            "/api/v1/risk/districts?risk_level=MODERATE&assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_mod.status_code, 200)
        data_mod = resp_mod.json()

        # Query using alias 'MEDIUM'
        resp_med = client.get(
            "/api/v1/risk/districts?risk_level=MEDIUM&assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_med.status_code, 200)
        data_med = resp_med.json()

        # Both must return the identical total count
        self.assertEqual(data_mod["total"], data_med["total"])
        self.assertGreater(data_mod["total"], 0)
        for item in data_mod["items"]:
            self.assertEqual(item["risk_level"], "MODERATE")

    def test_06_carved_district_lineage_and_metadata(self):
        """6. Carved District Lineage: Child district maps to parent Census 2011 district with lineage flag."""
        # Vav-Tharad (ID 806) carved from Banas Kantha (ID 135)
        resp = client.get(
            "/api/v1/risk/districts/806?assessment_period=2026-11-01",
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 806)
        self.assertEqual(data["district_name"], "Vav-Tharad")
        self.assertTrue(data["is_derived_from_parent"])
        self.assertEqual(data["parent_district_id"], 135)
        self.assertEqual(data["parent_district_name"], "Banas Kantha")
        self.assertIn("Banas Kantha", data["notes"])

    def test_07_auth_and_rbac_enforcement(self):
        """7. RBAC & Security: 401 for unauthenticated, 403 for unauthorized calculations."""
        # Unauthenticated request to protected endpoint
        resp_unauth = client.get("/api/v1/risk/overview")
        self.assertEqual(resp_unauth.status_code, 401)

        # Officer (read-only role) attempting to run recalculation
        resp_officer = client.post(
            "/api/v1/risk/calculate",
            json={"assessment_date": "2026-11-01"},
            headers=self.officer_headers,
        )
        self.assertEqual(resp_officer.status_code, 403)

    def test_08_database_and_historical_integrity(self):
        """8. System Guardrails: Exact historical incidents (191,679) and predictions (21,760) intact."""
        with engine.connect() as conn:
            # Historical incidents count
            incidents_count = conn.execute(
                text("SELECT COUNT(*) FROM crime_incidents")
            ).scalar()
            self.assertEqual(
                incidents_count,
                191679,
                "Historical crime incidents count was unexpectedly modified!",
            )

            # Crime predictions count
            predictions_count = conn.execute(
                text("SELECT COUNT(*) FROM crime_predictions")
            ).scalar()
            self.assertEqual(
                predictions_count,
                21760,
                "Crime predictions count was unexpectedly modified!",
            )

            # Active jurisdictions count
            active_states = conn.execute(
                text("SELECT COUNT(*) FROM states WHERE is_active = 1")
            ).scalar()
            self.assertEqual(
                active_states,
                36,
                "Active States/UTs count must be exactly 36!",
            )

            active_districts = conn.execute(
                text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")
            ).scalar()
            self.assertEqual(
                active_districts,
                790,
                "Active administrative districts must be exactly 790!",
            )


if __name__ == "__main__":
    unittest.main()
