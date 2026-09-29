from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.app.database.session import get_db
from backend.app.services.official_crime_service import OfficialCrimeService
from backend.app.schemas.official_crime import (
    OfficialCrimeStatisticListResponse,
)

router = APIRouter()


@router.get(
    "/statistics",
    response_model=OfficialCrimeStatisticListResponse,
    summary="Get Official NCRB Crime Statistics",
    description="Retrieve verified macro-level annual crime statistics published by the National Crime Records Bureau (NCRB), Ministry of Home Affairs.",
)
def get_official_statistics(
    report_year: Optional[int] = Query(None, description="Filter by report year (e.g., 2022, 2023, 2024)"),
    geography_level: Optional[str] = Query(None, description="Geographic level: 'NATIONAL', 'STATE', 'CITY'"),
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    crime_head: Optional[str] = Query(None, description="Filter by crime head or classification"),
    db: Session = Depends(get_db),
) -> OfficialCrimeStatisticListResponse:
    return OfficialCrimeService.get_statistics(
        db,
        report_year=report_year,
        geography_level=geography_level,
        state_id=state_id,
        crime_head=crime_head,
    )


@router.get(
    "/years",
    response_model=List[int],
    summary="Get Available NCRB Report Years",
    description="Retrieve all publication years available in the official NCRB crime statistics repository.",
)
def get_available_years(db: Session = Depends(get_db)) -> List[int]:
    return OfficialCrimeService.get_available_years(db)
