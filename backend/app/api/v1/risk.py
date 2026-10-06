"""
Phase 9B: Crime Risk Assessment API Endpoints.

Protected routes providing access to explainable district risk assessments,
methodology metadata, and longitudinal risk factors under risk-v1.0.
Requires authenticated staff JWT.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.risk import (
    RiskOverviewResponse,
    RiskItemResponse,
    DistrictRiskDetailResponse,
    RiskModelInfoResponse,
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
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskOverviewResponse:
    return RiskService.get_overview(
        db,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
    )


@router.get(
    "/model",
    response_model=RiskModelInfoResponse,
    summary="Get Risk Assessment Methodology & Factor Weights",
    description="Retrieve frozen risk-v1.0 methodology details, component factor weights, normalization properties, and linked forecasting model information.",
)
def get_risk_model_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskModelInfoResponse:
    return RiskService.get_risk_methodology_info(db)


@router.get(
    "",
    response_model=StandardListResponse[RiskItemResponse],
    summary="List District Risk Scores",
    description="Retrieve paginated district risk scores with optional geographic, severity band, and temporal filters.",
)
def list_risk_scores(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk band (LOW, MODERATE, HIGH, CRITICAL)"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
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
        assessment_period=assessment_period,
        calculation_version=calculation_version,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{district_id}",
    response_model=DistrictRiskDetailResponse,
    summary="Get District Risk Assessment Details & Explainability",
    description="Retrieve the complete explainable risk assessment profile for a specific district, including factor percentiles, raw values, weighted contributions, and the primary risk driver.",
)
def get_district_risk_detail(
    district_id: int = Path(..., ge=1, description="Unique ID of the historical district"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Risk scoring methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictRiskDetailResponse:
    return RiskService.get_district_risk_detail(
        db,
        district_id=district_id,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
    )
