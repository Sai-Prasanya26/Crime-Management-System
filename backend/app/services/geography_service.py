from sqlalchemy.orm import Session
from typing import Optional
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
        if district.demographics:
            d = district.demographics
            demo_data = DistrictDemographicsData(
                census_year=d.census_year,
                total_population=d.total_population,
                male_population=d.male_population,
                female_population=d.female_population,
                literate_population=d.literate_population,
                total_workers=d.total_workers,
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
            demographics=demo_data,
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
