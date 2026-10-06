"""
Phase 8D: Prediction Service.

Business logic layer orchestrating database access and formatting API schemas for prediction queries.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.repositories.prediction_repository import PredictionRepository
from backend.app.schemas.predictions import (
    PredictionItemResponse,
    PredictionOverviewResponse,
    DistrictPredictionSeriesResponse,
    ModelInfoResponse,
)
from backend.app.schemas.common import StandardListResponse
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS
from ml.inference.model_loader import get_production_metadata


class PredictionService:
    @staticmethod
    def get_overview(db: Session) -> PredictionOverviewResponse:
        """Retrieves high-level summary of crime volume forecasting pipeline."""
        data = PredictionRepository.get_overview(db)
        return PredictionOverviewResponse(
            total_predictions=data["total_predictions"],
            districts_covered=data["districts_covered"],
            earliest_period=data["earliest_period"],
            latest_period=data["latest_period"],
            periods_count=data["periods_count"],
            active_model_name=data["active_model_name"],
            active_model_version=data["active_model_version"],
            algorithm=data["algorithm"],
            top_predicted_districts=[
                PredictionItemResponse(**item) for item in data["top_predicted_districts"]
            ],
        )

    @staticmethod
    def list_predictions(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        forecast_period: Optional[str] = None,
        model_version: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[PredictionItemResponse]:
        """Lists prediction records with optional geographic/temporal filters."""
        items, total = PredictionRepository.list_predictions(
            db,
            state_id=state_id,
            district_id=district_id,
            forecast_period=forecast_period,
            model_version=model_version,
            skip=skip,
            limit=limit,
        )
        return StandardListResponse[PredictionItemResponse](
            total=total,
            items=[PredictionItemResponse(**it) for it in items],
        )

    @staticmethod
    def get_district_series(db: Session, district_id: int) -> DistrictPredictionSeriesResponse:
        """Retrieves complete longitudinal prediction series for a given district."""
        data = PredictionRepository.get_district_series(db, district_id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with ID {district_id} not found.",
            )
        return DistrictPredictionSeriesResponse(
            district_id=data["district_id"],
            district_name=data["district_name"],
            state_id=data["state_id"],
            state_name=data["state_name"],
            series=[PredictionItemResponse(**item) for item in data["series"]],
        )

    @staticmethod
    def get_active_model_info(db: Session) -> ModelInfoResponse:
        """Retrieves metadata, hyperparameters, and verified evaluation metrics of the active model."""
        model = PredictionRepository.get_active_model(db)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active ML model found in registry.",
            )

        # Attempt to enrich with metadata file
        try:
            file_meta = get_production_metadata()
            feature_cols = file_meta.get("feature_columns", FEATURE_COLUMNS)
        except Exception:
            feature_cols = FEATURE_COLUMNS

        return ModelInfoResponse(
            model_id=model.id,
            model_name=model.model_name,
            model_type=model.model_type,
            version=model.version,
            algorithm=model.algorithm,
            is_active=model.is_active,
            training_date=str(model.training_date) if model.training_date else None,
            dataset_snapshot=model.dataset_snapshot,
            artifact_path=model.artifact_path,
            evaluation_metrics=model.evaluation_metrics,
            feature_columns=feature_cols,
        )
