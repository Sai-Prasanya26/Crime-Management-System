from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.database.session import get_db
from backend.app.services.geography_service import GeographyService
from backend.app.schemas.geography import (
    StateListResponse,
    DistrictListResponse,
    DistrictDetailResponse,
)

router = APIRouter()


@router.get(
    "/states",
    response_model=StateListResponse,
    summary="Get All States",
    description="Retrieve all Indian States and Union Territories with total count.",
)
def get_states(db: Session = Depends(get_db)) -> StateListResponse:
    return GeographyService.get_states(db)


@router.get(
    "/districts",
    response_model=DistrictListResponse,
    summary="Get Districts",
    description="Retrieve administrative districts with optional filtering by parent state_id.",
)
def get_districts(
    state_id: Optional[int] = Query(None, description="Filter districts by State ID"),
    db: Session = Depends(get_db),
) -> DistrictListResponse:
    return GeographyService.get_districts(db, state_id=state_id)


@router.get(
    "/districts/{district_id}",
    response_model=DistrictDetailResponse,
    summary="Get District Details with Demographics",
    description="Retrieve detailed district metadata including Census 2011 demographic profile (population, literacy, workers).",
)
def get_district_details(
    district_id: int = Path(..., description="Target District ID", ge=1),
    db: Session = Depends(get_db),
) -> DistrictDetailResponse:
    return GeographyService.get_district_detail(db, district_id=district_id)
