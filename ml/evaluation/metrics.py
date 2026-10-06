"""
Phase 8C: Evaluation Metrics for Crime Forecasting.

Defines standard time-series evaluation metrics for monthly district crime volume forecasting:
1. MAE (Mean Absolute Error): Average absolute difference between actual and forecast.
2. RMSE (Root Mean Squared Error): Square root of mean squared error (penalizes large outlier errors).
3. WAPE (Weighted Absolute Percentage Error): Total absolute error divided by total actual volume.
   Formula: sum(|y - y_hat|) / sum(y) * 100%
   Strictly preferred over standard MAPE because zero-incident district-months cause division by zero.
4. R2 (Coefficient of Determination): Proportion of variance explained by model forecasts.
5. Non-Negative Clamping: Clamps negative predictions to 0.0 (crime volume cannot be negative).
"""

from typing import Dict, Union
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def clamp_predictions(y_pred: Union[np.ndarray, pd.Series, list]) -> np.ndarray:
    """
    Clamps predicted values to be non-negative (>= 0.0).
    Crime counts cannot physically be negative.
    """
    arr = np.asarray(y_pred, dtype=float)
    return np.maximum(arr, 0.0)


def compute_mae(y_true: Union[np.ndarray, pd.Series], y_pred: Union[np.ndarray, pd.Series]) -> float:
    """Computes Mean Absolute Error."""
    y_t = np.asarray(y_true, dtype=float)
    y_p = clamp_predictions(y_pred)
    return float(mean_absolute_error(y_t, y_p))


def compute_rmse(y_true: Union[np.ndarray, pd.Series], y_pred: Union[np.ndarray, pd.Series]) -> float:
    """Computes Root Mean Squared Error."""
    y_t = np.asarray(y_true, dtype=float)
    y_p = clamp_predictions(y_pred)
    return float(np.sqrt(mean_squared_error(y_t, y_p)))


def compute_wape(y_true: Union[np.ndarray, pd.Series], y_pred: Union[np.ndarray, pd.Series]) -> float:
    """
    Computes Weighted Absolute Percentage Error (WAPE) expressed as a percentage:
    WAPE = (sum(|y_true - y_pred|) / sum(y_true)) * 100

    Safely handles arrays containing zero-incident entries without zero-division error.
    Returns 0.0 if total actual incidents sum to 0.
    """
    y_t = np.asarray(y_true, dtype=float)
    y_p = clamp_predictions(y_pred)
    sum_actual = float(np.sum(y_t))
    if sum_actual == 0.0:
        return 0.0
    sum_abs_err = float(np.sum(np.abs(y_t - y_p)))
    return (sum_abs_err / sum_actual) * 100.0


def compute_r2(y_true: Union[np.ndarray, pd.Series], y_pred: Union[np.ndarray, pd.Series]) -> float:
    """Computes R-squared (Coefficient of Determination)."""
    y_t = np.asarray(y_true, dtype=float)
    y_p = clamp_predictions(y_pred)
    return float(r2_score(y_t, y_p))


def evaluate_predictions(
    y_true: Union[np.ndarray, pd.Series],
    y_pred: Union[np.ndarray, pd.Series],
    round_digits: int = 4,
) -> Dict[str, float]:
    """
    Computes all standard forecast evaluation metrics on non-negatively clamped predictions.
    
    Returns:
        dict: {'MAE': float, 'RMSE': float, 'WAPE%': float, 'R2': float}
    """
    y_t = np.asarray(y_true, dtype=float)
    y_p = clamp_predictions(y_pred)

    mae = compute_mae(y_t, y_p)
    rmse = compute_rmse(y_t, y_p)
    wape = compute_wape(y_t, y_p)
    r2 = compute_r2(y_t, y_p)

    return {
        "MAE": round(mae, round_digits),
        "RMSE": round(rmse, round_digits),
        "WAPE%": round(wape, 2),
        "R2": round(r2, round_digits),
    }
