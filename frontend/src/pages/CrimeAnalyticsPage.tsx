import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DashboardFilters from '../components/filters/DashboardFilters';
import { CrimeClassificationSection } from '../components/analytics/CrimeClassificationSection';
import { CrimeDetailTable } from '../components/analytics/CrimeDetailTable';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
} from '../types';

export const CrimeAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({
    geography_mode: 'current',
  });

  // Sync initial filters from URL search parameters (state_id, district_id, year, start_date, end_date)
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
  }, [searchParams]);

  const handleFilterChange = (newFilters: FilterParams) => {
    setFilters(newFilters);
    const newParams = new URLSearchParams();
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
      // Parallel fetch targeted specifically to offense classification, rankings, and detail inventory
      const [
        overviewRes,
        catRes,
        typesRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
      ]);

      setOverview(overviewRes);
      setCategories(catRes);
      setTypes(typesRes);
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
      onRefresh={() => fetchAnalyticsData(true)}
      isRefreshing={isRefreshing}
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
          <LoadingState message="Loading crime analytics..." />
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
        <div className="space-y-4">
          {/* SECTION 1: Crime Classification & Ranked Offenses (Interactive Category filter + ranked types) */}
          <CrimeClassificationSection
            categories={categories}
            types={types}
          />

          {/* SECTION 2: Codified Statutory Crime Detail Table (All 21 IPC offenses with search, filter, and multi-column sort) */}
          <CrimeDetailTable
            types={types}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CrimeAnalyticsPage;
