/**
 * Phase 9C: Risk Assessment TypeScript Definitions.
 * Aligned with backend schemas in backend/app/schemas/risk.py.
 */

export interface FactorDetailItem {
  raw: number;
  percentile: number;
  weight: number;
  weighted: number;
}

export interface FactorContributions {
  forecast_volume: FactorDetailItem;
  historical_volume: FactorDetailItem;
  crime_rate_per_100k: FactorDetailItem;
  trend_ratio: FactorDetailItem;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskItem {
  id: number;
  district_id: number;
  district_name?: string;
  state_id?: number;
  state_name?: string;
  period_year: number;
  period_month: number;
  assessment_period: string;
  overall_risk_score: number;
  risk_level: RiskLevel;
  severity_index: number;
  trend_index: number;
  volume_index: number;
  forecast_index?: number | null;
  rate_index?: number | null;
  population_density_factor: number;
  calculation_version: string;
  model_version?: string | null;
  strongest_driver?: string | null;
  factor_contributions?: FactorContributions | null;
  generated_at?: string | null;
}

export interface RiskOverviewResponse {
  total_assessed_districts: number;
  mean_risk_score: number;
  median_risk_score: number;
  highest_risk_score: number;
  lowest_risk_score: number;
  risk_level_distribution: {
    LOW: number;
    MODERATE: number;
    HIGH: number;
    CRITICAL: number;
  };
  risk_level_percentages: {
    LOW: number;
    MODERATE: number;
    HIGH: number;
    CRITICAL: number;
  };
  top_risk_districts: RiskItem[];
  assessment_period: string;
  methodology_version: string;
  active_forecast_model: string;
  active_forecast_version: string;
}

export interface RiskModelInfoResponse {
  methodology_version: string;
  formula: string;
  factors: Array<{
    name: string;
    weight: number;
    description: string;
    source: string;
  }>;
  normalization: string;
  risk_bands: Record<string, string>;
  active_model_name: string;
  active_model_version: string;
}

export interface DistrictRiskDetailResponse {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  census_2011_population: number;
  period_year: number;
  period_month: number;
  assessment_period: string;
  overall_risk_score: number;
  risk_level: RiskLevel;
  severity_index: number;
  historical_volume: number;
  forecast_volume: number;
  crime_rate_per_100k: number;
  trend_ratio: number;
  factor_percentiles: {
    forecast_volume: number;
    historical_volume: number;
    crime_rate_per_100k: number;
    trend_ratio: number;
  };
  factor_contributions: FactorContributions;
  strongest_driver: string;
  calculation_version: string;
  model_version?: string | null;
  model_name?: string | null;
  generated_at?: string | null;
}

export interface RiskListResponse {
  total: number;
  items: RiskItem[];
}

export interface RiskFilterParams {
  state_id?: number;
  district_id?: number;
  risk_level?: string;
  assessment_period?: string;
  calculation_version?: string;
  skip?: number;
  limit?: number;
}
