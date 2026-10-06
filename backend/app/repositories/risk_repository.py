"""
Phase 9B: Risk Assessment Repository.

Provides data access for demographic baselines, historical incidents,
production forecasts, and risk score persistence.
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc, asc
import json

from backend.app.models.intelligence import CrimeRiskScore
from backend.app.models.ml import MLModel, CrimePrediction
from backend.app.models.geography import District, State
from backend.app.models.crime import CrimeIncident, CrimeType, CrimeCategory


class RiskRepository:
    @staticmethod
    def get_active_forecasting_model(db: Session) -> Optional[MLModel]:
        """Returns the currently active production ML forecasting model."""
        return (
            db.query(MLModel)
            .filter(MLModel.is_active == True, MLModel.model_type == "FORECASTING")
            .order_by(MLModel.id.desc())
            .first()
        )

    @staticmethod
    def get_census_demographics(db: Session, census_year: int = 2011) -> List[Dict[str, Any]]:
        """Retrieves official Census 2011 demographic baselines for all historical districts."""
        sql = text("""
            SELECT d.id AS district_id,
                   d.district_name,
                   d.state_id,
                   s.state_name,
                   dd.total_population
            FROM districts d
            JOIN states s ON d.state_id = s.id
            JOIN district_demographics dd ON d.id = dd.district_id
            WHERE dd.census_year = :cy
            ORDER BY d.id
        """)
        rows = db.execute(sql, {"cy": census_year}).fetchall()
        return [
            {
                "district_id": r[0],
                "district_name": r[1],
                "state_id": r[2],
                "state_name": r[3],
                "total_population": int(r[4]),
            }
            for r in rows
        ]

    @staticmethod
    def get_historical_volume(db: Session, start_date: str, end_date: str) -> Dict[int, int]:
        """Calculates historical incident volume per district within the specified date range."""
        sql = text("""
            SELECT district_id, COUNT(*) AS vol
            FROM crime_incidents
            WHERE incident_date >= :start_date AND incident_date <= :end_date
            GROUP BY district_id
        """)
        rows = db.execute(sql, {"start_date": start_date, "end_date": end_date}).fetchall()
        return {r[0]: int(r[1]) for r in rows}

    @staticmethod
    def get_period_trends(
        db: Session,
        recent_start: str,
        recent_end: str,
        prior_start: str,
        prior_end: str,
    ) -> Tuple[Dict[int, int], Dict[int, int]]:
        """Calculates incident volumes for recent and prior 3-month windows."""
        recent_sql = text("""
            SELECT district_id, COUNT(*) AS vol
            FROM crime_incidents
            WHERE incident_date >= :start_date AND incident_date <= :end_date
            GROUP BY district_id
        """)
        recent_rows = db.execute(recent_sql, {"start_date": recent_start, "end_date": recent_end}).fetchall()
        recents = {r[0]: int(r[1]) for r in recent_rows}

        prior_sql = text("""
            SELECT district_id, COUNT(*) AS vol
            FROM crime_incidents
            WHERE incident_date >= :start_date AND incident_date <= :end_date
            GROUP BY district_id
        """)
        prior_rows = db.execute(prior_sql, {"start_date": prior_start, "end_date": prior_end}).fetchall()
        priors = {r[0]: int(r[1]) for r in prior_rows}

        return recents, priors

    @staticmethod
    def get_forecasts(db: Session, model_id: int, forecast_period: str) -> Dict[int, float]:
        """Retrieves production model forecasts for the target period."""
        sql = text("""
            SELECT district_id, predicted_crime_count
            FROM crime_predictions
            WHERE model_id = :mid AND prediction_date = :f_period
        """)
        rows = db.execute(sql, {"mid": model_id, "f_period": forecast_period}).fetchall()
        return {r[0]: float(r[1]) for r in rows}

    @staticmethod
    def get_severity_weights(db: Session, start_date: str, end_date: str) -> Dict[int, float]:
        """Computes average incident severity weight per district for the auxiliary audit index."""
        sql = text("""
            SELECT ci.district_id,
                   SUM(CASE WHEN cc.category_name = 'Violent Crime' THEN 1.5
                            WHEN cc.category_name = 'Fire Accident' THEN 1.2
                            WHEN cc.category_name = 'Traffic Fatality' THEN 1.1
                            ELSE 1.0 END) AS total_sev_weight,
                   COUNT(*) AS total_incidents
            FROM crime_incidents ci
            JOIN crime_types ct ON ci.crime_type_id = ct.id
            JOIN crime_categories cc ON ct.category_id = cc.id
            WHERE ci.incident_date >= :start_date AND ci.incident_date <= :end_date
            GROUP BY ci.district_id
        """)
        rows = db.execute(sql, {"start_date": start_date, "end_date": end_date}).fetchall()
        return {r[0]: float(r[1]) / float(r[2]) for r in rows if r[2] > 0}

    @staticmethod
    def save_risk_scores(db: Session, records: List[Dict[str, Any]]) -> int:
        """
        Idempotently persists risk scores into crime_risk_scores table.
        Updates existing records if matching (district_id, period_year, period_month, calculation_version).
        """
        if not records:
            return 0

        upsert_sql = text("""
            INSERT INTO crime_risk_scores (
                district_id,
                period_year,
                period_month,
                overall_risk_score,
                risk_level,
                severity_index,
                trend_index,
                volume_index,
                forecast_index,
                rate_index,
                model_id,
                model_version,
                factor_contributions,
                strongest_driver,
                population_density_factor,
                calculation_version,
                generated_at
            ) VALUES (
                :district_id,
                :period_year,
                :period_month,
                :overall_risk_score,
                :risk_level,
                :severity_index,
                :trend_index,
                :volume_index,
                :forecast_index,
                :rate_index,
                :model_id,
                :model_version,
                :factor_contributions,
                :strongest_driver,
                :population_density_factor,
                :calculation_version,
                NOW()
            ) ON DUPLICATE KEY UPDATE
                overall_risk_score = VALUES(overall_risk_score),
                risk_level = VALUES(risk_level),
                severity_index = VALUES(severity_index),
                trend_index = VALUES(trend_index),
                volume_index = VALUES(volume_index),
                forecast_index = VALUES(forecast_index),
                rate_index = VALUES(rate_index),
                model_id = VALUES(model_id),
                model_version = VALUES(model_version),
                factor_contributions = VALUES(factor_contributions),
                strongest_driver = VALUES(strongest_driver),
                population_density_factor = VALUES(population_density_factor),
                generated_at = NOW()
        """)

        for rec in records:
            params = dict(rec)
            if isinstance(params.get("factor_contributions"), dict):
                params["factor_contributions"] = json.dumps(params["factor_contributions"])
            db.execute(upsert_sql, params)

        db.commit()
        return len(records)

    @staticmethod
    def get_overview(
        db: Session,
        period_year: int = 2026,
        period_month: int = 1,
        calculation_version: str = "risk-v1.0",
    ) -> Dict[str, Any]:
        """Computes summary statistics and risk distribution across all assessed districts."""
        scores_query = (
            db.query(CrimeRiskScore)
            .filter(
                CrimeRiskScore.period_year == period_year,
                CrimeRiskScore.period_month == period_month,
                CrimeRiskScore.calculation_version == calculation_version,
            )
            .all()
        )

        total = len(scores_query)
        if total == 0:
            return {
                "total_assessed_districts": 0,
                "mean_risk_score": 0.0,
                "median_risk_score": 0.0,
                "highest_risk_score": 0.0,
                "lowest_risk_score": 0.0,
                "risk_level_distribution": {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0},
                "risk_level_percentages": {"LOW": 0.0, "MODERATE": 0.0, "HIGH": 0.0, "CRITICAL": 0.0},
                "top_risk_districts": [],
                "assessment_period": f"{period_year:04d}-{period_month:02d}-01",
                "methodology_version": calculation_version,
                "active_forecast_model": "None",
                "active_forecast_version": "None",
            }

        scores_list = [float(s.overall_risk_score) for s in scores_query]
        scores_list.sort()

        mean_score = sum(scores_list) / total
        median_score = (
            scores_list[total // 2]
            if total % 2 != 0
            else (scores_list[total // 2 - 1] + scores_list[total // 2]) / 2.0
        )
        highest_score = scores_list[-1]
        lowest_score = scores_list[0]

        dist_counts = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
        for s in scores_query:
            dist_counts[s.risk_level] = dist_counts.get(s.risk_level, 0) + 1

        dist_pcts = {k: round((v / total) * 100.0, 2) for k, v in dist_counts.items()}

        # Top 10 districts by risk score
        top_query = text("""
            SELECT r.id,
                   r.district_id,
                   d.district_name,
                   d.state_id,
                   s.state_name,
                   r.period_year,
                   r.period_month,
                   r.overall_risk_score,
                   r.risk_level,
                   r.severity_index,
                   r.trend_index,
                   r.volume_index,
                   r.forecast_index,
                   r.rate_index,
                   r.population_density_factor,
                   r.calculation_version,
                   r.model_version,
                   r.strongest_driver,
                   r.factor_contributions,
                   r.generated_at
            FROM crime_risk_scores r
            JOIN districts d ON r.district_id = d.id
            JOIN states s ON d.state_id = s.id
            WHERE r.period_year = :py
              AND r.period_month = :pm
              AND r.calculation_version = :ver
            ORDER BY r.overall_risk_score DESC, d.district_name ASC
            LIMIT 10
        """)
        top_rows = db.execute(
            top_query,
            {"py": period_year, "pm": period_month, "ver": calculation_version},
        ).fetchall()

        top_districts = []
        for r in top_rows:
            f_contrib = r[18]
            if isinstance(f_contrib, str):
                try:
                    f_contrib = json.loads(f_contrib)
                except Exception:
                    pass
            top_districts.append({
                "id": r[0],
                "district_id": r[1],
                "district_name": r[2],
                "state_id": r[3],
                "state_name": r[4],
                "period_year": r[5],
                "period_month": r[6],
                "assessment_period": f"{r[5]:04d}-{r[6]:02d}-01",
                "overall_risk_score": float(r[7]),
                "risk_level": r[8],
                "severity_index": float(r[9]),
                "trend_index": float(r[10]),
                "volume_index": float(r[11]),
                "forecast_index": float(r[12]) if r[12] is not None else None,
                "rate_index": float(r[13]) if r[13] is not None else None,
                "population_density_factor": float(r[14]),
                "calculation_version": r[15],
                "model_version": r[16],
                "strongest_driver": r[17],
                "factor_contributions": f_contrib,
                "generated_at": r[19].isoformat() if r[19] else None,
            })

        active_model = RiskRepository.get_active_forecasting_model(db)

        return {
            "total_assessed_districts": total,
            "mean_risk_score": round(mean_score, 2),
            "median_risk_score": round(median_score, 2),
            "highest_risk_score": round(highest_score, 2),
            "lowest_risk_score": round(lowest_score, 2),
            "risk_level_distribution": dist_counts,
            "risk_level_percentages": dist_pcts,
            "top_risk_districts": top_districts,
            "assessment_period": f"{period_year:04d}-{period_month:02d}-01",
            "methodology_version": calculation_version,
            "active_forecast_model": active_model.model_name if active_model else "N/A",
            "active_forecast_version": active_model.version if active_model else "N/A",
        }

    @staticmethod
    def list_risk_scores(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        risk_level: Optional[str] = None,
        period_year: int = 2026,
        period_month: int = 1,
        calculation_version: str = "risk-v1.0",
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists paginated risk score records with filtering."""
        where_clauses = [
            "r.period_year = :py",
            "r.period_month = :pm",
            "r.calculation_version = :ver",
        ]
        params: Dict[str, Any] = {
            "py": period_year,
            "pm": period_month,
            "ver": calculation_version,
        }

        if state_id is not None:
            where_clauses.append("d.state_id = :sid")
            params["sid"] = state_id

        if district_id is not None:
            where_clauses.append("r.district_id = :did")
            params["did"] = district_id

        if risk_level is not None:
            where_clauses.append("r.risk_level = :rl")
            params["rl"] = risk_level.upper()

        where_str = " AND ".join(where_clauses)

        count_sql = text(f"""
            SELECT COUNT(*)
            FROM crime_risk_scores r
            JOIN districts d ON r.district_id = d.id
            WHERE {where_str}
        """)
        total = db.execute(count_sql, params).scalar() or 0

        params["skip"] = skip
        params["limit"] = limit

        query_sql = text(f"""
            SELECT r.id,
                   r.district_id,
                   d.district_name,
                   d.state_id,
                   s.state_name,
                   r.period_year,
                   r.period_month,
                   r.overall_risk_score,
                   r.risk_level,
                   r.severity_index,
                   r.trend_index,
                   r.volume_index,
                   r.forecast_index,
                   r.rate_index,
                   r.population_density_factor,
                   r.calculation_version,
                   r.model_version,
                   r.strongest_driver,
                   r.factor_contributions,
                   r.generated_at
            FROM crime_risk_scores r
            JOIN districts d ON r.district_id = d.id
            JOIN states s ON d.state_id = s.id
            WHERE {where_str}
            ORDER BY r.overall_risk_score DESC, d.district_name ASC
            LIMIT :limit OFFSET :skip
        """)

        rows = db.execute(query_sql, params).fetchall()
        items = []
        for r in rows:
            f_contrib = r[18]
            if isinstance(f_contrib, str):
                try:
                    f_contrib = json.loads(f_contrib)
                except Exception:
                    pass
            items.append({
                "id": r[0],
                "district_id": r[1],
                "district_name": r[2],
                "state_id": r[3],
                "state_name": r[4],
                "period_year": r[5],
                "period_month": r[6],
                "assessment_period": f"{r[5]:04d}-{r[6]:02d}-01",
                "overall_risk_score": float(r[7]),
                "risk_level": r[8],
                "severity_index": float(r[9]),
                "trend_index": float(r[10]),
                "volume_index": float(r[11]),
                "forecast_index": float(r[12]) if r[12] is not None else None,
                "rate_index": float(r[13]) if r[13] is not None else None,
                "population_density_factor": float(r[14]),
                "calculation_version": r[15],
                "model_version": r[16],
                "strongest_driver": r[17],
                "factor_contributions": f_contrib,
                "generated_at": r[19].isoformat() if r[19] else None,
            })

        return items, total

    @staticmethod
    def get_district_risk(
        db: Session,
        district_id: int,
        period_year: int = 2026,
        period_month: int = 1,
        calculation_version: str = "risk-v1.0",
    ) -> Optional[Dict[str, Any]]:
        """Retrieves complete explainable risk assessment profile for a specific district."""
        sql = text("""
            SELECT r.id,
                   r.district_id,
                   d.district_name,
                   d.state_id,
                   s.state_name,
                   dd.total_population,
                   r.period_year,
                   r.period_month,
                   r.overall_risk_score,
                   r.risk_level,
                   r.severity_index,
                   r.trend_index,
                   r.volume_index,
                   r.forecast_index,
                   r.rate_index,
                   r.population_density_factor,
                   r.calculation_version,
                   r.model_version,
                   m.model_name,
                   r.strongest_driver,
                   r.factor_contributions,
                   r.generated_at
            FROM crime_risk_scores r
            JOIN districts d ON r.district_id = d.id
            JOIN states s ON d.state_id = s.id
            LEFT JOIN district_demographics dd ON d.id = dd.district_id AND dd.census_year = 2011
            LEFT JOIN ml_models m ON r.model_id = m.id
            WHERE r.district_id = :did
              AND r.period_year = :py
              AND r.period_month = :pm
              AND r.calculation_version = :ver
        """)
        row = db.execute(
            sql,
            {"did": district_id, "py": period_year, "pm": period_month, "ver": calculation_version},
        ).fetchone()

        if not row:
            return None

        f_contrib = row[20]
        if isinstance(f_contrib, str):
            try:
                f_contrib = json.loads(f_contrib)
            except Exception:
                pass

        # Extract raw values from factor_contributions if present
        raw_vol = f_contrib.get("historical_volume", {}).get("raw", 0) if f_contrib else 0
        raw_fc = f_contrib.get("forecast_volume", {}).get("raw", 0.0) if f_contrib else 0.0
        raw_rate = f_contrib.get("crime_rate_per_100k", {}).get("raw", 0.0) if f_contrib else 0.0
        raw_trend = f_contrib.get("trend_ratio", {}).get("raw", 0.0) if f_contrib else 0.0

        percentiles = {
            "forecast_volume": float(row[13]) if row[13] is not None else 0.0,
            "historical_volume": float(row[12]),
            "crime_rate_per_100k": float(row[14]) if row[14] is not None else float(row[15]),
            "trend_ratio": float(row[11]),
        }

        return {
            "district_id": row[1],
            "district_name": row[2],
            "state_id": row[3],
            "state_name": row[4],
            "census_2011_population": int(row[5]) if row[5] else 0,
            "period_year": row[6],
            "period_month": row[7],
            "assessment_period": f"{row[6]:04d}-{row[7]:02d}-01",
            "overall_risk_score": float(row[8]),
            "risk_level": row[9],
            "severity_index": float(row[10]),
            "historical_volume": int(raw_vol),
            "forecast_volume": float(raw_fc),
            "crime_rate_per_100k": float(raw_rate),
            "trend_ratio": float(raw_trend),
            "factor_percentiles": percentiles,
            "factor_contributions": f_contrib,
            "strongest_driver": row[19] or "N/A",
            "calculation_version": row[16],
            "model_version": row[17] or "N/A",
            "model_name": row[18] or "N/A",
            "generated_at": row[21].isoformat() if row[21] else None,
        }
