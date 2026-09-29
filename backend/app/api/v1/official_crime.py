from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.app.database.session import get_db
from backend.app.services.official_crime_service import OfficialCrimeService
from backend.app.schemas.official_crime import (
    OfficialCrimeStatisticListResponse,
    StateCoverageListResponse,
    DataFreshnessResponse,
    DistrictCoverageListResponse,
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


@router.get(
    "/coverage",
    response_model=StateCoverageListResponse,
    summary="Get State Crime Data Coverage",
    description="Retrieve complete data coverage audit across all 36 active Indian States and Union Territories, contrasting historical incident data with official NCRB benchmarks.",
)
def get_state_coverage(db: Session = Depends(get_db)) -> StateCoverageListResponse:
    return OfficialCrimeService.get_state_coverage(db)


@router.get(
    "/freshness",
    response_model=DataFreshnessResponse,
    summary="Get Data Freshness and Provenance Metadata",
    description="Retrieve detailed data freshness, temporal windows, population baseline disclosures, and administrative boundary metadata.",
)
def get_data_freshness(db: Session = Depends(get_db)) -> DataFreshnessResponse:
    return OfficialCrimeService.get_data_freshness_metadata(db)


@router.get(
    "/district-coverage",
    response_model=DistrictCoverageListResponse,
    summary="Get District-Level Coverage and Lineage Audit",
    description="Retrieve coverage details for current administrative districts, including historical Census-2011 parent lineage and incident linkage.",
)
def get_district_coverage(
    state_id: Optional[int] = Query(None, description="Optional State ID filter"),
    db: Session = Depends(get_db),
) -> DistrictCoverageListResponse:
    return OfficialCrimeService.get_district_coverage(db, state_id=state_id)
