"""
Phase 10.1 Migration: Validate Resource Allocation Assumptions.

Adds:
- optimization_runs.is_simulation (BOOLEAN NOT NULL DEFAULT FALSE)
- optimization_runs.allocation_mode (VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL')
- optimization_runs.data_validity (VARCHAR(50) NOT NULL DEFAULT 'VERIFIED')
- optimization_runs.transferable_pool (INTEGER NULL)
- optimization_allocations.baseline_status (VARCHAR(40) NOT NULL DEFAULT 'OFFICIAL_DISTRICT_DISCLOSED')

Preserves all historical runs and transparently marks pre-Phase 10.1 runs as:
data_validity = 'HISTORICAL_PRE_PHASE_10_1'
"""

import sys
sys.path.insert(0, ".")
from sqlalchemy import text
from backend.app.database.session import SessionLocal


def migrate_phase10_1():
    db = SessionLocal()
    try:
        print("Starting Phase 10.1 Database Migration...")

        # 1. Check existing columns in optimization_runs
        runs_cols = [c[0] for c in db.execute(text("DESCRIBE optimization_runs")).fetchall()]
        
        if "is_simulation" not in runs_cols:
            print("Adding column 'is_simulation' to optimization_runs...")
            db.execute(text("ALTER TABLE optimization_runs ADD COLUMN is_simulation BOOLEAN NOT NULL DEFAULT FALSE"))
            
        if "allocation_mode" not in runs_cols:
            print("Adding column 'allocation_mode' to optimization_runs...")
            db.execute(text("ALTER TABLE optimization_runs ADD COLUMN allocation_mode VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL'"))
            
        if "data_validity" not in runs_cols:
            print("Adding column 'data_validity' to optimization_runs...")
            db.execute(text("ALTER TABLE optimization_runs ADD COLUMN data_validity VARCHAR(50) NOT NULL DEFAULT 'VERIFIED'"))
            
        if "transferable_pool" not in runs_cols:
            print("Adding column 'transferable_pool' to optimization_runs...")
            db.execute(text("ALTER TABLE optimization_runs ADD COLUMN transferable_pool INTEGER NULL"))

        # 2. Check existing columns in optimization_allocations
        alloc_cols = [c[0] for c in db.execute(text("DESCRIBE optimization_allocations")).fetchall()]
        
        if "baseline_status" not in alloc_cols:
            print("Adding column 'baseline_status' to optimization_allocations...")
            db.execute(text("ALTER TABLE optimization_allocations ADD COLUMN baseline_status VARCHAR(40) NOT NULL DEFAULT 'OFFICIAL_DISTRICT_DISCLOSED'"))

        # 3. Transparently audit existing pre-Phase 10.1 runs without deleting historical data
        print("Transparently updating pre-Phase 10.1 historical runs with validity markers...")
        db.execute(text("""
            UPDATE optimization_runs 
            SET data_validity = 'HISTORICAL_PRE_PHASE_10_1'
            WHERE data_validity = 'VERIFIED' AND solver_status IN ('OPTIMAL', 'FEASIBLE')
        """))

        # Set baseline_status for existing allocation rows where baseline_quantity is NULL
        db.execute(text("""
            UPDATE optimization_allocations
            SET baseline_status = 'UNRECORDED_DATA_UNAVAILABLE'
            WHERE baseline_quantity IS NULL
        """))

        db.commit()
        print("[OK] Phase 10.1 Migration completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_phase10_1()
