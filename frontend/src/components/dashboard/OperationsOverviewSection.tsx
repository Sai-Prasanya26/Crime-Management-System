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
  CartesianGrid,
} from 'recharts';
import StatCard from '../common/StatCard';
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
          {/* 1. FOUR RESOURCE KPI CARDS (Exact Dashboard StatCard parity)     */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Resource Pools"
              value={`${activePoolsCount} / 10`}
              subtext={10 - activePoolsCount === 0 ? 'All 10 standard pools active' : `${activePoolsCount} operational pools active`}
              icon={Layers}
              color="blue"
            />
            <StatCard
              title="Resources Required"
              value={personnelPool ? `${personnelPool.required.toLocaleString()} Officers` : '0 Required'}
              subtext={mobilityPool ? `${mobilityPool.required.toLocaleString()} Vehicles · 10 pools demand` : '10 pools demand'}
              icon={Users}
              color="navy"
            />
            <StatCard
              title="Resources Allocated"
              value={personnelPool ? `${personnelPool.allocated.toLocaleString()} Officers` : '0 Allocated'}
              subtext={mobilityPool ? `${mobilityPool.allocated.toLocaleString()} Vehicles · Recommended allocation` : 'Recommended allocation'}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Resource Shortages"
              value={poolsWithShortages.length === 0 ? '0 Shortages' : `${poolsWithShortages.length} ${poolsWithShortages.length === 1 ? 'Pool' : 'Pools'}`}
              subtext={
                poolsWithShortages.length === 0
                  ? 'All standing demand fully covered'
                  : poolsWithShortages.map((p) => p.displayName).slice(0, 2).join(', ') + (poolsWithShortages.length > 2 ? ` +${poolsWithShortages.length - 2} more` : '')
              }
              icon={AlertTriangle}
              color={poolsWithShortages.length === 0 ? 'emerald' : 'rose'}
            />
          </div>

          {/* ================================================================ */}
          {/* 2. RESOURCE ALLOCATION ANALYSIS (Spacious Full-Width Card)       */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4 min-h-[46px]">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                  Resource Allocation Analysis
                </h3>
              </div>

              {/* Clean Legend */}
              <div className="flex items-center gap-4 text-[12px] font-medium text-[#5D6878]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#F59E0B]" />
                  <span>Required Demand</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#0B1F3A]" />
                  <span>Available Inventory</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#10B981]" />
                  <span>Allocated Resources</span>
                </div>
              </div>
            </div>

            {/* Horizontal Grouped Bar Chart with ample height & margin */}
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={useLogScale ? [0, 'dataMax'] : [0, 'auto']}
                    ticks={useLogScale ? [0, 1, 2, 3, 4, 5, 6] : undefined}
                    tickFormatter={
                      useLogScale
                        ? (v) => (v === 0 ? '0' : v === 1 ? '10' : v === 2 ? '100' : v === 3 ? '1K' : v === 4 ? '10K' : v === 5 ? '100K' : '1M+')
                        : (v) => Number(v).toLocaleString()
                    }
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#D9E1EA' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 12, fill: '#0B1F3A', fontWeight: 500 }}
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
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
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
                      const pool = resourcePools.find((p) => p.name === label || p.displayName === label);
                      return pool ? `${pool.name} (${pool.unit})` : label;
                    }}
                  />
                  <Bar
                    dataKey="chartRequired"
                    name="Required"
                    fill="#F59E0B"
                    barSize={9}
                    radius={[0, 2, 2, 0]}
                  />
                  <Bar
                    dataKey="chartAvailable"
                    name="Available"
                    fill="#0B1F3A"
                    barSize={9}
                    radius={[0, 2, 2, 0]}
                  />
                  <Bar
                    dataKey="chartAllocated"
                    name="Allocated"
                    fill="#10B981"
                    barSize={9}
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. RESOURCE ALLOCATION SUMMARY TABLE (Spacious Full-Width Card)  */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3 min-h-[46px]">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                  Resource Summary
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA]">
                10 Canonical Resource Pools
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                    <th className="py-2.5 px-4">Resource Pool</th>
                    <th className="py-2.5 px-4">Unit of Measure</th>
                    <th className="py-2.5 px-4 text-right">Required Demand</th>
                    <th className="py-2.5 px-4 text-right">Available Inventory</th>
                    <th className="py-2.5 px-4 text-right">Recommended Allocation</th>
                    <th className="py-2.5 px-4 text-right">Shortage / Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resourcePools.map((p) => (
                    <tr key={p.poolKey} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#0B1F3A]">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.isPartner && (
                            <span className="text-[10px] font-bold text-[#1769AA] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Health Dept
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#5D6878]">{p.unit}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#0B1F3A]">
                        {p.required.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#5D6878]">
                        {p.available.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                        {p.allocated.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {p.shortage > 0 ? (
                          <span className="text-[#C53B3B] font-bold">
                            -{p.shortage.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#16845B] font-semibold">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 4. BUDGET OVERVIEW (Prominent StatCards, Donut, Breakdown)       */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-h-[46px]">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                  Budget Overview
                </h3>
              </div>
            </div>

            {/* 3 Prominent StatCards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                title="Estimated Police Expenditure"
                value={formatINR(budgetData.policeExpenditure)}
                subtext="Total police operational & capital requirement"
                icon={FileText}
                color="navy"
              />
              <StatCard
                title="Available Budget"
                value={budgetData.hasBudgetConfigured ? formatINR(budgetData.availableBudget) : 'Not Available'}
                subtext={budgetData.hasBudgetConfigured ? 'Sanctioned statutory allocation' : 'Budget allocation not configured'}
                icon={Layers}
                color="blue"
              />
              <StatCard
                title="Budget Surplus / Deficit"
                value={
                  !budgetData.hasBudgetConfigured
                    ? 'Not Available'
                    : budgetData.budgetBalance !== null
                    ? budgetData.budgetBalance >= 0
                      ? `+${formatINR(budgetData.budgetBalance)}`
                      : `-${formatINR(Math.abs(budgetData.budgetBalance))}`
                    : 'Not Available'
                }
                subtext={
                  !budgetData.hasBudgetConfigured
                    ? 'Awaiting financial sanction entry'
                    : budgetData.balanceStatus === 'SURPLUS'
                    ? 'Operating within sanctioned limits'
                    : 'Projected operating shortfall'
                }
                icon={budgetData.balanceStatus === 'SURPLUS' ? CheckCircle2 : AlertTriangle}
                color={!budgetData.hasBudgetConfigured ? 'navy' : budgetData.balanceStatus === 'SURPLUS' ? 'emerald' : 'rose'}
              />
            </div>

            {/* Expenditure Breakdown: Donut Chart + Aligned Category Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2">
              {/* Donut Chart */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC]">
                <div className="h-[180px] w-full relative">
                  {donutData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={75}
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
                <div className="flex items-center gap-4 text-[11px] font-medium text-[#5D6878] mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                    <span>CAPEX</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span>OPEX</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                    <span>Maintenance</span>
                  </div>
                </div>
              </div>

              {/* 3 Cost Breakdown Cards & Partner Agency Row */}
              <div className="lg:col-span-7 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC]">
                    <div className="flex items-center gap-2 font-semibold text-[#0B1F3A] text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                      <span>CAPEX (Capital)</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-2 text-base">
                      {formatINR(budgetData.capex)}
                    </div>
                    <div className="text-[11px] text-[#7C8796] mt-0.5">Asset Procurement</div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC]">
                    <div className="flex items-center gap-2 font-semibold text-[#0B1F3A] text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      <span>OPEX (Operational)</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-2 text-base">
                      {formatINR(budgetData.opex)}
                    </div>
                    <div className="text-[11px] text-[#7C8796] mt-0.5">Personnel & Deployment</div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC]">
                    <div className="flex items-center gap-2 font-semibold text-[#0B1F3A] text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                      <span>Maintenance</span>
                    </div>
                    <div className="font-bold text-[#0B1F3A] mt-2 text-base">
                      {formatINR(budgetData.maintenance)}
                    </div>
                    <div className="text-[11px] text-[#7C8796] mt-0.5">Routine AMC & Upkeep</div>
                  </div>
                </div>

                {/* Partner Agency Cost (Separate, Clearly Displayed Row) */}
                <div className="p-3.5 rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-[#1769AA] shrink-0" />
                    <div>
                      <span className="font-semibold text-[#0B1F3A]">
                        Partner Agency Cost (Health Dept. Ambulances &amp; EMTs):
                      </span>
                      <span className="text-[#5D6878] ml-1">
                        Separately administered by Department of Health (isolated from police expenditure).
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-[#0B1F3A] text-base shrink-0">
                    {formatINR(budgetData.partnerExpenditure)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 5. OPERATIONAL ALERTS (Spacious Full-Width Card)                 */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-h-[46px]">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                  Operational Alerts
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA]">
                {alerts.length} Active System Alerts
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-xs first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
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
                      <span className="font-bold text-[#0B1F3A]">
                        {al.district} ({al.state}):
                      </span>
                      <span className="text-[#5D6878]">{al.explanation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 px-4 text-center text-xs text-emerald-800 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-center gap-2">
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
