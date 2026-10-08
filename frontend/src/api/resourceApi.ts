import apiClient from './client';
import type {
  StateResourceListResponse,
  ResourceCoverageResponse,
  ResourceOverview,
  ResourceCategoryDetail,
  DistrictResourceListResponse,
  DistrictResourceItem,
  DistrictResourceGapListResponse,
  AIResourceRecommendationListResponse,
  ResourceSummaryResponse,
  ResourceCrimeComparisonResponse,
  ResourceTypeItem,
} from '../types';

export interface StateResourceFilterParams {
  state_id?: number;
  resource_type_id?: number;
  reference_year?: number;
  skip?: number;
  limit?: number;
}

export interface DistrictResourceFilterParams {
  state_id?: number;
  district_id?: number;
  category?: string;
  resource_type_id?: number;
  data_status?: string;
  reference_year?: number;
  skip?: number;
  limit?: number;
}

export interface CategoryResourceFilterParams {
  state_id?: number;
  district_id?: number;
  data_status?: string;
  skip?: number;
  limit?: number;
}

export interface ResourceGapFilterParams {
  state_id?: number;
  category?: string;
  skip?: number;
  limit?: number;
}

export interface AIRecommendationFilterParams {
  state_id?: number;
  priority_tier?: string;
  risk_level?: string;
  skip?: number;
  limit?: number;
}

export interface AllocationSimulationRequest {
  resource_type_id: number;
  pool_capacity: number;
}

export const resourceApi = {
  /**
   * Fetch official state-level police resource data (personnel strength & fleet availability)
   * sourced from authoritative BPR&D / Ministry of Home Affairs government records.
   */
  getStateResources: async (
    params?: StateResourceFilterParams
  ): Promise<StateResourceListResponse> => {
    const response = await apiClient.get<StateResourceListResponse>('/resources/states', {
      params: {
        state_id: params?.state_id,
        resource_type_id: params?.resource_type_id,
        reference_year: params?.reference_year,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * Fetch official resource coverage statistics, institutional provenance metadata,
   * covered vs missing jurisdictions, and methodology notes.
   */
  getCoverage: async (): Promise<ResourceCoverageResponse> => {
    const response = await apiClient.get<ResourceCoverageResponse>('/resources/coverage');
    return response.data;
  },

  /**
   * Fetch high-level resource optimization overview across 640 assessed districts.
   */
  getOverview: async (
    assessmentPeriod: string = '2026-01-01',
    calculationVersion: string = 'resource-v1.0'
  ): Promise<ResourceOverview> => {
    const response = await apiClient.get<ResourceOverview>('/resources/overview', {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
      },
    });
    return response.data;
  },

  /**
   * Retrieve resource categories and comprehensive taxonomy details.
   */
  getCategories: async (): Promise<ResourceCategoryDetail[]> => {
    const response = await apiClient.get<ResourceCategoryDetail[]>('/resources/categories');
    return response.data;
  },

  /**
   * List district resource inventories across 640 districts with data status badges.
   */
  getDistrictResources: async (
    params?: DistrictResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/districts', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        category: params?.category,
        resource_type_id: params?.resource_type_id,
        data_status: params?.data_status,
        reference_year: params?.reference_year,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * Get multi-category resource breakdown for a specific district.
   */
  getDistrictDetailMulti: async (
    districtId: number
  ): Promise<DistrictResourceItem[]> => {
    const response = await apiClient.get<DistrictResourceItem[]>(`/resources/districts/${districtId}`);
    return response.data;
  },

  /**
   * List district police personnel resources.
   */
  getPersonnelResources: async (
    params?: CategoryResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/personnel', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        data_status: params?.data_status,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List district patrol & mobility fleet resources.
   */
  getVehicleResources: async (
    params?: CategoryResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/vehicles', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        data_status: params?.data_status,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List district investigation units and specialized team resources.
   */
  getInvestigationResources: async (
    params?: CategoryResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/investigation', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        data_status: params?.data_status,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List district surveillance teams, CCTV networks, and command centers.
   */
  getSurveillanceResources: async (
    params?: CategoryResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/surveillance', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        data_status: params?.data_status,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List district police infrastructure resources (stations, outposts, labs).
   */
  getInfrastructureResources: async (
    params?: CategoryResourceFilterParams
  ): Promise<DistrictResourceListResponse> => {
    const response = await apiClient.get<DistrictResourceListResponse>('/resources/infrastructure', {
      params: {
        state_id: params?.state_id,
        district_id: params?.district_id,
        data_status: params?.data_status,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List comparative resource gaps (gap is strictly null when inventory is unrecorded).
   */
  getResourceGaps: async (
    params?: ResourceGapFilterParams
  ): Promise<DistrictResourceGapListResponse> => {
    const response = await apiClient.get<DistrictResourceGapListResponse>('/resources/gaps', {
      params: {
        state_id: params?.state_id,
        category: params?.category,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * List AI resource optimization recommendations and priority tiers across districts.
   */
  getAIRecommendations: async (
    params?: AIRecommendationFilterParams
  ): Promise<AIResourceRecommendationListResponse> => {
    const response = await apiClient.get<AIResourceRecommendationListResponse>('/resources/recommendations', {
      params: {
        state_id: params?.state_id,
        priority_tier: params?.priority_tier,
        risk_level: params?.risk_level,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      },
    });
    return response.data;
  },

  /**
   * Simulate constrained resource allocation across districts.
   */
  simulateAllocation: async (
    body: AllocationSimulationRequest,
    assessmentPeriod: string = '2026-01-01',
    calculationVersion: string = 'resource-v1.0'
  ) => {
    const response = await apiClient.post('/resources/allocate', body, {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
      },
    });
    return response.data;
  },

  /**
   * Fetch official state police resource summary with provenance & coverage indicators.
   */
  getResourceSummary: async (params?: {
    state_id?: number;
    reference_year?: number;
  }): Promise<ResourceSummaryResponse> => {
    const response = await apiClient.get<ResourceSummaryResponse>('/resources/summary', {
      params: {
        state_id: params?.state_id,
        reference_year: params?.reference_year,
      },
    });
    return response.data;
  },

  /**
   * Fetch analytical state-level comparison between historical crime burden (2020-2025)
   * and official police resources (2020/2024).
   */
  getResourceComparison: async (params?: {
    state_id?: number;
  }): Promise<ResourceCrimeComparisonResponse> => {
    const response = await apiClient.get<ResourceCrimeComparisonResponse>('/resources/comparison', {
      params: {
        state_id: params?.state_id,
      },
    });
    return response.data;
  },

  /**
   * Fetch all active operational police resource types with codes and units.
   */
  getResourceTypes: async (): Promise<ResourceTypeItem[]> => {
    const response = await apiClient.get<ResourceTypeItem[]>('/resources/types');
    return response.data;
  },
};

export default resourceApi;
