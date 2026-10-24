"""
Phase 9: Database Migration for Crime Risk Scores.

Adds schema extensions for:
- score_type (ENUM('HISTORICAL', 'FORECAST') NOT NULL DEFAULT 'FORECAST')
- forecast_origin_date (DATE NULL)
- explanation_summary (TEXT NULL)
- index on (score_type, period_year, period_month)

Idempotent: checks for existing columns before altering.
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


def migrate_crime_risk_scores_schema():
    with engine.connect() as conn:
        # 1. Inspect existing columns
        result = conn.execute(text("DESCRIBE crime_risk_scores")).fetchall()
        existing_cols = {r[0] for r in result}
        logger.info("Existing columns in crime_risk_scores: %s", existing_cols)

        # 2. Add missing columns
        alter_statements = []

        if "score_type" not in existing_cols:
            alter_statements.append(
                "ADD COLUMN score_type ENUM('HISTORICAL', 'FORECAST') NOT NULL DEFAULT 'FORECAST'"
            )

        if "forecast_origin_date" not in existing_cols:
            alter_statements.append("ADD COLUMN forecast_origin_date DATE NULL")

        if "explanation_summary" not in existing_cols:
            alter_statements.append("ADD COLUMN explanation_summary TEXT NULL")

        if alter_statements:
            sql = f"ALTER TABLE crime_risk_scores {', '.join(alter_statements)}"
            logger.info("Executing migration: %s", sql)
            conn.execute(text(sql))
            conn.commit()
            logger.info("Schema columns added successfully.")
        else:
            logger.info("All Phase 9 columns already exist.")

        # 3. Add index on score_type if not present
        idxs = conn.execute(text("SHOW INDEX FROM crime_risk_scores")).fetchall()
        idx_names = {i[2] for i in idxs}
        if "idx_risk_score_type" not in idx_names:
            logger.info("Creating index idx_risk_score_type...")
            conn.execute(text("CREATE INDEX idx_risk_score_type ON crime_risk_scores (score_type, period_year, period_month)"))
            conn.commit()
            logger.info("Index idx_risk_score_type created.")

        # 4. Verify existing 2026-01 records have score_type = 'FORECAST'
        conn.execute(text("UPDATE crime_risk_scores SET score_type = 'FORECAST' WHERE period_year = 2026 AND period_month = 1 AND (score_type IS NULL OR score_type = 'FORECAST')"))
        conn.commit()

        # 5. Summary
        total = conn.execute(text("SELECT COUNT(*) FROM crime_risk_scores")).scalar()
        logger.info("Migration complete. Total records in crime_risk_scores: %d", total)


if __name__ == "__main__":
    migrate_crime_risk_scores_schema()
