import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  Layers,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Cpu,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { predictionApi, geographyApi } from '../api';
import type {
  PredictionOverview,
  ModelInfo,
  EvaluationComparison,
  ActualVsPredictedData,
  PredictionItem,
} from '../api/predictionApi';
import type { StateItem, DistrictItem } from '../types';

export const PredictionsPage: React.FC = () => {
  const [overview, setOverview] = useState<PredictionOverview | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationComparison | null>(null);
  const [actualVsPred, setActualVsPred] = useState<ActualVsPredictedData | null>(null);
  const [predictionsList, setPredictionsList] = useState<PredictionItem[]>([]);
  const [totalPredictions, setTotalPredictions] = useState<number>(0);

  // Filter states
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: overview, model provenance, evaluation, geography, and baseline chart
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, mInfo, evalData, avpData, statesRes, predsRes] = await Promise.all([
        predictionApi.getOverview(),
        predictionApi.getModelInfo(),
        predictionApi.getEvaluation(),
        predictionApi.getActualVsPredicted(),
        geographyApi.getStates(),
        predictionApi.getMonthlyPredictions({ limit: 15 }),
      ]);

      setOverview(ovData);
      setModelInfo(mInfo);
      setEvaluation(evalData);
      setActualVsPred(avpData);
      setStates(statesRes.items || []);
      setPredictionsList(predsRes.items || []);
      setTotalPredictions(predsRes.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crime forecasting pipeline data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load districts when selectedStateId changes
  useEffect(() => {
    if (selectedStateId) {
      geographyApi
        .getDistricts(selectedStateId, 'historical')
        .then((res) => {
          setDistricts(res.items || []);
        })
        .catch(() => {
          setDistricts([]);
        });
    } else {
      setDistricts([]);
      setSelectedDistrictId(undefined);
    }
  }, [selectedStateId]);

  // Refetch actual vs predicted chart & prediction list when filters change
  const handleFilterApply = async () => {
    setIsFilterLoading(true);
    try {
      const [avpRes, listRes] = await Promise.all([
        predictionApi.getActualVsPredicted(selectedDistrictId),
        predictionApi.getMonthlyPredictions({
          state_id: selectedStateId,
          district_id: selectedDistrictId,
          forecast_period: selectedPeriod || undefined,
          limit: 15,
        }),
      ]);
      setActualVsPred(avpRes);
      setPredictionsList(listRes.items || []);
      setTotalPredictions(listRes.total || 0);
    } catch (err: any) {
      console.error('Filter apply error:', err);
    } finally {
      setIsFilterLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedPeriod('');
    loadInitialData();
  };

  // Format chart data from actualVsPred comparison points
  const chartPoints = (actualVsPred?.comparison_points || []).map((pt) => ({
    period: pt.period.substring(0, 7), // YYYY-MM
    actual: pt.actual_count !== null ? pt.actual_count : undefined,
    forecast: pt.predicted_count !== null ? pt.predicted_count : undefined,
  }));

  return (
    <DashboardLayout
      hideSidebar
      icon={Activity}
      title="Predictive Intelligence"
      subtitle="Evaluated machine learning crime volume forecasts and operational trajectory projection"
    >
      {/* MANDATORY DISCLAIMER NOTICE */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Notice:</span> Predictions are statistical estimates based on
            historical records. They are not confirmed future incidents and should not be used as the sole basis
            for operational or policing decisions.
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Connecting to ML forecasting engine and loading out-of-sample evaluated models..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Forecasting Pipeline Error"
          message={error}
          onRetry={loadInitialData}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {/* SECTION 1: High-Level Pipeline Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Stored Forecasts
              </span>
              <p className="mt-1 text-2xl font-bold text-[#0A192F]">
                {(overview?.total_predictions || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview?.districts_covered || 640} Census districts across {overview?.periods_count || 15} periods
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Active Production Model
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-[#1769AA] truncate" title={overview?.active_model_name}>
                  {overview?.algorithm || 'HGBR'}
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                  {overview?.active_model_version || 'v1.0.0'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Histogram Gradient Boosting Regressor
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Prediction Horizon
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#0A192F]">1–3 Months</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  FORWARD Q1
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Operational horizon through 2026-03-01
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Out-of-Sample Accuracy
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  36.84% <span className="text-xs font-normal text-slate-500">WAPE</span>
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  MAE 1.70
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tested on 7,680 untouched 2025 observations
              </p>
            </div>
          </div>

          {/* SECTION 2: Geography & Period Filter Bar */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Forecast Scoping Filters
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* State selector */}
                <select
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedStateId(val);
                    setSelectedDistrictId(undefined);
                  }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All States / UTs (National)</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>

                {/* District selector */}
                <select
                  value={selectedDistrictId || ''}
                  onChange={(e) => setSelectedDistrictId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!selectedStateId || districts.length === 0}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-50 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Districts in State</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>

                {/* Period filter */}
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Available Periods</option>
                  <option value="2026-01-01">2026-01-01 (Forward M1)</option>
                  <option value="2026-02-01">2026-02-01 (Forward M2)</option>
                  <option value="2026-03-01">2026-03-01 (Forward M3)</option>
                  <option value="2025-12-01">2025-12-01 (Evaluated)</option>
                  <option value="2025-06-01">2025-06-01 (Evaluated)</option>
                  <option value="2025-01-01">2025-01-01 (Evaluated)</option>
                </select>

                <button
                  type="button"
                  onClick={handleFilterApply}
                  disabled={isFilterLoading}
                  className="rounded-md bg-[#1769AA] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#12558a] disabled:opacity-50"
                >
                  {isFilterLoading ? 'Applying...' : 'Apply Filters'}
                </button>

                {(selectedStateId || selectedDistrictId || selectedPeriod) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Actual vs. Predicted Caseload Timeline Chart */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Actual vs. ML Predicted Caseload Trajectory
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {actualVsPred?.district_name || 'National Aggregate'} (
                  {actualVsPred?.state_name || 'All Districts'}) — Longitudinal timeline comparing observed incidents against model predictions
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {actualVsPred?.overall_mae !== null && (
                  <span className="rounded bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                    MAE: <strong>{actualVsPred?.overall_mae}</strong>
                  </span>
                )}
                {actualVsPred?.overall_wape !== null && (
                  <span className="rounded bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                    WAPE: <strong>{actualVsPred?.overall_wape}%</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="period" stroke="#CBD5E1" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis
                    stroke="#CBD5E1"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '0.5rem',
                      color: '#0A192F',
                      fontSize: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any, name: any) => [
                      val ? Number(val).toLocaleString() + ' incidents' : '—',
                      name === 'actual'
                        ? 'Actual Observed Caseload'
                        : name === 'forecast'
                        ? 'ML Forecast — Estimated Crime Count'
                        : String(name || ''),
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-700">
                        {value === 'actual'
                          ? 'Historical Observed Caseload'
                          : 'ML Forecast — Estimated Crime Count'}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#1769AA"
                    strokeWidth={2}
                    fill="#1769AA"
                    fillOpacity={0.12}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#D97706' }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              <span>Historical observed data: 2024–2025</span>
              <span className="font-semibold text-amber-700">
                Labeled: ML Forecast — Estimated Crime Count (2025 test evaluation & 2026 forward horizon)
              </span>
            </div>
          </div>

          {/* SECTION 4: Multi-Model Evaluation & Empirical Benchmark Table */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0A192F]">
                      Candidate Model Benchmark & Evaluation Comparison
                    </h4>
                    <p className="text-xs text-slate-500">
                      Chronological out-of-sample evaluation on untouched 2025 test set (7,680 observations)
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Evaluated 2025
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                      <th className="py-2.5 pl-3">Model Architecture</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3 text-right">MAE</th>
                      <th className="py-2.5 px-3 text-right">RMSE</th>
                      <th className="py-2.5 px-3 text-right">WAPE%</th>
                      <th className="py-2.5 px-3 text-right">R²</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {evaluation &&
                      Object.entries(evaluation.metrics_summary).map(([mName, mVals]) => {
                        const isWinner = mName === 'HistGradientBoosting';
                        return (
                          <tr
                            key={mName}
                            className={`h-11 whitespace-nowrap ${
                              isWinner ? 'bg-blue-50/40 font-semibold' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 pl-3 text-[#0A192F] flex items-center gap-1.5">
                              {isWinner && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                              <span>{mName.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {mName.includes('Naive')
                                ? 'Seasonal Baseline'
                                : mName.includes('Average')
                                ? 'Heuristic Moving Avg'
                                : mName.includes('Poisson')
                                ? 'Count Regressor'
                                : mName.includes('Forest')
                                ? 'Tree Bagging Ensemble'
                                : 'Gradient Boosting (Winner)'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#0A192F]">
                              {mVals.MAE.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {mVals.RMSE.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {mVals['WAPE%'].toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#0A192F]">
                              {mVals.R2.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isWinner ? (
                                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300">
                                  ACTIVE WINNER
                                </span>
                              ) : (
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                  BENCHMARK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  Relative improvement vs. Seasonal Naïve baseline:
                  <strong className="text-emerald-700 ml-1">
                    +{evaluation?.relative_improvements?.mae_reduction_percent || 25.03}% MAE reduction
                  </strong>
                </span>
                <span>Zero target leakage: rolling features shifted by 1</span>
              </div>
            </div>

            {/* SECTION 5: Model Specifications & Training Provenance Panel */}
            <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0A192F]">Model Specifications</h4>
                    <p className="text-xs text-slate-500">Architecture & provenance metadata</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Algorithm:</span>
                    <span className="font-semibold text-[#0A192F]">HistGradientBoostingRegressor</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Model Version:</span>
                    <span className="font-mono font-bold text-blue-700">{modelInfo?.version || 'v1.0.0'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Evaluation Period:</span>
                    <span className="font-semibold text-[#0A192F]">2021–2023 Train / 2025 Test</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Production Refit:</span>
                    <span className="font-semibold text-[#0A192F]">2021–2025 (38,400 rows)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Total Features:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {modelInfo?.feature_columns?.length || 25} Engineered Features
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Target Variable:</span>
                    <span className="font-mono font-semibold text-[#0A192F]">target_incident_count</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-semibold text-[#0A192F]">Non-Negative Clamping:</span> Predictions are
                strictly clamped to zero or positive numbers (\(\ge 0.0\)). Confidence intervals are maintained as
                null to avoid synthetic margins.
              </div>
            </div>
          </div>

          {/* SECTION 6: Monthly Predictions List Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0A192F]">District Monthly Forecast Records</h4>
                  <p className="text-xs text-slate-500">
                    Showing {predictionsList.length} of {totalPredictions.toLocaleString()} stored predictions
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                Monthly Grain
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                    <th className="py-2.5 pl-3">District Name</th>
                    <th className="py-2.5 px-3">State / UT</th>
                    <th className="py-2.5 px-3">Forecast Period</th>
                    <th className="py-2.5 px-3 text-right">ML Forecast — Estimated Crime Count</th>
                    <th className="py-2.5 px-3 text-right">Model Name</th>
                    <th className="py-2.5 px-3 text-right">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {predictionsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        No prediction records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    predictionsList.map((row) => (
                      <tr key={row.id} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                        <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                          {row.district_name || `District #${row.district_id}`}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{row.state_name || '—'}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.forecast_period}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#1769AA]">
                          {row.predicted_crime_count.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 text-[11px]">{row.model_name}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 border border-slate-200">
                            {row.model_version}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
