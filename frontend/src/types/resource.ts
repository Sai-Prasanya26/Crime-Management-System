/**
 * Resource Optimization & Official Police Resources Type Definitions
 */

export interface StateResourceItem {
  id: number;
  state_id: number;
  state_name: string;
  resource_type_id: number;
  resource_name: string;
  unit_of_measure: string;
  sanctioned_quantity: number | null;
  actual_quantity: number | null;
  available_quantity: number;
  vacancy_quantity: number | null;
  reference_year: number;
  source_name: string;
  source_publication: string;
  source_url: string | null;
  source_geography: string;
  data_as_of: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface StateResourceListResponse {
  total: number;
  items: StateResourceItem[];
  skip: number;
  limit: number;
}

export interface CategoryCoverageDetail {
  resource_type_id: number;
  resource_name: string;
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
  categories: CategoryCoverageDetail[];
  methodology_notes: string[];
}
