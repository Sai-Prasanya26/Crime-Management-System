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
  ExternalLink,
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
  CategoryForecastItem,
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

  // Geographic and temporal controls
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Prediction result and state
  const [predictionResult, setPredictionResult] = useState<DistrictMonthPrediction | null>(null);
  const [breakdownData, setBreakdownData] = useState<PredictionBreakdownResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Timeline chart state for selected district
  const [actualVsPred, setActualVsPred] = useState<ActualVsPredictedData | null>(null);

  // Category filter state (synchronized between category cards and table)
  // 'ALL' or exact category name: 'Violent Crime' | 'Other Crime' | 'Traffic Fatality' | 'Fire Accident'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // View All / Show Less toggles matching original pattern
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [showAllTypes, setShowAllTypes] = useState<boolean>(false);

  // Page initialization loading/error
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Initial load: Fetch states and initialize with first state and district
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true);
    setPageError(null);
    try {
      const statesRes = await geographyApi.getStates();
      const stateList = statesRes.items || [];
      setStates(stateList);

      if (stateList.length > 0) {
        const firstState = stateList[0];
        setSelectedStateId(firstState.id);

        const distRes = await geographyApi.getDistricts(firstState.id, 'current');
        const distList = distRes.items || [];
        setDistricts(distList);

        if (distList.length > 0) {
          const firstDistrict = distList[0];
          setSelectedDistrictId(firstDistrict.id);

          // Fetch initial chart, prediction, and 21-crime breakdown in parallel
          const [chartData, predData, bdData] = await Promise.all([
            predictionApi.getActualVsPredicted(firstDistrict.id),
            predictionApi.getDistrictMonthPrediction(firstDistrict.id, 2026, 11),
            predictionApi.getPredictionBreakdown(firstDistrict.id, 2026, 11).catch(() => null),
          ]);
          setActualVsPred(chartData);
          setPredictionResult(predData);
          setBreakdownData(bdData);
        }
      }
    } catch (err: any) {
      setPageError(err?.message || 'Failed to initialize crime predictions.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When State / UT changes, load districts and update district selection
  const handleStateChange = async (stateId: number | undefined) => {
    setSelectedStateId(stateId);
    setPredictError(null);

    if (!stateId) {
      setDistricts([]);
      setSelectedDistrictId(undefined);
      setActualVsPred(null);
      setPredictionResult(null);
      setBreakdownData(null);
      return;
    }

    try {
      const res = await geographyApi.getDistricts(stateId, 'current');
      const items = res.items || [];
      setDistricts(items);

      if (items.length > 0) {
        const newDistrictId = items[0].id;
        setSelectedDistrictId(newDistrictId);

        // Update chart, prediction, and breakdown for the new district
        const [chartData, predData, bdData] = await Promise.all([
          predictionApi.getActualVsPredicted(newDistrictId),
          predictionApi.getDistrictMonthPrediction(newDistrictId, selectedYear, selectedMonth),
          predictionApi.getPredictionBreakdown(newDistrictId, selectedYear, selectedMonth).catch(() => null),
        ]);
        setActualVsPred(chartData);
        setPredictionResult(predData);
        setBreakdownData(bdData);
      } else {
        setSelectedDistrictId(undefined);
        setActualVsPred(null);
        setPredictionResult(null);
        setBreakdownData(null);
      }
    } catch {
      setDistricts([]);
      setSelectedDistrictId(undefined);
    }
  };

  // When year changes, automatically adapt month if outside valid range
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (year === 2027 && selectedMonth > 10) {
      setSelectedMonth(1);
    } else if (year === 2026 && selectedMonth > 3 && selectedMonth < 11) {
      setSelectedMonth(11);
    }
  };

  // Month options partitioned by validity in selected year
  const monthOptions = useMemo(() => {
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

  // When district changes, refresh chart for the newly chosen district
  const handleDistrictChange = async (districtId: number | undefined) => {
    setSelectedDistrictId(districtId);
    setPredictError(null);

    if (districtId) {
      try {
        const chartData = await predictionApi.getActualVsPredicted(districtId);
        setActualVsPred(chartData);
      } catch {
        // Keep existing or gracefully handle
      }
    }
  };

  // Run prediction when user clicks "Predict Crime"
  const handlePredictCrime = async () => {
    if (!selectedDistrictId) {
      setPredictError('Please select a district to predict crime.');
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
      setShowAllCategories(false);
      setShowAllTypes(false);
    } catch (err: any) {
      setPredictError(err?.response?.data?.detail || err?.message || 'Failed to estimate crime incidents.');
      setPredictionResult(null);
      setBreakdownData(null);
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

  // Dynamically identify the crime type with highest predicted count
  const topCrimeType = useMemo(() => {
    if (!breakdownData || !breakdownData.crime_types || breakdownData.crime_types.length === 0) {
      return null;
    }
    const maxItem = breakdownData.crime_types.reduce((max, curr) =>
      curr.predicted_count > (max?.predicted_count ?? -1) ? curr : max,
      breakdownData.crime_types[0]
    );
    if (!maxItem || maxItem.predicted_count <= 0) {
      return null;
    }
    return maxItem;
  }, [breakdownData]);

  // Categories supporting compact view (top 2) and expanded view (all 4)
  const displayedCategories = useMemo(() => {
    if (!breakdownData || !breakdownData.categories) return [];
    if (showAllCategories) return breakdownData.categories;
    const base = breakdownData.categories.slice(0, 2);
    if (activeCategoryFilter !== 'ALL' && !base.some((c) => c.category_name.toLowerCase() === activeCategoryFilter.toLowerCase())) {
      const active = breakdownData.categories.find((c) => c.category_name.toLowerCase() === activeCategoryFilter.toLowerCase());
      if (active) return [...base, active];
    }
    return base;
  }, [breakdownData, showAllCategories, activeCategoryFilter]);

  // Sorted crime types according to active category filter
  const sortedCrimeTypes = useMemo(() => {
    if (!breakdownData || !breakdownData.crime_types) return [];
    const pool =
      activeCategoryFilter !== 'ALL'
        ? breakdownData.crime_types.filter(
            (ct) => ct.category_name.toLowerCase() === activeCategoryFilter.toLowerCase()
          )
        : breakdownData.crime_types;
    return [...pool].sort((a, b) => b.predicted_count - a.predicted_count);
  }, [breakdownData, activeCategoryFilter]);

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

  // Filter 21 canonical crime types for detailed table
  const tableCrimeTypes = useMemo(() => {
    if (!breakdownData || !breakdownData.crime_types) return [];
    if (activeCategoryFilter === 'ALL') return breakdownData.crime_types;
    return breakdownData.crime_types.filter(
      (t: CrimeTypeForecastItem) => t.category_name.toLowerCase() === activeCategoryFilter.toLowerCase()
    );
  }, [breakdownData, activeCategoryFilter]);

  // Category toggle handler (synchronizes category cards and table tabs)
  const handleCategoryToggle = (catName: string) => {
    if (activeCategoryFilter.toLowerCase() === catName.toLowerCase()) {
      setActiveCategoryFilter('ALL');
    } else {
      setActiveCategoryFilter(catName);
    }
  };

  return (
    <DashboardLayout
      hideSidebar
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
          {/* SECTION 1: COMPACT SELECTION CONTROLS */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* State / UT Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  State / UT
                </label>
                <select
                  aria-label="State or Union Territory"
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleStateChange(val);
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

              {/* District Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  District
                </label>
                <select
                  aria-label="District"
                  value={selectedDistrictId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleDistrictChange(val);
                  }}
                  disabled={!selectedStateId || districts.length === 0}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!selectedStateId
                      ? 'Select State First'
                      : districts.length > 0
                      ? 'Select District'
                      : 'No Districts Found'}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Month
                </label>
                <select
                  aria-label="Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <optgroup label="Supported Forecasts & Records">
                    {monthOptions
                      .filter((m) => m.isSupported)
                      .map((m) => (
                        <option key={m.month} value={m.month}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                  {monthOptions.some((m) => !m.isSupported) && (
                    <optgroup label="Outside Forecast Horizon (Unavailable)">
                      {monthOptions
                        .filter((m) => !m.isSupported)
                        .map((m) => (
                          <option key={m.month} value={m.month}>
                            {m.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Year Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Year
                </label>
                <select
                  aria-label="Year"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value={2027}>2027 (Forecast)</option>
                  <option value={2026}>2026 (Forecast)</option>
                  <option value={2025}>2025 (Historical)</option>
                  <option value={2024}>2024 (Historical)</option>
                  <option value={2023}>2023 (Historical)</option>
                  <option value={2022}>2022 (Historical)</option>
                  <option value={2021}>2021 (Historical)</option>
                  <option value={2020}>2020 (Historical)</option>
                </select>
              </div>

              {/* Predict Crime Button */}
              <div>
                <button
                  type="button"
                  onClick={handlePredictCrime}
                  disabled={isPredicting || !selectedDistrictId}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#1769AA] px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50"
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
              </div>
            </div>

            {/* Compact Horizon Indicator Note */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#5D6878] border-t border-slate-100 pt-2">
              <span>
                Active forecast horizon:{' '}
                <strong className="text-emerald-700 font-semibold">Nov 2026 – Oct 2027</strong> • Past forecasts:{' '}
                <strong className="text-slate-700 font-semibold">Jan – Mar 2026</strong> • Historical records:{' '}
                <strong className="text-[#1769AA] font-semibold">2020 – 2025</strong>
              </span>
            </div>

            {predictError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{predictError}</span>
              </div>
            )}
          </div>

          {/* SECTION 2: COMPACT PREDICTION RESULT */}
          {isPredicting && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-6 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#1769AA]">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Estimating crime incidents...</span>
              </div>
            </div>
          )}

          {!isPredicting && predictionResult && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                  <span className="text-sm font-bold text-[#0B1F3A]">
                    {predictionResult.district_name}, {predictionResult.state_name} —{' '}
                    {MONTH_NAMES[predictionResult.month - 1]} {predictionResult.year}
                  </span>
                </div>
                {predictionResult.is_available && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {predictionResult.is_historical ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-xs font-medium">
                        Historical actual record
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                        Statistical forecast
                      </span>
                    )}
                    {predictionResult.is_derived_from_parent && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-xs font-medium"
                        title={`Analytics resolve to Census 2011 baseline parent: ${predictionResult.parent_district_name || 'parent jurisdiction'}`}
                      >
                        Census 2011 baseline ({predictionResult.parent_district_name})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {predictionResult.is_available ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. Estimated Crime Incidents */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-medium text-[#5D6878]">
                        {predictionResult.is_historical ? 'Confirmed Crime Incidents' : 'Estimated Crime Incidents'}
                      </span>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold font-mono text-[#1769AA]">
                          {predictionResult.display_value !== undefined && predictionResult.display_value !== null
                            ? predictionResult.display_value.toFixed(2)
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {predictionResult.is_historical ? 'incidents' : 'estimated'}
                        </span>
                      </div>
                    </div>
                    {predictionResult.prediction_interval_lower !== undefined &&
                      predictionResult.prediction_interval_lower !== null &&
                      predictionResult.prediction_interval_upper !== undefined &&
                      predictionResult.prediction_interval_upper !== null && (
                        <div className="mt-2 text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                          80% CI: [{predictionResult.prediction_interval_lower.toFixed(2)} – {predictionResult.prediction_interval_upper.toFixed(2)}]
                        </div>
                      )}
                  </div>

                  {/* 2. Expected Trend */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-medium text-[#5D6878]">Expected Trend</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-bold ${
                            trendLabel === 'Higher'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : trendLabel === 'Lower'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {trendLabel === 'Higher' && <ArrowUpRight className="h-4 w-4" />}
                          {trendLabel === 'Lower' && <ArrowDownRight className="h-4 w-4" />}
                          {trendLabel === 'Similar' && <Minus className="h-4 w-4" />}
                          {trendLabel}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">vs baseline</span>
                      </div>
                    </div>
                    <span className="mt-2 text-[11px] text-slate-500">
                      Based on pre-forecast baseline comparison
                    </span>
                  </div>

                  {/* 3. Top Projected Offence */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                    <div>
                      <span className="text-xs font-medium text-[#5D6878]">Top Projected Offence</span>
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
                          No active offences projected
                        </div>
                      )}
                    </div>
                    {topCrimeType && (
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {topCrimeType.category_name}
                        </span>
                        <span className="text-slate-500">
                          ({topCrimeType.share_of_total_percent.toFixed(1)}% of district total)
                        </span>
                      </div>
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
          )}

          {/* SECTION 3: COMPACT DISTRICT TIMELINE CHART */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">
                    Incident Trend &amp; Forecast — {currentDistrictName}
                  </h3>
                  <p className="text-xs text-[#5D6878]">
                    Historical observed counts and estimated projections.
                  </p>
                </div>
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

          {/* SECTION 4: INTERACTIVE CATEGORY BREAKDOWN & OFFENCE PROFILES */}
          {breakdownData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT PANEL: 4 CATEGORY SUMMARY CARDS */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between h-6 mb-1">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#1769AA]" />
                    <h3 className="text-[13px] font-bold text-[#0B1F3A]">
                      Predicted Crime Categories
                    </h3>
                  </div>
                  {activeCategoryFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setActiveCategoryFilter('ALL')}
                      className="text-[11px] font-semibold text-[#1769AA] hover:underline cursor-pointer"
                    >
                      Show All (21)
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {displayedCategories.map((cat: CategoryForecastItem) => {
                    const style = CATEGORY_STYLES[cat.category_name] || CATEGORY_STYLES['Other Crime'];
                    const Icon = style.icon;
                    const isSelected = activeCategoryFilter.toLowerCase() === cat.category_name.toLowerCase();

                    return (
                      <div
                        key={cat.category_id}
                        onClick={() => handleCategoryToggle(cat.category_name)}
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

                {/* View All / Show Less for Categories */}
                {breakdownData.categories.length > 2 && (
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

              {/* RIGHT PANEL: PREDICTED CRIME TYPES WITH RANKING & RELATIVE VOLUME */}
              <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs min-h-[300px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-[#1769AA]" />
                      <h3 className="text-[13px] font-bold text-[#0B1F3A]">
                        {activeCategoryFilter !== 'ALL'
                          ? `Predicted Offences — ${activeCategoryFilter}`
                          : 'Predicted Offences — All Categories'}
                      </h3>
                    </div>
                    <span className="text-xs text-[#5D6878] font-medium">
                      {sortedCrimeTypes.length} {sortedCrimeTypes.length === 1 ? 'offence' : 'offences'}
                    </span>
                  </div>

                  {/* List of Ranked Crime Types */}
                  <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                    {displayedCrimeTypes.map((t: CrimeTypeForecastItem, idx: number) => {
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
                                  ({activeCategoryFilter !== 'ALL'
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

                {/* View All / Show Less footer toggle */}
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

          {/* SECTION 5: DETAILED OFFENCE-WISE PREDICTION TABLE */}
          {predictionResult && predictionResult.is_available && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">
                    Offence-Wise Predictions — {currentDistrictName} ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                  </h3>
                  <p className="text-xs text-[#5D6878]">
                    Hierarchical compositional estimates reconciled with Phase 8 district forecast ({predictionResult.display_value?.toFixed(2)} total incidents).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                    navigate(
                      `/resources?state_id=${selectedStateId}&district_id=${selectedDistrictId}&period=${pStr}&tab=ai_optimization`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1769AA] text-white hover:bg-[#12558a] transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <span>Open in Resource Optimization</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-3 overflow-x-auto text-xs">
                {['ALL', 'Violent Crime', 'Other Crime', 'Traffic Fatality', 'Fire Accident'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                      activeCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#1769AA] text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'All (21)' : cat}
                  </button>
                ))}
              </div>

              {/* 21 Offence Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Offence / Crime Type</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Predicted Incidents</th>
                      <th className="py-2.5 px-3 text-right">Baseline ({selectedYear >= 2026 ? '2025' : selectedYear - 1})</th>
                      <th className="py-2.5 px-3 text-center">Trend</th>
                      <th className="py-2.5 px-3 text-center">Severity / Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableCrimeTypes.length > 0 ? (
                      tableCrimeTypes.map((item: CrimeTypeForecastItem) => (
                        <tr key={item.crime_type_id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{item.crime_name}</span>
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                {item.crime_code}
                              </span>
                              {item.is_sparse && (
                                <span className="text-[9.5px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Rare
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category_name}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#1769AA]">
                            {item.predicted_count.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {item.historical_baseline_count !== null && item.historical_baseline_count !== undefined
                              ? item.historical_baseline_count.toFixed(2)
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                                item.trend_status === 'Increasing'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.trend_status === 'Decreasing'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.trend_status === 'Increasing' && <ArrowUpRight className="h-3 w-3" />}
                              {item.trend_status === 'Decreasing' && <ArrowDownRight className="h-3 w-3" />}
                              {item.trend_status === 'Stable' && <Minus className="h-3 w-3" />}
                              {item.trend_status === 'Increasing' ? 'Higher' : item.trend_status === 'Decreasing' ? 'Lower' : 'Similar'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.severity_level === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : item.severity_level === 'HIGH'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                  : item.severity_level === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.severity_level}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                          {breakdownData ? 'No offences match the selected filter.' : 'Loading offence-wise breakdown...'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {tableCrimeTypes.length > 0 && (
                    <tfoot className="bg-[#F8FAFC] border-t border-slate-200 font-semibold text-[11px]">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-700">
                          {activeCategoryFilter === 'ALL'
                            ? 'Reconciled Total (All 21 Offences)'
                            : `Category Total (${activeCategoryFilter})`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1769AA]">
                          {tableCrimeTypes.reduce((acc, curr) => acc + curr.predicted_count, 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {tableCrimeTypes
                            .reduce((acc, curr) => acc + (curr.historical_baseline_count || 0), 0)
                            .toFixed(2)}
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-400 text-center font-normal">
                          {activeCategoryFilter === 'ALL'
                            ? `Matches district estimate (${predictionResult.display_value?.toFixed(2)}) within ±0.05`
                            : 'Additive subset'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <p className="mt-2.5 text-[11px] text-[#5D6878] italic">
                * Offence-wise predictions and category distributions are derived from pre-forecast historical incident composition using Two-Level Empirical Bayes shrinkage and additively reconciled with the Phase 8 aggregate ML forecast.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
