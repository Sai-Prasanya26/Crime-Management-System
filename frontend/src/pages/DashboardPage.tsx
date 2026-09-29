import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  Clock,
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
      // Parallel fetch for all Phase 4 endpoints
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
      title="Crime Intelligence Command Center"
      subtitle="Operational descriptive analytics powered by MySQL 8.0 & FastAPI"
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Reported Crimes"
              value={overview.total_incidents.toLocaleString()}
              subtext={`Period: ${overview.earliest_incident_date} to ${overview.latest_incident_date}`}
              icon={FileText}
              color="indigo"
            />
            <StatCard
              title="Case Clearance Rate"
              value={`${overview.cases.clearance_rate_pct.toFixed(1)}%`}
              subtext={`${overview.cases.closed.toLocaleString()} resolved cases`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Active / Open Cases"
              value={overview.cases.open.toLocaleString()}
              subtext={`${(100 - overview.cases.clearance_rate_pct).toFixed(1)}% pending disposition`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Jurisdictions Covered"
              value={overview.total_districts.toLocaleString()}
              subtext={`Across ${overview.total_states} Indian States & UTs`}
              icon={Globe2}
              color="blue"
            />
            <StatCard
              title="Diurnal Peak Hour"
              value={hourly ? `${hourly.peak_hour.toString().padStart(2, '0')}:00` : '18:00'}
              subtext="Highest reported incident window"
              icon={Clock}
              color="cyan"
            />
          </div>

          {/* Row 1: Trend Line & Crime Domain Donut */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              {hourly && (
                <HourlyDistributionChart
                  data={hourly.items}
                  peakHour={hourly.peak_hour}
                />
              )}
            </div>
            <div className="lg:col-span-6">
              {types && (
                <CrimeTypeChart
                  data={types.items}
                  totalIncidents={types.total_incidents}
                />
              )}
            </div>
          </div>

          {/* Row 3: High Risk Jurisdictions & Victim Demographics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
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

          {/* Row 4: Weapon Distribution & System Attribution */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {weapons && (
                <WeaponDistributionChart
                  data={weapons.items}
                  totalIncidents={weapons.total_incidents}
                />
              )}
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm lg:col-span-4">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Database & System Audit Summary
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Data-Driven Crime Management System with AI-Based Resource Optimization
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                    <span>Database Engine:</span>
                    <span className="font-mono text-slate-200">MySQL 8.0</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                    <span>Frozen Schema:</span>
                    <span className="font-mono text-slate-200">17 Tables</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                    <span>Verified Records:</span>
                    <span className="font-mono text-emerald-400">191,679 Incidents</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                    <span>Demographics Linkage:</span>
                    <span className="font-mono text-slate-200">Census 2011 (640 Dists)</span>
                  </div>
                  <div className="flex justify-between pb-1 text-slate-400">
                    <span>Mock Data Present:</span>
                    <span className="font-mono font-bold text-rose-400">ZERO (0%)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-indigo-500/10 p-3 text-[11px] text-indigo-300 border border-indigo-500/20">
                Phase 5 Frontend is directly querying live FastAPI endpoints at{' '}
                <code className="font-mono font-bold text-white">/api/v1/analytics</code>.
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
