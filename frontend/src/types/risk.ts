/**
 * Phase 9: Explainable Risk Assessment TypeScript Definitions.
 * Aligned with backend schemas in backend/app/schemas/risk.py.
 */

export interface FactorDetailItem {
  raw: number;
  percentile: number;
  weight: number;
  weighted: number;
}

export interface FactorContributions {
  forecast_volume?: FactorDetailItem;
  historical_volume?: FactorDetailItem;
  severity_profile?: FactorDetailItem;
  crime_rate_per_100k?: FactorDetailItem;
  trend_ratio?: FactorDetailItem;
  [key: string]: FactorDetailItem | undefined;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RiskScoreType = 'HISTORICAL' | 'FORECAST';

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
  score_type?: RiskScoreType;
  severity_index: number;
  trend_index: number;
  volume_index: number;
  forecast_index?: number | null;
  rate_index?: number | null;
  population_density_factor: number;
  calculation_version: string;
  model_version?: string | null;
  forecast_origin_date?: string | null;
  strongest_driver?: string | null;
  factor_contributions?: FactorContributions | null;
  explanation_summary?: string | null;
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
  score_type?: RiskScoreType;
  methodology_version: string;
  active_forecast_model: string;
  active_forecast_version: string;
  forecast_origin_date?: string | null;
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
  score_type?: RiskScoreType;
  severity_index: number;
  historical_volume: number;
  forecast_volume: number;
  crime_rate_per_100k: number;
  trend_ratio: number;
  severity_ratio?: number | null;
  factor_percentiles: {
    forecast_volume?: number;
    historical_volume?: number;
    severity_index?: number;
    crime_rate_per_100k?: number;
    trend_ratio?: number;
    [key: string]: number | undefined;
  };
  factor_contributions: FactorContributions;
  strongest_driver: string;
  explanation_summary?: string | null;
  calculation_version: string;
  model_version?: string | null;
  model_name?: string | null;
  forecast_origin_date?: string | null;
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
  score_type?: string;
  assessment_period?: string;
  calculation_version?: string;
  skip?: number;
  limit?: number;
}

export interface RiskTrendPoint {
  period: string;
  period_year: number;
  period_month: number;
  score_type: RiskScoreType;
  mean_risk_score: number;
  critical_districts_count: number;
  high_risk_districts_count: number;
  calculation_version: string;
}

export interface RiskTrendsResponse {
  district_id?: number | null;
  district_name?: string | null;
  trends: RiskTrendPoint[];
}
