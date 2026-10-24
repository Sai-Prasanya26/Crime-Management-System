import apiClient from './client';

export interface PredictionItem {
  id: number;
  district_id: number;
  district_name?: string;
  state_id?: number;
  state_name?: string;
  forecast_period: string;
  predicted_crime_count: number;
  model_version: string;
  model_name: string;
}

export interface PredictionOverview {
  total_predictions: number;
  districts_covered: number;
  earliest_period: string;
  latest_period: string;
  periods_count: number;
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
  disclaimer: string;
}

export interface ActualVsPredictedPoint {
  period: string;
  actual_count?: number | null;
  predicted_count?: number | null;
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

export interface PredictionFilters {
  state_id?: number;
  district_id?: number;
  forecast_period?: string;
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

  triggerTrain: async (refitProduction: boolean = true) => {
    const res = await apiClient.post('/predictions/train', { refit_production: refitProduction });
    return res.data;
  },

  triggerGenerate: async (forwardMonths: number = 3) => {
    const res = await apiClient.post('/predictions/generate', { forward_months: forwardMonths });
    return res.data;
  },
};

export default predictionApi;
