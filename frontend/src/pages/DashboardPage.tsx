import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({
    geography_mode: 'current',
  });
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');
  const [rankingMetric, setRankingMetric] = useState<'volume' | 'rate'>('volume');

  // Sync with URL query parameters (state_id, district_id, year, start_date, end_date, dimension)
  useEffect(() => {
    const stateId = searchParams.get('state_id');
    const districtId = searchParams.get('district_id');
    const year = searchParams.get('year');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    setFilters({
      geography_mode: 'current',
      state_id: stateId ? Number(stateId) : undefined,
      district_id: districtId ? Number(districtId) : undefined,
      start_date: startDate || (year && year !== 'ALL' ? `${year}-01-01` : undefined),
      end_date: endDate || (year && year !== 'ALL' ? `${year}-12-31` : undefined),
    });

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
          geography_mode: 'current',
          start_date: filters.start_date,
          end_date: filters.end_date,
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
    const newParams = new URLSearchParams();
    // Preserve full-screen workspace parameter if present
    const workspaceParam = searchParams.get('workspace');
    if (workspaceParam) {
      newParams.set('workspace', workspaceParam);
    }
    const fullscreenParam = searchParams.get('fullscreen');
    if (fullscreenParam) {
      newParams.set('fullscreen', fullscreenParam);
    }
    if (newFilters.state_id) newParams.set('state_id', String(newFilters.state_id));
    if (newFilters.district_id) newParams.set('district_id', String(newFilters.district_id));
    if (newFilters.start_date) newParams.set('start_date', newFilters.start_date);
    if (newFilters.end_date) newParams.set('end_date', newFilters.end_date);
    setSearchParams(newParams, { replace: true });
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

  return (
    <DashboardLayout
      hideSidebar={isFullscreen}
      icon={LayoutDashboard}
      title="Crime Intelligence Overview"
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
          onClearFilters={() => handleFilterChange({})}
        />
      )}

      {/* Main Comprehensive Executive Dashboard Grid */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-4">
          {/* 1. Key Performance Indicators (5 compact KPI cards) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Total Incidents"
              value={overview.total_incidents.toLocaleString()}
              icon={FileText}
              color="navy"
            />
            <StatCard
              title="Open Cases"
              value={overview.cases.open.toLocaleString()}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Closed Cases"
              value={overview.cases.closed.toLocaleString()}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Clearance Rate"
              value={`${overview.cases.clearance_rate_pct.toFixed(1)}%`}
              icon={ShieldCheck}
              color="blue"
            />
            <StatCard
              title={
                overview.jurisdiction_label ||
                (filters.geography_mode === 'historical' ? 'Census 2011 Districts' : 'Administrative Entities')
              }
              value={
                overview.jurisdiction_value ||
                (filters.geography_mode === 'historical'
                  ? `${overview.total_districts.toLocaleString()} Districts`
                  : `${overview.total_states} States & UTs`)
              }
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

          {/* 3. Crime Classification & Types (Equal 2-Column Desktop Grid) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
            <div id="categories-section" className="min-w-0 h-full">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
            <div id="types-section" className="min-w-0 h-full">
              {types && (
                <CrimeTypeChart
                  data={types.items}
                  totalIncidents={types.total_incidents}
                />
              )}
            </div>
          </div>

          {/* 4. Temporal Patterns & Weapon Involvement (Equal 2-Column Desktop Grid) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
            <div id="hourly-section" className="min-w-0 h-full">
              {hourly && (
                <HourlyDistributionChart
                  data={hourly.items}
                  peakHour={hourly.peak_hour}
                />
              )}
            </div>
            <div id="weapons-section" className="min-w-0 h-full">
              {weapons && (
                <WeaponDistributionChart
                  data={weapons.items}
                  totalIncidents={weapons.total_incidents}
                />
              )}
            </div>
          </div>

          {/* 5. Victim Demographics Profile (Full-Width Responsive Card) */}
          <div id="demographics-section" className="w-full min-w-0">
            {demographics && (
              <VictimDemographicsChart
                data={demographics}
              />
            )}
          </div>

          {/* 6. Geographic Intelligence (Top Jurisdictions) */}
          <div id="districts-section" className="w-full min-w-0">
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
