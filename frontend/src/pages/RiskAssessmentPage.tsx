import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  Activity,
  Scale,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { StatCard } from '../components/common/StatCard';
import { riskApi, geographyApi } from '../api';
import type {
  RiskOverviewResponse,
  RiskListResponse,
  StateItem,
  DistrictItem,
  RiskScoreType,
  RiskTrendPoint,
} from '../types';

interface ActivePeriodInfo {
  period: string;
  version: string;
  scoreType: RiskScoreType;
}

/**
 * Automatically chooses the latest available active future forecast period from trends data.
 * If no active forecast period exists, falls back to the latest valid available assessment period.
 */
const resolveActivePeriod = (trends: RiskTrendPoint[]): ActivePeriodInfo | null => {
  if (!trends || trends.length === 0) {
    return null;
  }

  // Filter out any unit test mock dates or dates with year < 2000
  const validTrends = trends.filter((t) => {
    if (!t.period) return false;
    const year = t.period_year || parseInt(t.period.slice(0, 4), 10);
    return !isNaN(year) && year >= 2000;
  });

  const pool = validTrends.length > 0 ? validTrends : trends;

  // 1. Look for active future forecast periods (score_type === 'FORECAST')
  const forecastPeriods = pool
    .filter((t) => t.score_type === 'FORECAST')
    .sort((a, b) => b.period.localeCompare(a.period));

  if (forecastPeriods.length > 0) {
    // Prefer production calculation version (risk-v2.0)
    const v2Period = forecastPeriods.find((t) => t.calculation_version === 'risk-v2.0');
    const chosen = v2Period || forecastPeriods[0];
    return {
      period: chosen.period,
      version: chosen.calculation_version || 'risk-v2.0',
      scoreType: 'FORECAST',
    };
  }

  // 2. If no forecast period exists, use the latest valid available assessment period
  const sortedAll = [...pool].sort((a, b) => b.period.localeCompare(a.period));
  const chosen = sortedAll[0];
  return {
    period: chosen.period,
    version: chosen.calculation_version || 'risk-v2.0',
    scoreType: chosen.score_type || 'HISTORICAL',
  };
};

export const RiskAssessmentPage: React.FC = () => {
  // Internally selected assessment period (derived automatically from backend API data)
  const [activePeriod, setActivePeriod] = useState<ActivePeriodInfo | null>(null);

  // High-level overview state
  const [overview, setOverview] = useState<RiskOverviewResponse | null>(null);
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  // Filter state
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | undefined>(undefined);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  const [riskList, setRiskList] = useState<RiskListResponse | null>(null);

  // Loading & error flags
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef<boolean>(true);

  // Initial load of trends, auto-selected period, overview, states, and initial table page
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    isInitialMount.current = true;
    try {
      const [trendsData, statesData] = await Promise.all([
        riskApi.getTrends(),
        geographyApi.getStates('current'),
      ]);

      const resolved = resolveActivePeriod(trendsData.trends || []);
      if (!resolved) {
        setActivePeriod(null);
        setOverview(null);
        setRiskList(null);
        setStates(statesData.items || []);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const [overviewData, tableData] = await Promise.all([
        riskApi.getOverview(resolved.period, resolved.version, resolved.scoreType),
        riskApi.listRiskScores({
          skip: 0,
          limit: pageSize,
          assessment_period: resolved.period,
          calculation_version: resolved.version,
          score_type: resolved.scoreType,
        }),
      ]);

      setActivePeriod(resolved);
      setOverview(overviewData);
      setStates(statesData.items || []);
      setRiskList(tableData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crime risk assessment data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load districts when state filter changes
  useEffect(() => {
    if (selectedStateId) {
      geographyApi
        .getDistricts(selectedStateId, 'current')
        .then((res) => {
          setDistricts(res.items || []);
        })
        .catch(() => {
          setDistricts([]);
        });
    } else {
      setDistricts([]);
      setSelectedDistrictId(undefined);
    }
  }, [selectedStateId]);

  // Fetch filtered table data using the internally selected active period
  const fetchTableData = useCallback(async () => {
    if (!activePeriod) return;
    setIsLoadingTable(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const data = await riskApi.listRiskScores({
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        risk_level: selectedRiskLevel || undefined,
        skip,
        limit: pageSize,
        assessment_period: activePeriod.period,
        calculation_version: activePeriod.version,
        score_type: activePeriod.scoreType,
      });
      setRiskList(data);
    } catch (err: any) {
      console.error('Failed to load filtered risk records:', err);
    } finally {
      setIsLoadingTable(false);
    }
  }, [selectedStateId, selectedDistrictId, selectedRiskLevel, activePeriod, currentPage, pageSize]);

  // Trigger table fetch on filter or page change (skipping initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isLoading && activePeriod) {
      fetchTableData();
    }
  }, [fetchTableData, isLoading, activePeriod]);

  // Reset filters handler: resets geographic and risk filters while keeping activePeriod consistent
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedRiskLevel(undefined);
    setCurrentPage(1);
  };

  // Risk band badge generator
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
            MODERATE
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            LOW
          </span>
        );
      default:
        return null;
    }
  };

  const totalPages = riskList ? Math.ceil(riskList.total / pageSize) : 1;

  return (
    <DashboardLayout
      hideSidebar
      icon={ShieldAlert}
      title="Crime Risk Assessment"
      subtitle="District-level risk classification and contributing factors"
      onRefresh={() => {
        setIsRefreshing(true);
        loadInitialData();
      }}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading crime risk assessments and district threat evaluations..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Risk Assessment Engine Error"
          message={error}
          onRetry={loadInitialData}
        />
      )}

      {!isLoading && !error && (!activePeriod || !overview) && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
          <EmptyState
            title="Risk Assessment Data Unavailable"
            message="No verified crime risk assessment or active forecast periods are currently available."
          />
        </div>
      )}

      {!isLoading && !error && activePeriod && overview && (
        <div className="space-y-4">
          {/* SECTION A: RISK SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Assessed Districts"
              value={overview.total_assessed_districts}
              subtext="Standardized baseline"
              icon={MapPin}
              color="blue"
            />
            <StatCard
              title="Critical Risk"
              value={overview.risk_level_distribution.CRITICAL}
              subtext={`${overview.risk_level_percentages.CRITICAL}% (Score ≥ 65)`}
              icon={AlertTriangle}
              color="rose"
            />
            <StatCard
              title="High Risk"
              value={overview.risk_level_distribution.HIGH}
              subtext={`${overview.risk_level_percentages.HIGH}% (Score 50–65)`}
              icon={ShieldAlert}
              color="amber"
            />
            <StatCard
              title="Moderate Risk"
              value={overview.risk_level_distribution.MODERATE}
              subtext={`${overview.risk_level_percentages.MODERATE}% (Score 35–50)`}
              icon={Activity}
              color="navy"
            />
            <StatCard
              title="Low Risk"
              value={overview.risk_level_distribution.LOW}
              subtext={`${overview.risk_level_percentages.LOW}% (Score < 35)`}
              icon={ShieldCheck}
              color="emerald"
            />
            <StatCard
              title="Average Risk Score"
              value={`${overview.mean_risk_score.toFixed(1)}`}
              subtext={`Median: ${overview.median_risk_score.toFixed(1)}`}
              icon={Scale}
              color="blue"
            />
          </div>

          {/* SECTION B: FILTER TOOLBAR */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
              {/* State / UT Selector */}
              <select
                id="state-filter"
                aria-label="Filter by State or Union Territory"
                value={selectedStateId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedStateId(val);
                  setSelectedDistrictId(undefined);
                  setCurrentPage(1);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All States &amp; UTs ({states.length || 36})</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name}
                  </option>
                ))}
              </select>

              {/* District Selector */}
              <select
                id="district-filter"
                aria-label="Filter by District"
                value={selectedDistrictId || ''}
                disabled={!selectedStateId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedDistrictId(val);
                  setCurrentPage(1);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="">{selectedStateId ? `All Districts (${districts.length})` : 'Select State First'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>

              {/* Risk Level Selector */}
              <select
                id="risk-level-filter"
                aria-label="Filter by Risk Category"
                value={selectedRiskLevel || ''}
                onChange={(e) => {
                  setSelectedRiskLevel(e.target.value || undefined);
                  setCurrentPage(1);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All Risk Categories</option>
                <option value="CRITICAL">Critical (≥ 65)</option>
                <option value="HIGH">High (50 – 64.99)</option>
                <option value="MODERATE">Moderate (35 – 49.99)</option>
                <option value="LOW">Low (&lt; 35)</option>
              </select>
            </div>

            {/* Reset Action */}
            {(selectedStateId !== undefined || selectedDistrictId !== undefined || selectedRiskLevel !== undefined) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* SECTION C: DISTRICT RISK TABLE */}
          <div className="rounded-lg border border-[#DCE2EA] bg-white shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-[#DCE2EA] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1F3A]">District Risk Evaluation Register</h3>
                <p className="text-[11px] text-[#5D6878]">
                  Showing {riskList?.items.length || 0} of {riskList?.total || 0} assessed administrative districts
                </p>
              </div>
            </div>

            {isLoadingTable ? (
              <div className="p-8">
                <LoadingState message="Loading district risk scores..." />
              </div>
            ) : !riskList || riskList.items.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Risk Records Found"
                  message="No districts match the selected geographic or risk criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#DCE2EA] text-[#5D6878] font-semibold">
                      <th className="py-2.5 px-3 text-center w-14">Rank</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">State / UT</th>
                      <th className="py-2.5 px-3 text-center w-28">Risk Score</th>
                      <th className="py-2.5 px-3 w-32">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE2EA]">
                    {riskList.items.map((item, idx) => {
                      const rank = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-[#5D6878]">
                            #{rank}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">
                            {item.district_name || `District #${item.district_id}`}
                          </td>
                          <td className="py-2.5 px-3 text-[#5D6878]">
                            {item.state_name || `State #${item.state_id}`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-[#0B1F3A]">
                            {item.overall_risk_score !== undefined && item.overall_risk_score !== null
                              ? item.overall_risk_score.toFixed(1)
                              : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
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
              <div className="p-3 border-t border-[#DCE2EA] flex items-center justify-between text-xs text-[#5D6878]">
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium cursor-pointer"
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
