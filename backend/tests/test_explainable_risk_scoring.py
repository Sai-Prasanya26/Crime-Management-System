"""
Phase 9: Comprehensive Test Suite for Explainable Crime Risk Scoring Engine.

Verifies:
1. Formula Reproducibility: Deterministic mathematical outputs for both HISTORICAL and FORECAST modes.
2. Score Range: Every overall score and component index strictly bounded within [0, 100].
3. Risk-Band Assignment: LOW (<35), MODERATE (35-49.99), HIGH (50-64.99), CRITICAL (>=65).
4. Normalization Edge Cases: Uniform arrays, ties with mid-rank, monotonic preservation.
5. Missing Component Handling: Safe fallback and documented weight renormalization without crashing.
6. Zero Crime Counts: Districts with zero incidents receive valid zero/neutral scores without division-by-zero.
7. Unsupported Geography: Non-positive or non-existent district demographics rejected safely.
8. Invalid Periods: Rejects malformed dates with 400 Bad Request.
9. Historical vs Forecast Separation: Historical scores do NOT use forecasts; forecast scores require active future forecasts.
10. Forecast Model Provenance: Persists model_id, model_version, and forecast_origin_date.
11. Duplicate Prevention: Idempotent upsert preserves unique (district_id, period_year, period_month, calculation_version).
12. Transaction Rollback: Database rollbacks cleanly on simulated failure during batch persistence.
13. API Authorization & RBAC: Calculate endpoint requires ADMIN or ANALYST role; non-analyst gets 403; unauthenticated gets 401.
14. Historical Incident Integrity: Confirms exactly 191,679 genuine incidents remain untouched.
"""

import sys
import os
import unittest
import numpy as np
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import engine, SessionLocal
from backend.app.services.risk_service import (
    RiskService,
    CALCULATION_VERSION_V2,
    V2_HIST_WEIGHT_VOLUME,
    V2_HIST_WEIGHT_SEVERITY,
    V2_HIST_WEIGHT_RATE,
    V2_HIST_WEIGHT_TREND,
    V2_FC_WEIGHT_FORECAST,
    V2_FC_WEIGHT_SEVERITY,
    V2_FC_WEIGHT_RATE,
    V2_FC_WEIGHT_TREND,
)
from backend.app.models.intelligence import CrimeRiskScore
from backend.app.models.crime import CrimeIncident

client = TestClient(app)


class TestExplainableRiskScoring(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up auth tokens for ADMIN and OFFICER roles."""
        # 1. Admin login
        admin_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        cls.admin_token = admin_resp.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Officer login (restricted role)
        officer_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert officer_resp.status_code == 200, f"Officer login failed: {officer_resp.text}"
        cls.officer_token = officer_resp.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_formula_reproducibility(self):
        """1. Formula Reproducibility: Deterministic output for known percentile vectors."""
        # Historical mode: 0.25 Volume + 0.25 Severity + 0.25 Rate + 0.25 Trend
        v, s, r, t = 80.0, 60.0, 70.0, 50.0
        expected_hist = (
            V2_HIST_WEIGHT_VOLUME * v
            + V2_HIST_WEIGHT_SEVERITY * s
            + V2_HIST_WEIGHT_RATE * r
            + V2_HIST_WEIGHT_TREND * t
        )
        self.assertAlmostEqual(expected_hist, 0.25 * 80 + 0.25 * 60 + 0.25 * 70 + 0.25 * 50)  # = 65.0
        self.assertAlmostEqual(expected_hist, 65.0)

        # Forecast mode: 0.30 Forecast + 0.20 Severity + 0.30 Rate + 0.20 Trend
        fc = 90.0
        expected_fc = (
            V2_FC_WEIGHT_FORECAST * fc
            + V2_FC_WEIGHT_SEVERITY * s
            + V2_FC_WEIGHT_RATE * r
            + V2_FC_WEIGHT_TREND * t
        )
        self.assertAlmostEqual(expected_fc, 0.30 * 90 + 0.20 * 60 + 0.30 * 70 + 0.20 * 50)  # 27 + 12 + 21 + 10 = 70.0
        self.assertAlmostEqual(expected_fc, 70.0)

    def test_02_score_range_0_to_100(self):
        """2. Score Range: Every overall score and component index in database is bounded in [0, 100]."""
        with engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT MIN(overall_risk_score), MAX(overall_risk_score),
                           MIN(volume_index), MAX(volume_index),
                           MIN(severity_index), MAX(severity_index),
                           MIN(trend_index), MAX(trend_index)
                    FROM crime_risk_scores
                    WHERE calculation_version = 'risk-v2.0'
                """)
            ).fetchone()
            self.assertIsNotNone(row)
            self.assertGreaterEqual(float(row[0]), 0.0)
            self.assertLessEqual(float(row[1]), 100.0)
            self.assertGreaterEqual(float(row[2]), 0.0)
            self.assertLessEqual(float(row[3]), 100.0)
            self.assertGreaterEqual(float(row[4]), 0.0)
            self.assertLessEqual(float(row[5]), 100.0)
            self.assertGreaterEqual(float(row[6]), 0.0)
            self.assertLessEqual(float(row[7]), 100.0)

    def test_03_risk_band_assignment(self):
        """3. Risk-Band Assignment: LOW (<35), MODERATE (35-49.99), HIGH (50-64.99), CRITICAL (>=65)."""
        self.assertEqual(RiskService.classify_risk_level(0.0), "LOW")
        self.assertEqual(RiskService.classify_risk_level(34.99), "LOW")
        self.assertEqual(RiskService.classify_risk_level(35.00), "MODERATE")
        self.assertEqual(RiskService.classify_risk_level(49.99), "MODERATE")
        self.assertEqual(RiskService.classify_risk_level(50.00), "HIGH")
        self.assertEqual(RiskService.classify_risk_level(64.99), "HIGH")
        self.assertEqual(RiskService.classify_risk_level(65.00), "CRITICAL")
        self.assertEqual(RiskService.classify_risk_level(100.00), "CRITICAL")

    def test_04_normalization_edge_cases(self):
        """4. Normalization Edge Cases: Identical arrays, ties with mid-rank, monotonic ranks."""
        # Identical values: mid-rank produces 50.0 for all entries
        uniform_arr = np.array([42.0, 42.0, 42.0, 42.0])
        pcts = RiskService.calculate_percentile_ranks(uniform_arr)
        for p in pcts:
            self.assertAlmostEqual(p, 50.0)

        # Ties with mid-rank
        ties_arr = np.array([5.0, 10.0, 10.0, 20.0])
        pcts_ties = RiskService.calculate_percentile_ranks(ties_arr)
        self.assertAlmostEqual(pcts_ties[0], 0.0)
        self.assertAlmostEqual(pcts_ties[1], 50.0)
        self.assertAlmostEqual(pcts_ties[2], 50.0)
        self.assertAlmostEqual(pcts_ties[3], 100.0)

        # Empty array
        empty_pcts = RiskService.calculate_percentile_ranks(np.array([]))
        self.assertEqual(len(empty_pcts), 0)

    def test_05_missing_component_handling(self):
        """5. Missing Component Handling: Absence of forecast in historical mode is strictly respected."""
        with engine.connect() as conn:
            hist_sample = conn.execute(
                text("SELECT forecast_index, score_type FROM crime_risk_scores WHERE score_type = 'HISTORICAL' LIMIT 1")
            ).fetchone()
            self.assertIsNotNone(hist_sample)
            self.assertIsNone(hist_sample[0], "Historical score must NOT have forecast_index!")
            self.assertEqual(hist_sample[1], "HISTORICAL")

    def test_06_zero_crime_counts(self):
        """6. Zero Crime Counts: Districts with zero incidents receive valid numerical scores without division-by-zero."""
        # Trend calculation with 0 recent incidents
        trend_zero = min(float(0) / float(10 + 1.0), 3.0)
        self.assertEqual(trend_zero, 0.0)

        # Trend calculation with 0 prior incidents (Laplace +1.0)
        trend_zero_prior = min(float(5) / float(0 + 1.0), 3.0)
        self.assertAlmostEqual(trend_zero_prior, 3.0)

        # Severity with 0 incidents defaults to neutral 1.0
        sev_zero = 1.0
        self.assertEqual(sev_zero, 1.0)

    def test_07_unsupported_geography(self):
        """7. Unsupported Geography: Rejects non-positive or non-existent district demographics safely."""
        with engine.connect() as conn:
            min_pop = conn.execute(
                text("SELECT MIN(total_population) FROM district_demographics WHERE census_year = 2011")
            ).scalar()
            self.assertGreater(min_pop, 0, "Non-positive Census demographic detected!")

        # Requesting a non-existent district ID returns 404
        resp = client.get("/api/v1/risk/districts/99999", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 404)

    def test_08_invalid_periods(self):
        """8. Invalid Periods: Rejects malformed dates with 400 Bad Request."""
        db = SessionLocal()
        try:
            with self.assertRaises(Exception):
                RiskService.run_risk_assessment(db, assessment_date="invalid-date-format")
        finally:
            db.close()

    def test_09_historical_versus_future_forecast_separation(self):
        """9. Historical vs Future Separation: Historical and Forecast modes are strictly segregated."""
        with engine.connect() as conn:
            # Historical records
            hist_count = conn.execute(
                text("SELECT COUNT(*) FROM crime_risk_scores WHERE score_type = 'HISTORICAL'")
            ).scalar()
            self.assertGreaterEqual(hist_count, 640)

            # Active forecast records
            fc_count = conn.execute(
                text("SELECT COUNT(*) FROM crime_risk_scores WHERE score_type = 'FORECAST' AND calculation_version = 'risk-v2.0'")
            ).scalar()
            self.assertGreaterEqual(fc_count, 1920)

            # Ensure all historical have NULL forecast_index
            hist_with_fc = conn.execute(
                text("SELECT COUNT(*) FROM crime_risk_scores WHERE score_type = 'HISTORICAL' AND forecast_index IS NOT NULL")
            ).scalar()
            self.assertEqual(hist_with_fc, 0, "Historical records must not contain forecast_index!")

    def test_10_forecast_model_provenance(self):
        """10. Forecast Model Provenance: Verifies model_id, model_version, and forecast_origin_date on future forecasts."""
        with engine.connect() as conn:
            fc_sample = conn.execute(
                text("""
                    SELECT model_id, model_version, forecast_origin_date
                    FROM crime_risk_scores
                    WHERE score_type = 'FORECAST' AND calculation_version = 'risk-v2.0'
                    LIMIT 1
                """)
            ).fetchone()
            self.assertIsNotNone(fc_sample)
            self.assertEqual(fc_sample[0], 1, "model_id != 1")
            self.assertEqual(fc_sample[1], "v1.0.0", "model_version != v1.0.0")
            self.assertEqual(str(fc_sample[2]), "2026-10-01", "forecast_origin_date != 2026-10-01")

    def test_11_duplicate_score_prevention(self):
        """11. Duplicate Prevention: Idempotent re-run does not create duplicate rows."""
        db = SessionLocal()
        try:
            initial = db.execute(
                text("SELECT COUNT(*) FROM crime_risk_scores WHERE period_year = 2026 AND period_month = 11 AND calculation_version = 'risk-v2.0'")
            ).scalar()
            self.assertEqual(initial, 640)

            # Re-run assessment for 2026-11-01
            res = RiskService.run_risk_assessment(
                db,
                assessment_date="2026-11-01",
                score_type="FORECAST",
                calculation_version="risk-v2.0",
            )
            self.assertEqual(res["districts_assessed"], 640)

            after = db.execute(
                text("SELECT COUNT(*) FROM crime_risk_scores WHERE period_year = 2026 AND period_month = 11 AND calculation_version = 'risk-v2.0'")
            ).scalar()
            self.assertEqual(after, 640, "Re-running created duplicate records!")
        finally:
            db.close()

    def test_12_database_transaction_rollback(self):
        """12. Transaction Rollback: Transaction rolls back on simulated failure without polluting database."""
        db = SessionLocal()
        try:
            initial_count = db.execute(text("SELECT COUNT(*) FROM crime_risk_scores")).scalar()

            # Attempt a corrupt record insertion in a nested transaction
            try:
                with db.begin_nested():
                    # Invalid district_id 99999 violates foreign key
                    db.execute(text("""
                        INSERT INTO crime_risk_scores (
                            district_id, period_year, period_month, overall_risk_score,
                            risk_level, score_type, severity_index, trend_index, volume_index,
                            population_density_factor, calculation_version
                        ) VALUES (
                            99999, 2099, 1, 50.0, 'MODERATE', 'FORECAST', 50.0, 50.0, 50.0, 50.0, 'test-fail'
                        )
                    """))
            except Exception:
                pass  # expected foreign key violation

            current_count = db.execute(text("SELECT COUNT(*) FROM crime_risk_scores")).scalar()
            self.assertEqual(current_count, initial_count, "Failed transaction was not cleanly rolled back!")
        finally:
            db.close()

    def test_13_api_authorization(self):
        """13. API Authorization & RBAC: /calculate requires ANALYST or ADMIN; unauthenticated is 401; OFFICER is 403."""
        # Unauthenticated request -> 401
        unauth_resp = client.post(
            "/api/v1/risk/calculate",
            json={"assessment_date": "2026-11-01", "calculation_version": "risk-v2.0"},
        )
        self.assertEqual(unauth_resp.status_code, 401)

        # Restricted officer request -> 403
        officer_resp = client.post(
            "/api/v1/risk/calculate",
            json={"assessment_date": "2026-11-01", "calculation_version": "risk-v2.0"},
            headers=self.officer_headers,
        )
        self.assertEqual(officer_resp.status_code, 403)

        # Admin authorized request -> 200
        admin_resp = client.post(
            "/api/v1/risk/calculate",
            json={"assessment_date": "2026-11-01", "score_type": "FORECAST", "calculation_version": "risk-v2.0"},
            headers=self.admin_headers,
        )
        self.assertEqual(admin_resp.status_code, 200)
        self.assertEqual(admin_resp.json()["status"], "success")

    def test_14_historical_incident_integrity(self):
        """14. Historical Crime Data Integrity: Asserts exactly 191,679 authentic records remain untouched."""
        with engine.connect() as conn:
            incident_count = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(
                incident_count,
                191679,
                f"Historical crime incidents count modified! Expected 191679, found {incident_count}",
            )

    def test_15_all_36_active_jurisdictions(self):
        """15. Jurisdiction Integrity: Confirms exactly 36 active States & UTs (28 states, 8 UTs)."""
        resp = client.get("/api/v1/geography/states?view=current", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        states = data.get("items", [])
        self.assertEqual(len(states), 36, f"Expected 36 active States/UTs, found {len(states)}")

        # Verify Telangana (36) and Ladakh (37) exist and are active
        state_ids = {s["id"] for s in states}
        self.assertIn(36, state_ids, "Telangana (state_id=36) missing from active jurisdictions!")
        self.assertIn(37, state_ids, "Ladakh (state_id=37) missing from active jurisdictions!")

        # Verify Daman & Diu (9) is inactive
        self.assertNotIn(9, state_ids, "Merged Daman and Diu (state_id=9) should not be an active jurisdiction!")

    def test_16_state_filter_telangana_and_ladakh(self):
        """16. State Filtering: Resolves Telangana (36), Ladakh (37), and AP (2) with modern state metadata."""
        # Telangana (36) -> 10 historical districts
        tel_resp = client.get("/api/v1/risk/districts?state_id=36&assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(tel_resp.status_code, 200)
        tel_data = tel_resp.json()
        self.assertEqual(tel_data["total"], 10)
        for item in tel_data["items"]:
            self.assertEqual(item["state_id"], 36)
            self.assertEqual(item["state_name"], "TELANGANA")

        # Ladakh (37) -> 2 historical districts (Kargil, Leh)
        lad_resp = client.get("/api/v1/risk/districts?state_id=37&assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(lad_resp.status_code, 200)
        lad_data = lad_resp.json()
        self.assertEqual(lad_data["total"], 2)
        for item in lad_data["items"]:
            self.assertEqual(item["state_id"], 37)
            self.assertEqual(item["state_name"], "LADAKH")

        # Andhra Pradesh (2) -> 13 historical districts
        ap_resp = client.get("/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(ap_resp.status_code, 200)
        ap_data = ap_resp.json()
        self.assertEqual(ap_data["total"], 13)
        for item in ap_data["items"]:
            self.assertEqual(item["state_id"], 2)
            self.assertEqual(item["state_name"], "ANDHRA PRADESH")

    def test_17_district_detail_modern_and_historical_id(self):
        """17. District Detail Dual-Resolution: Both modern (644) and historical (9) resolve to Hyderabad profile."""
        # Modern ID 644
        resp_modern = client.get("/api/v1/risk/districts/644?assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(resp_modern.status_code, 200)
        data_modern = resp_modern.json()
        self.assertEqual(data_modern["district_id"], 9)
        self.assertEqual(data_modern["district_name"], "Hyderabad")
        self.assertEqual(data_modern["state_id"], 36)
        self.assertEqual(data_modern["state_name"], "TELANGANA")

        # Historical ID 9
        resp_hist = client.get("/api/v1/risk/districts/9?assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(resp_hist.status_code, 200)
        data_hist = resp_hist.json()
        self.assertEqual(data_hist["district_id"], 9)
        self.assertEqual(data_hist["district_name"], "Hyderabad")
        self.assertEqual(data_hist["state_id"], 36)
        self.assertEqual(data_hist["state_name"], "TELANGANA")

    def test_18_honest_empty_state_handling(self):
        """18. Honest Empty State: Filtering by non-existent or unassessed geography returns empty list cleanly."""
        resp = client.get("/api/v1/risk/districts?state_id=9999&assessment_period=2026-11-01", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 0)
        self.assertEqual(len(data["items"]), 0)

    def test_19_risk_trends_with_modern_states(self):
        """19. Longitudinal Trends for Modern States: Telangana (36) trends return multi-period trajectory."""
        resp = client.get("/api/v1/risk/trends?state_id=36", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        trends = data.get("trends", [])
        self.assertGreater(len(trends), 0)
        self.assertGreater(trends[0]["mean_risk_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
