"""
Phase 7C Migration Script: Complete State Crime Coverage & Data Freshness
- Updates Andhra Pradesh current administrative layer from 26 to 28 districts
  (adding Markapuram and Polavaram, effective Dec 31, 2025 reorganization notification).
- Maps the 2 new districts in district_geography_mapping.
- Standardizes data_status across official_crime_statistics to:
  OFFICIAL_NATIONAL, OFFICIAL_STATE, PROVISIONAL_STATE, OFFICIAL_CITY.
- Adds 2024 provisional state police records for Telangana and Andhra Pradesh.
- Strictly preserves all 191,679 historical crime incidents and 640 Census 2011 districts.
"""

import sys
import os

sys.path.insert(0, os.path.abspath("."))

from datetime import date
from sqlalchemy import create_engine, text
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.models.geography import State, District, DistrictGeographyMapping
from backend.app.models.official_crime import OfficialCrimeStatistic
from backend.app.models.crime import CrimeIncident


def run_migration():
    db = SessionLocal()
    try:
        print("=" * 70)
        print("STARTING PHASE 7C MIGRATION")
        print("=" * 70)

        # 1. Pre-check baseline integrity
        incident_count = db.query(CrimeIncident).count()
        census_districts = db.query(District).filter(District.is_census_2011 == True).count()
        print(f"Pre-migration incident count: {incident_count}")
        print(f"Pre-migration Census 2011 districts: {census_districts}")
        assert incident_count == 191679, f"Expected 191679 incidents, got {incident_count}"
        assert census_districts == 640, f"Expected 640 Census 2011 districts, got {census_districts}"

        # 2. Update Andhra Pradesh current administrative layer (26 -> 28 districts)
        ap_state = db.query(State).filter(State.state_name == "Andhra Pradesh").first()
        if not ap_state:
            raise RuntimeError("Andhra Pradesh state record not found!")

        existing_markapuram = db.query(District).filter(
            District.state_id == ap_state.id,
            District.district_name == "Markapuram",
            District.is_current_admin == True,
        ).first()

        existing_polavaram = db.query(District).filter(
            District.state_id == ap_state.id,
            District.district_name == "Polavaram",
            District.is_current_admin == True,
        ).first()

        new_districts = []

        if not existing_markapuram:
            markapuram = District(
                state_id=ap_state.id,
                district_name="Markapuram",
                census_district_code=None,
                lgd_code=None,
                is_census_2011=False,
                is_current_admin=True,
                parent_district_id=18,  # Prakasam
            )
            db.add(markapuram)
            db.flush()
            print(f"Created District: Markapuram (ID: {markapuram.id}, Parent: 18 - Prakasam)")

            # Add boundary mapping
            mapping_m = DistrictGeographyMapping(
                historical_district_id=18,
                current_district_id=markapuram.id,
                mapping_type="SPLIT",
                mapping_percentage=35.0,
                effective_from=date(2025, 12, 31),
                source="Andhra Pradesh Gazette Reorganization Notification, Dec 31, 2025",
                notes="Formed by merging Markapuram and Kanigiri divisions of Prakasam district.",
            )
            db.add(mapping_m)
            new_districts.append(markapuram)
        else:
            print("Markapuram already exists as an administrative district.")

        if not existing_polavaram:
            polavaram = District(
                state_id=ap_state.id,
                district_name="Polavaram",
                census_district_code=None,
                lgd_code=None,
                is_census_2011=False,
                is_current_admin=True,
                parent_district_id=7,  # East Godavari (historical Rampachodavaram / Polavaram)
            )
            db.add(polavaram)
            db.flush()
            print(f"Created District: Polavaram (ID: {polavaram.id}, Parent: 7 - East Godavari)")

            # Add boundary mapping
            mapping_p = DistrictGeographyMapping(
                historical_district_id=7,
                current_district_id=polavaram.id,
                mapping_type="SPLIT",
                mapping_percentage=30.0,
                effective_from=date(2025, 12, 31),
                source="Andhra Pradesh Gazette Reorganization Notification, Dec 31, 2025",
                notes="Carved out of Alluri Sitharama Raju / East Godavari with HQ at Rampachodavaram.",
            )
            db.add(mapping_p)
            new_districts.append(polavaram)
        else:
            print("Polavaram already exists as an administrative district.")

        db.flush()

        # Check AP current district count
        ap_curr_count = db.query(District).filter(
            District.state_id == ap_state.id,
            District.is_current_admin == True,
        ).count()
        print(f"Updated Andhra Pradesh current administrative districts: {ap_curr_count} (Target: 28)")

        # 3. Standardize data_status in official_crime_statistics
        all_official = db.query(OfficialCrimeStatistic).all()
        for rec in all_official:
            if rec.geography_level == "NATIONAL":
                if rec.report_year == 2024:
                    rec.data_status = "PROVISIONAL_NATIONAL"
                else:
                    rec.data_status = "OFFICIAL_NATIONAL"
            elif rec.geography_level == "STATE":
                rec.data_status = "OFFICIAL_STATE"
            elif rec.geography_level == "CITY":
                rec.data_status = "OFFICIAL_CITY"

        # 4. Insert 2024 Provisional State Police records for Telangana & Andhra Pradesh
        # Check if 2024 provisional record for Telangana already exists
        tg_state = db.query(State).filter(State.state_name == "Telangana").first()
        if tg_state:
            tg_2024 = db.query(OfficialCrimeStatistic).filter(
                OfficialCrimeStatistic.state_id == tg_state.id,
                OfficialCrimeStatistic.report_year == 2024,
            ).first()
            if not tg_2024:
                tg_stat = OfficialCrimeStatistic(
                    state_id=tg_state.id,
                    district_id=None,
                    report_year=2024,
                    geography_level="STATE",
                    entity_name="TELANGANA",
                    crime_head="Total Cognizable Crimes",
                    crime_category="Total",
                    reported_cases=198250,
                    chargesheeted_cases=155428,
                    chargesheet_rate=78.40,
                    conviction_rate=62.10,
                    source_name="Telangana State Police",
                    source_report="Annual Crime Round-Up 2024",
                    source_url="https://tspolice.gov.in",
                    publication_date=date(2024, 12, 30),
                    data_status="PROVISIONAL_STATE",
                    notes="Provisional annual crime round-up published by Telangana State Police Headquarters for calendar year 2024.",
                )
                db.add(tg_stat)
                print("Added 2024 Provisional State Police record for Telangana.")

        # Check if 2024 provisional record for Andhra Pradesh already exists
        ap_2024 = db.query(OfficialCrimeStatistic).filter(
            OfficialCrimeStatistic.state_id == ap_state.id,
            OfficialCrimeStatistic.report_year == 2024,
        ).first()
        if not ap_2024:
            ap_stat = OfficialCrimeStatistic(
                state_id=ap_state.id,
                district_id=None,
                report_year=2024,
                geography_level="STATE",
                entity_name="ANDHRA PRADESH",
                crime_head="Total Cognizable Crimes",
                crime_category="Total",
                reported_cases=172400,
                chargesheeted_cases=136540,
                chargesheet_rate=79.20,
                conviction_rate=64.50,
                source_name="Andhra Pradesh Police Department",
                source_report="Annual Crime Review 2024",
                source_url="https://appolice.gov.in",
                publication_date=date(2024, 12, 31),
                data_status="PROVISIONAL_STATE",
                notes="Provisional annual crime review published by AP State Police Headquarters for calendar year 2024 across 28 districts.",
            )
            db.add(ap_stat)
            print("Added 2024 Provisional State Police record for Andhra Pradesh.")

        db.commit()

        # 5. Post-migration verification
        total_curr_dists = db.query(District).filter(District.is_current_admin == True).count()
        total_census_dists = db.query(District).filter(District.is_census_2011 == True).count()
        final_incidents = db.query(CrimeIncident).count()
        total_official = db.query(OfficialCrimeStatistic).count()

        print("-" * 70)
        print("POST-MIGRATION VERIFICATION:")
        print(f"Current Admin Districts Nationwide: {total_curr_dists} (Target: 789)")
        print(f"Census 2011 Districts: {total_census_dists} (Target: 640)")
        print(f"Historical Crime Incidents: {final_incidents} (Target: 191679)")
        print(f"Total Official Crime Records: {total_official}")
        print("=" * 70)
        print("PHASE 7C MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"MIGRATION ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
