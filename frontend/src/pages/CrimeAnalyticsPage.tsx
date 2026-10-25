import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DashboardFilters from '../components/filters/DashboardFilters';
import { CrimeClassificationSection } from '../components/analytics/CrimeClassificationSection';
import { TemporalAnalysisSection } from '../components/analytics/TemporalAnalysisSection';
import { CrimeDetailTable } from '../components/analytics/CrimeDetailTable';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  TrendResponse,
} from '../types';

export const CrimeAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({
    geography_mode: (searchParams.get('geography_mode') as 'current' | 'historical') || 'current',
  });

  // Sync initial filters from URL search parameters (state_id, district_id, year, geography_mode)
  useEffect(() => {
    const stateId = searchParams.get('state_id');
    const districtId = searchParams.get('district_id');
    const year = searchParams.get('year');
    const geoMode = searchParams.get('geography_mode') as 'current' | 'historical' | null;

    setFilters((prev) => ({
      ...prev,
      geography_mode: geoMode || prev.geography_mode || 'current',
      ...(stateId ? { state_id: Number(stateId) } : {}),
      ...(districtId ? { district_id: Number(districtId) } : {}),
      ...(year ? { start_date: `${year}-01-01`, end_date: `${year}-12-31` } : {}),
    }));
  }, [searchParams]);

  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
    const newParams = new URLSearchParams();
    if (newFilters.geography_mode) newParams.set('geography_mode', newFilters.geography_mode);
    if (newFilters.state_id) newParams.set('state_id', String(newFilters.state_id));
    if (newFilters.district_id) newParams.set('district_id', String(newFilters.district_id));
    if (newFilters.start_date) newParams.set('start_date', newFilters.start_date);
    if (newFilters.end_date) newParams.set('end_date', newFilters.end_date);
    setSearchParams(newParams, { replace: true });
  };

  // Dedicated analytical data states
  const [overview, setOverview] = useState<CrimeOverviewResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);
  const [types, setTypes] = useState<TypeBreakdownResponse | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<TrendResponse | null>(null);
  const [yearlyTrends, setYearlyTrends] = useState<TrendResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Parallel fetch targeted specifically to offense classification, rankings, trends, and detail inventory
      const [
        overviewRes,
        catRes,
        typesRes,
        monthlyRes,
        yearlyRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
        analyticsApi.getTrends('month', filters),
        analyticsApi.getTrends('year', filters),
      ]);

      setOverview(overviewRes);
      setCategories(catRes);
      setTypes(typesRes);
      setMonthlyTrends(monthlyRes);
      setYearlyTrends(yearlyRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch analytical metrics from backend API.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return (
    <DashboardLayout
      hideSidebar
      icon={BarChart3}
      title="Crime Analytics"
      subtitle="Detailed analysis of crime categories, offense types, temporal patterns, and reported incidents."
      onRefresh={() => fetchAnalyticsData(true)}
      isRefreshing={isRefreshing}
      action={
        <Link
          to="/dashboard?workspace=fullscreen"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:border-[#BAC7D5] hover:bg-[#F4F7FA] hover:text-[#0B1F3A] transition-colors shadow-2xs shrink-0"
          title="Navigate to Executive Dashboard"
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-[#1769AA]" />
          <span>Executive Dashboard</span>
        </Link>
      }
    >
      {/* Analytics Filter Toolbar */}
      <DashboardFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        isLoading={isLoading || isRefreshing}
      />

      {/* Loading State */}
      {isLoading && !overview && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating statutory offense analytics, categories, and longitudinal data..." />
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title="Analytics Service Error"
          message={error}
          onRetry={() => fetchAnalyticsData()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && overview && overview.total_incidents === 0 && (
        <EmptyState
          title="No Crime Records Found"
          message="No recorded incidents match the selected state, district, or timeframe."
          onClearFilters={() => setFilters({})}
        />
      )}

      {/* Dedicated Crime Analytics Workspace Sections (Non-Duplicative) */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-6">
          {/* SECTION 1: Crime Classification & Ranked Offenses (Interactive Category filter + ranked types) */}
          <CrimeClassificationSection
            categories={categories}
            types={types}
          />

          {/* SECTION 2: Longitudinal Offense Trajectory & Period Comparison (Monthly/Yearly with Annual YoY Dynamics) */}
          <TemporalAnalysisSection
            monthlyTrends={monthlyTrends}
            yearlyTrends={yearlyTrends}
            isLoading={isRefreshing}
          />

          {/* SECTION 3: Codified Statutory Crime Detail Table (All 21 IPC offenses with search, filter, and multi-column sort) */}
          <CrimeDetailTable
            types={types}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CrimeAnalyticsPage;
