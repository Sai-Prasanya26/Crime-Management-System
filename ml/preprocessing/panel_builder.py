"""
Phase 8B: District-Month Panel Construction Pipeline.

Converts the 191,679 raw crime incidents into a complete, balanced
cross-sectional time-series (panel) grid of 640 historical districts across
72 monthly periods (2020-01-01 through 2025-12-31), totaling 46,080 observations.

Zero-incident district-months are preserved with incident_count = 0.
"""

import sys
import os
import logging
from typing import Optional
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine as default_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

EXPECTED_DISTRICTS_COUNT = 640
EXPECTED_TOTAL_MONTHS = 72
EXPECTED_PANEL_ROWS = 46080
EXPECTED_TOTAL_INCIDENTS = 191679
HISTORICAL_START_DATE = "2020-01-01"
HISTORICAL_END_DATE = "2025-12-31"


def build_district_month_panel(engine: Optional[Engine] = None) -> pd.DataFrame:
    """
    Builds the complete balanced district-month panel from the MySQL database.
    
    Returns:
        pd.DataFrame: A DataFrame with 46,080 rows containing:
            - district_id (int)
            - state_id (int)
            - district_name (str)
            - state_name (str)
            - year (int)
            - month (int)
            - period (str: YYYY-MM-01)
            - period_date (pd.Timestamp)
            - incident_count (int)
    """
    db_engine = engine or default_engine
    logger.info("Connecting to MySQL to build district-month panel...")

    # 1. Fetch the 640 Census 2011 historical districts
    query_districts = """
        SELECT 
            d.id AS district_id,
            d.district_name,
            d.state_id,
            s.state_name
        FROM districts d
        JOIN states s ON d.state_id = s.id
        WHERE d.is_census_2011 = 1
        ORDER BY d.id ASC
    """
    with db_engine.connect() as conn:
        df_districts = pd.read_sql(text(query_districts), conn)
    
    num_districts = len(df_districts)
    logger.info("Loaded %d Census 2011 historical districts.", num_districts)
    if num_districts != EXPECTED_DISTRICTS_COUNT:
        raise ValueError(
            f"Geographic scope mismatch: expected {EXPECTED_DISTRICTS_COUNT} districts, got {num_districts}."
        )

    # 2. Fetch monthly incident aggregations from crime_incidents
    query_incidents = """
        SELECT 
            district_id,
            YEAR(incident_date) AS year,
            MONTH(incident_date) AS month,
            COUNT(*) AS incident_count
        FROM crime_incidents
        GROUP BY district_id, year, month
        ORDER BY district_id, year, month
    """
    with db_engine.connect() as conn:
        df_incidents = pd.read_sql(text(query_incidents), conn)
    
    total_db_incidents = int(df_incidents["incident_count"].sum())
    logger.info(
        "Aggregated %d active district-month cells representing %d total incidents.",
        len(df_incidents),
        total_db_incidents,
    )
    if total_db_incidents != EXPECTED_TOTAL_INCIDENTS:
        raise ValueError(
            f"Incident volume mismatch: expected {EXPECTED_TOTAL_INCIDENTS}, found {total_db_incidents}."
        )

    # 3. Construct the complete 72-month Cartesian grid (640 districts x 72 months)
    periods = pd.date_range(start="2020-01-01", end="2025-12-01", freq="MS")
    if len(periods) != EXPECTED_TOTAL_MONTHS:
        raise ValueError(f"Temporal grid mismatch: expected {EXPECTED_TOTAL_MONTHS} periods, got {len(periods)}.")

    district_ids = df_districts["district_id"].unique()
    grid_index = pd.MultiIndex.from_product(
        [district_ids, periods],
        names=["district_id", "period_date"],
    )
    grid_df = grid_index.to_frame().reset_index(drop=True)
    grid_df["year"] = grid_df["period_date"].dt.year
    grid_df["month"] = grid_df["period_date"].dt.month
    grid_df["period"] = grid_df["period_date"].dt.strftime("%Y-%m-01")

    # 4. Attach geographic attributes (district_name, state_id, state_name)
    panel = pd.merge(grid_df, df_districts, on="district_id", how="left")

    # 5. Left join aggregated incident counts and fill zero-incident months
    panel = pd.merge(panel, df_incidents, on=["district_id", "year", "month"], how="left")
    panel["incident_count"] = panel["incident_count"].fillna(0).astype(int)

    # 6. Sort deterministically by district_id and temporal sequence
    panel = panel.sort_values(["district_id", "period_date"]).reset_index(drop=True)

    # 7. Run Core Data Quality Assertions
    assert len(panel) == EXPECTED_PANEL_ROWS, (
        f"Panel size mismatch: expected {EXPECTED_PANEL_ROWS}, got {len(panel)}"
    )
    assert panel["incident_count"].sum() == EXPECTED_TOTAL_INCIDENTS, (
        f"Panel incident sum mismatch: expected {EXPECTED_TOTAL_INCIDENTS}, got {panel['incident_count'].sum()}"
    )
    assert (panel["incident_count"] >= 0).all(), "Negative incident counts detected!"
    assert panel.duplicated(subset=["district_id", "period"]).sum() == 0, (
        "Duplicate district-month records detected in panel!"
    )

    zero_count = int((panel["incident_count"] == 0).sum())
    active_count = int((panel["incident_count"] > 0).sum())
    logger.info(
        "Panel built successfully: %d rows (Active cells: %d, Zero-incident cells: %d).",
        len(panel),
        active_count,
        zero_count,
    )
    return panel


def save_panel(df: pd.DataFrame, output_path: str = "ml/data/district_month_panel.parquet") -> str:
    """
    Saves the generated panel DataFrame to disk.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_parquet(output_path, index=False)
    logger.info("Saved district-month panel to %s (%d rows).", output_path, len(df))
    return output_path


if __name__ == "__main__":
    logger.info("Executing panel builder module...")
    panel_df = build_district_month_panel()
    save_panel(panel_df)
    print("\n" + "=" * 60)
    print("PHASE 8B: DISTRICT-MONTH PANEL BUILDER VERIFICATION")
    print("=" * 60)
    print(f"Total Rows:            {len(panel_df):,}")
    print(f"Unique Districts:      {panel_df['district_id'].nunique():,}")
    print(f"Unique Months:         {panel_df['period'].nunique():,}")
    print(f"Date Range:            {panel_df['period'].min()} to {panel_df['period'].max()}")
    print(f"Total Incidents:       {panel_df['incident_count'].sum():,}")
    print(f"Zero-Incident Months:  {(panel_df['incident_count'] == 0).sum():,}")
    print("=" * 60)
