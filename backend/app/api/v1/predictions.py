"""
Phase 8D: Production Crime Predictions API Endpoints.

Protected routes providing access to machine learning forecasting models and
district-level monthly volume forecasts. Requires authenticated staff JWT.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.predictions import (
    PredictionOverviewResponse,
    PredictionItemResponse,
    DistrictPredictionSeriesResponse,
    ModelInfoResponse,
)
from backend.app.schemas.common import StandardListResponse
from backend.app.services.prediction_service import PredictionService

router = APIRouter()


@router.get(
    "/overview",
    response_model=PredictionOverviewResponse,
    summary="Get Forecasting Pipeline Overview",
    description="Retrieve high-level statistics across all generated forecasts including coverage, period range, and top projected districts.",
)
def get_predictions_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictionOverviewResponse:
    return PredictionService.get_overview(db)


@router.get(
    "/model",
    response_model=ModelInfoResponse,
    summary="Get Active Model Information & Provenance",
    description="Retrieve production model metadata, hyperparameters, training provenance, and verified Phase 8C out-of-sample metrics.",
)
def get_active_model_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ModelInfoResponse:
    return PredictionService.get_active_model_info(db)


@router.get(
    "",
    response_model=StandardListResponse[PredictionItemResponse],
    summary="List Crime Volume Predictions",
    description="Retrieve paginated monthly crime predictions with optional state, district, period, and model version filters.",
)
def list_predictions(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    forecast_period: Optional[str] = Query(None, description="Filter by forecast period date (YYYY-MM-DD)"),
    model_version: Optional[str] = Query(None, description="Filter by model version (e.g. v1.0.0)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[PredictionItemResponse]:
    return PredictionService.list_predictions(
        db,
        state_id=state_id,
        district_id=district_id,
        forecast_period=forecast_period,
        model_version=model_version,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{district_id}",
    response_model=DistrictPredictionSeriesResponse,
    summary="Get District Longitudinal Forecast Series",
    description="Retrieve the complete monthly forecast timeline for a specific district.",
)
def get_district_forecast_series(
    district_id: int = Path(..., ge=1, description="Unique ID of the historical district"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictPredictionSeriesResponse:
    return PredictionService.get_district_series(db, district_id=district_id)
