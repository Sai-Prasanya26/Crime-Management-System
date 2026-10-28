"""
Phase 8B: Pydantic Schemas for Prediction & Forecasting Endpoints.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any


class PredictionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    district_id: int
    district_name: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    forecast_period: str
    predicted_crime_count: float
    prediction_interval_lower: Optional[float] = None
    prediction_interval_upper: Optional[float] = None
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    forecast_status: str = "CURRENT_FUTURE_FORECAST"
    forecast_origin_date: Optional[str] = None
    horizon_step: Optional[int] = None
    is_latest: bool = True
    model_version: str
    model_name: str


class PredictionOverviewResponse(BaseModel):
    total_predictions: int
    districts_covered: int
    earliest_period: str
    latest_period: str
    periods_count: int
    historical_periods_count: int = 12
    past_forecast_periods_count: int = 3
    current_forecast_periods_count: int = 3
    current_forecast_start: Optional[str] = None
    current_forecast_end: Optional[str] = None
    forecast_origin_date: Optional[str] = None
    calibration_method: Optional[str] = None
    status_breakdown: Optional[Dict[str, int]] = None
    active_model_name: str
    active_model_version: str
    algorithm: str
    top_predicted_districts: List[PredictionItemResponse]


class DistrictPredictionSeriesResponse(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    series: List[PredictionItemResponse]


class ModelInfoResponse(BaseModel):
    model_id: int
    model_name: str
    model_type: str
    version: str
    algorithm: str
    is_active: bool
    training_date: Optional[str] = None
    dataset_snapshot: str
    artifact_path: str
    evaluation_metrics: Dict[str, Any]
    feature_columns: List[str]


class ModelListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model_name: str
    model_type: str
    version: str
    algorithm: str
    is_active: bool
    training_date: Optional[str] = None
    dataset_snapshot: Optional[str] = None
    evaluation_metrics: Optional[Dict[str, Any]] = None


class EvaluationComparisonResponse(BaseModel):
    evaluation_split: str
    test_period: str
    training_period: str
    models_compared: List[str]
    metrics_summary: Dict[str, Dict[str, float]]
    relative_improvements: Dict[str, Any]
    walk_forward_cv: Optional[List[Dict[str, Any]]] = None
    backtest_horizons: Optional[Dict[str, Any]] = None
    conformal_calibration: Optional[Dict[str, Any]] = None
    disclaimer: str


class ActualVsPredictedPoint(BaseModel):
    period: str
    actual_count: Optional[float] = None
    predicted_count: Optional[float] = None
    prediction_interval_lower: Optional[float] = None
    prediction_interval_upper: Optional[float] = None
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    forecast_status: Optional[str] = None
    error: Optional[float] = None


class ActualVsPredictedResponse(BaseModel):
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    state_name: Optional[str] = None
    comparison_points: List[ActualVsPredictedPoint]
    overall_mae: Optional[float] = None
    overall_rmse: Optional[float] = None
    overall_wape: Optional[float] = None


class TrainTriggerRequest(BaseModel):
    refit_production: bool = True


class TrainTriggerResponse(BaseModel):
    status: str
    model_name: str
    version: str
    algorithm: str
    training_observations: int
    artifact_path: str
    message: str


class GenerateTriggerRequest(BaseModel):
    forward_months: int = Field(12, ge=1, le=12, description="Forecast horizon steps in calendar months (1 to 12)")
    forecast_origin_date: Optional[str] = Field("2026-10-01", description="Cutoff date for forecast origin")
    calibrate_intervals: bool = Field(True, description="Whether to compute calibrated prediction intervals")
    include_2025: bool = Field(True, description="Whether to include historical 2025 evaluation records")


class GenerateTriggerResponse(BaseModel):
    status: str
    model_id: int
    total_predictions_stored: int
    periods_covered: List[str]
    districts_count: int
    generated_count: int
    status_breakdown: Optional[Dict[str, int]] = None
    message: str


class DistrictMonthPredictionResponse(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    parent_district_id: Optional[int] = None
    parent_district_name: Optional[str] = None
    is_derived_from_parent: Optional[bool] = False
    year: int
    month: int
    period: str
    is_available: bool
    data_type: str  # "FORECAST", "HISTORICAL_ACTUAL", or "UNAVAILABLE"
    is_forecast: bool
    is_historical: bool
    display_value: Optional[float] = None
    predicted_count: Optional[float] = None
    actual_count: Optional[int] = None
    prediction_interval_lower: Optional[float] = None
    prediction_interval_upper: Optional[float] = None
    has_baseline: bool
    baseline_year: Optional[int] = None
    baseline_month: Optional[int] = None
    baseline_period: Optional[str] = None
    baseline_count: Optional[float] = None
    baseline_type: Optional[str] = None
    numerical_change: Optional[float] = None
    percentage_change: Optional[float] = None
    crime_level: str  # "Higher", "Moderate", "Lower", "Insufficient Baseline", "Unavailable"
    comparison_rule: str
    explanation: str
    disclaimer: str
    message: Optional[str] = None

