from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from backend.app.database.session import get_db
from backend.app.services.geography_service import GeographyService
from backend.app.schemas.geography import (
    StateListResponse,
    DistrictListResponse,
    DistrictDetailResponse,
    DistrictGeographyMappingListResponse,
    JurisdictionProfileResponse,
)
from backend.app.schemas.data_coverage import (
    DistrictCoverageReport,
    NationwideCoverageSummary,
)
from backend.app.services.data_coverage_service import DataCoverageService

router = APIRouter()


@router.get(
    "/states",
    response_model=StateListResponse,
    summary="Get States and Union Territories",
    description="Retrieve Indian States and Union Territories. Defaults to current administrative master (28 States + 8 UTs = 36 total). Set view=historical for Census 2011 baseline.",
)
def get_states(
    view: str = Query("current", description="Geographic layer: 'current' (28 States + 8 UTs) or 'historical' (Census 2011 35 entities)"),
    db: Session = Depends(get_db),
) -> StateListResponse:
    return GeographyService.get_states(db, view=view)


@router.get(
    "/districts",
    response_model=DistrictListResponse,
    summary="Get Districts",
    description="Retrieve administrative districts with optional state_id filtering. Defaults to current administrative layer (787 districts). Set view=historical for Census 2011 (640 districts).",
)
def get_districts(
    state_id: Optional[int] = Query(None, description="Filter districts by State ID"),
    view: str = Query("current", description="Geographic layer: 'current' (787 districts) or 'historical' (640 districts)"),
    db: Session = Depends(get_db),
) -> DistrictListResponse:
    return GeographyService.get_districts(db, state_id=state_id, view=view)


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


@router.get(
    "/jurisdiction-profile",
    response_model=JurisdictionProfileResponse,
    summary="Get Jurisdiction Profile Statistics",
    description="Retrieve aggregated jurisdiction profile (Reported Incidents, Population, Crime Rate per 100k, Risk Level) for either a State/UT or District.",
)
@router.get(
    "/profile",
    response_model=JurisdictionProfileResponse,
    include_in_schema=False,
)
def get_jurisdiction_profile(
    state_id: Optional[int] = Query(None, description="State ID for state overview or district scope validation"),
    district_id: Optional[int] = Query(None, description="District ID for district profile"),
    scope: Optional[str] = Query(None, description="Explicit jurisdiction scope ('national', 'state', 'district')"),
    geography_mode: str = Query("current", pattern="^(current|historical)$", description="Geographic mode ('current' or 'historical')"),
    start_date: Optional[date] = Query(None, description="Filter incidents starting from (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter incidents up to (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> JurisdictionProfileResponse:
    return GeographyService.get_jurisdiction_profile(
        db,
        state_id=state_id,
        district_id=district_id,
        scope=scope,
        geography_mode=geography_mode,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/mappings",
    response_model=DistrictGeographyMappingListResponse,
    summary="Get Historical to Current District Mappings",
    description="Retrieve verified boundary lineage and mappings between Census 2011 historical districts and modern administrative districts.",
)
def get_district_mappings(
    historical_district_id: Optional[int] = Query(None, description="Filter by historical district ID"),
    current_district_id: Optional[int] = Query(None, description="Filter by current district ID"),
    db: Session = Depends(get_db),
) -> DistrictGeographyMappingListResponse:
    return GeographyService.get_district_mappings(
        db,
        historical_district_id=historical_district_id,
        current_district_id=current_district_id,
    )


@router.get(
    "/data-coverage/summary",
    response_model=NationwideCoverageSummary,
    summary="Get Nationwide Data Coverage and Provenance Summary",
    description="Retrieve nationwide statistics broken down by data coverage tier (DIRECT_OBSERVATION, PARENT_DERIVED, UNAVAILABLE, SIMULATED_TEST) across all functional domains.",
)
def get_nationwide_coverage_summary(
    db: Session = Depends(get_db),
) -> NationwideCoverageSummary:
    return DataCoverageService.get_nationwide_coverage_summary(db)


@router.get(
    "/data-coverage/{district_id}",
    response_model=DistrictCoverageReport,
    summary="Get District Data Coverage and Provenance Profile",
    description="Retrieve domain-by-domain data coverage classification for a specific district, detailing direct vs parent-derived lineage.",
)
def get_district_coverage(
    district_id: int = Path(..., description="Target District ID", ge=1),
    db: Session = Depends(get_db),
) -> DistrictCoverageReport:
    return DataCoverageService.get_district_coverage(db, district_id=district_id)

