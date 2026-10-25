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
  HelpCircle,
  Search,
  DollarSign,
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
  const [periodYear, setPeriodYear] = useState<number>(2026);
  const [periodMonth, setPeriodMonth] = useState<number>(1);
  const [isAnnualView, setIsAnnualView] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQualityTier, setSelectedQualityTier] = useState<string>('ALL');

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
  const formatINR = useCallback((val: number, inCrores = false) => {
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
  const formatLakhs = useCallback((val: number) => {
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

      if (optRunsList && optRunsList.length >= 2) {
        setBaselineOptRunId(optRunsList[1].run_id);
        setScenarioOptRunId(optRunsList[0].run_id);
        setSelectedOptRunId(optRunsList[0].run_id);
      } else if (optRunsList && optRunsList.length === 1) {
        setSelectedOptRunId(optRunsList[0].run_id);
      }
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
        period_year: periodYear,
        period_month: periodMonth,
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
  }, [activeRun?.items, searchQuery, selectedQualityTier, selectedStateId, states]);

  if (isLoading) {
    return <LoadingState message="Loading financial benchmarks, cost models, and scenario runs..." />;
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Provenance Status Banner */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                <Coins className="h-3 w-3" />
                Phase 11: Budget Estimation &amp; Cost Analysis
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                <HelpCircle className="h-3 w-3" />
                Provenanced Assumptions &amp; Benchmarks
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                <Scale className="h-3 w-3" />
                Currency: INR (₹)
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Police Resource Fiscal Planning &amp; Operational Cost Analysis
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Provides transparent, formulaic fiscal analysis connecting constrained optimization runs to recurring operational O&amp;M and one-time capital procurement. Distinguishes verified expenditures from assumption-based estimates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={() => setIsAnnualView(!isAnnualView)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
            >
              View: <span className="text-blue-700">{isAnnualView ? 'Annual Projections' : 'Monthly Recurring'}</span>
            </button>
            <button
              onClick={() => loadInitialData()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Estimation Controls Bar */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-0.5">
              <label className="text-[11px] font-bold text-slate-700">Optimization Run</label>
              <select
                value={selectedOptRunId}
                onChange={(e) => setSelectedOptRunId(e.target.value)}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">-- Select Optimization Scenario --</option>
                {optRuns.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.scenario_name} ({r.allocation_mode}) - {r.solver_status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-bold text-slate-700">Year</label>
              <select
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value))}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-bold text-slate-700">Month</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(parseInt(e.target.value))}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExecuteEstimation}
            disabled={isEstimating || !selectedOptRunId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isEstimating ? 'Calculating Cost Projections...' : 'Run Cost Estimation'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && <ErrorState message={error} onRetry={loadInitialData} />}

      {/* 2. Simulation Disclaimer Banner (if active run is simulation) */}
      {activeRun?.estimation_mode === 'SIMULATION_ESTIMATE' && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-2xs space-y-2">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 uppercase tracking-wide">
                  Hypothetical Planning Simulation
                </span>
                <span className="text-xs font-bold text-purple-950">
                  Run ID: {activeRun.run_id} (Optimization: {activeRun.optimization_run_id})
                </span>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">
                SIMULATION DISCLAIMER: This budget estimation is calculated from a hypothetical constrained optimization model. Figures reflect projected standard costs under simulated staffing allocations and do not constitute sanctioned municipal expenditures or government budget allocations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Insufficient Data Notice (if active run halted due to unrecorded district baselines) */}
      {activeRun?.estimation_mode === 'INSUFFICIENT_DATA' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-2xs space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">
                Operational Cost Estimation Halted: INSUFFICIENT_DATA
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                {activeRun.explanation_summary ||
                  'Operational budget estimation cannot proceed because district actual resource inventories are UNRECORDED. In accordance with zero-fabrication standards, financial figures cannot be synthesized for unrecorded districts.'}
              </p>
              <div className="text-[11px] text-amber-700 font-medium">
                To explore theoretical capacity costs, execute the optimization run under <strong>Hypothetical Simulation</strong> mode.
              </div>
            </div>
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
            title="Incremental Cost Delta (ΔCost)"
            value={formatINR(activeRun.incremental_recurring_cost, true)}
            subtext="Net annual difference vs baseline"
            icon={TrendingUp}
            color={activeRun.incremental_recurring_cost > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Capital Procurement Cost"
            value={formatINR(activeRun.total_one_time_procurement_cost, true)}
            subtext="One-time expenditure for shortfalls"
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Shortfall Resolution Total"
            value={formatINR(activeRun.total_shortfall_resolution_cost, true)}
            subtext="Capital purchases + incremental O&M"
            icon={DollarSign}
            color="emerald"
          />
        </div>
      )}

      {/* 5. Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-lg shadow-2xs">
        {[
          { key: 'scenarios', label: 'Scenario Comparison & Delta', icon: Scale },
          { key: 'categories', label: 'Category & Component Breakdown', icon: Layers },
          { key: 'districts', label: 'District Line-Item Calculations', icon: Building2 },
          { key: 'benchmarks', label: 'Benchmark Rates & Provenance', icon: FileText },
          { key: 'runs', label: 'Estimation History', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as CostTabType)}
              className={`flex items-center gap-1.5 border-b-2 py-3 px-4 text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 6. TAB CONTENT */}
      <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 p-4 shadow-2xs">

        {/* ================================================================= */}
        {/* TAB 1: SCENARIO COMPARISON & DELTA COST                           */}
        {/* ================================================================= */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {/* Scenario Selection Header */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-800">
                    Comparative Fiscal Scenario Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Compare incremental costs (ΔCost = Cost(scenario) - Cost(baseline)) and distinguish reallocation from new procurement.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-600">Baseline Scenario</label>
                    <select
                      value={baselineOptRunId}
                      onChange={(e) => setBaselineOptRunId(e.target.value)}
                      className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800"
                    >
                      {optRuns.map((r) => (
                        <option key={`base-${r.run_id}`} value={r.run_id}>
                          {r.scenario_name} ({r.allocation_mode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-600">Comparison Scenario</label>
                    <select
                      value={scenarioOptRunId}
                      onChange={(e) => setScenarioOptRunId(e.target.value)}
                      className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800"
                    >
                      {optRuns.map((r) => (
                        <option key={`scen-${r.run_id}`} value={r.run_id}>
                          {r.scenario_name} ({r.allocation_mode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleCompareScenarios}
                    disabled={isComparing || !baselineOptRunId || !scenarioOptRunId}
                    className="self-end inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                  >
                    <Scale className="h-3 w-3" />
                    <span>{isComparing ? 'Comparing...' : 'Compare Scenarios'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comparison Results Card */}
            {scenarioComparison ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">
                      Scenario Comparison: {scenarioComparison.scenario_name}
                    </h4>
                    <p className="text-xs text-indigo-800">
                      Baseline: {scenarioComparison.baseline_run_id} vs Scenario: {scenarioComparison.scenario_run_id}
                    </p>
                  </div>
                  {scenarioComparison.is_simulation && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 uppercase">
                      Simulation Modeling
                    </span>
                  )}
                </div>

                {/* Side-by-side metric tiles */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded border border-slate-200 bg-white p-3 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Baseline Recurring (Annual)</span>
                    <div className="text-base font-extrabold text-slate-900">
                      {formatINR(scenarioComparison.baseline_recurring_annual, true)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {formatINR(scenarioComparison.baseline_recurring_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Scenario Recurring (Annual)</span>
                    <div className="text-base font-extrabold text-indigo-950">
                      {formatINR(scenarioComparison.scenario_recurring_annual, true)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {formatINR(scenarioComparison.scenario_recurring_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Incremental Delta (ΔCost)</span>
                    <div className={`text-base font-extrabold ${scenarioComparison.incremental_recurring_annual > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatINR(scenarioComparison.incremental_recurring_annual, true)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Δ {formatINR(scenarioComparison.net_delta_monthly)} / month
                    </span>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-3 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Capital Procurement</span>
                    <div className="text-base font-extrabold text-blue-900">
                      {formatINR(scenarioComparison.capital_procurement_cost, true)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {scenarioComparison.units_newly_procured} new units required
                    </span>
                  </div>
                </div>

                {/* Reallocation vs Procurement Breakdown */}
                <div className="rounded border border-indigo-200 bg-white p-3 space-y-2">
                  <h5 className="text-xs font-bold text-indigo-900">
                    Resource Operational Strategy: Reallocation vs. New Procurement
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Reallocated from Standing Reserves: {scenarioComparison.units_reallocated.toLocaleString()} units
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Operational reallocations within the standing pool incur zero capital procurement outlay. Only standard recurring operating allowances apply.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Shortfall Requiring New Procurement: {scenarioComparison.units_newly_procured.toLocaleString()} units
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Total capital budget needed to meet reserve floor shortfalls: {formatINR(scenarioComparison.capital_procurement_cost, true)}.
                      </p>
                    </div>
                  </div>

                  {/* Assumptions List */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-700">Comparative Calculation Notes:</div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {scenarioComparison.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
                <Scale className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No Scenario Comparison Loaded</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                  Select a baseline optimization run and an alternative scenario run above and click &quot;Compare Scenarios&quot; to inspect net delta costs.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CATEGORY & COMPONENT BREAKDOWN                             */}
        {/* ================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Resource Category Cost Schedule
                </h3>
                <p className="text-[11px] text-slate-500">
                  Standardized unit benchmarks categorized by functional operational domain.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Displaying: <strong className="text-blue-700">{isAnnualView ? 'Annual Projections' : 'Monthly Recurring'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-blue-50 text-blue-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">{category}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {isAnnualView ? 'Annual Operating (O&M):' : 'Monthly Recurring:'}
                          </span>
                          <span className="font-bold text-slate-900">{formatINR(recurring)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">One-Time Capital Outlay:</span>
                          <span className="font-bold text-blue-900">{formatINR(capital)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Total Asset Commitment:</span>
                          <span className="font-extrabold text-slate-800">
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
        {/* TAB 3: DISTRICT LINE-ITEM CALCULATIONS                            */}
        {/* ================================================================= */}
        {activeTab === 'districts' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search district name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-56 rounded-md border border-slate-300 bg-white pl-8 pr-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <select
                  value={selectedQualityTier}
                  onChange={(e) => setSelectedQualityTier(e.target.value)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All Quality Tiers</option>
                  <option value="OFFICIAL_DOCUMENTED">Official Documented</option>
                  <option value="ESTIMATED_BENCHMARK">Estimated Benchmark</option>
                  <option value="ASSUMPTION_BASED">Assumption Based</option>
                </select>

                {states.length > 0 && onStateSelect && (
                  <select
                    value={selectedStateId || ''}
                    onChange={(e) => onStateSelect(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
                  >
                    <option value="">All States / UTs</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.state_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Showing <strong>{filteredDistrictItems.length}</strong> district cost records
              </div>
            </div>

            {filteredDistrictItems.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredDistrictItems.map((item, idx) => {
                      const costVal = isAnnualView ? item.recommended_annual_cost : item.recommended_annual_cost / 12;
                      const deltaVal = isAnnualView ? item.net_delta_annual_cost : item.net_delta_annual_cost / 12;

                      return (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            <div>{item.district_name || `District #${item.district_id}`}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{item.state_name}</span>
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600">
                            {item.baseline_units !== null && item.baseline_units !== undefined ? item.baseline_units.toLocaleString() : (
                              <span className="text-amber-600 font-medium">Unrecorded</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-blue-900">
                            {item.recommended_units.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700">
                            {item.new_procurement_units > 0 ? (
                              <span className="text-blue-700 font-bold">+{item.new_procurement_units}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatLakhs(costVal)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">
                            {item.procurement_cost > 0 ? formatLakhs(item.procurement_cost) : '₹0'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={deltaVal > 0 ? 'text-amber-700' : deltaVal < 0 ? 'text-emerald-700' : 'text-slate-500'}>
                              {deltaVal > 0 ? `+${formatLakhs(deltaVal)}` : formatLakhs(deltaVal)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.data_quality_tier === 'OFFICIAL_DOCUMENTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.data_quality_tier === 'ESTIMATED_BENCHMARK'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
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
        {/* TAB 4: BENCHMARK RATES & PROVENANCE REGISTRY                      */}
        {/* ================================================================= */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Government Cost Benchmarks &amp; Provenance Registry
                </h3>
                <p className="text-[11px] text-slate-500">
                  Official standards derived from 7th CPC Pay Matrices, BPR&amp;D Mobility indices, and GeM public procurement rate contracts.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600">
                {benchmarks.length} Active Benchmarks
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Resource Asset</th>
                    <th className="py-2.5 px-2">Cost Type</th>
                    <th className="py-2.5 px-2">Component</th>
                    <th className="py-2.5 px-3 text-right">Standard Rate (INR)</th>
                    <th className="py-2.5 px-3">Source &amp; Publication</th>
                    <th className="py-2.5 px-2 text-center">Quality Tier</th>
                    <th className="py-2.5 px-4">Formula &amp; Assumptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {benchmarks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        <div>{b.resource_name || `Resource #${b.resource_type_id}`}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{b.category}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-700 font-medium">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.cost_type === 'ONE_TIME_CAPITAL'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {b.cost_type === 'ONE_TIME_CAPITAL' ? 'Capital' : 'Recurring'}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-700">
                        {b.cost_component}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                        {formatINR(b.unit_cost_inr)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {b.cost_type === 'RECURRING_MONTHLY' ? '/ month' : b.cost_type === 'RECURRING_ANNUAL' ? '/ year' : 'one-time'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{b.source_name}</div>
                        <span className="text-[10px] text-slate-500 block">{b.source_publication} ({b.reference_year})</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.data_quality_tier === 'OFFICIAL_DOCUMENTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.data_quality_tier === 'ESTIMATED_BENCHMARK'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.data_quality_tier}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-600 text-[11px] max-w-xs">
                        <div className="font-mono text-[10px] text-slate-700">{b.formula_expression}</div>
                        {b.assumptions_notes && (
                          <div className="text-[10px] text-slate-500 mt-0.5 italic">{b.assumptions_notes}</div>
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
        {/* TAB 5: ESTIMATION RUN HISTORY                                     */}
        {/* ================================================================= */}
        {activeTab === 'runs' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800">
              Audit History of Cost Estimation Runs
            </h3>

            {overview?.recent_runs && overview.recent_runs.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {overview.recent_runs.map((r) => (
                      <tr key={r.run_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">
                          {r.run_id}
                          {r.optimization_run_id && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Opt: {r.optimization_run_id}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.estimation_mode === 'SIMULATION_ESTIMATE'
                                ? 'bg-purple-100 text-purple-800'
                                : r.estimation_mode === 'INSUFFICIENT_DATA'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.estimation_mode}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-semibold">
                          <span className={r.status === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                          {formatINR(r.total_scenario_recurring_annual, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-700">
                          {formatINR(r.incremental_recurring_cost, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-700">
                          {formatINR(r.total_one_time_procurement_cost, true)}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={async () => {
                              const d = await budgetApi.getRunById(r.run_id);
                              setActiveRun(d);
                              setActiveTab('districts');
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
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

