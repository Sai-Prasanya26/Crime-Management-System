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
      title="Crime Trends"
      subtitle="Review temporal patterns in reported crime activity across selected jurisdictions."
      onRefresh={() => fetchTrends(true)}
      isRefreshing={isRefreshing}
    >
      <DashboardFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        isLoading={isLoading || isRefreshing}
      />

      {isLoading && !trends && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
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
          {/* Trend Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5B6577]">
                <div className="rounded p-1 bg-blue-50 text-[#1D4ED8]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6577]">
                  Total Range Volume
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#172033] leading-none">
                {totalIncidents.toLocaleString()}
              </p>
              <p className="mt-1 text-[12px] text-[#5B6577]">
                Aggregated over {trends.total_points} {interval}ly buckets
              </p>
            </div>

            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5B6577]">
                <div className="rounded p-1 bg-amber-50 text-[#B7791F]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6577]">
                  Peak Incident Period
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#B7791F] leading-none">
                {highestPeriod ? highestPeriod.period : '—'}
              </p>
              <p className="mt-1 text-[12px] text-[#5B6577]">
                {highestPeriod ? `${highestPeriod.incident_count.toLocaleString()} cases` : '—'}
              </p>
            </div>

            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5B6577]">
                <div className="rounded p-1 bg-emerald-50 text-[#16805C]">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6577]">
                  Interval Granularity
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#16805C] capitalize leading-none">
                {interval}ly
              </p>
              <p className="mt-1 text-[12px] text-[#5B6577]">
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
