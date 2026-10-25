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
} from '../types/budget';

export const budgetApi = {
  /**
   * Fetches macroeconomic budget overview and category breakdowns.
   */
  async getOverview(assessmentPeriod?: string): Promise<BudgetOverview> {
    const params = assessmentPeriod ? { assessment_period: assessmentPeriod } : {};
    const res = await apiClient.get<BudgetOverview>('/budget/overview', { params });
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

