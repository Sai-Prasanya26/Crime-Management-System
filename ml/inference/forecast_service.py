"""
Phase 8D: Production Forecasting Service.

Implements reusable monthly crime volume inference:
1. Feature validation against authoritative Phase 8B FEATURE_COLUMNS.
2. Inference execution via production HGBR model.
3. Post-processing non-negative clamping (predicted_incident_count >= 0.0).
4. Structured forecast contract formatting with model version provenance.
"""

import sys
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS
from ml.inference.model_loader import get_production_model, get_production_metadata
from ml.evaluation.metrics import clamp_predictions

logger = logging.getLogger(__name__)


def validate_feature_dataframe(df: pd.DataFrame) -> None:
    """
    Validates that the input DataFrame contains all required production features
    and no forbidden missing values. Raises ValueError on schema violations.
    """
    if not isinstance(df, pd.DataFrame):
        raise TypeError(f"Expected pandas DataFrame for features, got {type(df).__name__}.")

    missing_cols = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Feature validation failed: missing {len(missing_cols)} required predictor column(s): {missing_cols}"
        )

    # Check for NaNs across required feature columns
    nan_counts = df[FEATURE_COLUMNS].isna().sum()
    nan_cols = nan_counts[nan_counts > 0]
    if len(nan_cols) > 0:
        raise ValueError(
            f"Feature validation failed: missing values (NaN) detected in columns: {nan_cols.to_dict()}"
        )


def generate_forecasts(
    features_df: pd.DataFrame,
    forecast_period_override: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generates structured district-month crime volume forecasts using the production HGBR model.

    Args:
        features_df: DataFrame containing at least FEATURE_COLUMNS, plus optional metadata
                     ('district_id', 'district_name', 'state_id', 'state_name', 'period').
        forecast_period_override: Optional period string (e.g. '2026-01-01') to assign
                                  if 'period' column is not present.

    Returns:
        List of structured forecast dictionaries satisfying the Phase 8D contract.
    """
    validate_feature_dataframe(features_df)

    model = get_production_model()
    metadata = get_production_metadata()

    model_name = metadata.get("model_name", "HGBR production forecasting model v1")
    model_version = metadata.get("model_version", "v1.0.0")

    X = features_df[FEATURE_COLUMNS]
    raw_preds = model.predict(X)
    clamped_preds = clamp_predictions(raw_preds)

    timestamp_iso = datetime.now(timezone.utc).isoformat()
    results: List[Dict[str, Any]] = []

    for i in range(len(features_df)):
        row = features_df.iloc[i]

        district_id = int(row["district_id"]) if "district_id" in row else int(X.iloc[i]["district_id"])
        state_id = int(row["state_id"]) if "state_id" in row else int(X.iloc[i]["state_id"])
        district_name = str(row["district_name"]) if "district_name" in row else None
        state_name = str(row["state_name"]) if "state_name" in row else None

        if "period" in row and pd.notna(row["period"]):
            forecast_period = str(row["period"])
        elif forecast_period_override:
            forecast_period = str(forecast_period_override)
        elif "period_date" in row and pd.notna(row["period_date"]):
            forecast_period = str(pd.to_datetime(row["period_date"]).strftime("%Y-%m-%d"))
        else:
            year = int(row["year"]) if "year" in row else 2026
            month = int(row["month"]) if "month" in row else 1
            forecast_period = f"{year:04d}-{month:02d}-01"

        predicted_val = round(float(clamped_preds[i]), 2)

        results.append({
            "district_id": district_id,
            "state_id": state_id,
            "district_name": district_name,
            "state_name": state_name,
            "forecast_period": forecast_period,
            "predicted_incident_count": predicted_val,
            "forecast_horizon": "1-month",
            "model_name": model_name,
            "model_version": model_version,
            "generated_at": timestamp_iso,
        })

    logger.info("Generated %d valid forecasts using %s (%s).", len(results), model_name, model_version)
    return results


class ForecastService:
    """Class interface for forecast generation service."""

    @staticmethod
    def get_model_info() -> Dict[str, Any]:
        """Returns registered production model specifications and selection metrics."""
        return get_production_metadata()

    @staticmethod
    def predict_batch(
        features_df: pd.DataFrame,
        forecast_period: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Batch inference for an engineered feature matrix."""
        return generate_forecasts(features_df, forecast_period_override=forecast_period)
