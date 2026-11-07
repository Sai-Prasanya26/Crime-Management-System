"""
Task 2D Production Migration Script: Geographical Master Data Cleanup

Reconciles Indian States/UTs and District master data:
- Soft-deactivates 9 dissolved Rajasthan districts (is_current_admin: 1 -> 0)
- Applies 3 typographical/encoding corrections (North and Middle Andaman, Chumoukedima, Tseminyu)
- Adds missing operational district Lower Siang (ID 802, State 3, Parent 42, LGD 719) with lineage mapping
- Adds missing operational district Sankoo (ID 814, State 37, Parent 198, S.O. 284) with lineage mapping
- Preserves all 640 Census baseline districts, 191,679 incidents, 21,760 predictions, 640 demographics profiles
- Preserves 36 active States/UTs (State 9 Daman and Diu remains historical/inactive)
- Zero physical deletions of any existing district records

Usage:
  python database/migrations/execute_task_2d_cleanup.py            # Safe dry run (transaction rolled back)
  python database/migrations/execute_task_2d_cleanup.py --execute  # Apply changes atomically
  python database/migrations/execute_task_2d_cleanup.py --rollback           # Preview rollback
  python database/migrations/execute_task_2d_cleanup.py --rollback --execute # Execute rollback
"""

import sys
import os
import argparse
import datetime

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from backend.app.database.session import SessionLocal

# Target specifications
RAJASTHAN_DEACTIVATE_IDS = (765, 770, 771, 772, 773, 774, 777, 780, 781)

RENAME_SPECS = [
    {
        "id": 2,
        "state_id": 1,
        "old_name": "North  And Middle Andaman",
        "new_name": "North and Middle Andaman",
    },
    {
        "id": 755,
        "state_id": 24,
        "old_name": "Ch??moukedima",
        "new_name": "Chumoukedima",
    },
    {
        "id": 759,
        "state_id": 24,
        "old_name": "Tseminy??",
        "new_name": "Tseminyu",
    },
]

NEW_DISTRICTS = [
    {
        "id": 802,
        "state_id": 3,
        "district_name": "Lower Siang",
        "census_district_code": None,
        "lgd_code": 719,
        "is_census_2011": 0,
        "is_current_admin": 1,
        "parent_district_id": 42,
        "mapping": {
            "historical_district_id": 42,
            "current_district_id": 802,
            "mapping_type": "SPLIT",
            "effective_from": "2017-09-22",
            "source": "Arunachal Pradesh (Re-Organisation of Districts) (Amendment) Act, 2013",
            "notes": "Carved out of West Siang and East Siang with headquarters at Likabali.",
        },
    },
    {
        "id": 814,
        "state_id": 37,
        "district_name": "Sankoo",
        "census_district_code": None,
        "lgd_code": None,
        "is_census_2011": 0,
        "is_current_admin": 1,
        "parent_district_id": 198,
        "mapping": {
            "historical_district_id": 198,
            "current_district_id": 814,
            "mapping_type": "SPLIT",
            "effective_from": "2026-10-16",
            "source": "UT of Ladakh Notification S.O. 284 dated 16-Oct-2026",
            "notes": "Carved from Kargil district with headquarters at Sankoo in Suru Valley.",
        },
    },
]


def verify_pre_migration_state(db):
    """Verifies that the database matches the expected baseline prior to migration."""
    print("\n--- RUNNING PRE-MIGRATION VERIFICATIONS ---")

    # 1. Verify Database
    current_db = db.execute(text("SELECT DATABASE()")).scalar()
    print(f"Active database: {current_db}")
    if current_db != "crime_management_db":
        raise ValueError(f"Aborting: Expected database 'crime_management_db', connected to '{current_db}'")

    # 2. Verify District Counts
    total_dist = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
    active_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
    inactive_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 0")).scalar()
    census_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()

    print(f"District baseline: Total={total_dist}, Active={active_dist}, Inactive={inactive_dist}, Census2011={census_dist}")
    if total_dist != 811:
        raise ValueError(f"Aborting: Expected 811 total districts, found {total_dist}")
    if active_dist != 797:
        raise ValueError(f"Aborting: Expected 797 active districts, found {active_dist}")
    if inactive_dist != 14:
        raise ValueError(f"Aborting: Expected 14 inactive districts, found {inactive_dist}")
    if census_dist != 640:
        raise ValueError(f"Aborting: Expected 640 Census baseline districts, found {census_dist}")

    # 3. Verify Rajasthan 9 target districts
    rj_count = db.execute(
        text(f"SELECT COUNT(*) FROM districts WHERE id IN {RAJASTHAN_DEACTIVATE_IDS} AND state_id = 29 AND is_current_admin = 1")
    ).scalar()
    print(f"Rajasthan target districts verified active: {rj_count}/9")
    if rj_count != 9:
        raise ValueError(f"Aborting: Expected 9 active Rajasthan target districts, found {rj_count}")

    # Verify 0 dependencies for Rajasthan 9
    inc_count = db.execute(
        text(f"SELECT COUNT(*) FROM crime_incidents WHERE district_id IN {RAJASTHAN_DEACTIVATE_IDS}")
    ).scalar()
    pred_count = db.execute(
        text(f"SELECT COUNT(*) FROM crime_predictions WHERE district_id IN {RAJASTHAN_DEACTIVATE_IDS}")
    ).scalar()
    child_count = db.execute(
        text(f"SELECT COUNT(*) FROM districts WHERE parent_district_id IN {RAJASTHAN_DEACTIVATE_IDS}")
    ).scalar()
    if inc_count != 0 or pred_count != 0 or child_count != 0:
        raise ValueError(f"Aborting: Rajasthan target districts have dependent records (Incidents: {inc_count}, Predictions: {pred_count}, Children: {child_count})")

    # 4. Verify IDs 802 and 814 are unused
    for item in NEW_DISTRICTS:
        did = item["id"]
        d_exists = db.execute(text("SELECT COUNT(*) FROM districts WHERE id = :did"), {"did": did}).scalar()
        m_exists = db.execute(
            text("SELECT COUNT(*) FROM district_geography_mapping WHERE current_district_id = :did OR historical_district_id = :did"),
            {"did": did},
        ).scalar()
        if d_exists > 0:
            raise ValueError(f"Aborting: District ID #{did} already exists in districts table")
        if m_exists > 0:
            raise ValueError(f"Aborting: District ID #{did} already exists in district_geography_mapping table")

    # 5. Verify Rename Targets
    for item in RENAME_SPECS:
        row = db.execute(
            text("SELECT district_name, state_id FROM districts WHERE id = :id"),
            {"id": item["id"]},
        ).fetchone()
        if not row:
            raise ValueError(f"Aborting: Rename target district ID #{item['id']} not found")
        if row[0] != item["old_name"]:
            raise ValueError(f"Aborting: District ID #{item['id']} name is '{row[0]}', expected '{item['old_name']}'")
        if row[1] != item["state_id"]:
            raise ValueError(f"Aborting: District ID #{item['id']} state_id is {row[1]}, expected {item['state_id']}")

    # 6. Verify Baseline Core Data Invariants
    incidents = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
    preds = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
    demos = db.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()
    states_total = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
    states_active = db.execute(text("SELECT COUNT(*) FROM states WHERE is_active = 1")).scalar()
    mappings_total = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()
    reorg_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping WHERE mapping_type = 'REORGANIZED'")).scalar()

    print(f"Data invariants: Incidents={incidents:,}, Predictions={preds:,}, Demographics={demos:,}")
    print(f"Jurisdictions: Total={states_total}, Active={states_active}")
    print(f"Mappings: Total={mappings_total}, REORGANIZED={reorg_mappings}")

    if incidents != 191679:
        raise ValueError(f"Aborting: Expected 191,679 incidents, found {incidents}")
    if preds != 21760:
        raise ValueError(f"Aborting: Expected 21,760 predictions, found {preds}")
    if demos != 640:
        raise ValueError(f"Aborting: Expected 640 demographics, found {demos}")
    if states_total != 37 or states_active != 36:
        raise ValueError(f"Aborting: Expected 37 states (36 active), found {states_total} ({states_active} active)")
    if mappings_total != 797:
        raise ValueError(f"Aborting: Expected 797 mappings, found {mappings_total}")
    if reorg_mappings != 135:
        raise ValueError(f"Aborting: Expected 135 REORGANIZED mappings, found {reorg_mappings}")

    print("All pre-migration verifications passed successfully.")


def apply_migration(db):
    """Executes the cleanup operations inside the caller's transaction."""
    print("\n--- APPLYING DATABASE MODIFICATIONS ---")

    # 1. Soft-deactivate 9 dissolved Rajasthan districts
    print(f"1. Soft-deactivating 9 dissolved Rajasthan districts: {RAJASTHAN_DEACTIVATE_IDS}...")
    res = db.execute(
        text(f"UPDATE districts SET is_current_admin = 0 WHERE id IN {RAJASTHAN_DEACTIVATE_IDS} AND state_id = 29")
    )
    print(f"   Rows updated: {res.rowcount}")
    if res.rowcount != 9:
        raise ValueError(f"Update failed: expected 9 updated rows, got {res.rowcount}")

    # 2. Standardize typographical and encoding errors
    print("2. Standardizing typographical and character encoding errors...")
    for item in RENAME_SPECS:
        res = db.execute(
            text("UPDATE districts SET district_name = :new_name WHERE id = :id AND state_id = :state_id"),
            {"new_name": item["new_name"], "id": item["id"], "state_id": item["state_id"]},
        )
        print(f"   ID #{item['id']} ('{item['old_name']}' -> '{item['new_name']}'): {res.rowcount} row updated")
        if res.rowcount != 1:
            raise ValueError(f"Rename failed for ID #{item['id']}: updated {res.rowcount} rows")

    # 3. Insert Missing Operational Districts and Lineage Mappings
    print("3. Inserting missing operational districts and lineage mappings...")
    for item in NEW_DISTRICTS:
        did = item["id"]
        dname = item["district_name"]
        print(f"   Inserting District #{did} ('{dname}')...")
        db.execute(
            text("""
                INSERT INTO districts (
                    id, state_id, district_name, census_district_code, lgd_code,
                    is_census_2011, is_current_admin, parent_district_id
                ) VALUES (
                    :id, :state_id, :district_name, :census_district_code, :lgd_code,
                    :is_census_2011, :is_current_admin, :parent_district_id
                )
            """),
            {
                "id": did,
                "state_id": item["state_id"],
                "district_name": dname,
                "census_district_code": item["census_district_code"],
                "lgd_code": item["lgd_code"],
                "is_census_2011": item["is_census_2011"],
                "is_current_admin": item["is_current_admin"],
                "parent_district_id": item["parent_district_id"],
            },
        )

        m = item["mapping"]
        print(f"   Inserting Lineage Mapping for #{did} (Parent #{m['historical_district_id']} -> Current #{m['current_district_id']})...")
        db.execute(
            text("""
                INSERT INTO district_geography_mapping (
                    historical_district_id, current_district_id, mapping_type, effective_from, source, notes
                ) VALUES (
                    :historical_district_id, :current_district_id, :mapping_type, :effective_from, :source, :notes
                )
            """),
            {
                "historical_district_id": m["historical_district_id"],
                "current_district_id": m["current_district_id"],
                "mapping_type": m["mapping_type"],
                "effective_from": m["effective_from"],
                "source": m["source"],
                "notes": m["notes"],
            },
        )


def verify_post_migration_state(db):
    """Verifies that the database matches all target metrics within the active transaction."""
    print("\n--- RUNNING POST-MIGRATION VERIFICATIONS ---")

    # 1. Total and Active District Counts
    total_dist = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
    active_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
    inactive_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 0")).scalar()
    census_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()

    print(f"Post-migration districts: Total={total_dist} (exp: 813), Active={active_dist} (exp: 790), Inactive={inactive_dist} (exp: 23), Census2011={census_dist} (exp: 640)")
    if total_dist != 813:
        raise ValueError(f"Post-check failed: Expected 813 total districts, got {total_dist}")
    if active_dist != 790:
        raise ValueError(f"Post-check failed: Expected 790 active districts, got {active_dist}")
    if inactive_dist != 23:
        raise ValueError(f"Post-check failed: Expected 23 inactive districts, got {inactive_dist}")
    if census_dist != 640:
        raise ValueError(f"Post-check failed: Expected 640 Census baseline districts, got {census_dist}")

    # 2. State & UT Jurisdictions
    states_total = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
    states_active = db.execute(text("SELECT COUNT(*) FROM states WHERE is_active = 1")).scalar()
    daman_active = db.execute(text("SELECT is_active FROM states WHERE id = 9")).scalar()

    print(f"Post-migration jurisdictions: Total={states_total} (exp: 37), Active={states_active} (exp: 36), Daman & Diu is_active={daman_active} (exp: 0)")
    if states_total != 37 or states_active != 36:
        raise ValueError(f"Post-check failed: Expected 37 states (36 active), got {states_total} ({states_active} active)")
    if daman_active != 0:
        raise ValueError(f"Post-check failed: State #9 (Daman and Diu) must remain inactive (0), got {daman_active}")

    # 3. Core Preserved Analytics
    incidents = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
    preds = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
    demos = db.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()
    mappings_total = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()
    reorg_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping WHERE mapping_type = 'REORGANIZED'")).scalar()

    print(f"Preserved data: Incidents={incidents:,} (exp: 191,679), Predictions={preds:,} (exp: 21,760), Demographics={demos:,} (exp: 640)")
    print(f"Mappings: Total={mappings_total} (exp: 799), REORGANIZED={reorg_mappings} (exp: 135)")

    if incidents != 191679:
        raise ValueError(f"Post-check failed: Expected 191,679 incidents, got {incidents}")
    if preds != 21760:
        raise ValueError(f"Post-check failed: Expected 21,760 predictions, got {preds}")
    if demos != 640:
        raise ValueError(f"Post-check failed: Expected 640 demographics, got {demos}")
    if mappings_total != 799:
        raise ValueError(f"Post-check failed: Expected 799 mappings, got {mappings_total}")
    if reorg_mappings != 135:
        raise ValueError(f"Post-check failed: Expected 135 REORGANIZED mappings, got {reorg_mappings}")

    # 4. Verify Rajasthan 9 Inactive
    rj_active = db.execute(
        text(f"SELECT COUNT(*) FROM districts WHERE id IN {RAJASTHAN_DEACTIVATE_IDS} AND is_current_admin = 0")
    ).scalar()
    print(f"Rajasthan dissolved districts inactive: {rj_active}/9")
    if rj_active != 9:
        raise ValueError(f"Post-check failed: Expected 9 inactive Rajasthan districts, got {rj_active}")

    # 5. Verify Added Districts
    for item in NEW_DISTRICTS:
        did = item["id"]
        row = db.execute(
            text("SELECT id, district_name, state_id, lgd_code, parent_district_id, is_current_admin, is_census_2011 FROM districts WHERE id = :did"),
            {"did": did},
        ).fetchone()
        if not row:
            raise ValueError(f"Post-check failed: District #{did} not found")
        if row[1] != item["district_name"]:
            raise ValueError(f"Post-check failed: District #{did} name is '{row[1]}', expected '{item['district_name']}'")
        if row[2] != item["state_id"]:
            raise ValueError(f"Post-check failed: District #{did} state_id is {row[2]}, expected {item['state_id']}")
        if row[3] != item["lgd_code"]:
            raise ValueError(f"Post-check failed: District #{did} lgd_code is {row[3]}, expected {item['lgd_code']}")
        if row[4] != item["parent_district_id"]:
            raise ValueError(f"Post-check failed: District #{did} parent is {row[4]}, expected {item['parent_district_id']}")
        if row[5] != 1 or row[6] != 0:
            raise ValueError(f"Post-check failed: District #{did} flags invalid (is_current_admin={row[5]}, is_census_2011={row[6]})")

        # Verify mapping row
        m = item["mapping"]
        mrow = db.execute(
            text("""
                SELECT historical_district_id, current_district_id, mapping_type, source, notes
                FROM district_geography_mapping
                WHERE historical_district_id = :hid AND current_district_id = :cid
            """),
            {"hid": m["historical_district_id"], "cid": m["current_district_id"]},
        ).fetchone()
        if not mrow:
            raise ValueError(f"Post-check failed: Mapping row for #{did} not found")
        if mrow[2] != "SPLIT":
            raise ValueError(f"Post-check failed: Mapping type for #{did} is '{mrow[2]}', expected 'SPLIT'")

        print(f"Verified District #{did} ('{item['district_name']}') and lineage mapping OK")

    # 6. Verify Renamed Districts
    for item in RENAME_SPECS:
        name = db.execute(text("SELECT district_name FROM districts WHERE id = :id"), {"id": item["id"]}).scalar()
        print(f"Verified District #{item['id']} name: '{name}' (exp: '{item['new_name']}')")
        if name != item["new_name"]:
            raise ValueError(f"Post-check failed: District #{item['id']} name is '{name}', expected '{item['new_name']}'")

    print("All post-migration verifications passed successfully.")


def run_migration(db, dry_run=True):
    """Executes the migration within a controlled database transaction."""
    mode_str = "[DRY RUN - SAFE MODE]" if dry_run else "[EXECUTE MODE - LIVE MIGRATION]"
    print("=" * 80)
    print(f"TASK 2D DATABASE CLEANUP MIGRATION: {mode_str}")
    print("=" * 80)

    try:
        # Pre-checks before any changes
        verify_pre_migration_state(db)

        # Apply modifications
        apply_migration(db)

        # Post-checks within the active transaction
        verify_post_migration_state(db)

        if dry_run:
            db.rollback()
            print("\n" + "=" * 80)
            print("[DRY RUN COMPLETE] All pre-checks, migration steps, and post-checks PASSED.")
            print("Transaction rolled back cleanly. No changes were committed to the database.")
            print("To execute live migration, re-run with: --execute")
            print("=" * 80)
        else:
            db.commit()
            print("\n" + "=" * 80)
            print("[SUCCESS] All migration operations COMMITTED successfully to the database.")
            print("District master data now features 790 active districts across 36 active States/UTs.")
            print("=" * 80)
    except Exception as e:
        db.rollback()
        print(f"\n[FATAL ERROR] Migration failed. Transaction rolled back completely: {e}")
        raise e


def rollback_migration(db, dry_run=True):
    """Rolls back the migration changes to baseline state."""
    mode_str = "[DRY RUN - ROLLBACK PREVIEW]" if dry_run else "[EXECUTE ROLLBACK - RESTORING BASELINE]"
    print("=" * 80)
    print(f"TASK 2D ROLLBACK OPERATION: {mode_str}")
    print("=" * 80)

    try:
        # Check current state
        total_dist = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
        active_dist = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()

        if total_dist == 811 and active_dist == 797:
            print("Database is currently at initial baseline (811 districts, 797 active). Nothing to rollback.")
            return

        print(f"Current state prior to rollback: Total={total_dist}, Active={active_dist}")

        # 1. Remove lineage mappings for 802 and 814
        print("1. Removing lineage mappings for Lower Siang (#802) and Sankoo (#814)...")
        db.execute(text("DELETE FROM district_geography_mapping WHERE current_district_id IN (802, 814)"))

        # 2. Remove added districts 802 and 814
        print("2. Removing districts Lower Siang (#802) and Sankoo (#814)...")
        db.execute(text("DELETE FROM districts WHERE id IN (802, 814)"))

        # 3. Reactivate 9 Rajasthan districts
        print("3. Reactivating 9 Rajasthan districts...")
        db.execute(text(f"UPDATE districts SET is_current_admin = 1 WHERE id IN {RAJASTHAN_DEACTIVATE_IDS}"))

        # 4. Restore original district names
        print("4. Restoring original typographical names...")
        for item in RENAME_SPECS:
            db.execute(
                text("UPDATE districts SET district_name = :old_name WHERE id = :id"),
                {"old_name": item["old_name"], "id": item["id"]},
            )

        # 5. Verify restored state
        restored_total = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
        restored_active = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
        restored_inactive = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 0")).scalar()
        restored_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()

        print(f"Restored verification: Total={restored_total} (exp: 811), Active={restored_active} (exp: 797), Inactive={restored_inactive} (exp: 14), Mappings={restored_mappings} (exp: 797)")
        if restored_total != 811 or restored_active != 797 or restored_inactive != 14 or restored_mappings != 797:
            raise ValueError("Rollback verification failed: Counts do not match expected initial baseline")

        if dry_run:
            db.rollback()
            print("\n[ROLLBACK DRY RUN COMPLETE] Rollback operations tested and validated successfully.")
            print("Database rolled back cleanly. No changes committed.")
        else:
            db.commit()
            print("\n[SUCCESS] Rollback executed and committed. Database restored to baseline.")
    except Exception as e:
        db.rollback()
        print(f"\n[FATAL ERROR] Rollback failed. Transaction rolled back completely: {e}")
        raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Task 2D District Cleanup Migration")
    parser.add_argument("--execute", action="store_true", default=False, help="Commit changes to database (default is dry-run)")
    parser.add_argument("--rollback", action="store_true", default=False, help="Rollback migration changes")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.rollback:
            rollback_migration(db, dry_run=not args.execute)
        else:
            run_migration(db, dry_run=not args.execute)
    finally:
        db.close()
