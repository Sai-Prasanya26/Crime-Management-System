import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Globe2,
  Table as TableIcon,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import DashboardFilters from '../components/filters/DashboardFilters';
import CrimeCategoryChart from '../components/charts/CrimeCategoryChart';
import CrimeTypeChart from '../components/charts/CrimeTypeChart';
import HourlyDistributionChart from '../components/charts/HourlyDistributionChart';
import VictimDemographicsChart from '../components/charts/VictimDemographicsChart';
import WeaponDistributionChart from '../components/charts/WeaponDistributionChart';
import { analyticsApi } from '../api';
import type {
  FilterParams,
  CrimeOverviewResponse,
  CategoryBreakdownResponse,
  TypeBreakdownResponse,
  HourlyDistributionResponse,
  VictimDemographicsResponse,
  WeaponDistributionResponse,
} from '../types';

export const CrimeAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterParams>({});

  // Sync filters from URL search parameters (state_id, district_id, year)
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
        hourlyRes,
        demogRes,
        weaponsRes,
      ] = await Promise.all([
        analyticsApi.getOverview(filters),
        analyticsApi.getByCategory(filters),
        analyticsApi.getByType(undefined, filters),
        analyticsApi.getHourly(filters),
        analyticsApi.getDemographics(filters),
        analyticsApi.getWeapons(filters),
      ]);

      setOverview(overviewRes);
      setCategories(catRes);
      setTypes(typesRes);
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
      title="Crime Analytics"
      subtitle="Analyze reported crime patterns and characteristics across jurisdictions and periods."
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
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating statutory offense analytics and incident breakdown..." />
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

      {/* Dedicated Crime Analytics Workspace */}
      {!isLoading && !error && overview && overview.total_incidents > 0 && (
        <div className="space-y-4">
          {/* Analytical KPI Summary Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Total Incidents"
              value={overview.total_incidents.toLocaleString()}
              subtext="Verified reported crime events"
              icon={FileText}
              color="navy"
            />
            <StatCard
              title="Active Inquiries"
              value={overview.cases.open.toLocaleString()}
              subtext={`${(100 - overview.cases.clearance_rate_pct).toFixed(1)}% in investigation phase`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Closed Dispositions"
              value={overview.cases.closed.toLocaleString()}
              subtext={`${overview.cases.clearance_rate_pct.toFixed(1)}% formal resolution rate`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Clearance Rate"
              value={`${overview.cases.clearance_rate_pct.toFixed(1)}%`}
              subtext="Case clearance disposition ratio"
              icon={ShieldCheck}
              color="blue"
            />
            <StatCard
              title="Monitored Jurisdictions"
              value={overview.total_districts.toLocaleString()}
              subtext={`Across ${overview.total_states} States & UTs`}
              icon={Globe2}
              color="blue"
            />
          </div>

          {/* Row 1: Crime Category Distribution (4 cols) & Crime Type Analysis (8 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 min-w-0">
              {categories && (
                <CrimeCategoryChart
                  data={categories.items}
                  totalIncidents={categories.total_incidents}
                />
              )}
            </div>
            <div className="lg:col-span-7 min-w-0">
              {types && (
                <CrimeTypeChart
                  data={types.items}
                  totalIncidents={types.total_incidents}
                />
              )}
            </div>
          </div>

          {/* Row 2: Victim Demographics (6 cols) & Weapon Involvement (6 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6 min-w-0">
              {demographics && <VictimDemographicsChart data={demographics} />}
            </div>
            <div className="lg:col-span-6 min-w-0">
              {weapons && (
                <WeaponDistributionChart
                  data={weapons.items}
                  totalIncidents={weapons.total_incidents}
                />
              )}
            </div>
          </div>

          {/* Row 3: Hourly Diurnal Distribution (5 cols) & Analytical Clearance Breakdown Table (7 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 min-w-0">
              {hourly && (
                <HourlyDistributionChart
                  data={hourly.items}
                  peakHour={hourly.peak_hour}
                />
              )}
            </div>

            {/* Case Clearance & Category Distribution Analytical Table */}
            <div className="lg:col-span-7 min-w-0 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                      <TableIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                        Offense Category &amp; Clearance Breakdown
                      </h3>
                      <p className="text-[11px] text-[#5D6878]">
                        Statutory classifications and investigation dispositions
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-[#F4F7FA] px-2 py-0.5 text-[11px] font-semibold text-[#5D6878] border border-[#D9E1EA]">
                    {categories?.items?.length || 0} Categories
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[11px] font-semibold uppercase text-[#5D6878] whitespace-nowrap">
                        <th className="py-2 pl-3">Category</th>
                        <th className="py-2 px-3 text-right">Reported Volume</th>
                        <th className="py-2 px-3 text-right">Share (%)</th>
                        <th className="py-2 px-3 text-right">Severity Factor</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categories?.items?.map((cat) => (
                        <tr key={cat.category_name} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                          <td className="py-2 pl-3 font-semibold text-[#0B1F3A]">
                            {cat.category_name}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {cat.incident_count.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-[#1769AA]">
                            {cat.percentage.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {cat.severity_weight.toFixed(1)}x
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1769AA] border border-blue-200">
                              Active Tracked
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D9E1EA] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#5D6878]">
                <span>Case clearance metrics sourced from verified incident status logs</span>
                <span className="font-semibold text-[#0B1F3A]">
                  Aggregate Clearance: {overview.cases.clearance_rate_pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CrimeAnalyticsPage;
