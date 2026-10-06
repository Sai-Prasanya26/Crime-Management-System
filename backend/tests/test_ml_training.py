"""
Phase 8C: Unit Tests for Machine Learning Training, Baselines, and Forecast Evaluation.

Verifies:
1. Exact computation of time-series metrics (MAE, RMSE, WAPE, R2).
2. Zero-incident safety in WAPE (no ZeroDivisionError on rural/zero-incident subsets).
3. Non-negative prediction post-processing clamping (y_hat >= 0.0).
4. Heuristic baseline logic: Seasonal Naive (lag_12) and MA-3 (rolling_mean_3).
5. Model artifact existence and joblib serialization integrity.
6. Benchmark hurdle verification: HistGradientBoostingRegressor strictly beats Seasonal Naive.
7. Walk-forward cross-validation metadata integrity and reproducibility.
"""

import sys
import os
import json
import unittest
import numpy as np
import pandas as pd
import joblib

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.evaluation.metrics import (
    compute_mae,
    compute_rmse,
    compute_wape,
    compute_r2,
    evaluate_predictions,
    clamp_predictions,
)
from ml.training.train_baselines import (
    SeasonalNaiveForecaster,
    MovingAverageForecaster,
)
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN


class TestMLTrainingAndBaselines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Load parquet dataset and trained model metadata once for test assertions."""
        cls.parquet_path = "ml/data/panel_features_2020_2025.parquet"
        cls.metadata_path = "ml/saved_models/training_metadata_v1.json"
        cls.hgbr_path = "ml/saved_models/experimental_hgbr_v1.joblib"
        cls.rf_path = "ml/saved_models/experimental_random_forest_v1.joblib"

        cls.df = pd.read_parquet(cls.parquet_path)
        with open(cls.metadata_path, "r", encoding="utf-8") as f:
            cls.metadata = json.load(f)

    def test_01_metrics_calculation(self):
        """Verifies mathematical correctness of MAE, RMSE, WAPE, and R2 on known synthetic vectors."""
        y_true = np.array([10.0, 20.0, 30.0])
        y_pred = np.array([12.0, 18.0, 33.0])  # errors: [2, -2, 3], sum abs = 7

        mae = compute_mae(y_true, y_pred)
        self.assertAlmostEqual(mae, 7.0 / 3.0, places=4)

        rmse = compute_rmse(y_true, y_pred)
        self.assertAlmostEqual(rmse, np.sqrt(17.0 / 3.0), places=4)

        wape = compute_wape(y_true, y_pred)
        # sum abs error = 7, sum actual = 60, WAPE% = (7/60)*100 = 11.6667%
        self.assertAlmostEqual(wape, (7.0 / 60.0) * 100.0, places=4)

        r2 = compute_r2(y_true, y_pred)
        # SS_tot = (10-20)^2 + (20-20)^2 + (30-20)^2 = 200
        # SS_res = 2^2 + (-2)^2 + 3^2 = 17 -> R2 = 1 - 17/200 = 0.915
        self.assertAlmostEqual(r2, 0.915, places=4)

    def test_02_zero_incident_safety(self):
        """Verifies that WAPE handles zero-incident arrays without raising ZeroDivisionError."""
        all_zeros_y = np.array([0.0, 0.0, 0.0])
        all_zeros_pred = np.array([0.0, 0.0, 0.0])
        wape_zero = compute_wape(all_zeros_y, all_zeros_pred)
        self.assertEqual(wape_zero, 0.0)

        mixed_y = np.array([0.0, 5.0, 0.0, 10.0])
        mixed_pred = np.array([0.0, 6.0, 1.0, 9.0])  # abs err: [0, 1, 1, 1] = 3, sum y = 15
        wape_mixed = compute_wape(mixed_y, mixed_pred)
        self.assertAlmostEqual(wape_mixed, (3.0 / 15.0) * 100.0, places=4)

    def test_03_non_negative_clamping(self):
        """Verifies that clamp_predictions forces all predictions to be non-negative."""
        raw_pred = np.array([-4.5, 0.0, 3.8, -0.01, 12.0])
        clamped = clamp_predictions(raw_pred)
        self.assertTrue((clamped >= 0.0).all())
        self.assertEqual(clamped[0], 0.0)
        self.assertEqual(clamped[3], 0.0)
        self.assertEqual(clamped[2], 3.8)

    def test_04_seasonal_naive_baseline_logic(self):
        """Verifies SeasonalNaiveForecaster retrieves lag_12 accurately with non-negative guarantee."""
        val_df = self.df[self.df["split"] == "VALIDATION"].head(100)
        sn = SeasonalNaiveForecaster()
        preds = sn.predict(val_df)
        self.assertEqual(len(preds), len(val_df))
        self.assertTrue((preds >= 0.0).all())
        np.testing.assert_array_almost_equal(preds, np.maximum(val_df["lag_12"].values, 0.0))

    def test_05_moving_average_baseline_logic(self):
        """Verifies MovingAverageForecaster retrieves rolling_mean_3 accurately with non-negative guarantee."""
        val_df = self.df[self.df["split"] == "VALIDATION"].head(100)
        ma3 = MovingAverageForecaster()
        preds = ma3.predict(val_df)
        self.assertEqual(len(preds), len(val_df))
        self.assertTrue((preds >= 0.0).all())
        np.testing.assert_array_almost_equal(preds, np.maximum(val_df["rolling_mean_3"].values, 0.0))

    def test_06_model_artifacts_and_metadata(self):
        """Verifies serialized model files and metadata JSON exist and load properly."""
        self.assertTrue(os.path.exists(self.hgbr_path), f"HGBR model missing: {self.hgbr_path}")
        self.assertTrue(os.path.exists(self.rf_path), f"RF model missing: {self.rf_path}")
        self.assertTrue(os.path.exists(self.metadata_path), f"Metadata missing: {self.metadata_path}")

        # Test loading joblib models
        hgbr_loaded = joblib.load(self.hgbr_path)
        rf_loaded = joblib.load(self.rf_path)
        self.assertIsNotNone(hgbr_loaded)
        self.assertIsNotNone(rf_loaded)

        # Test metadata contents
        self.assertIn("models", self.metadata)
        self.assertIn("evaluation", self.metadata)
        self.assertEqual(self.metadata["dataset"]["features_count"], 25)
        self.assertEqual(self.metadata["dataset"]["split_row_counts"]["TRAIN_2021_2023"], 23040)
        self.assertEqual(self.metadata["dataset"]["split_row_counts"]["VALIDATION_2024"], 7680)
        self.assertEqual(self.metadata["dataset"]["split_row_counts"]["TEST_2025"], 7680)

    def test_07_hgbr_strictly_beats_seasonal_naive(self):
        """Verifies that HistGradientBoostingRegressor significantly outperforms Seasonal Naive hurdle."""
        val_metrics = self.metadata["evaluation"]["VALIDATION_2024"]
        test_metrics = self.metadata["evaluation"]["TEST_2025"]

        # Validation comparison
        hgbr_val_mae = val_metrics["HistGradientBoosting"]["MAE"]
        sn_val_mae = val_metrics["Seasonal_Naive"]["MAE"]
        self.assertLess(hgbr_val_mae, sn_val_mae, "HGBR failed to beat Seasonal Naive on Validation MAE")
        self.assertGreater(
            val_metrics["HistGradientBoosting"]["R2"],
            val_metrics["Seasonal_Naive"]["R2"],
            "HGBR failed to beat Seasonal Naive on Validation R2",
        )

        # Test comparison
        hgbr_test_mae = test_metrics["HistGradientBoosting"]["MAE"]
        sn_test_mae = test_metrics["Seasonal_Naive"]["MAE"]
        self.assertLess(hgbr_test_mae, sn_test_mae, "HGBR failed to beat Seasonal Naive on Test MAE")
        self.assertGreater(
            test_metrics["HistGradientBoosting"]["R2"],
            test_metrics["Seasonal_Naive"]["R2"],
            "HGBR failed to beat Seasonal Naive on Test R2",
        )

        # Check relative improvement is at least 20% over Seasonal Naive
        improvement_pct = ((sn_test_mae - hgbr_test_mae) / sn_test_mae) * 100
        self.assertGreaterEqual(improvement_pct, 20.0, f"Expected >= 20% MAE improvement, got {improvement_pct:.2f}%")

    def test_08_walk_forward_cv_metadata(self):
        """Verifies expanding window walk-forward validation structure and metrics."""
        folds = self.metadata["evaluation"]["walk_forward_cv"]
        self.assertEqual(len(folds), 3)

        # Verify increasing training window size
        self.assertEqual(folds[0]["train_observations"], 15360)
        self.assertEqual(folds[1]["train_observations"], 23040)
        self.assertEqual(folds[2]["train_observations"], 30720)

        # Verify each fold evaluation set has 7,680 observations (640 districts * 12 months)
        for fold in folds:
            self.assertEqual(fold["eval_observations"], 7680)
            self.assertIn("HistGradientBoosting", fold["metrics"])
            self.assertIn("Seasonal_Naive", fold["metrics"])
            self.assertLess(
                fold["metrics"]["HistGradientBoosting"]["MAE"],
                fold["metrics"]["Seasonal_Naive"]["MAE"],
            )


if __name__ == "__main__":
    unittest.main()
