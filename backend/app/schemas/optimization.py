"""
Phase 10: AI Police Resource Optimization Pydantic Schemas.

Defines request/response contracts for constrained MILP optimization runs,
scenario comparisons, inventory audits, and explainability payloads.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class OptimizationRunRequest(BaseModel):
    state_id: Optional[int] = Field(None, description="State ID to optimize resources for (None for multi-state/national)")
    resource_type_id: int = Field(1, description="Resource Type ID (1: Police Officers, 2: Patrol Vehicles)")
    assessment_period: str = Field("2026-11-01", description="Assessment period date (YYYY-MM-DD)")
    scenario_name: Optional[str] = Field(None, description="Descriptive scenario name")
    scenario_type: str = Field("BASELINE_CONSTRAINED", description="Scenario type: BASELINE_CONSTRAINED, CRITICAL_RISK_PRIORITY, PROPORTIONAL_WORKLOAD, RESERVE_HEAVY, HYPOTHETICAL_SIMULATION")
    is_simulation: bool = Field(False, description="Explicit flag to run a hypothetical planning simulation instead of an operational deployment allocation")
    allocation_mode: str = Field("OPERATIONAL", description="Allocation mode: OPERATIONAL or SIMULATION")
    transferable_pool_size: Optional[int] = Field(None, description="Documented or simulated transferable pool size (cannot exceed standing pool)")
    pool_capacity_override: Optional[int] = Field(None, description="Optional override of state resource pool capacity")
    minimum_reserve_ratio: float = Field(0.20, ge=0.0, le=1.0, description="Minimum operational reserve ratio of required demand")
    risk_weight_factor: float = Field(1.0, ge=0.0, le=5.0, description="Weighting multiplier for risk score in shortfall penalty")
    stability_penalty: float = Field(0.05, ge=0.0, le=1.0, description="Penalty coefficient for deviation from baseline inventory")
    calculation_version: str = Field("opt-v2.0-milp", description="Optimization engine version")


class OptimizationAllocationItem(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    risk_score: float
    risk_level: str
    priority_score: float
    baseline_quantity: Optional[int]
    baseline_status: str = Field("OFFICIAL_DISTRICT_DISCLOSED", description="OFFICIAL_DISTRICT_DISCLOSED, UNRECORDED_DATA_UNAVAILABLE, or SIMULATION_ESTIMATE")
    required_quantity: int
    recommended_quantity: int
    change_quantity: int
    shortfall_before: int
    shortfall_after: int
    allocation_status: str
    explanation: Optional[str] = None


class OptimizationRunResponse(BaseModel):
    run_id: str
    scenario_name: str
    scenario_type: str
    is_simulation: bool = Field(False, description="True if run is a hypothetical simulation rather than an operational allocation")
    allocation_mode: str = Field("OPERATIONAL", description="OPERATIONAL or SIMULATION")
    data_validity: str = Field("VERIFIED", description="VERIFIED, INSUFFICIENT_DATA, or HYPOTHETICAL_SIMULATION_ONLY")
    transferable_pool: Optional[int] = Field(None, description="Documented or simulated transferable pool size")
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    resource_type_id: int
    resource_name: str
    resource_category: str
    assessment_period: str
    risk_version: str
    forecast_model_id: Optional[int] = None
    forecast_model_version: Optional[str] = None
    forecast_origin_date: Optional[str] = None
    algorithm: str
    pool_capacity: int
    allocated_total: int
    remaining_pool: int
    total_demand: int
    shortfall_before: int
    shortfall_after: int
    shortfall_reduction_pct: float
    pool_utilization_pct: float
    solver_status: str
    objective_value: Optional[float] = None
    execution_duration_ms: int
    constraints_applied: Optional[Dict[str, Any]] = None
    explanation_summary: str
    simulation_assumptions: Optional[List[str]] = None
    verified_districts_count: int = Field(0, description="Count of districts with verified official non-null baseline disclosures")
    unrecorded_districts_count: int = Field(0, description="Count of districts with unrecorded baseline inventories")
    created_at: str
    allocations: Optional[List[OptimizationAllocationItem]] = None


class OptimizationOverviewResponse(BaseModel):
    total_runs_executed: int
    verified_official_inventory_summary: Dict[str, Any]
    eligible_categories: List[Dict[str, Any]]
    ineligible_categories: List[Dict[str, Any]]
    recent_runs: List[OptimizationRunResponse]
    planning_disclaimer: str


class OptimizationResourcesAuditResponse(BaseModel):
    state_resources_count: int
    district_resources_count: int
    district_official_count: int
    district_unrecorded_count: int
    discrepancy_explanation: str
    resource_types: List[Dict[str, Any]]
    state_inventory_breakdown: List[Dict[str, Any]]


class OptimizationScenarioComparisonRequest(BaseModel):
    state_id: int = Field(..., description="State ID for scenario comparison")
    resource_type_id: int = Field(1, description="Resource Type ID")
    assessment_period: str = Field("2026-11-01", description="Assessment period date")
    is_simulation: bool = Field(False, description="Whether the compared scenarios are hypothetical simulations")
    scenarios: List[OptimizationRunRequest] = Field(..., min_length=2, max_length=5, description="2 to 5 scenarios to compare")


class OptimizationScenarioComparisonResponse(BaseModel):
    comparison_id: str
    state_name: str
    resource_name: str
    assessment_period: str
    scenarios: List[OptimizationRunResponse]
    comparison_summary: str

