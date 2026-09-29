import sys
import os
import csv
import time
from datetime import datetime
from collections import defaultdict

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database.session import engine, SessionLocal
from backend.app.models.geography import State, District
from backend.app.models.demographics import DistrictDemographics
from backend.app.models.crime import CrimeCategory, CrimeType, CrimeIncident
from backend.app.models.resources import ResourceType, ResourceCost
from sqlalchemy import text

# File paths
RAW_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "raw"))
CRIME_CSV_PATH = os.path.join(RAW_DIR, "crime_dataset_nationwide.csv")
CENSUS_CSV_PATH = os.path.join(RAW_DIR, "india-districts-census-2011.csv")

# Project-defined severity mappings (documented in Phase 2)
CATEGORY_SEVERITY_WEIGHTS = {
    "Violent Crime": 1.50,
    "Fire Accident": 1.20,
    "Traffic Fatality": 1.10,
    "Other Crime": 1.00,
}

CRIME_TYPE_SEVERITY_LEVELS = {
    # CRITICAL: Severe harm to life / major violent felonies
    "330": "CRITICAL",  # HOMICIDE
    "254": "CRITICAL",  # SEXUAL ASSAULT
    "372": "CRITICAL",  # KIDNAPPING
    "361": "CRITICAL",  # ARSON
    # HIGH: Weapon offenses, robbery, domestic violence, extortion
    "545": "HIGH",      # ROBBERY
    "272": "HIGH",      # ASSAULT
    "440": "HIGH",      # DOMESTIC VIOLENCE
    "220": "HIGH",      # FIREARM OFFENSE
    "119": "HIGH",      # EXTORTION
    # MEDIUM: Property, financial, cyber, vehicular, narcotics
    "383": "MEDIUM",    # BURGLARY
    "381": "MEDIUM",    # VEHICLE - STOLEN
    "467": "MEDIUM",    # DRUG OFFENSE
    "276": "MEDIUM",    # FRAUD
    "302": "MEDIUM",    # CYBERCRIME
    "485": "MEDIUM",    # IDENTITY THEFT
    "345": "MEDIUM",    # COUNTERFEITING
    "568": "MEDIUM",    # ILLEGAL POSSESSION
    # LOW: Public nuisance, minor infractions, petty property
    "193": "LOW",       # SHOPLIFTING
    "145": "LOW",       # VANDALISM
    "597": "LOW",       # PUBLIC INTOXICATION
    "197": "LOW",       # TRAFFIC VIOLATION
}

# Baseline seed resource categories (No fake historical records)
DEFAULT_RESOURCE_TYPES = [
    {"name": "Police Officers", "unit": "Personnel", "desc": "Frontline patrol and law enforcement officers", "cost": 50000.00},
    {"name": "Patrol Vehicles", "unit": "Vehicles", "desc": "Mobile patrol vehicles and pursuit cruisers", "cost": 35000.00},
    {"name": "Investigation Teams", "unit": "Teams", "desc": "Specialized criminal investigation units", "cost": 120000.00},
    {"name": "Surveillance Units", "unit": "Units", "desc": "CCTV monitoring and aerial surveillance assets", "cost": 25000.00},
]


def run_pipeline(truncate_first: bool = True):
    print("=" * 70)
    print("PHASE 3B: DATA CLEANING, TRANSFORMATION & DATABASE IMPORT PIPELINE")
    print("=" * 70)
    start_time = time.time()

    if not os.path.exists(CRIME_CSV_PATH):
        raise FileNotFoundError(f"Primary crime dataset not found at {CRIME_CSV_PATH}")
    if not os.path.exists(CENSUS_CSV_PATH):
        raise FileNotFoundError(f"Census dataset not found at {CENSUS_CSV_PATH}")

    db = SessionLocal()

    try:
        if truncate_first:
            print("\n[Step 1/6] Cleaning existing data in dependency order...")
            # Disable foreign keys during cleanup
            db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            for tbl in [
                "crime_incidents",
                "crime_types",
                "crime_categories",
                "district_demographics",
                "districts",
                "states",
                "resource_costs",
                "resource_types",
            ]:
                db.execute(text(f"TRUNCATE TABLE `{tbl}`;"))
            db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            db.commit()
            print("Existing tables truncated cleanly.")

        # ---------------------------------------------------------
        # STEP 2: Geography Ingestion (States and Districts)
        # ---------------------------------------------------------
        print("\n[Step 2/6] Ingesting States and Districts...")
        
        # Load Census district codes mapping: (State.UPPER(), District.TITLE()) -> Census District Code
        census_code_map = {}
        with open(CENSUS_CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st_key = row["State name"].strip().upper()
                dt_key = row["District name"].strip().title()
                code_str = row["District code"].strip()
                if code_str.isdigit():
                    census_code_map[(st_key, dt_key)] = int(code_str)

        # Extract distinct states and districts from crime dataset
        states_set = set()
        districts_set = set()
        with open(CRIME_CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st = row["State name"].strip().upper()
                dt = row["District name"].strip().title()
                states_set.add(st)
                districts_set.add((st, dt))

        # Insert States
        state_id_map = {}
        for st_name in sorted(states_set):
            state_obj = State(state_name=st_name, state_code=None)
            db.add(state_obj)
        db.commit()

        # Build State lookup map
        all_states = db.query(State).all()
        for s in all_states:
            state_id_map[s.state_name] = s.id
        print(f" -> Inserted {len(all_states)} States.")

        # Insert Districts
        for st_name, dt_name in sorted(districts_set):
            st_id = state_id_map[st_name]
            census_code = census_code_map.get((st_name, dt_name))
            dt_obj = District(
                state_id=st_id,
                district_name=dt_name,
                census_district_code=census_code,
            )
            db.add(dt_obj)
        db.commit()

        # Build District lookup map: (State.UPPER(), District.TITLE()) -> district_id
        district_id_map = {}
        all_districts = db.query(District).all()
        for d in all_districts:
            # Reconstruct (st_name, dt_name) key
            st_name = next(k for k, v in state_id_map.items() if v == d.state_id)
            district_id_map[(st_name, d.district_name)] = d.id
        print(f" -> Inserted {len(all_districts)} Districts (with Census codes mapped).")

        # ---------------------------------------------------------
        # STEP 3: Census Demographics Ingestion
        # ---------------------------------------------------------
        print("\n[Step 3/6] Ingesting Census 2011 Demographics...")
        demographics_inserted = 0
        with open(CENSUS_CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st = row["State name"].strip().upper()
                dt = row["District name"].strip().title()
                dt_id = district_id_map.get((st, dt))
                if dt_id:
                    demo = DistrictDemographics(
                        district_id=dt_id,
                        census_year=2011,
                        total_population=int(row["Population"]),
                        male_population=int(row["Male"]),
                        female_population=int(row["Female"]),
                        literate_population=int(row["Literate"]),
                        total_workers=int(row["Workers"]),
                    )
                    db.add(demo)
                    demographics_inserted += 1
        db.commit()
        print(f" -> Inserted {demographics_inserted} District Demographic profiles.")

        # ---------------------------------------------------------
        # STEP 4: Crime Categories & Types Master Ingestion
        # ---------------------------------------------------------
        print("\n[Step 4/6] Ingesting Crime Categories & Types...")
        
        # Verify 1-to-1 consistency from nationwide CSV
        code_meta = {}
        unique_categories = set()
        with open(CRIME_CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row["Crime Code"].strip()
                desc = row["Crime Description"].strip()
                dom = row["Crime Domain"].strip()
                unique_categories.add(dom)
                if code in code_meta:
                    if code_meta[code]["desc"] != desc or code_meta[code]["domain"] != dom:
                        raise ValueError(f"Taxonomy conflict detected for code {code}: {code_meta[code]} vs ({desc}, {dom})")
                else:
                    code_meta[code] = {"desc": desc, "domain": dom}

        # Insert Categories
        category_id_map = {}
        for cat_name in sorted(unique_categories):
            weight = CATEGORY_SEVERITY_WEIGHTS.get(cat_name, 1.00)
            cat_obj = CrimeCategory(category_name=cat_name, severity_weight=weight)
            db.add(cat_obj)
        db.commit()

        for c in db.query(CrimeCategory).all():
            category_id_map[c.category_name] = c.id
        print(f" -> Inserted {len(category_id_map)} Crime Categories with project severity weights.")

        # Insert Crime Types
        crime_type_id_map = {}
        for code, meta in sorted(code_meta.items(), key=lambda x: int(x[0]) if x[0].isdigit() else x[0]):
            cat_id = category_id_map[meta["domain"]]
            sev = CRIME_TYPE_SEVERITY_LEVELS.get(code, "MEDIUM")
            ct_obj = CrimeType(
                category_id=cat_id,
                crime_code=code,
                crime_name=meta["desc"],
                severity_level=sev,
            )
            db.add(ct_obj)
        db.commit()

        for ct in db.query(CrimeType).all():
            crime_type_id_map[ct.crime_code] = ct.id
        print(f" -> Inserted {len(crime_type_id_map)} Crime Types with legal codes and severity tiers.")

        # ---------------------------------------------------------
        # STEP 5: Police Resource Types & Baseline Costs (Config Catalog)
        # ---------------------------------------------------------
        print("\n[Step 5/6] Ingesting Police Resource Types & Baseline Cost Schedules...")
        for r_spec in DEFAULT_RESOURCE_TYPES:
            rt_obj = ResourceType(
                resource_name=r_spec["name"],
                unit_of_measure=r_spec["unit"],
                description=r_spec["desc"],
                is_active=True,
            )
            db.add(rt_obj)
            db.flush()

            cost_obj = ResourceCost(
                resource_type_id=rt_obj.id,
                unit_cost=r_spec["cost"],
                effective_from=datetime.strptime("2020-01-01", "%Y-%m-%d").date(),
                effective_to=None,
                is_active=True,
            )
            db.add(cost_obj)
        db.commit()
        print(f" -> Inserted {len(DEFAULT_RESOURCE_TYPES)} standard Resource Types and Cost policies.")

        # ---------------------------------------------------------
        # STEP 6: Historical Crime Incidents Ingestion (Batched)
        # ---------------------------------------------------------
        print("\n[Step 6/6] Ingesting Historical Crime Incidents (191,679 records)...")
        batch_size = 5000
        batch = []
        total_incidents = 0
        seen_reports = set()

        with open(CRIME_CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                report_num = row["Report Number"].strip()
                if report_num in seen_reports:
                    continue  # Deduplication safety
                seen_reports.add(report_num)

                st = row["State name"].strip().upper()
                dt = row["District name"].strip().title()
                dt_id = district_id_map.get((st, dt))
                if not dt_id:
                    print(f"Warning: district not found for {st}, {dt}")
                    continue

                code = row["Crime Code"].strip()
                ct_id = crime_type_id_map.get(code)
                if not ct_id:
                    print(f"Warning: crime code not found: {code}")
                    continue

                # Parse Dates and Times
                inc_date = datetime.strptime(row["Date of Occurrence"].strip(), "%Y-%m-%d").date()
                rep_date = datetime.strptime(row["Date Reported"].strip(), "%Y-%m-%d").date()
                inc_time_str = row["Time of Occurrence"].strip()
                # Handle possible time formatting
                try:
                    inc_time = datetime.strptime(inc_time_str, "%H:%M:%S").time()
                except ValueError:
                    inc_time = datetime.strptime(inc_time_str[:5], "%H:%M").time()

                # Victim Age
                age_val = row["Victim Age"].strip()
                victim_age = int(age_val) if age_val and age_val.isdigit() else None
                if victim_age is not None and (victim_age < 0 or victim_age > 120):
                    victim_age = None

                # Victim Gender
                gender_raw = row["Victim Gender"].strip().upper()
                victim_gender = gender_raw if gender_raw in ("M", "F", "OTHER") else "UNKNOWN"

                # Weapon Used (preserve NULL if missing)
                wp_raw = row["Weapon Used"].strip().upper()
                weapon_used = wp_raw if wp_raw else None

                # Police Deployed Count
                pd_raw = row["Police Deployed"].strip()
                police_count = int(pd_raw) if pd_raw and pd_raw.isdigit() else 0

                # Case Closed & Closed Date
                case_closed_raw = row["Case Closed"].strip().upper()
                case_status = "CLOSED" if case_closed_raw in ("YES", "Y", "CLOSED") else "OPEN"
                
                closed_date_raw = row.get("Date Case Closed", "").strip()
                closed_date = None
                if case_status == "CLOSED" and closed_date_raw:
                    try:
                        closed_date = datetime.strptime(closed_date_raw, "%Y-%m-%d").date()
                    except ValueError:
                        closed_date = None

                record = {
                    "report_number": report_num,
                    "district_id": dt_id,
                    "crime_type_id": ct_id,
                    "incident_date": inc_date,
                    "incident_time": inc_time,
                    "reported_date": rep_date,
                    "victim_age": victim_age,
                    "victim_gender": victim_gender,
                    "weapon_used": weapon_used,
                    "police_deployed_count": police_count,
                    "case_status": case_status,
                    "closed_date": closed_date,
                    "created_at": datetime.now(),
                }
                batch.append(record)

                if len(batch) >= batch_size:
                    db.bulk_insert_mappings(CrimeIncident, batch)
                    db.commit()
                    total_incidents += len(batch)
                    batch = []
                    print(f"  Processed {total_incidents:,} / 191,679 incidents...", end="\r")

            if batch:
                db.bulk_insert_mappings(CrimeIncident, batch)
                db.commit()
                total_incidents += len(batch)
                print(f"  Processed {total_incidents:,} / 191,679 incidents.")

        elapsed = round(time.time() - start_time, 2)
        print("\n" + "=" * 70)
        print("PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print(f"Total Execution Time: {elapsed} seconds")
        print(f"States Ingested:             {len(all_states):,}")
        print(f"Districts Ingested:          {len(all_districts):,}")
        print(f"Census Demographics:         {demographics_inserted:,}")
        print(f"Crime Categories:            {len(category_id_map):,}")
        print(f"Crime Types:                 {len(crime_type_id_map):,}")
        print(f"Resource Types:              {len(DEFAULT_RESOURCE_TYPES):,}")
        print(f"Crime Incidents Ingested:    {total_incidents:,}")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Pipeline aborted: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_pipeline()
