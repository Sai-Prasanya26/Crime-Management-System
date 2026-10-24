"""
Phase 8B: Historical Walk-Forward Multi-Step Backtesting Engine.

Evaluates multi-step forecasting models (1-month, 3-month, 6-month horizons) across
chronological rolling origins, comparing HGBR against Seasonal Naïve and MA-3 baselines.
Strictly avoids random splits and prevents target leakage.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.feature_engineering.feature_pipeline import FEATURE_COLUMNS, TARGET_COLUMN
from ml.evaluation.metrics import (
    compute_mae,
    compute_rmse,
    compute_wape,
    compute_r2,
    clamp_predictions,
)
from ml.inference.model_loader import get_production_model

logger = logging.getLogger(__name__)


def run_chronological_backtest(
    parquet_path: str = "ml/data/panel_features_2020_2025.parquet",
    origin_year: int = 2024,
    max_steps: int = 6,
) -> Dict[str, Any]:
    """
    Executes a multi-step recursive walk-forward backtest starting at the origin_year cutoff.
    
    Args:
        parquet_path: Path to engineered panel features parquet file.
        origin_year: Cutoff calendar year of historical data available (e.g. 2024).
        max_steps: Maximum forecast horizon steps (e.g. 6 months).
        
    Returns:
        Dict containing step-by-step and aggregate evaluation metrics vs baselines.
    """
    logger.info("Loading panel dataframe from %s for backtesting...", parquet_path)
    df = pd.read_parquet(parquet_path)
    model = get_production_model()

    district_hist = {}
    for d_id, grp in df.groupby("district_id"):
        hist_df = grp[grp["year"] <= origin_year].sort_values(["year", "month"])
        static_info = hist_df.iloc[-1]
        incidents = list(hist_df["target_incident_count"].values)
        district_hist[int(d_id)] = {
            "static": static_info,
            "history": incidents,
        }

    target_year = origin_year + 1
    d_ids_ordered = sorted(district_hist.keys())
    step_results = {h: {"actual": [], "pred_hgbr": [], "pred_sn": [], "pred_ma3": []} for h in range(1, max_steps + 1)}

    for h in range(1, max_steps + 1):
        target_month = h
        rows = []
        for d_id in d_ids_ordered:
            st = district_hist[d_id]["static"]
            hist = district_hist[d_id]["history"]

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
                "year": target_year,
                "month": target_month,
                "quarter": (target_month - 1) // 3 + 1,
                "year_index": target_year - 2020,
                "sin_month": round(float(np.sin(2 * np.pi * target_month / 12)), 6),
                "cos_month": round(float(np.cos(2 * np.pi * target_month / 12)), 6),
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
            })

        step_df = pd.DataFrame(rows)
        preds = clamp_predictions(model.predict(step_df[FEATURE_COLUMNS]))

        for i, d_id in enumerate(d_ids_ordered):
            actual_row = df[(df["district_id"] == d_id) & (df["year"] == target_year) & (df["month"] == target_month)]
            actual_y = float(actual_row["target_incident_count"].values[0]) if len(actual_row) > 0 else 0.0

            p_hgbr = round(float(preds[i]), 2)
            p_sn = float(rows[i]["lag_12"])
            p_ma3 = float(rows[i]["rolling_mean_3"])

            step_results[h]["actual"].append(actual_y)
            step_results[h]["pred_hgbr"].append(p_hgbr)
            step_results[h]["pred_sn"].append(p_sn)
            step_results[h]["pred_ma3"].append(p_ma3)

            # Recursive feed-forward
            district_hist[d_id]["history"].append(p_hgbr)

    # Compile report
    horizon_metrics = {}
    for h in range(1, max_steps + 1):
        act = np.array(step_results[h]["actual"])
        ph = np.array(step_results[h]["pred_hgbr"])
        ps = np.array(step_results[h]["pred_sn"])
        pm = np.array(step_results[h]["pred_ma3"])

        horizon_metrics[f"step_{h}"] = {
            "horizon_month": h,
            "observations": len(act),
            "hgbr": {
                "MAE": round(compute_mae(act, ph), 4),
                "RMSE": round(compute_rmse(act, ph), 4),
                "WAPE_percent": round(compute_wape(act, ph), 2),
                "R2": round(compute_r2(act, ph), 4),
            },
            "seasonal_naive": {
                "MAE": round(compute_mae(act, ps), 4),
                "RMSE": round(compute_rmse(act, ps), 4),
                "WAPE_percent": round(compute_wape(act, ps), 2),
            },
            "moving_average_3": {
                "MAE": round(compute_mae(act, pm), 4),
                "RMSE": round(compute_rmse(act, pm), 4),
                "WAPE_percent": round(compute_wape(act, pm), 2),
            },
        }

    # Aggregate summaries: 1-Month, 3-Month, 6-Month
    aggregate_summaries = {}
    for agg_name, max_h in [("1_month", 1), ("3_month", 3), ("6_month", 6)]:
        if max_h > max_steps:
            continue
        comb_act = []
        comb_ph = []
        comb_ps = []
        comb_pm = []
        for h in range(1, max_h + 1):
            comb_act.extend(step_results[h]["actual"])
            comb_ph.extend(step_results[h]["pred_hgbr"])
            comb_ps.extend(step_results[h]["pred_sn"])
            comb_pm.extend(step_results[h]["pred_ma3"])
        comb_act = np.array(comb_act)
        comb_ph = np.array(comb_ph)
        comb_ps = np.array(comb_ps)
        comb_pm = np.array(comb_pm)

        aggregate_summaries[agg_name] = {
            "horizon_steps": max_h,
            "total_observations": len(comb_act),
            "hgbr": {
                "MAE": round(compute_mae(comb_act, comb_ph), 4),
                "RMSE": round(compute_rmse(comb_act, comb_ph), 4),
                "WAPE_percent": round(compute_wape(comb_act, comb_ph), 2),
                "R2": round(compute_r2(comb_act, comb_ph), 4),
            },
            "seasonal_naive": {
                "MAE": round(compute_mae(comb_act, comb_ps), 4),
                "RMSE": round(compute_rmse(comb_act, comb_ps), 4),
                "WAPE_percent": round(compute_wape(comb_act, comb_ps), 2),
            },
            "moving_average_3": {
                "MAE": round(compute_mae(comb_act, comb_pm), 4),
                "RMSE": round(compute_rmse(comb_act, comb_pm), 4),
                "WAPE_percent": round(compute_wape(comb_act, comb_pm), 2),
            },
            "hgbr_improvement_vs_seasonal_naive_pct": round(
                ((compute_mae(comb_act, comb_ps) - compute_mae(comb_act, comb_ph)) / compute_mae(comb_act, comb_ps)) * 100,
                2,
            ),
        }

    return {
        "origin_cutoff": f"{origin_year}-12-31",
        "evaluation_year": target_year,
        "step_by_step": horizon_metrics,
        "aggregate_horizons": aggregate_summaries,
    }


if __name__ == "__main__":
    report = run_chronological_backtest()
    print("Backtest finished successfully. Aggregate 3-month metrics:")
    print(report["aggregate_horizons"]["3_month"])
