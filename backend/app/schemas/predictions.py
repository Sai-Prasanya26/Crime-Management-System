"""
Phase 8D: Pydantic Schemas for Prediction Endpoints.
"""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import date, datetime


class PredictionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    district_id: int
    district_name: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    forecast_period: str
    predicted_crime_count: float
    model_version: str
    model_name: str


class PredictionOverviewResponse(BaseModel):
    total_predictions: int
    districts_covered: int
    earliest_period: str
    latest_period: str
    periods_count: int
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
    disclaimer: str


class ActualVsPredictedPoint(BaseModel):
    period: str
    actual_count: Optional[float] = None
    predicted_count: Optional[float] = None
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
    forward_months: int = 3
    include_2025: bool = True


class GenerateTriggerResponse(BaseModel):
    status: str
    model_id: int
    total_predictions_stored: int
    periods_covered: List[str]
    districts_count: int
    generated_count: int
    message: str
