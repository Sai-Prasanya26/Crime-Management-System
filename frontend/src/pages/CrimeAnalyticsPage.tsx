import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DashboardFilters from '../components/filters/DashboardFilters';
import { CrimeClassificationSection } from '../components/analytics/CrimeClassificationSection';
import { TemporalAnalysisSection } from '../components/analytics/TemporalAnalysisSection';
import { DemographicsAnalysisSection } from '../components/analytics/DemographicsAnalysisSection';
import { WeaponAnalysisSection } from '../components/analytics/WeaponAnalysisSection';
import { CrimeDetailTable } from '../components/analytics/CrimeDetailTable';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  TrendResponse,
  HourlyDistributionResponse,
  VictimDemographicsResponse,
  WeaponDistributionResponse,
} from '../types';

export const CrimeAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({});

  // Sync initial filters from URL search parameters (state_id, district_id, year)
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

  // Analytical data states
  const [overview, setOverview] = useState<CrimeOverviewResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);
  const [types, setTypes] = useState<TypeBreakdownResponse | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<TrendResponse | null>(null);
  const [yearlyTrends, setYearlyTrends] = useState<TrendResponse | null>(null);
  const [hourly, setHourly] = useState<HourlyDistributionResponse | null>(null);
  const [demographics, setDemographics] = useState<VictimDemographicsResponse | null>(null);
  const [weapons, setWeapons] = useState<WeaponDistributionResponse | null>(null);

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
      const [
        overviewRes,
        catRes,
        typesRes,
        monthlyRes,
        yearlyRes,
        hourlyRes,
        demogRes,
        weaponsRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
        analyticsApi.getTrends('month', filters),
        analyticsApi.getTrends('year', filters),
        analyticsApi.getHourly(filters),
        analyticsApi.getDemographics(filters),
        analyticsApi.getWeapons(filters),
      ]);

      setOverview(overviewRes);
      setCategories(catRes);
      setTypes(typesRes);
      setMonthlyTrends(monthlyRes);
      setYearlyTrends(yearlyRes);
      setHourly(hourlyRes);
      setDemographics(demogRes);
      setWeapons(weaponsRes);
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
      subtitle="Detailed analysis of crime characteristics, patterns and case activity across jurisdictions and reporting periods."
      onRefresh={() => fetchAnalyticsData(true)}
      isRefreshing={isRefreshing}
    >
      {/* Analytics Filter Toolbar */}
      <DashboardFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        isLoading={isLoading || isRefreshing}
      />

      {/* Loading State */}
      {isLoading && !overview && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating statutory offense analytics, demographics and weapon metrics..." />
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

      {/* Dedicated Crime Analytics Workspace Sections */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-6">
          {/* SECTION 1: Crime Classification (Categories & Ranked Crime Types) */}
          <CrimeClassificationSection
            categories={categories}
            types={types}
          />

          {/* SECTION 2: Temporal Pattern (Monthly/Yearly Trends & 24-hr Diurnal Cycle) */}
          <TemporalAnalysisSection
            monthlyTrends={monthlyTrends}
            yearlyTrends={yearlyTrends}
            hourly={hourly}
            isLoading={isRefreshing}
          />

          {/* SECTION 3: Victim Profile (Age Cohort Distribution & Gender Breakdown) */}
          <DemographicsAnalysisSection
            demographics={demographics}
            totalIncidents={overview.total_incidents}
          />

          {/* SECTION 4: Weapon Involvement (Ranked 6 Weapon Classifications with Lethality Tiers) */}
          <WeaponAnalysisSection
            weapons={weapons}
          />

          {/* OPTIONAL COMPACT DETAIL TABLE: Crime Analysis Detail */}
          <CrimeDetailTable
            types={types}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CrimeAnalyticsPage;
