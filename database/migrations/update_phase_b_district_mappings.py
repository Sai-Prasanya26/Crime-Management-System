"""
Phase B Maintenance Script: District Mapping Corrections (Option A)

Targeted corrections for:
1. Mapping ID 1182: Historical Prakasam (#18) -> Markapuram (#804)
   - mapping_percentage: 35.00 -> NULL
2. Mapping ID 1183: Historical East Godavari (#7) -> Polavaram (#805)
   - mapping_percentage: 30.00 -> NULL
3. Mapping ID 6: East Godavari (#7) -> East Godavari (#7)
   - mapping_type: SAME -> REORGANIZED
   - notes: Updated to explain residual parent jurisdiction post-reorganization
4. Mapping ID 10: Prakasam (#18) -> Prakasam (#18)
   - mapping_type: SAME -> REORGANIZED
   - notes: Updated to explain residual parent jurisdiction post-reorganization

Safety Features:
- Exact ID matching for all 4 rows (mapping ID, historical_district_id, current_district_id).
- Pre-update and post-update transactional verification.
- Explicit db.rollback() on any error or assertion failure before commit.
- Rollback path pre-verifies Phase B values before restoring original values.
- Zero credentials logged or exposed.
- All other 793 mapping rows, parent-district IDs, census baseline records,
  incident counts, demographics, and model predictions remain strictly untouched.
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.abspath("."))

from decimal import Decimal
from sqlalchemy import text
from backend.app.database.session import SessionLocal


# Expected Baseline State (before Phase B update)
EXPECTED_BEFORE_STATE = {
    6: {
        "historical_district_id": 7,
        "current_district_id": 7,
        "mapping_type": "SAME",
        "mapping_percentage": None,
    },
    10: {
        "historical_district_id": 18,
        "current_district_id": 18,
        "mapping_type": "SAME",
        "mapping_percentage": None,
    },
    1182: {
        "historical_district_id": 18,
        "current_district_id": 804,
        "mapping_type": "SPLIT",
        "mapping_percentage": Decimal("35.00"),
    },
    1183: {
        "historical_district_id": 7,
        "current_district_id": 805,
        "mapping_type": "SPLIT",
        "mapping_percentage": Decimal("30.00"),
    },
}

# Target State (Phase B Option A corrections)
TARGET_UPDATES = {
    6: {
        "historical_district_id": 7,
        "current_district_id": 7,
        "mapping_type": "REORGANIZED",
        "mapping_percentage": None,
        "notes": "Residual parent jurisdiction following administrative boundary reorganizations (Kakinada and Konaseema carved in 2022).",
    },
    10: {
        "historical_district_id": 18,
        "current_district_id": 18,
        "mapping_type": "REORGANIZED",
        "mapping_percentage": None,
        "notes": "Residual parent jurisdiction following administrative boundary reorganizations (Markapuram carved in 2025; Bapatla and Nellore transfers in 2022).",
    },
    1182: {
        "historical_district_id": 18,
        "current_district_id": 804,
        "mapping_type": "SPLIT",
        "mapping_percentage": None,
        "notes": "Formed by merging Markapuram and Kanigiri divisions of Prakasam district.",
    },
    1183: {
        "historical_district_id": 7,
        "current_district_id": 805,
        "mapping_type": "SPLIT",
        "mapping_percentage": None,
        "notes": "Carved out of Alluri Sitharama Raju / East Godavari with HQ at Rampachodavaram.",
    },
}

# Rollback State (restores exact original values)
ROLLBACK_UPDATES = {
    6: {
        "historical_district_id": 7,
        "current_district_id": 7,
        "mapping_type": "SAME",
        "mapping_percentage": None,
        "notes": "Administrative boundaries unchanged since 2011",
    },
    10: {
        "historical_district_id": 18,
        "current_district_id": 18,
        "mapping_type": "SAME",
        "mapping_percentage": None,
        "notes": "Administrative boundaries unchanged since 2011",
    },
    1182: {
        "historical_district_id": 18,
        "current_district_id": 804,
        "mapping_type": "SPLIT",
        "mapping_percentage": Decimal("35.00"),
        "notes": "Formed by merging Markapuram and Kanigiri divisions of Prakasam district.",
    },
    1183: {
        "historical_district_id": 7,
        "current_district_id": 805,
        "mapping_type": "SPLIT",
        "mapping_percentage": Decimal("30.00"),
        "notes": "Carved out of Alluri Sitharama Raju / East Godavari with HQ at Rampachodavaram.",
    },
}


def verify_pre_update_integrity(db):
    """Verifies that the target rows exist and match expected pre-conditions."""
    rows = db.execute(
        text("""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage 
            FROM district_geography_mapping 
            WHERE id IN (6, 10, 1182, 1183)
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 4:
        raise ValueError(f"Pre-check failed: Expected exactly 4 target rows, found {len(rows)}.")

    for r in rows:
        rid = r.id
        exp = EXPECTED_BEFORE_STATE[rid]
        if r.historical_district_id != exp["historical_district_id"]:
            raise ValueError(f"Pre-check failed for row {rid}: historical_district_id mismatch. Found: {r.historical_district_id}, Expected: {exp['historical_district_id']}")
        if r.current_district_id != exp["current_district_id"]:
            raise ValueError(f"Pre-check failed for row {rid}: current_district_id mismatch. Found: {r.current_district_id}, Expected: {exp['current_district_id']}")
        if r.mapping_type != exp["mapping_type"]:
            raise ValueError(f"Pre-check failed for row {rid}: mapping_type mismatch. Found: {r.mapping_type}, Expected: {exp['mapping_type']}")
        
        # Percentage comparison (handling Decimal / None)
        curr_pct = Decimal(str(r.mapping_percentage)) if r.mapping_percentage is not None else None
        exp_pct = exp["mapping_percentage"]
        if curr_pct != exp_pct:
            raise ValueError(f"Pre-check failed for row {rid}: mapping_percentage mismatch. Found: {curr_pct}, Expected: {exp_pct}")

    print(" -> Pre-update verification PASSED: All 4 target rows match expected baseline values.")


def verify_post_update_integrity(db):
    """Verifies that all 4 target rows have the new expected values and no other rows were affected."""
    rows = db.execute(
        text("""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage, notes
            FROM district_geography_mapping 
            WHERE id IN (6, 10, 1182, 1183)
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 4:
        raise ValueError(f"Post-update verification failed: Expected exactly 4 rows, found {len(rows)}.")

    for r in rows:
        rid = r.id
        target = TARGET_UPDATES[rid]
        if r.historical_district_id != target["historical_district_id"]:
            raise ValueError(f"Post-update failed for row {rid}: historical_district_id mismatch.")
        if r.current_district_id != target["current_district_id"]:
            raise ValueError(f"Post-update failed for row {rid}: current_district_id mismatch.")
        if r.mapping_type != target["mapping_type"]:
            raise ValueError(f"Post-update failed for row {rid}: mapping_type is {r.mapping_type}, expected {target['mapping_type']}.")
        if r.mapping_percentage is not None:
            raise ValueError(f"Post-update failed for row {rid}: mapping_percentage is {r.mapping_percentage}, expected NULL.")
        if r.notes != target["notes"]:
            raise ValueError(f"Post-update failed for row {rid}: notes mismatch.")

    # Global table invariant check: total rows in district_geography_mapping must still be 797
    total_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()
    if total_mappings != 797:
        raise ValueError(f"Post-update global check failed: Total mappings count changed! Found {total_mappings}, expected 797.")

    # Total non-null percentages in the entire table must now be 0
    non_null_pcts = db.execute(text("SELECT COUNT(mapping_percentage) FROM district_geography_mapping")).scalar()
    if non_null_pcts != 0:
        raise ValueError(f"Post-update global check failed: Non-null mapping percentages remain! Found {non_null_pcts}, expected 0.")

    print(" -> Post-update verification PASSED: All 4 rows successfully updated, global invariants verified.")


def verify_pre_rollback_integrity(db):
    """Verifies that the target rows currently match the Phase B target state before allowing rollback."""
    rows = db.execute(
        text("""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage 
            FROM district_geography_mapping 
            WHERE id IN (6, 10, 1182, 1183)
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 4:
        raise ValueError(f"Pre-rollback check failed: Expected exactly 4 target rows, found {len(rows)}.")

    for r in rows:
        rid = r.id
        target = TARGET_UPDATES[rid]
        if r.historical_district_id != target["historical_district_id"] or r.current_district_id != target["current_district_id"]:
            raise ValueError(f"Pre-rollback check failed for row {rid}: District ID mismatch.")
        if r.mapping_type != target["mapping_type"]:
            raise ValueError(f"Pre-rollback check failed for row {rid}: mapping_type mismatch (found {r.mapping_type}, expected {target['mapping_type']}).")
        if r.mapping_percentage is not None:
            raise ValueError(f"Pre-rollback check failed for row {rid}: mapping_percentage is not NULL.")

    print(" -> Pre-rollback verification PASSED: Rows match Phase B state and are eligible for rollback.")


def verify_post_rollback_integrity(db):
    """Verifies that the target rows have been completely restored to the baseline state."""
    rows = db.execute(
        text("""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage, notes
            FROM district_geography_mapping 
            WHERE id IN (6, 10, 1182, 1183)
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 4:
        raise ValueError(f"Post-rollback verification failed: Expected 4 rows, found {len(rows)}.")

    for r in rows:
        rid = r.id
        exp = ROLLBACK_UPDATES[rid]
        if r.mapping_type != exp["mapping_type"]:
            raise ValueError(f"Post-rollback failed for row {rid}: mapping_type mismatch.")
        curr_pct = Decimal(str(r.mapping_percentage)) if r.mapping_percentage is not None else None
        if curr_pct != exp["mapping_percentage"]:
            raise ValueError(f"Post-rollback failed for row {rid}: mapping_percentage mismatch.")
        if r.notes != exp["notes"]:
            raise ValueError(f"Post-rollback failed for row {rid}: notes mismatch.")

    print(" -> Post-rollback verification PASSED: All 4 rows successfully restored to original baseline.")


def apply_updates(db, dry_run=True):
    """Applies Option A corrections with strict transactional safety."""
    print("\n" + "=" * 70)
    print(f"PHASE B CORRECTIONS: {'[DRY RUN - READ ONLY]' if dry_run else '[APPLYING DATABASE UPDATES]'}")
    print("=" * 70)

    verify_pre_update_integrity(db)

    print("\nPlanned Row Changes:")
    for rid, fields in TARGET_UPDATES.items():
        exp = EXPECTED_BEFORE_STATE[rid]
        print(f" -> Mapping ID {rid} (Historical #{fields['historical_district_id']} -> Current #{fields['current_district_id']}):")
        print(f"    mapping_type:       '{exp['mapping_type']}' -> '{fields['mapping_type']}'")
        print(f"    mapping_percentage: {exp['mapping_percentage']} -> NULL")
        print(f"    notes:              '{fields['notes']}'")

    if dry_run:
        print("\nDry run completed successfully. No changes written to database.")
        return

    try:
        # Execute updates inside transaction
        for rid, fields in TARGET_UPDATES.items():
            db.execute(
                text("""
                    UPDATE district_geography_mapping
                    SET mapping_type = :mtype,
                        mapping_percentage = :pct,
                        notes = :notes
                    WHERE id = :rid
                      AND historical_district_id = :hid
                      AND current_district_id = :cid
                """),
                {
                    "mtype": fields["mapping_type"],
                    "pct": fields["mapping_percentage"],
                    "notes": fields["notes"],
                    "rid": rid,
                    "hid": fields["historical_district_id"],
                    "cid": fields["current_district_id"],
                },
            )

        # Run post-update checks inside the active transaction
        verify_post_update_integrity(db)

        # Commit only after all 4 updates and post-checks pass
        db.commit()
        print("\nSUCCESS: All 4 updates committed to database.")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Update failed, transaction rolled back completely: {e}")
        raise e


def rollback_updates(db, dry_run=True):
    """Restores the exact previous baseline values for IDs 6, 10, 1182, 1183."""
    print("\n" + "=" * 70)
    print(f"ROLLBACK CORRECTIONS: {'[DRY RUN - READ ONLY]' if dry_run else '[APPLYING ROLLBACK]'}")
    print("=" * 70)

    verify_pre_rollback_integrity(db)

    print("\nPlanned Rollback Changes:")
    for rid, fields in ROLLBACK_UPDATES.items():
        print(f" -> Restoring Mapping ID {rid} (Historical #{fields['historical_district_id']} -> Current #{fields['current_district_id']}):")
        print(f"    mapping_type:       -> '{fields['mapping_type']}'")
        print(f"    mapping_percentage: -> {fields['mapping_percentage']}")
        print(f"    notes:              -> '{fields['notes']}'")

    if dry_run:
        print("\nRollback dry run completed successfully. No changes written to database.")
        return

    try:
        for rid, fields in ROLLBACK_UPDATES.items():
            db.execute(
                text("""
                    UPDATE district_geography_mapping
                    SET mapping_type = :mtype,
                        mapping_percentage = :pct,
                        notes = :notes
                    WHERE id = :rid
                      AND historical_district_id = :hid
                      AND current_district_id = :cid
                """),
                {
                    "mtype": fields["mapping_type"],
                    "pct": fields["mapping_percentage"],
                    "notes": fields["notes"],
                    "rid": rid,
                    "hid": fields["historical_district_id"],
                    "cid": fields["current_district_id"],
                },
            )

        verify_post_rollback_integrity(db)
        db.commit()
        print("\nSUCCESS: Rollback committed. Original baseline values restored.")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Rollback failed, transaction rolled back: {e}")
        raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase B District Mapping Corrections")
    parser.add_argument("--execute", action="store_true", default=False, help="Apply database changes (default is dry-run)")
    parser.add_argument("--rollback", action="store_true", default=False, help="Rollback changes to initial baseline state")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.rollback:
            rollback_updates(db, dry_run=not args.execute)
        else:
            apply_updates(db, dry_run=not args.execute)
    finally:
        db.close()
