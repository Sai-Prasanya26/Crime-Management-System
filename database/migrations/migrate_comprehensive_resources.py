"""
Migration script for comprehensive police resources.
Safely expands resource_types, district_resources, and state_resources tables.
"""

import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.database.session import SessionLocal


def run_migration():
    db = SessionLocal()
    try:
        print("Starting comprehensive resources schema migration...")

        # 1. Expand resource_types
        columns_res_types = [c[0] for c in db.execute(text("DESC resource_types")).fetchall()]
        print(f"Existing resource_types columns: {columns_res_types}")

        if "code" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN code VARCHAR(50) NULL UNIQUE AFTER id"))
        if "category" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'PERSONNEL' AFTER resource_name"))
        if "is_personnel" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN is_personnel BOOLEAN NOT NULL DEFAULT FALSE"))
        if "is_vehicle" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN is_vehicle BOOLEAN NOT NULL DEFAULT FALSE"))
        if "is_team" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN is_team BOOLEAN NOT NULL DEFAULT FALSE"))
        if "is_equipment" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN is_equipment BOOLEAN NOT NULL DEFAULT FALSE"))
        if "is_infrastructure" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN is_infrastructure BOOLEAN NOT NULL DEFAULT FALSE"))
        if "created_at" not in columns_res_types:
            db.execute(text("ALTER TABLE resource_types ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))

        # Update base resource types (ids 1..4)
        db.execute(text("""
            UPDATE resource_types
            SET code = 'POLICE_PERSONNEL_ACTUAL', category = 'PERSONNEL', is_personnel = TRUE
            WHERE id = 1
        """))
        db.execute(text("""
            UPDATE resource_types
            SET code = 'PATROL_VEHICLES', category = 'MOBILITY', is_vehicle = TRUE
            WHERE id = 2
        """))
        db.execute(text("""
            UPDATE resource_types
            SET code = 'INVESTIGATION_TEAMS', category = 'INVESTIGATION', is_team = TRUE
            WHERE id = 3
        """))
        db.execute(text("""
            UPDATE resource_types
            SET code = 'SURVEILLANCE_TEAMS', category = 'SURVEILLANCE', is_team = TRUE
            WHERE id = 4
        """))
        db.commit()
        print("Updated base resource types (ids 1-4).")

        # 2. Expand district_resources
        columns_dist_res = [c[0] for c in db.execute(text("DESC district_resources")).fetchall()]
        print(f"Existing district_resources columns: {columns_dist_res}")

        if "actual_count" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN actual_count INT NULL AFTER resource_type_id"))
        if "sanctioned_count" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN sanctioned_count INT NULL AFTER actual_count"))
        if "required_count" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN required_count INT NULL AFTER sanctioned_count"))
        if "gap_count" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN gap_count INT NULL AFTER required_count"))
        if "reference_year" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN reference_year SMALLINT NOT NULL DEFAULT 2024 AFTER gap_count"))
        if "data_status" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN data_status VARCHAR(50) NOT NULL DEFAULT 'UNRECORDED' AFTER reference_year"))
        if "source_name" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN source_name VARCHAR(150) NULL AFTER data_status"))
        if "source_url" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN source_url VARCHAR(255) NULL AFTER source_name"))
        if "source_document" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN source_document VARCHAR(255) NULL AFTER source_url"))
        if "source_page" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN source_page VARCHAR(50) NULL AFTER source_document"))
        if "methodology" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN methodology VARCHAR(100) NULL AFTER source_page"))
        if "confidence_score" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN confidence_score DECIMAL(4, 2) NULL AFTER methodology"))
        if "created_at" not in columns_dist_res:
            db.execute(text("ALTER TABLE district_resources ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER confidence_score"))
        db.commit()
        print("Updated district_resources schema.")

        # 3. Expand state_resources
        columns_state_res = [c[0] for c in db.execute(text("DESC state_resources")).fetchall()]
        print(f"Existing state_resources columns: {columns_state_res}")

        if "actual_count" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN actual_count INT NULL AFTER resource_type_id"))
        if "sanctioned_count" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN sanctioned_count INT NULL AFTER actual_count"))
        if "required_count" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN required_count INT NULL AFTER sanctioned_count"))
        if "gap_count" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN gap_count INT NULL AFTER required_count"))
        if "data_status" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN data_status VARCHAR(50) NOT NULL DEFAULT 'OFFICIAL_STATE' AFTER reference_year"))
        if "source_document" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN source_document VARCHAR(255) NULL AFTER source_url"))
        if "source_page" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN source_page VARCHAR(50) NULL AFTER source_document"))
        if "methodology" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN methodology VARCHAR(100) NULL AFTER source_page"))
        if "confidence_score" not in columns_state_res:
            db.execute(text("ALTER TABLE state_resources ADD COLUMN confidence_score DECIMAL(4, 2) NULL AFTER methodology"))

        # Synchronize existing data
        db.execute(text("""
            UPDATE state_resources
            SET actual_count = actual_quantity,
                sanctioned_count = sanctioned_quantity,
                source_document = source_publication,
                data_status = 'OFFICIAL_STATE',
                confidence_score = 1.00
            WHERE actual_count IS NULL
        """))
        db.commit()
        print("Synchronized existing state_resources data.")

        print("Comprehensive resources schema migration complete.")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
