import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Layers,
  BarChart2,
  ShieldAlert,
  Car,
  Flame,
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
  ActualVsPredictedData,
  DistrictMonthPrediction,
  PredictionBreakdownResponse,
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
  { bg: string; text: string; border: string; bar: string; icon: typeof Layers }
> = {
  'Other Crime': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: 'bg-[#1769AA]',
    icon: Layers,
  },
  'Violent Crime': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: 'bg-rose-600',
    icon: ShieldAlert,
  },
  'Fire Accident': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    icon: Flame,
  },
  'Traffic Fatality': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: 'bg-emerald-600',
    icon: Car,
  },
};

const SEVERITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const TYPE_COMPACT_LIMIT = 5;

export const PredictionsPage: React.FC = () => {
  // Geographic and temporal controls - initialized with NO default state, district, year, or month
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

  // Prediction result and state
  const [predictionResult, setPredictionResult] = useState<DistrictMonthPrediction | null>(null);
  const [breakdownResult, setBreakdownResult] = useState<PredictionBreakdownResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Interactive selected category for side-by-side view (defaults to first category on prediction)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // View All expand/collapse toggles matching Crime Analytics behavior
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [showAllTypes, setShowAllTypes] = useState<boolean>(false);

  // Timeline chart state for selected district
  const [actualVsPred, setActualVsPred] = useState<ActualVsPredictedData | null>(null);

  // Page initialization loading/error
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Initial load: Fetch states only, do NOT auto-select state or district
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true);
    setPageError(null);
    try {
      const statesRes = await geographyApi.getStates();
      const stateList = statesRes.items || [];
      setStates(stateList);

      // Do NOT select any state, district, year, or month by default
      setSelectedStateId(undefined);
      setDistricts([]);
      setSelectedDistrictId(undefined);
      setSelectedYear(undefined);
      setSelectedMonth(undefined);
      setActualVsPred(null);
      setPredictionResult(null);
      setBreakdownResult(null);
      setSelectedCategoryId(null);
      setShowAllCategories(false);
      setShowAllTypes(false);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to initialize crime predictions.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When State / UT changes, clear dependent district, year, month, and results
  const handleStateChange = async (stateId: number | undefined) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setDistricts([]);
    setActualVsPred(null);
    setPredictionResult(null);
    setBreakdownResult(null);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
    setShowAllTypes(false);
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

  // When District changes, clear dependent year, month, and results
  const handleDistrictChange = (districtId: number | undefined) => {
    setSelectedDistrictId(districtId);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setPredictError(null);
    setPredictionResult(null);
    setBreakdownResult(null);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
    setShowAllTypes(false);
    setActualVsPred(null);
  };

  // When Year changes, clear dependent month and result
  const handleYearChange = (year: number | undefined) => {
    setSelectedYear(year);
    setSelectedMonth(undefined);
    setPredictError(null);
    setPredictionResult(null);
    setBreakdownResult(null);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
    setShowAllTypes(false);
  };

  // When Month changes, clear previous prediction until Predict is clicked
  const handleMonthChange = (month: number | undefined) => {
    setSelectedMonth(month);
    setPredictError(null);
    setPredictionResult(null);
    setBreakdownResult(null);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
    setShowAllTypes(false);
  };

  // Reset Filters handler: restores initial unselected state
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setDistricts([]);
    setPredictionResult(null);
    setBreakdownResult(null);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
    setShowAllTypes(false);
    setActualVsPred(null);
    setPredictError(null);
  };

  const hasActiveFilters = Boolean(
    selectedStateId !== undefined ||
    selectedDistrictId !== undefined ||
    selectedYear !== undefined ||
    selectedMonth !== undefined
  );

  // Run prediction when user clicks "Predict Crime"
  const handlePredictCrime = async () => {
    if (!selectedDistrictId || !selectedYear || !selectedMonth) {
      setPredictError('Please select state, district, year, and month to predict crime.');
      return;
    }

    setIsPredicting(true);
    setPredictError(null);
    try {
      const [predData, chartData, breakdownData] = await Promise.all([
        predictionApi.getDistrictMonthPrediction(selectedDistrictId, selectedYear, selectedMonth),
        predictionApi.getActualVsPredicted(selectedDistrictId),
        predictionApi.getPredictionBreakdown(selectedDistrictId, selectedYear, selectedMonth),
      ]);
      setPredictionResult(predData);
      setActualVsPred(chartData);
      setBreakdownResult(breakdownData);
      // Automatically select the first category for interactive side-by-side view
      if (breakdownData.categories && breakdownData.categories.length > 0) {
        setSelectedCategoryId(breakdownData.categories[0].category_id);
      } else {
        setSelectedCategoryId(null);
      }
      setShowAllCategories(false);
      setShowAllTypes(false);
    } catch (err: any) {
      setPredictError(err?.response?.data?.detail || err?.message || 'Failed to estimate crime incidents.');
      setPredictionResult(null);
      setBreakdownResult(null);
      setSelectedCategoryId(null);
      setShowAllCategories(false);
      setShowAllTypes(false);
    } finally {
      setIsPredicting(false);
    }
  };

  // Format chart data points (historical observed vs estimated future incidents)
  const chartPoints = useMemo(() => {
    return (actualVsPred?.comparison_points || []).map((pt) => {
      const p = pt.period.substring(0, 7);
      const isHistoricalActual = pt.actual_count !== null && pt.actual_count !== undefined && p <= '2025-12';
      const isModelPrediction = pt.predicted_count !== null && pt.predicted_count !== undefined && p >= '2026-01';

      return {
        period: p,
        actual: isHistoricalActual ? pt.actual_count : undefined,
        current_future: isModelPrediction ? pt.predicted_count : undefined,
      };
    });
  }, [actualVsPred]);

  // Trend mapping: Higher, Similar, Lower
  const trendLabel = useMemo(() => {
    if (!predictionResult || !predictionResult.is_available) return null;
    if (predictionResult.crime_level === 'Moderate') return 'Similar';
    return predictionResult.crime_level;
  }, [predictionResult]);

  // Dynamically identify the crime type with the highest predicted count across all categories
  const topCrimeType = useMemo(() => {
    if (!breakdownResult || !breakdownResult.crime_types || breakdownResult.crime_types.length === 0) {
      return null;
    }
    const maxItem = breakdownResult.crime_types.reduce((max, curr) =>
      curr.predicted_count > (max?.predicted_count ?? -1) ? curr : max,
      breakdownResult.crime_types[0]
    );
    // If all predicted counts are zero, treat as no prominent active crime type
    if (!maxItem || maxItem.predicted_count <= 0) {
      return null;
    }
    return maxItem;
  }, [breakdownResult]);

  // Currently selected category object
  const selectedCategory = useMemo(() => {
    if (!breakdownResult || selectedCategoryId === null) return null;
    return breakdownResult.categories.find((c) => c.category_id === selectedCategoryId) || null;
  }, [breakdownResult, selectedCategoryId]);

  // Categories list supporting compact view (top 2) and expanded view (all 4)
  const displayedCategories = useMemo(() => {
    if (!breakdownResult) return [];
    if (showAllCategories) return breakdownResult.categories;
    // Show top 2 categories; if a category is currently selected and outside top 2, keep it visible
    const base = breakdownResult.categories.slice(0, 2);
    if (selectedCategoryId && !base.some((c) => c.category_id === selectedCategoryId)) {
      const active = breakdownResult.categories.find((c) => c.category_id === selectedCategoryId);
      if (active) return [...base, active];
    }
    return base;
  }, [breakdownResult, showAllCategories, selectedCategoryId]);

  // All filtered crime types for the active category (or all 21 if none selected), sorted descending
  const sortedCrimeTypes = useMemo(() => {
    if (!breakdownResult) return [];
    const pool =
      selectedCategoryId !== null
        ? breakdownResult.crime_types.filter((ct) => ct.category_id === selectedCategoryId)
        : breakdownResult.crime_types;

    return [...pool].sort((a, b) => b.predicted_count - a.predicted_count);
  }, [breakdownResult, selectedCategoryId]);

  // Displayed crime types supporting compact view (top 5) and View All view
  const displayedCrimeTypes = useMemo(() => {
    if (showAllTypes) return sortedCrimeTypes;
    return sortedCrimeTypes.slice(0, TYPE_COMPACT_LIMIT);
  }, [sortedCrimeTypes, showAllTypes]);

  // Highest predicted count in the displayed crime types for relative bar sizing
  const maxTypeCount = useMemo(() => {
    if (sortedCrimeTypes.length === 0) return 1;
    return Math.max(...sortedCrimeTypes.map((t) => t.predicted_count), 0.01);
  }, [sortedCrimeTypes]);

  return (
    <DashboardLayout
      hideSidebar
      icon={Activity}
      title="Crime Predictions"
      onRefresh={loadInitialData}
      isRefreshing={isInitialLoading}
    >
      {isInitialLoading && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading predictions..." />
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
          {/* PROGRESSIVE SELECTION CONTROLS */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Forecast Filters</span>
                </div>

                {/* 1. State / UT Selector */}
                <select
                  aria-label="State or Union Territory"
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleStateChange(val);
                  }}
                  className="h-10 w-full sm:w-auto sm:min-w-[190px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value="">Select State / UT</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>

                {/* 2. District Selector (Revealed after State is selected) */}
                {Boolean(selectedStateId) && (
                  <select
                    aria-label="District"
                    value={selectedDistrictId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleDistrictChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[170px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.district_name}
                      </option>
                    ))}
                  </select>
                )}

                {/* 3. Year Selector (Revealed after District is selected) */}
                {Boolean(selectedDistrictId) && (
                  <select
                    aria-label="Year"
                    value={selectedYear || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleYearChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[160px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                  >
                    <option value="">Select Year</option>
                    <option value={2027}>2027 (Forecast)</option>
                    <option value={2026}>2026 (Forecast)</option>
                    <option value={2025}>2025 (Historical)</option>
                    <option value={2024}>2024 (Historical)</option>
                    <option value={2023}>2023 (Historical)</option>
                    <option value={2022}>2022 (Historical)</option>
                    <option value={2021}>2021 (Historical)</option>
                    <option value={2020}>2020 (Historical)</option>
                  </select>
                )}

                {/* 4. Month Selector (Revealed after Year is selected) */}
                {Boolean(selectedYear) && (
                  <select
                    aria-label="Month"
                    value={selectedMonth || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      handleMonthChange(val);
                    }}
                    className="h-10 w-full sm:w-auto sm:min-w-[140px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                  >
                    <option value="">Select Month</option>
                    {MONTH_NAMES.map((name, idx) => {
                      const monthNum = idx + 1;
                      const isBeyondHorizon = selectedYear === 2027 && monthNum > 10;
                      return (
                        <option
                          key={monthNum}
                          value={monthNum}
                          disabled={isBeyondHorizon}
                        >
                          {name}{isBeyondHorizon ? ' (Beyond Horizon)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* 5. Predict Crime Button (Revealed after Month is selected) */}
                {Boolean(selectedMonth) && (
                  <button
                    type="button"
                    onClick={handlePredictCrime}
                    disabled={isPredicting || !selectedStateId || !selectedDistrictId || !selectedYear || !selectedMonth}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#1769AA] px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                  title="Reset all active filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {predictError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{predictError}</span>
              </div>
            )}
          </div>

          {/* Initial Prompt State */}
          {!isPredicting && !predictionResult && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center shadow-2xs">
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

          {/* Loading Indicator */}
          {isPredicting && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-6 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#1769AA]">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generating predictions...</span>
              </div>
            </div>
          )}

          {/* PREDICTION DASHBOARD CONTAINER */}
          {!isPredicting && predictionResult && (
            <div className="space-y-4">
              {/* SECTION 1: DISTRICT HEADER & OVERALL FORECAST */}
              <div className="rounded-lg border border-[#D9E1EA] bg-white shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#D9E1EA]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                    <h2 className="text-sm font-bold text-[#0B1F3A]">
                      {predictionResult.district_name}, {predictionResult.state_name}
                    </h2>
                  </div>

                  {predictionResult.is_derived_from_parent && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Derived from {predictionResult.parent_district_name}
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {predictionResult.is_available ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* 1. Predicted Incidents */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                        <span className="text-xs font-medium text-[#5D6878]">
                          {predictionResult.is_historical ? 'Confirmed Incidents' : 'Predicted Incidents'}
                        </span>
                        <div className="mt-1">
                          <span className="text-2xl font-bold font-mono text-[#1769AA]">
                            {predictionResult.display_value !== undefined && predictionResult.display_value !== null
                              ? predictionResult.display_value.toFixed(2)
                              : '—'}
                          </span>
                          {predictionResult.is_forecast &&
                            predictionResult.prediction_interval_lower !== null &&
                            predictionResult.prediction_interval_lower !== undefined &&
                            predictionResult.prediction_interval_upper !== null &&
                            predictionResult.prediction_interval_upper !== undefined && (
                              <span className="text-[11px] text-[#7C8796] block mt-0.5">
                                80% CI: [{predictionResult.prediction_interval_lower.toFixed(2)} – {predictionResult.prediction_interval_upper.toFixed(2)}]
                              </span>
                            )}
                        </div>
                      </div>

                      {/* 2. Expected Trend */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                        <span className="text-xs font-medium text-[#5D6878]">Expected Trend</span>
                        <div className="mt-1 flex items-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                              trendLabel === 'Higher'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : trendLabel === 'Lower'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {trendLabel === 'Higher' && <ArrowUpRight className="h-3.5 w-3.5" />}
                            {trendLabel === 'Lower' && <ArrowDownRight className="h-3.5 w-3.5" />}
                            {trendLabel === 'Similar' && <Minus className="h-3.5 w-3.5" />}
                            {trendLabel}
                          </span>
                        </div>
                      </div>

                      {/* 3. Top Predicted Crime Type */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                        <span className="text-xs font-medium text-[#5D6878]">Top Predicted Crime Type</span>
                        {topCrimeType ? (
                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <span className="text-base font-bold text-[#0B1F3A] truncate" title={topCrimeType.crime_name}>
                              {topCrimeType.crime_name}
                            </span>
                            <span className="text-2xl font-bold font-mono text-[#1769AA] shrink-0">
                              {topCrimeType.predicted_count.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-[#7C8796]">
                            No active crime types projected
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-amber-950">Prediction unavailable</h4>
                          <p className="mt-1 text-amber-800">
                            {predictionResult.explanation ||
                              'No projection is available for the selected period.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Caseload Timeline Chart */}
                  {actualVsPred && chartPoints.length > 0 && (
                    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4">
                      <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                            Historical vs. Predicted Trend
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
                                  return [val ? `${Number(val).toLocaleString()} incidents` : '—', 'Historical Observed'];
                                }
                                if (name === 'current_future') {
                                  return [val ? `${Number(val).toLocaleString()} estimated incidents` : '—', 'Estimated Incidents'];
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
                  )}
                </div>
              </div>

              {/* SECTION 2: INTERACTIVE SIDE-BY-SIDE BREAKDOWN (MATCHING CRIME ANALYTICS BEHAVIOR) */}
              {breakdownResult && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* LEFT PANEL: 4 CATEGORY CARDS WITH EXPAND/COLLAPSE VIEW ALL (5 COLS) */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="flex items-center justify-between h-6 mb-1">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#1769AA]" />
                        <h3 className="text-[13px] font-bold text-[#0B1F3A]">
                          Predicted Crime Categories
                        </h3>
                      </div>
                      {selectedCategoryId !== null && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(null)}
                          className="text-[11px] font-semibold text-[#1769AA] hover:underline cursor-pointer"
                        >
                          Show All (21)
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {displayedCategories.map((cat) => {
                        const style = CATEGORY_STYLES[cat.category_name] || CATEGORY_STYLES['Other Crime'];
                        const Icon = style.icon;
                        const isSelected = selectedCategoryId === cat.category_id;

                        return (
                          <div
                            key={cat.category_id}
                            onClick={() =>
                              setSelectedCategoryId(isSelected ? null : cat.category_id)
                            }
                            className={`rounded-lg border px-3.5 py-3 transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? 'border-[#1769AA] bg-blue-50/50 shadow-xs'
                                : 'border-[#D9E1EA] bg-white hover:border-[#BAC7D5] hover:bg-slate-50/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`rounded p-1 ${style.bg} ${style.text} border ${style.border} shrink-0`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-[13px] font-bold text-[#0B1F3A] truncate">
                                  {cat.category_name}
                                </span>
                                <span className="text-[11px] text-[#5D6878] shrink-0">
                                  ({cat.crime_types_count} types)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[12px] shrink-0 ml-2">
                                <span className="font-bold text-[#0B1F3A]">
                                  {cat.predicted_count.toFixed(2)}
                                </span>
                                <span className="text-[#5D6878]">
                                  ({cat.share_of_total_percent.toFixed(1)}%)
                                </span>
                              </div>
                            </div>

                            {/* Slim horizontal progress bar representing percentage share */}
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full ${style.bar}`}
                                style={{ width: `${Math.min(cat.share_of_total_percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* View All / Show Less for Categories matching Crime Analytics pattern */}
                    {breakdownResult.categories.length > 2 && (
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowAllCategories((prev) => !prev)}
                          className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors cursor-pointer"
                        >
                          {showAllCategories ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* RIGHT PANEL: PREDICTED CRIME TYPES WITH VIEW ALL (7 COLS) */}
                  <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs min-h-[300px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5 shrink-0">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-4 w-4 text-[#1769AA]" />
                          <h3 className="text-[13px] font-bold text-[#0B1F3A]">
                            {selectedCategory
                              ? `Predicted Crime Types — ${selectedCategory.category_name}`
                              : 'Predicted Crime Types — All Categories'}
                          </h3>
                        </div>
                        <span className="text-xs text-[#5D6878] font-medium">
                          {sortedCrimeTypes.length} {sortedCrimeTypes.length === 1 ? 'type' : 'types'}
                        </span>
                      </div>

                      {/* List of Ranked Crime Types */}
                      <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                        {displayedCrimeTypes.map((t, idx) => {
                          const pctOfMax = maxTypeCount > 0 ? (t.predicted_count / maxTypeCount) * 100 : 0;
                          const sevBadge = SEVERITY_BADGES[t.severity_level] || SEVERITY_BADGES.LOW;
                          const catStyle = CATEGORY_STYLES[t.category_name] || CATEGORY_STYLES['Other Crime'];

                          return (
                            <div
                              key={t.crime_type_id}
                              className="group rounded-md border border-slate-100 p-2 hover:bg-slate-50/70 transition-colors duration-150"
                            >
                              <div className="flex items-center justify-between text-[12px] mb-1 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[11px] font-bold text-[#5D6878] w-5 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-semibold text-[#0B1F3A] truncate" title={t.crime_name}>
                                    {t.crime_name}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#7C8796] bg-[#F4F7FA] px-1.5 py-0.5 rounded border border-[#E2E8F0] shrink-0">
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

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}
                                  >
                                    {t.severity_level}
                                  </span>
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-[#0B1F3A] text-[12px]">
                                      {t.predicted_count.toFixed(2)}
                                    </span>
                                    <span className="font-mono text-[10.5px] text-[#5D6878] ml-1.5">
                                      ({selectedCategory
                                        ? `${t.share_of_category_percent.toFixed(1)}%`
                                        : `${t.share_of_total_percent.toFixed(1)}%`})
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Slim relative-volume bar */}
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${catStyle.bar}`}
                                  style={{ width: `${Math.max(pctOfMax, 2)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* View All / Show Less footer toggle matching Crime Analytics pattern */}
                    {sortedCrimeTypes.length > TYPE_COMPACT_LIMIT && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowAllTypes((prev) => !prev)}
                          className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors cursor-pointer"
                        >
                          {showAllTypes ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    )}
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
