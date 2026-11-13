import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  Users,
  IndianRupee,
  Activity,
} from 'lucide-react';
import {
  predictionApi,
  riskApi,
  optimizationApi,
  budgetApi,
} from '../../api';
import {
  formatPredictedCount,
  formatPredictionInterval,
} from '../../utils/predictionFormatting';
import type { FilterParams } from '../../types';

interface OperationsOverviewSectionProps {
  filters: FilterParams;
  isRefreshing?: boolean;
}

interface AlertItem {
  id: string;
  district: string;
  state: string;
  category: 'CRITICAL RISK' | 'RESOURCE SHORTAGE' | 'BUDGET DEFICIT';
  explanation: string;
}

export const OperationsOverviewSection: React.FC<OperationsOverviewSectionProps> = ({
  filters,
  isRefreshing,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Predictions State
  const [predictionsData, setPredictionsData] = useState<{
    totalPredicted: number;
    period: string;
    districtsCount: number;
    topDistricts: Array<{
      district_name: string;
      state_name: string;
      predicted_crime_count: number;
      interval_lower: number | null;
      interval_upper: number | null;
    }>;
  }>({
    totalPredicted: 0,
    period: 'November 2026',
    districtsCount: 0,
    topDistricts: [],
  });

  // Risk State
  const [riskData, setRiskData] = useState<{
    distribution: {
      CRITICAL: number;
      HIGH: number;
      MODERATE: number;
      LOW: number;
    };
    meanRiskScore: number | null;
    topDistricts: Array<{
      district_name: string;
      state_name: string;
      overall_risk_score: number;
      risk_level: string;
    }>;
  }>({
    distribution: { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 },
    meanRiskScore: null,
    topDistricts: [],
  });

  // Resource Allocation State (10 Standard Pools)
  const [resourcePools, setResourcePools] = useState<Array<{
    poolKey: string;
    name: string;
    unit: string;
    demand: number;
    allocated: number | null;
    shortage: number;
    isExternal: boolean;
  }>>([]);

  // Budget Overview State
  const [budgetData, setBudgetData] = useState<{
    policeExpenditure: number | null;
    availableBudget: number | null;
    budgetBalance: number | null;
    balanceStatus: 'SURPLUS' | 'DEFICIT' | 'UNAVAILABLE';
    partnerExpenditure: number | null;
    capex: number | null;
    opex: number | null;
    maintenance: number | null;
  }>({
    policeExpenditure: null,
    availableBudget: null,
    budgetBalance: null,
    balanceStatus: 'UNAVAILABLE',
    partnerExpenditure: null,
    capex: null,
    opex: null,
    maintenance: null,
  });

  // Alerts State
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalAlertsCount, setTotalAlertsCount] = useState<number>(0);

  // Currency Formatter
  const formatINR = useCallback((val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '—';
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
      // 1. Fetch Predictions
      const predPromise = predictionApi.getMonthlyPredictions({
        state_id: filters.state_id,
        forecast_period: targetPeriod,
        limit: 1000,
      });

      // 2. Fetch Risk
      const riskPromise = filters.state_id || filters.district_id
        ? riskApi.listRiskScores({
            state_id: filters.state_id,
            district_id: filters.district_id,
            assessment_period: targetPeriod,
            limit: 1000,
          })
        : riskApi.getOverview(targetPeriod);

      // 3. Fetch Optimization Overview
      const optPromise = optimizationApi.getOverview();

      // 4. Fetch Budget
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

      const [predRes, riskRes, optRes, budgetRes] = await Promise.allSettled([
        predPromise,
        riskPromise,
        optPromise,
        budgetPromise,
      ]);

      // -------------------------------------------------------------
      // Process Predictions
      // -------------------------------------------------------------
      if (predRes.status === 'fulfilled') {
        let items = predRes.value.items || [];
        if (filters.district_id) {
          items = items.filter((x) => x.district_id === filters.district_id);
        }
        const total = items.reduce(
          (acc, cur) => acc + (Number(cur.predicted_crime_count) || 0),
          0
        );
        const distinctDistricts = new Set(items.map((x) => x.district_id)).size;
        const sorted = [...items]
          .sort(
            (a, b) =>
              (Number(b.predicted_crime_count) || 0) -
              (Number(a.predicted_crime_count) || 0)
          )
          .slice(0, 5)
          .map((d) => ({
            district_name: d.district_name || 'District',
            state_name: d.state_name || 'State',
            predicted_crime_count: Number(d.predicted_crime_count) || 0,
            interval_lower: d.prediction_interval_lower ?? null,
            interval_upper: d.prediction_interval_upper ?? null,
          }));

        setPredictionsData({
          totalPredicted: total,
          period: 'November 2026',
          districtsCount: distinctDistricts,
          topDistricts: sorted,
        });
      }

      // -------------------------------------------------------------
      // Process Risk
      // -------------------------------------------------------------
      const compiledCriticalDistricts: Array<{
        district_name: string;
        state_name: string;
        overall_risk_score: number;
        risk_level: string;
      }> = [];

      if (riskRes.status === 'fulfilled') {
        const val = riskRes.value as any;
        if ('risk_level_distribution' in val && val.risk_level_distribution) {
          const dist = val.risk_level_distribution;
          const meanScore = val.mean_risk_score ?? 50.0;
          const top5 = (val.top_risk_districts || []).slice(0, 5).map((d: any) => ({
            district_name: d.district_name || 'District',
            state_name: d.state_name || 'State',
            overall_risk_score: Number(d.overall_risk_score) || 0,
            risk_level: d.risk_level || 'HIGH',
          }));
          setRiskData({
            distribution: {
              CRITICAL: dist.CRITICAL || 0,
              HIGH: dist.HIGH || 0,
              MODERATE: dist.MODERATE || 0,
              LOW: dist.LOW || 0,
            },
            meanRiskScore: Number(meanScore) || 50.0,
            topDistricts: top5,
          });
          (val.top_risk_districts || [])
            .filter((d: any) => d.risk_level === 'CRITICAL')
            .forEach((d: any) => {
              compiledCriticalDistricts.push({
                district_name: d.district_name || 'District',
                state_name: d.state_name || 'State',
                overall_risk_score: Number(d.overall_risk_score) || 0,
                risk_level: 'CRITICAL',
              });
            });
        } else if ('items' in val && Array.isArray(val.items)) {
          const items = val.items;
          const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
          let totalScore = 0;
          items.forEach((item: any) => {
            const lvl = (item.risk_level || '').toUpperCase() as keyof typeof counts;
            if (counts[lvl] !== undefined) counts[lvl]++;
            const sc = Number(item.overall_risk_score) || 0;
            totalScore += sc;
            if (lvl === 'CRITICAL') {
              compiledCriticalDistricts.push({
                district_name: item.district_name || 'District',
                state_name: item.state_name || 'State',
                overall_risk_score: sc,
                risk_level: 'CRITICAL',
              });
            }
          });
          const meanScore = items.length > 0 ? totalScore / items.length : null;
          const top5 = [...items]
            .sort((a: any, b: any) => (b.overall_risk_score || 0) - (a.overall_risk_score || 0))
            .slice(0, 5)
            .map((d: any) => ({
              district_name: d.district_name || 'District',
              state_name: d.state_name || 'State',
              overall_risk_score: Number(d.overall_risk_score) || 0,
              risk_level: d.risk_level || 'HIGH',
            }));
          setRiskData({
            distribution: counts,
            meanRiskScore: meanScore,
            topDistricts: top5,
          });
        }
      }

      // -------------------------------------------------------------
      // Process Resource Pools (Consistent Optimization Scope)
      // -------------------------------------------------------------
      const compiledShortages: Array<{ pool: string; shortage: number; unit: string; state: string }> = [];

      if (optRes.status === 'fulfilled' && optRes.value?.recent_runs?.length > 0) {
        const run = optRes.value.recent_runs[0];
        if (run.constraints_applied) {
          const applied = run.constraints_applied as Record<string, any>;
          const pools = Object.entries(applied).map(([k, c]) => {
            const shortage = Number(c.unmet_demand) || 0;
            if (shortage > 0) {
              compiledShortages.push({
                pool: c.resource_name || k,
                shortage,
                unit: c.unit_of_measure || 'Units',
                state: run.state_name || 'All India',
              });
            }
            return {
              poolKey: k,
              name: c.resource_name || k,
              unit: c.unit_of_measure || 'Units',
              demand: Number(c.demand) || 0,
              allocated: c.allocated !== undefined && c.allocated !== null ? Number(c.allocated) : null,
              shortage,
              isExternal: Boolean(c.is_external_partner),
            };
          });
          setResourcePools(pools);
        }
      } else if (filters.district_id && budgetRes.status === 'fulfilled') {
        const b = budgetRes.value as any;
        if (b.pool_breakdown && Array.isArray(b.pool_breakdown)) {
          const pools = b.pool_breakdown.map((p: any) => {
            const demand = Number(p.recommended_units) || 0;
            const shortage = Number(p.procurement_units) || 0;
            const allocated = Math.max(0, demand - shortage);
            if (shortage > 0) {
              compiledShortages.push({
                pool: p.resource_name || p.resource_category,
                shortage,
                unit: p.unit_of_measure || 'Units',
                state: b.state_name || 'State',
              });
            }
            return {
              poolKey: p.resource_category,
              name: p.resource_name || p.resource_category,
              unit: p.unit_of_measure || 'Units',
              demand,
              allocated,
              shortage,
              isExternal: Boolean(p.is_partner_agency),
            };
          });
          setResourcePools(pools);
        }
      }

      // -------------------------------------------------------------
      // Process Budget Overview
      // -------------------------------------------------------------
      let budgetGap = 0;
      let isDeficit = false;

      if (budgetRes.status === 'fulfilled') {
        const b = budgetRes.value as any;

        if (filters.district_id && 'pool_breakdown' in b) {
          const policeCost = b.total_police_budget_requirement ?? b.total_estimated_requirement ?? null;
          const avail = b.configured_budget ?? null;
          const gap = b.budget_gap_or_surplus ?? null;
          budgetGap = gap || 0;
          isDeficit = (gap !== null && gap < 0);

          let status: 'SURPLUS' | 'DEFICIT' | 'UNAVAILABLE' = 'UNAVAILABLE';
          if (avail !== null && gap !== null) {
            status = gap >= 0 ? 'SURPLUS' : 'DEFICIT';
          }

          setBudgetData({
            policeExpenditure: policeCost,
            availableBudget: avail,
            budgetBalance: gap,
            balanceStatus: status,
            partnerExpenditure: b.total_partner_agency_cost ?? null,
            capex: b.total_capex_procurement ?? null,
            opex: b.total_opex_annual ?? null,
            maintenance: b.total_maintenance_annual ?? null,
          });
        } else {
          const policeCost = b.total_police_budget_requirement ?? null;
          const avail = b.total_configured_state_budget ?? null;
          const gap = b.total_budget_gap_or_surplus ?? null;
          budgetGap = gap || 0;
          isDeficit = (gap !== null && gap < 0);

          let status: 'SURPLUS' | 'DEFICIT' | 'UNAVAILABLE' = 'UNAVAILABLE';
          if (avail !== null && gap !== null) {
            status = gap >= 0 ? 'SURPLUS' : 'DEFICIT';
          }

          setBudgetData({
            policeExpenditure: policeCost,
            availableBudget: avail,
            budgetBalance: gap,
            balanceStatus: status,
            partnerExpenditure: b.total_partner_agency_cost ?? null,
            capex: b.total_capex_procurement ?? null,
            opex: b.total_opex_annual ?? null,
            maintenance: b.total_maintenance_annual ?? null,
          });
        }
      }

      // -------------------------------------------------------------
      // Operational Alerts (Top 3 Priority Genuine Alerts)
      // -------------------------------------------------------------
      const compiledAlerts: AlertItem[] = [];

      const seenCritical = new Set<string>();
      const uniqueCriticalDistricts = compiledCriticalDistricts.filter((d) => {
        const key = `${d.district_name}-${d.state_name}`;
        if (seenCritical.has(key)) return false;
        seenCritical.add(key);
        return true;
      });

      uniqueCriticalDistricts.forEach((d, idx) => {
        compiledAlerts.push({
          id: `crit-${idx}-${d.district_name}`,
          district: d.district_name,
          state: d.state_name,
          category: 'CRITICAL RISK',
          explanation: `Risk score ${d.overall_risk_score.toFixed(1)} / 100 exceeds critical threshold (≥65.0).`,
        });
      });

      compiledShortages.forEach((s, idx) => {
        compiledAlerts.push({
          id: `short-${idx}-${s.pool}`,
          district: s.state === 'All India' ? 'National Deployment Pool' : 'Statewide Pool',
          state: s.state,
          category: 'RESOURCE SHORTAGE',
          explanation: `${s.pool} has an unmet shortfall of ${s.shortage.toLocaleString()} ${s.unit}.`,
        });
      });

      if (isDeficit) {
        compiledAlerts.push({
          id: 'bgt-deficit-main',
          district: filters.district_id
            ? 'District Contingency'
            : filters.state_id
            ? 'State Allocation'
            : 'National Police Accounts',
          state: filters.district_id
            ? (predictionsData.topDistricts[0]?.district_name || 'District')
            : filters.state_id
            ? (predictionsData.topDistricts[0]?.state_name || 'State')
            : 'All India',
          category: 'BUDGET DEFICIT',
          explanation: `Operating deficit of ${formatINR(Math.abs(budgetGap))}.`,
        });
      }

      setTotalAlertsCount(compiledAlerts.length);
      setAlerts(compiledAlerts.slice(0, 3));
    } catch (err: any) {
      console.error('Failed to load operations overview:', err);
      setError(err?.message || 'Failed to load operations overview.');
    } finally {
      setLoading(false);
    }
  }, [filters, formatINR]);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData, isRefreshing]);

  // Derived metrics
  const poolsWithShortages = useMemo(
    () => resourcePools.filter((p) => p.shortage > 0).length,
    [resourcePools]
  );
  const firstShortagePool = useMemo(
    () => resourcePools.find((p) => p.shortage > 0) || null,
    [resourcePools]
  );

  const totalRiskDistricts = useMemo(() => {
    const d = riskData.distribution;
    return d.CRITICAL + d.HIGH + d.MODERATE + d.LOW;
  }, [riskData.distribution]);

  return (
    <div className="mt-8 pt-5 border-t border-[#D9E1EA] space-y-5">
      {/* ================================================================== */}
      {/* Main Section Header                                                */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#1769AA]" />
          <h2 className="text-sm font-bold text-[#0B1F3A]">
            Operations Overview
          </h2>
        </div>
        <span className="text-xs text-[#5D6878]">
          November 2026
        </span>
      </div>

      {loading && !predictionsData.districtsCount ? (
        <div className="rounded border border-[#D9E1EA] bg-white p-5 text-center text-xs text-[#5D6878]">
          Loading operations data...
        </div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          {error}
        </div>
      ) : (
        <div className="space-y-5">
          {/* ================================================================ */}
          {/* A. Summary (Four Small KPI Cards)                                 */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Predicted Crimes */}
            <div className="rounded border border-[#D9E1EA] bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Predicted Crimes</span>
                <TrendingUp className="h-3.5 w-3.5 text-[#1769AA]" />
              </div>
              <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                {formatPredictedCount(predictionsData.totalPredicted)}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-0.5">
                November 2026
              </div>
            </div>

            {/* Card 2: Critical Risk Districts */}
            <div className="rounded border border-[#D9E1EA] bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Critical Risk Districts</span>
                <ShieldAlert className="h-3.5 w-3.5 text-[#DC2626]" />
              </div>
              <div className="text-xl font-bold text-red-700 mt-1">
                {riskData.distribution.CRITICAL}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-0.5">
                Score ≥ 65.0
              </div>
            </div>

            {/* Card 3: Resource Shortages */}
            <div className="rounded border border-[#D9E1EA] bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Resource Shortages</span>
                <Users className="h-3.5 w-3.5 text-[#1769AA]" />
              </div>
              <div className="text-xl font-bold mt-1">
                {poolsWithShortages > 0 ? (
                  <span className="text-amber-700">{poolsWithShortages} {poolsWithShortages === 1 ? 'Pool' : 'Pools'}</span>
                ) : (
                  <span className="text-emerald-700">0</span>
                )}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-0.5 truncate">
                {firstShortagePool
                  ? `${firstShortagePool.name}`
                  : 'All Pools Met'}
              </div>
            </div>

            {/* Card 4: Police Expenditure */}
            <div className="rounded border border-[#D9E1EA] bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878]">
                <span>Police Expenditure</span>
                <IndianRupee className="h-3.5 w-3.5 text-[#1769AA]" />
              </div>
              <div className="text-xl font-bold text-[#0B1F3A] mt-1">
                {formatINR(budgetData.policeExpenditure)}
              </div>
              <div className="text-[11px] text-[#5D6878] mt-0.5">
                {budgetData.budgetBalance !== null
                  ? (budgetData.budgetBalance >= 0
                      ? `+${formatINR(budgetData.budgetBalance)} Surplus`
                      : `-${formatINR(Math.abs(budgetData.budgetBalance))} Deficit`)
                  : 'FY 2026'}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* B. Crime Predictions                                               */}
          {/* ================================================================ */}
          <div className="border-t border-[#D9E1EA] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1F3A]">Crime Predictions</h3>
              <span className="text-xs text-[#5D6878]">
                {predictionsData.period} · {formatPredictedCount(predictionsData.totalPredicted)} Predicted ({predictionsData.districtsCount} Districts)
              </span>
            </div>

            <div className="border border-[#D9E1EA] rounded overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[10px] font-bold text-[#5D6878] uppercase border-b border-[#D9E1EA]">
                  <tr>
                    <th className="px-3 py-1.5">District</th>
                    <th className="px-3 py-1.5">State</th>
                    <th className="px-3 py-1.5 text-right">Predicted Crimes</th>
                    <th className="px-3 py-1.5 text-right">80% Interval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {predictionsData.topDistricts.slice(0, 5).map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-medium text-[#0B1F3A]">{d.district_name}</td>
                      <td className="px-3 py-1.5 text-[#5D6878]">{d.state_name}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-[#0B1F3A]">
                        {formatPredictedCount(d.predicted_crime_count)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-[#5D6878]">
                        {formatPredictionInterval(d.interval_lower, d.interval_upper)}
                      </td>
                    </tr>
                  ))}
                  {predictionsData.topDistricts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-[#5D6878]">
                        No predictions available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================ */}
          {/* C. Crime Risk Assessment                                           */}
          {/* ================================================================ */}
          <div className="border-t border-[#D9E1EA] pt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <h3 className="text-sm font-bold text-[#0B1F3A]">Crime Risk Assessment</h3>
              <div className="flex items-center gap-3 text-[11px] text-[#5D6878] flex-wrap">
                <span>Critical (≥65): <strong className="text-red-700">{riskData.distribution.CRITICAL}</strong></span>
                <span>High (50–64.9): <strong className="text-amber-700">{riskData.distribution.HIGH}</strong></span>
                <span>Moderate (35–49.9): <strong className="text-blue-700">{riskData.distribution.MODERATE}</strong></span>
                <span>Low (&lt;35): <strong className="text-emerald-700">{riskData.distribution.LOW}</strong></span>
              </div>
            </div>

            {/* Thin Horizontal Distribution Bar */}
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-100 border border-[#D9E1EA]">
              {totalRiskDistricts > 0 ? (
                <>
                  <div
                    className="bg-red-600 h-full"
                    style={{ width: `${(riskData.distribution.CRITICAL / totalRiskDistricts) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(riskData.distribution.HIGH / totalRiskDistricts) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${(riskData.distribution.MODERATE / totalRiskDistricts) * 100}%` }}
                  />
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${(riskData.distribution.LOW / totalRiskDistricts) * 100}%` }}
                  />
                </>
              ) : (
                <div className="bg-slate-300 w-full h-full" />
              )}
            </div>

            {/* Compact Top-5 Risk Table */}
            <div className="border border-[#D9E1EA] rounded overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[10px] font-bold text-[#5D6878] uppercase border-b border-[#D9E1EA]">
                  <tr>
                    <th className="px-3 py-1.5">District</th>
                    <th className="px-3 py-1.5">State</th>
                    <th className="px-3 py-1.5 text-right">Risk Score</th>
                    <th className="px-3 py-1.5 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {riskData.topDistricts.slice(0, 5).map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-medium text-[#0B1F3A]">{d.district_name}</td>
                      <td className="px-3 py-1.5 text-[#5D6878]">{d.state_name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-800">
                        {d.overall_risk_score.toFixed(1)} / 100
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        <span className={
                          d.risk_level === 'CRITICAL'
                            ? 'text-red-700'
                            : d.risk_level === 'HIGH'
                            ? 'text-amber-700'
                            : d.risk_level === 'MODERATE'
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }>
                          {d.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {riskData.topDistricts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-[#5D6878]">
                        No risk records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================ */}
          {/* D. Resource Allocation                                             */}
          {/* ================================================================ */}
          <div className="border-t border-[#D9E1EA] pt-4 space-y-2">
            <h3 className="text-sm font-bold text-[#0B1F3A]">Resource Allocation</h3>

            <div className="border border-[#D9E1EA] rounded overflow-x-auto bg-white">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-[#F8FAFC] text-[10px] font-bold text-[#5D6878] uppercase border-b border-[#D9E1EA]">
                  <tr>
                    <th className="px-3 py-1.5 min-w-[220px]">Resource Pool</th>
                    <th className="px-3 py-1.5 text-right">Required</th>
                    <th className="px-3 py-1.5 text-right">Allocated</th>
                    <th className="px-3 py-1.5 text-right">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {resourcePools.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-medium text-[#0B1F3A]">
                        {p.name} <span className="text-[10px] font-normal text-[#5D6878]">({p.unit})</span>
                        {p.isExternal && (
                          <span className="ml-1.5 text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                            Health Dept.
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-800">
                        {p.demand.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-slate-800">
                        {p.allocated !== null ? p.allocated.toLocaleString() : 'Not Available'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {p.shortage > 0 ? (
                          <span className="font-bold text-red-600">
                            -{p.shortage.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {resourcePools.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-[#5D6878]">
                        Resource allocations not available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================ */}
          {/* E. Budget Overview                                                */}
          {/* ================================================================ */}
          <div className="border-t border-[#D9E1EA] pt-4 space-y-2">
            <h3 className="text-sm font-bold text-[#0B1F3A]">Budget Overview</h3>

            {/* Three Compact Primary Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#D9E1EA] rounded p-2.5 shadow-2xs">
                <div className="text-[10px] font-bold text-[#5D6878] uppercase">Police Expenditure</div>
                <div className="text-sm font-bold text-[#0B1F3A] mt-0.5">{formatINR(budgetData.policeExpenditure)}</div>
              </div>
              <div className="bg-white border border-[#D9E1EA] rounded p-2.5 shadow-2xs">
                <div className="text-[10px] font-bold text-[#5D6878] uppercase">Available Budget</div>
                <div className="text-sm font-bold text-[#0B1F3A] mt-0.5">
                  {budgetData.availableBudget !== null ? formatINR(budgetData.availableBudget) : '—'}
                </div>
              </div>
              <div className="bg-white border border-[#D9E1EA] rounded p-2.5 shadow-2xs">
                <div className="text-[10px] font-bold text-[#5D6878] uppercase">Surplus / Deficit</div>
                <div className={`text-sm font-bold mt-0.5 ${
                  budgetData.balanceStatus === 'SURPLUS'
                    ? 'text-emerald-700'
                    : budgetData.balanceStatus === 'DEFICIT'
                    ? 'text-red-700'
                    : 'text-slate-700'
                }`}>
                  {budgetData.budgetBalance !== null
                    ? (budgetData.budgetBalance >= 0 ? `+${formatINR(budgetData.budgetBalance)} Surplus` : `-${formatINR(Math.abs(budgetData.budgetBalance))} Deficit`)
                    : '—'}
                </div>
              </div>
            </div>

            {/* Simple Inline Cost Breakdown & Partner Line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-[#5D6878] bg-[#F8FAFC] border border-[#D9E1EA] rounded px-3 py-1.5">
              <div className="flex items-center gap-3">
                <span>CAPEX: <strong className="text-slate-800">{formatINR(budgetData.capex)}</strong></span>
                <span>·</span>
                <span>OPEX: <strong className="text-slate-800">{formatINR(budgetData.opex)}</strong></span>
                <span>·</span>
                <span>Maintenance: <strong className="text-slate-800">{formatINR(budgetData.maintenance)}</strong></span>
              </div>
              <div>
                <span>Partner Agency (Health Dept. EMT): <strong className="text-slate-800">{formatINR(budgetData.partnerExpenditure)}</strong></span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* F. Operational Alerts                                             */}
          {/* ================================================================ */}
          <div className="border-t border-[#D9E1EA] pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1F3A]">Operational Alerts</h3>
              {totalAlertsCount > 3 && (
                <div className="text-[11px] text-[#5D6878]">
                  +{totalAlertsCount - 3} more alerts in{' '}
                  <Link to="/risk" className="text-[#1769AA] hover:underline">Risk Assessment</Link> and{' '}
                  <Link to="/resources" className="text-[#1769AA] hover:underline">Resource Optimization</Link>.
                </div>
              )}
            </div>

            {alerts.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-[#D9E1EA] rounded bg-white p-2">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex items-center gap-2 py-1 text-xs first:pt-0 last:pb-0"
                  >
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                        al.category === 'CRITICAL RISK'
                          ? 'bg-red-100 text-red-800'
                          : al.category === 'RESOURCE SHORTAGE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {al.category}
                    </span>
                    <span className="font-medium text-[#0B1F3A] shrink-0">
                      {al.district} ({al.state}):
                    </span>
                    <span className="text-[#5D6878] truncate">{al.explanation}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-[#5D6878]">
                No active operational alerts.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsOverviewSection;
