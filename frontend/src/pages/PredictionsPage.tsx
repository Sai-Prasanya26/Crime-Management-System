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
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

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
    setActualVsPred(null);
  };

  // When Year changes, clear dependent month and result
  const handleYearChange = (year: number | undefined) => {
    setSelectedYear(year);
    setSelectedMonth(undefined);
    setPredictError(null);
    setPredictionResult(null);
  };

  // When Month changes, clear previous prediction until Predict is clicked
  const handleMonthChange = (month: number | undefined) => {
    setSelectedMonth(month);
    setPredictError(null);
    setPredictionResult(null);
  };

  // Reset Filters handler: restores initial unselected state
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setDistricts([]);
    setPredictionResult(null);
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
      const [predData, chartData] = await Promise.all([
        predictionApi.getDistrictMonthPrediction(selectedDistrictId, selectedYear, selectedMonth),
        predictionApi.getActualVsPredicted(selectedDistrictId),
      ]);
      setPredictionResult(predData);
      setActualVsPred(chartData);
    } catch (err: any) {
      setPredictError(err?.response?.data?.detail || err?.message || 'Failed to estimate crime incidents.');
      setPredictionResult(null);
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

  // Trend mapping: Higher, Similar, Lower
  const trendLabel = useMemo(() => {
    if (!predictionResult || !predictionResult.is_available) return null;
    if (predictionResult.crime_level === 'Moderate') return 'Similar';
    return predictionResult.crime_level;
  }, [predictionResult]);

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
          {/* SECTION 1: PROGRESSIVE SELECTION CONTROLS */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Forecast Filter:</span>
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
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
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

          {/* SECTION 2: Initial Prompt State */}
          {!isPredicting && !predictionResult && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center shadow-2xs">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3FA] text-[#1769AA] mb-3">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">No Prediction Generated Yet</h3>
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

          {/* SECTION 3: COMPACT PREDICTION RESULT */}
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
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                <span className="text-sm font-bold text-[#0B1F3A]">
                  {predictionResult.district_name}, {predictionResult.state_name} —{' '}
                  {MONTH_NAMES[predictionResult.month - 1]} {predictionResult.year}
                </span>
              </div>

              {predictionResult.is_available ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Estimated Crime Incidents */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                    <span className="text-xs font-medium text-[#5D6878]">
                      {predictionResult.is_historical ? 'Confirmed Crime Incidents' : 'Estimated Crime Incidents'}
                    </span>
                    <div className="mt-1">
                      <span className="text-3xl font-bold font-mono text-[#1769AA]">
                        {predictionResult.display_value !== undefined && predictionResult.display_value !== null
                          ? predictionResult.display_value.toFixed(2)
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Expected Trend */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
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
                    </div>
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

          {/* SECTION 4: COMPACT DISTRICT TIMELINE CHART */}
          {!isPredicting && actualVsPred && chartPoints.length > 0 && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#EAF3FA] p-1.5 text-[#1769AA]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">
                    Historical vs Predicted Trend
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
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
