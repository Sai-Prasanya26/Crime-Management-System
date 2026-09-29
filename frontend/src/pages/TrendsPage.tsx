import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardFilters from '../components/filters/DashboardFilters';
import CrimeTrendChart from '../components/charts/CrimeTrendChart';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi } from '../api';
import type { FilterParams, TrendResponse } from '../types';
import { TrendingUp, BarChart2, CalendarRange } from 'lucide-react';

export const TrendsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterParams>({});
  const [interval, setInterval] = useState<'year' | 'month' | 'day'>('month');
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const totalIncidents = trends
    ? trends.items.reduce((sum, item) => sum + item.incident_count, 0)
    : 0;

  const highestPeriod = trends?.items.reduce(
    (max, cur) => (cur.incident_count > (max?.incident_count || 0) ? cur : max),
    trends.items[0]
  );

  return (
    <DashboardLayout
      title="Longitudinal Crime Trend Intelligence"
      subtitle="Temporal incident volume fluctuations across 2020-2025"
      onRefresh={() => fetchTrends(true)}
      isRefreshing={isRefreshing}
    >
      <DashboardFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        isLoading={isLoading || isRefreshing}
      />

      {isLoading && !trends && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12">
          <LoadingState message="Aggregating time-series data from MySQL..." />
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
        <div className="space-y-6">
          {/* Trend Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <BarChart2 className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Range Volume
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {totalIncidents.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Aggregated over {trends.total_points} {interval}ly buckets
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Peak Incident Period
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-300">
                {highestPeriod ? highestPeriod.period : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {highestPeriod ? `${highestPeriod.incident_count.toLocaleString()} cases` : '—'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarRange className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Interval Granularity
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-300 capitalize">
                {interval}ly
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {trends.total_points} discrete time points
              </p>
            </div>
          </div>

          {/* Main Trend Chart */}
          <CrimeTrendChart
            data={trends.items}
            interval={interval}
            onIntervalChange={(newInt) => setInterval(newInt)}
            isLoading={isRefreshing}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default TrendsPage;
