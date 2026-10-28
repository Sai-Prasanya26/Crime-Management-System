import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  AlertCircle,
  MapPin,
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
import { StatCard } from '../components/common/StatCard';
import { predictionApi, geographyApi } from '../api';
import type {
  PredictionOverview,
  EvaluationComparison,
  ActualVsPredictedData,
  PredictionItem,
  DistrictMonthPrediction,
} from '../api/predictionApi';
import type { StateItem, DistrictItem } from '../types';

export const PredictionsPage: React.FC = () => {
  const [overview, setOverview] = useState<PredictionOverview | null>(null);
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

  // Interactive District & Month Predictor states
  const [predictorStateId, setPredictorStateId] = useState<number | undefined>(undefined);
  const [predictorDistrictId, setPredictorDistrictId] = useState<number | undefined>(undefined);
  const [predictorYear, setPredictorYear] = useState<number>(2026);
  const [predictorMonth, setPredictorMonth] = useState<number>(11);
  const [predictorDistricts, setPredictorDistricts] = useState<DistrictItem[]>([]);
  const [isPredictorLoading, setIsPredictorLoading] = useState<boolean>(false);
  const [predictorError, setPredictorError] = useState<string | null>(null);
  const [monthPrediction, setMonthPrediction] = useState<DistrictMonthPrediction | null>(null);

  // Pagination state for District Prediction Results
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, evalData, avpData, statesRes, predsRes] = await Promise.all([
        predictionApi.getOverview(),
        predictionApi.getEvaluation(),
        predictionApi.getActualVsPredicted(),
        geographyApi.getStates(),
        predictionApi.getMonthlyPredictions({ skip: 0, limit: pageSize }),
      ]);

      setOverview(ovData);
      setEvaluation(evalData);
      setActualVsPred(avpData);
      setStates(statesRes.items || []);
      setPredictionsList(predsRes.items || []);
      setTotalPredictions(predsRes.total || 0);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crime forecasting pipeline data.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load districts using 'current' geography (all 36 States/UTs) when selectedStateId changes
  useEffect(() => {
    if (selectedStateId) {
      geographyApi
        .getDistricts(selectedStateId, 'current')
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

  // Default predictor state to first state when states load
  useEffect(() => {
    if (states.length > 0 && !predictorStateId) {
      setPredictorStateId(states[0].id);
    }
  }, [states, predictorStateId]);

  // Load districts dynamically for the interactive predictor
  useEffect(() => {
    if (predictorStateId) {
      geographyApi
        .getDistricts(predictorStateId, 'current')
        .then((res) => {
          const items = res.items || [];
          setPredictorDistricts(items);
          if (items.length > 0 && (!predictorDistrictId || !items.some((d) => d.id === predictorDistrictId))) {
            setPredictorDistrictId(items[0].id);
          }
        })
        .catch(() => {
          setPredictorDistricts([]);
          setPredictorDistrictId(undefined);
        });
    } else {
      setPredictorDistricts([]);
      setPredictorDistrictId(undefined);
    }
  }, [predictorStateId]);

  const handlePredictCrime = async () => {
    if (!predictorDistrictId) {
      setPredictorError('Please select a district to predict crime.');
      return;
    }
    setIsPredictorLoading(true);
    setPredictorError(null);
    try {
      const data = await predictionApi.getDistrictMonthPrediction(
        predictorDistrictId,
        predictorYear,
        predictorMonth
      );
      setMonthPrediction(data);
    } catch (err: any) {
      setPredictorError(
        err?.response?.data?.detail || err?.message || 'Failed to retrieve month prediction.'
      );
      setMonthPrediction(null);
    } finally {
      setIsPredictorLoading(false);
    }
  };

  // Fetch prediction list and chart data for filters or page changes
  const fetchFilteredData = useCallback(
    async (page: number, stateId?: number, districtId?: number, period?: string) => {
      setIsFilterLoading(true);
      try {
        const apiPeriod = period ? (period.length === 7 ? `${period}-01` : period) : undefined;
        const [avpRes, listRes] = await Promise.all([
          predictionApi.getActualVsPredicted(districtId),
          predictionApi.getMonthlyPredictions({
            state_id: stateId,
            district_id: districtId,
            forecast_period: apiPeriod,
            skip: (page - 1) * pageSize,
            limit: pageSize,
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
    },
    [pageSize]
  );

  const handleFilterApply = () => {
    setCurrentPage(1);
    fetchFilteredData(1, selectedStateId, selectedDistrictId, selectedPeriod);
  };

  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedPeriod('');
    setCurrentPage(1);
    loadInitialData();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchFilteredData(newPage, selectedStateId, selectedDistrictId, selectedPeriod);
  };

  const handleRefreshForecast = async () => {
    setIsRefreshing(true);
    setShowConfirmRegenerate(false);
    setRefreshMessage(null);
    try {
      const res = await predictionApi.triggerGenerate({
        forward_months: 3,
        forecast_origin_date: '2026-10-01',
        calibrate_intervals: true,
      });
      setRefreshMessage(`Successfully regenerated ${res.generated_count} forecasts for the upcoming 3-month horizon.`);
      await loadInitialData();
    } catch (err: any) {
      setRefreshMessage(`Generation note: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasActiveFilters = Boolean(
    selectedStateId !== undefined ||
    selectedDistrictId !== undefined ||
    selectedPeriod !== ''
  );

  // Format forecast window (e.g., "Nov 2026 – Jan 2027")
  const formattedForecastPeriod = useMemo(() => {
    const start = overview?.current_forecast_start;
    const end = overview?.current_forecast_end;
    if (!start || !end) return 'Nov 2026 – Jan 2027';

    const formatMonth = (dStr: string) => {
      try {
        const parts = dStr.split('-');
        if (parts.length >= 2) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
      } catch {
        // fallback to YYYY-MM
      }
      return dStr.substring(0, 7);
    };

    return `${formatMonth(start)} – ${formatMonth(end)}`;
  }, [overview?.current_forecast_start, overview?.current_forecast_end]);

  // Format chart data:
  // - Historical actuals (2024–2025)
  // - Current future forecast
  const chartPoints = useMemo(() => {
    return (actualVsPred?.comparison_points || []).map((pt) => {
      const p = pt.period.substring(0, 7);
      const isHistoricalActual = pt.actual_count !== null && pt.actual_count !== undefined;
      const isCurrentFuture = pt.forecast_status === 'CURRENT_FUTURE_FORECAST';

      return {
        period: p,
        actual: isHistoricalActual ? pt.actual_count : undefined,
        current_future: isCurrentFuture ? pt.predicted_count : undefined,
      };
    });
  }, [actualVsPred]);

  const totalPages = Math.ceil(totalPredictions / pageSize);

  return (
    <DashboardLayout
      hideSidebar
      icon={Activity}
      title="Crime Predictions"
      subtitle="Historical crime trends and estimated future incidents."
      onRefresh={loadInitialData}
      isRefreshing={isLoading}
    >
      {/* SECTION 1: DISCLAIMER NOTICE & REGENERATE CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/70 px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-amber-900 leading-snug">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
          <span>Forecasts are estimates, not confirmed future incidents.</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showConfirmRegenerate ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-900 font-medium">Regenerate 3M forecast?</span>
              <button
                type="button"
                onClick={handleRefreshForecast}
                disabled={isRefreshing}
                className="flex items-center gap-1 rounded bg-[#1769AA] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#12558a] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>{isRefreshing ? 'Regenerating...' : 'Yes, Regenerate'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmRegenerate(false)}
                disabled={isRefreshing}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmRegenerate(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-md border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] shadow-2xs hover:bg-[#F4F7FA] hover:text-[#1769AA] hover:border-[#BAC7D5] disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#1769AA]' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Regenerating...' : 'Regenerate Forecasts'}</span>
            </button>
          )}
        </div>
      </div>

      {refreshMessage && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs text-blue-900 flex items-center justify-between shadow-2xs">
          <span>{refreshMessage}</span>
          <button
            type="button"
            onClick={() => setRefreshMessage(null)}
            className="text-blue-500 hover:text-blue-700 font-bold ml-2 cursor-pointer text-sm"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading crime forecasts and operational predictions..." />
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
          {/* SECTION 2: TWO COMPACT SUMMARY CARDS */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              title="Stored Predictions"
              value={(overview?.total_predictions || 0).toLocaleString()}
              subtext="Predictions across assessed districts"
              icon={Database}
              color="blue"
            />

            <StatCard
              title="Forecast Period"
              value={formattedForecastPeriod}
              subtext="Active 3-month forecast horizon"
              icon={Clock}
              color="emerald"
            />
          </div>

          {/* SECTION 2B: USER-SELECTED MONTH CRIME PREDICTION TOOL */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1F3A]">District &amp; Month Crime Prediction</h3>
                  <p className="text-xs text-[#5D6878]">
                    Select any district and month to view projected incident counts, historical baseline comparisons, and estimated crime levels.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5D6878] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                <Info className="h-3.5 w-3.5 text-[#1769AA] shrink-0" />
                <span>Forecast Horizon: Nov 2026 – Jan 2027 | Historical: 2020 – 2025</span>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* State / UT */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  State / UT
                </label>
                <select
                  aria-label="Predictor State or Union Territory"
                  value={predictorStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setPredictorStateId(val);
                    setMonthPrediction(null);
                  }}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value="">Select State / UT ({states.length || 36})</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  District
                </label>
                <select
                  aria-label="Predictor District"
                  value={predictorDistrictId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setPredictorDistrictId(val);
                    setMonthPrediction(null);
                  }}
                  disabled={!predictorStateId || predictorDistricts.length === 0}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!predictorStateId
                      ? 'Select State First'
                      : predictorDistricts.length > 0
                      ? 'Select District'
                      : 'No Districts Found'}
                  </option>
                  {predictorDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Month
                </label>
                <select
                  aria-label="Predictor Month"
                  value={predictorMonth}
                  onChange={(e) => {
                    setPredictorMonth(Number(e.target.value));
                    setMonthPrediction(null);
                  }}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value={1}>January (01)</option>
                  <option value={2}>February (02)</option>
                  <option value={3}>March (03)</option>
                  <option value={4}>April (04)</option>
                  <option value={5}>May (05)</option>
                  <option value={6}>June (06)</option>
                  <option value={7}>July (07)</option>
                  <option value={8}>August (08)</option>
                  <option value={9}>September (09)</option>
                  <option value={10}>October (10)</option>
                  <option value={11}>November (11)</option>
                  <option value={12}>December (12)</option>
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Year
                </label>
                <select
                  aria-label="Predictor Year"
                  value={predictorYear}
                  onChange={(e) => {
                    setPredictorYear(Number(e.target.value));
                    setMonthPrediction(null);
                  }}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value={2027}>2027 (Forecast Horizon)</option>
                  <option value={2026}>2026 (Active Forecast)</option>
                  <option value={2025}>2025 (Historical Actual)</option>
                  <option value={2024}>2024 (Historical Actual)</option>
                  <option value={2023}>2023 (Historical Actual)</option>
                  <option value={2022}>2022 (Historical Actual)</option>
                  <option value={2021}>2021 (Historical Actual)</option>
                  <option value={2020}>2020 (Historical Actual)</option>
                </select>
              </div>

              {/* Predict Button */}
              <div>
                <button
                  type="button"
                  onClick={handlePredictCrime}
                  disabled={isPredictorLoading || !predictorDistrictId}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#1769AA] px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPredictorLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Predict Crime</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {predictorError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{predictorError}</span>
              </div>
            )}

            {/* Prediction Result Display */}
            {monthPrediction && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {/* Result Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F4F7FA] border border-[#D9E1EA] rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                    <span className="text-sm font-bold text-[#0B1F3A]">
                      {monthPrediction.district_name}, {monthPrediction.state_name} — {monthPrediction.period}
                    </span>
                  </div>
                  <div>
                    {monthPrediction.is_forecast && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
                        <Sparkles className="h-3 w-3" />
                        Statistical Forecast Estimate
                      </span>
                    )}
                    {monthPrediction.is_historical && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 text-xs font-semibold">
                        <Calendar className="h-3 w-3" />
                        Observed Historical Caseload
                      </span>
                    )}
                    {!monthPrediction.is_available && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {monthPrediction.crime_level}
                      </span>
                    )}
                  </div>
                </div>

                {monthPrediction.is_available ? (
                  <>
                    {/* 4 Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Value */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
                        <span className="text-xs font-medium text-[#5D6878]">
                          {monthPrediction.is_forecast ? 'Predicted Crime Count' : 'Observed Crime Count'}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-[#1769AA]">
                            {monthPrediction.display_value !== undefined && monthPrediction.display_value !== null
                              ? monthPrediction.display_value.toFixed(2)
                              : '—'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">incidents</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {monthPrediction.is_forecast ? 'Forward model projection' : 'Verified historical incidents'}
                        </p>
                      </div>

                      {/* 2. Crime Level */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
                        <span className="text-xs font-medium text-[#5D6878]">Estimated Crime Level</span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-sm font-bold ${
                              monthPrediction.crime_level === 'Higher'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : monthPrediction.crime_level === 'Lower'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {monthPrediction.crime_level === 'Higher' && <ArrowUpRight className="h-4 w-4" />}
                            {monthPrediction.crime_level === 'Lower' && <ArrowDownRight className="h-4 w-4" />}
                            {monthPrediction.crime_level === 'Moderate' && <Minus className="h-4 w-4" />}
                            {monthPrediction.crime_level}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Compared to historical baseline
                        </p>
                      </div>

                      {/* 3. Historical Baseline */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
                        <span className="text-xs font-medium text-[#5D6878]">Historical Baseline</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-[#0B1F3A]">
                            {monthPrediction.baseline_count !== undefined && monthPrediction.baseline_count !== null
                              ? monthPrediction.baseline_count.toFixed(2)
                              : '0.00'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">incidents</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 truncate" title={monthPrediction.baseline_type || ''}>
                          {monthPrediction.baseline_type || 'Same month baseline'}
                        </p>
                      </div>

                      {/* 4. Comparative Difference */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
                        <span className="text-xs font-medium text-[#5D6878]">Numerical &amp; % Change</span>
                        <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                          <span
                            className={`text-xl font-bold font-mono ${
                              (monthPrediction.numerical_change || 0) > 0
                                ? 'text-rose-600'
                                : (monthPrediction.numerical_change || 0) < 0
                                ? 'text-emerald-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {(monthPrediction.numerical_change || 0) > 0 ? '+' : ''}
                            {monthPrediction.numerical_change !== undefined && monthPrediction.numerical_change !== null
                              ? monthPrediction.numerical_change.toFixed(2)
                              : '0.00'}
                          </span>
                          {monthPrediction.percentage_change !== null && monthPrediction.percentage_change !== undefined && (
                            <span
                              className={`text-xs font-semibold ${
                                monthPrediction.percentage_change > 0
                                  ? 'text-rose-600'
                                  : monthPrediction.percentage_change < 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              ({monthPrediction.percentage_change > 0 ? '+' : ''}
                              {monthPrediction.percentage_change.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {(monthPrediction.numerical_change || 0) > 0
                            ? 'Projected above baseline'
                            : (monthPrediction.numerical_change || 0) < 0
                            ? 'Projected below baseline'
                            : 'Consistent with baseline'}
                        </p>
                      </div>
                    </div>

                    {/* Explanation Box */}
                    <div className="rounded-lg border border-blue-100 bg-[#F7FAFD] p-3.5 text-xs text-[#0B1F3A] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-[#1769AA] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{monthPrediction.explanation}</p>
                          <p className="mt-1.5 text-[11px] text-[#5D6878]">
                            <strong>Comparison Rule:</strong> {monthPrediction.comparison_rule}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Unavailable State Card */
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-950">
                          {monthPrediction.crime_level === 'Insufficient Baseline'
                            ? 'Insufficient Historical Baseline Data'
                            : 'Forecast Unavailable for Selected Period'}
                        </h4>
                        <p className="mt-1">{monthPrediction.explanation}</p>
                        <p className="mt-2 text-[11px] text-amber-800">
                          <strong>Supported Horizons:</strong> Active forecast predictions are currently available for{' '}
                          <strong>November 2026, December 2026, and January 2027</strong>. Historical actual caseloads are
                          recorded from <strong>January 2020 through December 2025</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: COMPACT FILTER TOOLBAR */}
          <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3 rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
              {/* State / UT Selector (36 entities) */}
              <select
                aria-label="State or Union Territory"
                value={selectedStateId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedStateId(val);
                  setSelectedDistrictId(undefined);
                }}
                className="h-10 w-full sm:w-auto min-w-[200px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All States &amp; UTs ({states.length || 36})</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name}
                  </option>
                ))}
              </select>

              {/* District Selector */}
              <select
                aria-label="District"
                value={selectedDistrictId || ''}
                onChange={(e) => setSelectedDistrictId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!selectedStateId || districts.length === 0}
                className="h-10 w-full sm:w-auto min-w-[200px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {!selectedStateId
                    ? 'All Districts'
                    : districts.length > 0
                    ? `All Districts in State (${districts.length})`
                    : 'No Districts Found'}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>

              {/* Forecast Period Selector */}
              <select
                aria-label="Forecast Period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-10 w-full sm:w-auto min-w-[180px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All Forecast Periods</option>
                <option value="2026-11-01">November 2026</option>
                <option value="2026-12-01">December 2026</option>
                <option value="2027-01-01">January 2027</option>
                <option value="2025-12-01">December 2025</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleFilterApply}
                disabled={isFilterLoading}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded bg-[#1769AA] px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isFilterLoading ? 'Applying...' : 'Apply Filters'}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#D9E1EA] bg-white px-3 text-[12px] font-medium text-[#5D6878] hover:bg-[#F4F7FA] hover:text-[#172033] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* SECTION 4: PRIMARY FORECAST CHART */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#0B1F3A]">
                    Historical Incidents and Future Forecast
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-[#5D6878]">
                  {actualVsPred?.district_name || 'National Aggregate'} (
                  {actualVsPred?.state_name || 'All Districts'}) — Historical observed crime counts and estimated future crime counts.
                </p>
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
                      color: '#0B1F3A',
                      fontSize: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(val: any, name: any) => {
                      if (name === 'actual') {
                        return [val ? `${Number(val).toLocaleString()} incidents` : '—', 'Historical Observed'];
                      }
                      if (name === 'current_future') {
                        return [val ? `${Number(val).toLocaleString()} incidents` : '—', 'Estimated Future Incidents'];
                      }
                      return [val, String(name)];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => {
                      if (value === 'actual') return <span className="text-xs font-semibold text-[#1769AA]">Historical Observed</span>;
                      if (value === 'current_future') return <span className="text-xs font-bold text-emerald-700">Estimated Future Incidents</span>;
                      return <span className="text-xs text-slate-500">{value}</span>;
                    }}
                  />

                  {/* Historical Observed Caseload */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="actual"
                    stroke="#1769AA"
                    strokeWidth={2}
                    fill="#1769AA"
                    fillOpacity={0.12}
                    connectNulls={false}
                  />

                  {/* Estimated Future Forecasts */}
                  <Line
                    type="monotone"
                    dataKey="current_future"
                    name="current_future"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#059669' }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECTION 5: MODEL PERFORMANCE */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1F3A]">Model Performance</h4>
                </div>
                <p className="text-xs text-[#5D6878] mt-1">
                  Validation benchmarks evaluated on held-out test data across all districts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-[#F4F7FA] border border-[#D9E1EA] px-3 py-1.5">
                  <span className="text-[#5D6878] font-medium">WAPE (Weighted Absolute % Error):</span>
                  <span className="font-bold text-[#0B1F3A]">
                    {(evaluation?.metrics_summary?.['HistGradientBoosting']?.['WAPE%'] ?? 36.8).toFixed(1)}%
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[#5D6878]">MAE:</span>
                  <span className="font-mono font-semibold text-[#0B1F3A]">
                    {(evaluation?.metrics_summary?.['HistGradientBoosting']?.MAE ?? 1.70).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: DISTRICT PREDICTION RESULTS TABLE */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0B1F3A]">District Prediction Results</h4>
                  <p className="text-xs text-[#5D6878]">
                    Showing {predictionsList.length} of {totalPredictions.toLocaleString()} stored predictions
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                    <th className="py-2.5 pl-3 w-[32%]">District</th>
                    <th className="py-2.5 px-3 w-[28%]">State / UT</th>
                    <th className="py-2.5 px-3 w-[20%]">Forecast Month</th>
                    <th className="py-2.5 px-3 text-right w-[20%]">Predicted Crime Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {predictionsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                        No prediction records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    predictionsList.map((row) => (
                      <tr key={row.id} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                        <td className="py-2 pl-3 font-semibold text-[#0B1F3A]">
                          {row.district_name || `District #${row.district_id}`}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{row.state_name || '—'}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">
                          {row.forecast_period ? row.forecast_period.substring(0, 7) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#1769AA]">
                          {row.predicted_crime_count.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 mt-3">
                <span className="text-xs text-slate-500">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalPredictions)} to{' '}
                  {Math.min(currentPage * pageSize, totalPredictions)} of {totalPredictions.toLocaleString()} records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isFilterLoading}
                    className="flex h-8 items-center gap-1 rounded border border-[#D9E1EA] bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FA] disabled:opacity-50 transition-colors cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs font-semibold text-[#0B1F3A] px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isFilterLoading}
                    className="flex h-8 items-center gap-1 rounded border border-[#D9E1EA] bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FA] disabled:opacity-50 transition-colors cursor-pointer"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
