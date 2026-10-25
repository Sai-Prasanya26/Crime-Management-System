import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scale,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  Layers,
  Search,
  Sliders,
  TrendingDown,
  HelpCircle,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import EmptyState from '../common/EmptyState';
import { optimizationApi } from '../../api';
import type {
  StateItem,
  OptimizationRunResponse,
  OptimizationOverviewResponse,
  OptimizationScenarioComparisonResponse,
} from '../../types';

interface ConstrainedOptimizationViewProps {
  states: StateItem[];
  selectedStateId?: number;
  onStateSelect: (stateId: number | undefined) => void;
}

export const ConstrainedOptimizationView: React.FC<ConstrainedOptimizationViewProps> = ({
  states,
  selectedStateId,
  onStateSelect,
}) => {
  // Mode selection: OPERATIONAL (Strict) vs SIMULATION (Hypothetical Capacity Modeling)
  const [allocationMode, setAllocationMode] = useState<'OPERATIONAL' | 'SIMULATION'>('OPERATIONAL');

  // Scenario Configuration State
  const [optStateId, setOptStateId] = useState<number>(selectedStateId || 2); // Default to Andhra Pradesh (ID 2)
  const [resourceTypeId, setResourceTypeId] = useState<number>(1); // 1: Police Officers, 2: Patrol Vehicles
  const [horizonDate, setHorizonDate] = useState<string>('2026-11-01');
  const [scenarioType, setScenarioType] = useState<
    'BASELINE_CONSTRAINED' | 'CRITICAL_RISK_PRIORITY' | 'PROPORTIONAL_WORKLOAD' | 'RESERVE_HEAVY' | 'HYPOTHETICAL_SIMULATION'
  >('BASELINE_CONSTRAINED');
  const [capacityOverride, setCapacityOverride] = useState<string>('');
  const [transferablePoolInput, setTransferablePoolInput] = useState<string>('');
  const [minReserveRatio, setMinReserveRatio] = useState<number>(0.20);

  // Results State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OptimizationOverviewResponse | null>(null);
  const [activeRun, setActiveRun] = useState<OptimizationRunResponse | null>(null);
  const [scenarioComparison, setScenarioComparison] = useState<OptimizationScenarioComparisonResponse | null>(null);
  const [runHistory, setRunHistory] = useState<OptimizationRunResponse[]>([]);

  // District Table Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Load initial overview and existing runs
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, runsRes] = await Promise.all([
        optimizationApi.getOverview(),
        optimizationApi.listRuns({ limit: 10 }),
      ]);
      setOverview(overviewRes);
      setRunHistory(runsRes.items);

      if (runsRes.items.length > 0) {
        const firstRun = await optimizationApi.getRunDetail(runsRes.items[0].run_id);
        setActiveRun(firstRun);
      } else {
        const initialRun = await optimizationApi.executeRun({
          state_id: optStateId,
          resource_type_id: resourceTypeId,
          assessment_period: horizonDate,
          scenario_type: scenarioType,
          is_simulation: allocationMode === 'SIMULATION',
          allocation_mode: allocationMode,
        });
        setActiveRun(initialRun);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load optimization intelligence.');
    } finally {
      setIsLoading(false);
    }
  }, [optStateId, resourceTypeId, horizonDate, scenarioType, allocationMode]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Execute Run (Operational or Simulation)
  const handleExecuteOptimization = async (overrideMode?: 'OPERATIONAL' | 'SIMULATION') => {
    const runMode = overrideMode || allocationMode;
    setIsOptimizing(true);
    setError(null);
    setScenarioComparison(null);
    try {
      const isSim = runMode === 'SIMULATION';
      const res = await optimizationApi.executeRun({
        state_id: optStateId,
        resource_type_id: resourceTypeId,
        assessment_period: horizonDate,
        scenario_type: isSim ? 'HYPOTHETICAL_SIMULATION' : scenarioType,
        is_simulation: isSim,
        allocation_mode: runMode,
        transferable_pool_size: transferablePoolInput ? parseInt(transferablePoolInput, 10) : undefined,
        pool_capacity_override: capacityOverride ? parseInt(capacityOverride, 10) : undefined,
        minimum_reserve_ratio: minReserveRatio,
      });
      setActiveRun(res);
      const runsRes = await optimizationApi.listRuns({ limit: 10 });
      setRunHistory(runsRes.items);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to execute optimization run.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Compare Scenarios
  const handleCompareScenarios = async () => {
    setIsComparing(true);
    setError(null);
    try {
      const isSim = allocationMode === 'SIMULATION';
      const res = await optimizationApi.compareScenarios({
        state_id: optStateId,
        resource_type_id: resourceTypeId,
        assessment_period: horizonDate,
        is_simulation: isSim,
        scenarios: [
          {
            scenario_name: isSim ? '[SIMULATION] Baseline Constrained' : 'Baseline Constrained (MILP)',
            scenario_type: isSim ? 'HYPOTHETICAL_SIMULATION' : 'BASELINE_CONSTRAINED',
            resource_type_id: resourceTypeId,
            assessment_period: horizonDate,
            minimum_reserve_ratio: minReserveRatio,
            is_simulation: isSim,
          },
          {
            scenario_name: isSim ? '[SIMULATION] Critical Risk Priority' : 'Critical Risk Prioritized',
            scenario_type: 'CRITICAL_RISK_PRIORITY',
            resource_type_id: resourceTypeId,
            assessment_period: horizonDate,
            minimum_reserve_ratio: minReserveRatio,
            is_simulation: isSim,
          },
          {
            scenario_name: isSim ? '[SIMULATION] Heavy Reserve (40%)' : 'Heavy Operational Reserve',
            scenario_type: 'RESERVE_HEAVY',
            resource_type_id: resourceTypeId,
            assessment_period: horizonDate,
            minimum_reserve_ratio: 0.40,
            is_simulation: isSim,
          },
        ],
      });
      setScenarioComparison(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to compare scenarios.');
    } finally {
      setIsComparing(false);
    }
  };

  // Load a historical run
  const handleLoadRun = async (runId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const runDetail = await optimizationApi.getRunDetail(runId);
      setActiveRun(runDetail);
      setScenarioComparison(null);
      if (runDetail.is_simulation) {
        setAllocationMode('SIMULATION');
      } else {
        setAllocationMode('OPERATIONAL');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load run details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered district allocations
  const filteredAllocations = useMemo(() => {
    if (!activeRun?.allocations) return [];
    let list = activeRun.allocations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) => a.district_name.toLowerCase().includes(q) || a.state_name.toLowerCase().includes(q)
      );
    }

    if (riskFilter !== 'ALL') {
      list = list.filter((a) => a.risk_level === riskFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((a) => a.allocation_status === statusFilter);
    }

    return list;
  }, [activeRun?.allocations, searchQuery, riskFilter, statusFilter]);

  if (isLoading) {
    return <LoadingState message="Connecting to constrained MILP solver and loading verified allocations..." />;
  }

  return (
    <div className="space-y-5">
      {/* 1. Header & Discrepancy Reconciliation Banner */}
      <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/50 p-4 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                <Scale className="h-3 w-3" />
                Phase 10.1: Constrained Resource Optimization &amp; Inventory Governance
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                288 State &bull; 4,510 District Verified Rows
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <Layers className="h-3 w-3" />
                {overview?.total_runs_executed || 0} Runs Audited
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Mixed-Integer Linear Programming Police Resource Optimization Engine
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              Distributes verified standing police resources across districts subject to strict conservation (<code>&Sigma; Recommended &le; Standing Pool</code>), minimum operational reserve constraints, Phase 9 risk scores, and Phase 8B multi-step forecasts. Missing district baseline inventories strictly halt operational runs with <code>INSUFFICIENT_DATA</code>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCompareScenarios()}
              disabled={isComparing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>{isComparing ? 'Comparing...' : 'Compare Scenarios'}</span>
            </button>
          </div>
        </div>

        {/* Phase 10.1 Institutional Governance Card */}
        <div className="rounded border border-indigo-100 bg-white/80 p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Data Integrity &amp; Inventory Governance:</strong> State-level standing inventories (288 verified rows) represent aggregate administrative force strength, not an authorized mobile pool. Most districts (4,396 cells) lack published district-level staffing baselines. Under Phase 10.1 rules, unrecorded district staffing prevents operational inter-district reallocations (returning <code>INSUFFICIENT_DATA</code>), while hypothetical planning simulations are strictly segregated, labeled, and accompanied by transparent institutional assumptions.
          </p>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Optimization Service Notice"
          message={error}
          onRetry={loadInitialData}
        />
      )}

      {/* 2. Mode Selector & Scenario Runner Control Panel */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Mode Toggle Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Allocation Mode &amp; Optimization Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Select between statutory operational allocation and hypothetical planning simulation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAllocationMode('OPERATIONAL')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  allocationMode === 'OPERATIONAL'
                    ? 'bg-white font-bold text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operational Allocation
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('SIMULATION')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  allocationMode === 'SIMULATION'
                    ? 'bg-purple-600 font-bold text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hypothetical Simulation
              </button>
            </div>

            <button
              onClick={() => handleExecuteOptimization()}
              disabled={isOptimizing}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50 ${
                allocationMode === 'SIMULATION' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isOptimizing ? 'Solving MILP...' : allocationMode === 'SIMULATION' ? 'Run Simulation' : 'Execute Operational Run'}</span>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* State Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">State / Jurisdiction</label>
            <select
              value={optStateId}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setOptStateId(val);
                onStateSelect(val);
              }}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* Resource Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Resource Category</label>
            <select
              value={resourceTypeId}
              onChange={(e) => setResourceTypeId(parseInt(e.target.value, 10))}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value={1}>Police Officers (Personnel)</option>
              <option value={2}>Patrol Vehicles (Mobility)</option>
              <option value={74}>Police Stations (Infrastructure - Ineligible)</option>
            </select>
          </div>

          {/* Planning Horizon */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Planning Horizon</label>
            <select
              value={horizonDate}
              onChange={(e) => setHorizonDate(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="2026-11-01">2026-11 (Horizon Step 1)</option>
              <option value="2026-12-01">2026-12 (Horizon Step 2)</option>
              <option value="2027-01-01">2027-01 (Horizon Step 3)</option>
            </select>
          </div>

          {/* Scenario Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">Scenario Policy</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as any)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="BASELINE_CONSTRAINED">Baseline Constrained</option>
              <option value="CRITICAL_RISK_PRIORITY">Critical Risk Priority</option>
              <option value="PROPORTIONAL_WORKLOAD">Proportional Workload</option>
              <option value="RESERVE_HEAVY">Reserve Heavy (40%)</option>
              {allocationMode === 'SIMULATION' && <option value="HYPOTHETICAL_SIMULATION">Hypothetical Simulation</option>}
            </select>
          </div>

          {/* Min Reserve Ratio */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 flex justify-between">
              <span>Reserve Ratio</span>
              <span className="font-bold text-blue-600">{(minReserveRatio * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0.10"
              max="0.50"
              step="0.05"
              value={minReserveRatio}
              onChange={(e) => setMinReserveRatio(parseFloat(e.target.value))}
              className="w-full h-8 cursor-pointer accent-blue-600"
            />
          </div>

          {/* Transferable Pool or Capacity Override */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700">
              {allocationMode === 'SIMULATION' ? 'Sim Transfer Pool (Optional)' : 'Pool Override (Optional)'}
            </label>
            <input
              type="number"
              placeholder="Auto (Verified)"
              value={allocationMode === 'SIMULATION' ? transferablePoolInput : capacityOverride}
              onChange={(e) => {
                if (allocationMode === 'SIMULATION') {
                  setTransferablePoolInput(e.target.value);
                } else {
                  setCapacityOverride(e.target.value);
                }
              }}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 3. Scenario Comparison Cards (If active) */}
      {scenarioComparison && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-700" />
              <h3 className="text-sm font-bold text-purple-900">
                Multi-Scenario Comparison: {scenarioComparison.resource_name} in {scenarioComparison.state_name} ({scenarioComparison.assessment_period})
              </h3>
            </div>
            <button
              onClick={() => setScenarioComparison(null)}
              className="text-xs text-purple-700 hover:underline cursor-pointer"
            >
              Close Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarioComparison.scenarios.map((sc, idx) => (
              <div key={idx} className="rounded-md border border-purple-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{sc.scenario_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sc.solver_status === 'SIMULATION' ? 'bg-purple-100 text-purple-800' :
                    sc.solver_status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-800' :
                    sc.solver_status === 'INSUFFICIENT_DATA' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {sc.solver_status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Allocated:</span>
                    <strong className="text-slate-900">{sc.allocated_total.toLocaleString()} / {sc.pool_capacity.toLocaleString()} ({sc.pool_utilization_pct}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shortfall Reduction:</span>
                    <strong className="text-emerald-700">{sc.shortfall_reduction_pct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Unmet Shortfall:</span>
                    <strong className="text-rose-700">{sc.shortfall_after.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Run Display */}
      {activeRun && (
        <>
          {/* INSUFFICIENT_DATA Notice (Operational Guard Triggered) */}
          {activeRun.solver_status === 'INSUFFICIENT_DATA' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Operational District Allocation Paused: Insufficient Ground Data
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {activeRun.explanation_summary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 pt-3">
                <div className="flex items-center gap-4 text-xs text-amber-900">
                  <span><strong>Total Standing Force:</strong> {activeRun.pool_capacity.toLocaleString()} units (Official BPR&amp;D Baseline)</span>
                  <span>&bull;</span>
                  <span><strong>Verified Districts:</strong> {activeRun.verified_districts_count || 0}</span>
                  <span>&bull;</span>
                  <span><strong>Unrecorded Districts:</strong> {activeRun.unrecorded_districts_count || 0}</span>
                </div>
                <button
                  onClick={() => {
                    setAllocationMode('SIMULATION');
                    handleExecuteOptimization('SIMULATION');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Run as Hypothetical Planning Simulation</span>
                </button>
              </div>
            </div>
          )}

          {/* SIMULATION Badge & Assumptions Drawer */}
          {activeRun.is_simulation && (
            <div className="rounded-lg border border-purple-300 bg-purple-50/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 uppercase tracking-wide">
                      Hypothetical Planning Simulation
                    </span>
                    <span className="text-xs font-bold text-purple-950">
                      Capacity Model for {activeRun.resource_name} ({activeRun.state_name})
                    </span>
                  </div>
                  <p className="text-xs text-purple-900 leading-relaxed">
                    This run is a theoretical capacity planning exercise based on BPR&amp;D population benchmarks and risk scores. It does NOT represent actual district deployments, verified ground staffing, or approved transfer orders.
                  </p>
                </div>
              </div>

              {activeRun.simulation_assumptions && activeRun.simulation_assumptions.length > 0 && (
                <div className="rounded border border-purple-200 bg-white/90 p-3 space-y-1 text-xs text-slate-700">
                  <div className="font-bold text-purple-900 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
                    Mandatory Institutional Simulation Assumptions:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
                    {activeRun.simulation_assumptions.map((assump, idx) => (
                      <li key={idx}>{assump}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Active Run KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Solver Status"
              value={activeRun.solver_status}
              subtext={`Mode: ${activeRun.allocation_mode || 'OPERATIONAL'}`}
              icon={CheckCircle2}
              color={
                activeRun.solver_status === 'OPTIMAL'
                  ? 'emerald'
                  : activeRun.solver_status === 'SIMULATION'
                  ? 'navy'
                  : activeRun.solver_status === 'FEASIBLE'
                  ? 'blue'
                  : activeRun.solver_status === 'INFEASIBLE'
                  ? 'rose'
                  : 'amber'
              }
            />
            <StatCard
              title="Resource Pool Available"
              value={`${activeRun.allocated_total.toLocaleString()} / ${activeRun.pool_capacity.toLocaleString()}`}
              subtext={`${activeRun.pool_utilization_pct}% capacity allocated`}
              icon={Layers}
              color="blue"
            />
            <StatCard
              title="Shortfall Reduction"
              value={`${activeRun.shortfall_reduction_pct}%`}
              subtext={`Reduced by ${(activeRun.shortfall_before - activeRun.shortfall_after).toLocaleString()} units`}
              icon={TrendingDown}
              color="emerald"
            />
            <StatCard
              title="Remaining Shortfall"
              value={activeRun.shortfall_after.toLocaleString()}
              subtext={`Total demand: ${activeRun.total_demand.toLocaleString()} units`}
              icon={AlertCircle}
              color={activeRun.shortfall_after > 0 ? 'amber' : 'emerald'}
            />
          </div>

          {/* Explainability & Constraints Narrative Box */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Optimization Rationale &amp; Operational Constraints Summary
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {activeRun.explanation_summary}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
              <span><strong>Algorithm:</strong> {activeRun.algorithm}</span>
              <span>&bull;</span>
              <span><strong>Forecast Model:</strong> {activeRun.forecast_model_version || 'Phase 8B XGBoost Direct'}</span>
              <span>&bull;</span>
              <span><strong>Risk Version:</strong> {activeRun.risk_version}</span>
              <span>&bull;</span>
              <span><strong>Run ID:</strong> <code>{activeRun.run_id}</code></span>
            </div>
          </div>

          {/* District Allocations Table (Shown only when allocations exist) */}
          {activeRun.allocations && activeRun.allocations.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    District Allocations Schedule ({filteredAllocations.length} of {activeRun.allocations.length} Districts)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeRun.is_simulation
                      ? 'Theoretical simulation allocations. Official district baselines are unrecorded and NOT estimated.'
                      : 'Verified operational district allocations.'}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Risk Bands</option>
                    <option value="CRITICAL">Critical Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="MODERATE">Moderate Risk</option>
                    <option value="LOW">Low Risk</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SATISFIED">Satisfied</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="DEFICIT">Deficit / Floor</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search district..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-36 rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {filteredAllocations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">District</th>
                        <th className="py-2.5 px-3">Risk Band</th>
                        <th className="py-2.5 px-3 text-right">Risk Score</th>
                        <th className="py-2.5 px-3 text-right">Verified Baseline</th>
                        <th className="py-2.5 px-3 text-right">Normative Demand</th>
                        <th className="py-2.5 px-3 text-right font-bold text-blue-900">
                          {activeRun.is_simulation ? 'Sim Allocation' : 'Recommended'}
                        </th>
                        <th className="py-2.5 px-3 text-right">Change (&Delta;)</th>
                        <th className="py-2.5 px-3 text-right">Unmet Shortfall</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAllocations.map((a) => (
                        <tr key={a.district_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {a.district_name}
                            <div className="text-[10px] text-slate-400 font-normal">{a.state_name}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.risk_level === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800'
                                  : a.risk_level === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : a.risk_level === 'MODERATE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {a.risk_level}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{a.risk_score.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {a.baseline_quantity !== null ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                {a.baseline_quantity.toLocaleString()} (Official)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 italic">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                                &mdash; (Unrecorded)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{a.required_quantity.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/40">
                            {a.recommended_quantity.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {a.change_quantity > 0 ? (
                              <span className="text-emerald-600">+{a.change_quantity.toLocaleString()}</span>
                            ) : a.change_quantity < 0 ? (
                              <span className="text-rose-600">{a.change_quantity.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {a.shortfall_after > 0 ? (
                              <span className="text-amber-700">{a.shortfall_after.toLocaleString()}</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">0 (Full)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.allocation_status === 'SATISFIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : a.allocation_status === 'PARTIAL'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {a.allocation_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No Allocations Matched" message="Adjust your filters or search query." />
              )}
            </div>
          )}

          {/* 7. Past Optimization Runs Table */}
          {runHistory.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Optimization Run &amp; Simulation History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2 px-3">Run ID</th>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3">Resource</th>
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3 text-right">Pool</th>
                      <th className="py-2 px-3 text-right">Allocated</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {runHistory.map((rh) => (
                      <tr key={rh.run_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium">{rh.run_id}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {rh.scenario_name}
                          {rh.is_simulation && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                              SIM
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">{rh.resource_name}</td>
                        <td className="py-2 px-3">{rh.state_name || 'National'}</td>
                        <td className="py-2 px-3 text-right font-mono">{rh.pool_capacity.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-blue-600">{rh.allocated_total.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rh.solver_status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-800' :
                            rh.solver_status === 'SIMULATION' ? 'bg-purple-100 text-purple-800' :
                            rh.solver_status === 'INSUFFICIENT_DATA' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {rh.solver_status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleLoadRun(rh.run_id)}
                            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConstrainedOptimizationView;
