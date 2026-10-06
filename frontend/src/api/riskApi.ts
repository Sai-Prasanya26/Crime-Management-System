import apiClient from './client';
import type {
  RiskOverviewResponse,
  RiskModelInfoResponse,
  RiskListResponse,
  DistrictRiskDetailResponse,
  RiskFilterParams,
} from '../types';

export const riskApi = {
  /**
   * Fetch high-level risk assessment landscape including counts, mean score, and top districts.
   */
  getOverview: async (
    assessmentPeriod: string = '2026-01-01',
    calculationVersion: string = 'risk-v1.0'
  ): Promise<RiskOverviewResponse> => {
    const response = await apiClient.get<RiskOverviewResponse>('/risk/overview', {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
      },
    });
    return response.data;
  },

  /**
   * Fetch frozen risk-v1.0 methodology information and component weights.
   */
  getModelInfo: async (): Promise<RiskModelInfoResponse> => {
    const response = await apiClient.get<RiskModelInfoResponse>('/risk/model');
    return response.data;
  },

  /**
   * List paginated district risk scores with server-side filtering.
   */
  listRiskScores: async (params?: RiskFilterParams): Promise<RiskListResponse> => {
    const response = await apiClient.get<RiskListResponse>('/risk', {
      params: {
        assessment_period: params?.assessment_period || '2026-01-01',
        calculation_version: params?.calculation_version || 'risk-v1.0',
        state_id: params?.state_id,
        district_id: params?.district_id,
        risk_level: params?.risk_level,
        skip: params?.skip || 0,
        limit: params?.limit || 50,
      },
    });
    return response.data;
  },

  /**
   * Fetch complete explainable risk assessment details for a specific district.
   */
  getDistrictRiskDetail: async (
    districtId: number,
    assessmentPeriod: string = '2026-01-01',
    calculationVersion: string = 'risk-v1.0'
  ): Promise<DistrictRiskDetailResponse> => {
    const response = await apiClient.get<DistrictRiskDetailResponse>(`/risk/${districtId}`, {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
      },
    });
    return response.data;
  },
};
