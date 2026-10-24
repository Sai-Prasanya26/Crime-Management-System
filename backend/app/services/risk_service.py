"""
Phase 9: Explainable Crime Risk Assessment Service.

Business logic layer implementing:
1. Production Explainable Methodology (risk-v2.0):
   - HISTORICAL MODE: 0.25 Volume + 0.25 Severity + 0.25 Rate + 0.25 Trend
   - FORECAST MODE: 0.30 Forecast + 0.20 Severity + 0.30 Rate + 0.20 Trend
2. Legacy Methodology (risk-v1.0):
   - 0.30 Forecast + 0.20 Volume + 0.30 Rate + 0.20 Trend
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import numpy as np
from scipy.stats import rankdata
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from backend.app.repositories.risk_repository import RiskRepository
from backend.app.schemas.risk import (
    RiskItemResponse,
    RiskOverviewResponse,
    DistrictRiskDetailResponse,
    RiskModelInfoResponse,
    RiskCalculateResponse,
    RiskTrendsResponse,
    RiskTrendPoint,
)
from backend.app.schemas.common import StandardListResponse

logger = logging.getLogger(__name__)

CALCULATION_VERSION = "risk-v1.0"
CALCULATION_VERSION_V2 = "risk-v2.0"

# Legacy v1.0 weights
WEIGHT_FORECAST = 0.30
WEIGHT_VOLUME = 0.20
WEIGHT_RATE = 0.30
WEIGHT_TREND = 0.20

# V2.0 Historical weights
V2_HIST_WEIGHT_VOLUME = 0.25
V2_HIST_WEIGHT_SEVERITY = 0.25
V2_HIST_WEIGHT_RATE = 0.25
V2_HIST_WEIGHT_TREND = 0.25

# V2.0 Forecast weights (avoids double-counting raw volume and forecast volume)
V2_FC_WEIGHT_FORECAST = 0.30
V2_FC_WEIGHT_SEVERITY = 0.20
V2_FC_WEIGHT_RATE = 0.30
V2_FC_WEIGHT_TREND = 0.20


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
        """Assigns categorical risk level based on calibrated thresholds."""
        if score < 35.0:
            return "LOW"
        elif score < 50.0:
            return "MODERATE"
        elif score < 65.0:
            return "HIGH"
        else:
            return "CRITICAL"

    @staticmethod
    def build_explanation_narrative(
        district_name: str,
        state_name: str,
        score: float,
        risk_level: str,
        score_type: str,
        assessment_period: str,
        strongest_driver: str,
        factor_contribs: Dict[str, Any],
        pop_2011: int,
        calculation_version: str,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
        forecast_origin_date: Optional[str] = None,
    ) -> str:
        """
        Synthesizes an explainable, human-readable narrative explaining score components,
        normalization properties, data provenance, and strict analytical non-causal interpretation.
        """
        driver_label = strongest_driver.replace("_", " ").title()
        driver_data = factor_contribs.get(strongest_driver, {})
        driver_weighted = driver_data.get("weighted", 0.0)
        driver_pct = driver_data.get("percentile", 0.0)

        type_desc = (
            "an active future forecast"
            if score_type == "FORECAST"
            else "an observed historical baseline"
        )

        parts = [
            f"District {district_name} ({state_name}) has an overall risk score of {score:.2f} "
            f"({risk_level}), assessed for period {assessment_period} as {type_desc} "
            f"under methodology {calculation_version}."
        ]

        if score_type == "FORECAST":
            parts.append(
                f"The assessment incorporates future caseload projections from {model_name or 'Production Model'} "
                f"({model_version or 'v1.0.0'}), anchored at forecast origin {forecast_origin_date or 'N/A'}."
            )
        else:
            parts.append(
                "The score is derived entirely from verified historical crime incident records and Census 2011 baselines."
            )

        parts.append(
            f"The primary relative risk driver is '{driver_label}', contributing {driver_weighted:.2f} points "
            f"at the {driver_pct:.1f}th percentile nationwide."
        )

        parts.append(
            f"Per-capita rate calculations reference the official Census 2011 population baseline ({pop_2011:,} residents). "
            f"All components are normalized into relative percentile ranks [0, 100] across all 640 districts. "
            f"This score serves strictly as an operational planning indicator and does not represent an individual person's risk or a guarantee of future crime."
        )

        return " ".join(parts)

    @staticmethod
    def run_risk_assessment(
        db: Session,
        assessment_date: str = "2026-01-01",
        score_type: Optional[str] = None,
        calculation_version: str = CALCULATION_VERSION,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end risk calculation and idempotent persistence
        for the given assessment date across all 640 historical districts.
        Supports both legacy 'risk-v1.0' and explainable 'risk-v2.0'.
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

        # Determine score_type if not explicitly provided
        if not score_type:
            score_type = "HISTORICAL" if dt < datetime(2026, 1, 1).date() else "FORECAST"
        score_type = score_type.upper()
        if score_type not in ["HISTORICAL", "FORECAST"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid score_type: {score_type}. Expected 'HISTORICAL' or 'FORECAST'.",
            )

        # 1. Load Census 2011 demographic baselines (640 districts)
        demographics = RiskRepository.get_census_demographics(db, census_year=2011)
        if len(demographics) != 640:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Expected 640 Census 2011 districts, found {len(demographics)}.",
            )

        n_districts = len(demographics)
        active_model = None
        forecast_origin_date_val = None

        # 2. Check model and forecasts if needed
        forecasts: Dict[int, Dict[str, Any]] = {}
        if calculation_version == "risk-v1.0" or score_type == "FORECAST":
            active_model = RiskRepository.get_active_forecasting_model(db)
            if not active_model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active production forecasting model found in ml_models.",
                )

            # If v2.0 forecast mode, require CURRENT_FUTURE_FORECAST
            require_cf = (calculation_version != "risk-v1.0")
            forecasts = RiskRepository.get_forecasts(
                db,
                model_id=active_model.id,
                forecast_period=assessment_date,
                require_current_future=require_cf,
            )

            # Fallback for v1.0 if not require_cf
            if not forecasts and not require_cf:
                forecasts = RiskRepository.get_forecasts(
                    db,
                    model_id=active_model.id,
                    forecast_period=assessment_date,
                    require_current_future=False,
                )

            missing_forecast_districts = [
                dem["district_name"] for dem in demographics if dem["district_id"] not in forecasts
            ]
            if missing_forecast_districts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Missing production forecasts for {len(missing_forecast_districts)} districts in {assessment_date}. "
                        f"First missing: {missing_forecast_districts[:5]}. Risk engine cannot fabricate forecasts."
                    ),
                )

            # Extract forecast_origin_date from first record
            first_fid = next(iter(forecasts.values()))
            forecast_origin_date_val = first_fid.get("forecast_origin_date")

        # 3. Historical volume:
        # For historical months, use the target month incidents (e.g. 2025-12-01 to 2025-12-31)
        # For forecast months, use trailing 12 months ending at observation horizon (2025-12-31)
        if score_type == "HISTORICAL":
            from calendar import monthrange
            _, last_day = monthrange(period_year, period_month)
            hist_start = f"{period_year:04d}-{period_month:02d}-01"
            hist_end = f"{period_year:04d}-{period_month:02d}-{last_day:02d}"
        else:
            hist_start = "2025-01-01"
            hist_end = "2025-12-31"

        historical_vols = RiskRepository.get_historical_volume(db, start_date=hist_start, end_date=hist_end)

        # 4. Trend factor: Recent 3M vs Previous 3M
        if score_type == "HISTORICAL":
            # Target month is the end of recent 3M
            # E.g. for 2025-12: recent = 2025-10-01 to 2025-12-31, prior = 2025-07-01 to 2025-09-30
            # Compute dynamically based on period_year and period_month
            if period_month >= 3:
                recent_start = f"{period_year:04d}-{period_month - 2:02d}-01"
                prior_start = f"{period_year:04d}-{period_month - 5:02d}-01" if period_month >= 6 else f"{period_year - 1:04d}-{12 + period_month - 5:02d}-01"
            else:
                recent_start = f"{period_year - 1:04d}-{12 + period_month - 2:02d}-01"
                prior_start = f"{period_year - 1:04d}-{12 + period_month - 5:02d}-01"
            recent_end = hist_end
            prior_end = f"{period_year:04d}-{period_month - 3:02d}-28" if period_month >= 4 else f"{period_year - 1:04d}-{12 + period_month - 3:02d}-28"
        else:
            recent_start = "2025-10-01"
            recent_end = "2025-12-31"
            prior_start = "2025-07-01"
            prior_end = "2025-09-30"

        recent_counts, prior_counts = RiskRepository.get_period_trends(
            db,
            recent_start=recent_start,
            recent_end=recent_end,
            prior_start=prior_start,
            prior_end=prior_end,
        )

        # 5. Severity weights using official crime categories
        severities = RiskRepository.get_severity_weights(db, start_date=hist_start, end_date=hist_end)

        # Prepare raw factor vectors
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
            fc_count = forecasts[did]["predicted_crime_count"] if did in forecasts else 0.0

            # Crime rate per 100k Census 2011 population
            # For legacy risk-v1.0: always based on trailing 12-month volume
            # For risk-v2.0: in FORECAST mode based on projected volume, in HISTORICAL mode based on observed volume
            if calculation_version == "risk-v1.0":
                rate = (float(v_count) / float(pop)) * 100000.0
            elif score_type == "FORECAST":
                rate = (float(fc_count) / float(pop)) * 100000.0
            else:
                rate = (float(v_count) / float(pop)) * 100000.0

            rec_3m = recent_counts.get(did, 0)
            pri_3m = prior_counts.get(did, 0)
            trend_val = min(float(rec_3m) / float(pri_3m + 1.0), 3.0)

            # Baseline severity ratio defaults to 1.00 if 0 incidents
            sev_val = severities.get(did, 1.0)

            f_raw[i] = fc_count
            v_raw[i] = v_count
            r_raw[i] = rate
            t_raw[i] = trend_val
            s_raw[i] = sev_val

        # 6. Percentile ranks across the 640 assessment population
        f_pct = RiskService.calculate_percentile_ranks(f_raw)
        v_pct = RiskService.calculate_percentile_ranks(v_raw)
        r_pct = RiskService.calculate_percentile_ranks(r_raw)
        t_pct = RiskService.calculate_percentile_ranks(t_raw)
        s_pct = RiskService.calculate_percentile_ranks(s_raw)

        # 7. Composite weighted score calculation
        if calculation_version == "risk-v1.0":
            # Frozen Phase 7 methodology:
            # 0.30 Forecast + 0.20 Volume + 0.30 Rate + 0.20 Trend
            scores = (
                WEIGHT_FORECAST * f_pct
                + WEIGHT_VOLUME * v_pct
                + WEIGHT_RATE * r_pct
                + WEIGHT_TREND * t_pct
            )
        elif score_type == "HISTORICAL":
            # Phase 9 Explainable Historical Mode:
            # 0.25 Volume + 0.25 Severity + 0.25 Rate + 0.25 Trend
            scores = (
                V2_HIST_WEIGHT_VOLUME * v_pct
                + V2_HIST_WEIGHT_SEVERITY * s_pct
                + V2_HIST_WEIGHT_RATE * r_pct
                + V2_HIST_WEIGHT_TREND * t_pct
            )
        else:
            # Phase 9 Explainable Forecast Mode (avoids double-counting raw volume and forecast volume):
            # 0.30 Forecast + 0.20 Severity + 0.30 Rate + 0.20 Trend
            scores = (
                V2_FC_WEIGHT_FORECAST * f_pct
                + V2_FC_WEIGHT_SEVERITY * s_pct
                + V2_FC_WEIGHT_RATE * r_pct
                + V2_FC_WEIGHT_TREND * t_pct
            )

        # 8. Build persistence records
        records_to_save: List[Dict[str, Any]] = []
        for i, dem in enumerate(demographics):
            final_score = round(float(scores[i]), 2)
            risk_lvl = RiskService.classify_risk_level(final_score)

            if calculation_version == "risk-v1.0":
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
            elif score_type == "HISTORICAL":
                contrib_v = round(float(v_pct[i] * V2_HIST_WEIGHT_VOLUME), 2)
                contrib_s = round(float(s_pct[i] * V2_HIST_WEIGHT_SEVERITY), 2)
                contrib_r = round(float(r_pct[i] * V2_HIST_WEIGHT_RATE), 2)
                contrib_t = round(float(t_pct[i] * V2_HIST_WEIGHT_TREND), 2)

                factor_contribs = {
                    "historical_volume": {
                        "raw": int(v_raw[i]),
                        "percentile": round(float(v_pct[i]), 2),
                        "weight": V2_HIST_WEIGHT_VOLUME,
                        "weighted": contrib_v,
                    },
                    "severity_profile": {
                        "raw": round(float(s_raw[i]), 2),
                        "percentile": round(float(s_pct[i]), 2),
                        "weight": V2_HIST_WEIGHT_SEVERITY,
                        "weighted": contrib_s,
                    },
                    "crime_rate_per_100k": {
                        "raw": round(float(r_raw[i]), 2),
                        "percentile": round(float(r_pct[i]), 2),
                        "weight": V2_HIST_WEIGHT_RATE,
                        "weighted": contrib_r,
                    },
                    "trend_ratio": {
                        "raw": round(float(t_raw[i]), 2),
                        "percentile": round(float(t_pct[i]), 2),
                        "weight": V2_HIST_WEIGHT_TREND,
                        "weighted": contrib_t,
                    },
                }
                contributions_map = {
                    "historical_volume": contrib_v,
                    "severity_profile": contrib_s,
                    "crime_rate_per_100k": contrib_r,
                    "trend_ratio": contrib_t,
                }
            else:
                contrib_f = round(float(f_pct[i] * V2_FC_WEIGHT_FORECAST), 2)
                contrib_s = round(float(s_pct[i] * V2_FC_WEIGHT_SEVERITY), 2)
                contrib_r = round(float(r_pct[i] * V2_FC_WEIGHT_RATE), 2)
                contrib_t = round(float(t_pct[i] * V2_FC_WEIGHT_TREND), 2)

                factor_contribs = {
                    "forecast_volume": {
                        "raw": round(float(f_raw[i]), 2),
                        "percentile": round(float(f_pct[i]), 2),
                        "weight": V2_FC_WEIGHT_FORECAST,
                        "weighted": contrib_f,
                    },
                    "severity_profile": {
                        "raw": round(float(s_raw[i]), 2),
                        "percentile": round(float(s_pct[i]), 2),
                        "weight": V2_FC_WEIGHT_SEVERITY,
                        "weighted": contrib_s,
                    },
                    "crime_rate_per_100k": {
                        "raw": round(float(r_raw[i]), 2),
                        "percentile": round(float(r_pct[i]), 2),
                        "weight": V2_FC_WEIGHT_RATE,
                        "weighted": contrib_r,
                    },
                    "trend_ratio": {
                        "raw": round(float(t_raw[i]), 2),
                        "percentile": round(float(t_pct[i]), 2),
                        "weight": V2_FC_WEIGHT_TREND,
                        "weighted": contrib_t,
                    },
                }
                contributions_map = {
                    "forecast_volume": contrib_f,
                    "severity_profile": contrib_s,
                    "crime_rate_per_100k": contrib_r,
                    "trend_ratio": contrib_t,
                }

            strongest_driver = max(contributions_map, key=contributions_map.get)

            explanation = RiskService.build_explanation_narrative(
                district_name=dem["district_name"],
                state_name=dem["state_name"],
                score=final_score,
                risk_level=risk_lvl,
                score_type=score_type,
                assessment_period=assessment_date,
                strongest_driver=strongest_driver,
                factor_contribs=factor_contribs,
                pop_2011=dem["total_population"],
                calculation_version=calculation_version,
                model_name=active_model.model_name if active_model else None,
                model_version=active_model.version if active_model else None,
                forecast_origin_date=forecast_origin_date_val,
            )

            records_to_save.append({
                "district_id": dem["district_id"],
                "period_year": period_year,
                "period_month": period_month,
                "overall_risk_score": final_score,
                "risk_level": risk_lvl,
                "score_type": score_type,
                "severity_index": round(float(s_pct[i]), 2) if calculation_version != "risk-v1.0" else round(float(s_raw[i]), 2),
                "trend_index": round(float(t_pct[i]), 2),
                "volume_index": round(float(v_pct[i]), 2),
                "forecast_index": round(float(f_pct[i]), 2) if (calculation_version == "risk-v1.0" or score_type == "FORECAST") else None,
                "rate_index": round(float(r_pct[i]), 2),
                "model_id": active_model.id if active_model else None,
                "model_version": active_model.version if active_model else None,
                "forecast_origin_date": forecast_origin_date_val,
                "factor_contributions": factor_contribs,
                "strongest_driver": strongest_driver,
                "explanation_summary": explanation,
                "population_density_factor": round(float(r_pct[i]), 2),
                "calculation_version": calculation_version,
            })

        # 9. Idempotent persistence inside transaction
        persisted_count = RiskRepository.save_risk_scores(db, records_to_save)

        return {
            "status": "success",
            "assessment_period": assessment_date,
            "period_year": period_year,
            "period_month": period_month,
            "score_type": score_type,
            "districts_assessed": persisted_count,
            "calculation_version": calculation_version,
            "model_version": active_model.version if active_model else None,
            "model_name": active_model.model_name if active_model else None,
            "forecast_origin_date": forecast_origin_date_val,
        }

    @staticmethod
    def get_overview(
        db: Session,
        assessment_period: Optional[str] = "2026-01-01",
        year: Optional[int] = None,
        month: Optional[int] = None,
        score_type: Optional[str] = None,
        calculation_version: str = CALCULATION_VERSION,
    ) -> RiskOverviewResponse:
        """Retrieves high-level summary and risk level distribution across all districts."""
        if year and month:
            py, pm = year, month
        elif assessment_period:
            try:
                dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
                py, pm = dt.year, dt.month
            except ValueError:
                py, pm = 2026, 1
        else:
            py, pm = 2026, 1

        data = RiskRepository.get_overview(
            db,
            period_year=py,
            period_month=pm,
            calculation_version=calculation_version,
            score_type=score_type,
        )

        # Fallback to 2026-01 if 0 records and no specific period requested
        if data["total_assessed_districts"] == 0 and not assessment_period and not year:
            data = RiskRepository.get_overview(
                db,
                period_year=2026,
                period_month=1,
                calculation_version=calculation_version or "risk-v1.0",
                score_type=score_type,
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
            score_type=data.get("score_type", "FORECAST"),
            methodology_version=data["methodology_version"],
            active_forecast_model=data["active_forecast_model"],
            active_forecast_version=data["active_forecast_version"],
            forecast_origin_date=data.get("forecast_origin_date"),
        )

    @staticmethod
    def list_risk_scores(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        risk_level: Optional[str] = None,
        score_type: Optional[str] = None,
        assessment_period: Optional[str] = "2026-01-01",
        year: Optional[int] = None,
        month: Optional[int] = None,
        calculation_version: str = CALCULATION_VERSION,
        skip: int = 0,
        limit: int = 100,
    ) -> StandardListResponse[RiskItemResponse]:
        """Lists paginated risk score records with optional filtering."""
        if year and month:
            py, pm = year, month
        elif assessment_period:
            try:
                dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
                py, pm = dt.year, dt.month
            except ValueError:
                py, pm = 2026, 1
        else:
            py, pm = 2026, 1

        items, total = RiskRepository.list_risk_scores(
            db,
            state_id=state_id,
            district_id=district_id,
            risk_level=risk_level,
            score_type=score_type,
            period_year=py,
            period_month=pm,
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
        assessment_period: Optional[str] = "2026-01-01",
        year: Optional[int] = None,
        month: Optional[int] = None,
        score_type: Optional[str] = None,
        calculation_version: str = CALCULATION_VERSION,
    ) -> DistrictRiskDetailResponse:
        """Retrieves comprehensive explainability risk assessment details for a specific district."""
        if year and month:
            py, pm = year, month
        elif assessment_period:
            try:
                dt = datetime.strptime(assessment_period, "%Y-%m-%d").date()
                py, pm = dt.year, dt.month
            except ValueError:
                py, pm = 2026, 1
        else:
            py, pm = 2026, 1

        data = RiskRepository.get_district_risk(
            db,
            district_id=district_id,
            period_year=py,
            period_month=pm,
            calculation_version=calculation_version,
            score_type=score_type,
        )

        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Risk assessment not found for district ID {district_id} in period {py:04d}-{pm:02d}-01 ({calculation_version or 'any version'}).",
            )

        return DistrictRiskDetailResponse(**data)

    @staticmethod
    def get_risk_trends(
        db: Session,
        district_id: Optional[int] = None,
        state_id: Optional[int] = None,
        limit_periods: int = 12,
    ) -> RiskTrendsResponse:
        """Retrieves multi-period longitudinal risk trajectory."""
        d_name = None
        if district_id:
            from backend.app.models.geography import District
            d_obj = db.query(District).filter(District.id == district_id).first()
            if d_obj:
                d_name = d_obj.district_name

        raw_trends = RiskRepository.get_risk_trends(
            db,
            district_id=district_id,
            state_id=state_id,
            limit_periods=limit_periods,
        )

        return RiskTrendsResponse(
            district_id=district_id,
            district_name=d_name,
            trends=[RiskTrendPoint(**rt) for rt in raw_trends],
        )

    @staticmethod
    def get_risk_methodology_info(db: Session, version: str = CALCULATION_VERSION) -> RiskModelInfoResponse:
        """Returns methodology metadata, factor weights, and linked production model provenance."""
        active_model = RiskRepository.get_active_forecasting_model(db)

        if version == "risk-v1.0":
            formula = "Risk Score = 0.30 * Forecast_Pct + 0.20 * Volume_Pct + 0.30 * Rate_Pct + 0.20 * Trend_Pct"
            factors = [
                {
                    "name": "forecast_volume",
                    "weight": 0.30,
                    "description": "Forward-looking monthly incident projection from production HGBR model",
                    "source": "crime_predictions",
                },
                {
                    "name": "historical_volume",
                    "weight": 0.20,
                    "description": "Trailing 12-month baseline incident volume",
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
            ]
        else:
            formula = (
                "FORECAST MODE: 0.30 * Forecast_Pct + 0.20 * Severity_Pct + 0.30 * Rate_Pct + 0.20 * Trend_Pct | "
                "HISTORICAL MODE: 0.25 * Volume_Pct + 0.25 * Severity_Pct + 0.25 * Rate_Pct + 0.25 * Trend_Pct"
            )
            factors = [
                {
                    "name": "forecast_volume",
                    "weight": 0.30,
                    "description": "Active forward projected monthly incident volume from production HGBR v1.0 (used in FORECAST mode)",
                    "source": "crime_predictions (forecast_status = 'CURRENT_FUTURE_FORECAST', is_latest = 1)",
                },
                {
                    "name": "severity_profile",
                    "weight": 0.20,
                    "description": "Official crime-category severity index (Violent Crime 1.50, Fire 1.20, Traffic 1.10, Other 1.00)",
                    "source": "crime_categories.severity_weight & crime_incidents",
                },
                {
                    "name": "crime_rate_per_100k",
                    "weight": 0.30,
                    "description": "Incidents per 100,000 population based strictly on Census 2011 demographic baseline",
                    "source": "district_demographics (census_year = 2011)",
                },
                {
                    "name": "trend_ratio",
                    "weight": 0.20,
                    "description": "Short-term momentum: Recent 3M over Prior 3M with Laplace +1.0 smoothing and 3.0 cap",
                    "source": "crime_incidents",
                },
                {
                    "name": "historical_volume",
                    "weight": 0.25,
                    "description": "Observed incident count in evaluation period (used in HISTORICAL mode with equal 0.25 component weighting)",
                    "source": "crime_incidents",
                },
            ]

        return RiskModelInfoResponse(
            methodology_version=version,
            formula=formula,
            factors=factors,
            normalization="Mid-rank tie-handled Percentile Rank Normalization [0, 100] across 640 assessment population",
            risk_bands={
                "LOW": "0.00 <= Score < 35.00 (Routine monitoring)",
                "MODERATE": "35.00 <= Score < 50.00 (Standard readiness)",
                "HIGH": "50.00 <= Score < 65.00 (Enhanced monitoring)",
                "CRITICAL": "65.00 <= Score <= 100.00 (Priority operational readiness)",
            },
            active_model_name=active_model.model_name if active_model else "N/A",
            active_model_version=active_model.version if active_model else "N/A",
        )
