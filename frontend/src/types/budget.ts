/**
 * Phase 11: Budget Estimation and Cost Analysis TypeScript Types.
 */

export interface CostBenchmarkRateItem {
  id: number;
  resource_type_id: number;
  resource_name?: string;
  category?: string;
  cost_type: 'RECURRING_MONTHLY' | 'RECURRING_ANNUAL' | 'ONE_TIME_CAPITAL';
  cost_component: string;
  unit_cost_inr: number;
  source_name: string;
  source_publication: string;
  reference_year: number;
  data_quality_tier: 'OFFICIAL_DOCUMENTED' | 'ESTIMATED_BENCHMARK' | 'ASSUMPTION_BASED';
  formula_expression: string;
  assumptions_notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetEstimationItem {
  id?: number;
  district_id: number;
  district_name?: string;
  state_name?: string;
  resource_type_id: number;
  resource_name?: string;
  baseline_units?: number | null;
  recommended_units: number;
  new_procurement_units: number;
  monthly_recurring_unit_cost: number;
  annual_recurring_unit_cost: number;
  one_time_unit_cost: number;
  baseline_annual_cost: number;
  recommended_annual_cost: number;
  procurement_cost: number;
  net_delta_annual_cost: number;
  data_quality_tier: string;
  explanation?: string;
}

export interface BudgetEstimationRun {
  id?: number;
  run_id: string;
  optimization_run_id?: string | null;
  state_id?: number | null;
  state_name?: string | null;
  resource_type_id?: number | null;
  resource_name?: string | null;
  period_year: number;
  period_month: number;
  assessment_period: string;
  estimation_mode: 'OPERATIONAL_COST' | 'SIMULATION_ESTIMATE' | 'INSUFFICIENT_DATA';
  currency: string;
  total_baseline_recurring_annual: number;
  total_scenario_recurring_annual: number;
  total_baseline_recurring_monthly: number;
  total_scenario_recurring_monthly: number;
  total_one_time_procurement_cost: number;
  incremental_recurring_cost: number;
  total_shortfall_resolution_cost: number;
  verified_cost_ratio: number;
  assumed_cost_ratio: number;
  status: 'COMPLETED' | 'INSUFFICIENT_DATA' | 'FAILED';
  assumptions_summary?: Record<string, any>;
  explanation_summary?: string;
  created_at?: string;
  items?: BudgetEstimationItem[];
}

export interface ScenarioCostComparison {
  baseline_run_id: string;
  scenario_run_id: string;
  scenario_name: string;
  scenario_type: string;
  allocation_mode: string;
  currency: string;
  baseline_recurring_annual: number;
  scenario_recurring_annual: number;
  incremental_recurring_annual: number;
  capital_procurement_cost: number;
  total_shortfall_resolution_cost: number;
  baseline_recurring_monthly: number;
  scenario_recurring_monthly: number;
  net_delta_monthly: number;
  units_reallocated: number;
  units_newly_procured: number;
  data_validity: string;
  is_simulation: boolean;
  assumptions: string[];
  comparison_notes: string;
}

export interface BudgetOverview {
  total_annual_baseline_cost: number;
  total_annual_scenario_cost: number;
  total_monthly_baseline_cost: number;
  total_monthly_scenario_cost: number;
  total_capital_procurement_cost: number;
  incremental_cost_delta: number;
  currency: string;
  verified_cost_percentage: number;
  assumed_cost_percentage: number;
  total_benchmarks_active: number;
  category_breakdown: Record<string, {
    monthly_recurring: number;
    annual_recurring: number;
    one_time_capital: number;
  }>;
  recent_runs: BudgetEstimationRun[];
}

export interface BudgetEstimateRequest {
  optimization_run_id?: string;
  state_id?: number;
  resource_type_id?: number;
  period_year?: number;
  period_month?: number;
  projection_months?: number;
  include_procurement?: boolean;
}

export interface ResourceCostMasterItem {
  id: number;
  resource_category: string;
  resource_type_id: number;
  resource_name: string;
  unit_of_measure: string;
  unit_acquisition_cost: number;
  monthly_operating_unit_cost: number;
  annual_maintenance_unit_cost: number;
  cost_classification: string;
  currency: string;
  source_name: string;
  source_url?: string | null;
  reference_year?: number | null;
  verification_status: 'VERIFIED_QUOTATION' | 'ADMIN_ESTIMATE' | 'OFFICIAL_SOURCE' | 'NOT_CONFIGURED';
  is_partner_agency: boolean;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceCostMasterCreate {
  resource_category: string;
  resource_type_id: number;
  resource_name: string;
  unit_of_measure?: string;
  unit_acquisition_cost?: number;
  monthly_operating_unit_cost?: number;
  annual_maintenance_unit_cost?: number;
  cost_classification?: string;
  currency?: string;
  source_name?: string;
  source_url?: string;
  reference_year?: number;
  verification_status?: string;
  is_partner_agency?: boolean;
  notes?: string;
  is_active?: boolean;
}

export interface ResourceCostMasterUpdate {
  resource_name?: string;
  unit_of_measure?: string;
  unit_acquisition_cost?: number;
  monthly_operating_unit_cost?: number;
  annual_maintenance_unit_cost?: number;
  cost_classification?: string;
  currency?: string;
  source_name?: string;
  source_url?: string;
  reference_year?: number;
  verification_status?: string;
  is_partner_agency?: boolean;
  notes?: string;
  is_active?: boolean;
}

export interface StateBudgetItem {
  id: number;
  state_id: number;
  state_name: string;
  state_code?: string | null;
  financial_year: number;
  annual_budget?: number | null;
  monthly_budget?: number | null;
  allocated_amount?: number | null;
  spent_amount?: number | null;
  remaining_budget?: number | null;
  proposed_budget?: number | null;
  budget_source?: string | null;
  verification_status: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StateBudgetCreate {
  state_id: number;
  financial_year: number;
  annual_budget?: number;
  monthly_budget?: number;
  allocated_amount?: number;
  spent_amount?: number;
  remaining_budget?: number;
  proposed_budget?: number;
  budget_source?: string;
  verification_status?: string;
  notes?: string;
}

export interface DistrictBudgetAllocationItem {
  id: number;
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  financial_year: number;
  annual_budget?: number | null;
  monthly_budget?: number | null;
  allocated_amount?: number | null;
  spent_amount?: number | null;
  remaining_budget?: number | null;
  proposed_budget?: number | null;
  budget_source?: string | null;
  verification_status: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DistrictBudgetAllocationCreate {
  district_id: number;
  state_id: number;
  financial_year: number;
  annual_budget?: number;
  monthly_budget?: number;
  allocated_amount?: number;
  spent_amount?: number;
  remaining_budget?: number;
  proposed_budget?: number;
  budget_source?: string;
  verification_status?: string;
  notes?: string;
}

export interface PoolCostItem {
  resource_category: string;
  resource_type_id: number;
  resource_name: string;
  unit_of_measure: string;
  recommended_units: number;
  existing_inventory_units: number;
  procurement_units: number;
  inventory_status: 'VERIFIED' | 'UNRECORDED' | 'NOT_CONFIGURED';
  unit_acquisition_cost: number;
  monthly_operating_unit_cost: number;
  annual_maintenance_unit_cost: number;
  total_acquisition_cost: number;
  monthly_operating_cost: number;
  annual_operating_cost: number;
  annual_maintenance_cost: number;
  total_annual_requirement: number;
  is_partner_agency: boolean;
  verification_status: string;
}

export interface DistrictBudgetSummaryItem {
  rank: number;
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  risk_score: number;
  risk_level: string;
  recommended_units_total: number;
  existing_inventory_total: number;
  procurement_units_total: number;
  inventory_configured_status: 'FULLY_RECORDED' | 'PARTIAL' | 'UNRECORDED';
  total_estimated_requirement: number;
  total_capex_procurement: number;
  total_opex_annual: number;
  total_maintenance_annual: number;
  total_partner_agency_cost: number;
  total_police_budget_requirement: number;
  configured_budget?: number | null;
  budget_verification_status: string;
  budget_gap_or_surplus?: number | null;
  unmet_demand_count: number;
  pool_breakdown: PoolCostItem[];
}

export interface StateBudgetSummaryItem {
  state_id: number;
  state_name: string;
  state_code?: string | null;
  districts_count: number;
  districts_assessed_count: number;
  total_estimated_requirement: number;
  total_capex_procurement: number;
  total_opex_annual: number;
  total_maintenance_annual: number;
  total_partner_agency_cost: number;
  total_police_budget_requirement: number;
  configured_annual_budget?: number | null;
  budget_verification_status: string;
  budget_gap_or_surplus?: number | null;
  unmet_demand_total: number;
  inventory_configured_districts: number;
}

export interface BudgetSimulationRequest {
  state_id?: number | null;
  district_id?: number | null;
  period_year?: number;
  period_month?: number;
  total_budget_limit?: number | null;
  category_budget_limits?: Record<string, number> | null;
  cost_overrides?: Record<string, Record<string, number>> | null;
  quantity_overrides?: Record<string, number> | null;
  operating_assumptions?: Record<string, any> | null;
}

export interface BudgetSimulationResponse {
  scenario_id: string;
  state_id?: number | null;
  district_id?: number | null;
  period_year: number;
  period_month: number;
  baseline_police_requirement: number;
  proposed_police_requirement: number;
  delta_requirement: number;
  baseline_partner_agency_cost: number;
  proposed_partner_agency_cost: number;
  total_capex_procurement: number;
  total_opex_annual: number;
  total_maintenance_annual: number;
  configured_budget_limit?: number | null;
  budget_surplus_or_deficit?: number | null;
  unmet_resource_demand_count: number;
  category_summary: Record<string, {
    baseline_units: number;
    proposed_units: number;
    delta_units: number;
    capex_procurement: number;
    opex_annual: number;
    maintenance_annual: number;
    total_annual: number;
    is_partner_agency: boolean;
  }>;
  disclaimer: string;
}

export interface BudgetScenarioItem {
  id: number;
  scenario_id: string;
  name: string;
  description?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  budget_year: number;
  budget_month: number;
  total_budget_limit?: number | null;
  category_budget_limits?: Record<string, number> | null;
  cost_overrides?: Record<string, Record<string, number>> | null;
  quantity_overrides?: Record<string, number> | null;
  operating_assumptions?: Record<string, any> | null;
  is_baseline: boolean;
  created_at?: string;
}

export interface BudgetCalculationHistoryItem {
  id: number;
  calculation_id: string;
  scenario_id?: string | null;
  optimization_run_id?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  period_year: number;
  period_month: number;
  assessment_period: string;
  total_capex: number;
  total_opex_monthly: number;
  total_opex_annual: number;
  total_maintenance_annual: number;
  total_partner_agency_cost: number;
  total_police_budget_requirement: number;
  total_gross_requirement: number;
  configured_budget?: number | null;
  budget_gap_or_surplus?: number | null;
  unmet_demand_count: number;
  created_at?: string;
}

export interface FullBudgetOverviewResponse {
  period_year: number;
  period_month: number;
  assessment_period: string;
  total_gross_estimated_requirement: number;
  total_police_budget_requirement: number;
  total_partner_agency_cost: number;
  total_capex_procurement: number;
  total_opex_annual: number;
  total_maintenance_annual: number;
  total_configured_state_budget: number;
  total_budget_gap_or_surplus: number;
  configured_states_count: number;
  unconfigured_states_count: number;
  unconfigured_cost_items_count: number;
  unrecorded_inventory_districts_count: number;
  category_expenditure_breakdown: Record<string, {
    capex: number;
    opex: number;
    maintenance: number;
    total: number;
    units: number;
    is_partner_agency: boolean;
  }>;
  capex_vs_opex_summary: {
    capex_percentage: number;
    opex_percentage: number;
    capex_amount: number;
    opex_amount: number;
  };
  warnings: string[];
  planning_disclaimer: string;
}


