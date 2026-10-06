"""
Phase 8D: Production Model Training & Artifact Serialization.

Trains the production-selected HistGradientBoostingRegressor (HGBR v1.0.0) on the complete
post-warmup historical panel (2021–2025, 38,400 observations across 640 districts).

CRITICAL DISTINCTION:
- Model Selection Evidence: Phase 8C test evaluation on untouched 2025 out-of-sample split:
    MAE: 1.6956 | RMSE: 2.2465 | WAPE: 36.84% | R2: 0.6063
- Production Refit: Refitted on complete historical data through 2025 using the frozen,
  empirically validated architecture and hyperparameters.

Saves:
- Artifact: ml/saved_models/production_hgbr_v1.joblib
- Metadata: ml/saved_models/production_model_metadata_v1.json
"""

import sys
import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.evaluation.metrics import clamp_predictions
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN
from ml.training.train_forecaster import HGBR_PARAMS, build_categorical_mask

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PRODUCTION_MODEL_NAME = "HGBR production forecasting model v1"
PRODUCTION_MODEL_VERSION = "v1.0.0"
PRODUCTION_MODEL_TYPE = "FORECASTING"
PRODUCTION_ALGORITHM = "HistGradientBoostingRegressor"
SOURCE_PARQUET = "ml/data/panel_features_2020_2025.parquet"
OUTPUT_DIR = "ml/saved_models"
ARTIFACT_FILENAME = "production_hgbr_v1.joblib"
METADATA_FILENAME = "production_model_metadata_v1.json"

# Frozen Phase 8C Verified Benchmark Metrics (Untouched 2025 Out-of-Sample Test Set)
PHASE_8C_EVALUATION_METRICS = {
    "source_phase": "Phase 8C — Train Baselines & Primary ML Forecasting Models",
    "evaluation_split": "TEST_2025",
    "evaluation_observations": 7680,
    "evaluation_training_period": "2021–2023",
    "evaluation_test_period": "2025",
    "primary_model_metrics": {
        "model_name": "HistGradientBoostingRegressor",
        "MAE": 1.6956,
        "RMSE": 2.2465,
        "WAPE_percent": 36.84,
        "R2": 0.6063,
    },
    "comparison_models_metrics": {
        "RandomForestRegressor": {
            "MAE": 1.7018,
            "RMSE": 2.2629,
            "WAPE_percent": 36.97,
            "R2": 0.6006,
        },
        "Moving_Average_3": {
            "MAE": 1.8997,
            "RMSE": 2.5084,
            "WAPE_percent": 41.27,
            "R2": 0.5092,
        },
        "Seasonal_Naive": {
            "MAE": 2.2616,
            "RMSE": 3.0170,
            "WAPE_percent": 49.13,
            "R2": 0.2899,
        },
    },
    "relative_improvement_vs_seasonal_naive": {
        "MAE_reduction_percent": 25.03,
        "WAPE_reduction_points": 12.29,
    },
}


def train_production_refit(
    parquet_path: str = SOURCE_PARQUET,
    output_dir: str = OUTPUT_DIR,
) -> Tuple[HistGradientBoostingRegressor, Dict[str, Any]]:
    """
    Refits the production HGBR model on all post-warmup historical observations (2021–2025).
    """
    logger.info("Loading feature panel from %s...", parquet_path)
    df = pd.read_parquet(parquet_path)

    # Filter out warmup; take 2021-2025 (38,400 rows)
    clean_df = df[df["split"] != "WARMUP"].copy()
    assert len(clean_df) == 38400, f"Expected 38,400 clean rows, got {len(clean_df)}"

    X_train = clean_df[FEATURE_COLUMNS]
    y_train = clean_df[TARGET_COLUMN].values

    cat_mask = build_categorical_mask(FEATURE_COLUMNS)

    logger.info(
        "Refitting production %s on complete 2021–2025 dataset (%d rows, %d features)...",
        PRODUCTION_ALGORITHM,
        len(X_train),
        len(FEATURE_COLUMNS),
    )

    model = HistGradientBoostingRegressor(
        categorical_features=cat_mask,
        **HGBR_PARAMS,
    )

    start_time = time.time()
    model.fit(X_train, y_train)
    fit_time = round(time.time() - start_time, 4)

    logger.info(
        "Production model trained in %.2fs. Iterations completed: %d",
        fit_time,
        model.n_iter_,
    )

    # Verification sample prediction
    sample_preds = clamp_predictions(model.predict(X_train.iloc[:5]))
    logger.info("Sample verification predictions: %s", sample_preds.tolist())

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    artifact_path = os.path.join(output_dir, ARTIFACT_FILENAME)
    metadata_path = os.path.join(output_dir, METADATA_FILENAME)

    # Save artifact
    joblib.dump(model, artifact_path)
    logger.info("Saved production model artifact to %s", artifact_path)

    # Construct complete metadata distinguishing model selection from production refit
    metadata = {
        "metadata_version": "1.0.0",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "model_name": PRODUCTION_MODEL_NAME,
        "model_version": PRODUCTION_MODEL_VERSION,
        "model_type": PRODUCTION_MODEL_TYPE,
        "algorithm": PRODUCTION_ALGORITHM,
        "source_phase": "Phase 8D — Production Model Selection & Forecasting Pipeline",
        "artifact_filename": ARTIFACT_FILENAME,
        "artifact_path": artifact_path,
        "hyperparameters": HGBR_PARAMS,
        "random_state": HGBR_PARAMS["random_state"],
        "categorical_features": ["state_id"],
        "feature_columns": FEATURE_COLUMNS,
        "features_count": len(FEATURE_COLUMNS),
        "target_column": TARGET_COLUMN,
        "production_refit": {
            "training_period": "2021-01-01 to 2025-12-01",
            "training_observations": len(clean_df),
            "historical_districts_count": clean_df["district_id"].nunique(),
            "fit_time_seconds": fit_time,
            "iterations_completed": int(model.n_iter_),
            "source_snapshot": os.path.basename(parquet_path),
        },
        "model_selection_evidence": PHASE_8C_EVALUATION_METRICS,
        "policy": {
            "selection_rationale": (
                "HistGradientBoostingRegressor empirically outperformed Seasonal Naive, "
                "Moving Average MA-3, and RandomForestRegressor across all walk-forward folds "
                "and on the untouched 2025 out-of-sample test set (MAE: 1.6956 vs 1.7018 RF, 1.8997 MA-3, 2.2616 SN). "
                "HGBR also demonstrated superior training efficiency (0.44s vs 1.46s RF)."
            ),
            "non_negative_clamp": True,
            "granularity": "District x Month (total monthly volume)",
        },
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved production metadata to %s", metadata_path)

    # Validate loadability
    loaded_model = joblib.load(artifact_path)
    test_pred = clamp_predictions(loaded_model.predict(X_train.iloc[:2]))
    assert len(test_pred) == 2, "Failed to predict with loaded production model artifact"
    logger.info("Successfully validated production model artifact loadability.")

    return model, metadata


if __name__ == "__main__":
    train_production_refit()
