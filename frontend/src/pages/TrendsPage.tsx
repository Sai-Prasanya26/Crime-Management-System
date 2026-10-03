import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardFilters from '../components/filters/DashboardFilters';
import CrimeTrendChart from '../components/charts/CrimeTrendChart';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi } from '../api';
import type { FilterParams, TrendResponse } from '../types';
import { TrendingUp, BarChart2, CalendarRange } from 'lucide-react';

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

  const totalIncidents = trends
    ? trends.items.reduce((sum, item) => sum + item.incident_count, 0)
    : 0;

  const highestPeriod = trends?.items.reduce(
    (max, cur) => (cur.incident_count > (max?.incident_count || 0) ? cur : max),
    trends.items[0]
  );

  return (
    <DashboardLayout
      hideSidebar
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
          {/* Trend Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5D6878]">
                <div className="rounded p-1 bg-[#EAF3FA] text-[#1769AA]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                  Total Range Volume
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#0B1F3A] leading-none">
                {totalIncidents.toLocaleString()}
              </p>
              <p className="mt-1 text-[12px] text-[#5D6878]">
                Aggregated over {trends.total_points} {interval}ly periods
              </p>
            </div>

            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5D6878]">
                <div className="rounded p-1 bg-amber-50 text-[#C98512]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                  Peak Incident Period
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#C98512] leading-none">
                {highestPeriod ? highestPeriod.period : '—'}
              </p>
              <p className="mt-1 text-[12px] text-[#5D6878]">
                {highestPeriod ? `${highestPeriod.incident_count.toLocaleString()} cases` : '—'}
              </p>
            </div>

            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-[#5D6878]">
                <div className="rounded p-1 bg-emerald-50 text-[#16845B]">
                  <CalendarRange className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                  Interval Granularity
                </span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#16845B] capitalize leading-none">
                {interval}ly
              </p>
              <p className="mt-1 text-[12px] text-[#5D6878]">
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
