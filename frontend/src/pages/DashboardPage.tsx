import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
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
import { useSearchParams } from 'react-router-dom';
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

  // API State
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
      // Parallel fetch for all analytical endpoints
      const [
        overviewRes,
        trendsRes,
        catRes,
        typesRes,
        hourlyRes,
        demogRes,
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
      setDemographics(demogRes);
      setWeapons(weaponsRes);
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

  return (
    <DashboardLayout
      hideSidebar={isFullscreen}
      icon={LayoutDashboard}
      title="Crime Intelligence Overview"
      subtitle={
        isFullscreen
          ? 'Jurisdiction incidents, metrics and trends overview'
          : 'Current intelligence and incident activity'
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

      {/* Main Dashboard Grid */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-4">
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

          {/* Analytics Area Section */}
          <div id="analytics" className="space-y-4 pt-1">
            {/* Row 1: LEFT 65% Crime Trend, RIGHT 35% Crime Category Distribution */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div id="trends-section" className="lg:col-span-8 scroll-mt-20">
                {trends && (
                  <CrimeTrendChart
                    data={trends.items}
                    interval={trendInterval}
                    onIntervalChange={handleIntervalChange}
                    isLoading={isRefreshing}
                  />
                )}
              </div>
              <div id="categories-section" className="lg:col-span-4 scroll-mt-20">
                {categories && (
                  <CrimeCategoryChart
                    data={categories.items}
                    totalIncidents={categories.total_incidents}
                  />
                )}
              </div>
            </div>

            {/* Row 2: Crime Type Analysis & Geographic Crime Distribution (Top Jurisdictions) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div id="types-section" className="lg:col-span-6 scroll-mt-20">
                {types && (
                  <CrimeTypeChart
                    data={types.items}
                    totalIncidents={types.total_incidents}
                  />
                )}
              </div>
              <div id="districts-section" className="lg:col-span-6 scroll-mt-20">
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

            {/* Row 3: Hourly Crime Pattern, Victim Demographics, Weapon Analysis */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div id="hourly-section" className="lg:col-span-4 scroll-mt-20">
                {hourly && (
                  <HourlyDistributionChart
                    data={hourly.items}
                    peakHour={hourly.peak_hour}
                  />
                )}
              </div>
              <div id="demographics-section" className="lg:col-span-4 scroll-mt-20">
                {demographics && (
                  <VictimDemographicsChart data={demographics} />
                )}
              </div>
              <div id="weapons-section" className="lg:col-span-4 scroll-mt-20">
                {weapons && (
                  <WeaponDistributionChart
                    data={weapons.items}
                    totalIncidents={weapons.total_incidents}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
