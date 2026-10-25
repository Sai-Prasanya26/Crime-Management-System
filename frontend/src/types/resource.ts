/**
 * Resource Optimization & Official Police Resources Type Definitions
 * Synchronized with Phase 10B & Comprehensive Operational Intelligence API Schemas.
 */

export interface PaginatedList<T> {
  total: number;
  items: T[];
  skip: number;
  limit: number;
}

export interface StateResourceItem {
  id: number;
  state_id: number;
  state_name: string;
  resource_type_id: number;
  resource_name: string;
  category?: string;
  unit_of_measure: string;
  sanctioned_quantity: number | null;
  actual_quantity: number | null;
  available_quantity: number;
  vacancy_quantity: number | null;
  actual_count?: number | null;
  sanctioned_count?: number | null;
  reference_year: number;
  data_status?: string;
  source_name: string;
  source_publication: string;
  source_document?: string | null;
  source_url: string | null;
  source_geography: string;
  data_as_of: string;
  confidence_score?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export type StateResourceListResponse = PaginatedList<StateResourceItem>;

export interface CategoryCoverageDetail {
  resource_type_id: number;
  resource_name: string;
  category?: string;
  unit_of_measure: string;
  reference_year: number;
  data_as_of: string;
  states_covered: number;
  coverage_percentage: number;
  total_sanctioned: number | null;
  total_actual: number | null;
  total_available: number;
  total_vacancies: number | null;
  missing_state_names: string[];
}

export interface ResourceCoverageResponse {
  total_active_states: number;
  total_state_resource_records: number;
  geography_level: string;
  total_districts: number;
  districts_with_official_data: number;
  districts_with_unrecorded_data: number;
  category_summary?: Record<string, any>;
  categories: CategoryCoverageDetail[];
  methodology_notes: string[];
}

export interface DistrictResourceItem {
  id?: number | null;
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  resource_type_id: number;
  resource_code?: string | null;
  resource_name: string;
  category: string;
  unit_of_measure: string;
  actual_count: number | null;
  sanctioned_count: number | null;
  required_count: number | null;
  gap_count: number | null;
  reference_year: number;
  data_status: string;
  badge: string;
  source_name?: string | null;
  source_document?: string | null;
  source_url?: string | null;
  source_page?: string | null;
  methodology?: string | null;
  confidence_score?: number | null;
  updated_at?: string | null;
}

export type DistrictResourceListResponse = PaginatedList<DistrictResourceItem>;

export interface ResourceCategoryDetail {
  category: string;
  display_name: string;
  description: string;
  total_resource_types: number;
  is_personnel: boolean;
  is_vehicle: boolean;
  is_team: boolean;
  is_equipment: boolean;
  is_infrastructure: boolean;
  resource_types: Array<{
    id: number;
    code: string;
    name: string;
    unit_of_measure: string;
  }>;
}

export interface DistrictResourceGapItem {
  district_id: number;
  district_name: string;
  state_name: string;
  resource_name: string;
  resource_code: string;
  category: string;
  actual_count: number | null;
  required_count: number;
  gap_count: number | null;
  data_status: string;
  badge: string;
  is_verified: boolean;
  source_name?: string | null;
}

export type DistrictResourceGapListResponse = PaginatedList<DistrictResourceGapItem>;

export interface AIResourceRecommendationItem {
  district_id: number;
  district_name: string;
  state_name: string;
  population: number;
  overall_risk_score: number;
  risk_level: string;
  required_police_personnel: number;
  required_patrol_vehicles: number;
  required_investigation_teams: number;
  required_surveillance_teams: number;
  required_cctv_coverage: number;
  required_emergency_response_units: number;
  resource_priority_score: number;
  priority_tier: string;
  priority_explanation: string;
  actual_personnel_recorded: number | null;
  personnel_gap: number | null;
  personnel_status: string;
  personnel_badge: string;
}

export type AIResourceRecommendationListResponse = PaginatedList<AIResourceRecommendationItem>;

export interface ResourceOverview {
  assessment_period: string;
  methodology_version: string;
  total_assessed_districts: number;
  total_resource_types: number;
  availability_data_status: string;
  districts_with_recorded_availability: number;
  districts_with_unrecorded_availability: number;
  total_required_by_type?: Record<string, number>;
  total_gross_demand?: number;
  total_verified_shortfall?: number | null;
  total_verified_surplus?: number | null;
  priority_distribution?: Record<string, number>;
  allocation_capacity_status?: string;
  estimated_total_monthly_budget?: number;
  gross_required_officers?: number;
  gross_required_vehicles?: number;
  gross_required_investigation_teams?: number;
  gross_required_surveillance_units?: number;
  priority_counts?: Record<string, number>;
  total_estimated_budget?: number;
  currency: string;
  notes?: string[];
}

export interface ResourceTypeItem {
  id: number;
  code?: string | null;
  resource_name: string;
  category: string;
  unit_of_measure: string;
  description?: string | null;
  is_personnel: boolean;
  is_vehicle: boolean;
  is_team: boolean;
  is_equipment: boolean;
  is_infrastructure: boolean;
  is_active: boolean;
}

export interface StateResourceSummaryItem {
  resource_type: string;
  category: string;
  available_quantity: number;
  actual_quantity: number | null;
  sanctioned_quantity: number | null;
  unit: string;
}

export interface StateResourceGroupedSummary {
  state_id: number;
  state: string;
  reference_year: number;
  source: string;
  source_publication: string;
  source_url: string | null;
  geography_level: string;
  coverage_status: string;
  resources: StateResourceSummaryItem[];
}

export interface ResourceSummaryResponse {
  total_states: number;
  data_freshness_notes: Record<string, string>;
  items: StateResourceGroupedSummary[];
}

export interface StateCrimeResourceComparisonItem {
  state_id: number;
  state_name: string;
  census_2011_population: number;
  total_crime_incidents: number;
  crime_rate_per_100k: number;
  police_personnel: number | null;
  police_per_100k: number | null;
  police_vehicles: number | null;
  vehicles_per_100k: number | null;
  police_stations: number | null;
  stations_per_100k: number | null;
  personnel_ref_year: number;
  vehicles_ref_year: number;
  stations_ref_year: number;
  historical_crime_years: string;
  analytical_notice: string;
}

export interface ResourceCrimeComparisonResponse {
  comparison_period: string;
  crime_data_span: string;
  resource_reference_years: Record<string, number>;
  disclaimer: string;
  items: StateCrimeResourceComparisonItem[];
}


// ==========================================
// Phase 10: Constrained AI Optimization Types
// ==========================================

export interface OptimizationRunRequest {
  state_id?: number;
  resource_type_id: number;
  assessment_period: string;
  scenario_name?: string;
  scenario_type: 'BASELINE_CONSTRAINED' | 'CRITICAL_RISK_PRIORITY' | 'PROPORTIONAL_WORKLOAD' | 'RESERVE_HEAVY' | 'HYPOTHETICAL_SIMULATION';
  is_simulation?: boolean;
  allocation_mode?: 'OPERATIONAL' | 'SIMULATION';
  transferable_pool_size?: number;
  pool_capacity_override?: number;
  minimum_reserve_ratio?: number;
  risk_weight_factor?: number;
  stability_penalty?: number;
  calculation_version?: string;
}

export interface OptimizationAllocationItem {
  district_id: number;
  district_name: string;
  state_name: string;
  risk_score: number;
  risk_level: string;
  priority_score: number;
  baseline_quantity: number | null;
  baseline_status?: string;
  required_quantity: number;
  recommended_quantity: number;
  change_quantity: number;
  shortfall_before: number;
  shortfall_after: number;
  allocation_status: string;
  explanation?: string | null;
}

export interface OptimizationRunResponse {
  run_id: string;
  scenario_name: string;
  scenario_type: string;
  is_simulation?: boolean;
  allocation_mode?: string;
  data_validity?: string;
  transferable_pool?: number | null;
  state_id?: number | null;
  state_name?: string | null;
  resource_type_id: number;
  resource_name: string;
  resource_category: string;
  assessment_period: string;
  risk_version: string;
  forecast_model_id?: number | null;
  forecast_model_version?: string | null;
  forecast_origin_date?: string | null;
  algorithm: string;
  pool_capacity: number;
  allocated_total: number;
  remaining_pool: number;
  total_demand: number;
  shortfall_before: number;
  shortfall_after: number;
  shortfall_reduction_pct: number;
  pool_utilization_pct: number;
  solver_status: string;
  objective_value?: number | null;
  execution_duration_ms: number;
  constraints_applied?: Record<string, any> | null;
  explanation_summary: string;
  simulation_assumptions?: string[] | null;
  verified_districts_count?: number;
  unrecorded_districts_count?: number;
  created_at: string;
  allocations?: OptimizationAllocationItem[];
}

export interface OptimizationOverviewResponse {
  total_runs_executed: number;
  verified_official_inventory_summary: {
    state_resources_count: number;
    district_resources_count: number;
    district_official_count: number;
    district_unrecorded_count: number;
    explanation_of_discrepancy: string;
  };
  eligible_categories: Array<{
    resource_type_id: number;
    resource_name: string;
    category: string;
    status: string;
    verified_pool: number;
    notes: string;
  }>;
  ineligible_categories: Array<{
    resource_type_id: number;
    resource_name: string;
    category: string;
    status: string;
    reason: string;
  }>;
  recent_runs: OptimizationRunResponse[];
  planning_disclaimer: string;
}

export interface OptimizationResourcesAuditResponse {
  state_resources_count: number;
  district_resources_count: number;
  district_official_count: number;
  district_unrecorded_count: number;
  discrepancy_explanation: string;
  resource_types: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    eligible: boolean;
  }>;
  state_inventory_breakdown: Array<{
    resource_type_id: number;
    resource_name: string;
    category: string;
    states_covered: number;
    total_verified_count: number;
    reference_years: string;
    primary_source: string;
  }>;
}

export interface OptimizationScenarioComparisonRequest {
  state_id: number;
  resource_type_id: number;
  assessment_period: string;
  is_simulation?: boolean;
  scenarios: OptimizationRunRequest[];
}

export interface OptimizationScenarioComparisonResponse {
  comparison_id: string;
  state_name: string;
  resource_name: string;
  assessment_period: string;
  scenarios: OptimizationRunResponse[];
  comparison_summary: string;
}
