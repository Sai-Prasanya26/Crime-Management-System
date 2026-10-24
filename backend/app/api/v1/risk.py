"""
Phase 9: Explainable Crime Risk Assessment API Endpoints.

Protected routes providing access to explainable district risk assessments,
methodology metadata, longitudinal risk trends, and authorized score calculations.
Requires authenticated staff JWT.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user, require_analyst
from backend.app.models.auth import User
from backend.app.schemas.risk import (
    RiskOverviewResponse,
    RiskItemResponse,
    DistrictRiskDetailResponse,
    RiskModelInfoResponse,
    RiskCalculateRequest,
    RiskCalculateResponse,
    RiskTrendsResponse,
)
from backend.app.schemas.common import StandardListResponse
from backend.app.services.risk_service import RiskService, CALCULATION_VERSION

router = APIRouter()


@router.get(
    "/overview",
    response_model=RiskOverviewResponse,
    summary="Get Risk Assessment Overview",
    description="Retrieve high-level risk landscape across all assessed districts including mean score, risk level distribution, and top critical districts.",
)
def get_risk_overview(
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    year: Optional[int] = Query(None, description="Assessment year (e.g. 2026)"),
    month: Optional[int] = Query(None, description="Assessment month (1-12)"),
    score_type: Optional[str] = Query(None, description="Score type: 'HISTORICAL' or 'FORECAST'"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskOverviewResponse:
    return RiskService.get_overview(
        db,
        assessment_period=assessment_period,
        year=year,
        month=month,
        score_type=score_type,
        calculation_version=calculation_version,
    )


@router.get(
    "/model",
    response_model=RiskModelInfoResponse,
    summary="Get Risk Assessment Methodology & Factor Weights",
    description="Retrieve explainable risk scoring methodology details, component factor weights, normalization properties, and linked forecasting model information.",
)
def get_risk_model_info(
    version: str = Query(CALCULATION_VERSION, description="Methodology version ('risk-v2.0' or 'risk-v1.0')"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskModelInfoResponse:
    return RiskService.get_risk_methodology_info(db, version=version)


@router.get(
    "/trends",
    response_model=RiskTrendsResponse,
    summary="Get Multi-Period Risk Trends",
    description="Retrieve longitudinal risk score trajectory across historical and forecast assessed periods.",
)
def get_risk_trends(
    district_id: Optional[int] = Query(None, description="Filter by historical district ID"),
    state_id: Optional[int] = Query(None, description="Filter by state ID"),
    limit_periods: int = Query(12, ge=1, le=60, description="Maximum historical/forecast periods"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskTrendsResponse:
    return RiskService.get_risk_trends(
        db,
        district_id=district_id,
        state_id=state_id,
        limit_periods=limit_periods,
    )


@router.get(
    "/districts",
    response_model=StandardListResponse[RiskItemResponse],
    summary="List District Risk Scores (Districts Path)",
    description="Retrieve paginated district risk scores with optional geographic, severity band, temporal, and score_type filters.",
)
def list_risk_scores_districts(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk band (LOW, MODERATE, HIGH, CRITICAL)"),
    score_type: Optional[str] = Query(None, description="Filter by score type ('HISTORICAL' or 'FORECAST')"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    year: Optional[int] = Query(None, description="Assessment year"),
    month: Optional[int] = Query(None, description="Assessment month"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[RiskItemResponse]:
    return RiskService.list_risk_scores(
        db,
        state_id=state_id,
        district_id=district_id,
        risk_level=risk_level,
        score_type=score_type,
        assessment_period=assessment_period,
        year=year,
        month=month,
        calculation_version=calculation_version,
        skip=skip,
        limit=limit,
    )


@router.get(
    "",
    response_model=StandardListResponse[RiskItemResponse],
    summary="List District Risk Scores (Root Path)",
    description="Retrieve paginated district risk scores (alias of /districts for backward compatibility).",
)
def list_risk_scores_root(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk band (LOW, MODERATE, HIGH, CRITICAL)"),
    score_type: Optional[str] = Query(None, description="Filter by score type ('HISTORICAL' or 'FORECAST')"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    year: Optional[int] = Query(None, description="Assessment year"),
    month: Optional[int] = Query(None, description="Assessment month"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[RiskItemResponse]:
    return RiskService.list_risk_scores(
        db,
        state_id=state_id,
        district_id=district_id,
        risk_level=risk_level,
        score_type=score_type,
        assessment_period=assessment_period,
        year=year,
        month=month,
        calculation_version=calculation_version,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/calculate",
    response_model=RiskCalculateResponse,
    summary="Calculate and Persist Risk Scores (Admin/Analyst)",
    description="Calculate risk scores across all 640 districts for a specified period and persist idempotently inside a database transaction.",
)
def calculate_risk_scores(
    payload: RiskCalculateRequest,
    current_user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> RiskCalculateResponse:
    res = RiskService.run_risk_assessment(
        db,
        assessment_date=payload.assessment_date,
        score_type=payload.score_type,
        calculation_version=payload.calculation_version,
    )
    return RiskCalculateResponse(**res)


@router.get(
    "/districts/{district_id}",
    response_model=DistrictRiskDetailResponse,
    summary="Get District Risk Assessment Details & Explainability",
    description="Retrieve the complete explainable risk assessment profile for a specific district.",
)
def get_district_risk_detail_nested(
    district_id: int = Path(..., ge=1, description="Unique ID of the historical district"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    year: Optional[int] = Query(None, description="Assessment year"),
    month: Optional[int] = Query(None, description="Assessment month"),
    score_type: Optional[str] = Query(None, description="Score type: 'HISTORICAL' or 'FORECAST'"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictRiskDetailResponse:
    return RiskService.get_district_risk_detail(
        db,
        district_id=district_id,
        assessment_period=assessment_period,
        year=year,
        month=month,
        score_type=score_type,
        calculation_version=calculation_version,
    )


@router.get(
    "/{district_id}",
    response_model=DistrictRiskDetailResponse,
    summary="Get District Risk Assessment Details (Alias)",
    description="Retrieve the complete explainable risk assessment profile for a specific district (alias for backward compatibility).",
)
def get_district_risk_detail_root(
    district_id: int = Path(..., ge=1, description="Unique ID of the historical district"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    year: Optional[int] = Query(None, description="Assessment year"),
    month: Optional[int] = Query(None, description="Assessment month"),
    score_type: Optional[str] = Query(None, description="Score type: 'HISTORICAL' or 'FORECAST'"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictRiskDetailResponse:
    return RiskService.get_district_risk_detail(
        db,
        district_id=district_id,
        assessment_period=assessment_period,
        year=year,
        month=month,
        score_type=score_type,
        calculation_version=calculation_version,
    )
