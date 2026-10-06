"""
Phase 8B: Machine Learning Feature Engineering Pipeline.

Transforms the 46,080 district-month panel into a machine learning feature matrix.
Generates temporal, cyclical, backward-looking autoregressive (lags), trailing rolling,
and static Census demographic features.

Ensures ZERO data leakage:
- Target variable is isolated (target_incident_count).
- All lag and rolling calculations strictly use prior periods (shift(1)).
- Excludes post-incident attributes (case_status, closed_date, police_deployed_count, etc.).
- Defines chronological train/validation/test splits (2021-2023 / 2024 / 2025).
"""

import sys
import os
import logging
from typing import Optional, Tuple, List, Dict, Any
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine as default_engine
from ml.preprocessing.panel_builder import (
    build_district_month_panel,
    EXPECTED_DISTRICTS_COUNT,
    EXPECTED_PANEL_ROWS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Feature column categories
FEATURE_COLUMNS: List[str] = [
    # Geographic & Static Identifiers
    "district_id",
    "state_id",
    # Temporal & Cyclical
    "year",
    "month",
    "quarter",
    "year_index",
    "sin_month",
    "cos_month",
    # Autoregressive Lags (Strictly backward looking)
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_12",
    # Trailing Rolling Statistics (Shifted by 1)
    "rolling_mean_3",
    "rolling_mean_6",
    "rolling_mean_12",
    "rolling_std_6",
    # Census 2011 Static Demographics
    "total_population",
    "male_population",
    "female_population",
    "literate_population",
    "total_workers",
    "gender_ratio",
    "literacy_rate",
    "worker_ratio",
    # Trailing Historical Crime Rate
    "historical_crime_rate_per_100k",
]

TARGET_COLUMN = "target_incident_count"

# Explicitly forbidden post-incident / leakage attributes
FORBIDDEN_LEAKAGE_COLUMNS = [
    "case_status",
    "closed_date",
    "police_deployed_count",
    "reported_date",
    "report_number",
    "victim_age",
    "victim_gender",
    "weapon_used",
    "id",
]


def load_census_demographics(engine: Optional[Engine] = None) -> pd.DataFrame:
    """
    Loads Census 2011 demographic indicators for the 640 historical districts.
    """
    db_engine = engine or default_engine
    query = """
        SELECT 
            district_id,
            total_population,
            male_population,
            female_population,
            literate_population,
            total_workers
        FROM district_demographics
        WHERE census_year = 2011
        ORDER BY district_id ASC
    """
    with db_engine.connect() as conn:
        df_demo = pd.read_sql(text(query), conn)

    assert len(df_demo) == EXPECTED_DISTRICTS_COUNT, (
        f"Demographics count mismatch: expected {EXPECTED_DISTRICTS_COUNT}, got {len(df_demo)}"
    )
    assert (df_demo["total_population"] > 0).all(), "Non-positive total population detected!"
    assert (df_demo["male_population"] > 0).all(), "Non-positive male population detected!"
    assert (df_demo["female_population"] > 0).all(), "Non-positive female population detected!"

    # Feature engineering on Census demographics
    df_demo["gender_ratio"] = (df_demo["female_population"] / df_demo["male_population"]).round(4)
    df_demo["literacy_rate"] = (df_demo["literate_population"] / df_demo["total_population"]).round(4)
    df_demo["worker_ratio"] = (df_demo["total_workers"] / df_demo["total_population"]).round(4)

    logger.info("Loaded and enriched Census 2011 demographics for %d districts.", len(df_demo))
    return df_demo


def generate_features(panel_df: pd.DataFrame, engine: Optional[Engine] = None) -> pd.DataFrame:
    """
    Generates all ML features on the district-month panel.
    
    Args:
        panel_df: Balanced 46,080-row panel DataFrame.
        engine: SQLAlchemy Engine for loading demographics.
        
    Returns:
        pd.DataFrame: Augmented DataFrame with features, target, and split labels.
    """
    logger.info("Starting feature engineering on panel (%d rows)...", len(panel_df))
    df = panel_df.copy()

    # 1. Ensure deterministic chronological sort per district
    df["period_date"] = pd.to_datetime(df["period"])
    df = df.sort_values(["district_id", "period_date"]).reset_index(drop=True)

    # 2. Calendar and Cyclical Features
    df["quarter"] = ((df["month"] - 1) // 3 + 1).astype(int)
    df["year_index"] = (df["year"] - 2020).astype(int)
    df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12).round(6)
    df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12).round(6)

    # 3. Autoregressive Lags (Strictly backward-looking)
    grouped = df.groupby("district_id")["incident_count"]
    df["lag_1"] = grouped.shift(1)
    df["lag_2"] = grouped.shift(2)
    df["lag_3"] = grouped.shift(3)
    df["lag_12"] = grouped.shift(12)

    # 4. Trailing Rolling Statistics (Shifted by 1 so current month is NEVER in window)
    # Using shift(1) guarantees that the rolling window over t uses only [t-W, ..., t-1]
    shifted = grouped.shift(1)
    df["rolling_mean_3"] = (
        shifted.groupby(df["district_id"]).rolling(3).mean().reset_index(level=0, drop=True).round(4)
    )
    df["rolling_mean_6"] = (
        shifted.groupby(df["district_id"]).rolling(6).mean().reset_index(level=0, drop=True).round(4)
    )
    df["rolling_mean_12"] = (
        shifted.groupby(df["district_id"]).rolling(12).mean().reset_index(level=0, drop=True).round(4)
    )
    df["rolling_std_6"] = (
        shifted.groupby(df["district_id"]).rolling(6).std().reset_index(level=0, drop=True).fillna(0.0).round(4)
    )

    # 5. Merge Census 2011 Static Demographics
    df_demo = load_census_demographics(engine)
    df = pd.merge(df, df_demo, on="district_id", how="left")

    # 6. Trailing Historical Crime Rate (Strictly prior-12-months volume per 100k citizens)
    df["historical_crime_rate_per_100k"] = (
        (df["rolling_mean_12"] / df["total_population"]) * 100000
    ).round(4)

    # 7. Isolated Target Definition
    df[TARGET_COLUMN] = df["incident_count"].astype(int)

    # 8. Chronological Split Labels
    # 2020: WARMUP (used to populate lag_12 and rolling_mean_12 for 2021)
    # 2021-2023: TRAIN (36 months)
    # 2024: VALIDATION (12 months)
    # 2025: TEST (12 months)
    conditions = [
        df["year"] == 2020,
        df["year"].between(2021, 2023),
        df["year"] == 2024,
        df["year"] == 2025,
    ]
    choices = ["WARMUP", "TRAIN", "VALIDATION", "TEST"]
    df["split"] = np.select(conditions, choices, default="UNKNOWN")

    # 9. Automated Data Quality and Leakage Assertions
    assert TARGET_COLUMN not in FEATURE_COLUMNS, "Target column accidentally listed in FEATURE_COLUMNS!"
    for forbidden in FORBIDDEN_LEAKAGE_COLUMNS:
        assert forbidden not in FEATURE_COLUMNS, f"Forbidden leakage column {forbidden} present in FEATURE_COLUMNS!"
        assert forbidden not in df.columns, f"Forbidden leakage column {forbidden} present in dataset!"

    # Verify lag shift strictly precedes target
    # For a sample district, lag_1 at index 1 must equal incident_count at index 0
    sample_district_df = df[df["district_id"] == df["district_id"].iloc[0]].sort_values("period_date")
    assert sample_district_df["lag_1"].iloc[1] == sample_district_df["incident_count"].iloc[0], (
        "Lag_1 does not match previous month incident count!"
    )
    assert sample_district_df["lag_12"].iloc[12] == sample_district_df["incident_count"].iloc[0], (
        "Lag_12 does not match previous year month incident count!"
    )

    logger.info("Feature engineering complete. Total rows: %d.", len(df))
    return df


def prepare_modeling_dataset(df_features: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Filters out warm-up rows to produce the clean, fully populated dataset for supervised learning.
    
    Returns:
        Tuple[pd.DataFrame, Dict]: Clean DataFrame (38,400 rows) and split metadata.
    """
    warmup_count = int((df_features["split"] == "WARMUP").sum())
    expected_warmup = EXPECTED_DISTRICTS_COUNT * 12  # 640 districts * 12 months in 2020 = 7,680
    assert warmup_count == expected_warmup, (
        f"Warmup row count mismatch: expected {expected_warmup}, got {warmup_count}"
    )

    clean_df = df_features[df_features["split"] != "WARMUP"].copy()
    expected_clean = EXPECTED_PANEL_ROWS - expected_warmup  # 38,400
    assert len(clean_df) == expected_clean, (
        f"Clean modeling row count mismatch: expected {expected_clean}, got {len(clean_df)}"
    )

    # Verify no NaNs in any feature column
    nan_counts = clean_df[FEATURE_COLUMNS].isna().sum()
    columns_with_nans = nan_counts[nan_counts > 0]
    assert len(columns_with_nans) == 0, f"NaNs detected in feature columns: {columns_with_nans.to_dict()}"

    # Split row counts
    train_count = int((clean_df["split"] == "TRAIN").sum())
    val_count = int((clean_df["split"] == "VALIDATION").sum())
    test_count = int((clean_df["split"] == "TEST").sum())

    metadata = {
        "total_panel_rows": len(df_features),
        "warmup_rows_removed": warmup_count,
        "clean_modeling_rows": len(clean_df),
        "feature_count": len(FEATURE_COLUMNS),
        "feature_names": FEATURE_COLUMNS,
        "target_name": TARGET_COLUMN,
        "split_counts": {
            "TRAIN": train_count,         # 23,040 rows (2021-2023)
            "VALIDATION": val_count,      # 7,680 rows (2024)
            "TEST": test_count,           # 7,680 rows (2025)
        },
        "walk_forward_folds": {
            "fold_1": {
                "train_years": [2021, 2022],
                "val_year": 2023,
                "train_rows": EXPECTED_DISTRICTS_COUNT * 24,
                "val_rows": EXPECTED_DISTRICTS_COUNT * 12,
            },
            "fold_2": {
                "train_years": [2021, 2022, 2023],
                "val_year": 2024,
                "train_rows": EXPECTED_DISTRICTS_COUNT * 36,
                "val_rows": EXPECTED_DISTRICTS_COUNT * 12,
            },
            "fold_3": {
                "train_years": [2021, 2022, 2023, 2024],
                "test_year": 2025,
                "train_rows": EXPECTED_DISTRICTS_COUNT * 48,
                "test_rows": EXPECTED_DISTRICTS_COUNT * 12,
            },
        },
    }

    logger.info(
        "Modeling dataset ready: %d rows (Train: %d, Val: %d, Test: %d). Warmup removed: %d rows.",
        len(clean_df),
        train_count,
        val_count,
        test_count,
        warmup_count,
    )
    return clean_df, metadata


def run_pipeline(output_path: str = "ml/data/panel_features_2020_2025.parquet") -> pd.DataFrame:
    """
    Executes the complete pipeline: builds panel, generates features, validates assertions, and saves artifact.
    """
    panel_df = build_district_month_panel()
    features_df = generate_features(panel_df)
    clean_df, metadata = prepare_modeling_dataset(features_df)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    clean_df.to_parquet(output_path, index=False)
    logger.info("Saved clean modeling feature dataset to %s (%d rows).", output_path, len(clean_df))

    return clean_df


if __name__ == "__main__":
    logger.info("Executing ML feature pipeline...")
    clean_modeling_df = run_pipeline()
    
    print("\n" + "=" * 65)
    print("PHASE 8B: ML FEATURE PIPELINE EXECUTION VERIFICATION")
    print("=" * 65)
    print(f"Total Clean Modeling Rows:    {len(clean_modeling_df):,}")
    print(f"Total Engineered Features:    {len(FEATURE_COLUMNS)}")
    print(f"Target Column:                {TARGET_COLUMN}")
    print(f"Train Rows (2021–2023):       {(clean_modeling_df['split'] == 'TRAIN').sum():,}")
    print(f"Validation Rows (2024):       {(clean_modeling_df['split'] == 'VALIDATION').sum():,}")
    print(f"Test Rows (2025):             {(clean_modeling_df['split'] == 'TEST').sum():,}")
    print(f"Target Incident Count Sum:    {clean_modeling_df[TARGET_COLUMN].sum():,}")
    print(f"Output Parquet Path:          ml/data/panel_features_2020_2025.parquet")
    print("=" * 65)
