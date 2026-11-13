import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  ShieldCheck,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { riskApi, geographyApi } from '../api';
import type {
  RiskOverviewResponse,
  RiskListResponse,
  StateItem,
  StateRiskSummaryItem,
} from '../types';

export const RiskAssessmentPage: React.FC = () => {
  // Overview & state list
  const [overview, setOverview] = useState<RiskOverviewResponse | null>(null);
  const [stateSummaries, setStateSummaries] = useState<StateRiskSummaryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);

  // State filter state (Only one filter allowed)
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  const [riskList, setRiskList] = useState<RiskListResponse | null>(null);

  // Loading & error flags
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load of overview, state summaries, state list, and initial table data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, statesData, stateSummaryData, tableData] = await Promise.all([
        riskApi.getOverview('2026-11-01', 'risk-v2.0', 'FORECAST'),
        geographyApi.getStates('current'),
        riskApi.getStateRiskSummary('2026-11-01', 'risk-v2.0', 'FORECAST').catch(() => null),
        riskApi.listRiskScores({
          skip: 0,
          limit: pageSize,
          assessment_period: '2026-11-01',
          calculation_version: 'risk-v2.0',
          score_type: 'FORECAST',
        }),
      ]);

      setOverview(overviewData);
      setStates(statesData.items || []);
      if (stateSummaryData?.items) {
        setStateSummaries(stateSummaryData.items);
      }
      setRiskList(tableData);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize risk assessment data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch filtered table data when state or page changes
  const fetchTableData = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const data = await riskApi.listRiskScores({
        state_id: selectedStateId,
        skip,
        limit: pageSize,
        assessment_period: '2026-11-01',
        calculation_version: 'risk-v2.0',
        score_type: 'FORECAST',
      });
      setRiskList(data);
    } catch (err: any) {
      console.error('Failed to load filtered risk records:', err);
    } finally {
      setIsLoadingTable(false);
    }
  }, [selectedStateId, currentPage, pageSize]);

  useEffect(() => {
    if (!isLoading) {
      fetchTableData();
    }
  }, [fetchTableData, isLoading]);

  // Active state summary for dynamic KPI cards
  const currentStateSummary = useMemo(() => {
    if (!selectedStateId) return null;
    return stateSummaries.find((s) => s.state_id === selectedStateId) || null;
  }, [selectedStateId, stateSummaries]);

  // Dynamic KPI counts: if state is selected, show state counts; otherwise nationwide overview
  const kpiData = useMemo(() => {
    if (currentStateSummary) {
      return {
        totalDistricts: currentStateSummary.assessed_districts_count,
        critical: currentStateSummary.risk_level_counts.CRITICAL || 0,
        high: currentStateSummary.risk_level_counts.HIGH || 0,
        moderate: currentStateSummary.risk_level_counts.MODERATE || 0,
        low: currentStateSummary.risk_level_counts.LOW || 0,
      };
    }
    return {
      totalDistricts: overview?.total_assessed_districts || 0,
      critical: overview?.risk_level_distribution.CRITICAL || 0,
      high: overview?.risk_level_distribution.HIGH || 0,
      moderate: overview?.risk_level_distribution.MODERATE || 0,
      low: overview?.risk_level_distribution.LOW || 0,
    };
  }, [currentStateSummary, overview]);

  // Risk band badge generator
  const getRiskBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
            MODERATE
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            LOW
          </span>
        );
    }
  };

  const totalPages = riskList ? Math.ceil(riskList.total / pageSize) : 1;

  return (
    <DashboardLayout
      hideSidebar
      icon={ShieldAlert}
      title="Crime Risk Assessment"
      onRefresh={() => {
        setIsRefreshing(true);
        loadInitialData();
      }}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Loading crime risk assessment data..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Risk Assessment Error"
          message={error}
          onRetry={loadInitialData}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {/* SECTION A — KPI SUMMARY (Five compact cards in one horizontal row) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Assessed Districts */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs min-h-[105px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                  Assessed Districts
                </span>
                <div className="p-1.5 rounded-lg bg-[#EAF3FA] text-[#1769AA] shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-[26px] font-bold font-mono text-slate-900 leading-none">
                  {kpiData.totalDistricts}
                </div>
              </div>
            </div>

            {/* 2. Critical Risk */}
            <div className="flex flex-col justify-between rounded-xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-2xs min-h-[105px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 truncate">
                  Critical Risk
                </span>
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-[26px] font-bold font-mono text-rose-700 leading-none">
                  {kpiData.critical}
                </div>
              </div>
            </div>

            {/* 3. High Risk */}
            <div className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-amber-50/20 p-4 shadow-2xs min-h-[105px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 truncate">
                  High Risk
                </span>
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-[26px] font-bold font-mono text-amber-800 leading-none">
                  {kpiData.high}
                </div>
              </div>
            </div>

            {/* 4. Moderate Risk */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-200/80 bg-blue-50/20 p-4 shadow-2xs min-h-[105px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 truncate">
                  Moderate Risk
                </span>
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-[26px] font-bold font-mono text-blue-700 leading-none">
                  {kpiData.moderate}
                </div>
              </div>
            </div>

            {/* 5. Low Risk */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-4 shadow-2xs min-h-[105px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 truncate">
                  Low Risk
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl lg:text-[26px] font-bold font-mono text-emerald-800 leading-none">
                  {kpiData.low}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B — STATE FILTER (Directly below KPI cards, compact, one dropdown) */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <label htmlFor="state-filter" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Select State / UT:
            </label>
            <select
              id="state-filter"
              aria-label="Select State or Union Territory"
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedStateId(val);
                setCurrentPage(1);
              }}
              className="h-9 min-w-[200px] sm:min-w-[260px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States / UTs</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>
            {selectedStateId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStateId(undefined);
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-[#1769AA] hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* SECTION C — DISTRICT RISK ASSESSMENT TABLE (Exactly 5 columns: Rank, District, State/UT, Risk Score, Risk Level) */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {isLoadingTable ? (
              <div className="p-8">
                <LoadingState message="Loading district risk assessment data..." />
              </div>
            ) : !riskList || riskList.items.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Risk Records Found"
                  message="No district risk assessment records found for the selected jurisdiction."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-20 text-center">Rank</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">State / UT</th>
                      <th className="py-3 px-4 text-center">Risk Score</th>
                      <th className="py-3 px-4 text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskList.items.map((item, idx) => {
                      const rank = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-500 font-semibold text-xs">
                            #{rank}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.district_name || `District #${item.district_id}`}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {item.state_name || `State #${item.state_id}`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold font-mono text-slate-900 text-sm">
                              {item.overall_risk_score.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-0.5">/ 100</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getRiskBadge(item.risk_level)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, riskList?.total || 0)}</strong> of{' '}
                  <strong>{riskList?.total || 0}</strong> districts
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold cursor-pointer shadow-2xs text-xs"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold cursor-pointer shadow-2xs text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RiskAssessmentPage;