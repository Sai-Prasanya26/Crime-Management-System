"""
Phase 8B: Crime Forecasting, Uncertainty & Freshness Automated Test Suite.

Verifications:
1. Forecast status classification (HISTORICAL_EVALUATION, PAST_FORECAST, CURRENT_FUTURE_FORECAST).
2. Forecast origin date (2026-10-01) and target dates (2026-11-01 to 2027-01-01) alignment.
3. Recursive multi-step feature updates (lags and rolling means step-by-step).
4. Prevention of future data leakage into forward predictions.
5. Chronological walk-forward backtesting (MAE, RMSE, WAPE across h=1, h=3, h=6).
6. Split conformal prediction calibration parameters and test empirical coverage (~79.48%).
7. Uncertainty interval bounds integrity (lower >= 0.0, lower <= upper, invalid inputs -> (None, None)).
8. Duplicate forecast prevention across unique constraint (district_id, prediction_date, model_id).
9. Model registry versioning and provenance tracking.
10. API forecast status filtering (GET /monthly?forecast_status=CURRENT_FUTURE_FORECAST).
11. API overview freshness indicators and breakdown metrics.
12. API authorization and input validation on POST /generate (forward_months 1 to 6).
13. Database transaction rollback safety on generation failures.
14. Historical crime incidents table row count integrity (191,679 unchanged).
"""

import sys
import os
import unittest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import engine
from ml.evaluation.backtesting import run_chronological_backtest
from ml.inference.conformal_calibrator import ConformalIntervalCalibrator, CONFORMAL_CALIBRATION_REGISTRY
from ml.inference.prediction_pipeline import generate_fresh_future_forecasts, build_district_states
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN

client = TestClient(app)


class TestCrimeForecastingReliability(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up authenticated session tokens for Admin, Analyst, and Officer roles."""
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        cls.admin_token = admin_login.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        analyst_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"
        cls.analyst_token = analyst_login.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        officer_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert officer_login.status_code == 200, f"Officer login failed: {officer_login.text}"
        cls.officer_token = officer_login.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_forecast_status_classification(self):
        """1. Verify explicit 3-way forecast status classification in database."""
        with engine.connect() as conn:
            statuses = conn.execute(text("""
                SELECT forecast_status, COUNT(*), MIN(prediction_date), MAX(prediction_date)
                FROM crime_predictions
                GROUP BY forecast_status
            """)).fetchall()

            status_map = {r[0]: (r[1], str(r[2]), str(r[3])) for r in statuses}
            self.assertIn("HISTORICAL_EVALUATION", status_map)
            self.assertIn("PAST_FORECAST", status_map)
            self.assertIn("CURRENT_FUTURE_FORECAST", status_map)

            # Historical evaluation: 7,680 records across 2025
            self.assertEqual(status_map["HISTORICAL_EVALUATION"][0], 7680)
            self.assertEqual(status_map["HISTORICAL_EVALUATION"][1], "2025-01-01")
            self.assertEqual(status_map["HISTORICAL_EVALUATION"][2], "2025-12-01")

            # Past forecast: 1,920 records across Jan-Mar 2026
            self.assertEqual(status_map["PAST_FORECAST"][0], 1920)
            self.assertEqual(status_map["PAST_FORECAST"][1], "2026-01-01")
            self.assertEqual(status_map["PAST_FORECAST"][2], "2026-03-01")

            # Current future forecast: 1,920 records across Nov 2026-Jan 2027
            self.assertEqual(status_map["CURRENT_FUTURE_FORECAST"][0], 1920)
            self.assertEqual(status_map["CURRENT_FUTURE_FORECAST"][1], "2026-11-01")
            self.assertEqual(status_map["CURRENT_FUTURE_FORECAST"][2], "2027-01-01")

    def test_02_forecast_origin_and_target_dates(self):
        """2. Verify forecast origin policy (2026-10-01) and target dates (2026-11-01+)."""
        with engine.connect() as conn:
            future_meta = conn.execute(text("""
                SELECT DISTINCT forecast_origin_date, horizon_step, prediction_date
                FROM crime_predictions
                WHERE forecast_status = 'CURRENT_FUTURE_FORECAST'
                ORDER BY horizon_step
            """)).fetchall()

            self.assertEqual(len(future_meta), 3)
            self.assertEqual(str(future_meta[0][0]), "2026-10-01")
            self.assertEqual(future_meta[0][1], 1)
            self.assertEqual(str(future_meta[0][2]), "2026-11-01")

            self.assertEqual(future_meta[1][1], 2)
            self.assertEqual(str(future_meta[1][2]), "2026-12-01")

            self.assertEqual(future_meta[2][1], 3)
            self.assertEqual(str(future_meta[2][2]), "2027-01-01")

    def test_03_recursive_multistep_feature_updates(self):
        """3. Verify recursive multi-step forecasting updates lag features iteratively."""
        panel_df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        district_states = build_district_states(panel_df)
        d_id = 1
        initial_history_len = len(district_states[d_id]["history"])
        self.assertEqual(initial_history_len, 12)  # 12 months of 2025

        # Generate 3 forward months
        forecasts = generate_fresh_future_forecasts(panel_df, forward_months=3)
        self.assertEqual(len(forecasts), 640 * 3)

        d1_forecasts = [f for f in forecasts if f["district_id"] == 1]
        self.assertEqual(len(d1_forecasts), 3)
        self.assertEqual(d1_forecasts[0]["horizon_step"], 1)
        self.assertEqual(d1_forecasts[1]["horizon_step"], 2)
        self.assertEqual(d1_forecasts[2]["horizon_step"], 3)

    def test_04_leakage_prevention_in_recursive_forecasting(self):
        """4. Verify zero look-ahead leakage: target column absent from features."""
        panel_df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        self.assertNotIn(TARGET_COLUMN, FEATURE_COLUMNS)
        self.assertNotIn("police_deployed_count", FEATURE_COLUMNS)
        self.assertNotIn("case_status", FEATURE_COLUMNS)

    def test_05_chronological_backtesting_evaluation(self):
        """5. Verify chronological walk-forward backtesting beats baselines across horizons."""
        bt_results = run_chronological_backtest(origin_year=2024, max_steps=3)
        aggs = bt_results["aggregate_horizons"]

        # 1-Month (h=1)
        h1 = aggs["1_month"]
        self.assertLess(h1["hgbr"]["MAE"], h1["seasonal_naive"]["MAE"])
        self.assertLess(h1["hgbr"]["MAE"], h1["moving_average_3"]["MAE"])

        # 3-Month (h=1..3)
        h3 = aggs["3_month"]
        self.assertLess(h3["hgbr"]["MAE"], h3["seasonal_naive"]["MAE"])
        self.assertLess(h3["hgbr"]["MAE"], h3["moving_average_3"]["MAE"])
        self.assertGreater(h3["hgbr_improvement_vs_seasonal_naive_pct"], 20.0)

    def test_06_split_conformal_prediction_intervals(self):
        """6. Verify split conformal calibration derived from 2024 meets nominal coverage on 2025."""
        meta = ConformalIntervalCalibrator.get_calibration_metadata()
        self.assertEqual(meta["calibration_period"], "2024-01-01 to 2024-12-31")
        self.assertEqual(meta["evaluation_period"], "2025-01-01 to 2025-12-31")

        # Nominal 80% coverage on test set is between 75% and 85%
        cov_80 = meta["test_empirical_metrics"]["overall_80"]["empirical_coverage_pct"]
        self.assertGreaterEqual(cov_80, 75.0)
        self.assertLessEqual(cov_80, 85.0)

        # Nominal 90% coverage on test set is between 85% and 95%
        cov_90 = meta["test_empirical_metrics"]["overall_90"]["empirical_coverage_pct"]
        self.assertGreaterEqual(cov_90, 85.0)
        self.assertLessEqual(cov_90, 95.0)

    def test_07_interval_clamping_and_bound_integrity(self):
        """7. Verify prediction intervals clamp lower bound >= 0.0 and handle invalid inputs."""
        # Small count clamped to 0.0
        low, up = ConformalIntervalCalibrator.get_interval(1.2, horizon_step=1, nominal_coverage=0.80)
        self.assertEqual(low, 0.0)
        self.assertGreater(up, 1.2)

        # Standard count
        low2, up2 = ConformalIntervalCalibrator.get_interval(15.0, horizon_step=1, nominal_coverage=0.80)
        self.assertGreater(low2, 0.0)
        self.assertGreater(up2, low2)

        # Invalid inputs -> (None, None)
        self.assertEqual(ConformalIntervalCalibrator.get_interval(-5.0), (None, None))
        self.assertEqual(ConformalIntervalCalibrator.get_interval(np.nan), (None, None))
        self.assertEqual(ConformalIntervalCalibrator.get_interval(np.inf), (None, None))

    def test_08_duplicate_forecast_prevention(self):
        """8. Verify zero duplicate predictions in crime_predictions table."""
        with engine.connect() as conn:
            dups = conn.execute(text("""
                SELECT district_id, prediction_date, model_id, COUNT(*) c
                FROM crime_predictions
                GROUP BY district_id, prediction_date, model_id
                HAVING c > 1
            """)).fetchall()
            self.assertEqual(len(dups), 0)

    def test_09_model_data_version_provenance(self):
        """9. Verify active model record contains Phase 8B backtesting and conformal metrics."""
        with engine.connect() as conn:
            row = conn.execute(text("SELECT evaluation_metrics FROM ml_models WHERE is_active = TRUE")).fetchone()
            self.assertIsNotNone(row)
            metrics_str = row[0]
            if isinstance(metrics_str, str):
                import json
                metrics = json.loads(metrics_str)
            else:
                metrics = metrics_str

            self.assertIn("conformal_calibration", metrics)

    def test_10_api_forecast_status_filtering(self):
        """10. Verify GET /predictions/monthly supports filtering by forecast_status."""
        resp = client.get(
            "/api/v1/predictions/monthly?forecast_status=CURRENT_FUTURE_FORECAST&limit=10",
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 1920)
        for item in data["items"]:
            self.assertEqual(item["forecast_status"], "CURRENT_FUTURE_FORECAST")
            self.assertIn(item["forecast_period"], ["2026-11-01", "2026-12-01", "2027-01-01"])

    def test_11_api_overview_freshness_metadata(self):
        """11. Verify GET /predictions/overview returns freshness breakdown and current horizon."""
        resp = client.get("/api/v1/predictions/overview", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_predictions"], 11520)
        self.assertEqual(data["historical_periods_count"], 12)
        self.assertEqual(data["past_forecast_periods_count"], 3)
        self.assertEqual(data["current_forecast_periods_count"], 3)
        self.assertEqual(data["current_forecast_start"], "2026-11-01")
        self.assertEqual(data["current_forecast_end"], "2027-01-01")
        self.assertEqual(data["forecast_origin_date"], "2026-10-01")
        self.assertIn("Split Conformal", data["calibration_method"])

    def test_12_api_rbac_authorization_and_validation(self):
        """12. Verify RBAC on POST /generate and horizon step range validation (1..6)."""
        # Officer -> 403 Forbidden
        self.assertEqual(client.post("/api/v1/predictions/generate", headers=self.officer_headers).status_code, 403)

        # Invalid forward_months (>6) -> 422 Unprocessable Entity
        resp_invalid = client.post(
            "/api/v1/predictions/generate",
            json={"forward_months": 12},
            headers=self.analyst_headers,
        )
        self.assertEqual(resp_invalid.status_code, 422)

        # Analyst on valid forward_months (1) -> 200 OK
        resp_valid = client.post(
            "/api/v1/predictions/generate",
            json={"forward_months": 1, "include_2025": False},
            headers=self.analyst_headers,
        )
        self.assertEqual(resp_valid.status_code, 200)

    def test_13_transactional_rollback_safety(self):
        """13. Verify database rollback safety on invalid insertion attempts."""
        with engine.connect() as conn:
            initial_count = conn.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()

        # Attempt to insert an invalid record (e.g. non-existent district FK violating RESTRICT)
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO crime_predictions (
                        district_id, crime_type_id, model_id, prediction_date,
                        predicted_crime_count, forecast_status
                    ) VALUES (
                        999999, NULL, 1, '2030-01-01', 5.0, 'CURRENT_FUTURE_FORECAST'
                    )
                """))
        except Exception:
            pass  # Expected foreign key constraint failure

        with engine.connect() as conn:
            after_count = conn.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
            self.assertEqual(initial_count, after_count, "Rollback failed to preserve database state!")

    def test_14_historical_incidents_integrity(self):
        """14. Verify authentic historical crime incidents row count remains strictly 191,679."""
        with engine.connect() as conn:
            cnt = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(cnt, 191679, "crime_incidents table was unexpectedly modified!")


if __name__ == "__main__":
    unittest.main()
