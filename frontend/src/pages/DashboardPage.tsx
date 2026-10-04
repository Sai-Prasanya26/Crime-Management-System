import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  LayoutDashboard,
  Calendar,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DashboardFilters from '../components/filters/DashboardFilters';
import CrimeTrendChart from '../components/charts/CrimeTrendChart';
import CrimeCategoryChart from '../components/charts/CrimeCategoryChart';
import TopDistrictsTable from '../components/charts/TopDistrictsTable';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  TrendResponse,
  CategoryBreakdownResponse,
  TopDistrictsResponse,
} from '../types';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({});
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');
  const [rankingMetric, setRankingMetric] = useState<'volume' | 'rate'>('volume');

  // Sync with URL query parameters (state_id, district_id, year, dimension)
  useEffect(() => {
    const stateId = searchParams.get('state_id');
    const districtId = searchParams.get('district_id');
    const year = searchParams.get('year');

    if (stateId || districtId || year) {
      setFilters((prev) => ({
        ...prev,
        ...(stateId ? { state_id: Number(stateId) } : {}),
        ...(districtId ? { district_id: Number(districtId) } : {}),
        ...(year ? { start_date: `${year}-01-01`, end_date: `${year}-12-31` } : {}),
      }));
    }

    const dimension = searchParams.get('dimension');
    if (dimension) {
      setTimeout(() => {
        const el = document.getElementById(`${dimension}-section`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
    }
  }, [searchParams]);

  // Executive Overview Data States
  const [overview, setOverview] = useState<CrimeOverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Parallel fetch for core executive overview metrics
      const [overviewRes, trendsRes, catRes, districtsRes] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getTrends(trendInterval, filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getTopDistricts({
          metric: rankingMetric,
          limit: 10,
          state_id: filters.state_id,
        }),
      ]);

      setOverview(overviewRes);
      setTrends(trendsRes);
      setCategories(catRes);
      setTopDistricts(districtsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch analytics from backend API.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, trendInterval, rankingMetric]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
  };

  const handleIntervalChange = (newInterval: 'year' | 'month' | 'day') => {
    setTrendInterval(newInterval);
  };

  const handleMetricChange = (newMetric: 'volume' | 'rate') => {
    setRankingMetric(newMetric);
  };

  const isFullscreen =
    searchParams.get('workspace') === 'fullscreen' ||
    searchParams.get('fullscreen') === 'true';

  // Derived Operational Snapshot Metrics
  const operationalSnapshot = useMemo(() => {
    if (!overview) return null;
    const clearancePct = overview.cases.clearance_rate_pct;
    const totalCases = overview.total_incidents;
    const closedCases = overview.cases.closed;
    const openCases = overview.cases.open;

    return {
      clearancePct,
      totalCases,
      closedCases,
      openCases,
      earliest: overview.earliest_incident_date || '2020-01-01',
      latest: overview.latest_incident_date || '2025-12-31',
      totalDistricts: overview.total_districts,
      totalStates: overview.total_states,
    };
  }, [overview]);

  return (
    <DashboardLayout
      hideSidebar={isFullscreen}
      icon={LayoutDashboard}
      title="Crime Intelligence Overview"
      subtitle={
        isFullscreen
          ? 'Jurisdiction incidents, metrics and trends overview'
          : 'Executive summary and macro operational intelligence'
      }
      onRefresh={() => fetchDashboardData(true)}
      isRefreshing={isRefreshing}
    >
      {/* Global Filter Bar */}
      <DashboardFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        isLoading={isLoading || isRefreshing}
      />

      {/* Loading State */}
      {isLoading && !overview && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Fetching live crime intelligence from database..." />
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title="Backend Connection Error"
          message={error}
          onRetry={() => fetchDashboardData()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && overview && overview.total_incidents === 0 && (
        <EmptyState
          title="No Matching Incidents"
          message="No recorded crime events match the selected state, district, or date criteria."
          onClearFilters={() => setFilters({})}
        />
      )}

      {/* Main Executive Dashboard Grid */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-4">
          {/* 1. Key Performance Indicators (5 compact KPI cards) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Total Incidents"
              value={overview.total_incidents.toLocaleString()}
              subtext="Historical reported incidents"
              icon={FileText}
              color="navy"
            />
            <StatCard
              title="Open Cases"
              value={overview.cases.open.toLocaleString()}
              subtext={`${(100 - overview.cases.clearance_rate_pct).toFixed(1)}% in active inquiry`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Closed Cases"
              value={overview.cases.closed.toLocaleString()}
              subtext={`${overview.cases.clearance_rate_pct.toFixed(1)}% clearance rate`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Clearance Rate"
              value={`${overview.cases.clearance_rate_pct.toFixed(1)}%`}
              subtext="Formal disposition ratio"
              icon={ShieldCheck}
              color="blue"
            />
            <StatCard
              title="Active Jurisdictions"
              value={overview.total_districts.toLocaleString()}
              subtext={`${overview.total_states} States & UTs`}
              icon={Globe2}
              color="blue"
            />
          </div>

          {/* 2 & 3. Row 1: Overall Crime Trend (8 cols) & Crime Category Snapshot (4 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div id="trends-section" className="lg:col-span-8 min-w-0">
              {trends && (
                <CrimeTrendChart
                  data={trends.items}
                  interval={trendInterval}
                  onIntervalChange={handleIntervalChange}
                  isLoading={isRefreshing}
                />
              )}
            </div>
            <div id="categories-section" className="lg:col-span-4 min-w-0">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
          </div>

          {/* 4 & 5. Row 2: Top Jurisdictions (7 cols) & Operational Snapshot (5 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div id="districts-section" className="lg:col-span-7 min-w-0">
              {topDistricts && (
                <TopDistrictsTable
                  districts={topDistricts.items}
                  metric={rankingMetric}
                  onMetricChange={handleMetricChange}
                  isLoading={isRefreshing}
                />
              )}
            </div>

            {/* Operational Snapshot Card */}
            <div className="lg:col-span-5 min-w-0 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                        Operational Intelligence Snapshot
                      </h3>
                      <p className="text-[11px] text-[#5D6878]">
                        Current institutional posture and verified reporting metrics
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                    Live Telemetry
                  </span>
                </div>

                {operationalSnapshot && (
                  <div className="space-y-3 text-xs">
                    {/* Active Incident Window */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-medium">Incident Reporting Range:</span>
                      </div>
                      <span className="font-semibold text-[#0B1F3A]">
                        {operationalSnapshot.earliest} to {operationalSnapshot.latest}
                      </span>
                    </div>

                    {/* Case Adjudication Balance */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-slate-700">Case Resolution Balance:</span>
                        <span className="font-bold text-[#0B1F3A]">
                          {operationalSnapshot.clearancePct.toFixed(1)}% Cleared
                        </span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="bg-emerald-600 transition-all duration-300"
                          style={{ width: `${operationalSnapshot.clearancePct}%` }}
                        />
                        <div
                          className="bg-amber-500 transition-all duration-300"
                          style={{ width: `${100 - operationalSnapshot.clearancePct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{operationalSnapshot.closedCases.toLocaleString()} Closed</span>
                        <span>{operationalSnapshot.openCases.toLocaleString()} In Progress</span>
                      </div>
                    </div>

                    {/* Jurisdictional Scope */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Globe2 className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-medium">Coverage Density:</span>
                      </div>
                      <span className="font-semibold text-[#0B1F3A]">
                        {operationalSnapshot.totalDistricts} Districts across {operationalSnapshot.totalStates} States/UTs
                      </span>
                    </div>
                  </div>
                )}
              </div>

                {/* Quick Link to Dedicated Deep Workspace */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Need incident-level breakdown?</span>
                <Link
                  to="/analytics"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors"
                >
                  <span>Open Crime Analytics</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
