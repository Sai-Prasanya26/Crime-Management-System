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
}

export interface StateListResponse {
  total: number;
  items: StateItem[];
}

export interface DistrictItem {
  id: number;
  state_id: number;
  state_name: string;
  district_name: string;
  census_district_code?: number | null;
}

export interface DistrictListResponse {
  total: number;
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
  demographics?: DistrictDemographicsData | null;
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
