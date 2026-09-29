import apiClient from './client';
import type {
  OfficialCrimeStatisticListResponse,
  StateCoverageListResponse,
  DataFreshnessResponse,
  DistrictCoverageListResponse,
} from '../types';

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

  /**
   * Fetch complete data coverage audit across all 36 active Indian States and UTs.
   */
  getStateCoverage: async (): Promise<StateCoverageListResponse> => {
    const response = await apiClient.get<StateCoverageListResponse>('/official-crime/coverage');
    return response.data;
  },

  /**
   * Fetch system-wide data freshness, census baselines, and temporal metadata.
   */
  getDataFreshness: async (): Promise<DataFreshnessResponse> => {
    const response = await apiClient.get<DataFreshnessResponse>('/official-crime/freshness');
    return response.data;
  },

  /**
   * Fetch district coverage audit with historical Census-2011 parent lineage.
   */
  getDistrictCoverage: async (stateId?: number): Promise<DistrictCoverageListResponse> => {
    const response = await apiClient.get<DistrictCoverageListResponse>(
      '/official-crime/district-coverage',
      { params: { state_id: stateId } }
    );
    return response.data;
  },
};

export default officialCrimeApi;
