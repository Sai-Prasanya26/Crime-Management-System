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
)


class GeographyService:
    @staticmethod
    def get_states(db: Session) -> StateListResponse:
        states = GeographyRepository.get_all_states(db)
        items = [StateItem.model_validate(s) for s in states]
        return StateListResponse(total=len(items), items=items)

    @staticmethod
    def get_districts(db: Session, state_id: Optional[int] = None) -> DistrictListResponse:
        districts = GeographyRepository.get_districts(db, state_id=state_id)
        items = [
            DistrictItem(
                id=d.id,
                state_id=d.state_id,
                state_name=d.state.state_name if d.state else "",
                district_name=d.district_name,
                census_district_code=d.census_district_code,
            )
            for d in districts
        ]
        return DistrictListResponse(total=len(items), items=items)

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
            demographics=demo_data,
        )
