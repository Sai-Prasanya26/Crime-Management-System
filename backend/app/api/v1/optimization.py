"""
Phase 10: Constrained Police Resource Optimization API Endpoints.

Provides:
- Inventory audit reconciling official BPR&D baselines and district disclosures
- Constrained MILP optimization execution under verified standing pool constraints
- Multi-scenario planning and comparative shortfall analysis
- Granular district recommendation queries and explainability narratives
- RBAC protection: execution requires ANALYST or ADMIN role
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user, require_analyst
from backend.app.models.auth import User
from backend.app.schemas.common import StandardListResponse
from backend.app.schemas.optimization import (
    OptimizationRunRequest,
    OptimizationRunResponse,
    OptimizationAllocationItem,
    OptimizationOverviewResponse,
    OptimizationResourcesAuditResponse,
    OptimizationScenarioComparisonRequest,
    OptimizationScenarioComparisonResponse,
)
from backend.app.services.optimization_service import OptimizationService
from backend.app.repositories.optimization_repository import OptimizationRepository

router = APIRouter()


@router.get(
    "/overview",
    response_model=OptimizationOverviewResponse,
    summary="Get Optimization Landscape & Inventory Reconciliation",
    description="Retrieve high-level optimization summary, verified BPR&D standing inventories, eligible vs ineligible categories, and recent runs.",
)
def get_optimization_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OptimizationOverviewResponse:
    return OptimizationService.get_overview(db)


@router.get(
    "/resources",
    response_model=OptimizationResourcesAuditResponse,
    summary="Audit Verified Police Resource Inventories",
    description="Retrieve institutional data audit reconciling 288 state resources, 4,510 district records, and the Phase 9 reporting discrepancy explanation.",
)
def get_optimization_resources_audit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OptimizationResourcesAuditResponse:
    return OptimizationService.get_resources_audit(db)


@router.get(
    "/recommendations",
    response_model=StandardListResponse[OptimizationAllocationItem],
    summary="List District Resource Allocations",
    description="Retrieve paginated district-level resource recommendations across executed runs with risk scores, proposed changes, and status indicators.",
)
def list_optimization_recommendations(
    run_id: Optional[str] = Query(None, description="Filter by Optimization Run ID"),
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    district_id: Optional[int] = Query(None, description="Filter by District ID"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID"),
    risk_level: Optional[str] = Query(None, description="Filter by Risk Band (CRITICAL, HIGH, MODERATE, LOW)"),
    allocation_status: Optional[str] = Query(None, description="Filter by Status (SATISFIED, PARTIAL, DEFICIT, UNMET)"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[OptimizationAllocationItem]:
    items, total = OptimizationRepository.list_allocations(
        db,
        run_id=run_id,
        state_id=state_id,
        district_id=district_id,
        resource_type_id=resource_type_id,
        risk_level=risk_level,
        allocation_status=allocation_status,
        skip=skip,
        limit=limit,
    )
    return StandardListResponse(
        items=[OptimizationAllocationItem(**item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/runs",
    response_model=StandardListResponse[OptimizationRunResponse],
    summary="List Executed Optimization Runs",
    description="Retrieve historical optimization scenario runs with solver status, capacity pool utilization, and shortfall reduction metrics.",
)
def list_optimization_runs(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    resource_type_id: Optional[int] = Query(None, description="Filter by Resource Type ID"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[OptimizationRunResponse]:
    runs, total = OptimizationRepository.list_runs(
        db, state_id=state_id, resource_type_id=resource_type_id, skip=skip, limit=limit
    )
    items = []
    for r in runs:
        rt = OptimizationRepository.get_state_resource_pool(db, r.state_id or 1, r.resource_type_id)
        res_name = rt["resource_name"] if rt else f"Resource {r.resource_type_id}"
        res_cat = rt["category"] if rt else "PERSONNEL"
        s_name = rt["state_name"] if rt else "National"
        items.append(OptimizationService._build_run_response(r, [], res_name, res_cat, s_name))

    return StandardListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/runs/{run_id}",
    response_model=OptimizationRunResponse,
    summary="Get Optimization Run Details & Full Allocation Schedule",
    description="Retrieve comprehensive details for a specific optimization run including applied constraints, solver metrics, and all district line-items.",
)
def get_optimization_run_detail(
    run_id: str = Path(..., description="Unique Optimization Run ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OptimizationRunResponse:
    return OptimizationService.get_run_detail(db, run_id=run_id)


@router.post(
    "/run",
    response_model=OptimizationRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Constrained Police Resource Optimization (MILP)",
    description="Execute mixed-integer linear programming optimization to distribute verified state resources across eligible districts. Protected by RBAC (requires ANALYST or ADMIN role).",
)
def execute_optimization_run(
    request: OptimizationRunRequest,
    current_user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> OptimizationRunResponse:
    return OptimizationService.run_optimization(
        db,
        req=request,
        user_id=current_user.id,
    )


@router.post(
    "/scenarios",
    response_model=OptimizationScenarioComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Create & Compare Planning Scenarios",
    description="Simulate multiple optimization scenarios side-by-side with varying constraints or capacity pools. Protected by RBAC (requires ANALYST or ADMIN role).",
)
def compare_optimization_scenarios(
    request: OptimizationScenarioComparisonRequest,
    current_user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> OptimizationScenarioComparisonResponse:
    return OptimizationService.compare_scenarios(
        db,
        req=request,
        user_id=current_user.id,
    )

