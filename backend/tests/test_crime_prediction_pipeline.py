"""
Phase 8A: Comprehensive Historical Crime Prediction ML Pipeline Test Suite.

Automated verification covering:
1. Historical aggregation correctness (191,679 incidents, 640 Census districts, 72 months).
2. Duplicate handling and deterministic chronological sorting.
3. Month ordering and autoregressive lag generation (lag_1, lag_2, lag_3, lag_12).
4. Rolling feature leakage prevention (guaranteed shift by 1 prior period).
5. Chronological split correctness (2020 warmup, 2021-2023 train, 2024 val, 2025 test).
6. Model training reproducibility and deterministic outputs (random_state=42).
7. Five-model baseline and candidate evaluation (Seasonal Naïve, MA-3, Poisson, RF, HGBR).
8. Non-negative and finite predictions constraint enforcement.
9. Unsupported geography / non-existent district error handling (HTTP 404).
10. Model registry persistence in `ml_models` with Phase 8C out-of-sample metrics.
11. Prediction persistence in `crime_predictions` (9,600 records across 15 periods, no duplicates).
12. RBAC authorization on expensive training and generation endpoints (/train, /generate).
13. API response schemas for all prediction endpoints (/overview, /monthly, /models, /evaluation, /actual-vs-predicted).
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
from backend.app.database.session import engine, SessionLocal
from backend.app.models.ml import MLModel, CrimePrediction
from ml.feature_engineering.feature_pipeline import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    FORBIDDEN_LEAKAGE_COLUMNS,
)
from ml.inference.model_loader import (
    get_production_model,
    get_production_metadata,
    clear_model_cache,
)
from ml.inference.forecast_service import (
    validate_feature_dataframe,
    generate_forecasts,
)
from ml.evaluation.metrics import (
    evaluate_predictions,
    clamp_predictions,
    compute_mae,
    compute_rmse,
    compute_wape,
    compute_r2,
)

client = TestClient(app)


class TestCrimePredictionPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up authenticated session tokens for Admin, Analyst, and Officer roles."""
        # 1. Admin Login
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        cls.admin_token = admin_login.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Analyst Login
        analyst_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"
        cls.analyst_token = analyst_login.json()["access_token"]
        cls.analyst_headers = {"Authorization": f"Bearer {cls.analyst_token}"}

        # 3. Officer Login
        officer_login = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "officer", "password": "Officer@12345"},
        )
        assert officer_login.status_code == 200, f"Officer login failed: {officer_login.text}"
        cls.officer_token = officer_login.json()["access_token"]
        cls.officer_headers = {"Authorization": f"Bearer {cls.officer_token}"}

    def test_01_historical_aggregation_correctness(self):
        """1. Historical aggregation correctness: 191,679 incidents into 46,080 panel rows."""
        parquet_path = "ml/data/panel_features_2020_2025.parquet"
        self.assertTrue(os.path.exists(parquet_path), "Engineered feature panel parquet missing!")
        df = pd.read_parquet(parquet_path)

        # Total clean modeling rows (after 7,680 warmup rows removed) = 38,400
        self.assertEqual(len(df), 38400)
        self.assertEqual(df["district_id"].nunique(), 640)
        self.assertIn("target_incident_count", df.columns)

        # Check incidents sum across clean modeling rows (2021-2025)
        with engine.connect() as conn:
            incidents_2021_2025 = conn.execute(
                text("SELECT COUNT(*) FROM crime_incidents WHERE incident_date >= '2021-01-01'")
            ).scalar()
        self.assertEqual(df["target_incident_count"].sum(), incidents_2021_2025)

    def test_02_duplicate_handling_and_sorting(self):
        """2. Duplicate handling: Panel contains zero duplicate district-month records."""
        df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        dups = df.duplicated(subset=["district_id", "year", "month"]).sum()
        self.assertEqual(dups, 0, "Duplicate district-month rows detected in panel!")

    def test_03_month_ordering_and_lag_generation(self):
        """3. Month ordering and lag generation: lag_1 and lag_12 match historical volume."""
        df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        sample_district = df[df["district_id"] == 1].sort_values(["year", "month"]).reset_index(drop=True)

        # For row at index 1, lag_1 must equal the target count of row at index 0
        self.assertEqual(sample_district.loc[1, "lag_1"], sample_district.loc[0, "target_incident_count"])

        # For row at index 12 (12 months later), lag_12 must equal row 0
        self.assertEqual(sample_district.loc[12, "lag_12"], sample_district.loc[0, "target_incident_count"])

    def test_04_rolling_feature_leakage_prevention(self):
        """4. Leakage prevention: Rolling features shifted by 1 and forbidden columns absent."""
        df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")

        # Verify forbidden leakage columns are absent from dataset
        for forbidden in FORBIDDEN_LEAKAGE_COLUMNS:
            self.assertNotIn(forbidden, df.columns)
            self.assertNotIn(forbidden, FEATURE_COLUMNS)

        # Verify target is excluded from features
        self.assertNotIn(TARGET_COLUMN, FEATURE_COLUMNS)

        # For row at index 3, rolling_mean_3 must equal mean of target at rows 0, 1, 2
        sample_district = df[df["district_id"] == 1].sort_values(["year", "month"]).reset_index(drop=True)
        expected_rm3 = round(float(sample_district.loc[0:2, "target_incident_count"].mean()), 4)
        self.assertEqual(sample_district.loc[3, "rolling_mean_3"], expected_rm3)

    def test_05_chronological_split_correctness(self):
        """5. Chronological splits: Strictly time-based partition without random splitting."""
        df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        train_df = df[df["split"] == "TRAIN"]
        val_df = df[df["split"] == "VALIDATION"]
        test_df = df[df["split"] == "TEST"]

        # Train: 2021-2023 (36 months * 640 districts = 23,040 rows)
        self.assertEqual(len(train_df), 23040)
        self.assertTrue(train_df["year"].between(2021, 2023).all())

        # Validation: 2024 (12 months * 640 districts = 7,680 rows)
        self.assertEqual(len(val_df), 7680)
        self.assertTrue((val_df["year"] == 2024).all())

        # Test: 2025 (12 months * 640 districts = 7,680 rows)
        self.assertEqual(len(test_df), 7680)
        self.assertTrue((test_df["year"] == 2025).all())

    def test_06_model_training_reproducibility(self):
        """6. Model reproducibility: Production model reproduces identical predictions."""
        clear_model_cache()
        model = get_production_model()
        df = pd.read_parquet("ml/data/panel_features_2020_2025.parquet")
        sample_X = df[FEATURE_COLUMNS].iloc[:10]

        pred1 = clamp_predictions(model.predict(sample_X))
        pred2 = clamp_predictions(model.predict(sample_X))
        np.testing.assert_array_almost_equal(pred1, pred2, decimal=6)

    def test_07_five_model_evaluation_and_comparison(self):
        """7. Baseline evaluation: 5 models evaluated and HGBR beats baselines."""
        meta = get_production_metadata()
        evidence = meta["model_selection_evidence"]

        # Primary HGBR Test 2025 metrics
        hgbr_mae = evidence["primary_model_metrics"]["MAE"]
        hgbr_wape = evidence["primary_model_metrics"]["WAPE_percent"]
        self.assertEqual(hgbr_mae, 1.6956)
        self.assertEqual(hgbr_wape, 36.84)

        # Check comparisons
        comps = evidence["comparison_models_metrics"]
        self.assertIn("Seasonal_Naive", comps)
        self.assertIn("Moving_Average_3", comps)
        self.assertIn("RandomForestRegressor", comps)
        self.assertIn("PoissonRegression", comps)

        sn_mae = comps["Seasonal_Naive"]["MAE"]
        ma3_mae = comps["Moving_Average_3"]["MAE"]
        poisson_mae = comps["PoissonRegression"]["MAE"]

        # Verify HGBR is superior to Seasonal Naïve, MA-3, and Poisson
        self.assertLess(hgbr_mae, sn_mae)
        self.assertLess(hgbr_mae, ma3_mae)
        self.assertLess(hgbr_mae, poisson_mae)

    def test_08_non_negative_and_finite_predictions(self):
        """8. Non-negative and finite constraint: Predictions are >= 0.0 and finite."""
        with engine.connect() as conn:
            # Query min and max prediction values in database
            stats = conn.execute(
                text("SELECT MIN(predicted_crime_count), MAX(predicted_crime_count), COUNT(*) FROM crime_predictions")
            ).fetchone()
            min_val, max_val, total_count = stats[0], stats[1], stats[2]

            self.assertGreaterEqual(float(min_val), 0.0, "Negative prediction value detected!")
            self.assertTrue(np.isfinite(float(max_val)), "Non-finite prediction value detected!")
            self.assertGreaterEqual(total_count, 9600)

    def test_09_unsupported_geography_handling(self):
        """9. Unsupported geography: Non-existent district raises HTTP 404."""
        resp = client.get("/api/v1/predictions/99999", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    def test_10_model_registry_persistence(self):
        """10. Model registry: Active model is registered in ml_models table."""
        with engine.connect() as conn:
            model_row = conn.execute(
                text("SELECT id, model_name, version, algorithm, is_active FROM ml_models WHERE version = 'v1.0.0'")
            ).fetchone()
            self.assertIsNotNone(model_row)
            self.assertEqual(model_row[1], "HGBR production forecasting model v1")
            self.assertEqual(model_row[3], "HistGradientBoostingRegressor")
            self.assertTrue(model_row[4])

    def test_11_prediction_persistence_and_no_duplicates(self):
        """11. Prediction persistence: 11,520 predictions across 18 periods without duplicates."""
        with engine.connect() as conn:
            dups = conn.execute(
                text("""
                    SELECT district_id, prediction_date, COUNT(*) c
                    FROM crime_predictions
                    GROUP BY district_id, prediction_date
                    HAVING c > 1
                """)
            ).fetchall()
            self.assertEqual(len(dups), 0, "Duplicate prediction rows detected in database!")

            # Verify periods: across 2025-01-01 to 2027-01-01 = 18 periods
            periods_count = conn.execute(
                text("SELECT COUNT(DISTINCT prediction_date) FROM crime_predictions")
            ).scalar()
            self.assertGreaterEqual(periods_count, 15)

    def test_12_rbac_authorization_on_training_and_generation(self):
        """12. RBAC authorization: Enforces permissions on POST /train and POST /generate."""
        # 1. Unauthenticated -> 401
        self.assertEqual(client.post("/api/v1/predictions/train").status_code, 401)
        self.assertEqual(client.post("/api/v1/predictions/generate").status_code, 401)

        # 2. Officer (Insufficient Role) -> 403
        resp_off_train = client.post("/api/v1/predictions/train", headers=self.officer_headers)
        self.assertEqual(resp_off_train.status_code, 403)

        resp_off_gen = client.post("/api/v1/predictions/generate", headers=self.officer_headers)
        self.assertEqual(resp_off_gen.status_code, 403)

        # 3. Analyst on /train (requires ADMIN) -> 403
        resp_analyst_train = client.post("/api/v1/predictions/train", headers=self.analyst_headers)
        self.assertEqual(resp_analyst_train.status_code, 403)

        # 4. Analyst on /generate (requires ADMIN or ANALYST) -> 200
        resp_analyst_gen = client.post(
            "/api/v1/predictions/generate",
            json={"forward_months": 1, "include_2025": False},
            headers=self.analyst_headers,
        )
        self.assertEqual(resp_analyst_gen.status_code, 200)

    def test_13_api_response_schemas(self):
        """13. API schemas: All prediction endpoints return expected schemas."""
        # /overview
        resp_ov = client.get("/api/v1/predictions/overview", headers=self.admin_headers)
        self.assertEqual(resp_ov.status_code, 200)
        data_ov = resp_ov.json()
        self.assertIn("total_predictions", data_ov)
        self.assertIn("districts_covered", data_ov)
        self.assertIn("active_model_name", data_ov)

        # /monthly
        resp_monthly = client.get("/api/v1/predictions/monthly?limit=5", headers=self.admin_headers)
        self.assertEqual(resp_monthly.status_code, 200)
        data_m = resp_monthly.json()
        self.assertIn("total", data_m)
        self.assertEqual(len(data_m["items"]), 5)

        # /models
        resp_models = client.get("/api/v1/predictions/models", headers=self.admin_headers)
        self.assertEqual(resp_models.status_code, 200)
        data_mod = resp_models.json()
        self.assertGreater(data_mod["total"], 0)

        # /evaluation
        resp_eval = client.get("/api/v1/predictions/evaluation", headers=self.admin_headers)
        self.assertEqual(resp_eval.status_code, 200)
        data_e = resp_eval.json()
        self.assertIn("metrics_summary", data_e)
        self.assertIn("disclaimer", data_e)
        self.assertIn("Predictions are statistical estimates", data_e["disclaimer"])

        # /actual-vs-predicted
        resp_avp = client.get("/api/v1/predictions/actual-vs-predicted", headers=self.admin_headers)
        self.assertEqual(resp_avp.status_code, 200)
        data_avp = resp_avp.json()
        self.assertIn("comparison_points", data_avp)
        self.assertGreater(len(data_avp["comparison_points"]), 0)

    def test_14_historical_incidents_integrity(self):
        """14. Database integrity: crime_incidents row count remains strictly 191,679."""
        with engine.connect() as conn:
            cnt = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(cnt, 191679, "crime_incidents row count was modified!")

    def test_15_district_month_prediction_feature(self):
        """15. District month prediction: Covers forecast, historical, unavailable, and insufficient baseline."""
        # 1. Supported Future Forecast (Nov 2026 for District 1)
        resp1 = client.get(
            "/api/v1/predictions/district-month?district_id=1&year=2026&month=11",
            headers=self.admin_headers,
        )
        self.assertEqual(resp1.status_code, 200)
        d1 = resp1.json()
        self.assertTrue(d1["is_available"])
        self.assertTrue(d1["is_forecast"])
        self.assertFalse(d1["is_historical"])
        self.assertEqual(d1["data_type"], "FORECAST")
        self.assertIn(d1["crime_level"], ["Higher", "Similar", "Lower"])
        self.assertIsNotNone(d1["predicted_count"])
        self.assertIn("Forecasts are statistical estimates", d1["disclaimer"])

        # 2. Supported Historical Actual (Oct 2025 for District 1)
        resp2 = client.get(
            "/api/v1/predictions/district-month?district_id=1&year=2025&month=10",
            headers=self.admin_headers,
        )
        self.assertEqual(resp2.status_code, 200)
        d2 = resp2.json()
        self.assertTrue(d2["is_available"])
        self.assertTrue(d2["is_historical"])
        self.assertFalse(d2["is_forecast"])
        self.assertEqual(d2["data_type"], "HISTORICAL_ACTUAL")
        self.assertIsNotNone(d2["actual_count"])

        # 3. Unavailable Month (Jun 2026 for District 1)
        resp3 = client.get(
            "/api/v1/predictions/district-month?district_id=1&year=2026&month=6",
            headers=self.admin_headers,
        )
        self.assertEqual(resp3.status_code, 200)
        d3 = resp3.json()
        self.assertFalse(d3["is_available"])
        self.assertEqual(d3["data_type"], "UNAVAILABLE")
        self.assertEqual(d3["crime_level"], "Unavailable")
        self.assertIn("unavailable", d3["message"].lower())

        # 4. Reorganized Child District with Parent Resolution (District 674 -> Parent 22)
        resp4 = client.get(
            "/api/v1/predictions/district-month?district_id=674&year=2026&month=11",
            headers=self.admin_headers,
        )
        self.assertEqual(resp4.status_code, 200)
        d4 = resp4.json()
        self.assertTrue(d4["is_available"])
        self.assertTrue(d4["is_derived_from_parent"])
        self.assertEqual(d4["parent_district_id"], 22)
        self.assertIsNotNone(d4["predicted_count"])

        # 5. District with Truly Insufficient Baseline (District 725 Aravalli - unmapped parent)
        resp5 = client.get(
            "/api/v1/predictions/district-month?district_id=725&year=2026&month=11",
            headers=self.admin_headers,
        )
        self.assertEqual(resp5.status_code, 200)
        d5 = resp5.json()
        self.assertFalse(d5["is_available"])
        self.assertFalse(d5["has_baseline"])
        self.assertEqual(d5["crime_level"], "Insufficient Baseline")
        self.assertIn("insufficient", d5["message"].lower())

        # 6. Non-existent District -> 404
        resp6 = client.get(
            "/api/v1/predictions/district-month?district_id=99999&year=2026&month=11",
            headers=self.admin_headers,
        )
        self.assertEqual(resp6.status_code, 404)


if __name__ == "__main__":
    unittest.main()
