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
  RiskItem,
  StateItem,
  DistrictItem,
} from '../types';

export const RiskAssessmentPage: React.FC = () => {
  // High-level overview & methodology state
  const [overview, setOverview] = useState<RiskOverviewResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<RiskModelInfoResponse | null>(null);
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

  // Initial load of overview, model info, states, and initial table page
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, modelData, statesData, tableData] = await Promise.all([
        riskApi.getOverview('2026-01-01', 'risk-v1.0'),
        riskApi.getModelInfo(),
        geographyApi.getStates('historical'),
        riskApi.listRiskScores({
          skip: 0,
          limit: pageSize,
          assessment_period: '2026-01-01',
          calculation_version: 'risk-v1.0',
        }),
      ]);

      setOverview(overviewData);
      setModelInfo(modelData);
      setStates(statesData.items || []);
      setRiskList(tableData);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize risk assessment workspace.');
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
        .getDistricts(selectedStateId, 'historical')
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
        assessment_period: '2026-01-01',
        calculation_version: 'risk-v1.0',
      });
      setRiskList(data);
    } catch (err: any) {
      console.error('Failed to load filtered risk records:', err);
    } finally {
      setIsLoadingTable(false);
    }
  }, [selectedStateId, selectedDistrictId, selectedRiskLevel, currentPage, pageSize]);

  // Trigger table fetch on filter or page change
  useEffect(() => {
    // Avoid double fetch on first mount
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
      const detail = await riskApi.getDistrictRiskDetail(districtId, '2026-01-01', 'risk-v1.0');
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
        return 'Historical Baseline';
      case 'crime_rate_per_100k':
        return 'Per-Capita Rate';
      case 'trend_ratio':
        return 'Trend Momentum';
      default:
        return driver || 'N/A';
    }
  };

  // Risk band badge generator
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            MODERATE
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
      title="Risk Assessment"
      subtitle="Jurisdictional hazard evaluation, empirical threat levels, and explainable risk drivers"
      onRefresh={() => {
        setIsRefreshing(true);
        loadInitialData();
      }}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading production risk landscape and district threat evaluations..." />
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-[#DCE2EA] bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#EAF3FA] text-[#1769AA] rounded shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#1769AA] bg-[#EAF3FA] px-1.5 py-0.5 rounded border border-[#1769AA]/20">
                    Assessment Period: January 2026
                  </span>
                  <span className="text-[11px] font-medium text-[#5D6878]">
                    Production Run (Evaluated: {overview.assessment_period})
                  </span>
                </div>
                <p className="text-[12px] text-[#5D6878] mt-0.5">
                  Methodology: <strong className="text-[#0B1F3A]">{overview.methodology_version}</strong> • Evaluates 640 historical administrative districts combining 2025 incident baselines with January 2026 HGBR forecasts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] bg-slate-100 text-[#0B1F3A] px-2.5 py-1 rounded border border-slate-200 font-medium">
                Model: {overview.active_forecast_model} ({overview.active_forecast_version})
              </span>
            </div>
          </div>

          {/* SECTION A: TOP RISK KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Assessed Districts"
              value={overview.total_assessed_districts}
              subtext="Historical panel coverage"
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

          {/* SECTION B & C: RISK DISTRIBUTION & METHODOLOGY */}
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
                <span>Normal Rank Population: 640 districts</span>
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
                    <p className="text-[11px] text-[#5D6878]">Explainable 4-factor percentile rank formulation</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-[#0B1F3A] px-2 py-0.5 rounded font-mono font-medium border border-slate-200">
                  Deterministic
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 text-center">
                <code className="text-xs font-mono font-semibold text-[#0B1F3A]">
                  {modelInfo?.formula || 'Risk Score = 0.30·Forecast + 0.20·Volume + 0.30·Rate + 0.20·Trend'}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Forecast Volume</span>
                    <span className="font-bold text-[#1769AA]">30%</span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    1-month forward workload projection from HGBR model
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Crime Rate</span>
                    <span className="font-bold text-[#1769AA]">30%</span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Annualized incidents per 100k Census 2011 population baseline
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Historical Baseline</span>
                    <span className="font-bold text-[#1769AA]">20%</span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Sustained 12-month volume from 2025 actual incidents
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#DCE2EA]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0B1F3A]">Trend Momentum</span>
                    <span className="font-bold text-[#1769AA]">20%</span>
                  </div>
                  <p className="text-[11px] text-[#5D6878] mt-0.5">
                    Short-term surge: Recent 3M vs Prior 3M with +1 smoothing
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#DCE2EA] flex flex-col gap-1 text-[11px] text-[#5D6878]">
                <span>Normalization: {modelInfo?.normalization || 'Percentile Rank Normalization [0, 100]'}</span>
                <span>Active Model: {modelInfo?.active_model_name || overview.active_forecast_model} ({modelInfo?.active_model_version || overview.active_forecast_version})</span>
                <span className="italic mt-1">
                  * Note: Incident severity is tracked as an auxiliary audit index (0% score weight). Risk Assessment is an explainable synthesis, not a black-box model.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION D: HIGHEST-RISK DISTRICTS */}
          <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-[#DCE2EA] pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-rose-50 text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1F3A]">Top 10 Critical Jurisdictions</h3>
                  <p className="text-[11px] text-[#5D6878]">Districts requiring immediate operational attention and patrol prioritization</p>
                </div>
              </div>
              <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                High Workload Priority
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DCE2EA] text-[#5D6878] bg-slate-50/70 font-semibold">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Primary Risk Driver</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.top_risk_districts.map((item: RiskItem, idx: number) => (
                    <tr
                      key={item.id}
                      onClick={() => handleInspectDistrict(item.district_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[#5D6878]">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#0B1F3A] group-hover:text-[#1769AA]">
                        {item.district_name}
                      </td>
                      <td className="py-2.5 px-3 text-[#5D6878]">
                        {item.state_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#0B1F3A] text-sm">
                          {item.overall_risk_score.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#5D6878] ml-1">/ 100</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {getRiskBadge(item.risk_level)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B1F3A] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formatDriverName(item.strongest_driver)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectDistrict(item.district_id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1769AA] hover:text-[#0B1F3A] bg-[#EAF3FA] hover:bg-[#D9E1EA] px-2 py-1 rounded transition-colors"
                        >
                          Inspect <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION E: FULL DISTRICT RISK REGISTRY WITH SERVER-SIDE FILTERING */}
          <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[#DCE2EA] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1F3A]">Jurisdictional Risk Registry</h3>
                <p className="text-[11px] text-[#5D6878]">
                  Browse, filter, and inspect detailed threat scores across all {riskList?.total || 640} districts
                </p>
              </div>

              {/* FILTER CONTROLS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* State dropdown */}
                <select
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedStateId(val);
                    setSelectedDistrictId(undefined);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-[#DCE2EA] bg-white px-2.5 py-1 text-xs text-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                >
                  <option value="">All States ({states.length})</option>
                  {states.map((s: StateItem) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>

                {/* District dropdown */}
                <select
                  value={selectedDistrictId || ''}
                  disabled={!selectedStateId || districts.length === 0}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedDistrictId(val);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-[#DCE2EA] bg-white px-2.5 py-1 text-xs text-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {selectedStateId ? `All Districts (${districts.length})` : 'Select State First'}
                  </option>
                  {districts.map((d: DistrictItem) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>

                {/* Risk Level dropdown */}
                <select
                  value={selectedRiskLevel || ''}
                  onChange={(e) => {
                    setSelectedRiskLevel(e.target.value || undefined);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-[#DCE2EA] bg-white px-2.5 py-1 text-xs text-[#0B1F3A] focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                >
                  <option value="">All Risk Levels</option>
                  <option value="CRITICAL">CRITICAL (≥ 65)</option>
                  <option value="HIGH">HIGH (50 – 64.99)</option>
                  <option value="MODERATE">MODERATE (35 – 49.99)</option>
                  <option value="LOW">LOW (&lt; 35)</option>
                </select>

                {/* Reset filters */}
                {(selectedStateId || selectedDistrictId || selectedRiskLevel) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs text-[#5D6878] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* TABLE BODY */}
            {isLoadingTable ? (
              <div className="py-8">
                <LoadingState message="Loading filtered risk assessments..." />
              </div>
            ) : !riskList || riskList.items.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="No Districts Match the Criteria"
                  message="Try clearing or adjusting the selected state, district, or risk level filters."
                  onClearFilters={handleResetFilters}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE2EA] text-[#5D6878] bg-slate-50/70 font-semibold">
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3">Risk Score</th>
                      <th className="py-2.5 px-3">Level</th>
                      <th className="py-2.5 px-3">Primary Driver</th>
                      <th className="py-2.5 px-3">Factor Ranks (F / V / R / T)</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskList.items.map((row: RiskItem) => (
                      <tr
                        key={row.id}
                        onClick={() => handleInspectDistrict(row.district_id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3 font-semibold text-[#0B1F3A] group-hover:text-[#1769AA]">
                          {row.district_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#5D6878]">
                          {row.state_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0B1F3A]">
                              {row.overall_risk_score.toFixed(2)}
                            </span>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-1.5 rounded-full ${
                                  row.risk_level === 'CRITICAL'
                                    ? 'bg-rose-600'
                                    : row.risk_level === 'HIGH'
                                    ? 'bg-amber-500'
                                    : row.risk_level === 'MODERATE'
                                    ? 'bg-blue-600'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, row.overall_risk_score)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {getRiskBadge(row.risk_level)}
                        </td>
                        <td className="py-2.5 px-3 text-[#5D6878]">
                          {formatDriverName(row.strongest_driver)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] text-[#5D6878]">
                            {row.forecast_index !== null && row.forecast_index !== undefined ? row.forecast_index.toFixed(0) : '-'} / {row.volume_index.toFixed(0)} / {row.rate_index !== null && row.rate_index !== undefined ? row.rate_index.toFixed(0) : '-'} / {row.trend_index.toFixed(0)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectDistrict(row.district_id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1769AA] hover:text-[#0B1F3A] bg-[#EAF3FA] hover:bg-[#D9E1EA] px-2 py-1 rounded transition-colors"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {riskList && riskList.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-[#DCE2EA] text-xs text-[#5D6878]">
                <div>
                  Showing{' '}
                  <strong className="text-[#0B1F3A]">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-[#0B1F3A]">
                    {Math.min(currentPage * pageSize, riskList.total)}
                  </strong>{' '}
                  of <strong className="text-[#0B1F3A]">{riskList.total}</strong> assessed districts
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white text-[#0B1F3A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-medium text-[#0B1F3A]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-[#DCE2EA] bg-white text-[#0B1F3A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION F: DISTRICT DETAIL & EXPLAINABILITY MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#DCE2EA] bg-white p-5 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#DCE2EA] pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0B1F3A]">
                    {selectedDistrictDetail ? selectedDistrictDetail.district_name : 'District Risk Analysis'}
                  </h3>
                  {selectedDistrictDetail && getRiskBadge(selectedDistrictDetail.risk_level)}
                </div>
                {selectedDistrictDetail && (
                  <p className="text-xs text-[#5D6878] mt-0.5">
                    {selectedDistrictDetail.state_name} • Population Baseline: {selectedDistrictDetail.census_2011_population.toLocaleString()} (Census 2011)
                  </p>
                )}
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
              <div className="space-y-4">
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
                      Auxiliary Severity
                    </span>
                    <p className="text-sm font-semibold text-[#0B1F3A] mt-1">
                      {selectedDistrictDetail.severity_index.toFixed(2)}{' '}
                      <span className="text-[10px] text-[#5D6878] font-normal">(Audit index)</span>
                    </p>
                  </div>
                </div>

                {/* FACTOR BREAKDOWN CARDS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D6878] mb-2">
                    Explainable Factor Contributions (risk-v1.0)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Forecast Factor */}
                    <div className="rounded border border-[#DCE2EA] bg-white p-3 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[#0B1F3A]">Forecast Volume</span>
                        <span className="font-bold text-[#1769AA]">30% Weight</span>
                      </div>
                      <div className="flex justify-between text-[#5D6878] text-[11px]">
                        <span>Projected: <strong>{selectedDistrictDetail.factor_contributions.forecast_volume.raw.toFixed(1)}</strong></span>
                        <span>Percentile: <strong>{selectedDistrictDetail.factor_contributions.forecast_volume.percentile.toFixed(1)}%</strong></span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                        <span className="text-[#5D6878]">Weighted Contribution:</span>
                        <span className="text-[#0B1F3A] font-mono">
                          +{selectedDistrictDetail.factor_contributions.forecast_volume.weighted.toFixed(2)} pts
                        </span>
                      </div>
                    </div>

                    {/* Historical Volume Factor */}
                    <div className="rounded border border-[#DCE2EA] bg-white p-3 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[#0B1F3A]">Historical Volume</span>
                        <span className="font-bold text-[#1769AA]">20% Weight</span>
                      </div>
                      <div className="flex justify-between text-[#5D6878] text-[11px]">
                        <span>2025 Total: <strong>{selectedDistrictDetail.factor_contributions.historical_volume.raw}</strong></span>
                        <span>Percentile: <strong>{selectedDistrictDetail.factor_contributions.historical_volume.percentile.toFixed(1)}%</strong></span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                        <span className="text-[#5D6878]">Weighted Contribution:</span>
                        <span className="text-[#0B1F3A] font-mono">
                          +{selectedDistrictDetail.factor_contributions.historical_volume.weighted.toFixed(2)} pts
                        </span>
                      </div>
                    </div>

                    {/* Crime Rate Factor */}
                    <div className="rounded border border-[#DCE2EA] bg-white p-3 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[#0B1F3A]">Crime Rate per 100k</span>
                        <span className="font-bold text-[#1769AA]">30% Weight</span>
                      </div>
                      <div className="flex justify-between text-[#5D6878] text-[11px]">
                        <span>Rate: <strong>{selectedDistrictDetail.factor_contributions.crime_rate_per_100k.raw.toFixed(2)}</strong></span>
                        <span>Percentile: <strong>{selectedDistrictDetail.factor_contributions.crime_rate_per_100k.percentile.toFixed(1)}%</strong></span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                        <span className="text-[#5D6878]">Weighted Contribution:</span>
                        <span className="text-[#0B1F3A] font-mono">
                          +{selectedDistrictDetail.factor_contributions.crime_rate_per_100k.weighted.toFixed(2)} pts
                        </span>
                      </div>
                    </div>

                    {/* Trend Factor */}
                    <div className="rounded border border-[#DCE2EA] bg-white p-3 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[#0B1F3A]">Trend Ratio</span>
                        <span className="font-bold text-[#1769AA]">20% Weight</span>
                      </div>
                      <div className="flex justify-between text-[#5D6878] text-[11px]">
                        <span>Ratio: <strong>{selectedDistrictDetail.factor_contributions.trend_ratio.raw.toFixed(2)}x</strong></span>
                        <span>Percentile: <strong>{selectedDistrictDetail.factor_contributions.trend_ratio.percentile.toFixed(1)}%</strong></span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                        <span className="text-[#5D6878]">Weighted Contribution:</span>
                        <span className="text-[#0B1F3A] font-mono">
                          +{selectedDistrictDetail.factor_contributions.trend_ratio.weighted.toFixed(2)} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Synthesis Box */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                  <span className="font-semibold text-[#0B1F3A] block mb-1">Score Synthesis Equation:</span>
                  <div className="font-mono text-[11px] text-[#5D6878] flex flex-wrap items-center gap-1">
                    <span>{selectedDistrictDetail.factor_contributions.forecast_volume.weighted.toFixed(2)} (F)</span>
                    <span>+</span>
                    <span>{selectedDistrictDetail.factor_contributions.historical_volume.weighted.toFixed(2)} (V)</span>
                    <span>+</span>
                    <span>{selectedDistrictDetail.factor_contributions.crime_rate_per_100k.weighted.toFixed(2)} (R)</span>
                    <span>+</span>
                    <span>{selectedDistrictDetail.factor_contributions.trend_ratio.weighted.toFixed(2)} (T)</span>
                    <span>=</span>
                    <strong className="text-[#0B1F3A] font-bold text-xs">
                      {selectedDistrictDetail.overall_risk_score.toFixed(2)}
                    </strong>
                  </div>
                  <p className="text-[10px] text-[#5D6878] mt-1.5">
                    * The sum of all four weighted contributions exactly equals the final composite risk score.
                  </p>
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
