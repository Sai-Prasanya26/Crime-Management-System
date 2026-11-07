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

// ============================================================================
// Phase 10: Crime-Specific Preventive AI Resource Optimization
// ============================================================================

export interface CrimeResourceMappingItem {
  id: number;
  crime_type_id: number;
  crime_code: string;
  crime_name: string;
  category_id: number;
  category_name: string;
  severity_level: string;
  resource_type_id: number;
  resource_name: string;
  coefficient: number;
  min_demand_threshold: number;
  priority_weight: number;
  shared_pool_category: string;
  unit_of_measure?: string | null;
  operational_rationale?: string | null;
  is_active: boolean;
}

export interface CrimeResourceMappingUpdateRequest {
  coefficient?: number;
  min_demand_threshold?: number;
  priority_weight?: number;
  operational_rationale?: string;
  is_active?: boolean;
}

export interface CrimeResourceMappingListResponse {
  total: number;
  items: CrimeResourceMappingItem[];
}

export interface ResourceInventoryItem {
  id: number;
  state_id: number;
  state_name: string;
  district_id?: number | null;
  district_name?: string | null;
  resource_type_id: number;
  resource_name: string;
  category: string;
  unit_of_measure?: string | null;
  total_inventory: number;
  deployed_count: number;
  unavailable_count: number;
  available_pool: number;
  data_status: string;
  is_external_partner?: boolean;
  is_configured?: boolean;
  reference_year: number;
  source_name: string;
  notes?: string | null;
}

export interface ResourceInventoryUpdateRequest {
  total_inventory?: number;
  deployed_count?: number;
  unavailable_count?: number;
  notes?: string;
}

export interface ResourceInventorySummaryResponse {
  state_id?: number | null;
  state_name?: string | null;
  reference_year: number;
  categories: Record<string, any>[];
  total_inventory_by_category: Record<string, number>;
  deployed_by_category: Record<string, number>;
  unavailable_by_category: Record<string, number>;
  available_by_category: Record<string, number>;
  data_source: string;
  disclaimer: string;
}

export interface CrimeDemandBreakdownItem {
  crime_type_id: number;
  crime_code: string;
  crime_name: string;
  category_name: string;
  severity_level: string;
  severity_weight: number;
  predicted_crime_count: number;
  resource_type_id: number;
  resource_name: string;
  coefficient: number;
  raw_demand: number;
  shared_pool_category: string;
  unit_of_measure?: string | null;
  priority_weight: number;
  operational_rationale?: string | null;
}

export interface CrimeTypeMatrixItem {
  crime_type_id: number;
  crime_code: string;
  crime_name: string;
  category_name: string;
  severity_level: string;
  predicted_count: number;
  coefficients: Record<string, number>;
  raw_demands: Record<string, number>;
  rationales: Record<string, string>;
  units?: Record<string, string>;
}

export interface DistrictCrimeDemandResponse {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  assessment_period: string;
  total_predicted_crimes: number;
  district_risk_score: number;
  district_risk_level: string;
  resource_demands: Record<string, number>;
  crime_breakdowns: CrimeDemandBreakdownItem[];
  crime_matrix?: CrimeTypeMatrixItem[];
  calculation_notes: string;
}

export interface CrimeSpecificOptimizationRequest {
  state_id: number;
  assessment_period?: string;
  scenario_name?: string;
  scenario_type?: string;
  resource_categories?: string[];
  capacity_overrides?: Record<string, number>;
  is_simulation?: boolean;
}

export interface DistrictCrimeAllocationItem {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  risk_score: number;
  risk_level: string;
  top_predicted_crimes: Array<Record<string, any>>;
  resource_category: string;
  resource_type_id: number;
  resource_name: string;
  unit_of_measure?: string | null;
  is_external_partner?: boolean;
  is_configured?: boolean;
  demanded_quantity: number;
  allocated_quantity: number;
  baseline_available?: number | null;
  existing_committed?: number | null;
  shortage: number;
  surplus: number;
  coverage_percentage: number;
  status: string;
  recommendation_rationale: string;
  crime_explanations?: Array<{
    crime_type_id: number;
    crime_code: string;
    crime_name: string;
    category_name: string;
    severity_level: string;
    severity_weight: number;
    predicted_count: number;
    resource_coefficient: number;
    calculated_demand: number;
    proportional_allocation: number;
    operational_rationale: string;
    pool_available_capacity: number;
    recommended_district_allocation: number;
  }>;
}

export interface CrimeSpecificOptimizationResponse {
  run_id: string;
  state_id: number;
  state_name: string;
  assessment_period: string;
  scenario_name: string;
  scenario_type: string;
  algorithm: string;
  is_simulation: boolean;
  pool_summaries: Record<string, {
    resource_type_id: number;
    resource_name: string;
    unit_of_measure?: string;
    is_external_partner?: boolean;
    is_configured?: boolean;
    capacity: number;
    allocated: number;
    remaining_pool: number;
    demand: number;
    unmet_demand: number;
    coverage_pct: number;
    solver_status: string;
  }>;
  overall_coverage_pct: number;
  total_demand: number;
  total_allocated: number;
  total_unmet_demand: number;
  solver_status: string;
  execution_duration_ms: number;
  allocations: DistrictCrimeAllocationItem[];
  state_summaries: Array<Record<string, any>>;
  shortage_alerts: Array<Record<string, any>>;
  planning_disclaimer: string;
}

export interface CanonicalCrimePredictionItem {
  crime_type_id: number;
  crime_code: string;
  crime_name: string;
  category_id: number;
  category_name: string;
  severity_level: string;
  predicted_count: number;
  historical_baseline_count?: number | null;
  numerical_change?: number | null;
  percentage_change?: number | null;
  trend_status: string;
  priority_level: string;
  share_of_total_percent: number;
  is_sparse: boolean;
}

export interface DistrictResourceRecommendationDetail {
  crime_type_id: number;
  crime_name: string;
  predicted_count: number;
  resource_category: string;
  unit_of_measure: string;
  coefficient: number;
  raw_demand: number;
  allocated_quantity: number;
  shortage: number;
  is_configured: boolean;
  is_external_partner: boolean;
  operational_rationale?: string | null;
}

export interface DistrictPipelineForecastResponse {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  parent_district_id?: number | null;
  parent_district_name?: string | null;
  is_derived_from_parent: boolean;
  forecast_period: string;
  forecast_year: number;
  forecast_month: number;
  total_predicted_crimes: number;
  prediction_interval_lower?: number | null;
  prediction_interval_upper?: number | null;
  overall_trend: string;
  district_risk_score: number;
  district_risk_level: string;
  active_model_name: string;
  active_model_version: string;
  canonical_crime_predictions: CanonicalCrimePredictionItem[];
  category_distribution: Array<Record<string, any>>;
  timeline_points: Array<{
    period: string;
    actual?: number | null;
    predicted?: number | null;
  }>;
  pool_summaries: Record<string, {
    resource_type_id: number;
    resource_name: string;
    unit_of_measure?: string;
    is_external_partner?: boolean;
    is_configured?: boolean;
    capacity: number;
    allocated: number;
    remaining_pool: number;
    demand: number;
    unmet_demand: number;
    coverage_pct: number;
    solver_status: string;
  }>;
  resource_recommendations: DistrictResourceRecommendationDetail[];
  shortage_alerts: Array<Record<string, any>>;
  planning_disclaimer: string;
}

