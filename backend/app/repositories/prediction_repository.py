"""
Phase 8D: Prediction Repository.

Provides database query operations for ML models and model-generated crime predictions.
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc, asc
from datetime import date

from backend.app.models.ml import MLModel, CrimePrediction
from backend.app.models.geography import District, State


class PredictionRepository:
    @staticmethod
    def get_active_model(db: Session) -> Optional[MLModel]:
        """Returns the currently active production ML model."""
        return db.query(MLModel).filter(MLModel.is_active == True).order_by(MLModel.id.desc()).first()

    @staticmethod
    def get_overview(db: Session) -> Dict[str, Any]:
        """Computes high-level overview metrics across all generated predictions."""
        active_model = PredictionRepository.get_active_model(db)
        if not active_model:
            return {
                "total_predictions": 0,
                "districts_covered": 0,
                "earliest_period": "N/A",
                "latest_period": "N/A",
                "periods_count": 0,
                "active_model_name": "None",
                "active_model_version": "None",
                "algorithm": "None",
                "top_predicted_districts": [],
            }

        stats = db.query(
            func.count(CrimePrediction.id).label("total_preds"),
            func.count(func.distinct(CrimePrediction.district_id)).label("districts_count"),
            func.min(CrimePrediction.prediction_date).label("min_date"),
            func.max(CrimePrediction.prediction_date).label("max_date"),
            func.count(func.distinct(CrimePrediction.prediction_date)).label("periods_count"),
        ).filter(CrimePrediction.model_id == active_model.id).first()

        latest_date = stats.max_date

        # Top 5 districts forecasted for the latest period
        top_query = (
            db.query(
                CrimePrediction.id,
                CrimePrediction.district_id,
                District.district_name.label("district_name"),
                State.id.label("state_id"),
                State.state_name.label("state_name"),
                CrimePrediction.prediction_date,
                CrimePrediction.predicted_crime_count,
                MLModel.version.label("model_version"),
                MLModel.model_name,
            )
            .join(District, CrimePrediction.district_id == District.id)
            .join(State, District.state_id == State.id)
            .join(MLModel, CrimePrediction.model_id == MLModel.id)
            .filter(CrimePrediction.model_id == active_model.id)
            .filter(CrimePrediction.prediction_date == latest_date)
            .order_by(desc(CrimePrediction.predicted_crime_count))
            .limit(5)
            .all()
        )

        top_items = [
            {
                "id": r.id,
                "district_id": r.district_id,
                "district_name": r.district_name,
                "state_id": r.state_id,
                "state_name": r.state_name,
                "forecast_period": str(r.prediction_date),
                "predicted_crime_count": float(r.predicted_crime_count),
                "model_version": r.model_version,
                "model_name": r.model_name,
            }
            for r in top_query
        ]

        return {
            "total_predictions": stats.total_preds or 0,
            "districts_covered": stats.districts_count or 0,
            "earliest_period": str(stats.min_date) if stats.min_date else "N/A",
            "latest_period": str(stats.max_date) if stats.max_date else "N/A",
            "periods_count": stats.periods_count or 0,
            "active_model_name": active_model.model_name,
            "active_model_version": active_model.version,
            "algorithm": active_model.algorithm,
            "top_predicted_districts": top_items,
        }

    @staticmethod
    def list_predictions(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        forecast_period: Optional[str] = None,
        model_version: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Queries prediction records with optional filters and pagination."""
        query = (
            db.query(
                CrimePrediction.id,
                CrimePrediction.district_id,
                District.district_name.label("district_name"),
                State.id.label("state_id"),
                State.state_name.label("state_name"),
                CrimePrediction.prediction_date,
                CrimePrediction.predicted_crime_count,
                MLModel.version.label("model_version"),
                MLModel.model_name,
            )
            .join(District, CrimePrediction.district_id == District.id)
            .join(State, District.state_id == State.id)
            .join(MLModel, CrimePrediction.model_id == MLModel.id)
        )

        if state_id is not None:
            query = query.filter(District.state_id == state_id)
        if district_id is not None:
            query = query.filter(CrimePrediction.district_id == district_id)
        if forecast_period is not None:
            query = query.filter(CrimePrediction.prediction_date == forecast_period)
        if model_version is not None:
            query = query.filter(MLModel.version == model_version)

        total = query.count()
        rows = (
            query.order_by(
                desc(CrimePrediction.prediction_date),
                desc(CrimePrediction.predicted_crime_count),
                CrimePrediction.district_id,
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        items = [
            {
                "id": r.id,
                "district_id": r.district_id,
                "district_name": r.district_name,
                "state_id": r.state_id,
                "state_name": r.state_name,
                "forecast_period": str(r.prediction_date),
                "predicted_crime_count": float(r.predicted_crime_count),
                "model_version": r.model_version,
                "model_name": r.model_name,
            }
            for r in rows
        ]

        return items, total

    @staticmethod
    def get_district_series(db: Session, district_id: int) -> Optional[Dict[str, Any]]:
        """Returns the longitudinal forecast series for a specific district."""
        district = (
            db.query(District.id, District.district_name, State.id.label("state_id"), State.state_name)
            .join(State, District.state_id == State.id)
            .filter(District.id == district_id)
            .first()
        )
        if not district:
            return None

        rows = (
            db.query(
                CrimePrediction.id,
                CrimePrediction.district_id,
                CrimePrediction.prediction_date,
                CrimePrediction.predicted_crime_count,
                MLModel.version.label("model_version"),
                MLModel.model_name,
            )
            .join(MLModel, CrimePrediction.model_id == MLModel.id)
            .filter(CrimePrediction.district_id == district_id)
            .order_by(asc(CrimePrediction.prediction_date))
            .all()
        )

        series = [
            {
                "id": r.id,
                "district_id": r.district_id,
                "district_name": district.district_name,
                "state_id": district.state_id,
                "state_name": district.state_name,
                "forecast_period": str(r.prediction_date),
                "predicted_crime_count": float(r.predicted_crime_count),
                "model_version": r.model_version,
                "model_name": r.model_name,
            }
            for r in rows
        ]

        return {
            "district_id": district.id,
            "district_name": district.district_name,
            "state_id": district.state_id,
            "state_name": district.state_name,
            "series": series,
        }
