import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Activity,
  Scale,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  X,
  RotateCcw,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles,
  FileText,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { StatCard } from '../components/common/StatCard';
import { riskApi, geographyApi } from '../api';
import type {
  RiskOverviewResponse,
  RiskModelInfoResponse,
  RiskListResponse,
  DistrictRiskDetailResponse,
  StateItem,
  DistrictItem,
  RiskTrendsResponse,
  RiskScoreType,
} from '../types';

interface AssessmentPeriodOption {
  value: string;
  label: string;
  scoreType: RiskScoreType;
  version: string;
  badge: string;
}

const AVAILABLE_PERIODS: AssessmentPeriodOption[] = [
  {
    value: '2026-11-01',
    label: 'November 2026 (Forward Horizon Step 1)',
    scoreType: 'FORECAST',
    version: 'risk-v2.0',
    badge: 'Active Future Forecast',
  },
  {
    value: '2026-12-01',
    label: 'December 2026 (Forward Horizon Step 2)',
    scoreType: 'FORECAST',
    version: 'risk-v2.0',
    badge: 'Active Future Forecast',
  },
  {
    value: '2027-01-01',
    label: 'January 2027 (Forward Horizon Step 3)',
    scoreType: 'FORECAST',
    version: 'risk-v2.0',
    badge: 'Active Future Forecast',
  },
  {
    value: '2025-12-01',
    label: 'December 2025 (Historical Observed Actuals)',
    scoreType: 'HISTORICAL',
    version: 'risk-v2.0',
    badge: 'Observed Historical Baseline',
  },
  {
    value: '2026-01-01',
    label: 'January 2026 (Past Forecast Audit Run)',
    scoreType: 'FORECAST',
    version: 'risk-v1.0',
    badge: 'Archived Past Forecast',
  },
];

export const RiskAssessmentPage: React.FC = () => {
  // Period and version selection
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-11-01');
  const currentPeriodConfig = AVAILABLE_PERIODS.find((p) => p.value === selectedPeriod) || AVAILABLE_PERIODS[0];

  // High-level overview & methodology state
  const [overview, setOverview] = useState<RiskOverviewResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<RiskModelInfoResponse | null>(null);
  const [trends, setTrends] = useState<RiskTrendsResponse | null>(null);
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

  // District detail / explainability modal state
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<DistrictRiskDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Loading & error flags
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load of overview, model info, states, trends, and initial table page
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, modelData, statesData, tableData, trendsData] = await Promise.all([
        riskApi.getOverview(selectedPeriod, currentPeriodConfig.version, currentPeriodConfig.scoreType),
        riskApi.getModelInfo(currentPeriodConfig.version),
        geographyApi.getStates('current'),
        riskApi.listRiskScores({
          skip: 0,
          limit: pageSize,
          assessment_period: selectedPeriod,
          calculation_version: currentPeriodConfig.version,
          score_type: currentPeriodConfig.scoreType,
        }),
        riskApi.getTrends(undefined, undefined, 6),
      ]);

      setOverview(overviewData);
      setModelInfo(modelData);
      setStates(statesData.items || []);
      setRiskList(tableData);
      setTrends(trendsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize explainable risk assessment workspace.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, currentPeriodConfig, pageSize]);

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

  // Fetch filtered table data
  const fetchTableData = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const data = await riskApi.listRiskScores({
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        risk_level: selectedRiskLevel || undefined,
        skip,
        limit: pageSize,
        assessment_period: selectedPeriod,
        calculation_version: currentPeriodConfig.version,
        score_type: currentPeriodConfig.scoreType,
      });
      setRiskList(data);
    } catch (err: any) {
      console.error('Failed to load filtered risk records:', err);
    } finally {
      setIsLoadingTable(false);
    }
  }, [selectedStateId, selectedDistrictId, selectedRiskLevel, selectedPeriod, currentPeriodConfig, currentPage, pageSize]);

  // Trigger table fetch on filter or page change
  useEffect(() => {
    if (!isLoading) {
      fetchTableData();
    }
  }, [fetchTableData, isLoading]);

  // Reset filters handler
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedRiskLevel(undefined);
    setCurrentPage(1);
  };

  // Inspect district detail handler
  const handleInspectDistrict = async (districtId: number) => {
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const detail = await riskApi.getDistrictRiskDetail(
        districtId,
        selectedPeriod,
        currentPeriodConfig.version,
        currentPeriodConfig.scoreType
      );
      setSelectedDistrictDetail(detail);
    } catch (err: any) {
      console.error(`Failed to load detail for district ${districtId}:`, err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Format primary risk driver label
  const formatDriverName = (driver?: string | null): string => {
    switch (driver) {
      case 'forecast_volume':
        return 'Forecast Volume';
      case 'historical_volume':
        return 'Observed Incident Volume';
      case 'severity_profile':
        return 'Crime Severity Weight';
      case 'crime_rate_per_100k':
        return 'Per-Capita Rate (Census 2011)';
      case 'trend_ratio':
        return 'Trend Momentum';
      default:
        return driver ? driver.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'N/A';
    }
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
      title="Crime Risk Intelligence"
      subtitle="Explainable jurisdictional threat scoring, empirical risk decomposition, and operational readiness index"
      onRefresh={() => {
        setIsRefreshing(true);
        loadInitialData();
      }}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading explainable crime risk landscape and district threat evaluations..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Risk Assessment Engine Error"
          message={error}
          onRetry={loadInitialData}
        />
      )}

      {!isLoading && !error && overview && (
        <div className="space-y-4">
          {/* ASSESSMENT PERIOD & PROVENANCE BANNER */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-[#EAF3FA] text-[#1769AA] rounded-md shrink-0 mt-0.5 sm:mt-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[#1769AA] bg-[#EAF3FA] px-2 py-0.5 rounded border border-[#1769AA]/20">
                    {currentPeriodConfig.badge}
                  </span>
                  <span className="text-xs font-semibold text-[#0B1F3A]">
                    {currentPeriodConfig.label}
                  </span>
                  <span className="text-[11px] text-[#5D6878]">
                    ({overview.total_assessed_districts} historical districts assessed)
                  </span>
                </div>
                <p className="text-xs text-[#5D6878] mt-1">
                  Engine: <strong className="text-[#0B1F3A]">{overview.methodology_version}</strong> •
                  {currentPeriodConfig.scoreType === 'FORECAST' ? (
                    <span> Anchored at forecast origin <strong className="text-[#0B1F3A]">{overview.forecast_origin_date || '2026-10-01'}</strong> with {overview.active_forecast_model} ({overview.active_forecast_version}).</span>
                  ) : (
                    <span> Evaluated strictly from verified historical incident records and Census 2011 population baseline.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Interactive Period Selector */}
            <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#DCE2EA]">
              <label htmlFor="period-select" className="text-xs font-medium text-[#5D6878] whitespace-nowrap">
                Evaluation Horizon:
              </label>
              <select
                id="period-select"
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium bg-white text-[#0B1F3A] border border-[#DCE2EA] rounded-md px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#1769AA]"
              >
                {AVAILABLE_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION A: TOP RISK KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Assessed Districts"
              value={overview.total_assessed_districts}
              subtext="Census 2011 panel"
              icon={MapPin}
              color="blue"
            />
            <StatCard
              title="Critical Districts"
              value={overview.risk_level_distribution.CRITICAL}
              subtext={`${overview.risk_level_percentages.CRITICAL}% (Score ≥ 65)`}
              icon={AlertTriangle}
              color="rose"
            />
            <StatCard
              title="High Risk"
              value={overview.risk_level_distribution.HIGH}
              subtext={`${overview.risk_level_percentages.HIGH}% (50 ≤ Score < 65)`}
              icon={ShieldAlert}
              color="amber"
            />
            <StatCard
              title="Moderate Risk"
              value={overview.risk_level_distribution.MODERATE}
              subtext={`${overview.risk_level_percentages.MODERATE}% (35 ≤ Score < 50)`}
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
              title="Average Score"
              value={`${overview.mean_risk_score.toFixed(1)}`}
              subtext={`Median: ${overview.median_risk_score.toFixed(1)} / 100`}
              icon={Scale}
              color="blue"
            />
          </div>

          {/* SECTION B: LONGITUDINAL RISK TREND TRAJECTORY */}
          {trends && trends.trends && trends.trends.length > 0 && (
            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 border-b border-[#DCE2EA] pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#EAF3FA] text-[#1769AA]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1F3A]">Longitudinal Multi-Period Risk Trajectory</h3>
                    <p className="text-[11px] text-[#5D6878]">Tracking average composite hazard and critical caseload evolution across periods</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#5D6878] font-medium">
                  {trends.trends.length} Assessed Periods
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {trends.trends.map((pt) => {
                  const isSelected = pt.period === selectedPeriod;
                  return (
                    <button
                      key={pt.period}
                      type="button"
                      onClick={() => setSelectedPeriod(pt.period)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#1769AA] bg-[#EAF3FA]/30 ring-2 ring-[#1769AA]/20'
                          : 'border-[#DCE2EA] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#0B1F3A]">{pt.period.substring(0, 7)}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          pt.score_type === 'FORECAST' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {pt.score_type}
                        </span>
                      </div>
                      <div className="text-lg font-bold font-mono text-[#0B1F3A]">
                        {pt.mean_risk_score.toFixed(1)} <span className="text-xs text-[#5D6878] font-normal">avg</span>
                      </div>
                      <div className="text-[11px] text-[#5D6878] mt-1 flex justify-between">
                        <span>Critical: <strong className="text-rose-600">{pt.critical_districts_count}</strong></span>
                        <span>High: <strong className="text-amber-600">{pt.high_risk_districts_count}</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION C & D: RISK DISTRIBUTION & METHODOLOGY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CARD 1: RISK DISTRIBUTION */}
            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 border-b border-[#DCE2EA] pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#EAF3FA] text-[#1769AA]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1F3A]">Jurisdictional Threat Distribution</h3>
                    <p className="text-[11px] text-[#5D6878]">Classification breakdown across 640 assessed districts</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Critical */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-rose-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                      CRITICAL (Score 65 – 100)
                    </span>
                    <span className="font-medium text-[#0B1F3A]">
                      {overview.risk_level_distribution.CRITICAL} districts ({overview.risk_level_percentages.CRITICAL}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${overview.risk_level_percentages.CRITICAL}%` }}
                    />
                  </div>
                </div>

                {/* High */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      HIGH (Score 50 – 64.99)
                    </span>
                    <span className="font-medium text-[#0B1F3A]">
                      {overview.risk_level_distribution.HIGH} districts ({overview.risk_level_percentages.HIGH}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${overview.risk_level_percentages.HIGH}%` }}
                    />
                  </div>
                </div>

                {/* Moderate */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      MODERATE (Score 35 – 49.99)
                    </span>
                    <span className="font-medium text-[#0B1F3A]">
                      {overview.risk_level_distribution.MODERATE} districts ({overview.risk_level_percentages.MODERATE}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${overview.risk_level_percentages.MODERATE}%` }}
                    />
                  </div>
                </div>

                {/* Low */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      LOW (Score &lt; 35)
                    </span>
                    <span className="font-medium text-[#0B1F3A]">
                      {overview.risk_level_distribution.LOW} districts ({overview.risk_level_percentages.LOW}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${overview.risk_level_percentages.LOW}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#DCE2EA] flex items-center justify-between text-[11px] text-[#5D6878]">
                <span>Score Range: {overview.lowest_risk_score} (Min) to {overview.highest_risk_score} (Max)</span>
                <span>Evaluation Baseline: 640 Census 2011 Districts</span>
              </div>
            </div>

            {/* CARD 2: METHODOLOGY & FACTOR WEIGHTS */}
            <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 border-b border-[#DCE2EA] pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#EAF3FA] text-[#1769AA]">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1F3A]">Scoring Methodology ({overview.methodology_version})</h3>
                    <p className="text-[11px] text-[#5D6878]">Explainable 4-component percentile rank formulation</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-[#0B1F3A] px-2 py-0.5 rounded font-mono font-medium border border-slate-200">
                  {currentPeriodConfig.scoreType}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 text-center">
                <code className="text-xs font-mono font-semibold text-[#0B1F3A]">
                  {modelInfo?.formula ||
                    (currentPeriodConfig.scoreType === 'FORECAST'
                      ? 'Risk = 0.30·Forecast + 0.20·Severity + 0.30·Rate + 0.20·Trend'
                      : 'Risk = 0.25·Volume + 0.25·Severity + 0.25·Rate + 0.25·Trend')}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {currentPeriodConfig.scoreType === 'FORECAST' ? (
                  <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#0B1F3A]">Forecast Volume</span>
                      <span className="font-bold text-[#1769AA]">30%</span>
                    </div>
                    <p className="text-[11px] text-[#5D6878] mt-0.5">
                      Active forward projection from production HGBR model
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#0B1F3A]">Observed Volume</span>
                      <span className="font-bold text-[#1769AA]">25%</span>
                    </div>
                    <p className="text-[11px] text-[#5D6878] mt-0.5">
                      Authentic historical incident counts in target month
                    </p>
                  </div>
                )}

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Severity Profile</span>
                    <span className="font-bold text-[#1769AA]">
                      {currentPeriodConfig.scoreType === 'FORECAST' ? '20%' : '25%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Official weights: Violent (1.5), Fire (1.2), Traffic (1.1), Other (1.0)
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Per-Capita Rate</span>
                    <span className="font-bold text-[#1769AA]">
                      {currentPeriodConfig.scoreType === 'FORECAST' ? '30%' : '25%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Annualized incidents per 100k Census 2011 population
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Trend Momentum</span>
                    <span className="font-bold text-[#1769AA]">
                      {currentPeriodConfig.scoreType === 'FORECAST' ? '20%' : '25%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Recent 3M vs Prior 3M with Laplace +1.0 smoothing
                  </p>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-[#5D6878] bg-slate-50 p-2 rounded border border-slate-200">
                <strong>Analytical Disclaimer:</strong> Scores are relative statistical indices designed for operational readiness and resource allocation. They do NOT represent individuals' risk or guaranteed future crimes.
              </div>
            </div>
          </div>

          {/* SECTION E: FILTER TOOLBAR */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
              {/* State Filter */}
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

              {/* District Filter */}
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

              {/* Risk Level Filter */}
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
            {(selectedStateId || selectedDistrictId || selectedRiskLevel) && (
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

          {/* SECTION F: DISTRICT RISK TABLE */}
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
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3">Risk Level</th>
                      <th className="py-2.5 px-3">Primary Driver</th>
                      <th className="py-2.5 px-3 text-center">Severity</th>
                      <th className="py-2.5 px-3 text-center">Rate Pct</th>
                      <th className="py-2.5 px-3 text-center">Trend Pct</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE2EA]">
                    {riskList.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">
                          {item.district_name || `District #${item.district_id}`}
                        </td>
                        <td className="py-2.5 px-3 text-[#5D6878]">
                          {item.state_name || `State #${item.state_id}`}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-[#0B1F3A]">
                          {item.overall_risk_score.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          {getRiskBadge(item.risk_level)}
                        </td>
                        <td className="py-2.5 px-3 text-[#1769AA] font-medium">
                          {formatDriverName(item.strongest_driver)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#5D6878]">
                          {item.severity_index.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#5D6878]">
                          {item.rate_index !== null && item.rate_index !== undefined ? `${item.rate_index.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#5D6878]">
                          {item.trend_index.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectDistrict(item.district_id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors"
                          >
                            Explain
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION G: EXPLAINABILITY DETAIL MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-[#DCE2EA] max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE2EA]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#EAF3FA] text-[#1769AA]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1F3A]">
                    {selectedDistrictDetail?.district_name || 'District Explainability Profile'}
                  </h3>
                  <p className="text-xs text-[#5D6878]">
                    {selectedDistrictDetail?.state_name} • Period: {selectedDistrictDetail?.assessment_period} ({selectedDistrictDetail?.calculation_version})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedDistrictDetail(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail || !selectedDistrictDetail ? (
              <div className="py-8">
                <LoadingState message="Retrieving explainable factor decomposition..." />
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {/* Score & Driver Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider">
                      Composite Risk Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-bold font-mono text-[#0B1F3A]">
                        {selectedDistrictDetail.overall_risk_score.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#5D6878]">/ 100</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider">
                      Primary Risk Driver
                    </span>
                    <p className="text-sm font-bold text-[#1769AA] mt-1">
                      {formatDriverName(selectedDistrictDetail.strongest_driver)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider">
                      Assigned Band
                    </span>
                    <div className="mt-1">
                      {getRiskBadge(selectedDistrictDetail.risk_level)}
                    </div>
                  </div>
                </div>

                {/* PLAIN-LANGUAGE EXPLAINABILITY NARRATIVE */}
                {selectedDistrictDetail.explanation_summary && (
                  <div className="p-3.5 bg-[#EAF3FA]/50 rounded-lg border border-[#1769AA]/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1769AA] mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Audited Explainability Assessment
                    </div>
                    <p className="text-xs text-[#0B1F3A] leading-relaxed">
                      {selectedDistrictDetail.explanation_summary}
                    </p>
                  </div>
                )}

                {/* FACTOR BREAKDOWN CARDS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D6878] mb-2">
                    Component Factor Breakdown & Percentile Positions
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Dynamic Factor Cards */}
                    {Object.entries(selectedDistrictDetail.factor_contributions).map(([fKey, fVal]) => {
                      if (!fVal) return null;
                      return (
                        <div key={fKey} className="rounded border border-[#DCE2EA] bg-white p-3 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-[#0B1F3A]">
                              {formatDriverName(fKey)}
                            </span>
                            <span className="font-bold text-[#1769AA]">
                              {(fVal.weight * 100).toFixed(0)}% Weight
                            </span>
                          </div>
                          <div className="flex justify-between text-[#5D6878] text-[11px]">
                            <span>Raw: <strong>{fVal.raw}</strong></span>
                            <span>Percentile: <strong>{fVal.percentile.toFixed(1)}%</strong></span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                            <span className="text-[#5D6878]">Weighted Contribution:</span>
                            <span className="text-[#0B1F3A] font-mono">
                              +{fVal.weighted.toFixed(2)} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Demographic & Provenance Metadata */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-[#5D6878]">
                    <span>Census 2011 Population Baseline:</span>
                    <strong className="text-[#0B1F3A] font-mono">
                      {selectedDistrictDetail.census_2011_population.toLocaleString()} residents
                    </strong>
                  </div>
                  {selectedDistrictDetail.model_version && (
                    <div className="flex justify-between text-[#5D6878]">
                      <span>Model Provenance:</span>
                      <strong className="text-[#0B1F3A]">
                        {selectedDistrictDetail.model_name || 'HGBR Model'} ({selectedDistrictDetail.model_version})
                      </strong>
                    </div>
                  )}
                  {selectedDistrictDetail.forecast_origin_date && (
                    <div className="flex justify-between text-[#5D6878]">
                      <span>Forecast Anchor Origin:</span>
                      <strong className="text-[#0B1F3A]">
                        {selectedDistrictDetail.forecast_origin_date}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Operational Disclaimer */}
                <div className="text-[11px] text-[#5D6878] italic p-2 bg-slate-50 rounded border border-slate-200">
                  * Operational Notice: This composite risk score is an empirical planning metric calculated to support resource prioritization. It is not an individual person's risk score and must not be used as the sole basis for punitive or operational decisions.
                </div>

                {/* Footer Modal Action */}
                <div className="flex justify-end pt-2 border-t border-[#DCE2EA]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setSelectedDistrictDetail(null);
                    }}
                    className="px-4 py-1.5 rounded bg-slate-100 text-[#0B1F3A] hover:bg-slate-200 text-xs font-medium transition-colors"
                  >
                    Close
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
