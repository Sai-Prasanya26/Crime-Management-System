import apiClient from './client';
import type {
  FilterParams,
  CrimeOverviewResponse,
  TrendResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  HourlyDistributionResponse,
  VictimDemographicsResponse,
  WeaponDistributionResponse,
  TopDistrictsResponse,
  HealthResponse,
} from '../types';

export const analyticsApi = {
  /**
   * Health check on API v1.
   */
  getHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },

  /**
   * High-level crime overview metrics (total incidents, clearance rate, open/closed cases).
   */
  getOverview: async (filters?: FilterParams): Promise<CrimeOverviewResponse> => {
    const response = await apiClient.get<CrimeOverviewResponse>('/analytics/overview', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Longitudinal crime volume trends by interval (year, month, day).
   */
  getTrends: async (
    interval: 'year' | 'month' | 'day' = 'month',
    filters?: FilterParams
  ): Promise<TrendResponse> => {
    const response = await apiClient.get<TrendResponse>('/analytics/trends', {
      params: { interval, ...filters },
    });
    return response.data;
  },

  /**
   * Crime distribution across 4 high-level domains (Violent Crime, Fire Accident, Traffic Fatality, Other).
   */
  getByCategory: async (filters?: FilterParams): Promise<CategoryBreakdownResponse> => {
    const response = await apiClient.get<CategoryBreakdownResponse>('/analytics/by-category', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Crime distribution across 21 legal crime types with severity tiers.
   */
  getByType: async (
    categoryId?: number,
    filters?: FilterParams
  ): Promise<TypeBreakdownResponse> => {
    const params = categoryId ? { category_id: categoryId, ...filters } : filters;
    const response = await apiClient.get<TypeBreakdownResponse>('/analytics/by-type', {
      params,
    });
    return response.data;
  },

  /**
   * Hourly incident distribution across 24 hours (0-23h) and peak crime patrol hour.
   */
  getHourly: async (filters?: FilterParams): Promise<HourlyDistributionResponse> => {
    const response = await apiClient.get<HourlyDistributionResponse>('/analytics/hourly', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Victim age cohorts and gender-disaggregated statistics.
   */
  getDemographics: async (filters?: FilterParams): Promise<VictimDemographicsResponse> => {
    const response = await apiClient.get<VictimDemographicsResponse>('/analytics/demographics', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Weapon involvement distribution.
   */
  getWeapons: async (filters?: FilterParams): Promise<WeaponDistributionResponse> => {
    const response = await apiClient.get<WeaponDistributionResponse>('/analytics/weapons', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Ranked crime-prone districts by absolute volume or per-capita rate per 100k citizens.
   */
  getTopDistricts: async (params?: {
    metric?: 'volume' | 'rate';
    limit?: number;
    state_id?: number;
  }): Promise<TopDistrictsResponse> => {
    const response = await apiClient.get<TopDistrictsResponse>('/analytics/top-districts', {
      params,
    });
    return response.data;
  },
};

export default analyticsApi;
