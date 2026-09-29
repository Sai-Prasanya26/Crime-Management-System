import apiClient from './client';
import type {
  StateListResponse,
  DistrictListResponse,
  DistrictDetailResponse,
} from '../types';

export const geographyApi = {
  /**
   * Fetch all 35 Indian States and Union Territories.
   */
  getStates: async (): Promise<StateListResponse> => {
    const response = await apiClient.get<StateListResponse>('/geography/states');
    return response.data;
  },

  /**
   * Fetch districts with optional state_id filtering.
   */
  getDistricts: async (stateId?: number): Promise<DistrictListResponse> => {
    const params = stateId ? { state_id: stateId } : {};
    const response = await apiClient.get<DistrictListResponse>('/geography/districts', { params });
    return response.data;
  },

  /**
   * Fetch detailed district metadata including Census demographics.
   */
  getDistrictDetail: async (districtId: number): Promise<DistrictDetailResponse> => {
    const response = await apiClient.get<DistrictDetailResponse>(`/geography/districts/${districtId}`);
    return response.data;
  },
};

export default geographyApi;
