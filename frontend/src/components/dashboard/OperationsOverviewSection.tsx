import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Layers,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HeartPulse,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  riskApi,
  optimizationApi,
  budgetApi,
} from '../../api';
import type { FilterParams } from '../../types';

interface OperationsOverviewSectionProps {
  filters: FilterParams;
  isRefreshing?: boolean;
}

interface AlertItem {
  id: string;
  district: string;
  state: string;
  category: 'CRITICAL RISK' | 'RESOURCE SHORTAGE' | 'BUDGET DEFICIT' | 'UNCONFIGURED';
  explanation: string;
}

interface ResourcePoolItem {
  poolKey: string;
  name: string;
  displayName: string;
  unit: string;
  required: number;
  available: number;
  allocated: number;
  shortage: number;
  isPartner: boolean;
}

const CANONICAL_POOLS: Array<{
  key: string;
  name: string;
  displayName: string;
  unit: string;
  isPartner: boolean;
}> = [
  { key: 'PERSONNEL', name: 'Police Personnel', displayName: 'Personnel', unit: 'Officers', isPartner: false },
  { key: 'MOBILITY', name: 'Patrol Vehicles', displayName: 'Mobility', unit: 'Vehicles', isPartner: false },
  { key: 'INVESTIGATION', name: 'Investigation Teams', displayName: 'Investigation', unit: 'Teams', isPartner: false },
  { key: 'SPECIALIZED', name: 'Specialized Tactical Units', displayName: 'Specialized', unit: 'Units', isPartner: false },
  { key: 'SURVEILLANCE', name: 'Surveillance Cameras', displayName: 'Surveillance', unit: 'Cameras', isPartner: false },
  { key: 'FORENSIC', name: 'Forensic Examination Kits', displayName: 'Forensic', unit: 'Tests/Mo', isPartner: false },
  { key: 'CYBER_TECHNOLOGY', name: 'Cyber Workstations', displayName: 'Cyber Tech', unit: 'Workstations', isPartner: false },
  { key: 'EMERGENCY_RESPONSE', name: 'Emergency Ambulances', displayName: 'Emergency EMS', unit: 'Ambulances', isPartner: true },
  { key: 'COMMUNICATION', name: 'Communication Channels', displayName: 'Communication', unit: 'Channels', isPartner: false },
  { key: 'TRAFFIC_SAFETY', name: 'Traffic Enforcement Devices', displayName: 'Traffic Safety', unit: 'Devices', isPartner: false },
];

export const OperationsOverviewSection: React.FC<OperationsOverviewSectionProps> = ({
  filters,
  isRefreshing,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Resource Pools State (10 canonical pools)
  const [resourcePools, setResourcePools] = useState<ResourcePoolItem[]>([]);

  // 2. Budget Overview State
  const [budgetData, setBudgetData] = useState<{
    policeExpenditure: number | null;
    availableBudget: number | null;
    budgetBalance: number | null;
    balanceStatus: 'SURPLUS' | 'DEFICIT' | 'UNAVAILABLE';
    partnerExpenditure: number | null;
    capex: number | null;
    opex: number | null;
    maintenance: number | null;
    hasBudgetConfigured: boolean;
  }>({
    policeExpenditure: null,
    availableBudget: null,
    budgetBalance: null,
    balanceStatus: 'UNAVAILABLE',
    partnerExpenditure: null,
    capex: null,
    opex: null,
    maintenance: null,
    hasBudgetConfigured: false,
  });

  // 4. Operational Alerts State
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Clean INR Currency Formatter (Handles Lakhs, Crores, and Multi-Lakh Crores)
  const formatINR = useCallback((val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return 'Not Available';
    const absVal = Math.abs(val);
    if (absVal === 0) return '₹0';
    if (absVal >= 100000000000) {
      // 10,000 Cr+ -> format with Indian comma grouping in Crores
      const cr = val / 10000000;
      return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }
    if (absVal >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  }, []);

  const loadOperationsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const targetPeriod = '2026-11-01';
    const targetYear = 2026;
    const targetMonth = 11;

    try {
      // Parallel queries across Risk, Budget, and Optimization APIs
      const riskPromise = filters.state_id || filters.district_id
        ? riskApi.listRiskScores({
            state_id: filters.state_id,
            district_id: filters.district_id,
            assessment_period: targetPeriod,
            limit: 1000,
          })
        : riskApi.getOverview(targetPeriod);

      const budgetPromise = filters.district_id
        ? budgetApi.getDistrictBudgetDetail(filters.district_id, {
            year: targetYear,
            month: targetMonth,
          })
        : budgetApi.getFullOverview({
            state_id: filters.state_id,
            year: targetYear,
            month: targetMonth,
          });

      const optOverviewPromise = optimizationApi.getOverview();
      const inventoryPromise = optimizationApi.getInventorySummary(filters.state_id);

      const [riskRes, budgetRes, optRes, invRes] = await Promise.allSettled([
        riskPromise,
        budgetPromise,
        optOverviewPromise,
        inventoryPromise,
      ]);

      // -----------------------------------------------------------------------
      // Process Risk Assessment (Used for Operational Alerts)
      // -----------------------------------------------------------------------
      const criticalDistricts: Array<{ district: string; state: string; score: number }> = [];

      if (riskRes.status === 'fulfilled') {
        const val = riskRes.value as any;
        if ('risk_level_distribution' in val && val.risk_level_distribution) {
          (val.top_risk_districts || [])
            .filter((d: any) => d.risk_level === 'CRITICAL')
            .forEach((d: any) => {
              criticalDistricts.push({
                district: d.district_name || 'District',
                state: d.state_name || 'State',
                score: Number(d.overall_risk_score) || 0,
              });
            });
        } else if ('items' in val && Array.isArray(val.items)) {
          val.items.forEach((item: any) => {
            const lvl = (item.risk_level || '').toUpperCase();
            if (lvl === 'CRITICAL') {
              criticalDistricts.push({
                district: item.district_name || 'District',
                state: item.state_name || 'State',
                score: Number(item.overall_risk_score) || 0,
              });
            }
          });
        }
      }

      // -----------------------------------------------------------------------
      // Process Resource Pools (10 Canonical Pools)
      // -----------------------------------------------------------------------
      const poolsMap: Record<string, ResourcePoolItem> = {};
      CANONICAL_POOLS.forEach((cp) => {
        poolsMap[cp.key] = {
          poolKey: cp.key,
          name: cp.name,
          displayName: cp.displayName,
          unit: cp.unit,
          required: 0,
          available: 0,
          allocated: 0,
          shortage: 0,
          isPartner: cp.isPartner,
        };
      });

      if (filters.district_id && budgetRes.status === 'fulfilled') {
        const b = budgetRes.value as any;
        if (b.pool_breakdown && Array.isArray(b.pool_breakdown)) {
          b.pool_breakdown.forEach((pb: any) => {
            const cat = pb.resource_category;
            if (poolsMap[cat]) {
              const req = Number(pb.recommended_units) || 0;
              const avail = Number(pb.existing_inventory_units) || 0;
              const short = Number(pb.procurement_units) || 0;
              const alloc = Math.max(0, req - short);
              poolsMap[cat].required = req;
              poolsMap[cat].available = avail;
              poolsMap[cat].allocated = alloc;
              poolsMap[cat].shortage = short;
            }
          });
        }
      } else if (budgetRes.status === 'fulfilled') {
        const b = budgetRes.value as any;
        const catBreakdown = b.category_expenditure_breakdown || {};
        const invCategories = invRes.status === 'fulfilled' ? invRes.value?.available_by_category || {} : {};
        const eligibleList = optRes.status === 'fulfilled' ? optRes.value?.eligible_categories || [] : [];

        Object.keys(poolsMap).forEach((key) => {
          const catData = catBreakdown[key];
          const req = Number(catData?.recommended_units ?? catData?.units ?? 0);
          const eligMatch = eligibleList.find((e) => e.category === key);
          const avail = invCategories[key] !== undefined
            ? Number(invCategories[key])
            : (eligMatch?.verified_pool ?? Number(catData?.existing_inventory_units ?? Math.max(req, 10)));
          const alloc = Math.min(req, avail);
          const short = Math.max(0, req - alloc);

          poolsMap[key].required = req;
          poolsMap[key].available = avail;
          poolsMap[key].allocated = alloc;
          poolsMap[key].shortage = short;
        });
      }

      const compiledPools = CANONICAL_POOLS.map((cp) => poolsMap[cp.key]);
      setResourcePools(compiledPools);

      // -----------------------------------------------------------------------
      // Process Budget Overview
      // -----------------------------------------------------------------------
      let policeCost: number | null = null;
      let availBudget: number | null = null;
      let budgetBalance: number | null = null;
      let partnerCost: number | null = null;
      let capex: number | null = null;
      let opex: number | null = null;
      let maintenance: number | null = null;
      let hasBudgetConfigured = false;
      let balanceStatus: 'SURPLUS' | 'DEFICIT' | 'UNAVAILABLE' = 'UNAVAILABLE';

      if (budgetRes.status === 'fulfilled') {
        const b = budgetRes.value as any;
        if (filters.district_id && 'total_police_budget_requirement' in b) {
          policeCost = b.total_police_budget_requirement ?? null;
          availBudget = b.configured_budget ?? null;
          budgetBalance = b.budget_gap_or_surplus ?? null;
          partnerCost = b.total_partner_agency_cost ?? null;
          capex = b.total_capex_procurement ?? null;
          opex = b.total_opex_annual ?? null;
          maintenance = b.total_maintenance_annual ?? null;
          hasBudgetConfigured = availBudget !== null && availBudget !== undefined;

          if (hasBudgetConfigured && budgetBalance !== null) {
            balanceStatus = budgetBalance >= 0 ? 'SURPLUS' : 'DEFICIT';
          }
        } else if ('total_police_budget_requirement' in b) {
          policeCost = b.total_police_budget_requirement ?? null;
          availBudget = b.total_configured_state_budget ?? null;
          budgetBalance = b.total_budget_gap_or_surplus ?? null;
          partnerCost = b.total_partner_agency_cost ?? null;
          capex = b.total_capex_procurement ?? null;
          opex = b.total_opex_annual ?? null;
          maintenance = b.total_maintenance_annual ?? null;
          hasBudgetConfigured = availBudget !== null && availBudget !== undefined && availBudget > 0;

          if (hasBudgetConfigured && budgetBalance !== null) {
            balanceStatus = budgetBalance >= 0 ? 'SURPLUS' : 'DEFICIT';
          }
        }
      }

      setBudgetData({
        policeExpenditure: policeCost,
        availableBudget: availBudget,
        budgetBalance: budgetBalance,
        balanceStatus: balanceStatus,
        partnerExpenditure: partnerCost,
        capex: capex,
        opex: opex,
        maintenance: maintenance,
        hasBudgetConfigured: hasBudgetConfigured,
      });

      // -----------------------------------------------------------------------
      // Process Operational Alerts (Only genuine critical alerts)
      // -----------------------------------------------------------------------
      const compiledAlerts: AlertItem[] = [];

      // 1. Critical Risk Alerts
      criticalDistricts.slice(0, 3).forEach((d, idx) => {
        compiledAlerts.push({
          id: `crit-${idx}-${d.district}`,
          district: d.district,
          state: d.state,
          category: 'CRITICAL RISK',
          explanation: `Crime risk index ${d.score.toFixed(1)} / 100 exceeds critical threshold (≥65.0).`,
        });
      });

      // 2. Resource Shortage Alerts
      compiledPools.filter((p) => p.shortage > 0).forEach((s, idx) => {
        compiledAlerts.push({
          id: `short-${idx}-${s.poolKey}`,
          district: filters.district_id ? 'Current District' : filters.state_id ? 'Statewide Pool' : 'National Pool',
          state: s.name,
          category: 'RESOURCE SHORTAGE',
          explanation: `${s.displayName} pool has an unmet deficit of ${s.shortage.toLocaleString()} ${s.unit}.`,
        });
      });

      // 3. Budget Deficit Alerts
      if (balanceStatus === 'DEFICIT' && budgetBalance !== null) {
        compiledAlerts.push({
          id: 'bgt-deficit-alert',
          district: filters.district_id ? 'District Accounts' : 'Police Budget Office',
          state: filters.district_id ? 'District' : 'State',
          category: 'BUDGET DEFICIT',
          explanation: `Projected operating shortfall of ${formatINR(Math.abs(budgetBalance))} against sanctioned allocation.`,
        });
      }

      // 4. Missing/Unconfigured Configuration Alert
      if (!hasBudgetConfigured) {
        compiledAlerts.push({
          id: 'bgt-unconfigured-alert',
          district: filters.district_id ? 'District Finance' : 'Jurisdictional Treasury',
          state: 'State Department',
          category: 'UNCONFIGURED',
          explanation: 'Sanctioned annual budget allocation has not been registered in financial accounts.',
        });
      }

      setAlerts(compiledAlerts);
    } catch (err: any) {
      console.error('Failed to load operations overview data:', err);
      setError(err?.message || 'Failed to load operational data.');
    } finally {
      setLoading(false);
    }
  }, [filters, formatINR]);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData, isRefreshing]);

  // Derived Summary Metrics
  const poolsWithShortages = useMemo(
    () => resourcePools.filter((p) => p.shortage > 0),
    [resourcePools]
  );

  const activePoolsCount = useMemo(
    () => resourcePools.filter((p) => p.required > 0).length,
    [resourcePools]
  );

  const personnelPool = useMemo(
    () => resourcePools.find((p) => p.poolKey === 'PERSONNEL'),
    [resourcePools]
  );

  const mobilityPool = useMemo(
    () => resourcePools.find((p) => p.poolKey === 'MOBILITY'),
    [resourcePools]
  );

  // Determine if inventory scale difference warrants balanced logarithmic display
  const maxPoolValue = useMemo(() => {
    let max = 0;
    resourcePools.forEach((p) => {
      if (p.required > max) max = p.required;
      if (p.available > max) max = p.available;
      if (p.allocated > max) max = p.allocated;
    });
    return max;
  }, [resourcePools]);

  const useLogScale = maxPoolValue > 500;

  // Chart data: uses logarithmic bar lengths when inventory exceeds 500 so small bars remain visible
  // Actual values remain untouched and are rendered in tooltips and the summary table.
  const chartData = useMemo(() => {
    return resourcePools.map((p) => {
      if (useLogScale) {
        return {
          ...p,
          chartRequired: p.required > 0 ? Math.log10(p.required + 1) : 0,
          chartAvailable: p.available > 0 ? Math.log10(p.available + 1) : 0,
          chartAllocated: p.allocated > 0 ? Math.log10(p.allocated + 1) : 0,
        };
      }
      return {
        ...p,
        chartRequired: p.required,
        chartAvailable: p.available,
        chartAllocated: p.allocated,
      };
    });
  }, [resourcePools, useLogScale]);

  // Donut Chart Data for Budget CAPEX vs OPEX
  const donutData = useMemo(() => {
    const capex = budgetData.capex || 0;
    const opex = budgetData.opex || 0;
    const maint = budgetData.maintenance || 0;

    if (capex === 0 && opex === 0 && maint === 0) {
      return [];
    }

    return [
      { name: 'CAPEX (Procurement)', value: capex, fill: '#4F46E5' },
      { name: 'OPEX (Operations)', value: opex, fill: '#2563EB' },
      { name: 'Maintenance', value: maint, fill: '#0D9488' },
    ];
  }, [budgetData.capex, budgetData.opex, budgetData.maintenance]);

  const totalExpenditureCombined = useMemo(() => {
    return (budgetData.capex || 0) + (budgetData.opex || 0) + (budgetData.maintenance || 0);
  }, [budgetData.capex, budgetData.opex, budgetData.maintenance]);

  return (
    <div className="mt-8 pt-5 border-t border-[#D9E1EA] space-y-4">
      {/* ==================================================================== */}
      {/* 1. SECTION HEADER (Clean, simple, no navigation buttons, no fluff)   */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2.5 border-b border-[#D9E1EA] pb-3">
        <div className="p-1.5 rounded-md bg-[#EAF3FA] text-[#1769AA]">
          <Activity className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-[#0B1F3A]">
          Resource Operations Overview
        </h2>
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center text-xs text-[#5D6878] shadow-2xs">
          <Activity className="h-5 w-5 text-[#1769AA] animate-spin mx-auto mb-2" />
          Aggregating live operational optimization and fiscal intelligence...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-2xs">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ================================================================ */}
          {/* 2. FOUR COMPACT RESOURCE KPI CARDS (Dashboard StatCard styling)  */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Active Resource Pools */}
            <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors min-h-[96px]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                  Active Resource Pools
                </p>
                <div className="rounded p-1.5 shrink-0 bg-[#EAF3FA] text-[#1769AA]">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-1">
                <h3 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#0B1F3A] leading-none">
                  {activePoolsCount} / 10
                </h3>
                <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                  {10 - activePoolsCount === 0 ? 'All 10 standard pools active' : `${activePoolsCount} operational pools active`}
                </p>
              </div>
            </div>

            {/* Card 2: Resources Required */}
            <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors min-h-[96px]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                  Resources Required
                </p>
                <div className="rounded p-1.5 shrink-0 bg-slate-100 text-[#0B1F3A]">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-1">
                <h3 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#0B1F3A] leading-none">
                  {personnelPool ? `${personnelPool.required.toLocaleString()} Officers` : '0 Required'}
                </h3>
                <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                  {mobilityPool ? `${mobilityPool.required.toLocaleString()} Vehicles` : '—'} · {resourcePools.filter((p) => p.required > 0).length} pools with demand
                </p>
              </div>
            </div>

            {/* Card 3: Resources Allocated */}
            <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors min-h-[96px]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                  Resources Allocated
                </p>
                <div className="rounded p-1.5 shrink-0 bg-emerald-50 text-[#16845B]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-1">
                <h3 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#0B1F3A] leading-none">
                  {personnelPool ? `${personnelPool.allocated.toLocaleString()} Officers` : '0 Allocated'}
                </h3>
                <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                  {mobilityPool ? `${mobilityPool.allocated.toLocaleString()} Vehicles` : '—'} · Recommended Allocation
                </p>
              </div>
            </div>

            {/* Card 4: Resource Shortages */}
            <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors min-h-[96px]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                  Resource Shortages
                </p>
                <div className={`rounded p-1.5 shrink-0 ${poolsWithShortages.length > 0 ? 'bg-red-50 text-[#C53B3B]' : 'bg-emerald-50 text-[#16845B]'}`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-1">
                <h3 className={`text-[22px] sm:text-[24px] font-bold tracking-tight leading-none ${poolsWithShortages.length > 0 ? 'text-[#C53B3B]' : 'text-[#16845B]'}`}>
                  {poolsWithShortages.length === 0 ? '0 Shortages' : `${poolsWithShortages.length} ${poolsWithShortages.length === 1 ? 'Pool' : 'Pools'}`}
                </h3>
                <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                  {poolsWithShortages.length === 0
                    ? 'All standing demand fully covered'
                    : poolsWithShortages.map((p) => p.displayName).slice(0, 2).join(', ') + (poolsWithShortages.length > 2 ? ` +${poolsWithShortages.length - 2} more` : '')}
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. RESOURCE ALLOCATION ANALYSIS CHART & RESOURCE SUMMARY TABLE   */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left: Grouped Bar Chart (Resource Allocation Analysis) */}
            <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
                    Resource Allocation Analysis
                  </h3>
                  {/* Clean, Simple Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-medium text-[#5D6878]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" />
                      <span>Required</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#0B1F3A]" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" />
                      <span>Allocated</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Grouped Bar Chart */}
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={chartData}
                      margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        domain={useLogScale ? [0, 'dataMax'] : [0, 'auto']}
                        ticks={useLogScale ? [0, 1, 2, 3, 4, 5, 6] : undefined}
                        tickFormatter={
                          useLogScale
                            ? (v) => (v === 0 ? '0' : v === 1 ? '10' : v === 2 ? '100' : v === 3 ? '1K' : v === 4 ? '10K' : v === 5 ? '100K' : '1M+')
                            : (v) => Number(v).toLocaleString()
                        }
                        tick={{ fontSize: 10, fill: '#5D6878' }}
                        axisLine={{ stroke: '#D9E1EA' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        width={95}
                        tick={{ fontSize: 11, fill: '#0B1F3A', fontWeight: 500 }}
                        axisLine={{ stroke: '#D9E1EA' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#D9E1EA',
                          borderRadius: '0.375rem',
                          color: '#0B1F3A',
                          fontSize: '0.75rem',
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                        }}
                        formatter={(_val: any, name: any, item: any) => {
                          const rawVal =
                            name === 'Required'
                              ? item.payload.required
                              : name === 'Available'
                              ? item.payload.available
                              : item.payload.allocated;
                          return [`${Number(rawVal).toLocaleString()} ${item.payload.unit}`, name];
                        }}
                        labelFormatter={(label: any) => {
                          const pool = resourcePools.find((p) => p.displayName === label);
                          return pool ? `${pool.name} (${pool.unit})` : label;
                        }}
                      />
                      <Bar
                        dataKey="chartRequired"
                        name="Required"
                        fill="#F59E0B"
                        barSize={7}
                        radius={[0, 2, 2, 0]}
                      />
                      <Bar
                        dataKey="chartAvailable"
                        name="Available"
                        fill="#0B1F3A"
                        barSize={7}
                        radius={[0, 2, 2, 0]}
                      />
                      <Bar
                        dataKey="chartAllocated"
                        name="Allocated"
                        fill="#10B981"
                        barSize={7}
                        radius={[0, 2, 2, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right: Resource Summary Table */}
            <div className="lg:col-span-5 rounded-lg border border-[#D9E1EA] bg-white p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
                    Resource Summary
                  </h3>
                  <span className="text-[10px] font-semibold text-[#5D6878]">
                    10 Resource Pools
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#D9E1EA] text-[10px] font-bold text-[#5D6878] uppercase">
                        <th className="py-1 px-1.5">Resource Pool</th>
                        <th className="py-1 px-1 text-right">Required</th>
                        <th className="py-1 px-1 text-right">Available</th>
                        <th className="py-1 px-1 text-right">Allocated</th>
                        <th className="py-1 px-1.5 text-right">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resourcePools.map((p) => (
                        <tr key={p.poolKey} className="hover:bg-slate-50/70">
                          <td className="py-1 px-1.5 font-medium text-[#0B1F3A]">
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[105px]" title={p.name}>
                                {p.displayName}
                              </span>
                              {p.isPartner && (
                                <span className="text-[9px] font-bold text-[#1769AA] bg-blue-50 px-1 rounded border border-blue-200">
                                  Health
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1 px-1 text-right font-medium text-[#0B1F3A]">
                            {p.required.toLocaleString()}
                          </td>
                          <td className="py-1 px-1 text-right text-[#5D6878]">
                            {p.available.toLocaleString()}
                          </td>
                          <td className="py-1 px-1 text-right font-semibold text-emerald-700">
                            {p.allocated.toLocaleString()}
                          </td>
                          <td className="py-1 px-1.5 text-right font-medium">
                            {p.shortage > 0 ? (
                              <span className="text-[#C53B3B] font-bold">
                                -{p.shortage.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[#7C8796]">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 4. BUDGET OVERVIEW (3 KPI cards, Donut chart, Separate Partner)  */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 sm:p-4 shadow-2xs space-y-3.5">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
                Budget Overview
              </h3>
            </div>

            {/* 3 Compact Budget Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                    Estimated Police Expenditure
                  </p>
                  <div className="rounded p-1.5 shrink-0 bg-slate-200/70 text-[#0B1F3A]">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-1">
                  <h4 className="text-[20px] font-bold tracking-tight text-[#0B1F3A] leading-none">
                    {formatINR(budgetData.policeExpenditure)}
                  </h4>
                  <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                    Total departmental requirement
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                    Available Budget
                  </p>
                  <div className="rounded p-1.5 shrink-0 bg-[#EAF3FA] text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-1">
                  <h4 className="text-[20px] font-bold tracking-tight text-[#0B1F3A] leading-none">
                    {budgetData.hasBudgetConfigured ? formatINR(budgetData.availableBudget) : 'Not Available'}
                  </h4>
                  <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                    {budgetData.hasBudgetConfigured ? 'Sanctioned statutory allocation' : 'Budget allocation not configured'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
                    Budget Surplus / Deficit
                  </p>
                  <div className={`rounded p-1.5 shrink-0 ${
                    !budgetData.hasBudgetConfigured
                      ? 'bg-slate-200/70 text-[#0B1F3A]'
                      : budgetData.balanceStatus === 'SURPLUS'
                      ? 'bg-emerald-50 text-[#16845B]'
                      : 'bg-red-50 text-[#C53B3B]'
                  }`}>
                    {budgetData.balanceStatus === 'SURPLUS' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  <h4 className={`text-[20px] font-bold tracking-tight leading-none ${
                    !budgetData.hasBudgetConfigured
                      ? 'text-[#0B1F3A]'
                      : budgetData.balanceStatus === 'SURPLUS'
                      ? 'text-[#16845B]'
                      : 'text-[#C53B3B]'
                  }`}>
                    {!budgetData.hasBudgetConfigured
                      ? 'Not Available'
                      : budgetData.budgetBalance !== null
                      ? budgetData.budgetBalance >= 0
                        ? `+${formatINR(budgetData.budgetBalance)}`
                        : `-${formatINR(Math.abs(budgetData.budgetBalance))}`
                      : 'Not Available'}
                  </h4>
                  <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
                    {!budgetData.hasBudgetConfigured
                      ? 'Awaiting financial sanction entry'
                      : budgetData.balanceStatus === 'SURPLUS'
                      ? 'Operating within sanctioned limits'
                      : 'Projected operating shortfall'}
                  </p>
                </div>
              </div>
            </div>

            {/* Donut Chart (CAPEX / OPEX / Maintenance) + Cost Breakdown + Partner Agency Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
              {/* Donut Chart */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC]">
                <div className="h-[150px] w-full relative">
                  {donutData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={62}
                          paddingAngle={3}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#D9E1EA',
                            borderRadius: '0.375rem',
                            color: '#0B1F3A',
                            fontSize: '0.75rem',
                          }}
                          formatter={(value: any, name: any) => [
                            `${formatINR(Number(value))} (${(
                              (Number(value) / (totalExpenditureCombined || 1)) *
                              100
                            ).toFixed(1)}%)`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#5D6878]">
                      Expenditure breakdown not available
                    </div>
                  )}
                </div>
                {/* Donut Legend */}
                <div className="flex items-center gap-3 text-[10px] font-medium text-[#5D6878] mt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                    <span>CAPEX</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    <span>OPEX</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                    <span>Maintenance</span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown Cards & Partner Agency Row */}
              <div className="lg:col-span-7 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0B1F3A]">
                      <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                      <span>CAPEX</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-1 text-sm">
                      {formatINR(budgetData.capex)}
                    </div>
                    <div className="text-[10px] text-[#7C8796]">Procurement</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0B1F3A]">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <span>OPEX</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-1 text-sm">
                      {formatINR(budgetData.opex)}
                    </div>
                    <div className="text-[10px] text-[#7C8796]">Operations</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-100 bg-[#F8FAFC]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#0B1F3A]">
                      <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                      <span>Maintenance</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-1 text-sm">
                      {formatINR(budgetData.maintenance)}
                    </div>
                    <div className="text-[10px] text-[#7C8796]">Routine AMC</div>
                  </div>
                </div>

                {/* Partner Agency Cost (Separate, Unobtrusive Row) */}
                <div className="p-2.5 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-3.5 w-3.5 text-[#1769AA]" />
                    <span className="font-semibold text-[#0B1F3A]">
                      Partner Agency Cost (Health Dept. Ambulances &amp; EMTs)
                    </span>
                  </div>
                  <div className="font-bold text-[#0B1F3A] text-sm">
                    {formatINR(budgetData.partnerExpenditure)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 5. OPERATIONAL ALERTS (Compact, real alerts only)                */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 sm:p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
                Operational Alerts
              </h3>
              <span className="text-[10px] font-semibold text-[#5D6878]">
                {alerts.length} Active System Alerts
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1.5 text-xs first:pt-0.5 last:pb-0.5"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          al.category === 'CRITICAL RISK'
                            ? 'bg-red-50 text-[#C53B3B] border border-red-200'
                            : al.category === 'RESOURCE SHORTAGE'
                            ? 'bg-amber-50 text-[#C98512] border border-amber-200'
                            : al.category === 'BUDGET DEFICIT'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {al.category}
                      </span>
                      <span className="font-semibold text-[#0B1F3A]">
                        {al.district} ({al.state}):
                      </span>
                      <span className="text-[#5D6878]">{al.explanation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2.5 px-3 text-center text-xs text-emerald-800 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All operational allocations, risk parameters and budgets are within nominal thresholds.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsOverviewSection;
