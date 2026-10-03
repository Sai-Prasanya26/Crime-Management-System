import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  BarChart3,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Activity,
  Sliders,
  BadgeDollarSign,
  ArrowRight,
  Layers,
} from 'lucide-react';
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

  // Sync with URL query parameters (state_id, district_id, year)
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
  }, [searchParams]);

  // Executive Overview State
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
      setError(err?.message || 'Failed to fetch overview analytics from backend API.');
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

  // Dedicated operational intelligence modules catalog
  const operationalModules = [
    {
      title: 'Crime Analytics',
      subtitle: 'Pattern & Category Intelligence',
      description: 'Analyze offenses across categories, types, victim demographics, weapons, and diurnal shifts.',
      path: '/analytics',
      icon: BarChart3,
      badge: 'Analytical',
    },
    {
      title: 'Geographic Intelligence',
      subtitle: 'Jurisdictional Spatial Analysis',
      description: 'Explore district-level crime concentrations, hot spot indices, and demographic matrices.',
      path: '/districts',
      icon: MapPin,
      badge: 'Spatial GIS',
    },
    {
      title: 'Crime Trends',
      subtitle: 'Temporal Trajectory & Patterns',
      description: 'Review longitudinal time series across years, months, and cyclical variations.',
      path: '/trends',
      icon: TrendingUp,
      badge: 'Longitudinal',
    },
    {
      title: 'Risk Assessment',
      subtitle: 'Jurisdictional Threat Profiles',
      description: 'Per-capita threat scoring, severity indicators, and high-priority jurisdiction tiering.',
      path: '/risk',
      icon: ShieldAlert,
      badge: 'Threat Matrix',
    },
    {
      title: 'Predictions',
      subtitle: 'Statistical Forecasting',
      description: 'Longitudinal statistical projections with empirical 95% confidence intervals.',
      path: '/predictions',
      icon: Activity,
      badge: 'Forecasting',
    },
    {
      title: 'Resource Optimization',
      subtitle: 'Workforce & Patrol Balancing',
      description: 'Model deployment schedules, patrol units, and personnel shortfall remediation.',
      path: '/resources',
      icon: Sliders,
      badge: 'Workforce',
    },
    {
      title: 'Budget Intelligence',
      subtitle: 'Capital Expenditure Estimates',
      description: 'Unit cost projections and jurisdictional financial requirements mapped to workload.',
      path: '/budget',
      icon: BadgeDollarSign,
      badge: 'Financial',
    },
    {
      title: 'Intelligence Reports',
      subtitle: 'Operational Briefing Packages',
      description: 'Standardized operational packages, executive summaries, and cryptographically verified logs.',
      path: '/reports',
      icon: FileText,
      badge: 'Disclosures',
    },
  ];

  return (
    <DashboardLayout
      title="Crime Intelligence Overview"
      subtitle="Strategic command center overview and high-level jurisdictional metrics"
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

      {/* Command Center Overview Workspace */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-5">
          {/* Key Performance Indicators (5 compact KPI cards) */}
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

          {/* Executive Overview Visualizations: Longitudinal Trajectory (65%) & Category Distribution (35%) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 min-w-0">
              {trends && (
                <CrimeTrendChart
                  data={trends.items}
                  interval={trendInterval}
                  onIntervalChange={handleIntervalChange}
                  isLoading={isRefreshing}
                />
              )}
            </div>
            <div className="lg:col-span-4 min-w-0">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
          </div>

          {/* Operations Command Hub: Direct Launchpads into Dedicated Full-Page Modules */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                    Operational Intelligence Modules
                  </h3>
                </div>
                <p className="text-[12px] text-[#5D6878] mt-0.5">
                  Launch dedicated full-page analytical workspaces for detailed jurisdiction investigation
                </p>
              </div>
              <span className="rounded bg-[#F4F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#5D6878] border border-[#D9E1EA] self-start sm:self-auto">
                8 Dedicated Intelligence Systems
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {operationalModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.title}
                    to={module.path}
                    className="group flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-4 transition-all duration-150 hover:bg-white hover:border-[#1769AA] hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="rounded-md bg-white p-2 border border-[#D9E1EA] text-[#0B1F3A] group-hover:bg-[#EAF3FA] group-hover:text-[#1769AA] group-hover:border-[#BAC7D5] transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6878] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                          {module.badge}
                        </span>
                      </div>
                      <h4 className="text-[14px] font-bold text-[#0B1F3A] group-hover:text-[#1769AA] transition-colors leading-snug">
                        {module.title}
                      </h4>
                      <p className="text-[11px] font-medium text-[#1769AA] mb-1.5">
                        {module.subtitle}
                      </p>
                      <p className="text-[12px] text-[#5D6878] leading-relaxed line-clamp-2">
                        {module.description}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[12px] font-semibold text-[#1769AA] group-hover:text-[#12345B]">
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Jurisdictional Crime Activity Table */}
          <div className="min-w-0">
            {topDistricts && (
              <TopDistrictsTable
                districts={topDistricts.items}
                metric={rankingMetric}
                onMetricChange={handleMetricChange}
                isLoading={isRefreshing}
              />
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
