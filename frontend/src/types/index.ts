/**
 * TypeScript Data Models for Crime Management System.
 * Synchronized with Phase 4 FastAPI Pydantic Backend Schemas.
 */

// ============================================================================
// Common / System Types
// ============================================================================

export interface HealthResponse {
  status: string;
  database?: string;
}

export type UserRole = 'ADMIN' | 'ANALYST' | 'OFFICER' | 'INVESTIGATOR' | 'SUPERVISOR';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UpdateProfilePayload {
  full_name: string;
  email?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface LoginCredentials {
  username_or_email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CreateStaffPayload {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}

export interface SecurityAuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at?: string | null;
}

export interface FilterParams {
  state_id?: number;
  district_id?: number;
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Geography Types
// ============================================================================

export interface StateItem {
  id: number;
  state_name: string;
  state_code?: string | null;
  entity_type?: 'STATE' | 'UT';
  is_active?: boolean;
}

export interface StateListResponse {
  total: number;
  view?: string;
  items: StateItem[];
}

export interface DistrictItem {
  id: number;
  state_id: number;
  state_name: string;
  district_name: string;
  census_district_code?: number | null;
  lgd_code?: number | null;
  is_census_2011?: boolean;
  is_current_admin?: boolean;
  parent_district_id?: number | null;
}

export interface DistrictListResponse {
  total: number;
  view?: string;
  items: DistrictItem[];
}

export interface DistrictDemographicsData {
  census_year: number;
  total_population: number;
  male_population: number;
  female_population: number;
  literate_population: number;
  total_workers: number;
}

export interface DistrictDetailResponse {
  id: number;
  state_id: number;
  state_name: string;
  district_name: string;
  census_district_code?: number | null;
  lgd_code?: number | null;
  is_census_2011?: boolean;
  is_current_admin?: boolean;
  parent_district_id?: number | null;
  demographics?: DistrictDemographicsData | null;
}

export interface DistrictGeographyMappingItem {
  id: number;
  historical_district_id: number;
  historical_district_name?: string | null;
  historical_state_name?: string | null;
  current_district_id: number;
  current_district_name?: string | null;
  current_state_name?: string | null;
  mapping_type: 'SAME' | 'SPLIT' | 'MERGED' | 'TRANSFERRED' | 'RENAMED' | 'REORGANIZED';
  mapping_percentage?: number | null;
  effective_from: string;
  effective_to?: string | null;
  source: string;
  notes?: string | null;
}

export interface DistrictGeographyMappingListResponse {
  total: number;
  items: DistrictGeographyMappingItem[];
}

// ============================================================================
// Official Government (NCRB) Crime Statistics Types
// ============================================================================

export interface OfficialCrimeStatisticItem {
  id: number;
  state_id?: number | null;
  district_id?: number | null;
  report_year: number;
  geography_level: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'CITY' | string;
  entity_name: string;
  crime_head: string;
  crime_category: string;
  reported_cases: number;
  chargesheeted_cases?: number | null;
  chargesheet_rate?: number | null;
  conviction_rate?: number | null;
  source_name: string;
  source_report: string;
  source_url: string;
  publication_date?: string | null;
  data_status: string;
  notes?: string | null;
}

export interface OfficialCrimeStatisticListResponse {
  total: number;
  report_year?: number | null;
  geography_level?: string | null;
  items: OfficialCrimeStatisticItem[];
}

export interface StateCoverageItem {
  state_id: number;
  state_name: string;
  entity_type: 'STATE' | 'UT';
  district_count: number;
  historical_incident_count: number;
  official_record_count: number;
  latest_official_crime_year?: number | null;
  latest_official_cases?: number | null;
  official_data_available: boolean;
  data_status: string;
  coverage_status: 'COMPLETE' | 'PARTIAL' | 'HISTORICAL_ONLY' | 'OFFICIAL_BENCHMARK_ONLY' | 'NO_OFFICIAL_DATA_FOUND';
  data_source: string;
  data_freshness: string;
  has_crime_information: boolean;
  notes?: string | null;
}

export interface StateCoverageListResponse {
  total_entities: number;
  states_count: number;
  uts_count: number;
  total_current_districts: number;
  total_historical_incidents: number;
  coverage_summary: Record<string, number>;
  items: StateCoverageItem[];
}

export interface DataFreshnessResponse {
  historical_incident_dataset: string;
  latest_nationwide_official_benchmark: string;
  latest_official_nationwide_year: number;
  population_baseline: string;
  current_administrative_geography: string;
  total_active_states: number;
  total_active_uts: number;
  total_current_districts: number;
  total_census_2011_districts: number;
  total_historical_incidents: number;
  total_official_records: number;
  notes: string[];
}

export interface DistrictCoverageItem {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  parent_district_id?: number | null;
  parent_district_name?: string | null;
  is_census_2011: boolean;
  is_current_admin: boolean;
  has_historical_incidents: boolean;
  historical_incident_count: number;
  has_official_statistics: boolean;
  latest_data_year?: number | null;
  data_source: string;
  notes?: string | null;
}

export interface DistrictCoverageListResponse {
  total: number;
  items: DistrictCoverageItem[];
}

// ============================================================================
// Crime Analytics Types
// ============================================================================

export interface CaseStatusBreakdown {
  closed: number;
  open: number;
  clearance_rate_pct: number;
}

export interface CrimeOverviewResponse {
  total_incidents: number;
  total_districts: number;
  total_states: number;
  total_crime_types: number;
  total_crime_categories: number;
  cases: CaseStatusBreakdown;
  earliest_incident_date: string;
  latest_incident_date: string;
  filtered_by_state_id?: number | null;
  filtered_by_district_id?: number | null;
}

export interface TrendItem {
  period: string;
  incident_count: number;
}

export interface TrendResponse {
  interval: string;
  total_points: number;
  items: TrendItem[];
}

export interface CategoryBreakdownItem {
  category_id: number;
  category_name: string;
  severity_weight: number;
  incident_count: number;
  percentage: number;
}

export interface CategoryBreakdownResponse {
  total_incidents: number;
  items: CategoryBreakdownItem[];
}

export interface TypeBreakdownItem {
  crime_type_id: number;
  crime_code: string;
  crime_name: string;
  category_name: string;
  severity_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  incident_count: number;
  percentage: number;
}

export interface TypeBreakdownResponse {
  total_incidents: number;
  items: TypeBreakdownItem[];
}

export interface HourlyDistributionItem {
  hour: number;
  incident_count: number;
  percentage: number;
}

export interface HourlyDistributionResponse {
  peak_hour: number;
  items: HourlyDistributionItem[];
}

export interface VictimDemographicsResponse {
  gender_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
  average_age?: number | null;
}

export interface WeaponDistributionItem {
  weapon_name: string;
  incident_count: number;
  percentage: number;
}

export interface WeaponDistributionResponse {
  total_incidents: number;
  items: WeaponDistributionItem[];
}

export interface TopDistrictItem {
  district_id: number;
  district_name: string;
  state_name: string;
  incident_count: number;
  total_population?: number | null;
  crime_rate_per_100k?: number | null;
}

export interface TopDistrictsResponse {
  metric: 'volume' | 'rate';
  items: TopDistrictItem[];
}
