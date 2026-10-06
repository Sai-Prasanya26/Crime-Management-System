"""
Phase 8C: Comprehensive ML Model Comparison & Error Analysis.

Compares:
1. Baseline 1: Seasonal Naive (lag_12)
2. Baseline 2: Moving Average MA-3 (rolling_mean_3)
3. Primary Model: HistGradientBoostingRegressor
4. Comparison Model: RandomForestRegressor

Generates:
- Validation 2024 & Untouched Test 2025 comparative metrics (MAE, RMSE, WAPE%, R2).
- Relative percentage improvements over baselines.
- District-level error distribution analysis (mean, median, IQR, percentiles).
- Volume-segmented error analysis (high volume vs low volume vs zero-heavy).
- Top 5 best and worst performing districts.
- Feature importance rankings (RF impurity-based and HGBR permutation-based).
"""

import sys
import os
import json
import logging
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.evaluation.metrics import evaluate_predictions, clamp_predictions
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN
from ml.training.train_baselines import SeasonalNaiveForecaster, MovingAverageForecaster

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def generate_comparison_table(
    y_true: np.ndarray,
    predictions: Dict[str, np.ndarray],
    split_name: str,
) -> pd.DataFrame:
    """Computes metrics and returns formatted DataFrame for a split."""
    rows = []
    for model_name, y_pred in predictions.items():
        metrics = evaluate_predictions(y_true, y_pred)
        rows.append({
            "Split": split_name,
            "Model": model_name,
            "MAE": metrics["MAE"],
            "RMSE": metrics["RMSE"],
            "WAPE%": metrics["WAPE%"],
            "R2": metrics["R2"],
        })
    df_metrics = pd.DataFrame(rows)
    # Calculate relative improvement against Seasonal Naive
    sn_mae = df_metrics.loc[df_metrics["Model"] == "Seasonal_Naive", "MAE"].values[0]
    df_metrics["MAE_Reduction_vs_SN%"] = ((sn_mae - df_metrics["MAE"]) / sn_mae * 100).round(2)
    return df_metrics


def analyze_district_errors(
    test_df: pd.DataFrame,
    y_pred: np.ndarray,
) -> Dict[str, Any]:
    """
    Performs district-level granular error breakdown on the out-of-sample Test set (2025).
    """
    df = test_df.copy()
    df["y_pred"] = clamp_predictions(y_pred)
    df["abs_err"] = np.abs(df[TARGET_COLUMN] - df["y_pred"])
    df["sq_err"] = (df[TARGET_COLUMN] - df["y_pred"]) ** 2

    district_group = df.groupby(["district_id", "district_name", "state_name"]).agg(
        mae=("abs_err", "mean"),
        rmse=("sq_err", lambda s: np.sqrt(s.mean())),
        total_actual=(TARGET_COLUMN, "sum"),
        total_pred=("y_pred", "sum"),
        zero_months=(TARGET_COLUMN, lambda s: int((s == 0).sum())),
    ).reset_index()

    district_group["wape"] = (
        np.abs(district_group["total_actual"] - district_group["total_pred"])
        / np.maximum(district_group["total_actual"], 1.0)
        * 100
    ).round(2)

    median_actual_volume = district_group["total_actual"].median()
    high_volume_districts = district_group[district_group["total_actual"] >= median_actual_volume]
    low_volume_districts = district_group[district_group["total_actual"] < median_actual_volume]
    zero_heavy_districts = district_group[district_group["zero_months"] >= 6]

    top_5_best = district_group.sort_values("mae", ascending=True).head(5)
    top_5_worst = district_group.sort_values("mae", ascending=False).head(5)

    return {
        "overall_test_mae": float(df["abs_err"].mean()),
        "district_mae_mean": float(district_group["mae"].mean()),
        "district_mae_median": float(district_group["mae"].median()),
        "district_mae_q25": float(district_group["mae"].quantile(0.25)),
        "district_mae_q75": float(district_group["mae"].quantile(0.75)),
        "high_volume_districts": {
            "count": len(high_volume_districts),
            "mean_mae": float(high_volume_districts["mae"].mean()),
            "median_mae": float(high_volume_districts["mae"].median()),
        },
        "low_volume_districts": {
            "count": len(low_volume_districts),
            "mean_mae": float(low_volume_districts["mae"].mean()),
            "median_mae": float(low_volume_districts["mae"].median()),
        },
        "zero_heavy_districts": {
            "count": len(zero_heavy_districts),
            "mean_mae": float(zero_heavy_districts["mae"].mean()),
            "median_mae": float(zero_heavy_districts["mae"].median()),
        },
        "top_5_best": top_5_best[["district_name", "state_name", "mae", "total_actual", "zero_months"]].to_dict(orient="records"),
        "top_5_worst": top_5_worst[["district_name", "state_name", "mae", "total_actual", "zero_months"]].to_dict(orient="records"),
    }


def compute_feature_importances(
    hgbr_model: HistGradientBoostingRegressor,
    rf_model: RandomForestRegressor,
    val_df: pd.DataFrame,
) -> Dict[str, pd.Series]:
    """Computes feature importance rankings for both primary and comparison models."""
    # RF Impurity Feature Importance
    rf_importances = pd.Series(
        rf_model.feature_importances_,
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    # HGBR Permutation Feature Importance on Validation set
    X_val = val_df[FEATURE_COLUMNS]
    y_val = val_df[TARGET_COLUMN].values
    perm = permutation_importance(hgbr_model, X_val, y_val, n_repeats=5, random_state=42, n_jobs=-1)
    hgbr_importances = pd.Series(
        perm.importances_mean,
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    return {
        "RandomForest": rf_importances,
        "HistGradientBoosting": hgbr_importances,
    }


def run_full_comparison(
    parquet_path: str = "ml/data/panel_features_2020_2025.parquet",
    models_dir: str = "ml/saved_models",
) -> Dict[str, Any]:
    """Executes the complete model comparison suite."""
    logger.info("Loading feature panel from %s...", parquet_path)
    df = pd.read_parquet(parquet_path)

    val_df = df[df["split"] == "VALIDATION"].copy()
    test_df = df[df["split"] == "TEST"].copy()

    val_y = val_df[TARGET_COLUMN].values
    test_y = test_df[TARGET_COLUMN].values

    # Load trained models
    hgbr_path = os.path.join(models_dir, "experimental_hgbr_v1.joblib")
    rf_path = os.path.join(models_dir, "experimental_random_forest_v1.joblib")

    if not os.path.exists(hgbr_path) or not os.path.exists(rf_path):
        raise FileNotFoundError("Trained models not found. Run train_forecaster.py first.")

    hgbr_model = joblib.load(hgbr_path)
    rf_model = joblib.load(rf_path)

    # Baselines
    sn = SeasonalNaiveForecaster()
    ma3 = MovingAverageForecaster()

    val_preds = {
        "Seasonal_Naive": sn.predict(val_df),
        "Moving_Average_3": ma3.predict(val_df),
        "HistGradientBoosting": clamp_predictions(hgbr_model.predict(val_df[FEATURE_COLUMNS])),
        "RandomForest": clamp_predictions(rf_model.predict(val_df[FEATURE_COLUMNS])),
    }

    test_preds = {
        "Seasonal_Naive": sn.predict(test_df),
        "Moving_Average_3": ma3.predict(test_df),
        "HistGradientBoosting": clamp_predictions(hgbr_model.predict(test_df[FEATURE_COLUMNS])),
        "RandomForest": clamp_predictions(rf_model.predict(test_df[FEATURE_COLUMNS])),
    }

    # Generate comparative tables
    df_val = generate_comparison_table(val_y, val_preds, "VALIDATION_2024")
    df_test = generate_comparison_table(test_y, test_preds, "TEST_2025")

    # District Error Analysis on Test Set for Primary Model (HGBR)
    district_analysis = analyze_district_errors(test_df, test_preds["HistGradientBoosting"])

    # Feature Importances
    importances = compute_feature_importances(hgbr_model, rf_model, val_df)

    print("\n" + "=" * 80)
    print("PHASE 8C: COMPREHENSIVE MODEL EVALUATION & COMPARISON REPORT")
    print("=" * 80)

    print("\n1. VALIDATION SET PERFORMANCE (2024 — 7,680 Observations):")
    print("-" * 80)
    print(df_val.to_string(index=False))

    print("\n2. UNTOUCHED OUT-OF-SAMPLE TEST SET PERFORMANCE (2025 — 7,680 Observations):")
    print("-" * 80)
    print(df_test.to_string(index=False))

    print("\n3. DISTRICT-LEVEL ERROR BREAKDOWN (Primary Model: HGBR, Test 2025):")
    print("-" * 80)
    print(f"  • Overall Test MAE:              {district_analysis['overall_test_mae']:.4f}")
    print(f"  • District MAE Mean:             {district_analysis['district_mae_mean']:.4f}")
    print(f"  • District MAE Median:           {district_analysis['district_mae_median']:.4f}")
    print(f"  • District MAE 25th Percentile:  {district_analysis['district_mae_q25']:.4f}")
    print(f"  • District MAE 75th Percentile:  {district_analysis['district_mae_q75']:.4f}")
    print(f"  • High-Volume Districts MAE:     Mean {district_analysis['high_volume_districts']['mean_mae']:.4f} | Median {district_analysis['high_volume_districts']['median_mae']:.4f} (N={district_analysis['high_volume_districts']['count']})")
    print(f"  • Low-Volume Districts MAE:      Mean {district_analysis['low_volume_districts']['mean_mae']:.4f} | Median {district_analysis['low_volume_districts']['median_mae']:.4f} (N={district_analysis['low_volume_districts']['count']})")
    print(f"  • Zero-Heavy Districts MAE:      Mean {district_analysis['zero_heavy_districts']['mean_mae']:.4f} | Median {district_analysis['zero_heavy_districts']['median_mae']:.4f} (N={district_analysis['zero_heavy_districts']['count']})")

    print("\n  Top 5 Best Predicted Districts (Lowest MAE):")
    for r in district_analysis["top_5_best"]:
        print(f"    - {r['district_name']} ({r['state_name']}): MAE = {r['mae']:.4f}, Total 2025 Crimes = {r['total_actual']}, Zero Months = {r['zero_months']}")

    print("\n  Top 5 Highest Error Districts (Highest MAE — High Population Hubs):")
    for r in district_analysis["top_5_worst"]:
        print(f"    - {r['district_name']} ({r['state_name']}): MAE = {r['mae']:.4f}, Total 2025 Crimes = {r['total_actual']}, Zero Months = {r['zero_months']}")

    print("\n4. TOP 10 FEATURE IMPORTANCES:")
    print("-" * 80)
    print("RandomForest (Impurity Reduction):")
    for feat, val in importances["RandomForest"].head(10).items():
        print(f"  {feat:<30} {val:>8.4f}")

    print("\nHistGradientBoosting (Validation Permutation Importance):")
    for feat, val in importances["HistGradientBoosting"].head(10).items():
        print(f"  {feat:<30} {val:>8.4f}")
    print("=" * 80 + "\n")

    return {
        "val_table": df_val,
        "test_table": df_test,
        "district_analysis": district_analysis,
        "importances": importances,
    }


if __name__ == "__main__":
    run_full_comparison()
