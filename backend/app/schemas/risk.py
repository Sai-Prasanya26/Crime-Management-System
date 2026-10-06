"""
Phase 9B: Pydantic Schemas for Risk Assessment Endpoints.
"""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any


class FactorDetailItem(BaseModel):
    raw: float
    percentile: float
    weight: float
    weighted: float


class RiskItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    district_id: int
    district_name: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    period_year: int
    period_month: int
    assessment_period: str
    overall_risk_score: float
    risk_level: str
    severity_index: float
    trend_index: float
    volume_index: float
    forecast_index: Optional[float] = None
    rate_index: Optional[float] = None
    population_density_factor: float
    calculation_version: str
    model_version: Optional[str] = None
    strongest_driver: Optional[str] = None
    factor_contributions: Optional[Dict[str, Any]] = None
    generated_at: Optional[str] = None


class DistrictRiskDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    district_id: int
    district_name: str
    state_id: int
    state_name: str
    census_2011_population: int
    period_year: int
    period_month: int
    assessment_period: str
    overall_risk_score: float
    risk_level: str
    severity_index: float
    historical_volume: int
    forecast_volume: float
    crime_rate_per_100k: float
    trend_ratio: float
    factor_percentiles: Dict[str, float]
    factor_contributions: Dict[str, Any]
    strongest_driver: str
    calculation_version: str
    model_version: Optional[str] = None
    model_name: Optional[str] = None
    generated_at: Optional[str] = None


class RiskOverviewResponse(BaseModel):
    total_assessed_districts: int
    mean_risk_score: float
    median_risk_score: float
    highest_risk_score: float
    lowest_risk_score: float
    risk_level_distribution: Dict[str, int]
    risk_level_percentages: Dict[str, float]
    top_risk_districts: List[RiskItemResponse]
    assessment_period: str
    methodology_version: str
    active_forecast_model: str
    active_forecast_version: str


class RiskModelInfoResponse(BaseModel):
    methodology_version: str
    formula: str
    factors: List[Dict[str, Any]]
    normalization: str
    risk_bands: Dict[str, str]
    active_model_name: str
    active_model_version: str
