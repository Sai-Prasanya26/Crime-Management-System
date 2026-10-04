import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  BarChart2,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardFilters from '../components/filters/DashboardFilters';
import CrimeTrendChart from '../components/charts/CrimeTrendChart';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi } from '../api';
import type { FilterParams, TrendResponse } from '../types';

export const TrendsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({});
  const [interval, setInterval] = useState<'year' | 'month' | 'day'>('month');
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync filters from URL search params (year, state_id, district_id)
  useEffect(() => {
    const year = searchParams.get('year');
    const stateId = searchParams.get('state_id');
    const districtId = searchParams.get('district_id');
    if (year || stateId || districtId) {
      setFilters((prev) => ({
        ...prev,
        ...(year ? { start_date: `${year}-01-01`, end_date: `${year}-12-31` } : {}),
        ...(stateId ? { state_id: Number(stateId) } : {}),
        ...(districtId ? { district_id: Number(districtId) } : {}),
      }));
    }
  }, [searchParams]);

  const fetchTrends = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await analyticsApi.getTrends(interval, filters);
      setTrends(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crime trends.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, interval]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const items = useMemo(() => trends?.items || [], [trends]);

  // Derived Trend Comparison & Momentum Metrics
  const trendMetrics = useMemo(() => {
    if (items.length < 2) return null;
    const first = items[0].incident_count;
    const last = items[items.length - 1].incident_count;
    const netChangePct = ((last - first) / (first || 1)) * 100;

    let peak = items[0];
    let trough = items[0];
    for (const item of items) {
      if (item.incident_count > peak.incident_count) peak = item;
      if (item.incident_count < trough.incident_count) trough = item;
    }

    // Projected next period volume based on recent momentum
    const recentDelta = last - items[items.length - 2].incident_count;
    const projectedNext = Math.round(last + recentDelta * 0.5);

    return {
      netChangePct,
      peak,
      trough,
      projectedNext,
      isIncreasing: netChangePct > 0,
      totalVolume: items.reduce((sum, item) => sum + item.incident_count, 0),
    };
  }, [items]);

  return (
    <DashboardLayout
      hideSidebar
      icon={TrendingUp}
      title="Crime Trends & Forecasting"
      subtitle="Temporal patterns, change over time and longitudinal trajectories"
      onRefresh={() => fetchTrends(true)}
      isRefreshing={isRefreshing}
    >
      <DashboardFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        isLoading={isLoading || isRefreshing}
      />

      {isLoading && !trends && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating longitudinal time-series data..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Failed to Load Trends"
          message={error}
          onRetry={() => fetchTrends()}
        />
      )}

      {!isLoading && !error && trends && (
        <div className="space-y-4">
          {/* SECTION 2: Trend Comparison & Momentum Summary */}
          {trendMetrics && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Overall Trajectory */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Net Trajectory
                  </span>
                  {trendMetrics.isIncreasing ? (
                    <ArrowUpRight className="h-4 w-4 text-rose-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      trendMetrics.isIncreasing ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {trendMetrics.netChangePct >= 0 ? '+' : ''}
                    {trendMetrics.netChangePct.toFixed(1)}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {trendMetrics.isIncreasing ? 'INCREASING' : 'DECELERATING'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Across {items.length} reporting {interval}s
                </p>
              </div>

              {/* Peak Period */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Peak Activity
                  </span>
                  <CalendarRange className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-[#0A192F]">
                  {trendMetrics.peak.period}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {trendMetrics.peak.incident_count.toLocaleString()} recorded crimes
                </p>
              </div>

              {/* Trough / Lowest Period */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Baseline Period
                  </span>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-[#0A192F]">
                  {trendMetrics.trough.period}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {trendMetrics.trough.incident_count.toLocaleString()} recorded crimes
                </p>
              </div>

              {/* SECTION 3: Short-Term Forecast Projection */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                    Projected Next
                  </span>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-blue-900">
                  {trendMetrics.projectedNext.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Forward {interval}ly projection estimate
                </p>
              </div>
            </div>
          )}

          {/* SECTION 1: Historical Crime Trend Chart */}
          <CrimeTrendChart
            data={trends.items}
            interval={interval}
            onIntervalChange={(newInt) => setInterval(newInt)}
            isLoading={isRefreshing}
          />

          {/* OPTIONAL CONCISE TREND TABLE: Period Summary Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Chronological Trend Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Discrete periodic incident volume and step variance
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                {items.length} Periods
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                    <th className="py-2.5 pl-3">Reporting Period</th>
                    <th className="py-2.5 px-3 text-right">Incident Volume</th>
                    <th className="py-2.5 px-3 text-right">Step Variance</th>
                    <th className="py-2.5 px-3 text-center">Directional Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((row, idx) => {
                    const prevCount = idx > 0 ? items[idx - 1].incident_count : row.incident_count;
                    const delta = row.incident_count - prevCount;
                    const deltaPct = idx > 0 ? ((delta / prevCount) * 100).toFixed(1) : '—';
                    const isUp = delta > 0;

                    return (
                      <tr key={row.period} className="hover:bg-slate-50/70 h-10 transition-colors">
                        <td className="py-2 pl-3 font-semibold text-[#0A192F] flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{row.period}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.incident_count.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {idx === 0 ? (
                            <span className="text-slate-400">Baseline</span>
                          ) : (
                            <span className={isUp ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {isUp ? '+' : ''}{deltaPct}%
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {idx === 0 ? (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              INITIAL
                            </span>
                          ) : isUp ? (
                            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                              ▲ SURGE
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              ▼ REDUCED
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
        </div>
      )}
    </DashboardLayout>
  );
};

export default TrendsPage;
