import apiClient from './client';
import type { OfficialCrimeStatisticListResponse } from '../types';

export const officialCrimeApi = {
  /**
   * Fetch verified macro-level annual crime statistics published by NCRB.
   */
  getStatistics: async (params?: {
    report_year?: number;
    geography_level?: string;
    state_id?: number;
    crime_head?: string;
  }): Promise<OfficialCrimeStatisticListResponse> => {
    const response = await apiClient.get<OfficialCrimeStatisticListResponse>(
      '/official-crime/statistics',
      { params }
    );
    return response.data;
  },

  /**
   * Fetch available publication years from NCRB records.
   */
  getAvailableYears: async (): Promise<number[]> => {
    const response = await apiClient.get<number[]>('/official-crime/years');
    return response.data;
  },
};

export default officialCrimeApi;
