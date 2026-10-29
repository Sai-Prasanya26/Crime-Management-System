"""
Phase 9: Pydantic Schemas for Explainable Risk Assessment Endpoints.
"""

from pydantic import BaseModel, ConfigDict, Field
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
    score_type: str = "FORECAST"
    severity_index: float
    trend_index: float
    volume_index: float
    forecast_index: Optional[float] = None
    rate_index: Optional[float] = None
    population_density_factor: float
    calculation_version: str
    model_version: Optional[str] = None
    forecast_origin_date: Optional[str] = None
    strongest_driver: Optional[str] = None
    factor_contributions: Optional[Dict[str, Any]] = None
    explanation_summary: Optional[str] = None
    generated_at: Optional[str] = None
    parent_district_id: Optional[int] = None
    parent_district_name: Optional[str] = None
    is_derived_from_parent: bool = False


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
    score_type: str = "FORECAST"
    severity_index: float
    historical_volume: int
    forecast_volume: float
    crime_rate_per_100k: float
    trend_ratio: float
    severity_ratio: Optional[float] = None
    factor_percentiles: Dict[str, float]
    factor_contributions: Dict[str, Any]
    strongest_driver: str
    explanation_summary: Optional[str] = None
    calculation_version: str
    model_version: Optional[str] = None
    model_name: Optional[str] = None
    forecast_origin_date: Optional[str] = None
    generated_at: Optional[str] = None
    parent_district_id: Optional[int] = None
    parent_district_name: Optional[str] = None
    is_derived_from_parent: bool = False
    notes: Optional[str] = None


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
    score_type: str = "FORECAST"
    methodology_version: str
    active_forecast_model: str
    active_forecast_version: str
    forecast_origin_date: Optional[str] = None


class RiskModelInfoResponse(BaseModel):
    methodology_version: str
    formula: str
    factors: List[Dict[str, Any]]
    normalization: str
    risk_bands: Dict[str, str]
    active_model_name: str
    active_model_version: str


class RiskCalculateRequest(BaseModel):
    assessment_date: str = Field(..., description="Target assessment date (YYYY-MM-DD), e.g. '2026-11-01' or '2025-12-01'")
    score_type: Optional[str] = Field(None, description="Score type: 'HISTORICAL' or 'FORECAST'. Inferred if omitted.")
    calculation_version: str = Field("risk-v2.0", description="Risk scoring methodology version ('risk-v2.0' or 'risk-v1.0')")


class RiskCalculateResponse(BaseModel):
    status: str
    assessment_period: str
    period_year: int
    period_month: int
    score_type: str
    districts_assessed: int
    calculation_version: str
    model_version: Optional[str] = None
    model_name: Optional[str] = None
    forecast_origin_date: Optional[str] = None


class RiskTrendPoint(BaseModel):
    period: str
    period_year: int
    period_month: int
    score_type: str
    mean_risk_score: float
    critical_districts_count: int
    high_risk_districts_count: int
    calculation_version: str


class RiskTrendsResponse(BaseModel):
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    trends: List[RiskTrendPoint]
