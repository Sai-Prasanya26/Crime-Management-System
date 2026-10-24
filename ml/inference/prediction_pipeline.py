"""
Phase 8D: Production ML Model Registration & Prediction Population Pipeline.

Responsibilities:
1. Register production HGBR model in MySQL `ml_models` table:
   - Validates model artifact, version, and Phase 8C verified evaluation metrics.
   - Idempotently creates or updates the active model record.
2. Generate and store real, model-based predictions in `crime_predictions`:
   - Out-of-sample evaluated 2025 monthly forecasts (7,680 observations: 12 months x 640 districts).
   - Operational forward forecast for January 2026 (640 observations: 640 districts).
   - Idempotent upsert preventing duplicate records.
"""

import sys
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine as default_engine
from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS
from ml.inference.model_loader import get_production_metadata, get_production_model
from ml.inference.forecast_service import generate_forecasts
from ml.evaluation.metrics import clamp_predictions

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def register_production_model(engine: Optional[Engine] = None) -> int:
    """
    Registers the production HGBR model in the `ml_models` table.
    
    Verifies:
    - Artifact exists and loads
    - Metadata exists with Phase 8C evaluation metrics
    - Unique registration by (model_name, version)
    - Active production flag set to TRUE

    Returns:
        int: Primary key ID of the registered MLModel.
    """
    db_engine = engine or default_engine
    meta = get_production_metadata()
    # Verify artifact loadability
    get_production_model()

    model_name = meta["model_name"]
    version = meta["model_version"]
    model_type = meta["model_type"]
    algorithm = meta["algorithm"]
    eval_metrics = json.dumps(meta["model_selection_evidence"])
    dataset_snapshot = meta["production_refit"]["source_snapshot"]
    artifact_path = meta["artifact_path"]

    with db_engine.connect() as conn:
        # Check if already registered
        query_check = text("SELECT id, is_active FROM ml_models WHERE model_name = :name AND version = :version")
        existing = conn.execute(query_check, {"name": model_name, "version": version}).fetchone()

        if existing:
            model_id = existing[0]
            if not existing[1]:
                conn.execute(
                    text("UPDATE ml_models SET is_active = TRUE WHERE id = :id"),
                    {"id": model_id},
                )
                conn.commit()
                logger.info("Updated model '%s' (%s) [ID: %d] to active=True.", model_name, version, model_id)
            else:
                logger.info("Model '%s' (%s) already registered and active [ID: %d].", model_name, version, model_id)
            return model_id

        # Insert new registration
        insert_query = text("""
            INSERT INTO ml_models (
                model_name, model_type, version, algorithm,
                evaluation_metrics, training_date, dataset_snapshot,
                artifact_path, is_active
            ) VALUES (
                :model_name, :model_type, :version, :algorithm,
                :evaluation_metrics, NOW(), :dataset_snapshot,
                :artifact_path, TRUE
            )
        """)
        result = conn.execute(insert_query, {
            "model_name": model_name,
            "model_type": model_type,
            "version": version,
            "algorithm": algorithm,
            "evaluation_metrics": eval_metrics,
            "dataset_snapshot": dataset_snapshot,
            "artifact_path": artifact_path,
        })
        conn.commit()
        model_id = result.lastrowid
        logger.info("Registered production model '%s' (%s) with ID: %d.", model_name, version, model_id)
        return model_id


def generate_forward_multistep_forecasts(
    panel_df: pd.DataFrame,
    months_ahead: int = 3,
) -> List[Dict[str, Any]]:
    """
    Generates multi-step recursive forward forecasts for 1 to `months_ahead` calendar months
    (e.g., 2026-01-01, 2026-02-01, 2026-03-01) for all 640 districts.
    """
    model = get_production_model()
    meta = get_production_metadata()
    model_version = meta.get("model_version", "v1.0.0")
    model_name = meta.get("model_name", "HGBR production forecasting model v1")

    # Group historical series by district
    district_states = {}
    for d_id, grp in panel_df.groupby("district_id"):
        grp = grp.sort_values("period_date")
        last_row = grp.iloc[-1]
        y2025 = grp[grp["year"] == 2025].sort_values("month")
        inc_2025 = list(y2025["incident_count"].values)  # 12 historical months
        district_states[int(d_id)] = {
            "static": last_row,
            "history": inc_2025,
        }

    all_forward_forecasts: List[Dict[str, Any]] = []
    periods = ["2026-01-01", "2026-02-01", "2026-03-01"][:months_ahead]

    for m_idx, period_str in enumerate(periods, start=1):
        rows = []
        d_ids_ordered = sorted(district_states.keys())
        for d_id in d_ids_ordered:
            st = district_states[d_id]["static"]
            hist = district_states[d_id]["history"]

            lag_1 = float(hist[-1])
            lag_2 = float(hist[-2])
            lag_3 = float(hist[-3])
            lag_12 = float(hist[-12])

            rm3 = round(float(np.mean(hist[-3:])), 4)
            rm6 = round(float(np.mean(hist[-6:])), 4)
            rm12 = round(float(np.mean(hist[-12:])), 4)
            rstd6 = round(float(np.std(hist[-6:], ddof=1)), 4)

            tot_pop = float(st["total_population"])
            hcr = round(float((rm12 / tot_pop) * 100000), 4)

            rows.append({
                "district_id": int(d_id),
                "state_id": int(st["state_id"]),
                "district_name": str(st["district_name"]),
                "state_name": str(st["state_name"]),
                "year": 2026,
                "month": m_idx,
                "quarter": 1,
                "year_index": 6,
                "sin_month": round(float(np.sin(2 * np.pi * m_idx / 12)), 6),
                "cos_month": round(float(np.cos(2 * np.pi * m_idx / 12)), 6),
                "lag_1": lag_1,
                "lag_2": lag_2,
                "lag_3": lag_3,
                "lag_12": lag_12,
                "rolling_mean_3": rm3,
                "rolling_mean_6": rm6,
                "rolling_mean_12": rm12,
                "rolling_std_6": rstd6,
                "total_population": tot_pop,
                "male_population": float(st["male_population"]),
                "female_population": float(st["female_population"]),
                "literate_population": float(st["literate_population"]),
                "total_workers": float(st["total_workers"]),
                "gender_ratio": float(st["gender_ratio"]),
                "literacy_rate": float(st["literacy_rate"]),
                "worker_ratio": float(st["worker_ratio"]),
                "historical_crime_rate_per_100k": hcr,
                "period": period_str,
            })

        df_step = pd.DataFrame(rows)
        preds = clamp_predictions(model.predict(df_step[FEATURE_COLUMNS]))

        for i, d_id in enumerate(d_ids_ordered):
            pred_val = round(float(preds[i]), 2)
            district_states[d_id]["history"].append(pred_val)
            all_forward_forecasts.append({
                "district_id": d_id,
                "district_name": rows[i]["district_name"],
                "state_id": rows[i]["state_id"],
                "state_name": rows[i]["state_name"],
                "forecast_period": period_str,
                "predicted_incident_count": pred_val,
                "model_version": model_version,
                "model_name": model_name,
            })

    logger.info(
        "Generated %d multi-step forward forecasts across %d periods (%s).",
        len(all_forward_forecasts),
        len(periods),
        ", ".join(periods),
    )
    return all_forward_forecasts


def build_next_month_feature_matrix(panel_df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs the operational 1-step ahead feature matrix for 2026-01-01 (January 2026)
    for all 640 districts strictly using historical trailing statistics through 2025-12.
    """
    forecasts = generate_forward_multistep_forecasts(panel_df, months_ahead=1)
    return pd.DataFrame(forecasts)


def populate_predictions(
    engine: Optional[Engine] = None,
    parquet_path: str = "ml/data/panel_features_2020_2025.parquet",
    include_2025: bool = True,
    include_forward_2026: bool = True,
    forward_months: int = 3,
) -> Dict[str, Any]:
    """
    Generates real model forecasts and populates `crime_predictions` using an idempotent strategy.
    
    Returns:
        dict: Summary of populated prediction records.
    """
    db_engine = engine or default_engine
    model_id = register_production_model(db_engine)

    logger.info("Loading feature panel from %s...", parquet_path)
    panel_df = pd.read_parquet(parquet_path)

    all_forecasts: List[Dict[str, Any]] = []

    # 1. 2025 monthly forecasts (7,680 rows)
    if include_2025:
        df_2025 = panel_df[panel_df["year"] == 2025].copy()
        logger.info("Generating forecasts for 2025 evaluated periods (%d rows)...", len(df_2025))
        f_2025 = generate_forecasts(df_2025)
        all_forecasts.extend(f_2025)

    # 2. Forward operational forecasts (1–3 months forward: Jan, Feb, Mar 2026)
    if include_forward_2026:
        logger.info("Generating forward operational forecasts for %d months...", forward_months)
        f_forward = generate_forward_multistep_forecasts(panel_df, months_ahead=forward_months)
        all_forecasts.extend(f_forward)

    logger.info("Total generated forecasts to store: %d.", len(all_forecasts))

    # 3. Idempotent bulk upsert into `crime_predictions`
    upsert_sql = text("""
        INSERT INTO crime_predictions (
            district_id, crime_type_id, model_id, prediction_date,
            predicted_crime_count, confidence_lower, confidence_upper
        ) VALUES (
            :district_id, NULL, :model_id, :prediction_date,
            :predicted_crime_count, NULL, NULL
        )
        ON DUPLICATE KEY UPDATE
            predicted_crime_count = VALUES(predicted_crime_count),
            generated_at = NOW()
    """)

    batch_params = [
        {
            "district_id": f["district_id"],
            "model_id": model_id,
            "prediction_date": f["forecast_period"],
            "predicted_crime_count": f["predicted_incident_count"],
        }
        for f in all_forecasts
    ]

    with db_engine.connect() as conn:
        conn.execute(upsert_sql, batch_params)
        conn.commit()

        # Query total predictions in table
        count_total = conn.execute(text("SELECT COUNT(*) FROM crime_predictions WHERE model_id = :mid"), {"mid": model_id}).scalar()
        periods = [r[0] for r in conn.execute(
            text("SELECT DISTINCT prediction_date FROM crime_predictions WHERE model_id = :mid ORDER BY prediction_date"),
            {"mid": model_id}
        ).fetchall()]

    summary = {
        "model_id": model_id,
        "total_predictions_stored": count_total,
        "periods_covered": [str(p) for p in periods],
        "districts_count": len(panel_df["district_id"].unique()),
        "generated_count": len(all_forecasts),
    }

    logger.info(
        "Successfully populated predictions: %d records across %d periods (Model ID: %d).",
        count_total,
        len(periods),
        model_id,
    )
    return summary


if __name__ == "__main__":
    res = populate_predictions()
    print("\n" + "=" * 65)
    print("PHASE 8D: PRODUCTION PREDICTION POPULATION COMPLETE")
    print("=" * 65)
    print(f"Registered Model ID:          {res['model_id']}")
    print(f"Total Stored Predictions:     {res['total_predictions_stored']:,}")
    print(f"Distinct Districts:           {res['districts_count']}")
    print(f"Prediction Periods Covered:   {len(res['periods_covered'])} periods ({res['periods_covered'][0]} to {res['periods_covered'][-1]})")
    print("=" * 65 + "\n")
