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

from typing import Optional, List, Dict, Any, Union
from datetime import datetime
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
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

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


# =====================================================================
# Phase 11: Comprehensive Budget Intelligence Schemas
# =====================================================================

class ResourceCostMasterBase(BaseModel):
    resource_category: str = Field(..., description="PERSONNEL, MOBILITY, INVESTIGATION, etc.")
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    unit_acquisition_cost: float = Field(0.0, ge=0, description="CAPEX unit procurement cost")
    monthly_operating_cost: float = Field(0.0, ge=0, description="Monthly recurring operating cost")
    annual_maintenance_cost: float = Field(0.0, ge=0, description="Annual maintenance and servicing cost")
    cost_classification: str = Field("CAPEX", description="CAPEX, OPEX, HYBRID")
    currency: str = "INR"
    source_of_cost_estimate: str = "ADMIN_ESTIMATE"
    source_url_or_document: Optional[str] = None
    price_reference_year: int = 2024
    effective_date: Optional[str] = None
    verification_status: str = Field("NOT_CONFIGURED", description="OFFICIAL_SOURCE, VERIFIED_QUOTATION, ADMIN_ESTIMATE, NOT_CONFIGURED")
    is_partner_agency: bool = False
    notes: Optional[str] = None
    is_active: bool = True


class ResourceCostMasterCreate(ResourceCostMasterBase):
    pass


class ResourceCostMasterUpdate(BaseModel):
    unit_acquisition_cost: Optional[float] = Field(None, ge=0)
    monthly_operating_cost: Optional[float] = Field(None, ge=0)
    annual_maintenance_cost: Optional[float] = Field(None, ge=0)
    cost_classification: Optional[str] = None
    source_of_cost_estimate: Optional[str] = None
    source_url_or_document: Optional[str] = None
    price_reference_year: Optional[int] = None
    effective_date: Optional[str] = None
    verification_status: Optional[str] = None
    is_partner_agency: Optional[bool] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ResourceCostMasterResponse(ResourceCostMasterBase):
    id: int
    last_updated_date: Optional[str] = None
    configured_by_username: Optional[str] = None

    class Config:
        from_attributes = True


class StateBudgetBase(BaseModel):
    state_id: int
    budget_year: int = 2026
    annual_budget: Optional[float] = None
    monthly_budget: Optional[float] = None
    allocated_budget: Optional[float] = None
    spent_budget: Optional[float] = None
    remaining_budget: Optional[float] = None
    proposed_budget: Optional[float] = None
    currency: str = "INR"
    source_document: Optional[str] = None
    verification_status: str = "NOT_CONFIGURED"
    notes: Optional[str] = None
    is_active: bool = True


class StateBudgetCreate(StateBudgetBase):
    pass


class StateBudgetUpdate(BaseModel):
    annual_budget: Optional[float] = None
    monthly_budget: Optional[float] = None
    allocated_budget: Optional[float] = None
    spent_budget: Optional[float] = None
    remaining_budget: Optional[float] = None
    proposed_budget: Optional[float] = None
    source_document: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class StateBudgetResponse(StateBudgetBase):
    id: int
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

    class Config:
        from_attributes = True


class DistrictBudgetAllocationBase(BaseModel):
    district_id: int
    state_id: int
    budget_year: int = 2026
    budget_month: Optional[int] = 11
    annual_budget: Optional[float] = None
    monthly_budget: Optional[float] = None
    allocated_budget: Optional[float] = None
    spent_budget: Optional[float] = None
    remaining_budget: Optional[float] = None
    proposed_budget: Optional[float] = None
    currency: str = "INR"
    verification_status: str = "NOT_CONFIGURED"
    source_document: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class DistrictBudgetAllocationCreate(DistrictBudgetAllocationBase):
    pass


class DistrictBudgetAllocationUpdate(BaseModel):
    annual_budget: Optional[float] = None
    monthly_budget: Optional[float] = None
    allocated_budget: Optional[float] = None
    spent_budget: Optional[float] = None
    remaining_budget: Optional[float] = None
    proposed_budget: Optional[float] = None
    verification_status: Optional[str] = None
    source_document: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class DistrictBudgetAllocationResponse(DistrictBudgetAllocationBase):
    id: int
    district_name: Optional[str] = None
    state_name: Optional[str] = None
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

    class Config:
        from_attributes = True


class PoolCostItem(BaseModel):
    resource_category: str
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    recommended_units: int
    existing_inventory_units: int
    procurement_units: int
    inventory_status: str  # VERIFIED, UNRECORDED, NOT_CONFIGURED
    unit_acquisition_cost: float
    monthly_operating_unit_cost: float
    annual_maintenance_unit_cost: float
    total_acquisition_cost: float
    monthly_operating_cost: float
    annual_operating_cost: float
    annual_maintenance_cost: float
    total_annual_requirement: float
    is_partner_agency: bool
    verification_status: str


class DistrictBudgetSummaryItem(BaseModel):
    rank: int
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    risk_score: float
    risk_level: str
    recommended_units_total: int
    existing_inventory_total: int
    procurement_units_total: int
    inventory_configured_status: str  # FULLY_RECORDED, PARTIAL, UNRECORDED
    total_estimated_requirement: float
    total_capex_procurement: float
    total_opex_annual: float
    total_maintenance_annual: float
    total_partner_agency_cost: float
    total_police_budget_requirement: float
    configured_budget: Optional[float] = None
    budget_verification_status: str
    budget_gap_or_surplus: Optional[float] = None
    unmet_demand_count: int
    pool_breakdown: List[PoolCostItem]


class StateBudgetSummaryItem(BaseModel):
    state_id: int
    state_name: str
    state_code: Optional[str] = None
    districts_count: int
    districts_assessed_count: int
    total_estimated_requirement: float
    total_capex_procurement: float
    total_opex_annual: float
    total_maintenance_annual: float
    total_partner_agency_cost: float
    total_police_budget_requirement: float
    configured_annual_budget: Optional[float] = None
    budget_verification_status: str
    budget_gap_or_surplus: Optional[float] = None
    unmet_demand_total: int
    inventory_configured_districts: int


class BudgetSimulationRequest(BaseModel):
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    period_year: int = 2026
    period_month: int = 11
    total_budget_limit: Optional[float] = None
    category_budget_limits: Optional[Dict[str, float]] = None  # e.g. {"PERSONNEL": 50000000}
    cost_overrides: Optional[Dict[str, Dict[str, float]]] = None  # e.g. {"1": {"acquisition": 80000, "operating": 60000}}
    quantity_overrides: Optional[Dict[str, int]] = None  # e.g. {"1": 25, "2": 10}
    operating_assumptions: Optional[Dict[str, Any]] = None  # e.g. {"months": 12, "inflation_pct": 5}


class BudgetSimulationResponse(BaseModel):
    scenario_id: str
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    period_year: int
    period_month: int
    baseline_police_requirement: float
    proposed_police_requirement: float
    delta_requirement: float
    baseline_partner_agency_cost: float
    proposed_partner_agency_cost: float
    total_capex_procurement: float
    total_opex_annual: float
    total_maintenance_annual: float
    configured_budget_limit: Optional[float] = None
    budget_surplus_or_deficit: Optional[float] = None
    unmet_resource_demand_count: int
    category_summary: Dict[str, Dict[str, Any]]
    disclaimer: str


class BudgetScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    budget_year: int = 2026
    budget_month: int = 11
    total_budget_limit: Optional[float] = None
    category_budget_limits: Optional[Dict[str, float]] = None
    cost_overrides: Optional[Dict[str, Dict[str, float]]] = None
    quantity_overrides: Optional[Dict[str, int]] = None
    operating_assumptions: Optional[Dict[str, Any]] = None


class BudgetScenarioResponse(BaseModel):
    id: int
    scenario_id: str
    name: str
    description: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    budget_year: int
    budget_month: int
    total_budget_limit: Optional[float] = None
    category_budget_limits: Optional[Dict[str, float]] = None
    cost_overrides: Optional[Dict[str, Dict[str, float]]] = None
    quantity_overrides: Optional[Dict[str, int]] = None
    operating_assumptions: Optional[Dict[str, Any]] = None
    is_baseline: bool
    created_at: Optional[Union[datetime, str]] = None

    class Config:
        from_attributes = True


class BudgetCalculationHistoryResponse(BaseModel):
    id: int
    calculation_id: str
    scenario_id: Optional[str] = None
    optimization_run_id: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    period_year: int
    period_month: int
    assessment_period: str
    total_capex: float
    total_opex_monthly: float
    total_opex_annual: float
    total_maintenance_annual: float
    total_partner_agency_cost: float
    total_police_budget_requirement: float
    total_gross_requirement: float
    configured_budget: Optional[float] = None
    budget_gap_or_surplus: Optional[float] = None
    unmet_demand_count: int
    created_at: Optional[Union[datetime, str]] = None

    class Config:
        from_attributes = True


class FullBudgetOverviewResponse(BaseModel):
    period_year: int
    period_month: int
    assessment_period: str
    total_gross_estimated_requirement: float
    total_police_budget_requirement: float
    total_partner_agency_cost: float  # Ambulances
    total_capex_procurement: float
    total_opex_annual: float
    total_maintenance_annual: float
    total_configured_state_budget: float
    total_budget_gap_or_surplus: float  # configured - police_requirement
    configured_states_count: int
    unconfigured_states_count: int
    unconfigured_cost_items_count: int
    unrecorded_inventory_districts_count: int
    category_expenditure_breakdown: Dict[str, Dict[str, Any]]
    capex_vs_opex_summary: Dict[str, float]
    warnings: List[str]
    planning_disclaimer: str


