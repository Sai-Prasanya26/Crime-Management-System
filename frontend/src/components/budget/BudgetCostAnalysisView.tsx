import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  RotateCcw,
  Play,
  Layers,
  Building2,
  Car,
  Users,
  Eye,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Scale,
  Sparkles,
} from 'lucide-react';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import EmptyState from '../common/EmptyState';
import { StatCard } from '../common/StatCard';
import { budgetApi, optimizationApi } from '../../api';
import type {
  BudgetOverview,
  BudgetEstimationRun,
  CostBenchmarkRateItem,
  ScenarioCostComparison,
  StateItem,
  OptimizationRunResponse,
} from '../../types';

interface BudgetCostAnalysisViewProps {
  states?: StateItem[];
  selectedStateId?: number;
  onStateSelect?: (stateId: number | undefined) => void;
}

type CostTabType = 'scenarios' | 'categories' | 'districts' | 'benchmarks' | 'runs';

export const BudgetCostAnalysisView: React.FC<BudgetCostAnalysisViewProps> = ({
  states = [],
  selectedStateId,
  onStateSelect,
}) => {
  // Navigation & filters
  const [activeTab, setActiveTab] = useState<CostTabType>('scenarios');
  const [periodYear, setPeriodYear] = useState<number | undefined>(undefined);
  const [periodMonth, setPeriodMonth] = useState<number | undefined>(undefined);
  const [isAnnualView, setIsAnnualView] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQualityTier, setSelectedQualityTier] = useState<string>('ALL');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');

  // Optimization runs selector for scenario estimation
  const [optRuns, setOptRuns] = useState<OptimizationRunResponse[]>([]);
  const [selectedOptRunId, setSelectedOptRunId] = useState<string>('');
  const [baselineOptRunId, setBaselineOptRunId] = useState<string>('');
  const [scenarioOptRunId, setScenarioOptRunId] = useState<string>('');

  // Primary data states
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [activeRun, setActiveRun] = useState<BudgetEstimationRun | null>(null);
  const [benchmarks, setBenchmarks] = useState<CostBenchmarkRateItem[]>([]);
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioCostComparison | null>(null);

  // Loading & error handling
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency in INR
  const formatINR = useCallback((val: number | null | undefined, inCrores = false) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (inCrores) {
      const cr = val / 10000000;
      return `₹${cr.toFixed(2)} Cr`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  }, []);

  // Format Lakhs
  const formatLakhs = useCallback((val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const lk = val / 100000;
    return `₹${lk.toFixed(2)} L`;
  }, []);

  // Initial data loader
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, benchmarksData, runsList, optRunsRes] = await Promise.all([
        budgetApi.getOverview('2026-01-01'),
        budgetApi.getBenchmarks(),
        budgetApi.getRuns({ limit: 10 }),
        optimizationApi.listRuns({ limit: 20 }),
      ]);

      const optRunsList = optRunsRes.items || [];
      setOverview(overviewData);
      setBenchmarks(benchmarksData);
      setOptRuns(optRunsList);

      if (runsList && runsList.length > 0) {
        // Fetch full details of the latest run
        const latestDetailed = await budgetApi.getRunById(runsList[0].run_id);
        setActiveRun(latestDetailed);
      }

      // Do not auto-select runs - require user explicit selection
      setSelectedOptRunId('');
      setBaselineOptRunId('');
      setScenarioOptRunId('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to initialize budget module.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Execute Dynamic Budget Estimation
  const handleExecuteEstimation = async () => {
    if (!selectedOptRunId) {
      setError('Please select an optimization scenario run to estimate costs.');
      return;
    }
    setIsEstimating(true);
    setError(null);
    try {
      const runRes = await budgetApi.estimateBudget({
        optimization_run_id: selectedOptRunId,
        period_year: periodYear || 2026,
        period_month: periodMonth || 1,
        include_procurement: true,
      });
      // Fetch full details
      const fullRun = await budgetApi.getRunById(runRes.run_id);
      setActiveRun(fullRun);

      // Refresh overview
      const ov = await budgetApi.getOverview('2026-01-01');
      setOverview(ov);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Budget estimation failed.');
    } finally {
      setIsEstimating(false);
    }
  };

  // Compare Two Scenarios
  const handleCompareScenarios = async () => {
    if (!baselineOptRunId || !scenarioOptRunId) {
      setError('Please select both a baseline and scenario run to compare.');
      return;
    }
    setIsComparing(true);
    setError(null);
    try {
      const comp = await budgetApi.compareScenarios({
        baseline_run_id: baselineOptRunId,
        scenario_run_id: scenarioOptRunId,
      });
      setScenarioComparison(comp);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Scenario comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  // Available districts for the selected state in activeRun items
  const stateDistrictOptions = useMemo(() => {
    if (!selectedStateId || !activeRun?.items || !states) return [];
    const selectedState = states.find((s) => s.id === selectedStateId);
    if (!selectedState) return [];
    const names = new Set<string>();
    for (const item of activeRun.items) {
      if (item.state_name && item.state_name.toLowerCase() === selectedState.state_name.toLowerCase()) {
        if (item.district_name) names.add(item.district_name);
      }
    }
    return Array.from(names).sort();
  }, [selectedStateId, activeRun?.items, states]);

  // Filtered district items
  const filteredDistrictItems = useMemo(() => {
    if (!activeRun?.items) return [];
    let list = activeRun.items;

    if (selectedStateId && states && states.length > 0) {
      const selectedState = states.find((s) => s.id === selectedStateId);
      if (selectedState) {
        list = list.filter(
          (it) => it.state_name && it.state_name.toLowerCase() === selectedState.state_name.toLowerCase()
        );
      }
    }

    if (selectedDistrictName) {
      list = list.filter(
        (it) => it.district_name && it.district_name.toLowerCase() === selectedDistrictName.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (it) =>
          (it.district_name && it.district_name.toLowerCase().includes(q)) ||
          (it.state_name && it.state_name.toLowerCase().includes(q))
      );
    }

    if (selectedQualityTier !== 'ALL') {
      list = list.filter((it) => it.data_quality_tier === selectedQualityTier);
    }

    return list;
  }, [activeRun?.items, searchQuery, selectedQualityTier, selectedStateId, selectedDistrictName, states]);

  if (isLoading) {
    return <LoadingState message="Loading financial benchmarks, cost models, and scenario runs..." />;
  }

  return (
    <div className="space-y-4">
      {/* 1. Main Filter and Action Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
            {/* Optimization Run Selector */}
            <select
              aria-label="Optimization Run"
              value={selectedOptRunId}
              onChange={(e) => {
                setSelectedOptRunId(e.target.value);
                setPeriodYear(undefined);
                setPeriodMonth(undefined);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">Select Optimization Run</option>
              {optRuns.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.scenario_name} ({r.allocation_mode})
                </option>
              ))}
            </select>

            {/* Year Selector (Revealed after Optimization Run is selected) */}
            {Boolean(selectedOptRunId) && (
              <select
                aria-label="Year"
                value={periodYear || ''}
                onChange={(e) => {
                  setPeriodYear(e.target.value ? parseInt(e.target.value, 10) : undefined);
                  setPeriodMonth(undefined);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">Select Year</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            )}

            {/* Month Selector (Revealed after Year is selected) */}
            {Boolean(periodYear) && (
              <select
                aria-label="Month"
                value={periodMonth || ''}
                onChange={(e) => setPeriodMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">Select Month</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters */}
            {Boolean(selectedOptRunId || periodYear || periodMonth) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOptRunId('');
                  setPeriodYear(undefined);
                  setPeriodMonth(undefined);
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsAnnualView(!isAnnualView)}
              className="h-10 inline-flex items-center justify-center px-3 rounded border border-[#D9E1EA] bg-white text-[12px] font-medium text-[#5D6878] hover:bg-[#F4F7FA] hover:text-[#172033] shadow-2xs cursor-pointer transition-colors shrink-0"
            >
              <span>View:</span>
              <span className="ml-1 font-semibold text-[#1769AA]">
                {isAnnualView ? 'Annual Projections' : 'Monthly Recurring'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Run Cost Estimation Button */}
            <button
              type="button"
              onClick={handleExecuteEstimation}
              disabled={isEstimating || !selectedOptRunId}
              className="h-10 inline-flex items-center justify-center gap-1.5 rounded bg-[#1769AA] hover:bg-[#125386] px-4 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isEstimating ? 'Estimating...' : 'Run Cost Estimation'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadInitialData()}
              title="Refresh Data"
              className="h-10 inline-flex items-center justify-center gap-1.5 rounded border border-[#D9E1EA] bg-white px-3 text-xs font-medium text-[#5D6878] hover:bg-[#F4F7FA] hover:text-[#172033] shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && <ErrorState message={error} onRetry={loadInitialData} />}

      {/* 2. Simulation Disclaimer Banner (if active run is simulation) */}
      {activeRun?.estimation_mode === 'SIMULATION_ESTIMATE' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-purple-200 bg-purple-50/70 px-4 py-2.5 text-xs text-purple-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold border border-purple-200 uppercase tracking-wide shrink-0">
              <Sparkles className="h-3 w-3 text-purple-600" />
              Hypothetical Simulation
            </span>
            <span className="text-slate-600">
              Figures reflect standard projected costs under simulated allocations and do not represent sanctioned public expenditures.
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-purple-800 shrink-0">
            Run: {activeRun.run_id}
          </span>
        </div>
      )}

      {/* 3. Insufficient Data Notice (if active run halted due to unrecorded district baselines) */}
      {activeRun?.estimation_mode === 'INSUFFICIENT_DATA' && (
        <div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Cost estimation is unavailable because verified resource inventory data is missing for the selected scope. You can run a hypothetical simulation to explore estimated costs.
            </span>
          </div>
        </div>
      )}

      {/* 4. Top KPI StatCards */}
      {activeRun && activeRun.estimation_mode !== 'INSUFFICIENT_DATA' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title={isAnnualView ? 'Scenario Annual Operating Cost' : 'Scenario Monthly O&M Cost'}
            value={
              isAnnualView
                ? formatINR(activeRun.total_scenario_recurring_annual, true)
                : formatINR(activeRun.total_scenario_recurring_monthly)
            }
            subtext={
              isAnnualView
                ? `Baseline: ${formatINR(activeRun.total_baseline_recurring_annual, true)}`
                : `Baseline: ${formatINR(activeRun.total_baseline_recurring_monthly)}`
            }
            icon={Coins}
            color="navy"
          />
          <StatCard
            title="Incremental Cost Difference"
            value={formatINR(activeRun.incremental_recurring_cost, true)}
            icon={TrendingUp}
            color={activeRun.incremental_recurring_cost > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Capital Procurement Cost"
            value={formatINR(activeRun.total_one_time_procurement_cost, true)}
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Shortfall Resolution Total"
            value={formatINR(activeRun.total_shortfall_resolution_cost, true)}
            icon={Coins}
            color="emerald"
          />
        </div>
      )}

      {/* 5. Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]">
        {[
          { key: 'scenarios', label: 'Scenario Comparison', icon: Scale },
          { key: 'categories', label: 'Cost Breakdown', icon: Layers },
          { key: 'districts', label: 'District Costs', icon: Building2 },
          { key: 'benchmarks', label: 'Cost Benchmarks', icon: FileText },
          { key: 'runs', label: 'History', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as CostTabType)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0B1F3A] text-white font-semibold shadow-2xs'
                  : 'bg-white text-[#5D6878] border border-[#D9E1EA]/60 hover:bg-[#EAF3FA] hover:text-[#0B1F3A]'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#1D7FE2]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 6. TAB CONTENT */}
      <div className="bg-white rounded-lg border border-[#D9E1EA] p-4 shadow-2xs">
        {/* ================================================================= */}
        {/* TAB 1: SCENARIO COMPARISON                                        */}
        {/* ================================================================= */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {/* Scenario Selection Header */}
            <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA] p-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-[#5D6878] shrink-0">Baseline:</label>
                    <select
                      aria-label="Baseline Scenario"
                      value={baselineOptRunId}
                      onChange={(e) => {
                        setBaselineOptRunId(e.target.value);
                        setScenarioOptRunId('');
                        setScenarioComparison(null);
                      }}
                      className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                    >
                      <option value="">Select Baseline Scenario</option>
                      {optRuns.map((r) => (
                        <option key={`base-${r.run_id}`} value={r.run_id}>
                          {r.scenario_name} ({r.allocation_mode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {Boolean(baselineOptRunId) && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-[#5D6878] shrink-0">Comparison:</label>
                      <select
                        aria-label="Comparison Scenario"
                        value={scenarioOptRunId}
                        onChange={(e) => setScenarioOptRunId(e.target.value)}
                        className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                      >
                        <option value="">Select Comparison Scenario</option>
                        {optRuns
                          .filter((r) => r.run_id !== baselineOptRunId)
                          .map((r) => (
                            <option key={`scen-${r.run_id}`} value={r.run_id}>
                              {r.scenario_name} ({r.allocation_mode})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {(baselineOptRunId || scenarioOptRunId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBaselineOptRunId('');
                        setScenarioOptRunId('');
                        setScenarioComparison(null);
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCompareScenarios}
                  disabled={isComparing || !baselineOptRunId || !scenarioOptRunId}
                  className="h-10 inline-flex items-center justify-center gap-1.5 rounded bg-[#1769AA] hover:bg-[#125386] px-4 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>{isComparing ? 'Comparing...' : 'Compare Scenarios'}</span>
                </button>
              </div>
            </div>

            {/* Comparison Results Card or Compact Empty State */}
            {scenarioComparison ? (
              <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1F3A]">
                      {scenarioComparison.scenario_name}
                    </h4>
                    <p className="text-xs text-[#5D6878]">
                      Baseline: <span className="font-mono text-[#172033]">{scenarioComparison.baseline_run_id}</span> vs Comparison: <span className="font-mono text-[#172033]">{scenarioComparison.scenario_run_id}</span>
                    </p>
                  </div>
                  {scenarioComparison.is_simulation && (
                    <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-bold border border-purple-200 uppercase tracking-wide shrink-0">
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      Hypothetical Simulation
                    </span>
                  )}
                </div>

                {/* Side-by-side metric tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]/70 p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-[#5D6878] uppercase">Baseline Recurring</span>
                    <div className="text-lg font-bold text-[#0B1F3A]">
                      {formatINR(scenarioComparison.baseline_recurring_annual, true)}
                    </div>
                    <span className="text-[11px] text-[#5D6878]">
                      {formatINR(scenarioComparison.baseline_recurring_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]/70 p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-[#5D6878] uppercase">Scenario Recurring</span>
                    <div className="text-lg font-bold text-[#1769AA]">
                      {formatINR(scenarioComparison.scenario_recurring_annual, true)}
                    </div>
                    <span className="text-[11px] text-[#5D6878]">
                      {formatINR(scenarioComparison.scenario_recurring_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]/70 p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-[#5D6878] uppercase">Cost Difference (ΔCost)</span>
                    <div className={`text-lg font-bold ${scenarioComparison.incremental_recurring_annual > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {scenarioComparison.incremental_recurring_annual > 0
                        ? `+${formatINR(scenarioComparison.incremental_recurring_annual, true)}`
                        : formatINR(scenarioComparison.incremental_recurring_annual, true)}
                    </div>
                    <span className="text-[11px] text-[#5D6878]">
                      Δ {formatINR(scenarioComparison.net_delta_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]/70 p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-[#5D6878] uppercase">Capital Procurement</span>
                    <div className="text-lg font-bold text-[#0B1F3A]">
                      {formatINR(scenarioComparison.capital_procurement_cost, true)}
                    </div>
                    <span className="text-[11px] text-[#5D6878]">
                      {scenarioComparison.units_newly_procured.toLocaleString()} units newly procured
                    </span>
                  </div>
                </div>

                {/* Reallocation vs Procurement Strategy */}
                <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 space-y-2.5">
                  <h5 className="text-xs font-bold text-[#0B1F3A]">
                    Operational Strategy: Reallocation vs. New Procurement
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#172033]">
                    <div className="p-3 rounded-md bg-[#F4F7FA] border border-[#D9E1EA] space-y-1">
                      <div className="font-semibold text-[#0B1F3A] flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Reallocated from Reserves: {scenarioComparison.units_reallocated.toLocaleString()} units</span>
                      </div>
                      <p className="text-[11px] text-[#5D6878] pl-5.5">
                        Internal pool reallocations incur zero capital acquisition expenditure. Only recurring standard operational allowances apply.
                      </p>
                    </div>

                    <div className="p-3 rounded-md bg-[#F4F7FA] border border-[#D9E1EA] space-y-1">
                      <div className="font-semibold text-[#0B1F3A] flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>New Capital Procurement: {scenarioComparison.units_newly_procured.toLocaleString()} units</span>
                      </div>
                      <p className="text-[11px] text-[#5D6878] pl-5.5">
                        One-time capital outlay required to resolve reserve floor shortfalls: {formatINR(scenarioComparison.capital_procurement_cost, true)}.
                      </p>
                    </div>
                  </div>

                  {/* Assumptions List */}
                  {scenarioComparison.assumptions && scenarioComparison.assumptions.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-[#5D6878] space-y-1">
                      <div className="font-semibold text-[#172033]">Calculation Notes:</div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {scenarioComparison.assumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA] p-8 text-center text-xs text-[#5D6878]">
                Select two scenarios to compare their estimated costs.
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: COST BREAKDOWN                                             */}
        {/* ================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#0B1F3A]">
                  Resource Category Cost Schedule
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Standard unit benchmarks categorized by functional operational domain.
                </p>
              </div>
              <div className="text-xs text-[#5D6878]">
                Viewing: <strong className="text-[#1769AA]">{isAnnualView ? 'Annual Projections' : 'Monthly Recurring'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview &&
                Object.entries(overview.category_breakdown).map(([category, costs]) => {
                  const getCategoryIcon = (cat: string) => {
                    switch (cat) {
                      case 'PERSONNEL':
                        return Users;
                      case 'MOBILITY':
                        return Car;
                      case 'INVESTIGATION':
                        return Search;
                      case 'SURVEILLANCE':
                        return Eye;
                      case 'INFRASTRUCTURE':
                        return Building2;
                      default:
                        return Shield;
                    }
                  };
                  const Icon = getCategoryIcon(category);
                  const recurring = isAnnualView ? costs.annual_recurring : costs.monthly_recurring;
                  const capital = costs.one_time_capital;

                  return (
                    <div
                      key={category}
                      className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs space-y-2 hover:border-[#BAC7D5] transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-[#F4F7FA] text-[#1769AA]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-[#0B1F3A]">{category}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5D6878]">
                            {isAnnualView ? 'Annual Operating (O&M):' : 'Monthly Recurring:'}
                          </span>
                          <span className="font-bold text-[#172033]">{formatINR(recurring)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5D6878]">One-Time Capital Outlay:</span>
                          <span className="font-bold text-[#1769AA]">{formatINR(capital)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-[#5D6878]">Total Category Commitment:</span>
                          <span className="font-bold text-[#0B1F3A]">
                            {formatINR(recurring + capital)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: DISTRICT COSTS                                             */}
        {/* ================================================================= */}
        {activeTab === 'districts' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. State / UT Selector */}
                {states.length > 0 && onStateSelect && (
                  <select
                    aria-label="Filter by State"
                    value={selectedStateId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      onStateSelect(val);
                      setSelectedDistrictName('');
                    }}
                    className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                  >
                    <option value="">Select State / UT</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.state_name}
                      </option>
                    ))}
                  </select>
                )}

                {/* 2. District Selector (Revealed after State is selected) */}
                {Boolean(selectedStateId) && (
                  <select
                    aria-label="Filter by District"
                    value={selectedDistrictName}
                    onChange={(e) => setSelectedDistrictName(e.target.value)}
                    className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                  >
                    <option value="">Select District</option>
                    {stateDistrictOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}

                {/* 3. Quality Tier & Search (Revealed after District is selected) */}
                {Boolean(selectedDistrictName) && (
                  <>
                    <select
                      aria-label="Filter by Quality Tier"
                      value={selectedQualityTier}
                      onChange={(e) => setSelectedQualityTier(e.target.value)}
                      className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                    >
                      <option value="ALL">All Quality Tiers</option>
                      <option value="OFFICIAL_DOCUMENTED">Official Documented</option>
                      <option value="ESTIMATED_BENCHMARK">Estimated Benchmark</option>
                      <option value="ASSUMPTION_BASED">Assumption Based</option>
                    </select>

                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Search district name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-48 rounded border border-[#D9E1EA] bg-white pl-8 pr-3 text-[13px] text-[#172033] placeholder-[#5D6878] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                      />
                    </div>
                  </>
                )}

                {/* Reset Filters Action */}
                {(selectedStateId || selectedDistrictName || selectedQualityTier !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onStateSelect) onStateSelect(undefined);
                      setSelectedDistrictName('');
                      setSelectedQualityTier('ALL');
                      setSearchQuery('');
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="text-xs text-[#5D6878]">
                Showing <strong>{filteredDistrictItems.length}</strong> district cost records
              </div>
            </div>

            {filteredDistrictItems.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                  <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                    <tr>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-2 text-right">Baseline Qty</th>
                      <th className="py-2.5 px-2 text-right">Recommended</th>
                      <th className="py-2.5 px-2 text-right">New Procure</th>
                      <th className="py-2.5 px-3 text-right">
                        {isAnnualView ? 'Annual Scenario Cost' : 'Monthly O&M'}
                      </th>
                      <th className="py-2.5 px-3 text-right">Capital Outlay</th>
                      <th className="py-2.5 px-3 text-right">Net Delta</th>
                      <th className="py-2.5 px-2 text-center">Quality Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                    {filteredDistrictItems.map((item, idx) => {
                      const costVal = isAnnualView ? item.recommended_annual_cost : item.recommended_annual_cost / 12;
                      const deltaVal = isAnnualView ? item.net_delta_annual_cost : item.net_delta_annual_cost / 12;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                            <div>{item.district_name || `District #${item.district_id}`}</div>
                            <span className="text-[10px] text-[#5D6878] font-normal">{item.state_name}</span>
                          </td>
                          <td className="py-2 px-2 text-right text-[#5D6878]">
                            {item.baseline_units !== null && item.baseline_units !== undefined ? item.baseline_units.toLocaleString() : (
                              <span className="text-amber-700 font-medium">Unrecorded</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-[#0B1F3A]">
                            {item.recommended_units.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-[#172033]">
                            {item.new_procurement_units > 0 ? (
                              <span className="text-[#1769AA] font-bold">+{item.new_procurement_units}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#172033]">
                            {formatLakhs(costVal)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-[#5D6878]">
                            {item.procurement_cost > 0 ? formatLakhs(item.procurement_cost) : '₹0'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={deltaVal > 0 ? 'text-amber-700' : deltaVal < 0 ? 'text-emerald-700' : 'text-slate-500'}>
                              {deltaVal > 0 ? `+${formatLakhs(deltaVal)}` : formatLakhs(deltaVal)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.data_quality_tier === 'OFFICIAL_DOCUMENTED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.data_quality_tier === 'ESTIMATED_BENCHMARK'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {item.data_quality_tier === 'OFFICIAL_DOCUMENTED'
                                ? 'Official'
                                : item.data_quality_tier === 'ESTIMATED_BENCHMARK'
                                ? 'Benchmark'
                                : 'Assumed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No district records match criteria." message="Adjust your search term or select another estimation run." />
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: COST BENCHMARKS                                            */}
        {/* ================================================================= */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#0B1F3A]">
                  Government Cost Benchmarks &amp; Provenance Registry
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Official standards derived from 7th CPC Pay Matrices, BPR&amp;D Mobility indices, and GeM public procurement rate contracts.
                </p>
              </div>
              <span className="text-xs font-bold text-[#5D6878]">
                {benchmarks.length} Active Benchmarks
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                  <tr>
                    <th className="py-2.5 px-3">Resource Asset</th>
                    <th className="py-2.5 px-2">Cost Type</th>
                    <th className="py-2.5 px-2">Component</th>
                    <th className="py-2.5 px-3 text-right">Standard Rate</th>
                    <th className="py-2.5 px-3">Source &amp; Publication</th>
                    <th className="py-2.5 px-2 text-center">Quality Tier</th>
                    <th className="py-2.5 px-4">Formula &amp; Assumptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                  {benchmarks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                        <div>{b.resource_name || `Resource #${b.resource_type_id}`}</div>
                        <span className="text-[10px] text-[#5D6878] font-normal">{b.category}</span>
                      </td>
                      <td className="py-2 px-2 font-medium">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          b.cost_type === 'ONE_TIME_CAPITAL'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {b.cost_type === 'ONE_TIME_CAPITAL' ? 'Capital' : 'Recurring'}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-medium text-[#172033]">
                        {b.cost_component}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#0B1F3A]">
                        {formatINR(b.unit_cost_inr)}
                        <span className="block text-[10px] text-[#5D6878] font-normal">
                          {b.cost_type === 'RECURRING_MONTHLY' ? '/ month' : b.cost_type === 'RECURRING_ANNUAL' ? '/ year' : 'one-time'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#172033]">
                        <div className="font-semibold text-[#0B1F3A]">{b.source_name}</div>
                        <span className="text-[10px] text-[#5D6878] block">{b.source_publication} ({b.reference_year})</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            b.data_quality_tier === 'OFFICIAL_DOCUMENTED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : b.data_quality_tier === 'ESTIMATED_BENCHMARK'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {b.data_quality_tier === 'OFFICIAL_DOCUMENTED' ? 'Official' : b.data_quality_tier === 'ESTIMATED_BENCHMARK' ? 'Benchmark' : 'Assumed'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-[#5D6878] text-[11px] max-w-xs">
                        <div className="font-mono text-[10px] text-[#172033]">{b.formula_expression}</div>
                        {b.assumptions_notes && (
                          <div className="text-[10px] text-[#5D6878] mt-0.5 italic">{b.assumptions_notes}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: HISTORY                                                    */}
        {/* ================================================================= */}
        {activeTab === 'runs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <h3 className="text-xs font-bold text-[#0B1F3A]">
                Cost Estimation Audit History
              </h3>
              <span className="text-xs text-[#5D6878]">
                {overview?.recent_runs?.length || 0} Runs Recorded
              </span>
            </div>

            {overview?.recent_runs && overview.recent_runs.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                  <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                    <tr>
                      <th className="py-2.5 px-3">Run ID</th>
                      <th className="py-2.5 px-2">Mode</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-3 text-right">Annual Scenario Cost</th>
                      <th className="py-2.5 px-3 text-right">Incremental Delta</th>
                      <th className="py-2.5 px-3 text-right">Capital Outlay</th>
                      <th className="py-2.5 px-3">Created At</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                    {overview.recent_runs.map((r) => (
                      <tr key={r.run_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-[#1769AA]">
                          {r.run_id}
                          {r.optimization_run_id && (
                            <span className="block text-[10px] font-normal text-[#5D6878]">
                              Opt: {r.optimization_run_id}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.estimation_mode === 'SIMULATION_ESTIMATE'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : r.estimation_mode === 'INSUFFICIENT_DATA'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {r.estimation_mode === 'SIMULATION_ESTIMATE'
                              ? 'Simulation'
                              : r.estimation_mode === 'INSUFFICIENT_DATA'
                              ? 'Insufficient Data'
                              : 'Official'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-semibold">
                          <span className={r.status === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#0B1F3A]">
                          {formatINR(r.total_scenario_recurring_annual, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#5D6878]">
                          {formatINR(r.incremental_recurring_cost, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#5D6878]">
                          {formatINR(r.total_one_time_procurement_cost, true)}
                        </td>
                        <td className="py-2 px-3 text-[#5D6878] text-[11px]">
                          {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              const d = await budgetApi.getRunById(r.run_id);
                              setActiveRun(d);
                              setActiveTab('districts');
                            }}
                            className="px-2.5 py-1 rounded border border-[#D9E1EA] bg-white hover:bg-[#F4F7FA] text-[#172033] text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No historical runs found." message="Execute a budget estimation above to generate an audit log." />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetCostAnalysisView;
