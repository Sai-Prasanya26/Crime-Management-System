from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from fastapi import HTTPException, status
from backend.app.repositories.geography_repository import GeographyRepository
from backend.app.schemas.geography import (
    StateListResponse,
    StateItem,
    DistrictListResponse,
    DistrictItem,
    DistrictDetailResponse,
    DistrictDemographicsData,
    DistrictGeographyMappingListResponse,
    DistrictGeographyMappingItem,
    JurisdictionProfileResponse,
)


class GeographyService:
    @staticmethod
    def get_states(db: Session, view: str = "current") -> StateListResponse:
        states = GeographyRepository.get_all_states(db, view=view)
        items = [
            StateItem(
                id=s.id,
                state_name=s.state_name,
                state_code=s.state_code,
                entity_type=s.entity_type,
                is_active=s.is_active,
            )
            for s in states
        ]
        return StateListResponse(total=len(items), view=view, items=items)

    @staticmethod
    def get_districts(
        db: Session,
        state_id: Optional[int] = None,
        view: str = "current",
    ) -> DistrictListResponse:
        districts = GeographyRepository.get_districts(db, state_id=state_id, view=view)
        items = [
            DistrictItem(
                id=d.id,
                state_id=d.state_id,
                state_name=d.state.state_name if d.state else "",
                district_name=d.district_name,
                census_district_code=d.census_district_code,
                lgd_code=d.lgd_code,
                is_census_2011=d.is_census_2011,
                is_current_admin=d.is_current_admin,
                parent_district_id=d.parent_district_id,
            )
            for d in districts
        ]
        return DistrictListResponse(total=len(items), view=view, items=items)

    @staticmethod
    def get_district_detail(db: Session, district_id: int) -> DistrictDetailResponse:
        district = GeographyRepository.get_district_by_id(db, district_id)
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with ID {district_id} not found",
            )

        demo_data = None
        d = district.demographics
        is_child = bool(not district.is_census_2011 and district.parent_district_id)
        parent_name = district.parent_district.district_name if (is_child and district.parent_district) else None

        if not d and district.parent_district and district.parent_district.demographics:
            d = district.parent_district.demographics

        if d:
            demo_data = DistrictDemographicsData(
                census_year=d.census_year,
                total_population=d.total_population,
                male_population=d.male_population,
                female_population=d.female_population,
                literate_population=d.literate_population,
                total_workers=d.total_workers,
            )

        notes = (
            f"Census 2011 demographic baseline dynamically derived from parent jurisdiction '{parent_name}' (#{district.parent_district_id}). "
            f"Standalone enumeration for modern carved district '{district.district_name}' awaits upcoming decennial Census."
            if is_child
            else None
        )

        return DistrictDetailResponse(
            id=district.id,
            state_id=district.state_id,
            state_name=district.state.state_name if district.state else "",
            district_name=district.district_name,
            census_district_code=district.census_district_code,
            lgd_code=district.lgd_code,
            is_census_2011=district.is_census_2011,
            is_current_admin=district.is_current_admin,
            parent_district_id=district.parent_district_id,
            parent_district_name=parent_name,
            is_derived_from_parent=is_child,
            notes=notes,
            demographics=demo_data,
        )

    @staticmethod
    def get_jurisdiction_profile(
        db: Session,
        state_id: Optional[int] = None,
        district_id: Optional[int] = None,
        scope: Optional[str] = None,
        geography_mode: str = "current",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> JurisdictionProfileResponse:
        from backend.app.models.geography import State, District
        from backend.app.models.demographics import DistrictDemographics
        from backend.app.models.crime import CrimeIncident
        from backend.app.models.intelligence import CrimeRiskScore
        from backend.app.repositories.crime_repository import CrimeRepository
        from sqlalchemy import func, desc

        if district_id is None and state_id is None:
            if scope and scope.lower() == "national":
                inc_query = db.query(func.count(CrimeIncident.id))
                if start_date is not None:
                    inc_query = inc_query.filter(CrimeIncident.incident_date >= start_date)
                if end_date is not None:
                    inc_query = inc_query.filter(CrimeIncident.incident_date <= end_date)
                reported_incidents = inc_query.scalar() or 0

                pop_sum = db.query(func.sum(DistrictDemographics.total_population)).scalar()
                population = int(pop_sum) if pop_sum is not None else None

                crime_rate = None
                if population and population > 0 and reported_incidents is not None:
                    crime_rate = round((reported_incidents / population) * 100000.0, 2)

                dist_filter = District.is_census_2011 == True if geography_mode == "historical" else District.is_current_admin == True
                district_count = db.query(func.count(District.id)).filter(dist_filter).scalar() or 0

                notes = (
                    f"National-level baseline aggregation across all {district_count} monitored administrative district entities. "
                    "Risk classification is calibrated and assessed at district jurisdiction level."
                )

                return JurisdictionProfileResponse(
                    scope="NATIONAL",
                    state_id=None,
                    state_name="All States & UTs (National)",
                    district_id=None,
                    district_name=None,
                    parent_district_id=None,
                    geography_mode=geography_mode,
                    reported_incidents=reported_incidents,
                    population=population,
                    crime_rate_per_100k=crime_rate,
                    risk_level=None,
                    risk_score=None,
                    risk_label="Not available",
                    notes=notes,
                    start_date=start_date,
                    end_date=end_date,
                )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either state_id, district_id, or scope='national' must be provided for jurisdiction profile.",
            )

        if district_id is not None:
            # District Profile
            district = GeographyRepository.get_district_by_id(db, district_id)
            if not district:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"District with ID {district_id} not found.",
                )

            # Validate state consistency if state_id was also passed
            if state_id is not None and district.state_id != state_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"District '{district.district_name}' (State ID {district.state_id}) does not belong to State ID {state_id}.",
                )

            state_id_resolved = district.state_id
            state_name = district.state.state_name if district.state else f"State #{district.state_id}"

            filter_ids = CrimeRepository.resolve_filter_district_ids(
                db, district_id=district.id, geography_mode=geography_mode
            )

            # Incidents
            inc_query = db.query(func.count(CrimeIncident.id)).filter(CrimeIncident.district_id.in_(filter_ids))
            if start_date is not None:
                inc_query = inc_query.filter(CrimeIncident.incident_date >= start_date)
            if end_date is not None:
                inc_query = inc_query.filter(CrimeIncident.incident_date <= end_date)
            reported_incidents = inc_query.scalar() if filter_ids else 0

            # Population
            population = None
            notes = None
            if district.demographics and district.demographics.total_population:
                population = district.demographics.total_population
            elif (
                district.parent_district
                and district.parent_district.demographics
                and district.parent_district.demographics.total_population
            ):
                population = district.parent_district.demographics.total_population
                notes = f"Census 2011 baseline derived from parent jurisdiction #{district.parent_district_id}."
            elif filter_ids:
                p_sum = (
                    db.query(func.sum(DistrictDemographics.total_population))
                    .filter(DistrictDemographics.district_id.in_(filter_ids))
                    .scalar()
                )
                if p_sum:
                    population = int(p_sum)
                    notes = "Census 2011 baseline derived from mapped lineage."

            if population is None:
                notes = "Census 2011 population baseline unavailable for this administrative jurisdiction."

            # Crime rate per 100k
            crime_rate = None
            if population and population > 0 and reported_incidents is not None:
                crime_rate = round((reported_incidents / population) * 100000.0, 2)

            # Risk classification
            target_census_id = (
                district.id
                if district.is_census_2011
                else (district.parent_district_id or (filter_ids[0] if filter_ids else None))
            )

            risk_level = None
            risk_score = None
            risk_label = "Not available"

            if target_census_id:
                latest_risk = (
                    db.query(CrimeRiskScore)
                    .filter(CrimeRiskScore.district_id == target_census_id)
                    .order_by(desc(CrimeRiskScore.period_year), desc(CrimeRiskScore.period_month))
                    .first()
                )
                if latest_risk:
                    risk_level = latest_risk.risk_level
                    risk_score = float(latest_risk.overall_risk_score)
                    if risk_level == "CRITICAL":
                        risk_label = "Critical Risk Hotspot"
                    elif risk_level == "HIGH":
                        risk_label = "High Risk Hotspot"
                    elif risk_level == "MODERATE":
                        risk_label = "Moderate Crime Zone"
                    elif risk_level == "LOW":
                        risk_label = "Low Incidence Area"
                    else:
                        risk_label = f"{risk_level} Risk"

            is_child = bool(not district.is_census_2011 and district.parent_district_id)
            parent_name = district.parent_district.district_name if (is_child and district.parent_district) else None

            return JurisdictionProfileResponse(
                scope="DISTRICT",
                state_id=state_id_resolved,
                state_name=state_name,
                district_id=district.id,
                district_name=district.district_name,
                parent_district_id=district.parent_district_id,
                parent_district_name=parent_name,
                is_derived_from_parent=is_child,
                geography_mode=geography_mode,
                reported_incidents=reported_incidents,
                population=population,
                crime_rate_per_100k=crime_rate,
                risk_level=risk_level,
                risk_score=risk_score,
                risk_label=risk_label,
                notes=notes,
                start_date=start_date,
                end_date=end_date,
            )

        else:
            # State Overview Profile
            state = db.query(State).filter(State.id == state_id).first()
            if not state:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"State with ID {state_id} not found.",
                )

            filter_ids = CrimeRepository.resolve_filter_district_ids(
                db, state_id=state.id, geography_mode=geography_mode
            )

            # Aggregated reported incidents for that state
            inc_query = db.query(func.count(CrimeIncident.id)).filter(CrimeIncident.district_id.in_(filter_ids))
            if start_date is not None:
                inc_query = inc_query.filter(CrimeIncident.incident_date >= start_date)
            if end_date is not None:
                inc_query = inc_query.filter(CrimeIncident.incident_date <= end_date)
            reported_incidents = inc_query.scalar() if filter_ids else 0

            # Aggregated population for that state
            pop_sum = (
                db.query(func.sum(DistrictDemographics.total_population))
                .filter(DistrictDemographics.district_id.in_(filter_ids))
                .scalar()
                if filter_ids
                else None
            )
            population = int(pop_sum) if pop_sum is not None else None

            # Crime rate per 100k
            crime_rate = None
            if population and population > 0 and reported_incidents is not None:
                crime_rate = round((reported_incidents / population) * 100000.0, 2)

            notes = (
                f"State-level aggregation across {len(filter_ids or [])} Census 2011 district entities. "
                "Risk classification is calibrated and assessed at district jurisdiction level."
            )

            return JurisdictionProfileResponse(
                scope="STATE",
                state_id=state.id,
                state_name=state.state_name,
                district_id=None,
                district_name=None,
                parent_district_id=None,
                geography_mode=geography_mode,
                reported_incidents=reported_incidents,
                population=population,
                crime_rate_per_100k=crime_rate,
                risk_level=None,
                risk_score=None,
                risk_label="Not available",
                notes=notes,
                start_date=start_date,
                end_date=end_date,
            )

    @staticmethod
    def get_district_mappings(
        db: Session,
        historical_district_id: Optional[int] = None,
        current_district_id: Optional[int] = None,
    ) -> DistrictGeographyMappingListResponse:
        mappings = GeographyRepository.get_district_mappings(
            db,
            historical_district_id=historical_district_id,
            current_district_id=current_district_id,
        )
        items = [
            DistrictGeographyMappingItem(
                id=m.id,
                historical_district_id=m.historical_district_id,
                historical_district_name=m.historical_district.district_name if m.historical_district else None,
                historical_state_name=m.historical_district.state.state_name if m.historical_district and m.historical_district.state else None,
                current_district_id=m.current_district_id,
                current_district_name=m.current_district.district_name if m.current_district else None,
                current_state_name=m.current_district.state.state_name if m.current_district and m.current_district.state else None,
                mapping_type=m.mapping_type,
                mapping_percentage=float(m.mapping_percentage) if m.mapping_percentage is not None else None,
                effective_from=m.effective_from,
                effective_to=m.effective_to,
                source=m.source,
                notes=m.notes,
            )
            for m in mappings
        ]
        return DistrictGeographyMappingListResponse(total=len(items), items=items)
