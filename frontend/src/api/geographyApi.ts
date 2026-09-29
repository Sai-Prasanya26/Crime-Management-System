import apiClient from './client';
import type {
  StateListResponse,
  DistrictListResponse,
  DistrictDetailResponse,
  DistrictGeographyMappingListResponse,
} from '../types';

export const geographyApi = {
  /**
   * Fetch Indian States and Union Territories.
   * @param view 'current' (28 States + 8 UTs) or 'historical' (Census 2011 35 entities). Defaults to 'current'.
   */
  getStates: async (view: 'current' | 'historical' = 'current'): Promise<StateListResponse> => {
    const response = await apiClient.get<StateListResponse>('/geography/states', {
      params: { view },
    });
    return response.data;
  },

  /**
   * Fetch districts with optional state_id and view filtering.
   * @param stateId Optional state filter.
   * @param view 'current' (787 administrative districts) or 'historical' (640 Census 2011 districts). Defaults to 'current'.
   */
  getDistricts: async (
    stateId?: number,
    view: 'current' | 'historical' = 'current'
  ): Promise<DistrictListResponse> => {
    const params: Record<string, string | number> = { view };
    if (stateId) {
      params.state_id = stateId;
    }
    const response = await apiClient.get<DistrictListResponse>('/geography/districts', { params });
    return response.data;
  },

  /**
   * Fetch detailed district metadata including Census demographics and parent district linkage.
   */
  getDistrictDetail: async (districtId: number): Promise<DistrictDetailResponse> => {
    const response = await apiClient.get<DistrictDetailResponse>(`/geography/districts/${districtId}`);
    return response.data;
  },

  /**
   * Fetch verified boundary mappings between Census 2011 historical districts and modern administrative districts.
   */
  getMappings: async (
    historicalDistrictId?: number,
    currentDistrictId?: number
  ): Promise<DistrictGeographyMappingListResponse> => {
    const params: Record<string, number> = {};
    if (historicalDistrictId) params.historical_district_id = historicalDistrictId;
    if (currentDistrictId) params.current_district_id = currentDistrictId;
    const response = await apiClient.get<DistrictGeographyMappingListResponse>('/geography/mappings', { params });
    return response.data;
  },
};

export default geographyApi;
