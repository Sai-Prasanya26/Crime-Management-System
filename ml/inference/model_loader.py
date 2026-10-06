"""
Phase 8D: Production Model Loader.

Provides thread-safe, cached singleton loading of the production-selected
HistGradientBoostingRegressor artifact and its verified metadata.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor

logger = logging.getLogger(__name__)

DEFAULT_ARTIFACT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../saved_models/production_hgbr_v1.joblib")
)
DEFAULT_METADATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../saved_models/production_model_metadata_v1.json")
)

_cached_model: Optional[HistGradientBoostingRegressor] = None
_cached_metadata: Optional[Dict[str, Any]] = None


def get_production_model(artifact_path: str = DEFAULT_ARTIFACT_PATH) -> HistGradientBoostingRegressor:
    """
    Loads and returns the production HGBR model artifact.
    Caches the loaded model in memory for fast subsequent inference.
    """
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    if not os.path.exists(artifact_path):
        raise FileNotFoundError(
            f"Production model artifact not found at: {artifact_path}. "
            f"Run 'python ml/training/train_production_model.py' to generate it."
        )

    logger.info("Loading production model artifact from %s", artifact_path)
    model = joblib.load(artifact_path)
    if not hasattr(model, "predict"):
        raise ValueError(f"Loaded artifact at {artifact_path} does not implement 'predict'.")

    _cached_model = model
    return _cached_model


def get_production_metadata(metadata_path: str = DEFAULT_METADATA_PATH) -> Dict[str, Any]:
    """
    Loads and returns the production model metadata JSON dictionary.
    Caches the metadata in memory.
    """
    global _cached_metadata
    if _cached_metadata is not None:
        return _cached_metadata

    if not os.path.exists(metadata_path):
        raise FileNotFoundError(
            f"Production model metadata not found at: {metadata_path}. "
            f"Run 'python ml/training/train_production_model.py' to generate it."
        )

    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # Validate essential fields
    required_keys = ["model_name", "model_version", "algorithm", "feature_columns", "model_selection_evidence"]
    for key in required_keys:
        if key not in meta:
            raise KeyError(f"Corrupt production metadata: missing required key '{key}' in {metadata_path}.")

    _cached_metadata = meta
    return _cached_metadata


def clear_model_cache():
    """Clears cached model and metadata in memory (useful for testing or reloading)."""
    global _cached_model, _cached_metadata
    _cached_model = None
    _cached_metadata = None
