"""
Phase 10B: Database migration for resource_recommendations table.

Applies backward-compatible column additions to resource_recommendations
to support required quantity, surplus, availability tracking, priority metrics,
and methodology versioning under resource-v1.0.
"""

from sqlalchemy import text
from backend.app.database.session import SessionLocal


def migrate_resource_recommendations():
    db = SessionLocal()
    try:
        cols = [r[0] for r in db.execute(text("DESCRIBE resource_recommendations")).fetchall()]
        print("Existing columns:", cols)

        statements = []
        if "required_quantity" not in cols:
            statements.append("ADD COLUMN required_quantity INT NOT NULL DEFAULT 0 AFTER period_month")
        statements.append("MODIFY COLUMN available_quantity INT NULL DEFAULT NULL")
        if "surplus_quantity" not in cols:
            statements.append("ADD COLUMN surplus_quantity INT NOT NULL DEFAULT 0 AFTER shortfall_quantity")
        if "has_availability_data" not in cols:
            statements.append("ADD COLUMN has_availability_data TINYINT(1) NOT NULL DEFAULT 0 AFTER surplus_quantity")
        if "availability_status" not in cols:
            statements.append("ADD COLUMN availability_status VARCHAR(20) NOT NULL DEFAULT 'UNRECORDED' AFTER has_availability_data")
        if "priority_tier" not in cols:
            statements.append("ADD COLUMN priority_tier VARCHAR(20) NOT NULL DEFAULT 'LOW' AFTER availability_status")
        if "priority_score" not in cols:
            statements.append("ADD COLUMN priority_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER priority_tier")
        if "calculation_version" not in cols:
            statements.append("ADD COLUMN calculation_version VARCHAR(20) NOT NULL DEFAULT 'resource-v1.0' AFTER model_id")

        if statements:
            alter_sql = "ALTER TABLE resource_recommendations " + ", ".join(statements)
            print("Executing:", alter_sql)
            db.execute(text(alter_sql))
            db.commit()
            print("Columns updated successfully.")

        # Update unique constraint
        indexes = [r[2] for r in db.execute(text("SHOW INDEX FROM resource_recommendations")).fetchall()]
        print("Current indexes:", set(indexes))
        if "uq_district_resource_recom_period" in indexes:
            db.execute(text("ALTER TABLE resource_recommendations DROP INDEX uq_district_resource_recom_period"))
            db.execute(text("ALTER TABLE resource_recommendations ADD CONSTRAINT uq_district_resource_recom_period_version UNIQUE (district_id, resource_type_id, period_year, period_month, calculation_version)"))
            db.commit()
            print("Updated unique constraint to include calculation_version.")

        print("Migration complete!")
    except Exception as e:
        db.rollback()
        print("Error during migration:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_resource_recommendations()
