import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  RotateCcw,
  Search,
  X,
  Info,
  BarChart3,
  Sparkles,
  GitBranch,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { StatCard } from '../components/common/StatCard';
import { riskApi, geographyApi } from '../api';
import type {
  RiskOverviewResponse,
  RiskListResponse,
  RiskItem,
  DistrictRiskDetailResponse,
  StateRiskSummaryItem,
  RiskDistributionResponse,
  StateItem,
  DistrictItem,
  RiskScoreType,
  RiskTrendPoint,
} from '../types';

interface ActivePeriodInfo {
  period: string;
  version: string;
  scoreType: RiskScoreType;
  label: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string; barBg: string }> = {
  CRITICAL: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    hex: '#E11D48',
    barBg: 'bg-rose-500',
  },
  HIGH: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hex: '#D97706',
    barBg: 'bg-amber-500',
  },
  MODERATE: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    hex: '#2563EB',
    barBg: 'bg-blue-500',
  },
  LOW: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    hex: '#059669',
    barBg: 'bg-emerald-500',
  },
};

const formatDriverName = (driver?: string | null): string => {
  if (!driver) return 'Balanced';
  switch (driver) {
    case 'forecast_volume':
      return 'Forecast Volume';
    case 'crime_rate_per_100k':
      return 'Crime Rate';
    case 'severity_profile':
      return 'Severity Profile';
    case 'trend_ratio':
      return 'Trend Ratio';
    case 'historical_volume':
      return 'Historical Volume';
    default:
      return driver.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const RiskAssessmentPage: React.FC = () => {
  // Available periods list
  const [availablePeriods, setAvailablePeriods] = useState<ActivePeriodInfo[]>([]);
  const [activePeriod, setActivePeriod] = useState<ActivePeriodInfo | null>(null);

  // High-level overview & distributions
  const [overview, setOverview] = useState<RiskOverviewResponse | null>(null);
  const [distributionData, setDistributionData] = useState<RiskDistributionResponse | null>(null);
  const [stateSummaries, setStateSummaries] = useState<StateRiskSummaryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  // Filter state
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Table pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  const [riskList, setRiskList] = useState<RiskListResponse | null>(null);

  // Drill-down inspection drawer / modal
  const [selectedDetailDistrictId, setSelectedDetailDistrictId] = useState<number | null>(null);
  const [districtDetail, setDistrictDetail] = useState<DistrictRiskDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Loading & error flags
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef<boolean>(true);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStateId, selectedDistrictId, selectedRiskLevel]);

  // Initial load of trends, periods, overview, states, distribution, and state summaries
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    isInitialMount.current = true;
    try {
      const [trendsData, statesData] = await Promise.all([
        riskApi.getTrends(),
        geographyApi.getStates('current'),
      ]);

      const rawTrends = (trendsData.trends || []).filter((t: RiskTrendPoint) => {
        if (!t.period) return false;
        const year = t.period_year || parseInt(t.period.slice(0, 4), 10);
        return !isNaN(year) && year >= 2000;
      });

      // Deduplicate periods
      const periodMap = new Map<string, ActivePeriodInfo>();
      rawTrends.forEach((t) => {
        const key = `${t.period}_${t.score_type}`;
        if (!periodMap.has(key)) {
          const typeLabel = t.score_type === 'FORECAST' ? 'Forecast' : 'Historical';
          periodMap.set(key, {
            period: t.period,
            version: t.calculation_version || 'risk-v2.0',
            scoreType: t.score_type as RiskScoreType,
            label: `${t.period.slice(0, 7)} (${typeLabel})`,
          });
        }
      });

      const periodsList = Array.from(periodMap.values()).sort((a, b) => {
        if (a.scoreType !== b.scoreType) {
          return a.scoreType === 'FORECAST' ? -1 : 1;
        }
        return b.period.localeCompare(a.period);
      });

      setAvailablePeriods(periodsList);

      const chosen = periodsList[0] || {
        period: '2026-11-01',
        version: 'risk-v2.0',
        scoreType: 'FORECAST' as RiskScoreType,
        label: '2026-11 (Forecast)',
      };

      const [overviewData, distData, stateSummData, tableData] = await Promise.all([
        riskApi.getOverview(chosen.period, chosen.version, chosen.scoreType),
        riskApi.getRiskDistribution(chosen.period, chosen.version, chosen.scoreType).catch(() => null),
        riskApi.getStateRiskSummary(chosen.period, chosen.version, chosen.scoreType).catch(() => null),
        riskApi.listRiskScores({
          skip: 0,
          limit: pageSize,
          assessment_period: chosen.period,
          calculation_version: chosen.version,
          score_type: chosen.scoreType,
        }),
      ]);

      setActivePeriod(chosen);
      setOverview(overviewData);
      setDistributionData(distData);
      setStateSummaries(stateSummData?.items || []);
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

  // When active period is manually changed by user, reload overview, distributions, summaries, and table
  const handlePeriodChange = async (targetPeriodStr: string) => {
    const target = availablePeriods.find((p) => p.period === targetPeriodStr);
    if (!target) return;
    setActivePeriod(target);
    setIsLoadingTable(true);
    try {
      const [overviewData, distData, stateSummData, tableData] = await Promise.all([
        riskApi.getOverview(target.period, target.version, target.scoreType),
        riskApi.getRiskDistribution(target.period, target.version, target.scoreType).catch(() => null),
        riskApi.getStateRiskSummary(target.period, target.version, target.scoreType).catch(() => null),
        riskApi.listRiskScores({
          state_id: selectedStateId,
          district_id: selectedDistrictId,
          risk_level: selectedRiskLevel || undefined,
          search: debouncedSearch || undefined,
          skip: 0,
          limit: pageSize,
          assessment_period: target.period,
          calculation_version: target.version,
          score_type: target.scoreType,
        }),
      ]);
      setOverview(overviewData);
      setDistributionData(distData);
      setStateSummaries(stateSummData?.items || []);
      setRiskList(tableData);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to update active assessment period data:', err);
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Fetch filtered table data using the active period, search, and geographic filters
  const fetchTableData = useCallback(async () => {
    if (!activePeriod) return;
    setIsLoadingTable(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const data = await riskApi.listRiskScores({
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        risk_level: selectedRiskLevel || undefined,
        search: debouncedSearch || undefined,
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
  }, [selectedStateId, selectedDistrictId, selectedRiskLevel, debouncedSearch, activePeriod, currentPage, pageSize]);

  // Trigger table fetch on filter, search or page change (skipping initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isLoading && activePeriod) {
      fetchTableData();
    }
  }, [fetchTableData, isLoading, activePeriod]);

  // Fetch district details for drill-down modal/drawer
  const handleOpenDetail = async (districtId: number) => {
    if (!activePeriod) return;
    setSelectedDetailDistrictId(districtId);
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await riskApi.getDistrictRiskDetail(
        districtId,
        activePeriod.period,
        activePeriod.version,
        activePeriod.scoreType
      );
      setDistrictDetail(detail);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load district risk details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedDetailDistrictId(null);
    setDistrictDetail(null);
    setDetailError(null);
  };

  // Reset filters handler
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedRiskLevel(undefined);
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Badge helper
  const getRiskBadge = (level: string) => {
    const style = CATEGORY_COLORS[level] || CATEGORY_COLORS.LOW;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${style.bg} ${style.text} border ${style.border}`}
      >
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: style.hex }} />
        {level}
      </span>
    );
  };

  // Prepare chart data for Recharts
  const chartData = useMemo(() => {
    if (!distributionData && !overview) return [];
    const dist = distributionData?.distribution || overview?.risk_level_distribution || {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
    };
    const pct = distributionData?.percentages || overview?.risk_level_percentages || {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
    };

    return [
      {
        category: 'Critical',
        level: 'CRITICAL',
        count: dist.CRITICAL || 0,
        percentage: pct.CRITICAL || 0,
        threshold: 'Score \u2265 65.0',
        color: CATEGORY_COLORS.CRITICAL.hex,
      },
      {
        category: 'High',
        level: 'HIGH',
        count: dist.HIGH || 0,
        percentage: pct.HIGH || 0,
        threshold: 'Score 50.0 - 64.9',
        color: CATEGORY_COLORS.HIGH.hex,
      },
      {
        category: 'Moderate',
        level: 'MODERATE',
        count: dist.MODERATE || 0,
        percentage: pct.MODERATE || 0,
        threshold: 'Score 35.0 - 49.9',
        color: CATEGORY_COLORS.MODERATE.hex,
      },
      {
        category: 'Low',
        level: 'LOW',
        count: dist.LOW || 0,
        percentage: pct.LOW || 0,
        threshold: 'Score < 35.0',
        color: CATEGORY_COLORS.LOW.hex,
      },
    ];
  }, [distributionData, overview]);

  // Top 10 States ranked by mean risk score
  const topStateSummaries = useMemo(() => {
    return [...stateSummaries]
      .sort((a, b) => b.mean_risk_score - a.mean_risk_score)
      .slice(0, 8);
  }, [stateSummaries]);

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
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading crime risk assessments, district threat evaluations, and predictive risk matrices..." />
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
          {/* TOP BAR: PERIOD SELECTOR & ENGINE STATUS */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9E1EA] bg-white px-4 py-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#1769AA]" />
              <span className="text-xs font-semibold text-[#0B1F3A]">Assessment Cycle:</span>
              <select
                aria-label="Select Risk Assessment Period"
                value={activePeriod.period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="h-8 rounded border border-[#D9E1EA] bg-[#F4F7FA] px-2.5 text-xs font-semibold text-[#1769AA] focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                {availablePeriods.map((p) => (
                  <option key={`${p.period}_${p.scoreType}`} value={p.period}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5D6878]">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#172033]">Methodology:</span>
                <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700 border border-blue-200">
                  {overview.methodology_version || 'risk-v2.0'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="font-medium text-[#172033]">Model:</span>
                <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                  {overview.active_forecast_model || 'HistGradientBoostingRegressor'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#172033]">Type:</span>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                    activePeriod.scoreType === 'FORECAST'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {activePeriod.scoreType}
                </span>
              </div>
            </div>
          </div>

          {/* OPERATIONAL INTERPRETATION BANNER */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 text-xs text-[#0B1F3A] flex items-center gap-2.5 shadow-2xs">
            <Info className="h-4 w-4 text-[#1769AA] shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-[#1769AA]">Operational Planning Indicator:</strong> Scores (0–100) are relative comparison indices based on nationwide percentile rankings across all 640 assessed districts. They serve strictly as strategic resource allocation metrics, not crime probabilities or individual risk guarantees.
            </p>
          </div>

          {/* SECTION A: RISK STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              title="Assessed Districts"
              value={overview.total_assessed_districts}
              subtext="640 Census Profiles Active"
              icon={MapPin}
              color="blue"
            />
            <StatCard
              title="Critical Risk"
              value={overview.risk_level_distribution.CRITICAL}
              subtext={`${overview.risk_level_percentages.CRITICAL.toFixed(1)}% (\u2265 65.0)`}
              icon={AlertTriangle}
              color="rose"
            />
            <StatCard
              title="High Risk"
              value={overview.risk_level_distribution.HIGH}
              subtext={`${overview.risk_level_percentages.HIGH.toFixed(1)}% (50.0 - 64.9)`}
              icon={ShieldAlert}
              color="amber"
            />
            <StatCard
              title="Moderate Risk"
              value={overview.risk_level_distribution.MODERATE}
              subtext={`${overview.risk_level_percentages.MODERATE.toFixed(1)}% (35.0 - 49.9)`}
              icon={Activity}
              color="navy"
            />
            <StatCard
              title="Low Risk"
              value={overview.risk_level_distribution.LOW}
              subtext={`${overview.risk_level_percentages.LOW.toFixed(1)}% (< 35.0)`}
              icon={ShieldCheck}
              color="emerald"
            />
          </div>

          {/* SECTION B: VISUALIZATIONS GRID (DISTRIBUTION CHART & STATE COMPARISON) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 1. Categorical Distribution Chart */}
            <div className="lg:col-span-6 rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-sm font-semibold text-[#0B1F3A]">National Risk Distribution</h3>
                </div>
                <span className="text-xs text-[#5D6878]">
                  Mean: <strong>{overview.mean_risk_score.toFixed(1)}</strong> | Max: <strong>{overview.highest_risk_score.toFixed(1)}</strong>
                </span>
              </div>
              <div className="pt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#4B5563', fontSize: 12 }}
                      axisLine={{ stroke: '#D1D5DB' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={{ stroke: '#D1D5DB' }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(243, 244, 246, 0.6)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-md border border-[#DCE2EA] bg-white p-2.5 shadow-md text-xs">
                            <p className="font-bold text-[#0B1F3A] mb-1">{data.category} Risk Category</p>
                            <p className="text-[#5D6878]">Threshold: <span className="font-medium text-[#172033]">{data.threshold}</span></p>
                            <p className="text-[#5D6878]">Districts: <span className="font-bold text-[#0B1F3A]">{data.count}</span></p>
                            <p className="text-[#5D6878]">Share: <span className="font-bold text-[#1769AA]">{data.percentage.toFixed(1)}%</span></p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#DCE2EA] text-center text-xs">
                {chartData.map((d) => (
                  <div key={d.category} className="p-1 rounded bg-[#F8FAFC]">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                      <span className="font-semibold text-[#172033]">{d.category}</span>
                    </div>
                    <div className="text-[11px] text-[#5D6878] mt-0.5">{d.count} ({d.percentage.toFixed(1)}%)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. State-Wise Risk Comparison */}
            <div className="lg:col-span-6 rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-sm font-semibold text-[#0B1F3A]">State Threat Rankings</h3>
                </div>
                <span className="text-xs text-[#5D6878]">Top States by Mean Threat Score</span>
              </div>
              <div className="pt-2 flex-1 overflow-y-auto max-h-72 space-y-2.5">
                {topStateSummaries.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-xs text-[#5D6878]">
                    No state aggregated summaries available.
                  </div>
                ) : (
                  topStateSummaries.map((state, idx) => (
                    <div
                      key={state.state_id}
                      onClick={() => {
                        setSelectedStateId(state.state_id);
                        setSelectedDistrictId(undefined);
                      }}
                      className="group p-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-[#DCE2EA] cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[11px] font-semibold text-[#5D6878]">#{idx + 1}</span>
                          <span className="font-semibold text-[#0B1F3A] group-hover:text-[#1769AA] transition-colors truncate">
                            {state.state_name}
                          </span>
                          <span className="text-[11px] text-[#5D6878]">({state.assessed_districts_count} dists)</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#5D6878]">
                            Top: <strong className="text-[#172033]">{state.highest_risk_district_name || 'N/A'}</strong>
                          </span>
                          <span className="font-mono font-bold text-xs text-[#0B1F3A]">
                            {state.mean_risk_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            state.mean_risk_score >= 65
                              ? 'bg-rose-500'
                              : state.mean_risk_score >= 50
                              ? 'bg-amber-500'
                              : state.mean_risk_score >= 35
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(Math.max(state.mean_risk_score, 5), 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SECTION C: SEARCH & FILTER TOOLBAR */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7A8A9E]" />
              <input
                type="text"
                placeholder="Search district or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded border border-[#D9E1EA] bg-white pl-9 pr-8 text-xs font-medium text-[#172033] placeholder-[#7A8A9E] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#7A8A9E] hover:text-[#172033]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* State Selector */}
            <select
              id="state-filter"
              aria-label="Filter by State or Union Territory"
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedStateId(val);
                setSelectedDistrictId(undefined);
              }}
              className="h-9 w-full sm:w-[200px] rounded border border-[#D9E1EA] bg-white px-2.5 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States & UTs (36)</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>

            {/* District Selector (Enabled when state selected) */}
            <select
              id="district-filter"
              aria-label="Filter by District"
              disabled={!selectedStateId}
              value={selectedDistrictId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedDistrictId(val);
              }}
              className="h-9 w-full sm:w-[190px] rounded border border-[#D9E1EA] bg-white px-2.5 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">{selectedStateId ? 'All Districts' : 'Select State First'}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district_name}
                </option>
              ))}
            </select>

            {/* Risk Category Selector */}
            <select
              id="risk-level-filter"
              aria-label="Filter by Risk Category"
              value={selectedRiskLevel || ''}
              onChange={(e) => setSelectedRiskLevel(e.target.value || undefined)}
              className="h-9 w-full sm:w-[160px] rounded border border-[#D9E1EA] bg-white px-2.5 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All Risk Bands</option>
              <option value="CRITICAL">Critical (&#8805; 65.0)</option>
              <option value="HIGH">High (50.0 - 64.9)</option>
              <option value="MODERATE">Moderate (35.0 - 49.9)</option>
              <option value="LOW">Low (&lt; 35.0)</option>
            </select>

            {/* Reset Action */}
            {(selectedStateId !== undefined ||
              selectedDistrictId !== undefined ||
              selectedRiskLevel !== undefined ||
              Boolean(searchQuery)) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-2.5 text-[11px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* SECTION D: DISTRICT RISK RANKING TABLE */}
          <div className="rounded-lg border border-[#DCE2EA] bg-white shadow-2xs overflow-hidden">
            <div className="py-3 px-4 border-b border-[#DCE2EA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-sm font-semibold text-[#0B1F3A]">District Risk Threat Ranking</h3>
              </div>
              <span className="text-xs text-[#5D6878]">
                Showing <strong>{riskList ? riskList.items.length : 0}</strong> of{' '}
                <strong>{riskList ? riskList.total : 0}</strong> assessed districts
              </span>
            </div>

            {isLoadingTable ? (
              <div className="p-8">
                <LoadingState message="Filtering and ranking district threat evaluations..." />
              </div>
            ) : !riskList || riskList.items.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Risk Records Found"
                  message="No districts match the selected geographic, threat band, or search criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#DCE2EA] text-[#5D6878] font-semibold">
                      <th className="w-[6%] py-3 px-3 text-center align-middle">Rank</th>
                      <th className="w-[24%] py-3 px-3 text-left align-middle">District</th>
                      <th className="w-[18%] py-3 px-3 text-left align-middle">State / UT</th>
                      <th className="w-[16%] py-3 px-3 text-left align-middle">Risk Score (0-100)</th>
                      <th className="w-[12%] py-3 px-3 text-left align-middle">Category</th>
                      <th className="w-[14%] py-3 px-3 text-left align-middle">Primary Driver</th>
                      <th className="w-[10%] py-3 px-3 text-center align-middle">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE2EA]">
                    {riskList.items.map((item: RiskItem, idx: number) => {
                      const rank = (currentPage - 1) * pageSize + idx + 1;
                      const score = item.overall_risk_score ?? 0;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDetail(item.district_id)}
                        >
                          <td className="py-2.5 px-3 text-center align-middle font-mono text-[#5D6878]">
                            #{rank}
                          </td>
                          <td className="py-2.5 px-3 text-left align-middle">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#0B1F3A] group-hover:text-[#1769AA] transition-colors">
                                {item.district_name || `District #${item.district_id}`}
                              </span>
                              {item.is_derived_from_parent && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                  title={`Carved district: baseline metrics mapped from parent district ${item.parent_district_name || `#${item.parent_district_id}`}`}
                                >
                                  <GitBranch className="h-2.5 w-2.5 text-amber-600" />
                                  Carved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-left align-middle text-[#5D6878] truncate">
                            {item.state_name || `State #${item.state_id}`}
                          </td>
                          <td className="py-2.5 px-3 text-left align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#0B1F3A] w-9">
                                {score.toFixed(1)}
                              </span>
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden max-w-[90px]">
                                <div
                                  className={`h-full rounded-full ${
                                    score >= 65
                                      ? 'bg-rose-500'
                                      : score >= 50
                                      ? 'bg-amber-500'
                                      : score >= 35
                                      ? 'bg-blue-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(Math.max(score, 4), 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-left align-middle">
                            {getRiskBadge(item.risk_level)}
                          </td>
                          <td className="py-2.5 px-3 text-left align-middle">
                            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {formatDriverName(item.strongest_driver)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item.district_id);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-[#DCE2EA] bg-white px-2 py-1 text-[11px] font-semibold text-[#1769AA] hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                            >
                              <Info className="h-3 w-3" />
                              <span>Details</span>
                            </button>
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
              <div className="py-2.5 px-4 border-t border-[#DCE2EA] flex items-center justify-between text-xs text-[#5D6878]">
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                  {riskList?.total || 0} total)
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

          {/* SECTION E: DRILL-DOWN EXPLAINABILITY MODAL / DRAWER */}
          {selectedDetailDistrictId !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="relative w-full max-w-2xl rounded-xl border border-[#DCE2EA] bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE2EA] bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-[#1769AA]" />
                    <div>
                      <h3 className="text-base font-bold text-[#0B1F3A]">
                        {districtDetail?.district_name || `District #${selectedDetailDistrictId}`}
                      </h3>
                      <p className="text-xs text-[#5D6878]">
                        {districtDetail?.state_name} | Assessment: {activePeriod.label}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="p-1 rounded-md text-[#7A8A9E] hover:text-[#0B1F3A] hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-4">
                  {isLoadingDetail ? (
                    <div className="py-12">
                      <LoadingState message="Loading factor contributions and explanation narrative..." />
                    </div>
                  ) : detailError ? (
                    <ErrorState title="Failed to Load District Profile" message={detailError} />
                  ) : districtDetail ? (
                    <>
                      {/* Carved District Lineage Banner */}
                      {districtDetail.is_derived_from_parent && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                          <GitBranch className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Carved Administrative District:</span> Baseline demographic
                            profile and historical crime distributions are inherited from parent district{' '}
                            <strong>{districtDetail.parent_district_name || `#${districtDetail.parent_district_id}`}</strong>{' '}
                            (Census 2011 code #{districtDetail.parent_district_id}). Predictions reflect official territorial lineage mapping.
                          </div>
                        </div>
                      )}

                      {/* Summary Score Header */}
                      <div className="grid grid-cols-3 gap-3 rounded-lg border border-[#DCE2EA] bg-[#F8FAFC] p-4 text-center">
                        <div>
                          <div className="text-xs text-[#5D6878] font-medium">Relative Threat Score</div>
                          <div className="text-2xl font-black font-mono text-[#0B1F3A] mt-0.5">
                            {districtDetail.overall_risk_score.toFixed(1)}
                            <span className="text-xs font-normal text-[#5D6878]"> / 100</span>
                          </div>
                          <div className="text-[10px] text-[#5D6878] mt-0.5">Percentile rank comparison</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#5D6878] font-medium">Risk Level</div>
                          <div className="mt-1.5">{getRiskBadge(districtDetail.risk_level)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#5D6878] font-medium">Primary Driver</div>
                          <div className="mt-1">
                            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                              {formatDriverName(districtDetail.strongest_driver)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Component Factor Breakdown */}
                      <div className="rounded-lg border border-[#DCE2EA] bg-white p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D6878] mb-3">
                          Factor Contributions & Percentile Rankings
                        </h4>
                        <div className="space-y-3">
                          {/* 1. Forecast Volume */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[#0B1F3A]">
                                ML Forecast Volume <span className="text-[#5D6878] font-normal">(Weight: 30%)</span>
                              </span>
                              <span className="font-mono text-[#172033]">
                                {districtDetail.forecast_volume.toFixed(0)} predicted cases ({districtDetail.factor_percentiles.forecast_volume?.toFixed(1) || 0}th percentile)
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1769AA] h-full rounded-full"
                                style={{ width: `${districtDetail.factor_percentiles.forecast_volume || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* 2. Population-Normalized Crime Rate */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[#0B1F3A]">
                                Population-Normalized Crime Rate <span className="text-[#5D6878] font-normal">(Weight: 30%)</span>
                              </span>
                              <span className="font-mono text-[#172033]">
                                {districtDetail.crime_rate_per_100k.toFixed(1)} / 100k ({districtDetail.factor_percentiles.crime_rate_per_100k?.toFixed(1) || 0}th percentile)
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-600 h-full rounded-full"
                                style={{ width: `${districtDetail.factor_percentiles.crime_rate_per_100k || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* 3. Severity Profile */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[#0B1F3A]">
                                Crime Severity Profile <span className="text-[#5D6878] font-normal">(Weight: 20%)</span>
                              </span>
                              <span className="font-mono text-[#172033]">
                                Index {districtDetail.severity_index.toFixed(2)} ({districtDetail.factor_percentiles.severity_index?.toFixed(1) || 0}th percentile)
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-rose-600 h-full rounded-full"
                                style={{ width: `${districtDetail.factor_percentiles.severity_index || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* 4. Recent Trend Ratio */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[#0B1F3A]">
                                Recent Trend Ratio <span className="text-[#5D6878] font-normal">(Weight: 20%)</span>
                              </span>
                              <span className="font-mono text-[#172033]">
                                Ratio {districtDetail.trend_ratio.toFixed(2)}x ({districtDetail.factor_percentiles.trend_ratio?.toFixed(1) || 0}th percentile)
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{ width: `${districtDetail.factor_percentiles.trend_ratio || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Explanation Narrative */}
                      <div className="rounded-lg border border-[#DCE2EA] bg-[#F4F7FA] p-4 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#0B1F3A] mb-1.5">
                          <Info className="h-4 w-4 text-[#1769AA]" />
                          <span>Risk Assessment Narrative</span>
                        </div>
                        <p className="text-[#334155] leading-relaxed">
                          {districtDetail.explanation_summary ||
                            `${districtDetail.district_name} is classified as ${districtDetail.risk_level} risk with an overall threat index of ${districtDetail.overall_risk_score.toFixed(1)}/100, primarily driven by ${formatDriverName(districtDetail.strongest_driver)}.`}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-[#DCE2EA] bg-[#F8FAFC] flex justify-end">
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="px-4 py-2 rounded-lg border border-[#DCE2EA] bg-white text-xs font-semibold text-[#0B1F3A] hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default RiskAssessmentPage;
