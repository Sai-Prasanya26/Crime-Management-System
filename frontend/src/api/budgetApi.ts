/**
 * Phase 11: Budget Estimation and Cost Analysis API Client.
 */

import apiClient from './client';
import type {
  CostBenchmarkRateItem,
  BudgetEstimationRun,
  ScenarioCostComparison,
  BudgetOverview,
  BudgetEstimateRequest,
  ResourceCostMasterItem,
  ResourceCostMasterCreate,
  ResourceCostMasterUpdate,
  StateBudgetItem,
  StateBudgetCreate,
  DistrictBudgetAllocationItem,
  DistrictBudgetAllocationCreate,
  DistrictBudgetSummaryItem,
  StateBudgetSummaryItem,
  BudgetSimulationRequest,
  BudgetSimulationResponse,
  BudgetScenarioItem,
  BudgetCalculationHistoryItem,
  FullBudgetOverviewResponse,
} from '../types/budget';

export const budgetApi = {
  /**
   * Fetches macroeconomic budget overview and category breakdowns (Phase 10 run linked).
   */
  async getOverview(assessmentPeriod?: string): Promise<BudgetOverview> {
    const params = assessmentPeriod ? { assessment_period: assessmentPeriod } : {};
    const res = await apiClient.get<BudgetOverview>('/budget/overview', { params });
    return res.data;
  },

  /**
   * Fetches comprehensive 10-pool financial requirements, separating CAPEX from OPEX and partner agency costs.
   */
  async getFullOverview(params?: { year?: number; month?: number; state_id?: number }): Promise<FullBudgetOverviewResponse> {
    const res = await apiClient.get<FullBudgetOverviewResponse>('/budget/full-overview', { params });
    return res.data;
  },

  /**
   * Fetches state-wise comparison of estimated resource requirements against configured statutory police budgets.
   */
  async getStateSummary(params?: { year?: number; month?: number }): Promise<StateBudgetSummaryItem[]> {
    const res = await apiClient.get<StateBudgetSummaryItem[]>('/budget/states/summary', { params });
    return res.data;
  },

  /**
   * Fetches specific state budget summary and gap analysis.
   */
  async getStateBudgetDetail(stateId: number, params?: { year?: number; month?: number }): Promise<StateBudgetSummaryItem> {
    const res = await apiClient.get<StateBudgetSummaryItem>(`/budget/state/${stateId}`, { params });
    return res.data;
  },

  /**
   * Fetches specific district budget detail with complete 10-pool breakdown.
   */
  async getDistrictBudgetDetail(districtId: number, params?: { year?: number; month?: number }): Promise<DistrictBudgetSummaryItem> {
    const res = await apiClient.get<DistrictBudgetSummaryItem>(`/budget/district/${districtId}`, { params });
    return res.data;
  },

  /**
   * Fetches paginated district-level budget register with complete 10-pool requirements and gap analysis.
   */
  async getDistrictSummary(params?: {
    state_id?: number;
    year?: number;
    month?: number;
    skip?: number;
    limit?: number;
    risk_level?: string;
    search?: string;
  }): Promise<{ items: DistrictBudgetSummaryItem[]; total: number; skip: number; limit: number }> {
    const res = await apiClient.get<{ items: DistrictBudgetSummaryItem[]; total: number; skip: number; limit: number }>(
      '/budget/districts/summary',
      { params }
    );
    return res.data;
  },

  /**
   * Lists Resource Cost Master records for all 10 resource pools.
   */
  async getCostMaster(params?: { category?: string; is_active?: boolean }): Promise<ResourceCostMasterItem[]> {
    const res = await apiClient.get<ResourceCostMasterItem[]>('/budget/cost-master', { params });
    return res.data;
  },

  /**
   * Fetches single Resource Cost Master record.
   */
  async getCostMasterItem(id: number): Promise<ResourceCostMasterItem> {
    const res = await apiClient.get<ResourceCostMasterItem>(`/budget/cost-master/${id}`);
    return res.data;
  },

  /**
   * Creates a new Resource Cost Master record (Admin only).
   */
  async createCostMaster(data: ResourceCostMasterCreate): Promise<ResourceCostMasterItem> {
    const res = await apiClient.post<ResourceCostMasterItem>('/budget/cost-master', data);
    return res.data;
  },

  /**
   * Updates an existing Resource Cost Master record (Admin only).
   */
  async updateCostMaster(id: number, data: ResourceCostMasterUpdate): Promise<ResourceCostMasterItem> {
    const res = await apiClient.put<ResourceCostMasterItem>(`/budget/cost-master/${id}`, data);
    return res.data;
  },

  /**
   * Deactivates a Resource Cost Master record (Admin only).
   */
  async deleteCostMaster(id: number): Promise<{ status: string; message: string }> {
    const res = await apiClient.delete<{ status: string; message: string }>(`/budget/cost-master/${id}`);
    return res.data;
  },

  /**
   * Lists statutory state budget baselines.
   */
  async getStateBudgets(params?: { year?: number; state_id?: number }): Promise<StateBudgetItem[]> {
    const res = await apiClient.get<StateBudgetItem[]>('/budget/state-budgets', { params });
    return res.data;
  },

  /**
   * Configures or updates state budget baseline (Admin only).
   */
  async configureStateBudget(data: StateBudgetCreate): Promise<StateBudgetItem> {
    const res = await apiClient.post<StateBudgetItem>('/budget/state-budgets', data);
    return res.data;
  },

  /**
   * Lists district budget allocations.
   */
  async getDistrictBudgets(params?: {
    year?: number;
    state_id?: number;
    district_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<{ items: DistrictBudgetAllocationItem[]; total: number; skip: number; limit: number }> {
    const res = await apiClient.get<{ items: DistrictBudgetAllocationItem[]; total: number; skip: number; limit: number }>(
      '/budget/district-budgets',
      { params }
    );
    return res.data;
  },

  /**
   * Configures or updates district budget allocation (Admin only).
   */
  async configureDistrictBudget(data: DistrictBudgetAllocationCreate): Promise<DistrictBudgetAllocationItem> {
    const res = await apiClient.post<DistrictBudgetAllocationItem>('/budget/district-budgets', data);
    return res.data;
  },

  /**
   * Executes interactive in-memory budget simulation.
   */
  async simulateBudget(data: BudgetSimulationRequest): Promise<BudgetSimulationResponse> {
    const res = await apiClient.post<BudgetSimulationResponse>('/budget/simulate', data);
    return res.data;
  },

  /**
   * Lists saved budget scenarios.
   */
  async getScenarios(params?: { state_id?: number; district_id?: number }): Promise<BudgetScenarioItem[]> {
    const res = await apiClient.get<BudgetScenarioItem[]>('/budget/scenarios', { params });
    return res.data;
  },

  /**
   * Saves a budget scenario (Analyst/Admin only).
   */
  async saveScenario(data: any): Promise<BudgetScenarioItem> {
    const res = await apiClient.post<BudgetScenarioItem>('/budget/scenarios', data);
    return res.data;
  },

  /**
   * Lists calculation audit history.
   */
  async getCalculationHistory(params?: { skip?: number; limit?: number }): Promise<BudgetCalculationHistoryItem[]> {
    const res = await apiClient.get<BudgetCalculationHistoryItem[]>('/budget/history', { params });
    return res.data;
  },

  /**
   * Lists active cost benchmark rates with provenance and sources.
   */
  async getBenchmarks(params?: { resource_type_id?: number; cost_type?: string }): Promise<CostBenchmarkRateItem[]> {
    const res = await apiClient.get<CostBenchmarkRateItem[]>('/budget/benchmarks', { params });
    return res.data;
  },

  /**
   * Fetches effective aggregate rates for a resource type.
   */
  async getEffectiveRate(resourceTypeId: number): Promise<Record<string, any>> {
    const res = await apiClient.get<Record<string, any>>(`/budget/benchmarks/${resourceTypeId}`);
    return res.data;
  },

  /**
   * Executes dynamic budget estimation (linked to an optimization scenario or standalone).
   */
  async estimateBudget(payload: BudgetEstimateRequest): Promise<BudgetEstimationRun> {
    const res = await apiClient.post<BudgetEstimationRun>('/budget/estimate', payload);
    return res.data;
  },

  /**
   * Compares scenario costs against baseline optimization scenario.
   */
  async compareScenarios(payload: { baseline_run_id: string; scenario_run_id: string }): Promise<ScenarioCostComparison> {
    const res = await apiClient.post<ScenarioCostComparison>('/budget/scenarios/compare', payload);
    return res.data;
  },

  /**
   * Lists historical budget estimation runs.
   */
  async getRuns(params?: { skip?: number; limit?: number }): Promise<BudgetEstimationRun[]> {
    const res = await apiClient.get<BudgetEstimationRun[]>('/budget/runs', { params });
    return res.data;
  },

  /**
   * Fetches full run detail including district line items.
   */
  async getRunById(runId: string): Promise<BudgetEstimationRun> {
    const res = await apiClient.get<BudgetEstimationRun>(`/budget/runs/${runId}`);
    return res.data;
  },
};

