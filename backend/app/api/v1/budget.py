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
from backend.app.api.deps import get_current_user, require_analyst
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

