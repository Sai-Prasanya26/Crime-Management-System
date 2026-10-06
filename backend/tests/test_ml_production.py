"""
Phase 8D: Production ML Model, Inference, Database, and API Integration Test Suite.

Verifies:
1. Model Loading: Production artifact exists and loads correctly.
2. Metadata Integrity: Verified fields, frozen Phase 8C metrics, and separation of model selection from refit.
3. Feature Validation: Rejects missing features and NaNs; accepts valid feature matrices.
4. Prediction Validity: Output contract, numeric values, and non-negative clamping.
5. Database Integration: Model registration in ml_models, idempotent prediction storage in crime_predictions, duplicate prevention.
6. API Security & Functionality: JWT authentication enforcement, overview endpoint, filtering, district series, and model metadata.
7. Data Integrity: Verifies crime_incidents (191,679) and other core tables remain completely untouched.
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
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN
from ml.inference.model_loader import (
    get_production_model,
    get_production_metadata,
    clear_model_cache,
)
from ml.inference.forecast_service import (
    validate_feature_dataframe,
    generate_forecasts,
    ForecastService,
)
from ml.inference.prediction_pipeline import (
    register_production_model,
    populate_predictions,
)

client = TestClient(app)


class TestMLProductionPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up authenticated session token for API tests."""
        # Login with seed admin account
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        cls.token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_model_artifact_loading(self):
        """A. Model loading: Artifact exists and implements predict."""
        clear_model_cache()
        model = get_production_model()
        self.assertIsNotNone(model)
        self.assertTrue(hasattr(model, "predict"))

    def test_02_production_metadata_integrity(self):
        """B. Metadata: Required fields exist and distinguish selection from refit."""
        clear_model_cache()
        meta = get_production_metadata()
        self.assertEqual(meta["model_version"], "v1.0.0")
        self.assertEqual(meta["algorithm"], "HistGradientBoostingRegressor")
        self.assertEqual(meta["random_state"], 42)
        self.assertEqual(len(meta["feature_columns"]), 25)

        # Verify frozen Phase 8C test metrics
        evidence = meta["model_selection_evidence"]
        self.assertEqual(evidence["evaluation_split"], "TEST_2025")
        self.assertEqual(evidence["primary_model_metrics"]["MAE"], 1.6956)
        self.assertEqual(evidence["primary_model_metrics"]["RMSE"], 2.2465)
        self.assertEqual(evidence["primary_model_metrics"]["WAPE_percent"], 36.84)
        self.assertEqual(evidence["primary_model_metrics"]["R2"], 0.6063)

        # Verify production refit section
        refit = meta["production_refit"]
        self.assertEqual(refit["training_observations"], 38400)
        self.assertEqual(refit["historical_districts_count"], 640)

    def test_03_feature_validation_rules(self):
        """C. Feature validation: Valid matrices succeed; missing/invalid matrices fail clearly."""
        # 1. Valid DataFrame
        df_valid = pd.DataFrame(
            np.ones((2, len(FEATURE_COLUMNS))),
            columns=FEATURE_COLUMNS,
        )
        # Should not raise
        validate_feature_dataframe(df_valid)

        # 2. Missing columns
        df_invalid = df_valid.drop(columns=["lag_1", "rolling_mean_12"])
        with self.assertRaises(ValueError) as ctx:
            validate_feature_dataframe(df_invalid)
        self.assertIn("missing 2 required predictor column(s)", str(ctx.exception))

        # 3. NaNs present
        df_nan = df_valid.copy()
        df_nan.loc[0, "total_population"] = np.nan
        with self.assertRaises(ValueError) as ctx:
            validate_feature_dataframe(df_nan)
        self.assertIn("missing values (NaN) detected", str(ctx.exception))

    def test_04_prediction_validity_and_contract(self):
        """D. Prediction validity: Non-negative numeric outputs satisfying schema contract."""
        df_test = pd.DataFrame(
            np.zeros((3, len(FEATURE_COLUMNS))),
            columns=FEATURE_COLUMNS,
        )
        df_test["district_id"] = [1, 2, 3]
        df_test["state_id"] = [1, 1, 1]
        df_test["period"] = ["2026-01-01", "2026-01-01", "2026-01-01"]

        forecasts = generate_forecasts(df_test)
        self.assertEqual(len(forecasts), 3)

        for f in forecasts:
            self.assertIn("district_id", f)
            self.assertIn("forecast_period", f)
            self.assertIn("predicted_incident_count", f)
            self.assertIn("model_name", f)
            self.assertIn("model_version", f)
            self.assertIsInstance(f["predicted_incident_count"], float)
            self.assertGreaterEqual(f["predicted_incident_count"], 0.0)

    def test_05_database_registration_and_predictions(self):
        """E. Database: Production model registered in ml_models and predictions in crime_predictions."""
        with engine.connect() as conn:
            # Model registration check
            model_row = conn.execute(
                text("SELECT id, model_name, version, algorithm, is_active FROM ml_models WHERE version = 'v1.0.0'")
            ).fetchone()
            self.assertIsNotNone(model_row, "Production model not found in ml_models")
            self.assertTrue(model_row[4], "Production model is not active")

            # Prediction counts
            preds_count = conn.execute(
                text("SELECT COUNT(*) FROM crime_predictions WHERE model_id = :mid"),
                {"mid": model_row[0]},
            ).scalar()
            self.assertGreaterEqual(preds_count, 8320)

            # Check distinct districts and periods
            dist_count = conn.execute(
                text("SELECT COUNT(DISTINCT district_id) FROM crime_predictions WHERE model_id = :mid"),
                {"mid": model_row[0]},
            ).scalar()
            self.assertEqual(dist_count, 640)

            # Duplicate prevention check
            dups = conn.execute(
                text("SELECT district_id, prediction_date, COUNT(*) c FROM crime_predictions WHERE model_id = :mid GROUP BY district_id, prediction_date HAVING c > 1"),
                {"mid": model_row[0]},
            ).fetchall()
            self.assertEqual(len(dups), 0, "Duplicate prediction rows detected in database!")

    def test_06_api_unauthorized_rejection(self):
        """F. API Security: Unauthenticated requests are rejected with 401."""
        endpoints = [
            "/api/v1/predictions/overview",
            "/api/v1/predictions/model",
            "/api/v1/predictions",
            "/api/v1/predictions/1",
        ]
        for ep in endpoints:
            resp = client.get(ep)
            self.assertEqual(resp.status_code, 401, f"Expected 401 for unauthenticated {ep}, got {resp.status_code}")

    def test_07_api_overview_endpoint(self):
        """F. API: GET /api/v1/predictions/overview returns pipeline summary."""
        resp = client.get("/api/v1/predictions/overview", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["total_predictions"], 8320)
        self.assertEqual(data["districts_covered"], 640)
        self.assertEqual(data["active_model_version"], "v1.0.0")
        self.assertIn("top_predicted_districts", data)
        self.assertGreater(len(data["top_predicted_districts"]), 0)

    def test_08_api_model_info_endpoint(self):
        """F. API: GET /api/v1/predictions/model returns active model specifications."""
        resp = client.get("/api/v1/predictions/model", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["version"], "v1.0.0")
        self.assertEqual(data["algorithm"], "HistGradientBoostingRegressor")
        self.assertTrue(data["is_active"])
        self.assertIn("evaluation_metrics", data)
        self.assertEqual(data["evaluation_metrics"]["evaluation_split"], "TEST_2025")
        self.assertEqual(data["evaluation_metrics"]["primary_model_metrics"]["MAE"], 1.6956)

    def test_09_api_list_predictions_with_filters(self):
        """F. API: GET /api/v1/predictions supports pagination and filtering."""
        # 1. Base list
        resp = client.get("/api/v1/predictions?limit=10", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total", data)
        self.assertIn("items", data)
        self.assertEqual(len(data["items"]), 10)

        # 2. Filter by period
        resp_period = client.get(
            "/api/v1/predictions?forecast_period=2026-01-01&limit=5",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_period.status_code, 200)
        data_p = resp_period.json()
        self.assertEqual(data_p["total"], 640)  # Exactly 640 districts for 2026-01-01
        for item in data_p["items"]:
            self.assertEqual(item["forecast_period"], "2026-01-01")

        # 3. Filter by district
        resp_dist = client.get(
            "/api/v1/predictions?district_id=1",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_dist.status_code, 200)
        data_d = resp_dist.json()
        self.assertGreater(data_d["total"], 0)
        for item in data_d["items"]:
            self.assertEqual(item["district_id"], 1)

    def test_10_api_district_series_endpoint(self):
        """F. API: GET /api/v1/predictions/{district_id} returns longitudinal series."""
        resp = client.get("/api/v1/predictions/1", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["district_name"], "Nicobars")
        self.assertGreater(len(data["series"]), 0)

        # 404 for non-existent district
        resp_404 = client.get("/api/v1/predictions/99999", headers=self.auth_headers)
        self.assertEqual(resp_404.status_code, 404)

    def test_11_core_historical_data_integrity(self):
        """G. Data integrity: crime_incidents and core tables remain untouched."""
        with engine.connect() as conn:
            incidents_count = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(incidents_count, 191679, "crime_incidents row count modified!")

            states_count = conn.execute(text("SELECT COUNT(*) FROM states")).scalar()
            self.assertEqual(states_count, 37)

            demo_count = conn.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()
            self.assertEqual(demo_count, 640)


if __name__ == "__main__":
    unittest.main()
