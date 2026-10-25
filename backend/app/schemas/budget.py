"""
Phase 11: Budget Estimation and Cost Analysis Schemas.

Pydantic schemas for:
- CostBenchmarkRate
- BudgetEstimateRequest
- BudgetEstimationRun
- BudgetEstimationItem
- ScenarioCostComparison
- BudgetOverview
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CostBenchmarkRateBase(BaseModel):
    resource_type_id: int
    cost_type: str = Field(..., description="RECURRING_MONTHLY, RECURRING_ANNUAL, ONE_TIME_CAPITAL")
    cost_component: str = Field(..., description="SALARY_ALLOWANCES, FUEL_POL, MAINTENANCE, EQUIPMENT_PROCUREMENT, FACILITY_UPKEEP")
    unit_cost_inr: float = Field(..., ge=0)
    source_name: str
    source_publication: str
    reference_year: int = 2024
    data_quality_tier: str = Field(default="ESTIMATED_BENCHMARK", description="OFFICIAL_DOCUMENTED, ESTIMATED_BENCHMARK, ASSUMPTION_BASED")
    formula_expression: str
    assumptions_notes: Optional[str] = None
    is_active: bool = True


class CostBenchmarkRateCreate(CostBenchmarkRateBase):
    pass


class CostBenchmarkRateUpdate(BaseModel):
    unit_cost_inr: Optional[float] = Field(None, ge=0)
    source_name: Optional[str] = None
    source_publication: Optional[str] = None
    reference_year: Optional[int] = None
    data_quality_tier: Optional[str] = None
    formula_expression: Optional[str] = None
    assumptions_notes: Optional[str] = None
    is_active: Optional[bool] = None


class CostBenchmarkRateResponse(CostBenchmarkRateBase):
    id: int
    resource_name: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetEstimateRequest(BaseModel):
    optimization_run_id: Optional[str] = Field(None, description="Run ID of the optimization run to estimate costs for")
    state_id: Optional[int] = Field(None, description="Target state ID (Census 2011)")
    resource_type_id: Optional[int] = Field(None, description="Resource type ID (e.g. 1 for Personnel, 2 for Patrol Vehicles)")
    period_year: Optional[int] = Field(2026, description="Assessment year")
    period_month: Optional[int] = Field(1, description="Assessment month")
    projection_months: Optional[int] = Field(12, description="Projection duration in months (12 for annual)")
    include_procurement: Optional[bool] = Field(True, description="Whether to include one-time capital procurement cost for unmet shortfalls")


class BudgetEstimationItemResponse(BaseModel):
    id: Optional[int] = None
    district_id: int
    district_name: Optional[str] = None
    state_name: Optional[str] = None
    resource_type_id: int
    resource_name: Optional[str] = None
    baseline_units: Optional[int] = None
    recommended_units: int
    new_procurement_units: int
    monthly_recurring_unit_cost: float
    annual_recurring_unit_cost: float
    one_time_unit_cost: float
    baseline_annual_cost: float
    recommended_annual_cost: float
    procurement_cost: float
    net_delta_annual_cost: float
    data_quality_tier: str
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


class BudgetEstimationRunResponse(BaseModel):
    id: Optional[int] = None
    run_id: str
    optimization_run_id: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    resource_type_id: Optional[int] = None
    resource_name: Optional[str] = None
    period_year: int
    period_month: int
    assessment_period: str
    estimation_mode: str
    currency: str = "INR"
    total_baseline_recurring_annual: float
    total_scenario_recurring_annual: float
    total_baseline_recurring_monthly: float
    total_scenario_recurring_monthly: float
    total_one_time_procurement_cost: float
    incremental_recurring_cost: float
    total_shortfall_resolution_cost: float
    verified_cost_ratio: float
    assumed_cost_ratio: float
    status: str
    assumptions_summary: Optional[Dict[str, Any]] = None
    explanation_summary: Optional[str] = None
    created_at: Optional[str] = None
    items: Optional[List[BudgetEstimationItemResponse]] = None

    class Config:
        from_attributes = True


class ScenarioCostComparisonRequest(BaseModel):
    baseline_run_id: str
    scenario_run_id: str


class ScenarioCostComparisonResponse(BaseModel):
    baseline_run_id: str
    scenario_run_id: str
    scenario_name: str
    scenario_type: str
    allocation_mode: str
    currency: str = "INR"
    baseline_recurring_annual: float
    scenario_recurring_annual: float
    incremental_recurring_annual: float
    capital_procurement_cost: float
    total_shortfall_resolution_cost: float
    baseline_recurring_monthly: float
    scenario_recurring_monthly: float
    net_delta_monthly: float
    units_reallocated: int
    units_newly_procured: int
    data_validity: str
    is_simulation: bool
    assumptions: List[str]
    comparison_notes: str


class BudgetOverviewResponse(BaseModel):
    total_annual_baseline_cost: float
    total_annual_scenario_cost: float
    total_monthly_baseline_cost: float
    total_monthly_scenario_cost: float
    total_capital_procurement_cost: float
    incremental_cost_delta: float
    currency: str = "INR"
    verified_cost_percentage: float
    assumed_cost_percentage: float
    total_benchmarks_active: int
    category_breakdown: Dict[str, Dict[str, float]]
    recent_runs: List[BudgetEstimationRunResponse]

