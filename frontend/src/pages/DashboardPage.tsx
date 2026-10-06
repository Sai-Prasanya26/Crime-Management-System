import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  LayoutDashboard,
  Calendar,
  Scale,
  ArrowRight,
  Activity,
  MapPin,
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
import CrimeTypeChart from '../components/charts/CrimeTypeChart';
import HourlyDistributionChart from '../components/charts/HourlyDistributionChart';
import VictimDemographicsChart from '../components/charts/VictimDemographicsChart';
import WeaponDistributionChart from '../components/charts/WeaponDistributionChart';
import TopDistrictsTable from '../components/charts/TopDistrictsTable';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  TrendResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  HourlyDistributionResponse,
  VictimDemographicsResponse,
  WeaponDistributionResponse,
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

  // Comprehensive Crime Intelligence Overview Data States
  const [overview, setOverview] = useState<CrimeOverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);
  const [types, setTypes] = useState<TypeBreakdownResponse | null>(null);
  const [hourly, setHourly] = useState<HourlyDistributionResponse | null>(null);
  const [demographics, setDemographics] = useState<VictimDemographicsResponse | null>(null);
  const [weapons, setWeapons] = useState<WeaponDistributionResponse | null>(null);
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
      // Parallel fetch for all 8 comprehensive dashboard analytics endpoints
      const [
        overviewRes,
        trendsRes,
        catRes,
        typesRes,
        hourlyRes,
        demographicsRes,
        weaponsRes,
        districtsRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getTrends(trendInterval, filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
        analyticsApi.getHourly(filters),
        analyticsApi.getDemographics(filters),
        analyticsApi.getWeapons(filters),
        analyticsApi.getTopDistricts({
          metric: rankingMetric,
          limit: 10,
          state_id: filters.state_id,
        }),
      ]);

      setOverview(overviewRes);
      setTrends(trendsRes);
      setCategories(catRes);
      setTypes(typesRes);
      setHourly(hourlyRes);
      setDemographics(demographicsRes);
      setWeapons(weaponsRes);
      setTopDistricts(districtsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch comprehensive analytics from backend API.');
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

  // Derived Case Status & Adjudication Metrics
  const caseMetrics = useMemo(() => {
    if (!overview) return null;
    const clearancePct = overview.cases.clearance_rate_pct;
    const totalCases = overview.total_incidents;
    const closedCases = overview.cases.closed;
    const openCases = overview.cases.open;
    const backlogPct = 100 - clearancePct;

    return {
      clearancePct,
      backlogPct,
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
          ? 'Comprehensive jurisdiction incidents, patterns, demographics and case disposition'
          : 'Executive command center and multi-dimensional crime intelligence overview'
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
          <LoadingState message="Fetching live crime intelligence overview from database..." />
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

      {/* Main Comprehensive Executive Dashboard Grid */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-5">
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

          {/* 2. Longitudinal Crime Trend (Area chart with interval switch) */}
          <div id="trends-section" className="w-full min-w-0">
            {trends && (
              <CrimeTrendChart
                data={trends.items}
                interval={trendInterval}
                onIntervalChange={handleIntervalChange}
                isLoading={isRefreshing}
              />
            )}
          </div>

          {/* 3. Crime Classification & Types (Categories 5 cols + Types 7 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div id="categories-section" className="lg:col-span-5 min-w-0">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
            <div id="types-section" className="lg:col-span-7 min-w-0">
              {types && (
                <CrimeTypeChart
                  data={types.items}
                  totalIncidents={types.total_incidents}
                />
              )}
            </div>
          </div>

          {/* 4. Temporal Patterns & Weapon Involvement (Hourly 6 cols + Weapons 6 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div id="hourly-section" className="lg:col-span-6 min-w-0">
              {hourly && (
                <HourlyDistributionChart
                  data={hourly.items}
                  peakHour={hourly.peak_hour}
                />
              )}
            </div>
            <div id="weapons-section" className="lg:col-span-6 min-w-0">
              {weapons && (
                <WeaponDistributionChart
                  data={weapons.items}
                  totalIncidents={weapons.total_incidents}
                />
              )}
            </div>
          </div>

          {/* 5. Victim Demographics Profile (Age Cohorts & Gender Split) */}
          <div id="demographics-section" className="w-full min-w-0">
            {demographics && (
              <VictimDemographicsChart
                data={demographics}
              />
            )}
          </div>

          {/* 6. Geographic Intelligence & Case Disposition Health */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Top Jurisdictions Table (7 cols) */}
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

            {/* Case Status & Legal Adjudication Health Panel (5 cols) */}
            <div
              id="cases-section"
              className="lg:col-span-5 min-w-0 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                        Case Adjudication &amp; Disposition Health
                      </h3>
                      <p className="text-[11px] text-[#5D6878]">
                        Institutional clearance throughput and active case resolution
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                    Live Disposition
                  </span>
                </div>

                {caseMetrics && (
                  <div className="space-y-3.5 text-xs">
                    {/* Resolution Progress Meter */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700">Formal Clearance Progress</span>
                        <span className="font-bold text-[#0B1F3A]">
                          {caseMetrics.clearancePct.toFixed(1)}% Resolved
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="bg-emerald-600 transition-all duration-300"
                          style={{ width: `${caseMetrics.clearancePct}%` }}
                          title={`Resolved: ${caseMetrics.clearancePct.toFixed(1)}%`}
                        />
                        <div
                          className="bg-amber-500 transition-all duration-300"
                          style={{ width: `${caseMetrics.backlogPct}%` }}
                          title={`Active Inquiry: ${caseMetrics.backlogPct.toFixed(1)}%`}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
                          {caseMetrics.closedCases.toLocaleString()} Closed
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-amber-700">
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                          {caseMetrics.openCases.toLocaleString()} In Inquiry ({caseMetrics.backlogPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Operational Throughput Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-medium text-[11px] mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Disposed Caseload</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-950">
                          {caseMetrics.closedCases.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          Final legal closure reached
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                        <div className="flex items-center gap-1.5 text-amber-800 font-medium text-[11px] mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Active Inquiries</span>
                        </div>
                        <p className="text-lg font-bold text-amber-950">
                          {caseMetrics.openCases.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          Under police investigation
                        </p>
                      </div>
                    </div>

                    {/* Incident Reporting Window */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-medium">Incident Timeline:</span>
                      </div>
                      <span className="font-semibold text-[#0B1F3A]">
                        {caseMetrics.earliest} to {caseMetrics.latest}
                      </span>
                    </div>

                    {/* Jurisdictional Coverage Scope */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="h-4 w-4 text-[#1769AA]" />
                        <span className="font-medium">Jurisdictional Reach:</span>
                      </div>
                      <span className="font-semibold text-[#0B1F3A]">
                        {caseMetrics.totalDistricts} Districts ({caseMetrics.totalStates} States/UTs)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Links to In-depth Specialized Workspaces */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/districts"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-[#1769AA] transition-colors"
                >
                  <Activity className="h-3.5 w-3.5 text-slate-400" />
                  <span>Geographic Map</span>
                </Link>
                <Link
                  to="/analytics"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors"
                >
                  <span>Crime Analytics Workspace</span>
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
