"""
Phase 8B: Database Migration for Crime Predictions.

Adds schema extensions for:
- forecast_status (HISTORICAL_EVALUATION, PAST_FORECAST, CURRENT_FUTURE_FORECAST)
- forecast_origin_date
- horizon_step
- prediction_interval_lower
- prediction_interval_upper
- is_latest

Idempotent: checks for existing columns before adding.
"""

import sys
import os
import logging

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import text
from backend.app.database.session import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def migrate_crime_predictions_schema():
    with engine.connect() as conn:
        # 1. Inspect existing columns
        result = conn.execute(text("DESCRIBE crime_predictions")).fetchall()
        existing_cols = {r[0] for r in result}
        logger.info("Existing columns in crime_predictions: %s", existing_cols)

        # 2. Add columns if missing
        alter_statements = []

        if "forecast_status" not in existing_cols:
            alter_statements.append(
                "ADD COLUMN forecast_status ENUM('HISTORICAL_EVALUATION', 'PAST_FORECAST', 'CURRENT_FUTURE_FORECAST') NOT NULL DEFAULT 'CURRENT_FUTURE_FORECAST'"
            )

        if "forecast_origin_date" not in existing_cols:
            alter_statements.append("ADD COLUMN forecast_origin_date DATE NULL")

        if "horizon_step" not in existing_cols:
            alter_statements.append("ADD COLUMN horizon_step SMALLINT NULL")

        if "prediction_interval_lower" not in existing_cols:
            alter_statements.append("ADD COLUMN prediction_interval_lower DECIMAL(10, 2) NULL")

        if "prediction_interval_upper" not in existing_cols:
            alter_statements.append("ADD COLUMN prediction_interval_upper DECIMAL(10, 2) NULL")

        if "is_latest" not in existing_cols:
            alter_statements.append("ADD COLUMN is_latest TINYINT(1) NOT NULL DEFAULT 1")

        if alter_statements:
            sql = f"ALTER TABLE crime_predictions {', '.join(alter_statements)}"
            logger.info("Executing schema migration: %s", sql)
            conn.execute(text(sql))
            conn.commit()
            logger.info("Successfully added missing columns.")
        else:
            logger.info("All Phase 8B columns already exist in crime_predictions.")

        # 3. Add indexes if missing
        indexes = conn.execute(text("SHOW INDEX FROM crime_predictions")).fetchall()
        existing_idx = {r[2] for r in indexes}

        if "idx_pred_status" not in existing_idx:
            logger.info("Adding index idx_pred_status...")
            conn.execute(text("ALTER TABLE crime_predictions ADD INDEX idx_pred_status (forecast_status)"))
            conn.commit()

        if "idx_pred_origin_date" not in existing_idx:
            logger.info("Adding index idx_pred_origin_date...")
            conn.execute(text("ALTER TABLE crime_predictions ADD INDEX idx_pred_origin_date (forecast_origin_date)"))
            conn.commit()

        if "idx_pred_is_latest" not in existing_idx:
            logger.info("Adding index idx_pred_is_latest...")
            conn.execute(text("ALTER TABLE crime_predictions ADD INDEX idx_pred_is_latest (is_latest)"))
            conn.commit()

        # 4. Classify existing records
        logger.info("Classifying existing prediction rows...")
        # Historical Evaluation (2025 and earlier)
        conn.execute(text("""
            UPDATE crime_predictions
            SET forecast_status = 'HISTORICAL_EVALUATION',
                forecast_origin_date = '2024-12-31',
                horizon_step = 0,
                is_latest = 1
            WHERE prediction_date <= '2025-12-31'
        """))

        # Past Forecasts (Jan 2026 to Oct 2026)
        conn.execute(text("""
            UPDATE crime_predictions
            SET forecast_status = 'PAST_FORECAST',
                forecast_origin_date = '2025-12-31',
                horizon_step = TIMESTAMPDIFF(MONTH, '2025-12-01', prediction_date),
                is_latest = 0
            WHERE prediction_date BETWEEN '2026-01-01' AND '2026-10-31'
        """))
        conn.commit()

        # Query summary
        status_counts = conn.execute(text("""
            SELECT forecast_status, is_latest, COUNT(*), MIN(prediction_date), MAX(prediction_date)
            FROM crime_predictions
            GROUP BY forecast_status, is_latest
        """)).fetchall()
        logger.info("Classification status summary:")
        for r in status_counts:
            logger.info("  Status: %s | is_latest: %s | Count: %d | Min: %s | Max: %s", r[0], r[1], r[2], r[3], r[4])


if __name__ == "__main__":
    migrate_crime_predictions_schema()
