"""
Phase 10B & Extended Operational Intelligence: Resource Optimization API Endpoints.

Protected routes providing access to:
- Official state and district police resource data (BPR&D, NCRB, State Police)
- Complete categorization (Personnel, Mobility, Investigation, Surveillance, Infrastructure, etc.)
- Explainable AI recommendations & priority classifications
- Actual vs required gap analysis (with strict NULL gap handling for unrecorded ground inventories)
- Coverage dashboard and constrained allocation simulations under resource-v1.0.

Requires authenticated staff JWT.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, Body, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.resource import (
    ResourceOverviewResponse,
    ResourceItemResponse,
    DistrictResourceDetailResponse,
    ResourceModelInfoResponse,
    ResourceAllocationSimulationResponse,
    ResourceAllocationSimulationRequest,
    StateResourceItemResponse,
    ResourceCoverageResponse,
    DistrictResourceItemResponse,
    ResourceCategoryDetailResponse,
    DistrictResourceGapResponse,
    AIResourceRecommendationResponse,
)
from backend.app.schemas.common import StandardListResponse
from backend.app.services.resource_service import ResourceService, CALCULATION_VERSION

router = APIRouter()


@router.get(
    "/overview",
    response_model=ResourceOverviewResponse,
    summary="Get Resource Optimization Overview",
    description="Retrieve high-level resource landscape across all 640 assessed districts including gross demand by resource type, availability data status, priority distribution, and budget sum.",
)
def get_resource_overview(
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Resource methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceOverviewResponse:
    return ResourceService.get_overview(
        db,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
    )


@router.get(
    "/model",
    response_model=ResourceModelInfoResponse,
    summary="Get Resource Optimization Methodology & Equations",
    description="Retrieve frozen resource-v1.0 methodology details, mathematical formulas, resource categories, unit costs, and operational governance notes.",
)
def get_resource_model_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceModelInfoResponse:
    return ResourceService.get_methodology_info(db)


@router.get(
    "/categories",
    response_model=List[ResourceCategoryDetailResponse],
    summary="List Operational Resource Categories & Taxonomy",
    description="Retrieve normalized operational categories (Personnel, Mobility, Investigation, Surveillance, Infrastructure, Specialized, Emergency, Station Capacity).",
)
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ResourceCategoryDetailResponse]:
    return ResourceService.list_categories(db)


@router.get(
    "/states",
    response_model=StandardListResponse[StateResourceItemResponse],
    summary="List Official State Police Resources",
    description="Retrieve verified state-level official police resource data (personnel strength, transport fleet, stations) from authoritative BPR&D / MHA government records.",
)
def list_state_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID"),
    reference_year: Optional[int] = Query(None, description="Filter by reporting reference year (e.g. 2020, 2024)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[StateResourceItemResponse]:
    return ResourceService.list_state_resources(
        db,
        state_id=state_id,
        resource_type_id=resource_type_id,
        reference_year=reference_year,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/coverage",
    response_model=ResourceCoverageResponse,
    summary="Get Official Resource Data Coverage & Methodology Notes",
    description="Retrieve institutional data coverage metrics, tracked resource categories, covered vs missing states, district coverage, and operational methodology notes.",
)
def get_resource_coverage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceCoverageResponse:
    return ResourceService.get_coverage(db)


@router.get(
    "/districts",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List District Resource Inventories & Status",
    description="Retrieve district-level operational resources across 640 districts with verified official counts, AI model estimates, and unrecorded badges.",
)
def list_district_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    category: Optional[str] = Query(None, description="Filter by Category (PERSONNEL, MOBILITY, INVESTIGATION, SURVEILLANCE, INFRASTRUCTURE)"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID"),
    data_status: Optional[str] = Query(None, description="Filter by Status (OFFICIAL_DISTRICT, OFFICIAL_POLICE_DEPARTMENT, UNRECORDED)"),
    reference_year: Optional[int] = Query(None, description="Filter by Reference Year"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_district_resources(
        db,
        state_id=state_id,
        district_id=district_id,
        category=category,
        resource_type_id=resource_type_id,
        data_status=data_status,
        reference_year=reference_year,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/districts/{district_id}",
    response_model=List[DistrictResourceItemResponse],
    summary="Get Multi-Category Resources for a Specific District",
    description="Retrieve the full operational inventory and requirement breakdown for a specific district across all categories.",
)
def get_district_resources_multi(
    district_id: int = Path(..., ge=1, description="Unique ID of the district"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DistrictResourceItemResponse]:
    return ResourceService.get_district_multi_detail(db, district_id=district_id)


@router.get(
    "/personnel",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List Police Personnel Resources",
    description="Retrieve district police personnel (actual strength, sanctioned, AI requirement, and unrecorded inventory).",
)
def list_personnel_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    data_status: Optional[str] = Query(None, description="Filter by Data Status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_category_resources(
        db, category="PERSONNEL", state_id=state_id, district_id=district_id, data_status=data_status, skip=skip, limit=limit
    )


@router.get(
    "/vehicles",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List Patrol & Mobility Resources",
    description="Retrieve district vehicle and patrol mobility resources (patrol vehicles, highway patrol, PCR vans).",
)
def list_vehicle_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    data_status: Optional[str] = Query(None, description="Filter by Data Status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_category_resources(
        db, category="MOBILITY", state_id=state_id, district_id=district_id, data_status=data_status, skip=skip, limit=limit
    )


@router.get(
    "/investigation",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List Investigation Resources",
    description="Retrieve district investigation units, teams, forensic support, and cyber units.",
)
def list_investigation_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    data_status: Optional[str] = Query(None, description="Filter by Data Status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_category_resources(
        db, category="INVESTIGATION", state_id=state_id, district_id=district_id, data_status=data_status, skip=skip, limit=limit
    )


@router.get(
    "/surveillance",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List Surveillance Resources",
    description="Retrieve district surveillance teams, CCTV networks, and command and control centers.",
)
def list_surveillance_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    data_status: Optional[str] = Query(None, description="Filter by Data Status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_category_resources(
        db, category="SURVEILLANCE", state_id=state_id, district_id=district_id, data_status=data_status, skip=skip, limit=limit
    )


@router.get(
    "/infrastructure",
    response_model=StandardListResponse[DistrictResourceItemResponse],
    summary="List Police Infrastructure Resources",
    description="Retrieve police stations, outposts, cyber stations, women stations, and forensic laboratories.",
)
def list_infrastructure_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    data_status: Optional[str] = Query(None, description="Filter by Data Status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceItemResponse]:
    return ResourceService.list_category_resources(
        db, category="INFRASTRUCTURE", state_id=state_id, district_id=district_id, data_status=data_status, skip=skip, limit=limit
    )


@router.get(
    "/gaps",
    response_model=StandardListResponse[DistrictResourceGapResponse],
    summary="List Comparative Resource Gaps",
    description="Retrieve comparative actual vs required resource gaps. Strictly returns gap = NULL for unrecorded ground inventories.",
)
def list_resource_gaps(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[DistrictResourceGapResponse]:
    return ResourceService.list_resource_gaps(
        db, state_id=state_id, category=category, skip=skip, limit=limit
    )


@router.get(
    "/recommendations",
    response_model=StandardListResponse[AIResourceRecommendationResponse],
    summary="List District AI Resource Recommendations & Priorities",
    description="Retrieve district AI model estimates across all resource domains with explainable priority tiers (CRITICAL, HIGH, MEDIUM, LOW) and detailed rationale.",
)
def list_ai_recommendations(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    priority_tier: Optional[str] = Query(None, description="Filter by Priority Tier (CRITICAL, HIGH, MEDIUM, LOW)"),
    risk_level: Optional[str] = Query(None, description="Filter by Risk Band (LOW, MODERATE, HIGH, CRITICAL)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[AIResourceRecommendationResponse]:
    return ResourceService.list_ai_recommendations(
        db, state_id=state_id, priority_tier=priority_tier, risk_level=risk_level, skip=skip, limit=limit
    )


@router.get(
    "",
    response_model=StandardListResponse[ResourceItemResponse],
    summary="List District Resource Recommendations (Legacy Model)",
    description="Retrieve paginated resource recommendations across districts and asset types with optional geographic, resource type, priority tier, and risk filters.",
)
def list_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID (1: Officers, 2: Vehicles, 3: Teams, 4: Surveillance)"),
    priority_tier: Optional[str] = Query(None, description="Filter by Priority Tier (CRITICAL, HIGH, MODERATE, LOW)"),
    risk_level: Optional[str] = Query(None, description="Filter by Risk Band (LOW, MODERATE, HIGH, CRITICAL)"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Resource methodology version"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[ResourceItemResponse]:
    return ResourceService.list_resources(
        db,
        state_id=state_id,
        district_id=district_id,
        resource_type_id=resource_type_id,
        priority_tier=priority_tier,
        risk_level=risk_level,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/allocate",
    response_model=ResourceAllocationSimulationResponse,
    summary="Simulate Constrained Resource Allocation",
    description="Simulate Greedy Tiered Priority Allocation across districts for a specific resource type under an administratively defined pool capacity constraint C_r.",
)
def simulate_resource_allocation(
    request: ResourceAllocationSimulationRequest = Body(...),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Resource methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceAllocationSimulationResponse:
    return ResourceService.simulate_constrained_allocation(
        db,
        resource_type_id=request.resource_type_id,
        pool_capacity=request.pool_capacity,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
    )


@router.get(
    "/{district_id}",
    response_model=DistrictResourceDetailResponse,
    summary="Get District Resource Requirements & Schedule",
    description="Retrieve the complete explainable resource schedule for a specific district across all 4 resource categories.",
)
def get_district_resource_detail(
    district_id: int = Path(..., ge=1, description="Unique ID of the historical district"),
    assessment_period: str = Query("2026-01-01", description="Assessment period date (YYYY-MM-DD)"),
    calculation_version: str = Query(CALCULATION_VERSION, description="Resource methodology version"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistrictResourceDetailResponse:
    return ResourceService.get_district_detail(
        db,
        district_id=district_id,
        assessment_period=assessment_period,
        calculation_version=calculation_version,
    )
