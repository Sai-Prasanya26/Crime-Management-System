"""
Phase 8C: Heuristic Baseline Models for Monthly Crime Forecasting.

Implements two standard time-series benchmark forecasters:
1. Baseline 1: Seasonal Naive Forecaster
   - Predicts the exact volume from the corresponding month of the prior calendar year:
     y_hat_{d, t} = y_{d, t-12} (represented by feature 'lag_12')
   - Captures annual seasonal patterns without statistical learning.

2. Baseline 2: Trailing Moving Average MA-3 Forecaster
   - Predicts the unweighted arithmetic mean of the preceding 3 months:
     y_hat_{d, t} = mean(y_{d, t-1}, y_{d, t-2}, y_{d, t-3}) (represented by feature 'rolling_mean_3')
   - Captures short-term local trend/level shifts without seasonal adjustment.

Both baselines require zero statistical parameter estimation and serve as strict benchmark
hurdles for machine learning models. Predictions are strictly non-negative.
"""

import sys
import os
import logging
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.evaluation.metrics import evaluate_predictions, clamp_predictions
from ml.feature_engineering.feature_pipeline import TARGET_COLUMN

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class SeasonalNaiveForecaster:
    """
    Seasonal Naive Baseline (Lag 12).
    Forecasts future monthly crime volume using the volume observed in the same month of the prior year.
    """

    def __init__(self, lag_column: str = "lag_12"):
        self.lag_column = lag_column

    def fit(self, X: pd.DataFrame, y: Any = None):
        """No parameter fitting required for Seasonal Naive."""
        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Extracts lag_12 and applies non-negative clamping."""
        if self.lag_column not in df.columns:
            raise ValueError(f"Required lag column '{self.lag_column}' not found in DataFrame.")
        raw_pred = df[self.lag_column].values
        return clamp_predictions(raw_pred)


class MovingAverageForecaster:
    """
    Trailing Moving Average Baseline MA-3 (Mean of t-1, t-2, t-3).
    Forecasts future monthly crime volume as the average of the last 3 observed months.
    """

    def __init__(self, rolling_column: str = "rolling_mean_3"):
        self.rolling_column = rolling_column

    def fit(self, X: pd.DataFrame, y: Any = None):
        """No parameter fitting required for Moving Average."""
        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Extracts rolling_mean_3 and applies non-negative clamping."""
        if self.rolling_column not in df.columns:
            raise ValueError(f"Required rolling column '{self.rolling_column}' not found in DataFrame.")
        raw_pred = df[self.rolling_column].values
        return clamp_predictions(raw_pred)


def evaluate_baseline_models(
    df: pd.DataFrame,
) -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Evaluates Seasonal Naive and MA-3 baselines on Validation (2024) and Test (2025) splits.

    Returns:
        dict: Structured metrics dictionary by split and model.
    """
    val_df = df[df["split"] == "VALIDATION"].copy()
    test_df = df[df["split"] == "TEST"].copy()

    val_y = val_df[TARGET_COLUMN].values
    test_y = test_df[TARGET_COLUMN].values

    sn = SeasonalNaiveForecaster()
    ma3 = MovingAverageForecaster()

    # Validation predictions
    sn_val_pred = sn.predict(val_df)
    ma3_val_pred = ma3.predict(val_df)

    # Test predictions
    sn_test_pred = sn.predict(test_df)
    ma3_test_pred = ma3.predict(test_df)

    results = {
        "VALIDATION_2024": {
            "Seasonal_Naive": evaluate_predictions(val_y, sn_val_pred),
            "Moving_Average_3": evaluate_predictions(val_y, ma3_val_pred),
        },
        "TEST_2025": {
            "Seasonal_Naive": evaluate_predictions(test_y, sn_test_pred),
            "Moving_Average_3": evaluate_predictions(test_y, ma3_test_pred),
        },
    }

    return results


def run_baselines(parquet_path: str = "ml/data/panel_features_2020_2025.parquet") -> Dict[str, Any]:
    """
    Loads parquet data, evaluates both baselines, and logs results.
    """
    logger.info("Loading feature panel from %s...", parquet_path)
    df = pd.read_parquet(parquet_path)

    results = evaluate_baseline_models(df)

    print("\n" + "=" * 65)
    print("PHASE 8C: HEURISTIC BASELINE MODELS EVALUATION")
    print("=" * 65)
    for split, models in results.items():
        print(f"\n--- Split: {split} (7,680 observations) ---")
        print(f"{'Model':<22} {'MAE':>8} {'RMSE':>8} {'WAPE%':>8} {'R2':>8}")
        print("-" * 58)
        for model_name, metrics in models.items():
            print(
                f"{model_name:<22} {metrics['MAE']:>8.4f} {metrics['RMSE']:>8.4f} "
                f"{metrics['WAPE%']:>7.2f}% {metrics['R2']:>8.4f}"
            )
    print("=" * 65 + "\n")

    return results


if __name__ == "__main__":
    run_baselines()
