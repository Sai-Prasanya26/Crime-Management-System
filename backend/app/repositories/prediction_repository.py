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

    @staticmethod
    def list_models(db: Session) -> List[MLModel]:
        """Returns all registered models in the model registry."""
        return db.query(MLModel).order_by(desc(MLModel.id)).all()

    @staticmethod
    def get_actual_vs_predicted(
        db: Session,
        district_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves paired monthly actual vs predicted counts for out-of-sample evaluation (2025)
        and forward operational periods (2026).
        """
        active_model = PredictionRepository.get_active_model(db)
        model_id = active_model.id if active_model else 1

        # 1. Fetch actual incident totals by month for 2024-2025
        actual_query = """
            SELECT 
                DATE_FORMAT(incident_date, '%%Y-%%m-01') AS period,
                COUNT(*) AS actual_count
            FROM crime_incidents
            WHERE incident_date >= '2024-01-01'
        """
        params: Dict[str, Any] = {"mid": model_id}
        if district_id:
            actual_query += " AND district_id = :did"
            params["did"] = district_id
        actual_query += " GROUP BY period ORDER BY period ASC"

        actual_rows = db.execute(text(actual_query), params).fetchall()
        actual_map = {str(r[0]): float(r[1]) for r in actual_rows}

        # 2. Fetch predicted counts for active model
        pred_query = """
            SELECT 
                DATE_FORMAT(prediction_date, '%%Y-%%m-01') AS period,
                SUM(predicted_crime_count) AS pred_count
            FROM crime_predictions
            WHERE model_id = :mid
        """
        if district_id:
            pred_query += " AND district_id = :did"
        pred_query += " GROUP BY period ORDER BY period ASC"

        pred_rows = db.execute(text(pred_query), params).fetchall()
        pred_map = {str(r[0]): round(float(r[1]), 2) for r in pred_rows}

        all_periods = sorted(list(set(list(actual_map.keys()) + list(pred_map.keys()))))
        points = []
        abs_errors = []
        sq_errors = []
        sum_actual = 0.0

        for p in all_periods:
            act = actual_map.get(p)
            pred = pred_map.get(p)
            err = None
            if act is not None and pred is not None:
                err = round(float(abs(act - pred)), 2)
                abs_errors.append(err)
                sq_errors.append((act - pred) ** 2)
                sum_actual += act

            points.append({
                "period": p,
                "actual_count": act,
                "predicted_count": pred,
                "error": err,
            })

        overall_mae = round(float(sum(abs_errors) / len(abs_errors)), 4) if abs_errors else None
        overall_rmse = round(float((sum(sq_errors) / len(sq_errors)) ** 0.5), 4) if sq_errors else None
        overall_wape = round(float(sum(abs_errors) / sum_actual * 100), 2) if sum_actual > 0 else None

        district_info = None
        if district_id:
            d = (
                db.query(District.district_name, State.state_name)
                .join(State, District.state_id == State.id)
                .filter(District.id == district_id)
                .first()
            )
            if d:
                district_info = {"district_name": d.district_name, "state_name": d.state_name}

        return {
            "district_id": district_id,
            "district_name": district_info["district_name"] if district_info else "All 640 Districts (Aggregated)",
            "state_name": district_info["state_name"] if district_info else "National Aggregate",
            "comparison_points": points,
            "overall_mae": overall_mae,
            "overall_rmse": overall_rmse,
            "overall_wape": overall_wape,
        }
