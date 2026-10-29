"""
Phase 8D: Production Crime Predictions API Endpoints.

Protected routes providing access to machine learning forecasting models and
district-level monthly volume forecasts. Requires authenticated staff JWT.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user, require_admin, require_analyst
from backend.app.models.auth import User
from backend.app.schemas.predictions import (
    PredictionOverviewResponse,
    PredictionItemResponse,
    DistrictPredictionSeriesResponse,
    DistrictMonthPredictionResponse,
    ModelInfoResponse,
    ModelListItemResponse,
    EvaluationComparisonResponse,
    ActualVsPredictedResponse,
    TrainTriggerRequest,
    TrainTriggerResponse,
    GenerateTriggerRequest,
    GenerateTriggerResponse,
    PredictionBreakdownResponse,
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
    "/models",
    response_model=StandardListResponse[ModelListItemResponse],
    summary="List Registered ML Models",
    description="Retrieve all registered machine learning models and their evaluation metrics from the registry.",
)
def list_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[ModelListItemResponse]:
    return PredictionService.list_models(db)


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
    "/evaluation",
    response_model=EvaluationComparisonResponse,
    summary="Get Candidate Model Evaluation Comparison",
    description="Retrieve out-of-sample evaluation comparisons across Seasonal Naïve, MA-3, Poisson, Random Forest, and HGBR.",
)
def get_model_evaluation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EvaluationComparisonResponse:
    return PredictionService.get_evaluation_report(db)


@router.get(
    "/actual-vs-predicted",
    response_model=ActualVsPredictedResponse,
    summary="Get Actual vs Predicted Caseload Timeline",
    description="Retrieve paired historical actual incidents and model predictions for 2024–2026, optionally filtered by district.",
)
def get_actual_vs_predicted(
    district_id: Optional[int] = Query(None, description="Optional District ID filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActualVsPredictedResponse:
    return PredictionService.get_actual_vs_predicted(db, district_id=district_id)


@router.get(
    "/monthly",
    response_model=StandardListResponse[PredictionItemResponse],
    summary="List Monthly Predictions",
    description="Retrieve paginated monthly crime predictions with optional state, district, period, status, and model version filters.",
)
def get_monthly_predictions(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    forecast_period: Optional[str] = Query(None, description="Filter by forecast period date (YYYY-MM-DD)"),
    forecast_status: Optional[str] = Query(None, description="Filter by forecast status (HISTORICAL_EVALUATION, PAST_FORECAST, CURRENT_FUTURE_FORECAST)"),
    is_latest: Optional[bool] = Query(None, description="Filter by latest forecast run flag"),
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
        forecast_status=forecast_status,
        is_latest=is_latest,
        model_version=model_version,
        skip=skip,
        limit=limit,
    )


@router.get(
    "",
    response_model=StandardListResponse[PredictionItemResponse],
    summary="List Crime Volume Predictions (Root Endpoint)",
    description="Retrieve paginated monthly crime predictions with optional state, district, period, status, and model version filters.",
)
def list_predictions(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    forecast_period: Optional[str] = Query(None, description="Filter by forecast period date (YYYY-MM-DD)"),
    forecast_status: Optional[str] = Query(None, description="Filter by forecast status (HISTORICAL_EVALUATION, PAST_FORECAST, CURRENT_FUTURE_FORECAST)"),
    is_latest: Optional[bool] = Query(None, description="Filter by latest forecast run flag"),
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
        forecast_status=forecast_status,
        is_latest=is_latest,
        model_version=model_version,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/train",
    response_model=TrainTriggerResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger Model Refitting (Admin Only)",
    description="Triggers training and refitting of the production ML forecasting model. Requires ADMIN role.",
)
def trigger_training(
    body: Optional[TrainTriggerRequest] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TrainTriggerResponse:
    refit = body.refit_production if body else True
    return PredictionService.trigger_train(db, refit_production=refit)


@router.post(
    "/generate",
    response_model=GenerateTriggerResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Future Operational Predictions (Admin / Analyst)",
    description="Generates future multi-step forecasts for the next 1–6 months and persists them in the database. Requires ADMIN or ANALYST role.",
)
def trigger_generation(
    body: Optional[GenerateTriggerRequest] = None,
    current_user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> GenerateTriggerResponse:
    forward_months = body.forward_months if body else 3
    forecast_origin_date = body.forecast_origin_date if body and body.forecast_origin_date else "2026-10-01"
    calibrate_intervals = body.calibrate_intervals if body is not None else True
    include_2025 = body.include_2025 if body else True
    return PredictionService.trigger_generate(
        db,
        forward_months=forward_months,
        forecast_origin_date=forecast_origin_date,
        calibrate_intervals=calibrate_intervals,
        include_2025=include_2025,
    )


@router.get(
    "/district-month",
    response_model=DistrictMonthPredictionResponse,
    summary="Get District-Specific Monthly Crime Prediction and Level",
    description="Retrieve the predicted crime count or historical actuals and estimated crime level for a selected district, year, and month.",
)
def get_district_month_prediction(
    district_id: int = Query(..., ge=1, description="Unique ID of the district"),
    year: int = Query(..., ge=2000, le=2100, description="Calendar year"),
    month: int = Query(..., ge=1, le=12, description="Calendar month (1 to 12)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictMonthPredictionResponse:
    return PredictionService.get_district_month_prediction(
        db, district_id=district_id, year=year, month=month
    )


@router.get(
    "/breakdown",
    response_model=PredictionBreakdownResponse,
    summary="Get Category-Wise and Crime-Type-Wise Forecast Breakdown",
    description="Retrieve two-level hierarchical compositional forecast breakdown across all 4 categories and all 21 crime types for a selected district and period.",
)
def get_prediction_breakdown(
    district_id: int = Query(..., ge=1, description="Unique ID of the district"),
    year: int = Query(..., ge=2000, le=2100, description="Calendar year"),
    month: int = Query(..., ge=1, le=12, description="Calendar month (1 to 12)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictionBreakdownResponse:
    return PredictionService.get_prediction_breakdown(
        db, district_id=district_id, year=year, month=month
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
