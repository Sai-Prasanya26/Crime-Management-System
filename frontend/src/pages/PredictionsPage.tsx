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
