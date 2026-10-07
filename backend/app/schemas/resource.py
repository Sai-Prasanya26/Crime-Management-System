"""
Phase 10B: Pydantic Schemas for Resource Optimization Endpoints.

Defines API response models for resource requirements, availability status,
shortfalls, surplus, priority scores, and constrained allocation simulations under resource-v1.0.
"""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any


class ResourceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    district_id: int
    district_name: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    period_year: int
    period_month: int
    assessment_period: str
    required_quantity: int
    available_quantity: Optional[int] = None
    has_availability_data: bool
    availability_status: str
    recommended_quantity: int
    shortfall_quantity: int
    surplus_quantity: int
    gross_demand: int
    risk_level: str
    risk_score: float
    priority_tier: str
    priority_score: float
    unit_cost: Optional[float] = None
    estimated_total_cost: Optional[float] = None
    currency: str = "INR"
    optimization_rationale: Optional[Dict[str, Any]] = None
    calculation_version: str = "resource-v1.0"
    generated_at: Optional[str] = None


class DistrictResourceSchedule(BaseModel):
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    required_quantity: int
    available_quantity: Optional[int] = None
    has_availability_data: bool
    availability_status: str
    recommended_quantity: int
    shortfall_quantity: int
    surplus_quantity: int
    priority_tier: str
    priority_score: float
    unit_cost: Optional[float] = None
    estimated_cost: Optional[float] = None
    rationale: Optional[Dict[str, Any]] = None


class DistrictResourceDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    district_id: int
    district_name: str
    state_id: int
    state_name: str
    census_2011_population: int
    period_year: int
    period_month: int
    assessment_period: str
    overall_risk_score: float
    risk_level: str
    severity_index: float
    trend_index: float
    forecast_crime_volume: float
    risk_multiplier: float
    availability_status: str
    has_availability_data: bool
    resources: List[DistrictResourceSchedule]
    total_required_units: int
    total_recommended_units: int
    total_shortfall_units: int
    total_estimated_budget: Optional[float] = None
    currency: str = "INR"
    calculation_version: str = "resource-v1.0"
    generated_at: Optional[str] = None


class ResourceOverviewResponse(BaseModel):
    assessment_period: str
    methodology_version: str
    total_assessed_districts: int
    total_resource_types: int
    availability_data_status: str
    districts_with_recorded_availability: int
    districts_with_unrecorded_availability: int
    total_required_by_type: Dict[str, int]
    total_gross_demand: int
    total_verified_shortfall: Optional[int] = None
    total_verified_surplus: Optional[int] = None
    priority_distribution: Dict[str, int]
    allocation_capacity_status: str
    estimated_total_monthly_budget: Optional[float] = None
    currency: str = "INR"
    top_priority_districts: List[ResourceItemResponse]


class ResourceModelInfoResponse(BaseModel):
    methodology_version: str
    assessment_period: str
    formula_summary: Dict[str, str]
    resource_types: List[Dict[str, Any]]
    priority_tiers: Dict[str, str]
    availability_data_status: str
    allocation_capacity_status: str
    notes: List[str]


class ResourceAllocationSimulationRequest(BaseModel):
    resource_type_id: int
    pool_capacity: int


class AllocationItem(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    priority_tier: str
    priority_score: float
    risk_score: float
    shortfall: int
    allocated_quantity: int
    unmet_shortfall: int


class ResourceAllocationSimulationResponse(BaseModel):
    resource_type_id: int
    resource_name: str
    pool_capacity: int
    allocated_total: int
    remaining_pool: int
    fully_satisfied_districts: int
    partially_satisfied_districts: int
    unmet_districts: int
    allocations: List[AllocationItem]


class StateResourceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    state_id: int
    state_name: str
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    sanctioned_quantity: Optional[int] = None
    actual_quantity: Optional[int] = None
    available_quantity: int
    vacancy_quantity: Optional[int] = None
    reference_year: int
    source_name: str
    source_publication: str
    source_url: Optional[str] = None
    source_geography: str = "STATE"
    data_as_of: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CategoryCoverageDetail(BaseModel):
    resource_type_id: int
    resource_name: str
    unit_of_measure: str
    reference_year: int
    data_as_of: str
    states_covered: int
    coverage_percentage: float
    total_sanctioned: Optional[int] = None
    total_actual: Optional[int] = None
    total_available: int
    total_vacancies: Optional[int] = None
    missing_state_names: List[str]


class ResourceCoverageResponse(BaseModel):
    total_active_states: int
    total_state_resource_records: int
    geography_level: str = "STATE"
    categories: List[CategoryCoverageDetail]
    methodology_notes: List[str]
