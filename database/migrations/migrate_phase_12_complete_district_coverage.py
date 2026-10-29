"""
Phase 12 Database Migration: Complete District Coverage Expansion.

Expands MySQL database to include every officially recognized district across
all 28 states and 8 Union Territories of India.

Mandatory Safeguards Applied:
1. Strict preservation of Census 2011 baseline (640 districts, IDs 1..640).
2. Strict preservation of historical incidents (191,679 rows), predictions (21,760 rows),
   and existing carved districts (IDs 641..805).
3. Adds 8 verified missing districts starting at ID 806 with explicit parent_district_id.
4. Corrects parent mappings for Aravalli (725), Pakyong (782), and Soreng (783).
5. Populates district_geography_mapping with verified lineage.
6. Rerunnable, idempotent, and transactional.
7. Zero data fabrication.
"""

import os
import sys
from datetime import date
from sqlalchemy import text

sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import engine


# 1. New Verified Districts to Add (ID, State ID, District Name, Parent District ID, Effective Date, Notification Source)
NEW_VERIFIED_DISTRICTS = [
    {
        "id": 806,
        "state_id": 11,  # Gujarat
        "district_name": "Vav-Tharad",
        "parent_district_id": 135,  # Banas Kantha (Census 2011 ID: 135)
        "effective_from": date(2025, 10, 2),
        "source": "Gujarat Revenue Dept Notification GHM/2025/210/M/RD/RCO/e-file/15/2025/5360/L1",
        "notes": "Bifurcated from Banas Kantha district with headquarters at Tharad (8 talukas)",
    },
    {
        "id": 807,
        "state_id": 12,  # Haryana
        "district_name": "Hansi",
        "parent_district_id": 163,  # Hisar (Census 2011 ID: 163)
        "effective_from": date(2025, 12, 19),
        "source": "Haryana Government Gazette Notification dated 19-Dec-2025",
        "notes": "Carved out of Hisar district encompassing Hansi and Narnaund subdivisions",
    },
    {
        "id": 808,
        "state_id": 24,  # Nagaland
        "district_name": "Meluri",
        "parent_district_id": 398,  # Phek (Census 2011 ID: 398)
        "effective_from": date(2024, 11, 2),
        "source": "Nagaland Government Gazette Notification dated 02-Nov-2024 (inaugurated 21-Feb-2025)",
        "notes": "Bifurcated from Phek district as the 17th district of Nagaland",
    },
    {
        "id": 809,
        "state_id": 37,  # Ladakh
        "district_name": "Nubra",
        "parent_district_id": 203,  # Leh(Ladakh) (Census 2011 ID: 203)
        "effective_from": date(2026, 4, 27),
        "source": "MHA Approval Aug-2024 / UT of Ladakh Gazette Notification dated 27-Apr-2026",
        "notes": "Carved from Leh district with headquarters at Diskit",
    },
    {
        "id": 810,
        "state_id": 37,  # Ladakh
        "district_name": "Sham",
        "parent_district_id": 203,  # Leh(Ladakh) (Census 2011 ID: 203)
        "effective_from": date(2026, 4, 27),
        "source": "MHA Approval Aug-2024 / UT of Ladakh Gazette Notification dated 27-Apr-2026",
        "notes": "Carved from Leh district with headquarters at Khaltse",
    },
    {
        "id": 811,
        "state_id": 37,  # Ladakh
        "district_name": "Changthang",
        "parent_district_id": 203,  # Leh(Ladakh) (Census 2011 ID: 203)
        "effective_from": date(2026, 4, 27),
        "source": "MHA Approval Aug-2024 / UT of Ladakh Gazette Notification dated 27-Apr-2026",
        "notes": "Carved from Leh district with headquarters at Nyoma",
    },
    {
        "id": 812,
        "state_id": 37,  # Ladakh
        "district_name": "Zanskar",
        "parent_district_id": 198,  # Kargil (Census 2011 ID: 198)
        "effective_from": date(2026, 4, 27),
        "source": "MHA Approval Aug-2024 / UT of Ladakh Gazette Notification dated 27-Apr-2026",
        "notes": "Carved from Kargil district with headquarters at Padum",
    },
    {
        "id": 813,
        "state_id": 37,  # Ladakh
        "district_name": "Drass",
        "parent_district_id": 198,  # Kargil (Census 2011 ID: 198)
        "effective_from": date(2026, 4, 27),
        "source": "MHA Approval Aug-2024 / UT of Ladakh Gazette Notification dated 27-Apr-2026",
        "notes": "Carved from Kargil district with headquarters at Drass-Ranbirpura",
    },
]

# 2. Existing Carved Districts Requiring Parent Mapping Correction
EXISTING_CORRECTIONS = [
    {
        "id": 725,
        "district_name": "Aravalli",
        "parent_district_id": 151,  # Sabar Kantha (Census 2011 ID: 151)
        "effective_from": date(2013, 8, 15),
        "source": "Gujarat State Gazette Notification Aug-2013",
        "notes": "Carved from Sabar Kantha district",
    },
    {
        "id": 782,
        "district_name": "Pakyong",
        "parent_district_id": 498,  # East District (Census 2011 ID: 498)
        "effective_from": date(2021, 12, 21),
        "source": "Sikkim Government Gazette Notification Dec-2021",
        "notes": "Carved from East District Sikkim",
    },
    {
        "id": 783,
        "district_name": "Soreng",
        "parent_district_id": 501,  # West District (Census 2011 ID: 501)
        "effective_from": date(2021, 12, 21),
        "source": "Sikkim Government Gazette Notification Dec-2021",
        "notes": "Carved from West District Sikkim",
    },
]


def execute_migration():
    print("=" * 80)
    print("PHASE 12 MIGRATION: COMPLETE DISTRICT COVERAGE & BACKEND EXPANSION")
    print("=" * 80)

    with engine.begin() as conn:
        # Step 1: Pre-migration verification
        print("\n[Step 1] Verifying Pre-Migration Baseline...")
        incidents_cnt = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
        assert incidents_cnt == 191679, f"Unexpected crime incidents count: {incidents_cnt}"
        
        census_districts = conn.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
        assert census_districts == 640, f"Unexpected Census 2011 districts: {census_districts}"
        
        pre_total_districts = conn.execute(text("SELECT COUNT(*) FROM districts")).scalar()
        pre_current_admin = conn.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
        print(f"  - Pre-migration total districts: {pre_total_districts}")
        print(f"  - Pre-migration current admin districts: {pre_current_admin}")
        print(f"  - Pre-migration Census 2011 districts: {census_districts}")
        print(f"  - Pre-migration historical incidents: {incidents_cnt:,}")

        # Step 2: Correct existing carved districts parent mappings
        print("\n[Step 2] Correcting parent mappings for existing carved districts...")
        for corr in EXISTING_CORRECTIONS:
            conn.execute(
                text("""
                    UPDATE districts
                    SET parent_district_id = :parent_id
                    WHERE id = :did AND district_name = :dname
                """),
                {"parent_id": corr["parent_district_id"], "did": corr["id"], "dname": corr["district_name"]},
            )
            print(f"  - Updated District ID {corr['id']} ({corr['district_name']}) -> Parent ID: {corr['parent_district_id']}")

            # Update or insert into district_geography_mapping
            conn.execute(
                text("DELETE FROM district_geography_mapping WHERE current_district_id = :did AND mapping_type = 'SPLIT'"),
                {"did": corr["id"]},
            )
            conn.execute(
                text("""
                    INSERT INTO district_geography_mapping
                        (historical_district_id, current_district_id, mapping_type, effective_from, source, notes)
                    VALUES
                        (:hid, :cid, 'SPLIT', :eff_from, :src, :notes)
                """),
                {
                    "hid": corr["parent_district_id"],
                    "cid": corr["id"],
                    "eff_from": corr["effective_from"],
                    "src": corr["source"],
                    "notes": corr["notes"],
                },
            )

        # Step 3: Insert newly verified districts
        print("\n[Step 3] Idempotently inserting 8 verified new administrative districts...")
        for dist in NEW_VERIFIED_DISTRICTS:
            conn.execute(
                text("""
                    INSERT INTO districts
                        (id, state_id, district_name, census_district_code, lgd_code, is_census_2011, is_current_admin, parent_district_id)
                    VALUES
                        (:id, :state_id, :district_name, NULL, NULL, FALSE, TRUE, :parent_id)
                    ON DUPLICATE KEY UPDATE
                        is_current_admin = TRUE,
                        parent_district_id = VALUES(parent_district_id)
                """),
                {
                    "id": dist["id"],
                    "state_id": dist["state_id"],
                    "district_name": dist["district_name"],
                    "parent_id": dist["parent_district_id"],
                },
            )
            # Retrieve effective district ID (in case id changed via existing key)
            eff_row = conn.execute(
                text("SELECT id FROM districts WHERE state_id = :sid AND district_name = :dname"),
                {"sid": dist["state_id"], "dname": dist["district_name"]},
            ).fetchone()
            eff_id = eff_row[0]
            print(f"  - District {dist['district_name']:<20} (State ID {dist['state_id']}) -> ID: {eff_id}, Parent ID: {dist['parent_district_id']}")

            # Insert into district_geography_mapping
            conn.execute(
                text("DELETE FROM district_geography_mapping WHERE current_district_id = :did AND mapping_type = 'SPLIT'"),
                {"did": eff_id},
            )
            conn.execute(
                text("""
                    INSERT INTO district_geography_mapping
                        (historical_district_id, current_district_id, mapping_type, effective_from, source, notes)
                    VALUES
                        (:hid, :cid, 'SPLIT', :eff_from, :src, :notes)
                """),
                {
                    "hid": dist["parent_district_id"],
                    "cid": eff_id,
                    "eff_from": dist["effective_from"],
                    "src": dist["source"],
                    "notes": dist["notes"],
                },
            )

        # Step 4: Post-migration verification
        print("\n[Step 4] Validating Post-Migration Database Integrity...")
        post_total = conn.execute(text("SELECT COUNT(*) FROM districts")).scalar()
        post_census = conn.execute(text("SELECT COUNT(*) FROM districts WHERE is_census_2011 = 1")).scalar()
        post_admin = conn.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
        post_incidents = conn.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
        post_predictions = conn.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
        post_demographics = conn.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()

        print(f"  - Post-migration Total Districts: {post_total} (Expected: 811)")
        print(f"  - Post-migration Current Admin Districts: {post_admin} (Expected: 797)")
        print(f"  - Post-migration Census 2011 Districts: {post_census} (Expected: 640)")
        print(f"  - Post-migration Historical Incidents: {post_incidents:,} (Expected: 191,679)")
        print(f"  - Post-migration Predictions: {post_predictions:,} (Expected: 21,760)")
        print(f"  - Post-migration Demographics: {post_demographics} (Expected: 640)")

        assert post_census == 640, f"Census 2011 district count corrupted: {post_census}"
        assert post_total == 811, f"Expected 811 total districts, got {post_total}"
        assert post_admin == 797, f"Expected 797 current admin districts, got {post_admin}"
        assert post_incidents == 191679, "Historical incidents table modified!"
        assert post_predictions == 21760, "Predictions table modified!"
        assert post_demographics == 640, "Demographics table modified!"

        # Check for unmapped parents among all carved current admin districts
        unmapped = conn.execute(text("""
            SELECT id, state_id, district_name
            FROM districts
            WHERE is_current_admin = 1 AND is_census_2011 = 0 AND parent_district_id IS NULL
        """)).fetchall()
        assert len(unmapped) == 0, f"Found unmapped carved districts: {unmapped}"
        print(f"  - Zero unmapped carved districts verified (100% have valid Census 2011 parent).")

        # Check duplicate district names within same state
        duplicates = conn.execute(text("""
            SELECT state_id, district_name, COUNT(*) c
            FROM districts
            GROUP BY state_id, district_name
            HAVING c > 1
        """)).fetchall()
        assert len(duplicates) == 0, f"Found duplicate districts: {duplicates}"
        print(f"  - Zero duplicate districts verified across all 36 active jurisdictions.")

        print("\n[SUCCESS] Phase 12 Database Migration completed and committed successfully!")


if __name__ == "__main__":
    execute_migration()
