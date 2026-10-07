"""
Phase 10B: Resource Optimization API Endpoints.

Protected routes providing access to explainable district resource recommendations,
unrecorded vs verified availability status, priority scoring, budget estimations,
and constrained allocation simulations under resource-v1.0.
Requires authenticated staff JWT.
"""

from typing import Optional
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
    "",
    response_model=StandardListResponse[ResourceItemResponse],
    summary="List District Resource Recommendations",
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


@router.get(
    "/states",
    response_model=StandardListResponse[StateResourceItemResponse],
    summary="List Official State Police Resources",
    description="Retrieve verified state-level official police resource data (personnel strength and fleet availability) from authoritative BPR&D / MHA government records.",
)
def list_state_resources(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID (1: Officers, 2: Vehicles)"),
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
    description="Retrieve institutional data coverage metrics, tracked resource categories, covered vs missing states, and operational methodology notes regarding state-level aggregate preservation.",
)
def get_resource_coverage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceCoverageResponse:
    return ResourceService.get_coverage(db)


@router.get(
    "/{district_id}",
    response_model=DistrictResourceDetailResponse,
    summary="Get District Resource Requirements & Schedule",
    description="Retrieve the complete explainable resource schedule for a specific district across all 4 resource categories, including derived formulas, priority score, availability status, and budget breakdown.",
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
