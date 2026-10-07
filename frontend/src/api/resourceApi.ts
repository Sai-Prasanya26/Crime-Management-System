import apiClient from './client';
import type {
  StateResourceListResponse,
  ResourceCoverageResponse,
} from '../types';

export interface StateResourceFilterParams {
  state_id?: number;
  resource_type_id?: number;
  reference_year?: number;
  skip?: number;
  limit?: number;
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
};

export default resourceApi;
