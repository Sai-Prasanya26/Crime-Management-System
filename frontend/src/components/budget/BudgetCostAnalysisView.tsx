import React, { useEffect, useState, useCallback } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
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
  Info,
  Sliders,
  Edit3,
  Save,
  HelpCircle,
  X,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Wrench,
  Truck,
  Radio,
  Calculator,
} from 'lucide-react';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import EmptyState from '../common/EmptyState';
import { StatCard } from '../common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { budgetApi, geographyApi } from '../../api';
import type {
  FullBudgetOverviewResponse,
  StateBudgetSummaryItem,
  DistrictBudgetSummaryItem,
  ResourceCostMasterItem,
  ResourceCostMasterUpdate,
  BudgetSimulationRequest,
  BudgetSimulationResponse,
  BudgetScenarioItem,
  BudgetCalculationHistoryItem,
  StateItem,
  DistrictItem,
} from '../../types';

interface BudgetCostAnalysisViewProps {
  states?: StateItem[];
  selectedStateId?: number;
  onStateSelect?: (stateId: number | undefined) => void;
}

type TabType = 'overview' | 'pools' | 'simulator' | 'cost_master' | 'history';

export const BudgetCostAnalysisView: React.FC<BudgetCostAnalysisViewProps> = ({
  states = [],
  selectedStateId,
  onStateSelect,
}) => {
  const { user, hasRole } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || hasRole(['ADMIN']);
  const isAnalyst = user?.role === 'ANALYST' || isAdmin || hasRole(['ANALYST', 'ADMIN']);

  // Tabs and view settings
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [periodYear, setPeriodYear] = useState<number>(2026);
  const [periodMonth, setPeriodMonth] = useState<number>(11);
  const [isAnnualView, setIsAnnualView] = useState<boolean>(true);

  // Filters for districts
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');
  const [districtRiskFilter, setDistrictRiskFilter] = useState<string>('ALL');
  const [districtPage, setDistrictPage] = useState<number>(0);
  const pageSize = 15;

  // Selected state districts for dropdown
  const [stateDistricts, setStateDistricts] = useState<DistrictItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);

  // Data states
  const [overview, setOverview] = useState<FullBudgetOverviewResponse | null>(null);
  const [stateSummaries, setStateSummaries] = useState<StateBudgetSummaryItem[]>([]);
  const [districtSummary, setDistrictSummary] = useState<{
    items: DistrictBudgetSummaryItem[];
    total: number;
  }>({ items: [], total: 0 });
  const [costMasterItems, setCostMasterItems] = useState<ResourceCostMasterItem[]>([]);
  const [calculationHistory, setCalculationHistory] = useState<BudgetCalculationHistoryItem[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<BudgetScenarioItem[]>([]);

  // Modals & Drawers
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState<boolean>(false);
  const [editingCostItem, setEditingCostItem] = useState<ResourceCostMasterItem | null>(null);
  const [costFormUpdates, setCostFormUpdates] = useState<ResourceCostMasterUpdate>({});
  const [inspectedDistrict, setInspectedDistrict] = useState<DistrictBudgetSummaryItem | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState<boolean>(false);
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('');
  const [scenarioDescInput, setScenarioDescInput] = useState<string>('');

  // Simulator controls & state
  const [simBudgetCeilingCr, setSimBudgetCeilingCr] = useState<number | ''>('');
  const [simCategoryAdjustments, setSimCategoryAdjustments] = useState<Record<string, number>>({
    PERSONNEL: 0,
    MOBILITY: 0,
    INVESTIGATION: 0,
    SPECIALIZED: 0,
    SURVEILLANCE: 0,
    FORENSIC: 0,
    CYBER_TECHNOLOGY: 0,
    COMMUNICATION: 0,
    TRAFFIC_SAFETY: 0,
  });
  const [simPrioritizeRisk, setSimPrioritizeRisk] = useState<boolean>(true);
  const [simResult, setSimResult] = useState<BudgetSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Loading & error handling
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingCost, setIsUpdatingCost] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Format currency helpers
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

  const formatLakhs = useCallback((val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const lk = val / 100000;
    return `₹${lk.toFixed(2)} L`;
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (!selectedStateId) {
      setStateDistricts([]);
      setSelectedDistrictId(undefined);
      return;
    }
    geographyApi
      .getDistricts(selectedStateId)
      .then((res) => {
        setStateDistricts(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to load districts for state', err);
      });
  }, [selectedStateId]);

  // Main data loader
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fullOverview, statesData, districtsData, costMasterData, historyData, scenariosData] =
        await Promise.all([
          budgetApi.getFullOverview({
            year: periodYear,
            month: periodMonth,
            state_id: selectedStateId,
          }),
          budgetApi.getStateSummary({
            year: periodYear,
            month: periodMonth,
          }),
          budgetApi.getDistrictSummary({
            state_id: selectedStateId,
            year: periodYear,
            month: periodMonth,
            skip: districtPage * pageSize,
            limit: pageSize,
            risk_level: districtRiskFilter === 'ALL' ? undefined : districtRiskFilter,
            search: districtSearchQuery.trim() || undefined,
          }),
          budgetApi.getCostMaster({ is_active: true }),
          budgetApi.getCalculationHistory({ limit: 15 }).catch(() => []),
          budgetApi.getScenarios({ state_id: selectedStateId }).catch(() => []),
        ]);

      setOverview(fullOverview);
      setStateSummaries(statesData);
      setDistrictSummary(districtsData);
      setCostMasterItems(costMasterData);
      setCalculationHistory(historyData);
      setSavedScenarios(scenariosData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load budget intelligence data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStateId, periodYear, periodMonth, districtPage, districtRiskFilter, districtSearchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear success notification after 5s
  useEffect(() => {
    if (!actionSuccessMessage) return;
    const timer = setTimeout(() => setActionSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [actionSuccessMessage]);

  // Execute Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const limitVal =
        simBudgetCeilingCr !== '' && Number(simBudgetCeilingCr) > 0
          ? Number(simBudgetCeilingCr) * 10000000
          : undefined;

      const payload: BudgetSimulationRequest = {
        state_id: selectedStateId || undefined,
        district_id: selectedDistrictId || undefined,
        period_year: periodYear,
        period_month: periodMonth,
        total_budget_limit: limitVal,
        operating_assumptions: {
          category_pct_adjustments: simCategoryAdjustments,
          prioritize_by_risk: simPrioritizeRisk,
        },
      };

      const res = await budgetApi.simulateBudget(payload);
      setSimResult(res);
      setActionSuccessMessage('Simulation executed successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Simulation execution failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Save Scenario
  const handleSaveScenario = async () => {
    if (!scenarioNameInput.trim()) {
      setError('Please provide a scenario name.');
      return;
    }
    setIsSavingScenario(true);
    try {
      const limitVal =
        simBudgetCeilingCr !== '' && Number(simBudgetCeilingCr) > 0
          ? Number(simBudgetCeilingCr) * 10000000
          : undefined;

      await budgetApi.saveScenario({
        name: scenarioNameInput.trim(),
        description: scenarioDescInput.trim() || undefined,
        state_id: selectedStateId || undefined,
        district_id: selectedDistrictId || undefined,
        budget_year: periodYear,
        budget_month: periodMonth,
        total_budget_limit: limitVal,
        operating_assumptions: {
          category_pct_adjustments: simCategoryAdjustments,
          prioritize_by_risk: simPrioritizeRisk,
          sim_result: simResult,
        },
      });

      const updated = await budgetApi.getScenarios({ state_id: selectedStateId }).catch(() => []);
      setSavedScenarios(updated);
      setScenarioNameInput('');
      setScenarioDescInput('');
      setActionSuccessMessage(`Scenario "${scenarioNameInput}" saved successfully.`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save scenario.');
    } finally {
      setIsSavingScenario(false);
    }
  };

  // Update Cost Master Item
  const handleSaveCostMasterItem = async () => {
    if (!editingCostItem) return;
    setIsUpdatingCost(true);
    setError(null);
    try {
      const updated = await budgetApi.updateCostMaster(editingCostItem.id, costFormUpdates);
      setCostMasterItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingCostItem(null);
      setCostFormUpdates({});
      setActionSuccessMessage(`Cost record for ${updated.resource_name} updated successfully.`);
      // Reload overview to reflect cost changes
      const ov = await budgetApi.getFullOverview({
        year: periodYear,
        month: periodMonth,
        state_id: selectedStateId,
      });
      setOverview(ov);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to update cost record.');
    } finally {
      setIsUpdatingCost(false);
    }
  };

  // Pool Icon helper
  const getPoolIcon = (category: string) => {
    switch (category) {
      case 'PERSONNEL':
        return Users;
      case 'MOBILITY':
        return Car;
      case 'INVESTIGATION':
        return Search;
      case 'SPECIALIZED':
        return Shield;
      case 'SURVEILLANCE':
        return Eye;
      case 'FORENSIC':
        return Building2;
      case 'CYBER_TECHNOLOGY':
        return Sparkles;
      case 'EMERGENCY_RESPONSE':
        return Truck;
      case 'COMMUNICATION':
        return Radio;
      case 'TRAFFIC_SAFETY':
        return ShieldAlert;
      default:
        return Coins;
    }
  };

  if (isLoading && !overview) {
    return <LoadingState message="Loading 10-pool financial intelligence and statutory budget registries..." />;
  }

  // Budget calculations for KPI cards
  const policeReq = isAnnualView
    ? overview?.total_police_budget_requirement || 0
    : (overview?.total_police_budget_requirement || 0) / 12;

  const configuredPoliceBudget = isAnnualView
    ? overview?.total_configured_state_budget || 0
    : (overview?.total_configured_state_budget || 0) / 12;

  const hasConfiguredBudget = overview?.configured_states_count && overview.configured_states_count > 0;
  const netGap = configuredPoliceBudget - policeReq;
  const percentFunded =
    hasConfiguredBudget && policeReq > 0
      ? Math.min(200, (configuredPoliceBudget / policeReq) * 100)
      : null;

  const capexTotal = overview?.total_capex_procurement || 0;
  const opexTotal = isAnnualView
    ? (overview?.total_opex_annual || 0) + (overview?.total_maintenance_annual || 0)
    : ((overview?.total_opex_annual || 0) + (overview?.total_maintenance_annual || 0)) / 12;

  const partnerCost = isAnnualView
    ? overview?.total_partner_agency_cost || 0
    : (overview?.total_partner_agency_cost || 0) / 12;

  return (
    <div className="space-y-4">
      {/* Action Notification */}
      {actionSuccessMessage && (
        <div className="flex items-center justify-between gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {/* 1. Main Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
            {/* State Selector */}
            <select
              aria-label="Scope State"
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                if (onStateSelect) onStateSelect(val);
                setSelectedDistrictId(undefined);
                setDistrictPage(0);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States / National Scope</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>

            {/* District Selector (revealed if state selected) */}
            {Boolean(selectedStateId) && (
              <select
                aria-label="Filter District"
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  setSelectedDistrictId(e.target.value ? parseInt(e.target.value, 10) : undefined);
                  setDistrictPage(0);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All Districts in State</option>
                {stateDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>
            )}

            {/* Year Selector */}
            <select
              aria-label="Budget Year"
              value={periodYear}
              onChange={(e) => {
                setPeriodYear(parseInt(e.target.value, 10));
                setDistrictPage(0);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value={2026}>FY 2026</option>
              <option value={2027}>FY 2027</option>
            </select>

            {/* Month Selector */}
            <select
              aria-label="Budget Month"
              value={periodMonth}
              onChange={(e) => {
                setPeriodMonth(parseInt(e.target.value, 10));
                setDistrictPage(0);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            {/* Annual vs Monthly Projection Toggle */}
            <div className="inline-flex rounded-md border border-[#D9E1EA] bg-[#F4F7FA] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsAnnualView(true)}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  isAnnualView ? 'bg-white text-[#0B1F3A] shadow-2xs' : 'text-[#5D6878] hover:text-[#0B1F3A]'
                }`}
              >
                Annual Projections
              </button>
              <button
                type="button"
                onClick={() => setIsAnnualView(false)}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  !isAnnualView ? 'bg-white text-[#0B1F3A] shadow-2xs' : 'text-[#5D6878] hover:text-[#0B1F3A]'
                }`}
              >
                Monthly Recurring
              </button>
            </div>

            {/* Reset Filters */}
            {Boolean(selectedStateId || selectedDistrictId) && (
              <button
                type="button"
                onClick={() => {
                  if (onStateSelect) onStateSelect(undefined);
                  setSelectedDistrictId(undefined);
                  setDistrictPage(0);
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Scope</span>
              </button>
            )}
          </div>

          {/* Methodology & Calculation Transparency Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMethodologyModalOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded border border-[#1769AA]/40 bg-[#EAF3FA] px-3.5 text-xs font-semibold text-[#1769AA] hover:bg-[#D5E7F7] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Info className="h-4 w-4" />
              <span>Formulas &amp; Methodology</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Disclaimers & Alert Notices */}
      <div className="space-y-2">
        {/* Planning Projections Disclaimer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold border border-blue-200 uppercase tracking-wide shrink-0">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Planning Projections
            </span>
            <span className="text-slate-700">
              Figures represent computational demand estimates derived from Phase 8 crime forecasts, Phase 9 risk assessments, and Phase 10 resource optimization algorithms. They do not constitute approved legislative appropriations.
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-blue-800 shrink-0">
            FY {periodYear} — M{periodMonth}
          </span>
        </div>

        {/* Unconfigured / Unrecorded Inventories Notice */}
        {overview && overview.unrecorded_inventory_districts_count > 0 && (
          <div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Inventory Notice:</strong> {overview.unrecorded_inventory_districts_count} districts currently lack verified baseline equipment inventories. For these jurisdictions, new procurement is estimated as an upper-bound replacement ceiling without assuming zero availability.
              </span>
            </div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300 bg-amber-100 text-amber-800 shrink-0">
              UNRECORDED INVENTORIES
            </span>
          </div>
        )}
      </div>

      {/* 3. Top KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Total Police Requirement */}
        <StatCard
          title={isAnnualView ? 'Annual Police Requirement' : 'Monthly Police Requirement'}
          value={formatINR(policeReq, true)}
          subtext="CAPEX + OPEX + Maintenance"
          icon={Coins}
          color="navy"
        />

        {/* 2. Configured Police Budget */}
        <StatCard
          title={isAnnualView ? 'Configured Police Budget' : 'Configured Monthly Budget'}
          value={hasConfiguredBudget ? formatINR(configuredPoliceBudget, true) : 'NOT_CONFIGURED'}
          subtext={
            hasConfiguredBudget
              ? `${overview?.configured_states_count || 0} States configured`
              : 'Official statutory budget unrecorded'
          }
          icon={Building2}
          color={hasConfiguredBudget ? 'blue' : 'amber'}
        />

        {/* 3. Net Budget Gap / Surplus */}
        <StatCard
          title={netGap >= 0 ? 'Projected Surplus' : 'Funding Shortfall (Deficit)'}
          value={hasConfiguredBudget ? formatINR(Math.abs(netGap), true) : 'NOT_CONFIGURED'}
          subtext={
            percentFunded !== null
              ? `${percentFunded.toFixed(1)}% funded`
              : 'Requires statutory allocation'
          }
          icon={netGap >= 0 ? TrendingUp : TrendingDown}
          color={!hasConfiguredBudget ? 'amber' : netGap >= 0 ? 'emerald' : 'rose'}
        />

        {/* 4. Capital Procurement (CAPEX) */}
        <StatCard
          title="Capital Outlay (CAPEX)"
          value={formatINR(capexTotal, true)}
          subtext="One-time asset procurement"
          icon={Wrench}
          color="blue"
        />

        {/* 5. Recurring Operating & Maintenance */}
        <StatCard
          title={isAnnualView ? 'Annual Operating (OPEX)' : 'Monthly Operating (OPEX)'}
          value={formatINR(opexTotal, true)}
          subtext="Salaries, fuel, maintenance"
          icon={Car}
          color="navy"
        />

        {/* 6. Partner Agency Costs (Ambulances) */}
        <StatCard
          title={isAnnualView ? 'Partner Agency Cost' : 'Monthly Partner Cost'}
          value={formatINR(partnerCost, true)}
          subtext="Emergency Medical (Non-Police)"
          icon={Truck}
          color="emerald"
        />
      </div>

      {/* 4. Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border border-[#D9E1EA] bg-[#F4F7FA]">
        {[
          { key: 'overview', label: 'Budget Overview & Gap Analysis', icon: Scale },
          { key: 'pools', label: '10-Pool Cost Breakdown', icon: Layers },
          { key: 'simulator', label: 'Scenario Simulator', icon: Sliders },
          { key: 'cost_master', label: 'Resource Cost Master', icon: FileText },
          { key: 'history', label: 'History & Provenance', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabType)}
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

      {/* 5. TAB CONTENT */}
      <div className="bg-white rounded-lg border border-[#D9E1EA] p-4 shadow-2xs">
        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW & GAP ANALYSIS                                    */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Annual Police Budget vs Requirement Gauge Card */}
            <div className="rounded-lg border border-[#D9E1EA] bg-gradient-to-r from-slate-50 to-[#F4F7FA] p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#1769AA]" />
                    <span>Statutory Allocation vs. 10-Pool Operational Demand</span>
                  </h3>
                  <p className="text-xs text-[#5D6878]">
                    Comparison between legislative police allocations and empirical resource demand for crime prevention.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[#5D6878] block text-[10px]">Configured Statutory:</span>
                    <span className="text-base font-bold text-[#172033]">
                      {hasConfiguredBudget ? formatINR(configuredPoliceBudget, true) : 'NOT_CONFIGURED'}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-300" />
                  <div>
                    <span className="text-[#5D6878] block text-[10px]">Estimated Requirement:</span>
                    <span className="text-base font-bold text-[#1769AA]">
                      {formatINR(policeReq, true)}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-300" />
                  <div>
                    <span className="text-[#5D6878] block text-[10px]">Net Variance:</span>
                    <span
                      className={`text-base font-bold ${
                        !hasConfiguredBudget
                          ? 'text-amber-700'
                          : netGap >= 0
                          ? 'text-emerald-700'
                          : 'text-[#C53B3B]'
                      }`}
                    >
                      {!hasConfiguredBudget
                        ? 'Deficit Pending'
                        : netGap >= 0
                        ? `+${formatINR(netGap, true)} Surplus`
                        : `${formatINR(netGap, true)} Deficit`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {hasConfiguredBudget && percentFunded !== null && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-[#5D6878]">
                    <span>Funded Ratio: {percentFunded.toFixed(1)}%</span>
                    <span>100% Demand Met</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentFunded >= 100
                          ? 'bg-emerald-600'
                          : percentFunded >= 75
                          ? 'bg-[#1769AA]'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${Math.min(100, percentFunded)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* State-Wise Budget Comparison Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#1769AA]" />
                    <span>State &amp; UT Police Budget Register</span>
                  </h3>
                  <p className="text-[11px] text-[#5D6878]">
                    Statutory state police budgets compared against aggregated district 10-pool requirements.
                  </p>
                </div>
                <span className="text-xs text-[#5D6878] font-medium">
                  {stateSummaries.length} States / UTs Evaluated
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                  <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                    <tr>
                      <th className="py-2.5 px-3">State / UT</th>
                      <th className="py-2.5 px-2 text-center">Districts</th>
                      <th className="py-2.5 px-3 text-right">Configured Budget</th>
                      <th className="py-2.5 px-3 text-right">Police Requirement</th>
                      <th className="py-2.5 px-3 text-right">CAPEX Outlay</th>
                      <th className="py-2.5 px-3 text-right">Annual OPEX</th>
                      <th className="py-2.5 px-3 text-right">Partner Agency (Ambulances)</th>
                      <th className="py-2.5 px-3 text-right">Variance / Gap</th>
                      <th className="py-2.5 px-2 text-center">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                    {stateSummaries.map((s) => {
                      const isConfigured =
                        s.configured_annual_budget !== null &&
                        s.configured_annual_budget !== undefined &&
                        s.configured_annual_budget > 0;
                      const gap = s.budget_gap_or_surplus;

                      return (
                        <tr
                          key={s.state_id}
                          className={`hover:bg-slate-50 transition-colors ${
                            selectedStateId === s.state_id ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">
                            <button
                              type="button"
                              onClick={() => {
                                if (onStateSelect) onStateSelect(s.state_id);
                                setSelectedDistrictId(undefined);
                                setDistrictPage(0);
                              }}
                              className="text-left hover:text-[#1769AA] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{s.state_name}</span>
                              <ChevronRight className="h-3 w-3 text-slate-400" />
                            </button>
                            <span className="text-[10px] text-[#5D6878] font-mono">
                              {s.state_code || `ST-${s.state_id}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#5D6878]">
                            {s.districts_count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {isConfigured && s.configured_annual_budget != null ? (
                              <span className="font-bold text-[#172033]">
                                {formatINR(s.configured_annual_budget, true)}
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-800">
                                NOT_CONFIGURED
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#1769AA]">
                            {formatINR(s.total_police_budget_requirement, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#5D6878]">
                            {formatINR(s.total_capex_procurement, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#5D6878]">
                            {formatINR(s.total_opex_annual + s.total_maintenance_annual, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-medium">
                            {formatINR(s.total_partner_agency_cost, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            {isConfigured && gap !== null && gap !== undefined ? (
                              <span className={gap >= 0 ? 'text-emerald-700' : 'text-[#C53B3B]'}>
                                {gap >= 0 ? `+${formatINR(gap, true)}` : formatINR(gap, true)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                s.budget_verification_status === 'VERIFIED_OFFICIAL'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : s.budget_verification_status === 'ADMIN_ESTIMATE'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {s.budget_verification_status === 'VERIFIED_OFFICIAL'
                                ? 'Official'
                                : s.budget_verification_status === 'ADMIN_ESTIMATE'
                                ? 'Admin Estimate'
                                : 'Not Configured'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* District Shortfall & Demand Ranking Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#1769AA]" />
                    <span>District-Level Shortfall &amp; Resource Demand Register</span>
                  </h3>
                  <p className="text-[11px] text-[#5D6878]">
                    Granular district requirements showing baseline inventory, recommended allocations, procurement requirements, and funding gap.
                  </p>
                </div>

                {/* Search and filters */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search district name..."
                      value={districtSearchQuery}
                      onChange={(e) => {
                        setDistrictSearchQuery(e.target.value);
                        setDistrictPage(0);
                      }}
                      className="h-9 w-44 rounded border border-[#D9E1EA] bg-white pl-7 pr-2.5 text-xs text-[#172033] placeholder-[#5D6878] shadow-2xs focus:border-[#1769AA] focus:outline-none"
                    />
                  </div>

                  <select
                    aria-label="Filter Risk Level"
                    value={districtRiskFilter}
                    onChange={(e) => {
                      setDistrictRiskFilter(e.target.value);
                      setDistrictPage(0);
                    }}
                    className="h-9 rounded border border-[#D9E1EA] bg-white py-1 px-2.5 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] cursor-pointer"
                  >
                    <option value="ALL">All Risk Levels</option>
                    <option value="CRITICAL">Critical Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="MODERATE">Moderate Risk</option>
                    <option value="LOW">Low Risk</option>
                  </select>
                </div>
              </div>

              {districtSummary.items.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                  <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                    <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                      <tr>
                        <th className="py-2.5 px-3">Rank &amp; District</th>
                        <th className="py-2.5 px-2 text-center">Risk Level</th>
                        <th className="py-2.5 px-2 text-right">Recommended Units</th>
                        <th className="py-2.5 px-2 text-right">Existing Inv</th>
                        <th className="py-2.5 px-2 text-right">New Procure</th>
                        <th className="py-2.5 px-3 text-right">Police Requirement</th>
                        <th className="py-2.5 px-3 text-right">Configured Budget</th>
                        <th className="py-2.5 px-3 text-right">Funding Gap</th>
                        <th className="py-2.5 px-2 text-center">Inventory Status</th>
                        <th className="py-2.5 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                      {districtSummary.items.map((d) => {
                        const isConfigured = d.configured_budget !== null && d.configured_budget !== undefined;
                        const reqVal = isAnnualView
                          ? d.total_police_budget_requirement
                          : d.total_police_budget_requirement / 12;
                        const gapVal =
                          isConfigured && d.budget_gap_or_surplus != null
                            ? isAnnualView
                              ? d.budget_gap_or_surplus
                              : d.budget_gap_or_surplus / 12
                            : null;

                        return (
                          <tr key={d.district_id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-slate-400">#{d.rank}</span>
                                <span>{d.district_name}</span>
                              </div>
                              <span className="text-[10px] text-[#5D6878] font-normal">{d.state_name}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  d.risk_level === 'CRITICAL'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : d.risk_level === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {d.risk_level}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-[#0B1F3A]">
                              {d.recommended_units_total.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right text-[#5D6878]">
                              {d.inventory_configured_status === 'UNRECORDED' ? (
                                <span className="text-amber-700 font-medium text-[11px]">Unrecorded</span>
                              ) : (
                                d.existing_inventory_total.toLocaleString()
                              )}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-[#1769AA]">
                              +{d.procurement_units_total.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#172033]">
                              {formatLakhs(reqVal)}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {isConfigured ? (
                                formatLakhs(isAnnualView ? d.configured_budget! : d.configured_budget! / 12)
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-800">
                                  NOT_CONFIGURED
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              {gapVal != null ? (
                                <span className={gapVal >= 0 ? 'text-emerald-700' : 'text-[#C53B3B]'}>
                                  {gapVal >= 0 ? `+${formatLakhs(gapVal)}` : formatLakhs(gapVal)}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  d.inventory_configured_status === 'FULLY_RECORDED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {d.inventory_configured_status}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setInspectedDistrict(d)}
                                className="px-2.5 py-1 rounded border border-[#D9E1EA] bg-white hover:bg-[#F4F7FA] text-[#172033] text-[11px] font-semibold cursor-pointer shadow-2xs"
                              >
                                Breakdown
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No district records found."
                  message="Try clearing your search query or selecting a different state scope."
                />
              )}

              {/* Pagination controls */}
              <div className="flex items-center justify-between text-xs text-[#5D6878] pt-2">
                <span>
                  Showing {districtPage * pageSize + 1} -{' '}
                  {Math.min((districtPage + 1) * pageSize, districtSummary.total)} of {districtSummary.total} districts
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={districtPage === 0}
                    onClick={() => setDistrictPage((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1 rounded border border-[#D9E1EA] bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={(districtPage + 1) * pageSize >= districtSummary.total}
                    onClick={() => setDistrictPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded border border-[#D9E1EA] bg-white disabled:opacity-50 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: 10-POOL COST BREAKDOWN                                     */}
        {/* ================================================================= */}
        {activeTab === 'pools' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>10-Pool Resource Expenditure Schedule</span>
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Detailed breakdown across all 10 canonical Phase 10 resource pools separating CAPEX, OPEX, and partner-agency costs.
                </p>
              </div>
              <div className="text-xs font-semibold text-[#1769AA]">
                Mode: {isAnnualView ? 'Annual Projections' : 'Monthly Recurring'}
              </div>
            </div>

            {/* 10-Pool Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {overview &&
                Object.entries(overview.category_expenditure_breakdown).map(([catKey, details]) => {
                  const Icon = getPoolIcon(catKey);
                  const isPartner = details.is_partner_agency;

                  const totalCat = isAnnualView ? details.total : details.total / 12;
                  const opexCat = isAnnualView ? details.opex : details.opex / 12;
                  const capexCat = details.capex;

                  return (
                    <div
                      key={catKey}
                      className={`rounded-lg border p-3.5 shadow-2xs space-y-2.5 transition-colors ${
                        isPartner
                          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                          : 'border-[#D9E1EA] bg-white hover:border-[#BAC7D5]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-md ${
                              isPartner ? 'bg-emerald-100 text-emerald-800' : 'bg-[#F4F7FA] text-[#1769AA]'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#0B1F3A] block">{catKey}</span>
                            <span className="text-[10px] text-[#5D6878]">
                              {details.units.toLocaleString()} Units Demand
                            </span>
                          </div>
                        </div>
                        {isPartner && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-300 bg-emerald-100 text-emerald-800">
                            Partner Agency
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#5D6878]">Procurement (CAPEX):</span>
                          <span className="font-semibold text-[#172033]">{formatINR(capexCat)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5D6878]">
                            {isAnnualView ? 'Annual OPEX:' : 'Monthly OPEX:'}
                          </span>
                          <span className="font-semibold text-[#172033]">{formatINR(opexCat)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5D6878]">Maintenance:</span>
                          <span className="font-semibold text-[#5D6878]">
                            {formatINR(isAnnualView ? details.maintenance : details.maintenance / 12)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                          <span className="text-[#0B1F3A]">Total Requirement:</span>
                          <span className={isPartner ? 'text-emerald-800' : 'text-[#1769AA]'}>
                            {formatINR(totalCat)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* CAPEX vs OPEX Ratio Summary Bar */}
            {overview && (
              <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B1F3A]">
                  <span>Capital Acquisition (CAPEX) vs Operating &amp; Maintenance (OPEX) Ratio</span>
                  <span>
                    CAPEX: {overview.capex_vs_opex_summary.capex_percentage.toFixed(1)}% | OPEX:{' '}
                    {overview.capex_vs_opex_summary.opex_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
                  <div
                    className="h-full bg-[#1769AA]"
                    style={{ width: `${overview.capex_vs_opex_summary.capex_percentage}%` }}
                    title={`CAPEX: ${formatINR(overview.capex_vs_opex_summary.capex_amount, true)}`}
                  />
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${overview.capex_vs_opex_summary.opex_percentage}%` }}
                    title={`OPEX: ${formatINR(overview.capex_vs_opex_summary.opex_amount, true)}`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#5D6878]">
                  <span>
                    Blue: Capital Outlay ({formatINR(overview.capex_vs_opex_summary.capex_amount, true)})
                  </span>
                  <span>
                    Green: Recurring Operational ({formatINR(overview.capex_vs_opex_summary.opex_amount, true)})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: SCENARIO SIMULATOR                                         */}
        {/* ================================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Budget-Constrained Scenario Simulator</span>
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Test hypothetical budget caps, resource category funding reallocations, and risk-weighted prioritization.
                </p>
              </div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-800">
                In-Memory Simulation (Isolated)
              </span>
            </div>

            {/* Controls Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-lg border border-[#D9E1EA] bg-[#F4F7FA] p-4">
              {/* 1. Total Budget Ceiling */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0B1F3A] block">
                  Simulated Annual Police Budget Ceiling (in ₹ Crores):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={simBudgetCeilingCr}
                    onChange={(e) => setSimBudgetCeilingCr(e.target.value ? Number(e.target.value) : '')}
                    className="h-9 w-full rounded border border-[#D9E1EA] bg-white px-3 text-xs text-[#172033] font-semibold focus:border-[#1769AA] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-[#5D6878]">Cr</span>
                </div>
                <p className="text-[10px] text-[#5D6878]">
                  Leave blank to simulate without aggregate statutory ceiling.
                </p>

                {/* Priority Mode Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#172033] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simPrioritizeRisk}
                      onChange={(e) => setSimPrioritizeRisk(e.target.checked)}
                      className="rounded border-[#D9E1EA] text-[#1769AA] focus:ring-[#1769AA]"
                    />
                    <span>Risk-Weighted Prioritization (Critical districts first)</span>
                  </label>
                </div>
              </div>

              {/* 2. Category % Adjustments */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-bold text-[#0B1F3A] block">
                  Resource Category Allocation Adjustments (-50% to +100%):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {Object.keys(simCategoryAdjustments).map((cat) => (
                    <div key={cat} className="space-y-1 bg-white p-2 rounded border border-[#D9E1EA]">
                      <div className="flex justify-between font-semibold">
                        <span className="truncate">{cat}:</span>
                        <span className={simCategoryAdjustments[cat] > 0 ? 'text-[#1769AA]' : simCategoryAdjustments[cat] < 0 ? 'text-[#C53B3B]' : 'text-slate-500'}>
                          {simCategoryAdjustments[cat] > 0 ? `+${simCategoryAdjustments[cat]}%` : `${simCategoryAdjustments[cat]}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="100"
                        step="5"
                        value={simCategoryAdjustments[cat]}
                        onChange={(e) =>
                          setSimCategoryAdjustments((prev) => ({
                            ...prev,
                            [cat]: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSimBudgetCeilingCr('');
                    setSimCategoryAdjustments({
                      PERSONNEL: 0,
                      MOBILITY: 0,
                      INVESTIGATION: 0,
                      SPECIALIZED: 0,
                      SURVEILLANCE: 0,
                      FORENSIC: 0,
                      CYBER_TECHNOLOGY: 0,
                      COMMUNICATION: 0,
                      TRAFFIC_SAFETY: 0,
                    });
                    setSimResult(null);
                  }}
                  className="px-3 py-1.5 rounded border border-[#D9E1EA] bg-white text-xs font-semibold text-[#5D6878] hover:bg-slate-50 cursor-pointer"
                >
                  Reset Sliders
                </button>
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={handleRunSimulation}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#1769AA] text-white text-xs font-bold hover:bg-[#114E80] disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isSimulating ? 'Simulating...' : 'Execute Simulation'}</span>
                </button>
              </div>
            </div>

            {/* Simulation Results View */}
            {simResult && (
              <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span>Simulated Scenario Analysis Results</span>
                    </h4>
                    <p className="text-[11px] text-purple-800">
                      Scenario ID: <strong className="font-mono">{simResult.scenario_id}</strong>
                    </p>
                  </div>

                  {/* Save Scenario Dialog Trigger */}
                  {isAnalyst && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Scenario label..."
                        value={scenarioNameInput}
                        onChange={(e) => setScenarioNameInput(e.target.value)}
                        className="h-8 rounded border border-purple-300 bg-white px-2.5 text-xs text-[#172033]"
                      />
                      <button
                        type="button"
                        disabled={isSavingScenario || !scenarioNameInput.trim()}
                        onClick={handleSaveScenario}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded bg-purple-800 text-white text-xs font-bold hover:bg-purple-900 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulation KPI comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <span className="text-[10px] text-[#5D6878] block font-semibold">
                      Baseline Annual Requirement:
                    </span>
                    <span className="text-sm font-bold text-[#0B1F3A]">
                      {formatINR(simResult.baseline_police_requirement, true)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <span className="text-[10px] text-[#5D6878] block font-semibold">
                      Simulated Police Requirement:
                    </span>
                    <span className="text-sm font-bold text-[#1769AA]">
                      {formatINR(simResult.proposed_police_requirement, true)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <span className="text-[10px] text-[#5D6878] block font-semibold">
                      Variance Delta vs Baseline:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        simResult.delta_requirement > 0
                          ? 'text-amber-700'
                          : simResult.delta_requirement < 0
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {simResult.delta_requirement > 0
                        ? `+${formatINR(simResult.delta_requirement, true)}`
                        : formatINR(simResult.delta_requirement, true)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <span className="text-[10px] text-[#5D6878] block font-semibold">
                      Unmet Demand Districts:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        simResult.unmet_resource_demand_count > 0 ? 'text-[#C53B3B]' : 'text-emerald-700'
                      }`}
                    >
                      {simResult.unmet_resource_demand_count} jurisdictions
                    </span>
                  </div>
                </div>

                {/* Simulated Category Schedule Table */}
                <div className="overflow-x-auto rounded border border-purple-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-purple-100/60 text-purple-950 font-bold border-b border-purple-200">
                      <tr>
                        <th className="py-2 px-3">Resource Pool</th>
                        <th className="py-2 px-2 text-right">Baseline Units</th>
                        <th className="py-2 px-2 text-right">Simulated Units</th>
                        <th className="py-2 px-2 text-right">Delta Units</th>
                        <th className="py-2 px-3 text-right">CAPEX Outlay</th>
                        <th className="py-2 px-3 text-right">Annual OPEX</th>
                        <th className="py-2 px-3 text-right">Simulated Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {Object.entries(simResult.category_summary).map(([cat, val]) => (
                        <tr key={cat} className="hover:bg-purple-50/40">
                          <td className="py-2 px-3 font-semibold text-[#0B1F3A]">{cat}</td>
                          <td className="py-2 px-2 text-right text-[#5D6878]">{val.baseline_units}</td>
                          <td className="py-2 px-2 text-right font-bold text-[#172033]">{val.proposed_units}</td>
                          <td className="py-2 px-2 text-right font-bold">
                            <span className={val.delta_units > 0 ? 'text-[#1769AA]' : val.delta_units < 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {val.delta_units > 0 ? `+${val.delta_units}` : val.delta_units}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-[#5D6878]">{formatINR(val.capex_procurement)}</td>
                          <td className="py-2 px-3 text-right text-[#5D6878]">{formatINR(val.opex_annual)}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#1769AA]">{formatINR(val.total_annual)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: RESOURCE COST MASTER                                       */}
        {/* ================================================================= */}
        {activeTab === 'cost_master' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Configurable Resource Cost Master Registry</span>
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Unit benchmarks across all 10 canonical resource categories. Administrative users can adjust unit acquisition, operating, and maintenance rates.
                </p>
              </div>
              <span className="text-xs font-bold text-[#5D6878]">
                {costMasterItems.length} Canonical Pools Active
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
              <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                  <tr>
                    <th className="py-2.5 px-3">Resource Pool</th>
                    <th className="py-2.5 px-2">Unit</th>
                    <th className="py-2.5 px-3 text-right">Unit Acquisition (CAPEX)</th>
                    <th className="py-2.5 px-3 text-right">Monthly OPEX</th>
                    <th className="py-2.5 px-3 text-right">Annual Maintenance</th>
                    <th className="py-2.5 px-2 text-center">Classification</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-3">Source &amp; Ref</th>
                    {isAdmin && <th className="py-2.5 px-2 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                  {costMasterItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                        <div>{item.resource_name}</div>
                        <span className="text-[10px] text-[#5D6878] font-mono">{item.resource_category}</span>
                        {item.is_partner_agency && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Partner
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-[#5D6878]">{item.unit_of_measure}</td>
                      <td className="py-2 px-3 text-right font-bold text-[#172033]">
                        {formatINR(item.unit_acquisition_cost)}
                      </td>
                      <td className="py-2 px-3 text-right text-[#5D6878]">
                        {formatINR(item.monthly_operating_unit_cost)}
                      </td>
                      <td className="py-2 px-3 text-right text-[#5D6878]">
                        {formatINR(item.annual_maintenance_unit_cost)}
                      </td>
                      <td className="py-2 px-2 text-center font-medium">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                          {item.cost_classification}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            item.verification_status === 'VERIFIED_QUOTATION'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.verification_status === 'OFFICIAL_SOURCE'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {item.verification_status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#5D6878] text-[11px]">
                        <div>{item.source_name}</div>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[#1769AA] hover:underline text-[10px]"
                          >
                            <span>Ref Document</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCostItem(item);
                              setCostFormUpdates({
                                resource_name: item.resource_name,
                                unit_acquisition_cost: item.unit_acquisition_cost,
                                monthly_operating_unit_cost: item.monthly_operating_unit_cost,
                                annual_maintenance_unit_cost: item.annual_maintenance_unit_cost,
                                verification_status: item.verification_status,
                                notes: item.notes || '',
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D9E1EA] bg-white text-[#1769AA] text-[11px] font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: HISTORY & PROVENANCE                                       */}
        {/* ================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
              <h3 className="text-xs font-bold text-[#0B1F3A]">
                Calculation History &amp; Mathematical Provenance
              </h3>
              <span className="text-xs text-[#5D6878]">
                {calculationHistory.length} Historical Audits Logged
              </span>
            </div>

            {/* Formula Reference Card */}
            <div className="rounded-lg border border-[#D9E1EA] bg-[#F4F7FA] p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-[#1769AA]" />
                <span>Standard Budget Calculation Formulas</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded border border-[#D9E1EA]">
                  <span className="font-bold text-[#1769AA] block">1. Capital Outlay (CAPEX):</span>
                  <p className="text-[#5D6878] font-mono text-[11px] pt-1">
                    CAPEX = Procurement Units × Unit Acquisition Cost
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Where Procurement Units = max(0, Recommended - Verified Inventory).
                  </span>
                </div>
                <div className="bg-white p-3 rounded border border-[#D9E1EA]">
                  <span className="font-bold text-[#1769AA] block">2. Annual Operating (OPEX):</span>
                  <p className="text-[#5D6878] font-mono text-[11px] pt-1">
                    Annual OPEX = Recommended Units × Monthly Operating × 12
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Reflects regular monthly staff compensation, fuel, and consumables.
                  </span>
                </div>
                <div className="bg-white p-3 rounded border border-[#D9E1EA]">
                  <span className="font-bold text-[#1769AA] block">3. Statutory Gap / Surplus:</span>
                  <p className="text-[#5D6878] font-mono text-[11px] pt-1">
                    Budget Gap = Configured Budget - Police Requirement
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Negative indicates critical funding shortfall requiring statutory augmentation.
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            {calculationHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                  <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                    <tr>
                      <th className="py-2.5 px-3">Calculation ID</th>
                      <th className="py-2.5 px-2">Period</th>
                      <th className="py-2.5 px-3 text-right">CAPEX Outlay</th>
                      <th className="py-2.5 px-3 text-right">Annual OPEX</th>
                      <th className="py-2.5 px-3 text-right">Police Requirement</th>
                      <th className="py-2.5 px-3 text-right">Partner Cost</th>
                      <th className="py-2.5 px-3 text-right">Funding Gap</th>
                      <th className="py-2.5 px-3">Logged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#172033] bg-white">
                    {calculationHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#1769AA]">
                          {h.calculation_id}
                        </td>
                        <td className="py-2 px-2 text-[#5D6878]">{h.assessment_period}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatINR(h.total_capex, true)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatINR(h.total_opex_annual, true)}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#0B1F3A]">
                          {formatINR(h.total_police_budget_requirement, true)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-800 font-medium">
                          {formatINR(h.total_partner_agency_cost, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {h.budget_gap_or_surplus != null ? (
                            <span className={h.budget_gap_or_surplus >= 0 ? 'text-emerald-700' : 'text-[#C53B3B]'}>
                              {h.budget_gap_or_surplus >= 0
                                ? `+${formatINR(h.budget_gap_or_surplus, true)}`
                                : formatINR(h.budget_gap_or_surplus, true)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[#5D6878] text-[11px]">
                          {h.created_at ? new Date(h.created_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No calculation audits logged yet."
                message="Audit logs will be populated as budget estimations are requested."
              />
            )}

            {/* Saved Simulation Scenarios */}
            <div className="space-y-3 pt-4 border-t border-[#D9E1EA]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0B1F3A] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>Saved Budget Scenarios Registry</span>
                </h4>
                <span className="text-xs text-[#5D6878]">
                  {savedScenarios.length} Scenarios Saved
                </span>
              </div>

              {savedScenarios.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[#D9E1EA]">
                  <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                    <thead className="bg-[#F4F7FA] text-[#172033] font-bold border-b border-[#D9E1EA]">
                      <tr>
                        <th className="py-2 px-3">Scenario Name</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-2">Year</th>
                        <th className="py-2 px-3 text-right">Budget Ceiling</th>
                        <th className="py-2 px-3">Saved At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {savedScenarios.map((sc) => (
                        <tr key={sc.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                            <div>{sc.name}</div>
                            <span className="text-[10px] text-slate-500 font-mono">{sc.scenario_id}</span>
                          </td>
                          <td className="py-2 px-3 text-[#5D6878]">{sc.description || '—'}</td>
                          <td className="py-2 px-2 text-[#5D6878]">FY {sc.budget_year}</td>
                          <td className="py-2 px-3 text-right font-medium">
                            {sc.total_budget_limit ? formatINR(sc.total_budget_limit, true) : 'Uncapped'}
                          </td>
                          <td className="py-2 px-3 text-[#5D6878] text-[11px]">
                            {sc.created_at ? new Date(sc.created_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-[#5D6878] italic p-3 bg-slate-50 rounded border border-[#D9E1EA]">
                  No saved scenarios for the selected scope. Use the Scenario Simulator tab to simulate and save planning scenarios.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: METHODOLOGY & EXPLANATION                                  */}
      {/* =================================================================== */}
      {isMethodologyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-3">
              <div className="flex items-center gap-2 text-[#0B1F3A]">
                <HelpCircle className="h-5 w-5 text-[#1769AA]" />
                <h3 className="text-sm font-bold">Budget Intelligence Methodology &amp; Calculation Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMethodologyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#172033] leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-bold text-[#0B1F3A]">1. Data Flow &amp; Algorithmic Provenance</h4>
                <p className="text-[#5D6878]">
                  The Budget Intelligence module dynamically connects Phase 8 Crime Forecasts, Phase 9 District Risk Scores, and Phase 10 Ten-Pool Resource Optimization. Demands are evaluated across all 10 canonical resource categories without flattening distinct equipment types into arbitrary common metrics.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#0B1F3A]">2. Inventory Crediting vs. Replacement Ceilings</h4>
                <p className="text-[#5D6878]">
                  Where district equipment is recorded, net new procurement is calculated as:
                  <code className="block bg-slate-100 p-1 rounded font-mono text-[11px] my-1 text-[#1769AA]">
                    Procurement Units = max(0, Recommended Units - Verified Baseline Inventory)
                  </code>
                  Where baseline inventory is unrecorded (<code className="font-mono text-[10px]">UNRECORDED</code>), procurement is calculated as an upper-bound replacement ceiling without fabricating inventory numbers.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#0B1F3A]">3. Partner Agency Isolation (Emergency Medical)</h4>
                <p className="text-[#5D6878]">
                  Emergency Medical Response Units (<code className="font-mono text-[10px]">EMERGENCY_RESPONSE</code> / Ambulances) are explicitly flagged as <strong>Partner Agency Resources</strong>. Their financial requirements are tracked for inter-agency coordination but are strictly excluded from the direct State Police budget totals unless explicitly statutory.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#0B1F3A]">4. Constitutional &amp; Statutory Disclaimer</h4>
                <p className="text-[#5D6878]">
                  Under Seventh Schedule, List II (State List), police and public order are exclusive state subjects. All figures generated by this module are empirical planning benchmarks and decision-support projections. They do not supersede legislative appropriations or state finance department sanctions.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#D9E1EA]">
              <button
                type="button"
                onClick={() => setIsMethodologyModalOpen(false)}
                className="px-4 py-1.5 rounded bg-[#1769AA] text-white text-xs font-bold hover:bg-[#114E80] cursor-pointer"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: DISTRICT 10-POOL BREAKDOWN                                 */}
      {/* =================================================================== */}
      {inspectedDistrict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  {inspectedDistrict.district_name} — 10-Pool Resource Requirement
                </h3>
                <span className="text-xs text-[#5D6878]">
                  State: {inspectedDistrict.state_name} | Risk Score: {inspectedDistrict.risk_score.toFixed(1)} ({inspectedDistrict.risk_level})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDistrict(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto rounded border border-[#D9E1EA]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F4F7FA] font-bold text-[#172033] border-b border-[#D9E1EA]">
                  <tr>
                    <th className="py-2 px-3">Resource Pool</th>
                    <th className="py-2 px-2 text-right">Rec Units</th>
                    <th className="py-2 px-2 text-right">Baseline Inv</th>
                    <th className="py-2 px-2 text-right">Procure</th>
                    <th className="py-2 px-3 text-right">CAPEX Outlay</th>
                    <th className="py-2 px-3 text-right">Monthly OPEX</th>
                    <th className="py-2 px-3 text-right">Annual Maintenance</th>
                    <th className="py-2 px-3 text-right">Total Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectedDistrict.pool_breakdown.map((pool, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-[#0B1F3A]">
                        {pool.resource_name}
                        {pool.is_partner_agency && (
                          <span className="ml-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            Partner
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-bold">{pool.recommended_units}</td>
                      <td className="py-2 px-2 text-right text-[#5D6878]">
                        {pool.inventory_status === 'UNRECORDED' ? 'Unrecorded' : pool.existing_inventory_units}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-[#1769AA]">
                        +{pool.procurement_units}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-[#172033]">
                        {formatINR(pool.total_acquisition_cost)}
                      </td>
                      <td className="py-2 px-3 text-right text-[#5D6878]">
                        {formatINR(pool.monthly_operating_cost)}
                      </td>
                      <td className="py-2 px-3 text-right text-[#5D6878]">
                        {formatINR(pool.annual_maintenance_cost)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#1769AA]">
                        {formatINR(pool.total_annual_requirement)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#D9E1EA]">
              <button
                type="button"
                onClick={() => setInspectedDistrict(null)}
                className="px-4 py-1.5 rounded bg-[#1769AA] text-white text-xs font-bold hover:bg-[#114E80] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ADMIN EDIT RESOURCE COST MASTER ITEM                       */}
      {/* =================================================================== */}
      {editingCostItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  Edit Benchmark: {editingCostItem.resource_name}
                </h3>
                <span className="text-xs text-[#5D6878]">
                  Category: {editingCostItem.resource_category} ({editingCostItem.unit_of_measure})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCostItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Unit Acquisition Cost (CAPEX in INR):
                </label>
                <input
                  type="number"
                  value={costFormUpdates.unit_acquisition_cost || 0}
                  onChange={(e) =>
                    setCostFormUpdates((prev) => ({
                      ...prev,
                      unit_acquisition_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full h-9 rounded border border-[#D9E1EA] px-3 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Monthly Operating Cost per Unit (OPEX in INR):
                </label>
                <input
                  type="number"
                  value={costFormUpdates.monthly_operating_unit_cost || 0}
                  onChange={(e) =>
                    setCostFormUpdates((prev) => ({
                      ...prev,
                      monthly_operating_unit_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full h-9 rounded border border-[#D9E1EA] px-3 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Annual Maintenance Cost per Unit (INR):
                </label>
                <input
                  type="number"
                  value={costFormUpdates.annual_maintenance_unit_cost || 0}
                  onChange={(e) =>
                    setCostFormUpdates((prev) => ({
                      ...prev,
                      annual_maintenance_unit_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full h-9 rounded border border-[#D9E1EA] px-3 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Verification Status:
                </label>
                <select
                  value={costFormUpdates.verification_status || 'ADMIN_ESTIMATE'}
                  onChange={(e) =>
                    setCostFormUpdates((prev) => ({
                      ...prev,
                      verification_status: e.target.value,
                    }))
                  }
                  className="w-full h-9 rounded border border-[#D9E1EA] px-2 text-xs font-medium cursor-pointer"
                >
                  <option value="VERIFIED_QUOTATION">VERIFIED_QUOTATION (GeM / Public Tender)</option>
                  <option value="OFFICIAL_SOURCE">OFFICIAL_SOURCE (MHA / BPR&amp;D Norm)</option>
                  <option value="ADMIN_ESTIMATE">ADMIN_ESTIMATE (Analytical Norm)</option>
                  <option value="NOT_CONFIGURED">NOT_CONFIGURED (Unconfigured)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Notes / Audit Justification:</label>
                <textarea
                  rows={2}
                  value={costFormUpdates.notes || ''}
                  onChange={(e) =>
                    setCostFormUpdates((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Justification for rate adjustment..."
                  className="w-full rounded border border-[#D9E1EA] p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D9E1EA]">
              <button
                type="button"
                onClick={() => setEditingCostItem(null)}
                className="px-3 py-1.5 rounded border border-[#D9E1EA] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingCost}
                onClick={handleSaveCostMasterItem}
                className="px-4 py-1.5 rounded bg-[#1769AA] text-white text-xs font-bold hover:bg-[#114E80] disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingCost ? 'Saving...' : 'Save Benchmark Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetCostAnalysisView;
