import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Activity,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  MapPin,
  RotateCcw,
  ExternalLink,
  BarChart2,
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
import {
  formatPredictedCount,
  formatPredictionInterval,
  reconcilePredictionsWithLargestRemainder,
} from '../utils/predictionFormatting';
import type {
  ActualVsPredictedData,
  DistrictMonthPrediction,
  PredictionBreakdownResponse,
  CrimeTypeForecastItem,
} from '../api/predictionApi';
import type { StateItem, DistrictItem } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; bar: string }
> = {
  'Other Crime': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: 'bg-[#1769AA]',
  },
  'Violent Crime': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: 'bg-rose-600',
  },
  'Fire Accident': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
  },
  'Traffic Fatality': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: 'bg-emerald-600',
  },
};

const SEVERITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const TYPE_COMPACT_LIMIT = 5;

const getMonthStatus = (month: number, year: number) => {
  if (year === 2027) {
    if (month >= 1 && month <= 10) {
      return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Active Forecast)`, tag: 'Active Forecast' };
    }
    return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Outside Horizon)`, tag: 'Outside Horizon' };
  }
  if (year === 2026) {
    if (month >= 11) {
      return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Active Forecast)`, tag: 'Active Forecast' };
    }
    if (month <= 3) {
      return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Past Forecast)`, tag: 'Past Forecast' };
    }
    return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Outside Horizon)`, tag: 'Outside Horizon' };
  }
  if (year >= 2020 && year <= 2025) {
    return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Historical Record)`, tag: 'Historical' };
  }
  return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Unsupported)`, tag: 'Unsupported' };
};

export const PredictionsPage: React.FC = () => {
  const navigate = useNavigate();

  // Geographic and temporal controls - initialized with NO default state, district, year, or month
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

  // Prediction result and state - strictly NULL until user clicks "Predict Crime"
  const [predictionResult, setPredictionResult] = useState<DistrictMonthPrediction | null>(null);
  const [breakdownData, setBreakdownData] = useState<PredictionBreakdownResponse | null>(null);
  const [actualVsPred, setActualVsPred] = useState<ActualVsPredictedData | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Active category filter for interactive breakdown (synchronized with category tabs)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // View All / Show Less toggle - default to true so full 21 offences are immediately visible
  const [showAllTypes, setShowAllTypes] = useState<boolean>(true);

  // Page initialization loading/error
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Initial load: Fetch states list only, do NOT auto-select state or district, and do NOT fetch predictions
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true);
    setPageError(null);
    try {
      const statesRes = await geographyApi.getStates();
      const stateList = statesRes.items || [];
      setStates(stateList);

      // Explicitly reset all selections and prediction states
      setSelectedStateId(undefined);
      setDistricts([]);
      setSelectedDistrictId(undefined);
      setSelectedYear(undefined);
      setSelectedMonth(undefined);
      setPredictionResult(null);
      setBreakdownData(null);
      setActualVsPred(null);
      setActiveCategoryFilter('ALL');
      setShowAllTypes(true);
      setPredictError(null);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to initialize crime predictions.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // STEP 1 -> STEP 2: When State / UT changes, clear dependent district, year, month, and any displayed predictions
  const handleStateChange = async (stateId: number | undefined) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setDistricts([]);
    setPredictionResult(null);
    setBreakdownData(null);
    setActualVsPred(null);
    setActiveCategoryFilter('ALL');
    setShowAllTypes(true);
    setPredictError(null);

    if (!stateId) {
      return;
    }

    try {
      const res = await geographyApi.getDistricts(stateId, 'current');
      const items = res.items || [];
      setDistricts(items);
    } catch {
      setDistricts([]);
    }
  };

  // STEP 2 -> STEP 3: When District changes, clear dependent year, month, and any displayed predictions
  const handleDistrictChange = (districtId: number | undefined) => {
    setSelectedDistrictId(districtId);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setPredictionResult(null);
    setBreakdownData(null);
    setActualVsPred(null);
    setActiveCategoryFilter('ALL');
    setShowAllTypes(true);
    setPredictError(null);
  };

  // STEP 3: When Year changes, clear dependent month and any displayed predictions
  const handleYearChange = (year: number | undefined) => {
    setSelectedYear(year);
    setSelectedMonth(undefined);
    setPredictionResult(null);
    setBreakdownData(null);
    setActualVsPred(null);
    setActiveCategoryFilter('ALL');
    setShowAllTypes(true);
    setPredictError(null);
  };

  // STEP 3: When Month changes, clear previous predictions until user clicks "Predict Crime"
  const handleMonthChange = (month: number | undefined) => {
    setSelectedMonth(month);
    setPredictionResult(null);
    setBreakdownData(null);
    setActualVsPred(null);
    setActiveCategoryFilter('ALL');
    setShowAllTypes(true);
    setPredictError(null);
  };

  // Reset Filters handler: Clears all selections and returns to initial prompt
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setDistricts([]);
    setPredictionResult(null);
    setBreakdownData(null);
    setActualVsPred(null);
    setActiveCategoryFilter('ALL');
    setShowAllTypes(true);
    setPredictError(null);
  };

  const hasActiveFilters = Boolean(
    selectedStateId !== undefined ||
    selectedDistrictId !== undefined ||
    selectedYear !== undefined ||
    selectedMonth !== undefined
  );

  // Month options partitioned by validity in selected year
  const monthOptions = useMemo(() => {
    if (!selectedYear) return [];
    return MONTH_NAMES.map((name, idx) => {
      const mNum = idx + 1;
      const status = getMonthStatus(mNum, selectedYear);
      return {
        month: mNum,
        name,
        label: status.label,
        isSupported: status.isSupported,
        tag: status.tag,
      };
    });
  }, [selectedYear]);

  // STEP 4: Run prediction when user clicks "Predict Crime"
  const handlePredictCrime = async () => {
    if (!selectedDistrictId || !selectedYear || !selectedMonth) {
      setPredictError('Please select state, district, year, and month to predict crime.');
      return;
    }

    setIsPredicting(true);
    setPredictError(null);
    try {
      const [predData, chartData, bdData] = await Promise.all([
        predictionApi.getDistrictMonthPrediction(selectedDistrictId, selectedYear, selectedMonth),
        predictionApi.getActualVsPredicted(selectedDistrictId),
        predictionApi.getPredictionBreakdown(selectedDistrictId, selectedYear, selectedMonth).catch(() => null),
      ]);
      setPredictionResult(predData);
      setActualVsPred(chartData);
      setBreakdownData(bdData);
      setActiveCategoryFilter('ALL');
      setShowAllTypes(true);
    } catch (err: any) {
      setPredictError(err?.response?.data?.detail || err?.message || 'Failed to estimate crime incidents.');
      setPredictionResult(null);
      setBreakdownData(null);
      setActualVsPred(null);
    } finally {
      setIsPredicting(false);
    }
  };

  // Format chart data points (historical observed vs estimated future incidents)
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

  // Selected district name lookup
  const currentDistrictName = useMemo(() => {
    return (
      districts.find((d) => d.id === selectedDistrictId)?.district_name ||
      predictionResult?.district_name ||
      actualVsPred?.district_name ||
      'Selected District'
    );
  }, [districts, selectedDistrictId, predictionResult, actualVsPred]);

  // Trend mapping: Higher, Similar, Lower
  const trendLabel = useMemo(() => {
    if (!predictionResult || !predictionResult.is_available) return null;
    if (predictionResult.crime_level === 'Moderate') return 'Similar';
    return predictionResult.crime_level;
  }, [predictionResult]);

  // Reconcile crime types using Largest-Remainder Method with district total prediction
  const reconciledCrimeTypes = useMemo(() => {
    if (!breakdownData || !breakdownData.crime_types || breakdownData.crime_types.length === 0) {
      return [];
    }
    const target =
      predictionResult?.display_value ??
      predictionResult?.predicted_count ??
      breakdownData.total_display_predicted_count ??
      breakdownData.total_predicted_count;
    return reconcilePredictionsWithLargestRemainder(breakdownData.crime_types, target);
  }, [breakdownData, predictionResult]);

  // Dynamically identify the crime type with highest predicted count
  const topCrimeType = useMemo(() => {
    if (reconciledCrimeTypes.length === 0) {
      return null;
    }
    const maxItem = reconciledCrimeTypes.reduce((max, curr) =>
      curr.predicted_count > (max?.predicted_count ?? -1) ? curr : max,
      reconciledCrimeTypes[0]
    );
    if (!maxItem || maxItem.predicted_count <= 0) {
      return null;
    }
    return maxItem;
  }, [reconciledCrimeTypes]);

  // Sorted crime types according to active category filter
  const sortedCrimeTypes = useMemo(() => {
    if (reconciledCrimeTypes.length === 0) return [];
    const pool =
      activeCategoryFilter !== 'ALL'
        ? reconciledCrimeTypes.filter(
            (ct) => ct.category_name.toLowerCase() === activeCategoryFilter.toLowerCase()
          )
        : reconciledCrimeTypes;
    return [...pool].sort((a, b) => b.predicted_count - a.predicted_count);
  }, [reconciledCrimeTypes, activeCategoryFilter]);

  // Displayed crime types supporting compact view (top 5) and View All view
  const displayedCrimeTypes = useMemo(() => {
    if (showAllTypes) return sortedCrimeTypes;
    return sortedCrimeTypes.slice(0, TYPE_COMPACT_LIMIT);
  }, [sortedCrimeTypes, showAllTypes]);

  // Highest predicted count in sorted pool for relative bar sizing
  const maxTypeCount = useMemo(() => {
    if (sortedCrimeTypes.length === 0) return 1;
    return Math.max(...sortedCrimeTypes.map((t) => t.predicted_count), 0.01);
  }, [sortedCrimeTypes]);

  return (
    <DashboardLayout
      hideSidebar
      hideFooter
      icon={Activity}
      title="Crime Predictions"
      subtitle="Select a district and month to estimate crime incidents."
      onRefresh={loadInitialData}
      isRefreshing={isInitialLoading}
    >
      {isInitialLoading && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading crime forecasting pipeline..." />
        </div>
      )}

      {pageError && (
        <ErrorState
          title="Prediction Service Error"
          message={pageError}
          onRetry={loadInitialData}
        />
      )}

      {!isInitialLoading && !pageError && (
        <div className="space-y-4">
          {/* SECTION 1: SELECTION CONTROLS */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                {/* STEP 1: State / UT Selector */}
                <select
                  aria-label="State or Union Territory"
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleStateChange(val);
                  }}
                  className="h-10 w-full sm:w-auto sm:min-w-[190px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value="">Select State / UT ({states.length || 36})</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>

                {/* STEP 2: District Selector */}
                {Boolean(selectedStateId) && (
                  <select
                    aria-label="District"
                    value={selectedDistrictId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleDistrictChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[170px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer animate-fadeIn"
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.district_name}
                      </option>
                    ))}
                  </select>
                )}

                {/* STEP 3A: Year Selector */}
                {Boolean(selectedDistrictId) && (
                  <select
                    aria-label="Year"
                    value={selectedYear || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleYearChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[140px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer animate-fadeIn"
                  >
                    <option value="">Select Year</option>
                    <option value={2027}>2027</option>
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                    <option value={2022}>2022</option>
                    <option value={2021}>2021</option>
                    <option value={2020}>2020</option>
                  </select>
                )}

                {/* STEP 3B: Month Selector */}
                {Boolean(selectedYear) && (
                  <select
                    aria-label="Month"
                    value={selectedMonth || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleMonthChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[150px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer animate-fadeIn"
                  >
                    <option value="">Select Month</option>
                    {monthOptions.map((m) => (
                      <option key={m.month} value={m.month} disabled={!m.isSupported}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* STEP 4: Predict Crime Button */}
                {Boolean(selectedMonth) && (
                  <button
                    type="button"
                    onClick={handlePredictCrime}
                    disabled={
                      isPredicting ||
                      !selectedStateId ||
                      !selectedDistrictId ||
                      !selectedYear ||
                      !selectedMonth
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#1769AA] px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50 shrink-0 animate-fadeIn"
                  >
                    {isPredicting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Estimating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Predict Crime</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0 animate-fadeIn"
                  title="Reset all active selections"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {predictError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{predictError}</span>
              </div>
            )}
          </div>

          {/* INITIAL PROMPT: Rendered before user clicks "Predict Crime" */}
          {!isPredicting && !predictionResult && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center shadow-2xs animate-fadeIn">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3FA] text-[#1769AA] mb-3">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">No Prediction Selected</h3>
              <p className="mt-1 text-xs text-[#5D6878] max-w-md mx-auto">
                {!selectedStateId
                  ? 'Select a State / UT to begin exploring crime projections.'
                  : !selectedDistrictId
                  ? 'Select a District within the chosen State / UT.'
                  : !selectedYear
                  ? 'Select a Year for historical actuals or future forecasts.'
                  : !selectedMonth
                  ? 'Select a Month, then click Predict Crime to generate predictions.'
                  : 'Click Predict Crime to estimate incidents for the selected period.'}
              </p>
            </div>
          )}

          {/* LOADING STATE: Rendered while prediction request is running */}
          {isPredicting && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center shadow-2xs animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#1769AA]">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Generating predictions...</span>
              </div>
            </div>
          )}

          {/* SECTION 2-5: PREDICTION RESULTS CONTAINER (Rendered ONLY after successful "Predict Crime") */}
          {!isPredicting && predictionResult && (
            <div className="space-y-4 animate-fadeIn">
              {/* SECTION 2: DISTRICT HEADER & SUMMARY CARDS */}
              <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                    <span className="text-sm font-bold text-[#0B1F3A]">
                      {predictionResult.district_name}, {predictionResult.state_name} —{' '}
                      {selectedMonth ? MONTH_NAMES[selectedMonth - 1] : ''} {selectedYear}
                    </span>
                  </div>

                  {/* Open in Resource Optimization Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const pStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                      navigate(
                        `/resources?state_id=${selectedStateId}&district_id=${selectedDistrictId}&period=${pStr}&tab=ai_optimization`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1769AA] text-white hover:bg-[#12558a] transition-colors cursor-pointer shrink-0"
                  >
                    <span>Open in Resource Optimization</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>

                {predictionResult.is_available ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Estimated Crime Incidents */}
                    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-medium text-[#5D6878]">
                          {predictionResult.is_historical ? 'Confirmed Incidents' : 'Estimated Incidents'}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold font-mono text-[#1769AA]">
                            {predictionResult.display_value !== undefined && predictionResult.display_value !== null
                              ? formatPredictedCount(predictionResult.display_value)
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {predictionResult.prediction_interval_lower !== undefined &&
                        predictionResult.prediction_interval_lower !== null &&
                        predictionResult.prediction_interval_upper !== undefined &&
                        predictionResult.prediction_interval_upper !== null && (
                          <div className="mt-2 text-[11px] font-mono text-slate-500">
                            80% CI: {formatPredictionInterval(predictionResult.prediction_interval_lower, predictionResult.prediction_interval_upper)}
                          </div>
                        )}
                    </div>

                    {/* 2. Historical Baseline */}
                    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-medium text-[#5D6878]">Historical Baseline</span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold font-mono text-[#172033]">
                            {predictionResult.baseline_count !== null && predictionResult.baseline_count !== undefined
                              ? formatPredictedCount(predictionResult.baseline_count)
                              : predictionResult.actual_count !== null && predictionResult.actual_count !== undefined
                              ? formatPredictedCount(predictionResult.actual_count)
                              : '—'}
                          </span>
                        </div>
                      </div>
                      <span className="mt-2 text-[11px] text-slate-500">
                        {predictionResult.baseline_period || (selectedYear && selectedYear >= 2026 ? '2025 baseline' : 'Prior period')}
                      </span>
                    </div>

                    {/* 3. Expected Trend */}
                    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-medium text-[#5D6878]">Expected Trend</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                              trendLabel === 'Higher'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : trendLabel === 'Lower'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {trendLabel === 'Higher' && <ArrowUpRight className="h-3.5 w-3.5" />}
                            {trendLabel === 'Lower' && <ArrowDownRight className="h-3.5 w-3.5" />}
                            {trendLabel === 'Similar' && <Minus className="h-3.5 w-3.5" />}
                            {trendLabel}
                          </span>
                        </div>
                      </div>
                      <span className="mt-2 text-[11px] text-slate-500">
                        vs historical baseline
                      </span>
                    </div>

                    {/* 4. Top Projected Offence */}
                    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-medium text-[#5D6878]">Top Projected Offence</span>
                        {topCrimeType ? (
                          <div className="mt-1 flex items-baseline justify-between gap-1.5">
                            <span className="text-sm font-bold text-[#0B1F3A] truncate" title={topCrimeType.crime_name}>
                              {topCrimeType.crime_name}
                            </span>
                            <span className="text-lg font-bold font-mono text-[#1769AA] shrink-0">
                              {topCrimeType.display_count || formatPredictedCount(topCrimeType.predicted_count)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-[#7C8796]">
                            No active offences projected
                          </div>
                        )}
                      </div>
                      {topCrimeType && (
                        <span className="mt-2 text-[11px] text-slate-500 truncate">
                          {topCrimeType.category_name} ({topCrimeType.share_of_total_percent.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Unavailable State */
                  <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-950">Prediction unavailable for this month</h4>
                        <p className="mt-1 text-amber-800">
                          {predictionResult.explanation ||
                            'No statistical projection is available for the selected month and district.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: COMPACT DISTRICT TIMELINE CHART */}
              <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-[#0B1F3A]">
                      Incident Trend &amp; Forecast — {currentDistrictName}
                    </h3>
                  </div>
                </div>

                <div className="h-64 w-full">
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
                            return [val ? `${Math.round(Number(val)).toLocaleString()} incidents` : '—', 'Historical Observed'];
                          }
                          if (name === 'current_future') {
                            return [val ? `${Math.round(Number(val)).toLocaleString()} estimated incidents` : '—', 'Estimated Incidents'];
                          }
                          return [val, String(name)];
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={32}
                        formatter={(value) => {
                          if (value === 'actual') return <span className="text-xs font-semibold text-[#1769AA]">Historical Observed</span>;
                          if (value === 'current_future') return <span className="text-xs font-bold text-emerald-700">Estimated Incidents</span>;
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

                      {/* Estimated Incidents */}
                      <Line
                        type="monotone"
                        dataKey="current_future"
                        name="current_future"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#059669' }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECTION 4: CONSOLIDATED PREDICTED OFFENCES */}
              {breakdownData && (
                <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-[#1769AA]" />
                      <h3 className="text-sm font-bold text-[#0B1F3A]">
                        {activeCategoryFilter !== 'ALL'
                          ? `Predicted Offences — ${activeCategoryFilter}`
                          : 'Predicted Offences — All Categories'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#5D6878] font-medium">
                        {displayedCrimeTypes.length} {displayedCrimeTypes.length === 1 ? 'offence' : 'offences'}
                      </span>
                      {sortedCrimeTypes.length > TYPE_COMPACT_LIMIT && (
                        <button
                          type="button"
                          onClick={() => setShowAllTypes((prev) => !prev)}
                          className="text-[11px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors cursor-pointer ml-1"
                        >
                          {showAllTypes ? 'Show Top 5' : `View All (${sortedCrimeTypes.length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Synchronized Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3 overflow-x-auto text-xs">
                    {['ALL', 'Violent Crime', 'Other Crime', 'Traffic Fatality', 'Fire Accident'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          activeCategoryFilter.toLowerCase() === cat.toLowerCase()
                            ? 'bg-[#1769AA] text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {cat === 'ALL' ? 'All (21)' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Responsive Consolidated Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-3">Offence</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Predicted Incidents</th>
                          <th className="py-2.5 px-3 text-center">Trend</th>
                          <th className="py-2.5 px-3 text-center">Severity / Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedCrimeTypes.length > 0 ? (
                          displayedCrimeTypes.map((t: CrimeTypeForecastItem, idx: number) => {
                            const pctOfMax = maxTypeCount > 0 ? (t.predicted_count / maxTypeCount) * 100 : 0;
                            const sevBadge = SEVERITY_BADGES[t.severity_level] || SEVERITY_BADGES.LOW;
                            const catStyle = CATEGORY_STYLES[t.category_name] || CATEGORY_STYLES['Other Crime'];

                            return (
                              <tr key={t.crime_type_id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-slate-400">
                                  #{idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-900">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900" title={t.crime_name}>
                                      {t.crime_name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                      {t.crime_code}
                                    </span>
                                    {t.is_sparse && (
                                      <span
                                        className="text-[9.5px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0"
                                        title="Low historical frequency in this district"
                                      >
                                        Rare
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                                    {t.category_name}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-baseline gap-1 font-mono">
                                      <span className="font-bold text-[#1769AA] text-[12px]">
                                        {t.display_count || formatPredictedCount(t.predicted_count)}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        ({activeCategoryFilter !== 'ALL'
                                          ? `${t.share_of_category_percent.toFixed(1)}%`
                                          : `${t.share_of_total_percent.toFixed(1)}%`})
                                      </span>
                                    </div>
                                    {/* Relative volume progress bar */}
                                    <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden mt-1">
                                      <div
                                        className={`h-full rounded-full ${catStyle.bar}`}
                                        style={{ width: `${Math.max(pctOfMax, 3)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                                      t.trend_status === 'Increasing'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : t.trend_status === 'Decreasing'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {t.trend_status === 'Increasing' && <ArrowUpRight className="h-3 w-3" />}
                                    {t.trend_status === 'Decreasing' && <ArrowDownRight className="h-3 w-3" />}
                                    {t.trend_status === 'Stable' && <Minus className="h-3 w-3" />}
                                    {t.trend_status === 'Increasing' ? 'Higher' : t.trend_status === 'Decreasing' ? 'Lower' : 'Similar'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}
                                  >
                                    {t.severity_level}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                              {breakdownData ? 'No offences match the selected filter.' : 'Loading offence-wise breakdown...'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {sortedCrimeTypes.length > 0 && (
                        <tfoot className="bg-[#F8FAFC] border-t border-slate-200 font-semibold text-[11px]">
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3 text-slate-700">
                              {activeCategoryFilter === 'ALL'
                                ? 'Reconciled Total (All 21 Offences)'
                                : `Category Total (${activeCategoryFilter})`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1769AA]">
                              {sortedCrimeTypes.reduce((acc, curr) => acc + (curr.integer_count ?? Math.round(curr.predicted_count)), 0).toLocaleString()}
                            </td>
                            <td colSpan={2} className="py-2.5 px-3 text-slate-500 text-center font-normal">
                              {activeCategoryFilter === 'ALL' && predictionResult.display_value !== undefined
                                ? `Reconciled with district estimate (${formatPredictedCount(predictionResult.display_value)})`
                                : 'Category subset'}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
