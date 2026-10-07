"""
Database Migration: Create state_resources table.

Establishes an authoritative state-level police resource registry linking
directly to modern states (states.id) and resource types (resource_types.id).
Preserves native BPR&D / MHA State-level geographic reporting without
synthetic disaggregation to districts.
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from backend.app.database.session import SessionLocal


def migrate_state_resources():
    db = SessionLocal()
    try:
        # Check if table already exists
        existing_tables = [r[0] for r in db.execute(text("SHOW TABLES")).fetchall()]
        if "state_resources" in existing_tables:
            print("Table 'state_resources' already exists.")
            return

        create_table_sql = """
        CREATE TABLE state_resources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            state_id INT NOT NULL,
            resource_type_id INT NOT NULL,
            sanctioned_quantity INT NULL,
            actual_quantity INT NULL,
            available_quantity INT NOT NULL,
            reference_year SMALLINT NOT NULL,
            source_name VARCHAR(150) NOT NULL,
            source_publication VARCHAR(255) NOT NULL,
            source_url VARCHAR(255) NULL,
            source_geography VARCHAR(50) NOT NULL DEFAULT 'STATE',
            data_as_of DATE NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_state_res_state FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE RESTRICT,
            CONSTRAINT fk_state_res_type FOREIGN KEY (resource_type_id) REFERENCES resource_types (id) ON DELETE RESTRICT,
            CONSTRAINT uq_state_res_period UNIQUE (state_id, resource_type_id, reference_year),
            INDEX idx_state_res_state (state_id),
            INDEX idx_state_res_type (resource_type_id),
            INDEX idx_state_res_year (reference_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        print("Creating table state_resources...")
        db.execute(text(create_table_sql))
        db.commit()
        print("Successfully created table 'state_resources'.")

    except Exception as e:
        db.rollback()
        print("Error during migration:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_state_resources()
