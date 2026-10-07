"""
Official Police Resource Data Import Pipeline.

Imports authoritative BPR&D / MHA police personnel and fleet resources
from data_import/source_data/police_resources/bprd_dopo_state_resources.csv
into the MySQL state_resources table.

Maintains strict data integrity:
- Zero fabricated quantities.
- Exact mapping to modern active States/UTs.
- Idempotent upsert on (state_id, resource_type_id, reference_year).
- Unaltered historical crime incidents (191,679) and district demographics.
"""

import os
import sys
import csv
from datetime import datetime
from typing import Dict, Tuple, List, Any

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from backend.app.database.session import SessionLocal
from backend.app.models.geography import State
from backend.app.models.resources import ResourceType, StateResource
from backend.app.models.crime import CrimeIncident


CSV_PATH = os.path.join(
    "data_import", "source_data", "police_resources", "bprd_dopo_state_resources.csv"
)


def load_state_lookup(db) -> Dict[str, int]:
    """Loads state name to id mapping (uppercase normalized)."""
    states = db.query(State).all()
    lookup = {}
    for s in states:
        clean_name = s.state_name.strip().upper()
        lookup[clean_name] = s.id
        # Aliases for robust matching
        if clean_name == "NCT OF DELHI":
            lookup["DELHI"] = s.id
        elif clean_name == "ANDAMAN AND NICOBAR ISLANDS":
            lookup["ANDAMAN & NICOBAR ISLANDS"] = s.id
            lookup["A & N ISLANDS"] = s.id
        elif clean_name == "JAMMU AND KASHMIR":
            lookup["JAMMU & KASHMIR"] = s.id
        elif clean_name == "DADRA AND NAGAR HAVELI AND DAMAN AND DIU":
            lookup["DADRA & NAGAR HAVELI AND DAMAN & DIU"] = s.id
            lookup["D&NH AND DAMAN & DIU"] = s.id
    return lookup


def load_resource_type_lookup(db) -> Dict[str, int]:
    """Loads resource type name to id mapping."""
    rtypes = db.query(ResourceType).all()
    return {rt.resource_name.strip().upper(): rt.id for rt in rtypes}


def import_state_resources(csv_file_path: str = CSV_PATH) -> int:
    if not os.path.exists(csv_file_path):
        raise FileNotFoundError(f"Source file not found at: {csv_file_path}")

    db = SessionLocal()
    try:
        # Pre-import verification of historical crime incidents
        incident_count = db.query(CrimeIncident).count()
        print(f"Pre-import audit: Crime incidents count = {incident_count:,} (Expected: 191,679)")
        if incident_count != 191679:
            raise RuntimeError(f"Incident count mismatch before import: {incident_count}")

        state_map = load_state_lookup(db)
        type_map = load_resource_type_lookup(db)

        print(f"Loaded {len(state_map)} state aliases, {len(type_map)} resource types.")

        records_to_insert = []
        with open(csv_file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_idx, row in enumerate(reader, start=1):
                raw_state = row["state_name"].strip().upper()
                raw_type = row["resource_type_name"].strip().upper()

                if raw_state not in state_map:
                    raise ValueError(f"Row {row_idx}: Unknown state '{row['state_name']}'")
                if raw_type not in type_map:
                    raise ValueError(f"Row {row_idx}: Unknown resource type '{row['resource_type_name']}'")

                state_id = state_map[raw_state]
                resource_type_id = type_map[raw_type]

                sanc = int(row["sanctioned_quantity"]) if row["sanctioned_quantity"] else None
                act = int(row["actual_quantity"]) if row["actual_quantity"] else None
                avail = int(row["available_quantity"])
                ref_year = int(row["reference_year"])
                src_name = row["source_name"].strip()
                src_pub = row["source_publication"].strip()
                src_url = row["source_url"].strip() if row["source_url"] else None
                src_geo = row["source_geography"].strip()
                data_as_of = datetime.strptime(row["data_as_of"].strip(), "%Y-%m-%d").date()

                # Basic validation
                if sanc is not None and sanc < 0:
                    raise ValueError(f"Row {row_idx}: Negative sanctioned quantity: {sanc}")
                if act is not None and act < 0:
                    raise ValueError(f"Row {row_idx}: Negative actual quantity: {act}")
                if avail < 0:
                    raise ValueError(f"Row {row_idx}: Negative available quantity: {avail}")

                records_to_insert.append({
                    "state_id": state_id,
                    "resource_type_id": resource_type_id,
                    "sanctioned_quantity": sanc,
                    "actual_quantity": act,
                    "available_quantity": avail,
                    "reference_year": ref_year,
                    "source_name": src_name,
                    "source_publication": src_pub,
                    "source_url": src_url,
                    "source_geography": src_geo,
                    "data_as_of": data_as_of,
                })

        print(f"Validated {len(records_to_insert)} records from CSV. Performing idempotent upsert...")

        upsert_sql = text("""
            INSERT INTO state_resources (
                state_id,
                resource_type_id,
                sanctioned_quantity,
                actual_quantity,
                available_quantity,
                reference_year,
                source_name,
                source_publication,
                source_url,
                source_geography,
                data_as_of
            ) VALUES (
                :state_id,
                :resource_type_id,
                :sanctioned_quantity,
                :actual_quantity,
                :available_quantity,
                :reference_year,
                :source_name,
                :source_publication,
                :source_url,
                :source_geography,
                :data_as_of
            ) ON DUPLICATE KEY UPDATE
                sanctioned_quantity = VALUES(sanctioned_quantity),
                actual_quantity = VALUES(actual_quantity),
                available_quantity = VALUES(available_quantity),
                source_name = VALUES(source_name),
                source_publication = VALUES(source_publication),
                source_url = VALUES(source_url),
                source_geography = VALUES(source_geography),
                data_as_of = VALUES(data_as_of),
                updated_at = CURRENT_TIMESTAMP
        """)

        for rec in records_to_insert:
            db.execute(upsert_sql, rec)

        db.commit()

        # Post-import verification
        total_rows = db.query(StateResource).count()
        print(f"Total rows in state_resources: {total_rows}")

        # Verify Police Officers sums
        officers_sql = text("""
            SELECT 
                COUNT(*) as state_count,
                SUM(sanctioned_quantity) as total_sanc,
                SUM(actual_quantity) as total_act,
                SUM(available_quantity) as total_avail
            FROM state_resources
            WHERE resource_type_id = 1 AND reference_year = 2020
        """)
        officer_stats = db.execute(officers_sql).fetchone()
        print("\n--- Police Personnel Integrity Verification ---")
        print(f"States covered: {officer_stats[0]} / 36")
        print(f"Total Sanctioned: {int(officer_stats[1]):,} (Expected: 2,623,225)")
        print(f"Total Actual:     {int(officer_stats[2]):,} (Expected: 2,091,488)")
        print(f"Total Available:  {int(officer_stats[3]):,} (Expected: 2,091,488)")

        assert officer_stats[0] == 36, "Not all 36 active states covered!"
        assert int(officer_stats[1]) == 2623225, "Sanctioned sum mismatch!"
        assert int(officer_stats[2]) == 2091488, "Actual sum mismatch!"

        # Post-import audit of crime incidents
        post_incident_count = db.query(CrimeIncident).count()
        print(f"\nPost-import audit: Crime incidents count = {post_incident_count:,} (Expected: 191,679)")
        assert post_incident_count == 191679, "Crime incidents count changed!"

        print("\nOfficial police resource data successfully imported and verified!")
        return total_rows

    except Exception as e:
        db.rollback()
        print("Error during import:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import_state_resources()
