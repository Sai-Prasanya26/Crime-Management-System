import apiClient from './client';
import type {
  OptimizationOverviewResponse,
  OptimizationResourcesAuditResponse,
  OptimizationRunRequest,
  OptimizationRunResponse,
  OptimizationAllocationItem,
  OptimizationScenarioComparisonRequest,
  OptimizationScenarioComparisonResponse,
  PaginatedList,
} from '../types';

export interface AllocationFilterParams {
  run_id?: string;
  state_id?: number;
  district_id?: number;
  resource_type_id?: number;
  risk_level?: string;
  allocation_status?: string;
  skip?: number;
  limit?: number;
}

export interface RunFilterParams {
  state_id?: number;
  resource_type_id?: number;
  skip?: number;
  limit?: number;
}

export const optimizationApi = {
  /**
   * Retrieve high-level optimization summary, verified BPR&D standing inventories,
   * eligible vs ineligible categories, and recent runs.
   */
  getOverview: async (): Promise<OptimizationOverviewResponse> => {
    const response = await apiClient.get<OptimizationOverviewResponse>('/optimization/overview');
    return response.data;
  },

  /**
   * Retrieve institutional data audit reconciling 288 state resources,
   * 4,510 district records, and the Phase 9 reporting discrepancy explanation.
   */
  getResourcesAudit: async (): Promise<OptimizationResourcesAuditResponse> => {
    const response = await apiClient.get<OptimizationResourcesAuditResponse>('/optimization/resources');
    return response.data;
  },

  /**
   * List paginated district allocations across executed optimization runs.
   */
  listRecommendations: async (
    params?: AllocationFilterParams
  ): Promise<PaginatedList<OptimizationAllocationItem>> => {
    const response = await apiClient.get<PaginatedList<OptimizationAllocationItem>>(
      '/optimization/recommendations',
      { params }
    );
    return response.data;
  },

  /**
   * List historical optimization scenario runs with solver status and shortfall reduction.
   */
  listRuns: async (params?: RunFilterParams): Promise<PaginatedList<OptimizationRunResponse>> => {
    const response = await apiClient.get<PaginatedList<OptimizationRunResponse>>(
      '/optimization/runs',
      { params }
    );
    return response.data;
  },

  /**
   * Retrieve full details and allocation line-items for a specific run.
   */
  getRunDetail: async (runId: string): Promise<OptimizationRunResponse> => {
    const response = await apiClient.get<OptimizationRunResponse>(`/optimization/runs/${runId}`);
    return response.data;
  },

  /**
   * Execute mixed-integer linear programming optimization under standing pool constraints.
   * Requires ANALYST or ADMIN role.
   */
  executeRun: async (body: OptimizationRunRequest): Promise<OptimizationRunResponse> => {
    const response = await apiClient.post<OptimizationRunResponse>('/optimization/run', body);
    return response.data;
  },

  /**
   * Simulate and compare multiple optimization scenarios side-by-side.
   * Requires ANALYST or ADMIN role.
   */
  compareScenarios: async (
    body: OptimizationScenarioComparisonRequest
  ): Promise<OptimizationScenarioComparisonResponse> => {
    const response = await apiClient.post<OptimizationScenarioComparisonResponse>(
      '/optimization/scenarios',
      body
    );
    return response.data;
  },
};

export default optimizationApi;
