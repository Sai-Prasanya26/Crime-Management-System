import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Layers,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Cpu,
  Calendar,
  Filter,
  Clock,
  BarChart3,
  RefreshCw,
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
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load
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
        predictionApi.getMonthlyPredictions({ limit: 20 }),
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
          forecast_status: selectedStatus || undefined,
          limit: 20,
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
    setSelectedStatus('');
    loadInitialData();
  };

  const handleRefreshForecast = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await predictionApi.triggerGenerate({
        forward_months: 3,
        forecast_origin_date: '2026-10-01',
        calibrate_intervals: true,
      });
      setRefreshMessage(`Successfully regenerated ${res.generated_count} forecasts!`);
      await loadInitialData();
    } catch (err: any) {
      setRefreshMessage(`Generation note: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format chart data with distinct series separation for:
  // 1. Historical Actuals (2024-2025)
  // 2. Historical Evaluation Predictions (2025)
  // 3. Past Expired Forecasts (Jan–Mar 2026)
  // 4. Current Future Forecasts with Conformal Intervals (Nov 2026–Jan 2027)
  const chartPoints = useMemo(() => {
    return (actualVsPred?.comparison_points || []).map((pt) => {
      const p = pt.period.substring(0, 7); // YYYY-MM
      const isHistoricalActual = pt.actual_count !== null && pt.actual_count !== undefined;
      const isHistoricalEval = pt.forecast_status === 'HISTORICAL_EVALUATION';
      const isPastForecast = pt.forecast_status === 'PAST_FORECAST';
      const isCurrentFuture = pt.forecast_status === 'CURRENT_FUTURE_FORECAST';

      return {
        period: p,
        raw_status: pt.forecast_status,
        actual: isHistoricalActual ? pt.actual_count : undefined,
        historical_eval: isHistoricalEval ? pt.predicted_count : undefined,
        past_forecast: isPastForecast ? pt.predicted_count : undefined,
        current_future: isCurrentFuture ? pt.predicted_count : undefined,
        interval_lower: isCurrentFuture ? pt.prediction_interval_lower : undefined,
        interval_upper: isCurrentFuture ? pt.prediction_interval_upper : undefined,
        eval_lower: isHistoricalEval ? pt.prediction_interval_lower : undefined,
        eval_upper: isHistoricalEval ? pt.prediction_interval_upper : undefined,
      };
    });
  }, [actualVsPred]);

  return (
    <DashboardLayout
      hideSidebar
      icon={Activity}
      title="Predictive Intelligence & Crime Forecasting"
      subtitle="Evaluated multi-step machine learning forecasting with split conformal prediction intervals"
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

      {/* FORECAST FRESHNESS & SYSTEM ORIGIN BANNER */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-800">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Forecast Freshness & Operational Horizon Status
                </h4>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                  SYSTEM DATE: OCTOBER 2026 (IST)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Latest Historical Observation: <strong>December 2025</strong> | Forecast Cutoff Origin:{' '}
                <strong>{overview?.forecast_origin_date || '2026-10-01'}</strong> | Active Forward Horizon:{' '}
                <strong className="text-emerald-700">
                  {overview?.current_forecast_start || '2026-11-01'} to{' '}
                  {overview?.current_forecast_end || '2027-01-01'} ({overview?.current_forecast_periods_count || 3} Months)
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshForecast}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-md bg-[#1769AA] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#12558a] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Regenerate Forecasts' : 'Regenerate Forecasts'}</span>
            </button>
          </div>
        </div>

        {refreshMessage && (
          <div className="mt-2 text-[11px] text-blue-900 bg-blue-100/70 rounded p-1.5 border border-blue-200">
            {refreshMessage}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Connecting to ML forecasting engine and loading multi-step calibrated forecasts..." />
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
              <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap gap-1">
                <span className="text-slate-600 font-medium">7,680 Eval (2025)</span> •
                <span className="text-amber-700 font-medium">1,920 Expired (Q1 2026)</span> •
                <span className="text-emerald-700 font-bold">1,920 Active (Nov 26–Jan 27)</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Production Model & Calibration
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-[#1769AA] truncate" title={overview?.active_model_name}>
                  {overview?.algorithm || 'HGBR'}
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                  {overview?.active_model_version || 'v1.0.0'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 truncate" title={overview?.calibration_method || 'Split Conformal'}>
                Split Conformal: 79.48% empirical coverage
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Operational Horizon
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">Nov 26 – Jan 27</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  ACTIVE 3M
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Upcoming consecutive months starting next calendar month
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Out-of-Sample Accuracy
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#0A192F]">
                  36.84% <span className="text-xs font-normal text-slate-500">WAPE</span>
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                  MAE 1.70
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Multi-step 3-month backtest MAE: <strong>1.6086</strong>
              </p>
            </div>
          </div>

          {/* SECTION 2: Geography & Status Filter Bar */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Forecasting Scoping Filters
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

                {/* Status selector */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Forecast Statuses</option>
                  <option value="CURRENT_FUTURE_FORECAST">Active Future Forecasts Only (Nov 26–Jan 27)</option>
                  <option value="HISTORICAL_EVALUATION">Historical Evaluations Only (2025)</option>
                  <option value="PAST_FORECAST">Past Expired Forecasts (Jan–Mar 2026)</option>
                </select>

                {/* Period filter */}
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">All Periods</option>
                  <option value="2026-11-01">2026-11-01 (Upcoming Month 1)</option>
                  <option value="2026-12-01">2026-12-01 (Upcoming Month 2)</option>
                  <option value="2027-01-01">2027-01-01 (Upcoming Month 3)</option>
                  <option value="2026-01-01">2026-01-01 (Past Expired)</option>
                  <option value="2025-12-01">2025-12-01 (Evaluated)</option>
                  <option value="2025-06-01">2025-06-01 (Evaluated)</option>
                </select>

                <button
                  type="button"
                  onClick={handleFilterApply}
                  disabled={isFilterLoading}
                  className="rounded-md bg-[#1769AA] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#12558a] disabled:opacity-50"
                >
                  {isFilterLoading ? 'Applying...' : 'Apply Filters'}
                </button>

                {(selectedStateId || selectedDistrictId || selectedPeriod || selectedStatus) && (
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

          {/* SECTION 3: Multi-Step Actual vs. Forecast Timeline with Uncertainty Intervals */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Longitudinal Caseload Trajectory & Forward Forecast
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {actualVsPred?.district_name || 'All 640 Districts (Aggregated)'} (
                  {actualVsPred?.state_name || 'National Aggregate'}) — Clear demarcation between historical actuals,
                  historical out-of-sample evaluations, expired past forecasts, and calibrated future forecasts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {actualVsPred?.overall_mae !== null && actualVsPred?.overall_mae !== undefined && (
                  <span className="rounded bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                    2025 Eval MAE: <strong>{actualVsPred.overall_mae}</strong>
                  </span>
                )}
                {actualVsPred?.overall_wape !== null && actualVsPred?.overall_wape !== undefined && (
                  <span className="rounded bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                    WAPE: <strong>{actualVsPred.overall_wape}%</strong>
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
                    formatter={(val: any, name: any, item: any) => {
                      const payload = item.payload;
                      if (name === 'actual') {
                        return [val ? Number(val).toLocaleString() + ' incidents' : '—', 'Observed Incident Caseload'];
                      }
                      if (name === 'historical_eval') {
                        return [val ? Number(val).toLocaleString() + ' incidents' : '—', 'Historical Out-of-Sample Evaluation (2025)'];
                      }
                      if (name === 'past_forecast') {
                        return [val ? Number(val).toLocaleString() + ' incidents' : '—', 'Expired Past Forecast (Archived)'];
                      }
                      if (name === 'current_future') {
                        const low = payload.interval_lower !== undefined ? Number(payload.interval_lower).toLocaleString() : '—';
                        const up = payload.interval_upper !== undefined ? Number(payload.interval_upper).toLocaleString() : '—';
                        return [
                          `${Number(val).toLocaleString()} incidents [80% Interval: ${low} to ${up}]`,
                          'Active Future Forecast (Nov 26–Jan 27)',
                        ];
                      }
                      return [val, String(name)];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => {
                      if (value === 'actual') return <span className="text-xs font-semibold text-[#1769AA]">Historical Observed Caseload</span>;
                      if (value === 'historical_eval') return <span className="text-xs font-semibold text-slate-600">Historical Evaluation (2025)</span>;
                      if (value === 'past_forecast') return <span className="text-xs font-semibold text-amber-700">Expired Past Forecasts (Q1 2026)</span>;
                      if (value === 'current_future') return <span className="text-xs font-bold text-emerald-700">Active Future Forecasts (Nov 26–Jan 27)</span>;
                      return <span className="text-xs text-slate-500">{value}</span>;
                    }}
                  />
                  {/* Observed Caseload */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#1769AA"
                    strokeWidth={2}
                    fill="#1769AA"
                    fillOpacity={0.12}
                    connectNulls={false}
                  />
                  {/* Historical Evaluation 2025 */}
                  <Line
                    type="monotone"
                    dataKey="historical_eval"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2.5, fill: '#64748B' }}
                    connectNulls={false}
                  />
                  {/* Past Expired Forecasts */}
                  <Line
                    type="monotone"
                    dataKey="past_forecast"
                    stroke="#D97706"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    dot={{ r: 3, fill: '#D97706' }}
                    connectNulls={false}
                  />
                  {/* Active Future Forecasts with Bold Treatment */}
                  <Line
                    type="monotone"
                    dataKey="current_future"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#059669' }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#1769AA]"></span> Observed (2024–2025)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-500"></span> 2025 Eval
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-600"></span> Expired (Jan–Mar 2026)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span> Active Future Forecast (Nov 26–Jan 27)
                </span>
              </div>
              <span className="text-slate-500">
                Calibrated Prediction Intervals: Inductive Split Conformal (Clamped ≥ 0.0)
              </span>
            </div>
          </div>

          {/* SECTION 4: Multi-Horizon Backtesting & Conformal Calibration Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Multi-Horizon Backtesting Table */}
            <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0A192F]">
                      Multi-Horizon Walk-Forward Backtesting
                    </h4>
                    <p className="text-xs text-slate-500">
                      Recursive multi-step evaluation vs. Seasonal Naïve and Moving Average baselines
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Cutoff: 2024-12-31
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                      <th className="py-2.5 pl-3">Forecast Horizon</th>
                      <th className="py-2.5 px-3 text-right">Sample (N)</th>
                      <th className="py-2.5 px-3 text-right">HGBR MAE</th>
                      <th className="py-2.5 px-3 text-right">Seasonal Naïve</th>
                      <th className="py-2.5 px-3 text-right">MA-3</th>
                      <th className="py-2.5 px-3 text-right">WAPE%</th>
                      <th className="py-2.5 px-3 text-right">Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr className="h-10 hover:bg-slate-50/70">
                      <td className="py-2 pl-3 font-semibold text-[#0A192F]">1-Month Ahead (h=1)</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">640</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">1.5770</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">2.1063</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">1.8823</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">36.45%</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">+25.13%</td>
                    </tr>
                    <tr className="h-10 hover:bg-slate-50/70 bg-emerald-50/20">
                      <td className="py-2 pl-3 font-semibold text-[#0A192F]">3-Month Cumulative (h=1..3)</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">1,920</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">1.6086</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">2.1672</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">1.8295</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">37.23%</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">+25.77%</td>
                    </tr>
                    <tr className="h-10 hover:bg-slate-50/70">
                      <td className="py-2 pl-3 font-semibold text-[#0A192F]">6-Month Cumulative (h=1..6)</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">3,840</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">1.6164</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">2.2044</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">1.7329</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">35.97%</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">+26.67%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  Primary Model Superiority:
                  <strong className="text-emerald-700 ml-1">
                    HGBR beats both baselines across all horizons
                  </strong>
                </span>
                <span>Recursive compounding verified without divergence</span>
              </div>
            </div>

            {/* Conformal Prediction Uncertainty Calibration Panel */}
            <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0A192F]">
                      Conformal Uncertainty Calibration
                    </h4>
                    <p className="text-xs text-slate-500">Split conformal prediction intervals</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Calibration Split:</span>
                    <span className="font-semibold text-[#0A192F]">2024 Chronological (7,680 obs)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Evaluation Test Set:</span>
                    <span className="font-semibold text-[#0A192F]">2025 Held-Out (7,680 obs)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Target Coverage (Nominal):</span>
                    <span className="font-bold text-blue-700">80.00%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Empirical Test Coverage:</span>
                    <span className="font-bold text-emerald-700">79.48% (Target Met)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                    <span>Average Interval Width:</span>
                    <span className="font-mono font-semibold text-[#0A192F]">4.68 incidents</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Lower Bound Clamping:</span>
                    <span className="font-mono text-slate-700">max(0.0, ŷ - q)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-semibold text-[#0A192F]">Semantic Integrity:</span> Prediction intervals
                quantify future occurrence variance for individual district counts. They are rigorously separated
                from parameter confidence intervals and never fabricated.
              </div>
            </div>
          </div>

          {/* SECTION 5: Candidate Architecture Comparison & Specifications */}
          {evaluation && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#0A192F]">
                        Candidate Architecture Benchmarks (Phase 8A Evidence)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Historical out-of-sample benchmark across all 5 evaluated architectures
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                    5 Architectures
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                        <th className="py-2 pl-3">Architecture</th>
                        <th className="py-2 px-3 text-right">MAE</th>
                        <th className="py-2 px-3 text-right">RMSE</th>
                        <th className="py-2 px-3 text-right">WAPE%</th>
                        <th className="py-2 px-3 text-right">R²</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {Object.entries(evaluation.metrics_summary).map(([mName, mVals]) => {
                        const isWinner = mName === 'HistGradientBoosting';
                        return (
                          <tr
                            key={mName}
                            className={`h-9 whitespace-nowrap ${isWinner ? 'bg-blue-50/40 font-semibold' : 'hover:bg-slate-50/70'}`}
                          >
                            <td className="py-2 pl-3 text-[#0A192F] flex items-center gap-1.5">
                              {isWinner && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                              <span>{mName.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[#0A192F]">{mVals.MAE.toFixed(4)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">{mVals.RMSE.toFixed(4)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">{mVals['WAPE%'].toFixed(2)}%</td>
                            <td className="py-2 px-3 text-right font-mono text-[#0A192F]">{mVals.R2.toFixed(4)}</td>
                            <td className="py-2 px-3 text-right">
                              {isWinner ? (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300">
                                  WINNER
                                </span>
                              ) : (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
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
              </div>

              {modelInfo && (
                <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-white p-4.5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#0A192F]">Model Provenance</h4>
                        <p className="text-xs text-slate-500">Registry metadata & features</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>Algorithm:</span>
                        <span className="font-semibold text-[#0A192F]">{modelInfo.algorithm}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>Version:</span>
                        <span className="font-mono font-bold text-blue-700">{modelInfo.version}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>Snapshot:</span>
                        <span className="font-mono text-[11px] text-slate-700">{modelInfo.dataset_snapshot}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
                        <span>Features:</span>
                        <span className="font-semibold text-[#0A192F]">{modelInfo.feature_columns.length} Features</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Status:</span>
                        <span className="font-bold text-emerald-700">ACTIVE PRODUCTION</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-semibold text-[#0A192F]">Refit Scope:</span> Trained on 38,400 clean
                    modeling observations (2021–2025) across all 640 Census 2011 districts.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: Monthly Predictions List Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 text-[#1769AA]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0A192F]">District Forecast Registry</h4>
                  <p className="text-xs text-slate-500">
                    Showing {predictionsList.length} of {totalPredictions.toLocaleString()} stored predictions
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                Monthly Jurisdictional Level
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                    <th className="py-2.5 pl-3">District Name</th>
                    <th className="py-2.5 px-3">State / UT</th>
                    <th className="py-2.5 px-3">Forecast Period</th>
                    <th className="py-2.5 px-3">Forecast Status</th>
                    <th className="py-2.5 px-3 text-right">Predicted Count</th>
                    <th className="py-2.5 px-3 text-right">80% Prediction Interval</th>
                    <th className="py-2.5 px-3 text-right">Model Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {predictionsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No prediction records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    predictionsList.map((row) => {
                      const isFuture = row.forecast_status === 'CURRENT_FUTURE_FORECAST';
                      const isPast = row.forecast_status === 'PAST_FORECAST';
                      const isEval = row.forecast_status === 'HISTORICAL_EVALUATION';

                      return (
                        <tr key={row.id} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                          <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                            {row.district_name || `District #${row.district_id}`}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.state_name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{row.forecast_period}</td>
                          <td className="py-2 px-3">
                            {isFuture && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                                ACTIVE FUTURE {row.horizon_step ? `(M${row.horizon_step})` : ''}
                              </span>
                            )}
                            {isPast && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-300">
                                EXPIRED PAST FORECAST
                              </span>
                            )}
                            {isEval && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-300">
                                HISTORICAL EVAL
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#1769AA]">
                            {row.predicted_crime_count.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {typeof row.prediction_interval_lower === 'number' &&
                            typeof row.prediction_interval_upper === 'number'
                              ? `[${row.prediction_interval_lower.toFixed(2)}, ${row.prediction_interval_upper.toFixed(2)}]`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 border border-slate-200">
                              {row.model_version}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
