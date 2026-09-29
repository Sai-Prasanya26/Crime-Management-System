from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from backend.app.models.official_crime import OfficialCrimeStatistic
from backend.app.models.geography import State, District, DistrictGeographyMapping
from backend.app.models.crime import CrimeIncident


class OfficialCrimeRepository:
    @staticmethod
    def get_statistics(
        db: Session,
        report_year: Optional[int] = None,
        geography_level: Optional[str] = None,
        state_id: Optional[int] = None,
        crime_head: Optional[str] = None,
    ) -> List[OfficialCrimeStatistic]:
        query = db.query(OfficialCrimeStatistic).options(
            joinedload(OfficialCrimeStatistic.state),
            joinedload(OfficialCrimeStatistic.district),
        )

        if report_year is not None:
            query = query.filter(OfficialCrimeStatistic.report_year == report_year)
        if geography_level is not None:
            query = query.filter(OfficialCrimeStatistic.geography_level == geography_level.upper())
        if state_id is not None:
            query = query.filter(OfficialCrimeStatistic.state_id == state_id)
        if crime_head is not None:
            query = query.filter(OfficialCrimeStatistic.crime_head.ilike(f"%{crime_head}%"))

        return query.order_by(
            OfficialCrimeStatistic.report_year.desc(),
            OfficialCrimeStatistic.reported_cases.desc(),
        ).all()

    @staticmethod
    def get_available_years(db: Session) -> List[int]:
        rows = (
            db.query(OfficialCrimeStatistic.report_year)
            .distinct()
            .order_by(OfficialCrimeStatistic.report_year.desc())
            .all()
        )
        return [r[0] for r in rows]

    @staticmethod
    def get_state_coverage(db: Session) -> Dict[str, Any]:
        """
        Calculates comprehensive crime data coverage across all 36 active States and UTs.
        Computes current district count, historical incident count, official records,
        latest crime year, data status, and overall coverage status.
        """
        active_states = (
            db.query(State)
            .filter(State.is_active == True)
            .order_by(State.state_name)
            .all()
        )

        # 1. Current district counts per state
        dist_counts = dict(
            db.query(District.state_id, func.count(District.id))
            .filter(District.is_current_admin == True)
            .group_by(District.state_id)
            .all()
        )

        # 2. Official records by state
        all_official = (
            db.query(OfficialCrimeStatistic)
            .filter(OfficialCrimeStatistic.state_id.isnot(None))
            .order_by(OfficialCrimeStatistic.report_year.desc())
            .all()
        )
        official_by_state: Dict[int, List[OfficialCrimeStatistic]] = {}
        for r in all_official:
            official_by_state.setdefault(r.state_id, []).append(r)

        # 3. Boundary mappings to resolve historical district IDs for current states
        mappings = (
            db.query(DistrictGeographyMapping.historical_district_id, District.state_id)
            .join(District, DistrictGeographyMapping.current_district_id == District.id)
            .all()
        )
        state_to_hist_dists: Dict[int, set] = {}
        for hist_id, s_id in mappings:
            state_to_hist_dists.setdefault(s_id, set()).add(hist_id)

        # Fallback to Census 2011 districts for states without post-2011 reorganization mappings
        census_dists = (
            db.query(District.id, District.state_id)
            .filter(District.is_census_2011 == True)
            .all()
        )
        for d_id, s_id in census_dists:
            if s_id not in state_to_hist_dists:
                state_to_hist_dists.setdefault(s_id, set()).add(d_id)

        # 4. Incident counts per historical district
        incident_counts_by_dist = dict(
            db.query(CrimeIncident.district_id, func.count(CrimeIncident.id))
            .group_by(CrimeIncident.district_id)
            .all()
        )

        items = []
        coverage_summary = {
            "COMPLETE": 0,
            "PARTIAL": 0,
            "HISTORICAL_ONLY": 0,
            "OFFICIAL_BENCHMARK_ONLY": 0,
            "NO_OFFICIAL_DATA_FOUND": 0,
        }

        states_count = 0
        uts_count = 0

        for s in active_states:
            if s.entity_type == "STATE":
                states_count += 1
            else:
                uts_count += 1

            d_count = dist_counts.get(s.id, 0)
            hist_ids = state_to_hist_dists.get(s.id, set())
            incidents_count = sum(incident_counts_by_dist.get(hid, 0) for hid in hist_ids)

            off_recs = official_by_state.get(s.id, [])
            off_count = len(off_recs)
            official_available = off_count > 0

            latest_year = None
            latest_cases = None
            primary_data_status = "NO_OFFICIAL_DATA"
            source_names = []

            if official_available:
                # Top record is the latest due to ordering by report_year desc
                top_rec = off_recs[0]
                latest_year = top_rec.report_year
                latest_cases = top_rec.reported_cases
                primary_data_status = top_rec.data_status
                source_names = list(dict.fromkeys(r.source_name for r in off_recs))

            # Coverage Status classification
            if incidents_count > 0 and official_available:
                coverage_status = "COMPLETE"
            elif incidents_count > 0 and not official_available:
                coverage_status = "HISTORICAL_ONLY"
            elif incidents_count == 0 and official_available:
                coverage_status = "OFFICIAL_BENCHMARK_ONLY"
            else:
                coverage_status = "NO_OFFICIAL_DATA_FOUND"

            coverage_summary[coverage_status] += 1

            # Construct data source description
            if official_available and incidents_count > 0:
                data_source = f"{', '.join(source_names)} ({latest_year}) + Historical Project Dataset (2020-2025)"
                data_freshness = f"Official: {latest_year} | Incidents: 2020-2025"
            elif incidents_count > 0:
                data_source = "Historical Project Incident Dataset (2020-2025)"
                data_freshness = "Incidents: 2020-2025 (No Official Benchmark)"
            elif official_available:
                data_source = f"{', '.join(source_names)} ({latest_year})"
                data_freshness = f"Official: {latest_year} (No Project Incidents)"
            else:
                data_source = "None"
                data_freshness = "No Data"

            notes_parts = []
            if s.state_name == "Telangana":
                notes_parts.append("Formed in 2014; includes 33 modern administrative districts and Hyderabad HQ.")
            elif s.state_name == "Andhra Pradesh":
                notes_parts.append("Reorganized into 28 current administrative districts (effective Dec 31, 2025).")
            elif s.state_name == "Ladakh":
                notes_parts.append("Reorganized as Union Territory in 2019; consists of Leh and Kargil districts.")

            item = {
                "state_id": s.id,
                "state_name": s.state_name,
                "entity_type": s.entity_type,
                "district_count": d_count,
                "historical_incident_count": incidents_count,
                "official_record_count": off_count,
                "latest_official_crime_year": latest_year,
                "latest_official_cases": latest_cases,
                "official_data_available": official_available,
                "data_status": primary_data_status,
                "coverage_status": coverage_status,
                "data_source": data_source,
                "data_freshness": data_freshness,
                "has_crime_information": (incidents_count > 0 or official_available),
                "notes": " ".join(notes_parts) if notes_parts else None,
            }
            items.append(item)

        total_curr_districts = sum(dist_counts.values())
        total_hist_incidents = sum(i["historical_incident_count"] for i in items)

        return {
            "total_entities": len(items),
            "states_count": states_count,
            "uts_count": uts_count,
            "total_current_districts": total_curr_districts,
            "total_historical_incidents": total_hist_incidents,
            "coverage_summary": coverage_summary,
            "items": items,
        }

    @staticmethod
    def get_district_coverage(
        db: Session,
        state_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Audits current administrative districts for historical incident linkage and official benchmarks.
        """
        query = (
            db.query(District)
            .options(
                joinedload(District.state),
                joinedload(District.parent_district),
            )
            .filter(District.is_current_admin == True)
        )

        if state_id is not None:
            query = query.filter(District.state_id == state_id)

        districts = query.order_by(District.district_name).all()

        # Count direct historical incidents by district_id
        direct_incident_counts = dict(
            db.query(CrimeIncident.district_id, func.count(CrimeIncident.id))
            .group_by(CrimeIncident.district_id)
            .all()
        )

        items = []
        for d in districts:
            parent_name = d.parent_district.district_name if d.parent_district else None
            direct_count = direct_incident_counts.get(d.id, 0)

            if direct_count > 0:
                hist_count = direct_count
                has_hist = True
                data_source = "Direct Historical Census-2011 Incident Records"
                notes = None
            elif d.parent_district_id:
                parent_count = direct_incident_counts.get(d.parent_district_id, 0)
                hist_count = parent_count
                has_hist = True
                data_source = f"Census-2011 Parent Baseline ({parent_name})"
                notes = f"Reorganized child district; incident analytics resolve to parent '{parent_name}'."
            else:
                hist_count = 0
                has_hist = False
                data_source = "None"
                notes = "No historical incident records mapped."

            items.append({
                "district_id": d.id,
                "district_name": d.district_name,
                "state_id": d.state_id,
                "state_name": d.state.state_name if d.state else "UNKNOWN",
                "parent_district_id": d.parent_district_id,
                "parent_district_name": parent_name,
                "is_census_2011": d.is_census_2011,
                "is_current_admin": d.is_current_admin,
                "has_historical_incidents": has_hist,
                "historical_incident_count": hist_count,
                "has_official_statistics": False,  # NCRB publishes primarily State/National/City level
                "latest_data_year": 2025 if has_hist else None,
                "data_source": data_source,
                "notes": notes,
            })

        return {
            "total": len(items),
            "items": items,
        }

    @staticmethod
    def get_data_freshness_metadata(db: Session) -> Dict[str, Any]:
        """
        Returns structured metadata regarding dataset freshness, source publications,
        and geographic standards across the system.
        """
        active_states = db.query(State).filter(State.is_active == True).count()
        states_count = db.query(State).filter(State.is_active == True, State.entity_type == "STATE").count()
        uts_count = db.query(State).filter(State.is_active == True, State.entity_type == "UT").count()

        current_districts = db.query(District).filter(District.is_current_admin == True).count()
        census_districts = db.query(District).filter(District.is_census_2011 == True).count()
        historical_incidents = db.query(CrimeIncident).count()
        total_official_recs = db.query(OfficialCrimeStatistic).count()

        return {
            "historical_incident_dataset": "2020-01-01 to 2025-12-31 (Project Incident Dataset)",
            "latest_nationwide_official_benchmark": "Crime in India 2023 (Official Published) / 2024 (Provisional Advance)",
            "latest_official_nationwide_year": 2024,
            "population_baseline": "Census 2011 Enumerated Baseline (Office of the Registrar General & Census Commissioner of India)",
            "current_administrative_geography": "2026 Administrative Boundaries (36 States/UTs, 789 Current Districts incorporating AP Reorganization of Dec 31, 2025)",
            "total_active_states": states_count,
            "total_active_uts": uts_count,
            "total_current_districts": current_districts,
            "total_census_2011_districts": census_districts,
            "total_historical_incidents": historical_incidents,
            "total_official_records": total_official_recs,
            "notes": [
                "Historical incident records (191,679) represent simulated project data anchored to Census 2011 district polygons.",
                "Official crime statistics (52 records) are authentic published figures from the National Crime Records Bureau (NCRB) and State Police annual reports.",
                "Zero synthetic crime incidents have been generated from aggregate NCRB reports.",
                "District population values are strictly Census 2011 enumerations; no nationwide decennial census has occurred since 2011.",
                "Andhra Pradesh current administrative geography reflects the 28-district notification effective December 31, 2025.",
            ],
        }
