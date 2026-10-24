import apiClient from './client';
import type {
  RiskOverviewResponse,
  RiskModelInfoResponse,
  RiskListResponse,
  DistrictRiskDetailResponse,
  RiskFilterParams,
  RiskTrendsResponse,
} from '../types';

export const riskApi = {
  /**
   * Fetch high-level risk assessment landscape including counts, mean score, and top districts.
   */
  getOverview: async (
    assessmentPeriod: string = '2026-11-01',
    calculationVersion: string = 'risk-v2.0',
    scoreType?: string
  ): Promise<RiskOverviewResponse> => {
    const response = await apiClient.get<RiskOverviewResponse>('/risk/overview', {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
        score_type: scoreType,
      },
    });
    return response.data;
  },

  /**
   * Fetch explainable methodology information and component weights.
   */
  getModelInfo: async (version: string = 'risk-v2.0'): Promise<RiskModelInfoResponse> => {
    const response = await apiClient.get<RiskModelInfoResponse>('/risk/model', {
      params: { version },
    });
    return response.data;
  },

  /**
   * List paginated district risk scores with server-side filtering.
   */
  listRiskScores: async (params?: RiskFilterParams): Promise<RiskListResponse> => {
    const response = await apiClient.get<RiskListResponse>('/risk/districts', {
      params: {
        assessment_period: params?.assessment_period || '2026-11-01',
        calculation_version: params?.calculation_version || 'risk-v2.0',
        score_type: params?.score_type,
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
    assessmentPeriod: string = '2026-11-01',
    calculationVersion: string = 'risk-v2.0',
    scoreType?: string
  ): Promise<DistrictRiskDetailResponse> => {
    const response = await apiClient.get<DistrictRiskDetailResponse>(`/risk/districts/${districtId}`, {
      params: {
        assessment_period: assessmentPeriod,
        calculation_version: calculationVersion,
        score_type: scoreType,
      },
    });
    return response.data;
  },

  /**
   * Fetch longitudinal multi-period risk trajectory.
   */
  getTrends: async (
    districtId?: number,
    stateId?: number,
    limitPeriods: number = 12
  ): Promise<RiskTrendsResponse> => {
    const response = await apiClient.get<RiskTrendsResponse>('/risk/trends', {
      params: {
        district_id: districtId,
        state_id: stateId,
        limit_periods: limitPeriods,
      },
    });
    return response.data;
  },

  /**
   * Calculate and persist risk scores across all 640 districts (Admin/Analyst).
   */
  calculate: async (
    assessmentDate: string,
    scoreType?: string,
    calculationVersion: string = 'risk-v2.0'
  ): Promise<any> => {
    const response = await apiClient.post('/risk/calculate', {
      assessment_date: assessmentDate,
      score_type: scoreType,
      calculation_version: calculationVersion,
    });
    return response.data;
  },
};
