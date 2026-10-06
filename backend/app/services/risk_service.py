"""
Phase 9B: Risk Assessment Service.

Business logic layer implementing the frozen risk-v1.0 composite scoring methodology:
Risk Score = 0.30 * Forecast Percentile + 0.20 * Volume Percentile + 0.30 * Rate Percentile + 0.20 * Trend Percentile
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import numpy as np
from scipy.stats import rankdata
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.repositories.risk_repository import RiskRepository
from backend.app.schemas.risk import (
    RiskItemResponse,
    RiskOverviewResponse,
    DistrictRiskDetailResponse,
    RiskModelInfoResponse,
)
from backend.app.schemas.common import StandardListResponse


CALCULATION_VERSION = "risk-v1.0"
WEIGHT_FORECAST = 0.30
WEIGHT_VOLUME = 0.20
WEIGHT_RATE = 0.30
WEIGHT_TREND = 0.20


class RiskService:
    @staticmethod
    def calculate_percentile_ranks(values: np.ndarray) -> np.ndarray:
        """
        Calculates percentile ranks across the evaluation array on [0, 100].
        Uses average / mid-rank handling for ties:
        percentile = (rank - 1.0) / (N - 1.0) * 100.0
        """
        n = len(values)
        if n <= 1:
            return np.zeros(n, dtype=float)
        ranks = rankdata(values, method="average")
        pcts = ((ranks - 1.0) / (n - 1.0)) * 100.0
        return np.clip(pcts, 0.0, 100.0)

    @staticmethod
    def classify_risk_level(score: float) -> str:
        """Assigns categorical risk level based on frozen calibrated thresholds."""
        if score < 35.0:
            return "LOW"
        elif score < 50.0:
            return "MODERATE"
        elif score < 65.0:
            return "HIGH"
        else:
            return "CRITICAL"

    @staticmethod
    def run_risk_assessment(
        db: Session,
        assessment_date: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end risk calculation and idempotent persistence
        for the given assessment date across all 640 historical districts.
        """
        try:
            dt = datetime.strptime(assessment_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid assessment date format: {assessment_date}. Expected YYYY-MM-DD.",
            )

        period_year = dt.year
        period_month = dt.month

        # 1. Verify active production model
        active_model = RiskRepository.get_active_forecasting_model(db)
        if not active_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active production forecasting model found in ml_models.",
            )

        # 2. Load Census 2011 demographic baselines (640 districts)
        demographics = RiskRepository.get_census_demographics(db, census_year=2011)
        if len(demographics) != 640:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Expected 640 Census 2011 districts, found {len(demographics)}.",
            )

        # 3. Load forecasts for target assessment date
        forecasts = RiskRepository.get_forecasts(db, model_id=active_model.id, forecast_period=assessment_date)
        missing_forecast_districts = [d["district_name"] for d in demographics if d["district_id"] not in forecasts]
        if missing_forecast_districts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Missing production forecasts for {len(missing_forecast_districts)} districts in {assessment_date}. "
                    f"First missing: {missing_forecast_districts[:5]}. Risk engine cannot fabricate forecasts."
                ),
            )

        # 4. Historical volume: 12 calendar months preceding forecast period
        # For 2026-01-01, this is 2025-01-01 through 2025-12-31
        hist_start = f"{period_year - 1:04d}-01-01"
        hist_end = f"{period_year - 1:04d}-12-31"
        historical_vols = RiskRepository.get_historical_volume(db, start_date=hist_start, end_date=hist_end)

        # 5. Trend factor: Recent 3M vs Previous 3M
        # For 2026-01-01: Recent = 2025-10-01 to 2025-12-31, Prior = 2025-07-01 to 2025-09-30
        recent_start = f"{period_year - 1:04d}-10-01"
        recent_end = f"{period_year - 1:04d}-12-31"
        prior_start = f"{period_year - 1:04d}-07-01"
        prior_end = f"{period_year - 1:04d}-09-30"
        recent_counts, prior_counts = RiskRepository.get_period_trends(
            db,
            recent_start=recent_start,
            recent_end=recent_end,
            prior_start=prior_start,
            prior_end=prior_end,
        )

        # 6. Severity weights for auxiliary audit index
        severities = RiskRepository.get_severity_weights(db, start_date=hist_start, end_date=hist_end)

        # Prepare raw factor vectors in identical district order
        n_districts = len(demographics)
        f_raw = np.zeros(n_districts, dtype=float)
        v_raw = np.zeros(n_districts, dtype=float)
        r_raw = np.zeros(n_districts, dtype=float)
        t_raw = np.zeros(n_districts, dtype=float)
        s_raw = np.zeros(n_districts, dtype=float)

        for i, dem in enumerate(demographics):
            did = dem["district_id"]
            pop = dem["total_population"]
            if pop <= 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"District {dem['district_name']} (ID {did}) has non-positive Census population {pop}.",
                )

            v_count = historical_vols.get(did, 0)
            fc_count = forecasts[did]
            rate = (float(v_count) / float(pop)) * 100000.0

            rec_3m = recent_counts.get(did, 0)
            pri_3m = prior_counts.get(did, 0)
            trend_val = min(float(rec_3m) / float(pri_3m + 1.0), 3.0)

            sev_val = severities.get(did, 1.0)

            f_raw[i] = fc_count
            v_raw[i] = v_count
            r_raw[i] = rate
            t_raw[i] = trend_val
            s_raw[i] = sev_val

        # 7. Percentile ranks across the 640 assessment population
        f_pct = RiskService.calculate_percentile_ranks(f_raw)
        v_pct = RiskService.calculate_percentile_ranks(v_raw)
        r_pct = RiskService.calculate_percentile_ranks(r_raw)
        t_pct = RiskService.calculate_percentile_ranks(t_raw)

        # 8. Composite weighted score (unrounded weighted sum, final round to 2 decimals)
        scores = (
            WEIGHT_FORECAST * f_pct
            + WEIGHT_VOLUME * v_pct
            + WEIGHT_RATE * r_pct
            + WEIGHT_TREND * t_pct
        )

        # 9. Build persistence records
        records_to_save: List[Dict[str, Any]] = []
        for i, dem in enumerate(demographics):
            final_score = round(float(scores[i]), 2)
            risk_lvl = RiskService.classify_risk_level(final_score)

            contrib_f = round(float(f_pct[i] * WEIGHT_FORECAST), 2)
            contrib_v = round(float(v_pct[i] * WEIGHT_VOLUME), 2)
            contrib_r = round(float(r_pct[i] * WEIGHT_RATE), 2)
            contrib_t = round(float(t_pct[i] * WEIGHT_TREND), 2)

            factor_contribs = {
                "forecast_volume": {
                    "raw": round(float(f_raw[i]), 2),
                    "percentile": round(float(f_pct[i]), 2),
                    "weight": WEIGHT_FORECAST,
                    "weighted": contrib_f,
                },
                "historical_volume": {
                    "raw": int(v_raw[i]),
                    "percentile": round(float(v_pct[i]), 2),
                    "weight": WEIGHT_VOLUME,
                    "weighted": contrib_v,
                },
                "crime_rate_per_100k": {
                    "raw": round(float(r_raw[i]), 2),
                    "percentile": round(float(r_pct[i]), 2),
                    "weight": WEIGHT_RATE,
                    "weighted": contrib_r,
                },
                "trend_ratio": {
                    "raw": round(float(t_raw[i]), 2),
                    "percentile": round(float(t_pct[i]), 2),
                    "weight": WEIGHT_TREND,
                    "weighted": contrib_t,
                },
            }

            contributions_map = {
                "forecast_volume": contrib_f,
                "historical_volume": contrib_v,
                "crime_rate_per_100k": contrib_r,
                "trend_ratio": contrib_t,
            }
            strongest_driver = max(contributions_map, key=contributions_map.get)

            records_to_save.append({
                "district_id": dem["district_id"],
                "period_year": period_year,
                "period_month": period_month,
                "overall_risk_score": final_score,
                "risk_level": risk_lvl,
                "severity_index": round(float(s_raw[i]), 2),
                "trend_index": round(float(t_pct[i]), 2),
                "volume_index": round(float(v_pct[i]), 2),
                "forecast_index": round(float(f_pct[i]), 2),
                "rate_index": round(float(r_pct[i]), 2),
                "model_id": active_model.id,
                "model_version": active_model.version,
                "factor_contributions": factor_contribs,
                "strongest_driver": strongest_driver,
                "population_density_factor": round(float(r_pct[i]), 2),
                "calculation_version": calculation_version,
            })

        # 10. Idempotent persistence
        persisted_count = RiskRepository.save_risk_scores(db, records_to_save)

        return {
            "status": "success",
            "assessment_period": assessment_date,
            "period_year": period_year,
            "period_month": period_month,
            "districts_assessed": persisted_count,
            "calculation_version": calculation_version,
            "model_version": active_model.version,
            "model_name": active_model.model_name,
        }

    @staticmethod
    def get_overview(
        db: Session,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> RiskOverviewResponse:
        """Retrieves high-level summary and risk level distribution across all districts."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            dt = datetime(2026, 1, 1).date()

        data = RiskRepository.get_overview(
            db,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
        )

        top_districts = [RiskItemResponse(**item) for item in data["top_risk_districts"]]

        return RiskOverviewResponse(
            total_assessed_districts=data["total_assessed_districts"],
            mean_risk_score=data["mean_risk_score"],
            median_risk_score=data["median_risk_score"],
            highest_risk_score=data["highest_risk_score"],
            lowest_risk_score=data["lowest_risk_score"],
            risk_level_distribution=data["risk_level_distribution"],
            risk_level_percentages=data["risk_level_percentages"],
            top_risk_districts=top_districts,
            assessment_period=data["assessment_period"],
            methodology_version=data["methodology_version"],
            active_forecast_model=data["active_forecast_model"],
            active_forecast_version=data["active_forecast_version"],
        )

    @staticmethod
    def list_risk_scores(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        risk_level: Optional[str] = None,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[RiskItemResponse]:
        """Lists paginated risk score records with optional filtering."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            dt = datetime(2026, 1, 1).date()

        items, total = RiskRepository.list_risk_scores(
            db,
            state_id=state_id,
            district_id=district_id,
            risk_level=risk_level,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
            skip=skip,
            limit=limit,
        )

        return StandardListResponse[RiskItemResponse](
            total=total,
            items=[RiskItemResponse(**item) for item in items],
        )

    @staticmethod
    def get_district_risk_detail(
        db: Session,
        district_id: int,
        assessment_period: str = "2026-01-01",
        calculation_version: str = CALCULATION_VERSION,
    ) -> DistrictRiskDetailResponse:
        """Retrieves comprehensive explainability risk assessment details for a specific district."""
        try:
            dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
        except ValueError:
            dt = datetime(2026, 1, 1).date()

        data = RiskRepository.get_district_risk(
            db,
            district_id=district_id,
            period_year=dt.year,
            period_month=dt.month,
            calculation_version=calculation_version,
        )

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Risk assessment not found for district ID {district_id} in period {assessment_period} ({calculation_version}).",
            )

        return DistrictRiskDetailResponse(**data)

    @staticmethod
    def get_risk_methodology_info(db: Session) -> RiskModelInfoResponse:
        """Returns frozen methodology metadata, factor weights, and linked production model provenance."""
        active_model = RiskRepository.get_active_forecasting_model(db)
        return RiskModelInfoResponse(
            methodology_version=CALCULATION_VERSION,
            formula="Risk Score = 0.30 * Forecast_Pct + 0.20 * Volume_Pct + 0.30 * Rate_Pct + 0.20 * Trend_Pct",
            factors=[
                {
                    "name": "forecast_volume",
                    "weight": 0.30,
                    "description": "Forward-looking monthly incident projection from production HGBR model",
                    "source": "crime_predictions",
                },
                {
                    "name": "historical_volume",
                    "weight": 0.20,
                    "description": "Sustained trailing 12-month baseline incident volume",
                    "source": "crime_incidents",
                },
                {
                    "name": "crime_rate_per_100k",
                    "weight": 0.30,
                    "description": "Annualized incidents per 100,000 population using Census 2011 baseline",
                    "source": "district_demographics",
                },
                {
                    "name": "trend_ratio",
                    "weight": 0.20,
                    "description": "Short-term momentum: Recent 3M over Prior 3M with Laplace +1.0 smoothing and 3.0 cap",
                    "source": "crime_incidents",
                },
            ],
            normalization="Percentile Rank Normalization [0, 100] across 640 assessment population with mid-rank tie handling",
            risk_bands={
                "LOW": "0.00 <= Score < 35.00",
                "MODERATE": "35.00 <= Score < 50.00",
                "HIGH": "50.00 <= Score < 65.00",
                "CRITICAL": "65.00 <= Score <= 100.00",
            },
            active_model_name=active_model.model_name if active_model else "N/A",
            active_model_version=active_model.version if active_model else "N/A",
        )
