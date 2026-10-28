import apiClient from './client';

export interface PredictionItem {
  id: number;
  district_id: number;
  district_name?: string;
  state_id?: number;
  state_name?: string;
  forecast_period: string;
  predicted_crime_count: number;
  prediction_interval_lower?: number | null;
  prediction_interval_upper?: number | null;
  confidence_lower?: number | null;
  confidence_upper?: number | null;
  forecast_status: string;
  forecast_origin_date?: string | null;
  horizon_step?: number | null;
  is_latest: boolean;
  model_version: string;
  model_name: string;
}

export interface PredictionOverview {
  total_predictions: number;
  districts_covered: number;
  earliest_period: string;
  latest_period: string;
  periods_count: number;
  historical_periods_count?: number;
  past_forecast_periods_count?: number;
  current_forecast_periods_count?: number;
  current_forecast_start?: string | null;
  current_forecast_end?: string | null;
  forecast_origin_date?: string | null;
  calibration_method?: string | null;
  status_breakdown?: Record<string, number>;
  active_model_name: string;
  active_model_version: string;
  algorithm: string;
  top_predicted_districts: PredictionItem[];
}

export interface ModelInfo {
  model_id: number;
  model_name: string;
  model_type: string;
  version: string;
  algorithm: string;
  is_active: boolean;
  training_date?: string;
  dataset_snapshot: string;
  artifact_path: string;
  evaluation_metrics: Record<string, any>;
  feature_columns: string[];
}

export interface ModelListItem {
  id: number;
  model_name: string;
  model_type: string;
  version: string;
  algorithm: string;
  is_active: boolean;
  training_date?: string;
  dataset_snapshot?: string;
  evaluation_metrics?: Record<string, any>;
}

export interface EvaluationComparison {
  evaluation_split: string;
  test_period: string;
  training_period: string;
  models_compared: string[];
  metrics_summary: Record<string, { MAE: number; RMSE: number; 'WAPE%': number; R2: number }>;
  relative_improvements: {
    primary_model: string;
    baseline_model: string;
    mae_reduction_percent: number;
    wape_reduction_points: number;
  };
  walk_forward_cv?: any[];
  backtest_horizons?: Record<string, any>;
  conformal_calibration?: Record<string, any>;
  disclaimer: string;
}

export interface ActualVsPredictedPoint {
  period: string;
  actual_count?: number | null;
  predicted_count?: number | null;
  prediction_interval_lower?: number | null;
  prediction_interval_upper?: number | null;
  confidence_lower?: number | null;
  confidence_upper?: number | null;
  forecast_status?: string | null;
  error?: number | null;
}

export interface ActualVsPredictedData {
  district_id?: number;
  district_name: string;
  state_name: string;
  comparison_points: ActualVsPredictedPoint[];
  overall_mae?: number;
  overall_rmse?: number;
  overall_wape?: number;
}

export interface DistrictMonthPrediction {
  district_id: number;
  district_name: string;
  state_id: number;
  state_name: string;
  parent_district_id?: number | null;
  parent_district_name?: string | null;
  is_derived_from_parent?: boolean;
  year: number;
  month: number;
  period: string;
  is_available: boolean;
  data_type: 'FORECAST' | 'HISTORICAL_ACTUAL' | 'UNAVAILABLE';
  is_forecast: boolean;
  is_historical: boolean;
  display_value?: number | null;
  predicted_count?: number | null;
  actual_count?: number | null;
  prediction_interval_lower?: number | null;
  prediction_interval_upper?: number | null;
  has_baseline: boolean;
  baseline_year?: number | null;
  baseline_month?: number | null;
  baseline_period?: string | null;
  baseline_count?: number | null;
  baseline_type?: string | null;
  numerical_change?: number | null;
  percentage_change?: number | null;
  crime_level: string; // 'Higher' | 'Moderate' | 'Lower' | 'Insufficient Baseline' | 'Unavailable'
  comparison_rule: string;
  explanation: string;
  disclaimer: string;
  message?: string | null;
}

export interface PredictionFilters {
  state_id?: number;
  district_id?: number;
  forecast_period?: string;
  forecast_status?: string;
  is_latest?: boolean;
  model_version?: string;
  skip?: number;
  limit?: number;
}

export const predictionApi = {
  getOverview: async (): Promise<PredictionOverview> => {
    const res = await apiClient.get<PredictionOverview>('/predictions/overview');
    return res.data;
  },

  getModelInfo: async (): Promise<ModelInfo> => {
    const res = await apiClient.get<ModelInfo>('/predictions/model');
    return res.data;
  },

  getModels: async (): Promise<{ total: number; items: ModelListItem[] }> => {
    const res = await apiClient.get<{ total: number; items: ModelListItem[] }>('/predictions/models');
    return res.data;
  },

  getEvaluation: async (): Promise<EvaluationComparison> => {
    const res = await apiClient.get<EvaluationComparison>('/predictions/evaluation');
    return res.data;
  },

  getActualVsPredicted: async (districtId?: number): Promise<ActualVsPredictedData> => {
    const params = districtId ? { district_id: districtId } : {};
    const res = await apiClient.get<ActualVsPredictedData>('/predictions/actual-vs-predicted', { params });
    return res.data;
  },

  getMonthlyPredictions: async (
    filters: PredictionFilters = {}
  ): Promise<{ total: number; items: PredictionItem[] }> => {
    const res = await apiClient.get<{ total: number; items: PredictionItem[] }>('/predictions/monthly', {
      params: filters,
    });
    return res.data;
  },

  getDistrictSeries: async (districtId: number): Promise<{
    district_id: number;
    district_name: string;
    state_id: number;
    state_name: string;
    series: PredictionItem[];
  }> => {
    const res = await apiClient.get(`/predictions/${districtId}`);
    return res.data;
  },

  getDistrictMonthPrediction: async (
    districtId: number,
    year: number,
    month: number
  ): Promise<DistrictMonthPrediction> => {
    const res = await apiClient.get<DistrictMonthPrediction>('/predictions/district-month', {
      params: { district_id: districtId, year, month },
    });
    return res.data;
  },

  triggerTrain: async (refitProduction: boolean = true) => {
    const res = await apiClient.post('/predictions/train', { refit_production: refitProduction });
    return res.data;
  },

  triggerGenerate: async (params?: {
    forward_months?: number;
    forecast_origin_date?: string;
    calibrate_intervals?: boolean;
    include_2025?: boolean;
  }) => {
    const payload = params || { forward_months: 3, forecast_origin_date: '2026-10-01', calibrate_intervals: true };
    const res = await apiClient.post('/predictions/generate', payload);
    return res.data;
  },
};

export default predictionApi;
