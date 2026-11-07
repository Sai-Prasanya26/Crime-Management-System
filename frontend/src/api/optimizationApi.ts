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
  CrimeResourceMappingItem,
  CrimeResourceMappingUpdateRequest,
  CrimeResourceMappingListResponse,
  ResourceInventoryItem,
  ResourceInventoryUpdateRequest,
  ResourceInventorySummaryResponse,
  DistrictCrimeDemandResponse,
  CrimeSpecificOptimizationRequest,
  CrimeSpecificOptimizationResponse,
  DistrictPipelineForecastResponse,
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

  // ==========================================================================
  // Phase 10: Crime-Specific AI Preventive Resource Optimization
  // ==========================================================================

  /**
   * Retrieve configurable mappings connecting predicted crime types to suitable preventive resources.
   */
  getCrimeMappings: async (params?: {
    crime_type_id?: number;
    shared_pool_category?: string;
    is_active?: boolean;
  }): Promise<CrimeResourceMappingListResponse> => {
    const response = await apiClient.get<CrimeResourceMappingListResponse>(
      '/optimization/crime-mappings',
      { params }
    );
    return response.data;
  },

  /**
   * Update requirement coefficient, threshold, priority weight, or operational rationale.
   * Admin RBAC required.
   */
  updateCrimeMapping: async (
    mappingId: number,
    body: CrimeResourceMappingUpdateRequest
  ): Promise<CrimeResourceMappingItem> => {
    const response = await apiClient.put<CrimeResourceMappingItem>(
      `/optimization/crime-mappings/${mappingId}`,
      body
    );
    return response.data;
  },

  /**
   * Reset all crime-to-resource mappings back to institutional defaults.
   * Admin RBAC required.
   */
  resetCrimeMappings: async (): Promise<CrimeResourceMappingListResponse> => {
    const response = await apiClient.post<CrimeResourceMappingListResponse>(
      '/optimization/crime-mappings/reset'
    );
    return response.data;
  },

  /**
   * Retrieve calculated crime-specific preventive resource demand breakdown for a district.
   */
  getDistrictCrimeDemand: async (params: {
    district_id: number;
    year?: number;
    month?: number;
  }): Promise<DistrictCrimeDemandResponse> => {
    const response = await apiClient.get<DistrictCrimeDemandResponse>(
      '/optimization/crime-demand',
      { params }
    );
    return response.data;
  },

  /**
   * List standing resource inventory records detailing total, deployed, unavailable, and available pools.
   */
  getInventory: async (params?: {
    state_id?: number;
    district_id?: number;
    category?: string;
  }): Promise<PaginatedList<ResourceInventoryItem>> => {
    const response = await apiClient.get<PaginatedList<ResourceInventoryItem>>(
      '/optimization/inventory',
      { params }
    );
    return response.data;
  },

  /**
   * Update standing inventory planning inputs for scenario modeling.
   * Admin RBAC required.
   */
  updateInventory: async (
    inventoryId: number,
    body: ResourceInventoryUpdateRequest
  ): Promise<ResourceInventoryItem> => {
    const response = await apiClient.put<ResourceInventoryItem>(
      `/optimization/inventory/${inventoryId}`,
      body
    );
    return response.data;
  },

  /**
   * Retrieve aggregated inventory totals, deployed counts, and available pools by category.
   */
  getInventorySummary: async (stateId?: number): Promise<ResourceInventorySummaryResponse> => {
    const response = await apiClient.get<ResourceInventorySummaryResponse>(
      '/optimization/inventory/summary',
      { params: stateId ? { state_id: stateId } : undefined }
    );
    return response.data;
  },

  /**
   * Execute mixed-integer linear programming (MILP) to allocate resources across districts
   * based on predicted crime types, severity, and Phase 9 risk scores while strictly conserving resource pools.
   * Analyst or Admin RBAC required.
   */
  executeCrimeSpecificOptimization: async (
    body: CrimeSpecificOptimizationRequest
  ): Promise<CrimeSpecificOptimizationResponse> => {
    const response = await apiClient.post<CrimeSpecificOptimizationResponse>(
      '/optimization/crime-optimize',
      body
    );
    return response.data;
  },

  /**
   * Retrieve integrated district crime predictions (21 canonical types, trend, risk)
   * coupled with 10-pool resource demand calculations and Scipy integer MILP recommended allocations.
   */
  getDistrictPipelineForecast: async (params: {
    district_id: number;
    year?: number;
    month?: number;
  }): Promise<DistrictPipelineForecastResponse> => {
    const response = await apiClient.get<DistrictPipelineForecastResponse>(
      '/optimization/district-pipeline-forecast',
      { params }
    );
    return response.data;
  },
};

export default optimizationApi;

