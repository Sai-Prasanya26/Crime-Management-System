import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { CaseOutcomeSection } from '../components/analytics/CaseOutcomeSection';
import { JurisdictionComparisonSection } from '../components/analytics/JurisdictionComparisonSection';
import { CrimeDetailTable } from '../components/analytics/CrimeDetailTable';
import { analyticsApi, geographyApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  TrendResponse,
  HourlyDistributionResponse,
  VictimDemographicsResponse,
  WeaponDistributionResponse,
  TopDistrictsResponse,
  StateItem,
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

  // States inventory for label resolution
  const [states, setStates] = useState<StateItem[]>([]);

  useEffect(() => {
    geographyApi.getStates()
      .then((res) => setStates(res.items || []))
      .catch(() => {});
  }, []);

  const selectedStateName = useMemo(() => {
    if (!filters.state_id) return undefined;
    const match = states.find((s) => s.id === filters.state_id);
    return match?.state_name;
  }, [filters.state_id, states]);

  // Analytical data states
  const [overview, setOverview] = useState<CrimeOverviewResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);
  const [types, setTypes] = useState<TypeBreakdownResponse | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<TrendResponse | null>(null);
  const [yearlyTrends, setYearlyTrends] = useState<TrendResponse | null>(null);
  const [hourly, setHourly] = useState<HourlyDistributionResponse | null>(null);
  const [demographics, setDemographics] = useState<VictimDemographicsResponse | null>(null);
  const [weapons, setWeapons] = useState<WeaponDistributionResponse | null>(null);
  const [topDistrictsVolume, setTopDistrictsVolume] = useState<TopDistrictsResponse | null>(null);
  const [topDistrictsRate, setTopDistrictsRate] = useState<TopDistrictsResponse | null>(null);

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
        volumeDistrictsRes,
        rateDistrictsRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
        analyticsApi.getTrends('month', filters),
        analyticsApi.getTrends('year', filters),
        analyticsApi.getHourly(filters),
        analyticsApi.getDemographics(filters),
        analyticsApi.getWeapons(filters),
        analyticsApi.getTopDistricts({ metric: 'volume', state_id: filters.state_id, limit: 10 }),
        analyticsApi.getTopDistricts({ metric: 'rate', state_id: filters.state_id, limit: 10 }),
      ]);

      setOverview(overviewRes);
      setCategories(catRes);
      setTypes(typesRes);
      setMonthlyTrends(monthlyRes);
      setYearlyTrends(yearlyRes);
      setHourly(hourlyRes);
      setDemographics(demogRes);
      setWeapons(weaponsRes);
      setTopDistrictsVolume(volumeDistrictsRes);
      setTopDistrictsRate(rateDistrictsRes);
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
          <LoadingState message="Aggregating statutory offense analytics, demographics and case metrics..." />
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
          {/* Section 1 & 2: Crime Classification & Offense Ranking */}
          <CrimeClassificationSection
            categories={categories}
            types={types}
          />

          {/* Section 3: Temporal Crime Analysis */}
          <TemporalAnalysisSection
            monthlyTrends={monthlyTrends}
            yearlyTrends={yearlyTrends}
            hourly={hourly}
            isLoading={isRefreshing}
          />

          {/* Section 4: Victim Demographics */}
          <DemographicsAnalysisSection
            demographics={demographics}
            totalIncidents={overview.total_incidents}
          />

          {/* Section 5: Weapon Involvement */}
          <WeaponAnalysisSection
            weapons={weapons}
          />

          {/* Section 6: Case Outcome & Clearance Analysis */}
          <CaseOutcomeSection
            overview={overview}
          />

          {/* Section 7: Jurisdiction Comparison */}
          <JurisdictionComparisonSection
            topDistrictsVolume={topDistrictsVolume}
            topDistrictsRate={topDistrictsRate}
            selectedStateName={selectedStateName}
          />

          {/* Section 8: Crime Analysis Detail */}
          <CrimeDetailTable
            types={types}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CrimeAnalyticsPage;
