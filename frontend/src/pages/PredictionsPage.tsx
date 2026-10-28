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

const getMonthStatus = (month: number, year: number) => {
  if (year === 2027) {
    if (month === 1) return { isSupported: true, label: 'January (Active Forecast)', tag: 'Active Forecast' };
    return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Outside Horizon)`, tag: 'Outside Horizon' };
  }
  if (year === 2026) {
    if (month >= 11) return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Active Forecast)`, tag: 'Active Forecast' };
    if (month <= 3) return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Past Forecast)`, tag: 'Past Forecast' };
    return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Outside Horizon)`, tag: 'Outside Horizon' };
  }
  if (year >= 2020 && year <= 2025) {
    return { isSupported: true, label: `${MONTH_NAMES[month - 1]} (Historical Record)`, tag: 'Historical' };
  }
  return { isSupported: false, label: `${MONTH_NAMES[month - 1]} (Unsupported)`, tag: 'Unsupported' };
};

export const PredictionsPage: React.FC = () => {
  // Geographic and temporal controls
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Prediction result and state
  const [predictionResult, setPredictionResult] = useState<DistrictMonthPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Timeline chart state for selected district
  const [actualVsPred, setActualVsPred] = useState<ActualVsPredictedData | null>(null);

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

          // Fetch initial chart and prediction in parallel
          const [chartData, predData] = await Promise.all([
            predictionApi.getActualVsPredicted(firstDistrict.id),
            predictionApi.getDistrictMonthPrediction(firstDistrict.id, 2026, 11),
          ]);
          setActualVsPred(chartData);
          setPredictionResult(predData);
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
      return;
    }

    try {
      const res = await geographyApi.getDistricts(stateId, 'current');
      const items = res.items || [];
      setDistricts(items);

      if (items.length > 0) {
        const newDistrictId = items[0].id;
        setSelectedDistrictId(newDistrictId);

        // Update chart and prediction for the new district
        const [chartData, predData] = await Promise.all([
          predictionApi.getActualVsPredicted(newDistrictId),
          predictionApi.getDistrictMonthPrediction(newDistrictId, selectedYear, selectedMonth),
        ]);
        setActualVsPred(chartData);
        setPredictionResult(predData);
      } else {
        setSelectedDistrictId(undefined);
        setActualVsPred(null);
        setPredictionResult(null);
      }
    } catch {
      setDistricts([]);
      setSelectedDistrictId(undefined);
    }
  };

  // When year changes, automatically adapt month if outside valid range
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (year === 2027 && selectedMonth !== 1) {
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
                <strong className="text-emerald-700 font-semibold">Nov 2026 – Jan 2027</strong> • Past forecasts:{' '}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Estimated Crime Incidents */}
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
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
                        {predictionResult.is_historical ? 'incidents recorded' : 'estimated incidents'}
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
                      <span className="text-xs text-slate-500 font-medium">vs historical baseline</span>
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
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
