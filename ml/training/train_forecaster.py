"""
Phase 8C: Primary ML Crime Volume Forecaster Training & Validation.

Implements:
1. Primary Forecasting Model: HistGradientBoostingRegressor
   - Native histogram-based gradient boosting optimized for tabular data.
   - Categorical handling on state_id (cardinality 37 <= 255).
   - District-specific characteristics captured via Census 2011 demographics and historical crime rates.
   - Hyperparameters: learning_rate=0.05, max_iter=300, max_leaf_nodes=31, min_samples_leaf=20, l2_regularization=1.0.

2. Comparison Model: RandomForestRegressor
   - Bagging ensemble of 100 decorrelated decision trees.
   - Hyperparameters: n_estimators=100, max_depth=12, min_samples_leaf=2, random_state=42.

3. Evaluation Framework:
   - Chronological Splits: Train (2021-2023) / Validation (2024) / Test (2025).
   - Walk-Forward Expanding Window Validation: Folds 1 (2023), 2 (2024), 3 (2025).
   - Non-negative prediction post-processing: y_hat = max(y_hat, 0.0).

4. Artifact Serialization:
   - Saved models to ml/saved_models/ (experimental_hgbr_v1.joblib, experimental_random_forest_v1.joblib).
   - Complete reproducibility metadata to ml/saved_models/training_metadata_v1.json.
"""

import sys
import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.evaluation.metrics import evaluate_predictions, clamp_predictions
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Model hyperparameter specifications
HGBR_PARAMS: Dict[str, Any] = {
    "learning_rate": 0.05,
    "max_iter": 300,
    "max_leaf_nodes": 31,
    "min_samples_leaf": 20,
    "l2_regularization": 1.0,
    "random_state": 42,
}

RF_PARAMS: Dict[str, Any] = {
    "n_estimators": 100,
    "max_depth": 12,
    "min_samples_leaf": 2,
    "random_state": 42,
    "n_jobs": -1,
}

WALK_FORWARD_FOLDS = [
    {
        "fold": 1,
        "name": "Fold 1 (Train 2021-2022 -> Val 2023)",
        "train_years": [2021, 2022],
        "eval_year": 2023,
    },
    {
        "fold": 2,
        "name": "Fold 2 (Train 2021-2023 -> Val 2024)",
        "train_years": [2021, 2022, 2023],
        "eval_year": 2024,
    },
    {
        "fold": 3,
        "name": "Fold 3 (Train 2021-2024 -> Test 2025)",
        "train_years": [2021, 2022, 2023, 2024],
        "eval_year": 2025,
    },
]


def build_categorical_mask(feature_names: List[str]) -> List[bool]:
    """
    Constructs boolean mask for categorical features in HistGradientBoostingRegressor.
    
    Note: scikit-learn's HistGradientBoostingRegressor restricts categorical features to
    cardinality <= 255 due to internal uint8 binning. state_id has 37 categories (valid),
    while district_id has 640 categories (> 255) and is represented numerically alongside
    rich Census 2011 demographic indicators.
    """
    return [col == "state_id" for col in feature_names]


def train_hgbr_model(
    X_train: pd.DataFrame,
    y_train: np.ndarray,
    categorical_mask: List[bool],
    params: Dict[str, Any] = HGBR_PARAMS,
) -> Tuple[HistGradientBoostingRegressor, float]:
    """Trains HistGradientBoostingRegressor and returns (model, fit_time_seconds)."""
    model = HistGradientBoostingRegressor(
        categorical_features=categorical_mask,
        **params,
    )
    start_time = time.time()
    model.fit(X_train, y_train)
    fit_time = round(time.time() - start_time, 4)
    logger.info("Trained HistGradientBoostingRegressor in %.2fs (iterations: %d)", fit_time, model.n_iter_)
    return model, fit_time


def train_rf_model(
    X_train: pd.DataFrame,
    y_train: np.ndarray,
    params: Dict[str, Any] = RF_PARAMS,
) -> Tuple[RandomForestRegressor, float]:
    """Trains RandomForestRegressor and returns (model, fit_time_seconds)."""
    model = RandomForestRegressor(**params)
    start_time = time.time()
    model.fit(X_train, y_train)
    fit_time = round(time.time() - start_time, 4)
    logger.info("Trained RandomForestRegressor in %.2fs", fit_time)
    return model, fit_time


def run_walk_forward_cv(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    categorical_mask: List[bool],
) -> List[Dict[str, Any]]:
    """
    Executes expanding window walk-forward validation across the three historical folds.
    """
    logger.info("Executing walk-forward cross validation...")
    fold_results = []

    for fold_cfg in WALK_FORWARD_FOLDS:
        fold_num = fold_cfg["fold"]
        train_years = fold_cfg["train_years"]
        eval_year = fold_cfg["eval_year"]

        tr_data = df[df["year"].isin(train_years)]
        eval_data = df[df["year"] == eval_year]

        X_tr = tr_data[feature_cols]
        y_tr = tr_data[target_col].values
        X_ev = eval_data[feature_cols]
        y_ev = eval_data[target_col].values

        # Baselines
        sn_pred = clamp_predictions(eval_data["lag_12"].values)
        ma3_pred = clamp_predictions(eval_data["rolling_mean_3"].values)

        # Train HGBR
        hgbr_fold, hgbr_time = train_hgbr_model(X_tr, y_tr, categorical_mask)
        hgbr_pred = clamp_predictions(hgbr_fold.predict(X_ev))

        # Train RF
        rf_fold, rf_time = train_rf_model(X_tr, y_tr)
        rf_pred = clamp_predictions(rf_fold.predict(X_ev))

        fold_eval = {
            "fold": fold_num,
            "description": fold_cfg["name"],
            "train_years": train_years,
            "eval_year": eval_year,
            "train_observations": len(tr_data),
            "eval_observations": len(eval_data),
            "hgbr_fit_time_seconds": hgbr_time,
            "rf_fit_time_seconds": rf_time,
            "metrics": {
                "Seasonal_Naive": evaluate_predictions(y_ev, sn_pred),
                "Moving_Average_3": evaluate_predictions(y_ev, ma3_pred),
                "HistGradientBoosting": evaluate_predictions(y_ev, hgbr_pred),
                "RandomForest": evaluate_predictions(y_ev, rf_pred),
            },
        }
        fold_results.append(fold_eval)

    return fold_results


def train_and_evaluate_all(
    parquet_path: str = "ml/data/panel_features_2020_2025.parquet",
    output_dir: str = "ml/saved_models",
) -> Dict[str, Any]:
    """
    Main training and evaluation routine:
    1. Trains primary HGBR and RF models on TRAIN split (2021-2023).
    2. Evaluates on VALIDATION split (2024) and untouched TEST split (2025).
    3. Runs walk-forward cross validation.
    4. Saves model artifacts and metadata.
    """
    logger.info("Loading feature panel from %s...", parquet_path)
    df = pd.read_parquet(parquet_path)

    train_df = df[df["split"] == "TRAIN"].copy()
    val_df = df[df["split"] == "VALIDATION"].copy()
    test_df = df[df["split"] == "TEST"].copy()

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET_COLUMN].values
    X_val = val_df[FEATURE_COLUMNS]
    y_val = val_df[TARGET_COLUMN].values
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN].values

    cat_mask = build_categorical_mask(FEATURE_COLUMNS)

    # Train Primary Model (HGBR) on 2021-2023
    logger.info("Fitting Primary HistGradientBoostingRegressor on TRAIN split (2021-2023)...")
    hgbr_model, hgbr_fit_time = train_hgbr_model(X_train, y_train, cat_mask)

    # Train Comparison Model (RF) on 2021-2023
    logger.info("Fitting Comparison RandomForestRegressor on TRAIN split (2021-2023)...")
    rf_model, rf_fit_time = train_rf_model(X_train, y_train)

    # Evaluate Baselines
    sn_val_pred = clamp_predictions(val_df["lag_12"].values)
    ma3_val_pred = clamp_predictions(val_df["rolling_mean_3"].values)
    sn_test_pred = clamp_predictions(test_df["lag_12"].values)
    ma3_test_pred = clamp_predictions(test_df["rolling_mean_3"].values)

    # Evaluate ML Models
    hgbr_val_pred = clamp_predictions(hgbr_model.predict(X_val))
    hgbr_test_pred = clamp_predictions(hgbr_model.predict(X_test))

    rf_val_pred = clamp_predictions(rf_model.predict(X_val))
    rf_test_pred = clamp_predictions(rf_model.predict(X_test))

    # Compile Validation & Test metrics
    val_metrics = {
        "Seasonal_Naive": evaluate_predictions(y_val, sn_val_pred),
        "Moving_Average_3": evaluate_predictions(y_val, ma3_val_pred),
        "HistGradientBoosting": evaluate_predictions(y_val, hgbr_val_pred),
        "RandomForest": evaluate_predictions(y_val, rf_val_pred),
    }

    test_metrics = {
        "Seasonal_Naive": evaluate_predictions(y_test, sn_test_pred),
        "Moving_Average_3": evaluate_predictions(y_test, ma3_test_pred),
        "HistGradientBoosting": evaluate_predictions(y_test, hgbr_test_pred),
        "RandomForest": evaluate_predictions(y_test, rf_test_pred),
    }

    # Execute Walk-Forward Cross Validation
    walk_forward_results = run_walk_forward_cv(df, FEATURE_COLUMNS, TARGET_COLUMN, cat_mask)

    # Save artifacts
    os.makedirs(output_dir, exist_ok=True)
    hgbr_path = os.path.join(output_dir, "experimental_hgbr_v1.joblib")
    rf_path = os.path.join(output_dir, "experimental_random_forest_v1.joblib")
    metadata_path = os.path.join(output_dir, "training_metadata_v1.json")

    joblib.dump(hgbr_model, hgbr_path)
    joblib.dump(rf_model, rf_path)
    logger.info("Saved model artifacts: %s and %s", hgbr_path, rf_path)

    metadata = {
        "metadata_version": "1.0.0",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "phase": "Phase 8C — Train Baselines & Primary ML Forecasting Models",
        "dataset": {
            "source_parquet": parquet_path,
            "total_rows": len(df),
            "features_count": len(FEATURE_COLUMNS),
            "feature_names": FEATURE_COLUMNS,
            "target_column": TARGET_COLUMN,
            "split_row_counts": {
                "TRAIN_2021_2023": len(train_df),
                "VALIDATION_2024": len(val_df),
                "TEST_2025": len(test_df),
            },
        },
        "models": {
            "HistGradientBoostingRegressor": {
                "artifact_path": hgbr_path,
                "hyperparameters": HGBR_PARAMS,
                "categorical_features": ["state_id"],
                "fit_time_seconds": hgbr_fit_time,
                "iterations_completed": int(hgbr_model.n_iter_),
            },
            "RandomForestRegressor": {
                "artifact_path": rf_path,
                "hyperparameters": RF_PARAMS,
                "fit_time_seconds": rf_fit_time,
            },
        },
        "evaluation": {
            "VALIDATION_2024": val_metrics,
            "TEST_2025": test_metrics,
            "walk_forward_cv": walk_forward_results,
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved training metadata: %s", metadata_path)

    return metadata


if __name__ == "__main__":
    meta = train_and_evaluate_all()
    print("\n" + "=" * 70)
    print("PHASE 8C: PRIMARY ML MODEL TRAINING COMPLETE")
    print("=" * 70)
    print("\n--- VALIDATION 2024 PERFORMANCE (Trained on 2021-2023) ---")
    print(f"{'Model':<25} {'MAE':>8} {'RMSE':>8} {'WAPE%':>8} {'R2':>8}")
    print("-" * 65)
    for model_name, m in meta["evaluation"]["VALIDATION_2024"].items():
        print(f"{model_name:<25} {m['MAE']:>8.4f} {m['RMSE']:>8.4f} {m['WAPE%']:>7.2f}% {m['R2']:>8.4f}")

    print("\n--- TEST 2025 PERFORMANCE (Trained on 2021-2023, Untouched Test Set) ---")
    print(f"{'Model':<25} {'MAE':>8} {'RMSE':>8} {'WAPE%':>8} {'R2':>8}")
    print("-" * 65)
    for model_name, m in meta["evaluation"]["TEST_2025"].items():
        print(f"{model_name:<25} {m['MAE']:>8.4f} {m['RMSE']:>8.4f} {m['WAPE%']:>7.2f}% {m['R2']:>8.4f}")

    print("\n--- WALK-FORWARD EXPANDING WINDOW VALIDATION ---")
    for f in meta["evaluation"]["walk_forward_cv"]:
        print(f"\n{f['description']} (Train rows: {f['train_observations']:,}, Eval rows: {f['eval_observations']:,}):")
        print(f"{'Model':<25} {'MAE':>8} {'RMSE':>8} {'WAPE%':>8} {'R2':>8}")
        print("-" * 65)
        for model_name, m in f["metrics"].items():
            print(f"{model_name:<25} {m['MAE']:>8.4f} {m['RMSE']:>8.4f} {m['WAPE%']:>7.2f}% {m['R2']:>8.4f}")
    print("=" * 70 + "\n")
