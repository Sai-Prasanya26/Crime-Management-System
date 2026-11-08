"""
Phase 11: Budget Estimation and Cost Analysis API Endpoints.

Provides:
- Macroeconomic and operational budget overview
- Benchmark cost rates with complete provenance metadata
- Dynamic budget estimation integrated with Phase 10 / 10.1 Optimization Runs
- Baseline vs scenario cost comparison (incremental delta and shortfall resolution)
- Granular itemized district cost calculations
- RBAC: Viewing requires authenticated user; running estimations requires ANALYST or ADMIN role.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, status, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.api.deps import get_current_user, require_analyst, require_admin
from backend.app.models.auth import User
from backend.app.schemas.budget import (
    CostBenchmarkRateResponse,
    CostBenchmarkRateCreate,
    CostBenchmarkRateUpdate,
    BudgetEstimateRequest,
    BudgetEstimationRunResponse,
    ScenarioCostComparisonRequest,
    ScenarioCostComparisonResponse,
    BudgetOverviewResponse,
    ResourceCostMasterCreate,
    ResourceCostMasterUpdate,
    ResourceCostMasterResponse,
    StateBudgetCreate,
    StateBudgetUpdate,
    StateBudgetResponse,
    StateBudgetSummaryItem,
    DistrictBudgetAllocationCreate,
    DistrictBudgetAllocationUpdate,
    DistrictBudgetAllocationResponse,
    DistrictBudgetSummaryItem,
    BudgetSimulationRequest,
    BudgetSimulationResponse,
    BudgetScenarioCreate,
    BudgetScenarioResponse,
    BudgetCalculationHistoryResponse,
    FullBudgetOverviewResponse,
)
from backend.app.services.budget_service import BudgetService
from backend.app.repositories.budget_repository import BudgetRepository

router = APIRouter()


@router.get(
    "/overview",
    response_model=BudgetOverviewResponse,
    summary="Get Budget & Cost Overview",
    description="Returns system-wide operational cost metrics, category breakdowns, and benchmark provenance ratios.",
)
def get_budget_overview(
    assessment_period: Optional[str] = Query("2026-01-01", description="Assessment period YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.get_overview(db, assessment_period=assessment_period)


@router.get(
    "/benchmarks",
    response_model=List[CostBenchmarkRateResponse],
    summary="List Cost Benchmark Rates",
    description="Returns all active cost benchmark rates with source publications, reference years, formulas, and data quality tiers.",
)
def list_cost_benchmarks(
    resource_type_id: Optional[int] = Query(None, description="Filter by resource type ID"),
    cost_type: Optional[str] = Query(None, description="Filter by cost type: RECURRING_MONTHLY, RECURRING_ANNUAL, ONE_TIME_CAPITAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.get_benchmarks(db, resource_type_id=resource_type_id, cost_type=cost_type)


@router.get(
    "/benchmarks/{resource_type_id}",
    response_model=dict,
    summary="Get Effective Rates for Resource Type",
    description="Returns aggregate recurring monthly, annual, and one-time capital rates for a specific resource type with source provenance.",
)
def get_effective_resource_rate(
    resource_type_id: int = Path(..., description="Resource type ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetRepository.get_effective_rates_for_resource(db, resource_type_id)


@router.post(
    "/benchmarks",
    response_model=CostBenchmarkRateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Cost Benchmark Rate",
    description="Registers a new benchmark rate. Requires ANALYST or ADMIN role.",
)
def create_cost_benchmark(
    data: CostBenchmarkRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    rate = BudgetRepository.create_benchmark_rate(db, data.model_dump())
    return CostBenchmarkRateResponse.model_validate(rate)


@router.put(
    "/benchmarks/{rate_id}",
    response_model=CostBenchmarkRateResponse,
    summary="Update Cost Benchmark Rate",
    description="Updates an existing benchmark rate. Requires ANALYST or ADMIN role.",
)
def update_cost_benchmark(
    rate_id: int = Path(..., description="Cost benchmark rate ID"),
    updates: CostBenchmarkRateUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    rate = BudgetRepository.update_benchmark_rate(db, rate_id, updates.model_dump(exclude_unset=True))
    if not rate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark rate not found.")
    return CostBenchmarkRateResponse.model_validate(rate)


@router.post(
    "/estimate",
    response_model=BudgetEstimationRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Budget & Cost Estimation",
    description="Executes dynamic budget estimation. Integrates with Phase 10/10.1 optimization scenarios. Requires ANALYST or ADMIN role.",
)
def estimate_budget(
    req: BudgetEstimateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    try:
        return BudgetService.estimate_budget(db, req, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Estimation failed: {str(e)}")


@router.post(
    "/scenarios/compare",
    response_model=ScenarioCostComparisonResponse,
    summary="Compare Scenario Costs",
    description="Calculates incremental cost delta between two optimization runs (scenario vs baseline). Requires ANALYST or ADMIN role.",
)
def compare_scenarios(
    req: ScenarioCostComparisonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    try:
        return BudgetService.compare_scenarios(db, req.baseline_run_id, req.scenario_run_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison failed: {str(e)}")


@router.get(
    "/runs",
    response_model=List[BudgetEstimationRunResponse],
    summary="List Budget Estimation Runs",
    description="Returns recent historical budget and cost estimation runs.",
)
def list_budget_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs = BudgetRepository.list_budget_runs(db, skip=skip, limit=limit)
    return [BudgetService._format_run_response(db, r, []) for r in runs]


@router.get(
    "/runs/{run_id}",
    response_model=BudgetEstimationRunResponse,
    summary="Get Budget Estimation Run Detail",
    description="Returns full run details including itemized district calculations.",
)
def get_budget_run(
    run_id: str = Path(..., description="Budget estimation run ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = BudgetRepository.get_budget_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget estimation run not found.")
    return BudgetService._format_run_response(db, run)


# =========================================================================
# Phase 11: Budget Intelligence Endpoints
# =========================================================================

@router.get(
    "/full-overview",
    response_model=FullBudgetOverviewResponse,
    summary="Get Full 10-Pool Budget Intelligence Overview",
    description="Returns comprehensive 10-pool financial requirements, separating CAPEX from OPEX and partner agency costs.",
)
def get_full_budget_overview(
    year: int = Query(2026, description="Budget / forecast year"),
    month: int = Query(11, description="Budget / forecast month"),
    state_id: Optional[int] = Query(None, description="Optional state filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.get_full_overview(db, year=year, month=month, state_id=state_id)


@router.get(
    "/states/summary",
    response_model=List[StateBudgetSummaryItem],
    summary="Get State-Wise Budget Comparison",
    description="Returns state-wise comparison of estimated resource requirements against configured statutory police budgets.",
)
def get_state_budget_summary(
    year: int = Query(2026, description="Budget year"),
    month: int = Query(11, description="Budget month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.get_state_budget_summary(db, year=year, month=month)


@router.get(
    "/state/{state_id}",
    response_model=StateBudgetSummaryItem,
    summary="Get Specific State Budget Summary",
    description="Returns state budget summary and gap analysis for a specific state ID.",
)
def get_state_budget_detail(
    state_id: int = Path(..., description="State ID"),
    year: int = Query(2026, description="Budget year"),
    month: int = Query(11, description="Budget month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summaries = BudgetService.get_state_budget_summary(db, year=year, month=month)
    target = next((s for s in summaries if s.state_id == state_id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"State ID {state_id} not found.")
    return target


@router.get(
    "/district/{district_id}",
    response_model=DistrictBudgetSummaryItem,
    summary="Get Specific District Budget Detail",
    description="Returns 10-pool requirement, cost classification, and gap analysis for a specific district ID.",
)
def get_district_budget_detail(
    district_id: int = Path(..., description="District ID"),
    year: int = Query(2026, description="Budget year"),
    month: int = Query(11, description="Budget month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BudgetService.calculate_district_10pool_budget(db, district_id=district_id, year=year, month=month)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"District {district_id} calculation failed: {str(e)}")


@router.get(
    "/districts/summary",
    summary="Get District-Wise Budget Register & Gap Analysis",
    description="Returns paginated district-level budget register with complete 10-pool requirements and gap analysis.",
)
def get_district_budget_summary(
    state_id: Optional[int] = Query(None, description="Filter by State ID"),
    year: int = Query(2026, description="Budget year"),
    month: int = Query(11, description="Budget month"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    search: Optional[str] = Query(None, description="Search district name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = BudgetService.get_district_budget_summary(
        db,
        state_id=state_id,
        year=year,
        month=month,
        skip=skip,
        limit=limit,
        risk_level=risk_level,
        search=search,
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get(
    "/cost-master",
    response_model=List[ResourceCostMasterResponse],
    summary="List Resource Cost Master",
    description="Returns all 10 Phase 10 resource pool cost master records.",
)
def list_cost_master(
    category: Optional[str] = Query(None, description="Filter by category (e.g. PERSONNEL, MOBILITY)"),
    is_active: bool = Query(True, description="Filter active cost records"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.list_cost_master(db, category=category, is_active=is_active)


@router.get(
    "/cost-master/{rcm_id}",
    response_model=ResourceCostMasterResponse,
    summary="Get Resource Cost Master Item",
)
def get_cost_master_item(
    rcm_id: int = Path(..., description="Cost master ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = BudgetService.get_cost_master_item(db, rcm_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource cost master item not found.")
    return item


@router.post(
    "/cost-master",
    response_model=ResourceCostMasterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Resource Cost Master Item",
    description="Registers a new resource cost master record. Requires ADMIN role.",
)
def create_cost_master_item(
    data: ResourceCostMasterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return BudgetService.create_cost_master_item(db, data, current_user=current_user)


@router.put(
    "/cost-master/{rcm_id}",
    response_model=ResourceCostMasterResponse,
    summary="Update Resource Cost Master Item",
    description="Updates unit acquisition, operating, or maintenance costs. Requires ADMIN role.",
)
def update_cost_master_item(
    rcm_id: int = Path(..., description="Cost master ID"),
    updates: ResourceCostMasterUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    item = BudgetService.update_cost_master_item(db, rcm_id, updates, current_user=current_user)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource cost master item not found.")
    return item


@router.delete(
    "/cost-master/{rcm_id}",
    summary="Delete Resource Cost Master Item",
    description="Soft-deletes a cost master record. Requires ADMIN role.",
)
def delete_cost_master_item(
    rcm_id: int = Path(..., description="Cost master ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    success = BudgetService.delete_cost_master_item(db, rcm_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource cost master item not found.")
    return {"status": "success", "message": f"Resource cost master record {rcm_id} deactivated."}


@router.get(
    "/state-budgets",
    response_model=List[StateBudgetResponse],
    summary="List State Budgets",
    description="Returns state statutory budget baselines.",
)
def list_state_budgets(
    year: int = Query(2026, description="Budget year"),
    state_id: Optional[int] = Query(None, description="Optional state ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.list_state_budgets(db, year=year, state_id=state_id)


@router.post(
    "/state-budgets",
    response_model=StateBudgetResponse,
    summary="Configure State Budget",
    description="Sets or updates statutory annual/monthly police budget for a state. Requires ADMIN role.",
)
def configure_state_budget(
    data: StateBudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return BudgetService.upsert_state_budget(db, data, current_user=current_user)


@router.get(
    "/district-budgets",
    summary="List District Budgets",
    description="Returns district budget allocations.",
)
def list_district_budgets(
    year: int = Query(2026, description="Budget year"),
    state_id: Optional[int] = Query(None, description="Optional state ID"),
    district_id: Optional[int] = Query(None, description="Optional district ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = BudgetService.list_district_budgets(db, year=year, state_id=state_id, district_id=district_id, skip=skip, limit=limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post(
    "/district-budgets",
    response_model=DistrictBudgetAllocationResponse,
    summary="Configure District Budget",
    description="Sets or updates district police budget allocation. Requires ADMIN role.",
)
def configure_district_budget(
    data: DistrictBudgetAllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return BudgetService.upsert_district_budget(db, data, current_user=current_user)


@router.post(
    "/simulate",
    response_model=BudgetSimulationResponse,
    summary="Simulate Budget Scenario",
    description="Interactive in-memory simulation of proposed budget ceilings and unit costs. Requires ANALYST or ADMIN role.",
)
def simulate_budget_scenario(
    req: BudgetSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    return BudgetService.simulate_budget_scenario(db, req, current_user=current_user)


@router.get(
    "/scenarios",
    response_model=List[BudgetScenarioResponse],
    summary="List Saved Budget Scenarios",
)
def list_budget_scenarios(
    state_id: Optional[int] = Query(None, description="Filter by state ID"),
    district_id: Optional[int] = Query(None, description="Filter by district ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.list_scenarios(db, state_id=state_id, district_id=district_id)


@router.post(
    "/scenarios",
    response_model=BudgetScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save Budget Scenario",
    description="Persists a simulation scenario configuration. Requires ANALYST or ADMIN role.",
)
def save_budget_scenario(
    data: BudgetScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    return BudgetService.create_scenario(db, data, current_user=current_user)


@router.get(
    "/history",
    response_model=List[BudgetCalculationHistoryResponse],
    summary="List Budget Calculation History",
)
def list_budget_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return BudgetService.list_calculation_history(db, skip=skip, limit=limit)


