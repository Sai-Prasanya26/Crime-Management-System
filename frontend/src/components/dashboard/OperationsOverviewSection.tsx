import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
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

  // 2. Risk State
  const [riskData, setRiskData] = useState<{
    criticalCount: number;
    highCount: number;
    moderateCount: number;
    lowCount: number;
    totalAssessed: number;
    topCriticalDistricts: Array<{ district: string; state: string; score: number }>;
  }>({
    criticalCount: 0,
    highCount: 0,
    moderateCount: 0,
    lowCount: 0,
    totalAssessed: 0,
    topCriticalDistricts: [],
  });

  // 3. Budget Overview State
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

  // Currency Formatter in INR (₹)
  const formatINR = useCallback((val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return 'Not Available';
    const absVal = Math.abs(val);
    if (absVal === 0) return '₹0';
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
      // Process Risk Assessment
      // -----------------------------------------------------------------------
      let critical = 0;
      let high = 0;
      let moderate = 0;
      let low = 0;
      let totalDistricts = 0;
      const criticalDistricts: Array<{ district: string; state: string; score: number }> = [];

      if (riskRes.status === 'fulfilled') {
        const val = riskRes.value as any;
        if ('risk_level_distribution' in val && val.risk_level_distribution) {
          const dist = val.risk_level_distribution;
          critical = dist.CRITICAL || 0;
          high = dist.HIGH || 0;
          moderate = dist.MODERATE || 0;
          low = dist.LOW || 0;
          totalDistricts = critical + high + moderate + low;

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
          const items = val.items;
          totalDistricts = items.length;
          items.forEach((item: any) => {
            const lvl = (item.risk_level || '').toUpperCase();
            if (lvl === 'CRITICAL') {
              critical++;
              criticalDistricts.push({
                district: item.district_name || 'District',
                state: item.state_name || 'State',
                score: Number(item.overall_risk_score) || 0,
              });
            } else if (lvl === 'HIGH') {
              high++;
            } else if (lvl === 'MODERATE') {
              moderate++;
            } else if (lvl === 'LOW') {
              low++;
            }
          });
        }
      }

      setRiskData({
        criticalCount: critical,
        highCount: high,
        moderateCount: moderate,
        lowCount: low,
        totalAssessed: totalDistricts,
        topCriticalDistricts: criticalDistricts.slice(0, 5),
      });

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
      // Process Operational Alerts (Real backend data only)
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
    <div className="mt-8 pt-5 border-t border-[#D9E1EA] space-y-5">
      {/* ==================================================================== */}
      {/* 1. SECTION HEADER WITH CLEAN NAVIGATION CONTROLS                    */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E1EA] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-blue-50 text-[#1769AA]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B1F3A]">
              Resource Operations Overview
            </h2>
            <div className="text-[11px] text-[#5D6878]">
              Tactical Resource Optimization, Capacity Constraints & Fiscal Intelligence (November 2026)
            </div>
          </div>
        </div>

        {/* Compact Navigation Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1769AA] bg-white border border-[#D9E1EA] rounded hover:bg-blue-50 transition-colors shadow-2xs"
          >
            <span>View Resource Optimization</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/budget"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1769AA] bg-white border border-[#D9E1EA] rounded hover:bg-blue-50 transition-colors shadow-2xs"
          >
            <span>View Budget Intelligence</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1769AA] bg-white border border-[#D9E1EA] rounded hover:bg-blue-50 transition-colors shadow-2xs"
          >
            <span>View Reports</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center text-xs text-[#5D6878]">
          <Activity className="h-5 w-5 text-[#1769AA] animate-spin mx-auto mb-2" />
          Aggregating live operational optimization and fiscal intelligence...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900">
          {error}
        </div>
      ) : (
        <div className="space-y-5">
          {/* ================================================================ */}
          {/* 2. RESOURCE OPTIMIZATION SUMMARY: 4 COMPACT KPI CARDS            */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Resources Required */}
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Resources Required</span>
                <Layers className="h-3.5 w-3.5 text-[#1769AA]" />
              </div>
              <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                {personnelPool ? `${personnelPool.required.toLocaleString()} Officers` : `${activePoolsCount} Active Pools`}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Mobility: {mobilityPool ? `${mobilityPool.required.toLocaleString()} Vehicles` : '—'}</span>
                <span className="font-medium text-blue-700">{activePoolsCount} Pools Active</span>
              </div>
            </div>

            {/* Card 2: Resources Allocated */}
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Resources Allocated</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                {personnelPool ? `${personnelPool.allocated.toLocaleString()} Officers` : 'Allocated'}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Mobility: {mobilityPool ? `${mobilityPool.allocated.toLocaleString()} Vehicles` : '—'}</span>
                <span className="font-semibold text-emerald-700">Recommended Allocation</span>
              </div>
            </div>

            {/* Card 3: Resource Shortages */}
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Resource Shortages</span>
                <AlertTriangle className={`h-3.5 w-3.5 ${poolsWithShortages.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <div className="text-xl font-bold mt-1">
                {poolsWithShortages.length > 0 ? (
                  <span className="text-rose-600">{poolsWithShortages.length} Pools with Shortage</span>
                ) : (
                  <span className="text-emerald-700">0 Shortages</span>
                )}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-1 pt-1 border-t border-slate-100 truncate">
                {poolsWithShortages.length > 0
                  ? `${poolsWithShortages.map((p) => `${p.displayName} (-${p.shortage} ${p.unit})`).join(', ')}`
                  : 'All Standing Resource Pools Met'}
              </div>
            </div>

            {/* Card 4: Critical Risk Districts */}
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Critical Risk Districts</span>
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div className="text-xl font-bold text-red-700 mt-1">
                {riskData.criticalCount} Critical
              </div>
              <div className="text-[11px] text-[#5D6878] mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>{riskData.highCount} High Risk</span>
                <span>{riskData.totalAssessed} Districts Assessed</span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. RESOURCE ALLOCATION ANALYSIS & RECOMMENDATION SUMMARY          */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left: Grouped Bar Chart (Resource Allocation Analysis) */}
            <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1F3A]">
                      Resource Allocation Analysis
                    </h3>
                    <div className="text-[11px] text-[#5D6878]">
                      Comparison of Required, Available and Recommended Allocation across 10 Pools
                    </div>
                  </div>
                  {/* Legend Indicator */}
                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-700">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-2xs bg-[#F59E0B]" />
                      <span>Required</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-2xs bg-[#0B1F3A]" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-2xs bg-[#10B981]" />
                      <span>Allocated</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Grouped Bar Chart */}
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={resourcePools}
                      margin={{ top: 5, right: 20, left: 15, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#5D6878' }}
                        axisLine={{ stroke: '#D9E1EA' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        width={105}
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
                        formatter={(val: any, name: any, item: any) => [
                          `${Number(val).toLocaleString()} ${item.payload.unit}`,
                          name,
                        ]}
                        labelFormatter={(label: any) => {
                          const pool = resourcePools.find((p) => p.displayName === label);
                          return pool ? `${pool.name} (${pool.unit})` : label;
                        }}
                      />
                      <Bar
                        dataKey="required"
                        name="Required"
                        fill="#F59E0B"
                        barSize={6}
                        radius={[0, 2, 2, 0]}
                      />
                      <Bar
                        dataKey="available"
                        name="Available"
                        fill="#0B1F3A"
                        barSize={6}
                        radius={[0, 2, 2, 0]}
                      />
                      <Bar
                        dataKey="allocated"
                        name="Recommended"
                        fill="#10B981"
                        barSize={6}
                        radius={[0, 2, 2, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[10px] text-[#5D6878] mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>* Emergency EMS Ambulances administered under Health Dept. partnership.</span>
                <span>All units strictly evaluated under standing capacity.</span>
              </div>
            </div>

            {/* Right: Recommendation Summary Table */}
            <div className="lg:col-span-5 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h3 className="text-sm font-bold text-[#0B1F3A]">
                    Recommendation Summary
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    10 Standard Pools
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#D9E1EA] text-[10px] font-bold text-[#5D6878] uppercase">
                        <th className="py-1.5 px-1.5">Resource Pool</th>
                        <th className="py-1.5 px-1 text-right">Avail</th>
                        <th className="py-1.5 px-1 text-right">Req</th>
                        <th className="py-1.5 px-1 text-right">Alloc</th>
                        <th className="py-1.5 px-1.5 text-right">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resourcePools.map((p) => (
                        <tr key={p.poolKey} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-1.5 font-medium text-[#0B1F3A]">
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[110px]" title={p.name}>
                                {p.displayName}
                              </span>
                              {p.isPartner && (
                                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                  Health
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-[#5D6878]">{p.unit}</div>
                          </td>
                          <td className="py-1.5 px-1 text-right text-slate-700">
                            {p.available.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-1 text-right font-medium text-slate-800">
                            {p.required.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-1 text-right font-semibold text-emerald-700">
                            {p.allocated.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-1.5 text-right">
                            {p.shortage > 0 ? (
                              <span className="font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded text-[10px]">
                                -{p.shortage.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] flex items-center justify-between text-[#5D6878]">
                <span>Coverage Status:</span>
                <span className="font-semibold text-emerald-700">
                  {poolsWithShortages.length === 0 ? '100% Demand Met (0 Shortages)' : `${poolsWithShortages.length} Shortfalls Identified`}
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 4. BUDGET OVERVIEW SECTION                                       */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  Budget Overview
                </h3>
                <div className="text-[11px] text-[#5D6878]">
                  Police Department Fiscal Analysis & Expenditure Proportions (FY 2026-27)
                </div>
              </div>
              <div className="text-xs text-[#5D6878]">
                Formula: Budget Balance = Available Budget − Total Police Cost
              </div>
            </div>

            {/* 3 Top Budget Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded border border-[#D9E1EA] bg-slate-50/60 p-3">
                <div className="text-[11px] font-bold text-[#5D6878] uppercase">
                  Estimated Police Expenditure
                </div>
                <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                  {formatINR(budgetData.policeExpenditure)}
                </div>
                <div className="text-[10px] text-[#5D6878] mt-1 pt-1 border-t border-slate-200">
                  Gross Police Operational Requirement
                </div>
              </div>

              <div className="rounded border border-[#D9E1EA] bg-slate-50/60 p-3">
                <div className="text-[11px] font-bold text-[#5D6878] uppercase">
                  Available Budget
                </div>
                <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                  {budgetData.hasBudgetConfigured ? formatINR(budgetData.availableBudget) : 'Not Available'}
                </div>
                <div className="text-[10px] text-[#5D6878] mt-1 pt-1 border-t border-slate-200">
                  {budgetData.hasBudgetConfigured ? 'Sanctioned Statutory Allocation' : 'Budget allocation not configured'}
                </div>
              </div>

              <div className="rounded border border-[#D9E1EA] bg-slate-50/60 p-3">
                <div className="text-[11px] font-bold text-[#5D6878] uppercase">
                  Budget Surplus / Deficit
                </div>
                <div className={`text-xl font-bold mt-1 ${
                  !budgetData.hasBudgetConfigured
                    ? 'text-slate-500'
                    : budgetData.balanceStatus === 'SURPLUS'
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}>
                  {!budgetData.hasBudgetConfigured
                    ? 'Not Available'
                    : budgetData.budgetBalance !== null
                    ? (budgetData.budgetBalance >= 0 ? `+${formatINR(budgetData.budgetBalance)} Surplus` : `-${formatINR(Math.abs(budgetData.budgetBalance))} Deficit`)
                    : 'Not Available'}
                </div>
                <div className="text-[10px] text-[#5D6878] mt-1 pt-1 border-t border-slate-200">
                  {!budgetData.hasBudgetConfigured
                    ? 'Financial records pending sanction entry'
                    : budgetData.balanceStatus === 'SURPLUS'
                    ? 'Operating within sanctioned limits'
                    : 'Requires supplementary grant appropriation'}
                </div>
              </div>
            </div>

            {/* Split: Donut Chart (CAPEX / OPEX / Maintenance) + Cost Breakdown + Partner Agency Line */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2">
              {/* Donut Chart (Proportions) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded border border-slate-100 bg-[#F8FAFC]">
                <div className="text-xs font-bold text-[#0B1F3A] mb-1">
                  Expenditure Profile (CAPEX vs OPEX)
                </div>
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
                          innerRadius={45}
                          outerRadius={68}
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
                {/* Proportions Indicator */}
                <div className="flex items-center gap-3 text-[10px] font-semibold mt-1">
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

              {/* Cost Breakdown Cards & Partner Agency Notice */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded border border-slate-100 bg-white">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span>CAPEX (Procurement)</span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {formatINR(budgetData.capex)}
                    </div>
                    <div className="text-[10px] text-[#5D6878]">Equipment & Hardware</div>
                  </div>

                  <div className="p-2.5 rounded border border-slate-100 bg-white">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>OPEX (Operations)</span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {formatINR(budgetData.opex)}
                    </div>
                    <div className="text-[10px] text-[#5D6878]">Staffing & Operational</div>
                  </div>

                  <div className="p-2.5 rounded border border-slate-100 bg-white">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      <span>Maintenance</span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {formatINR(budgetData.maintenance)}
                    </div>
                    <div className="text-[10px] text-[#5D6878]">Fleet & Facility AMC</div>
                  </div>
                </div>

                {/* Partner Agency Strict Isolation Callout */}
                <div className="p-3 rounded border border-amber-200 bg-amber-50/40 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <HeartPulse className="h-3.5 w-3.5 text-amber-700" />
                      <span>Partner Agency Cost (Health Dept. Ambulances & EMTs)</span>
                    </div>
                    <div className="font-bold text-amber-900">
                      {formatINR(budgetData.partnerExpenditure)}
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-800 mt-1">
                    Emergency medical services are separately administered by the Department of Health. Strictly isolated from Police Department expenditure and budget balance calculations.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 5. OPERATIONAL ALERTS PANEL                                       */}
          {/* ================================================================ */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#0B1F3A]">
                Operational Alerts
              </h3>
              <span className="text-[10px] text-[#5D6878]">
                {alerts.length} Active System Alerts
              </span>
            </div>

            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 text-xs first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          al.category === 'CRITICAL RISK'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : al.category === 'RESOURCE SHORTAGE'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : al.category === 'BUDGET DEFICIT'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
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
              <div className="py-3 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded border border-emerald-100 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>All operational resource allocations, risk parameters and budget constraints are within nominal thresholds.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsOverviewSection;
