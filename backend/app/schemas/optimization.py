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


# ============================================================================
# Phase 10 Crime-Specific Optimization Schemas
# ============================================================================

class CrimeResourceMappingItem(BaseModel):
    id: int
    crime_type_id: int
    crime_code: str
    crime_name: str
    category_id: int
    category_name: str
    severity_level: str
    resource_type_id: int
    resource_name: str
    coefficient: float
    min_demand_threshold: float
    priority_weight: float
    shared_pool_category: str
    operational_rationale: Optional[str] = None
    is_active: bool = True


class CrimeResourceMappingUpdateRequest(BaseModel):
    coefficient: Optional[float] = Field(None, ge=0.0, le=10.0, description="Resource units required per predicted crime")
    min_demand_threshold: Optional[float] = Field(None, ge=0.0, le=5.0, description="Minimum predicted crime count to trigger demand")
    priority_weight: Optional[float] = Field(None, ge=0.1, le=5.0, description="Priority weight multiplier for resource allocation")
    operational_rationale: Optional[str] = Field(None, description="Operational doctrine and preventive rationale")
    is_active: Optional[bool] = Field(None, description="Whether mapping is actively evaluated in optimization")


class CrimeResourceMappingListResponse(BaseModel):
    total: int
    items: List[CrimeResourceMappingItem]


class ResourceInventoryItem(BaseModel):
    id: int
    state_id: int
    state_name: str
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    resource_type_id: int
    resource_name: str
    category: str
    total_inventory: int
    deployed_count: int
    unavailable_count: int
    available_pool: int
    data_status: str
    reference_year: int
    source_name: str
    notes: Optional[str] = None


class ResourceInventoryUpdateRequest(BaseModel):
    total_inventory: Optional[int] = Field(None, ge=0, description="Total standing inventory")
    deployed_count: Optional[int] = Field(None, ge=0, description="Currently committed/deployed count")
    unavailable_count: Optional[int] = Field(None, ge=0, description="Unavailable (maintenance/leave/training)")
    notes: Optional[str] = Field(None, description="Administrative audit notes")


class ResourceInventorySummaryResponse(BaseModel):
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    reference_year: int = 2024
    categories: List[Dict[str, Any]]
    total_inventory_by_category: Dict[str, int]
    deployed_by_category: Dict[str, int]
    unavailable_by_category: Dict[str, int]
    available_by_category: Dict[str, int]
    data_source: str
    disclaimer: str


class CrimeDemandBreakdownItem(BaseModel):
    crime_type_id: int
    crime_code: str
    crime_name: str
    category_name: str
    severity_level: str
    severity_weight: float
    predicted_crime_count: float
    resource_type_id: int
    resource_name: str
    coefficient: float
    raw_demand: float
    shared_pool_category: str
    priority_weight: float
    operational_rationale: Optional[str] = None


class CrimeTypeMatrixItem(BaseModel):
    crime_type_id: int
    crime_code: str
    crime_name: str
    category_name: str
    severity_level: str
    predicted_count: float
    coefficients: Dict[str, float]
    raw_demands: Dict[str, float]
    rationales: Dict[str, str]


class DistrictCrimeDemandResponse(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    assessment_period: str
    total_predicted_crimes: float
    district_risk_score: float
    district_risk_level: str
    resource_demands: Dict[str, int]
    crime_breakdowns: List[CrimeDemandBreakdownItem]
    crime_matrix: Optional[List[CrimeTypeMatrixItem]] = None
    calculation_notes: str


class CrimeSpecificOptimizationRequest(BaseModel):
    state_id: int = Field(..., description="Target State ID for resource optimization")
    assessment_period: str = Field("2026-11-01", description="Forecast target period (YYYY-MM-DD)")
    scenario_name: Optional[str] = Field("Crime-Specific Preventative Optimization", description="Descriptive scenario title")
    scenario_type: str = Field("CRIME_SPECIFIC_OPTIMAL", description="Optimization scenario archetype: CRIME_SPECIFIC_OPTIMAL, HIGH_SEVERITY_PRIORITY, CYBER_SPECIALIZED, HIGHWAY_SAFETY, EQUAL_DEFICIT_REDUCTION")
    resource_categories: Optional[List[str]] = Field(None, description="Resource categories to optimize (default: all eligible pools)")
    capacity_overrides: Optional[Dict[str, int]] = Field(None, description="Optional capacity pool overrides by category (e.g. {'PERSONNEL': 6000, 'MOBILITY': 500})")
    is_simulation: bool = Field(False, description="Whether this is a hypothetical policy simulation rather than operational guidance")


class DistrictCrimeAllocationItem(BaseModel):
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    risk_score: float
    risk_level: str
    top_predicted_crimes: List[Dict[str, Any]]
    resource_category: str
    resource_type_id: int
    resource_name: str
    demanded_quantity: int
    allocated_quantity: int
    baseline_available: Optional[int] = None
    existing_committed: Optional[int] = None
    shortage: int
    surplus: int
    coverage_percentage: float
    status: str
    recommendation_rationale: str
    crime_explanations: Optional[List[Dict[str, Any]]] = None


class CrimeSpecificOptimizationResponse(BaseModel):
    run_id: str
    state_id: int
    state_name: str
    assessment_period: str
    scenario_name: str
    scenario_type: str
    algorithm: str = "CRIME_SPECIFIC_INTEGER_MILP"
    is_simulation: bool
    pool_summaries: Dict[str, Dict[str, Any]]
    overall_coverage_pct: float
    total_demand: int
    total_allocated: int
    total_unmet_demand: int
    solver_status: str
    execution_duration_ms: int
    allocations: List[DistrictCrimeAllocationItem]
    state_summaries: List[Dict[str, Any]]
    shortage_alerts: List[Dict[str, Any]]
    planning_disclaimer: str


