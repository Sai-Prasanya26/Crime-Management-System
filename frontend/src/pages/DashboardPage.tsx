import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ShieldCheck,
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
  const [filters, setFilters] = useState<FilterParams>({});
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');
  const [rankingMetric, setRankingMetric] = useState<'volume' | 'rate'>('volume');

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

  return (
    <DashboardLayout
      title="Crime Intelligence Dashboard"
      subtitle="Operational overview of reported crime activity and jurisdictional patterns."
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
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
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
        <>
          {/* Key Performance Indicators (StatCards) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Incidents"
              value={overview.total_incidents.toLocaleString()}
              subtext="Historical reported incidents"
              icon={FileText}
              color="indigo"
            />
            <StatCard
              title="Closed Cases"
              value={overview.cases.closed.toLocaleString()}
              subtext={`${overview.cases.clearance_rate_pct.toFixed(1)}% clearance rate`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Open Cases"
              value={overview.cases.open.toLocaleString()}
              subtext={`${(100 - overview.cases.clearance_rate_pct).toFixed(1)}% in active inquiry`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Clearance Rate"
              value={`${overview.cases.clearance_rate_pct.toFixed(1)}%`}
              subtext="Formal disposition ratio"
              icon={ShieldCheck}
              color="blue"
            />
            <StatCard
              title="Jurisdictions"
              value={overview.total_districts.toLocaleString()}
              subtext={`${overview.total_states} States & UTs`}
              icon={Globe2}
              color="cyan"
            />
          </div>

          {/* Row 1: Trend Line & Crime Domain Donut */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {trends && (
                <CrimeTrendChart
                  data={trends.items}
                  interval={trendInterval}
                  onIntervalChange={handleIntervalChange}
                  isLoading={isRefreshing}
                />
              )}
            </div>
            <div className="lg:col-span-4">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
          </div>

          {/* Row 2: Diurnal Curve & Crime Type Distribution */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              {types && (
                <CrimeTypeChart
                  data={types.items}
                  totalIncidents={types.total_incidents}
                />
              )}
            </div>
            <div className="lg:col-span-6">
              {hourly && (
                <HourlyDistributionChart
                  data={hourly.items}
                  peakHour={hourly.peak_hour}
                />
              )}
            </div>
          </div>

          {/* Row 3: High Risk Jurisdictions & Victim Demographics */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {topDistricts && (
                <TopDistrictsTable
                  districts={topDistricts.items}
                  metric={rankingMetric}
                  onMetricChange={handleMetricChange}
                  isLoading={isRefreshing}
                />
              )}
            </div>
            <div className="lg:col-span-5">
              {demographics && (
                <VictimDemographicsChart data={demographics} />
              )}
            </div>
          </div>

          {/* Row 4: Weapon Distribution & Operational Summary */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {weapons && (
                <WeaponDistributionChart
                  data={weapons.items}
                  totalIncidents={weapons.total_incidents}
                />
              )}
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-[#DCE2EA] bg-white p-4 sm:p-5 shadow-2xs lg:col-span-4">
              <div>
                <h4 className="text-[16px] font-bold text-[#172033]">
                  Operational Intelligence Summary
                </h4>
                <p className="mt-0.5 text-[12px] text-[#5B6577]">
                  Crime Intelligence &amp; Management Portal
                </p>
                <div className="mt-3.5 space-y-2 text-[12px]">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[#5B6577]">
                    <span>Analytical Coverage:</span>
                    <span className="font-semibold text-[#172033]">Multi-Year Longitudinal</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[#5B6577]">
                    <span>Incident Scope:</span>
                    <span className="font-semibold text-[#16805C]">Verified Jurisdictions</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[#5B6577]">
                    <span>Demographic Baseline:</span>
                    <span className="font-medium text-[#172033]">Census Standardized</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[#5B6577]">
                    <span>Security Clearance:</span>
                    <span className="font-semibold text-blue-700">Restricted Operations</span>
                  </div>
                  <div className="flex justify-between pb-1 text-[#5B6577]">
                    <span>System Status:</span>
                    <span className="font-bold text-[#16805C] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active &amp; Operational
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 rounded border border-[#DCE2EA] bg-slate-50/70 p-2.5 text-[11px] text-[#5B6577] leading-relaxed">
                All metrics are computed dynamically from verified operational records according to active state, district, and date analysis parameters.
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
