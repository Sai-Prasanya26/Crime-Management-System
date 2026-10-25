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

