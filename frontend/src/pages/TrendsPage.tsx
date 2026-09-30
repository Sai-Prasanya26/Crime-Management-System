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
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-12 shadow-xs">
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
        <div className="space-y-6">
          {/* Trend Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 text-[#64748B]">
                <BarChart2 className="h-4 w-4 text-[#4F46E5]" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Range Volume
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                {totalIncidents.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Aggregated over {trends.total_points} {interval}ly buckets
              </p>
            </div>

            <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 text-[#64748B]">
                <TrendingUp className="h-4 w-4 text-[#D97706]" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Peak Incident Period
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#D97706]">
                {highestPeriod ? highestPeriod.period : '—'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                {highestPeriod ? `${highestPeriod.incident_count.toLocaleString()} cases` : '—'}
              </p>
            </div>

            <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 text-[#64748B]">
                <CalendarRange className="h-4 w-4 text-[#059669]" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Interval Granularity
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#059669] capitalize">
                {interval}ly
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
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
