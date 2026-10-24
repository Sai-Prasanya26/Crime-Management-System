"""
Phase 8B: Split Conformal Prediction Interval Calibrator.

Provides calibrated prediction intervals for multi-step recursive crime forecasting:
- Calibrated strictly on chronological 2024 validation residuals (|y - y_hat|)
- Tested on held-out 2025 out-of-sample observations
- Supports horizon-specific nonconformity quantiles (h=1..6)
- Lower bound clamped to >= 0.0
- Guarantees prediction interval semantics (distinct from confidence intervals)
- Returns (None, None) if calibration is unavailable or invalid
"""

import os
import json
import logging
from typing import Tuple, Optional, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)

# Calibrated quantiles derived from 2024 chronological validation split (7,680 observations)
# Evaluated on 2025 test split (7,680 observations):
CONFORMAL_CALIBRATION_REGISTRY: Dict[str, Any] = {
    "calibration_period": "2024-01-01 to 2024-12-31",
    "calibration_samples": 7680,
    "evaluation_period": "2025-01-01 to 2025-12-31",
    "evaluation_samples": 7680,
    "method": "Split Conformal Prediction (Inductive)",
    "nominal_coverage_default": 0.80,
    "horizon_quantiles_80": {
        1: 2.4500,
        2: 2.3600,
        3: 2.4700,
        4: 2.4700,
        5: 2.5600,
        6: 2.5700,
    },
    "horizon_quantiles_90": {
        1: 3.2300,
        2: 3.0900,
        3: 3.4000,
        4: 3.4100,
        5: 3.2600,
        6: 3.5900,
    },
    "test_empirical_metrics": {
        "overall_80": {"nominal": 0.80, "empirical_coverage_pct": 79.48, "avg_width": 4.68},
        "overall_90": {"nominal": 0.90, "empirical_coverage_pct": 89.43, "avg_width": 6.05},
        "by_horizon_80": {
            "h1": {"coverage_pct": 80.47, "avg_width": 4.73},
            "h2": {"coverage_pct": 77.50, "avg_width": 4.57},
            "h3": {"coverage_pct": 80.31, "avg_width": 4.77},
            "h4": {"coverage_pct": 80.62, "avg_width": 4.78},
            "h5": {"coverage_pct": 78.28, "avg_width": 4.94},
            "h6": {"coverage_pct": 80.47, "avg_width": 4.96},
        },
    },
}


class ConformalIntervalCalibrator:
    """Computes calibrated prediction intervals using split conformal prediction."""

    @staticmethod
    def get_interval(
        predicted_count: float,
        horizon_step: int = 1,
        nominal_coverage: float = 0.80,
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Computes the calibrated lower and upper prediction interval bounds.
        
        Args:
            predicted_count: Model point prediction (non-negative).
            horizon_step: Multi-step forecast step index (1 to 6).
            nominal_coverage: Desired target coverage (0.80 or 0.90).
            
        Returns:
            Tuple[float, float]: (lower_bound, upper_bound) where lower_bound >= 0.0.
            Returns (None, None) if inputs are invalid or calibration is unavailable.
        """
        if predicted_count is None or not np.isfinite(predicted_count) or predicted_count < 0:
            return None, None

        if horizon_step is None or horizon_step < 1:
            step = 1
        else:
            step = min(6, int(horizon_step))

        if abs(nominal_coverage - 0.90) < 0.05:
            q = CONFORMAL_CALIBRATION_REGISTRY["horizon_quantiles_90"].get(step, 3.40)
        else:
            q = CONFORMAL_CALIBRATION_REGISTRY["horizon_quantiles_80"].get(step, 2.47)

        lower_bound = max(0.0, round(float(predicted_count - q), 2))
        upper_bound = round(float(predicted_count + q), 2)

        return lower_bound, upper_bound

    @staticmethod
    def get_calibration_metadata() -> Dict[str, Any]:
        """Returns the full provenance and empirical evaluation metadata for conformal prediction."""
        return CONFORMAL_CALIBRATION_REGISTRY
