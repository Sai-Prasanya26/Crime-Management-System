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
