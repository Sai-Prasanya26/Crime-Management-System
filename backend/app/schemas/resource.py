"""
Pydantic Schemas for Comprehensive Resource Optimization Endpoints.

Defines API response models for resource requirements, availability status,
shortfalls, surplus, priority scores, categorized intelligence, district inventory,
and constrained allocation simulations.
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
    total_required_by_type: Optional[Dict[str, int]] = None
    total_gross_demand: Optional[int] = None
    total_verified_shortfall: Optional[int] = None
    total_verified_surplus: Optional[int] = None
    priority_distribution: Optional[Dict[str, int]] = None
    allocation_capacity_status: Optional[str] = None
    estimated_total_monthly_budget: Optional[float] = None
    gross_required_officers: Optional[int] = None
    gross_required_vehicles: Optional[int] = None
    gross_required_investigation_teams: Optional[int] = None
    gross_required_surveillance_units: Optional[int] = None
    priority_counts: Optional[Dict[str, int]] = None
    total_estimated_budget: Optional[float] = None
    currency: str = "INR"
    top_priority_districts: Optional[List[ResourceItemResponse]] = None
    notes: Optional[List[str]] = None


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
    category: Optional[str] = "PERSONNEL"
    unit_of_measure: str
    sanctioned_quantity: Optional[int] = None
    actual_quantity: Optional[int] = None
    available_quantity: int
    vacancy_quantity: Optional[int] = None
    actual_count: Optional[int] = None
    sanctioned_count: Optional[int] = None
    reference_year: int
    data_status: str = "OFFICIAL_STATE"
    source_name: str
    source_publication: str
    source_document: Optional[str] = None
    source_url: Optional[str] = None
    source_geography: str = "STATE"
    data_as_of: str
    confidence_score: Optional[float] = 1.00
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CategoryCoverageDetail(BaseModel):
    resource_type_id: int
    resource_name: str
    category: Optional[str] = "PERSONNEL"
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
    total_districts: int = 640
    districts_with_official_data: int = 18
    districts_with_unrecorded_data: int = 622
    category_summary: Optional[Dict[str, Any]] = None
    categories: List[CategoryCoverageDetail]
    methodology_notes: List[str]


# -------------------------------------------------------------
# New Comprehensive Schemas for Phase 10 Expansion
# -------------------------------------------------------------

class DistrictResourceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    district_id: int
    district_name: str
    state_id: int
    state_name: str
    resource_type_id: int
    resource_code: Optional[str] = None
    resource_name: str
    category: str
    unit_of_measure: str
    actual_count: Optional[int] = None
    sanctioned_count: Optional[int] = None
    required_count: Optional[int] = None
    gap_count: Optional[int] = None
    reference_year: int
    data_status: str
    badge: str
    source_name: Optional[str] = None
    source_document: Optional[str] = None
    source_url: Optional[str] = None
    source_page: Optional[str] = None
    methodology: Optional[str] = None
    confidence_score: Optional[float] = None
    updated_at: Optional[str] = None


class ResourceCategoryDetailResponse(BaseModel):
    category: str
    display_name: str
    description: str
    total_resource_types: int
    is_personnel: bool
    is_vehicle: bool
    is_team: bool
    is_equipment: bool
    is_infrastructure: bool
    resource_types: List[Dict[str, Any]]


class DistrictResourceGapResponse(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    resource_name: str
    resource_code: str
    category: str
    actual_count: Optional[int] = None
    required_count: int
    gap_count: Optional[int] = None
    data_status: str
    badge: str
    is_verified: bool
    source_name: Optional[str] = None


class ResourceModelInfoResponse(BaseModel):
    methodology_version: str
    governance_standard: str = "BPR&D Data on Police Organizations (DoPO) & NCRB Benchmarks"
    assessment_period: Optional[str] = "2026-01-01"
    formula_summary: Dict[str, str]
    resource_types: List[Dict[str, Any]]
    priority_tiers: Optional[Dict[str, str]] = None
    availability_data_status: str
    allocation_capacity_status: Optional[str] = None
    notes: List[str]


class AIResourceRecommendationResponse(BaseModel):
    district_id: int
    district_name: str
    state_name: str
    population: int
    overall_risk_score: float
    risk_level: str
    required_police_personnel: int
    required_patrol_vehicles: int
    required_investigation_teams: int
    required_surveillance_teams: int
    required_cctv_coverage: int
    required_emergency_response_units: int
    resource_priority_score: float
    priority_tier: str
    priority_explanation: str
    actual_personnel_recorded: Optional[int] = None
    personnel_gap: Optional[int] = None
    personnel_status: str
    personnel_badge: str
