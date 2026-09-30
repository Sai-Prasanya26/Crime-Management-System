import React, { useEffect, useState, useCallback } from 'react';
import {
  BadgeDollarSign,
  TrendingUp,
  Building,
  RotateCcw,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi } from '../api';
import type { TopDistrictsResponse, StateItem } from '../types';

interface BudgetItem {
  districtName: string;
  stateName: string;
  resource: string;
  recommendedUnits: number;
  unitCost: number;
  estimatedCost: number;
}

const UNIT_COSTS: Record<string, number> = {
  'Mobile Patrol Unit': 1250000, // ₹12.5 Lakhs
  'Investigation Squad Kit': 800000, // ₹8.0 Lakhs
  'Forensic Response Asset': 550000, // ₹5.5 Lakhs
};

export const BudgetIntelligencePage: React.FC = () => {
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);
  const [states, setStates] = useState<StateItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const [districtsRes, statesRes] = await Promise.all([
        analyticsApi.getTopDistricts({ metric: 'volume', limit: 15, state_id: selectedStateId }),
        geographyApi.getStates(),
      ]);
      setTopDistricts(districtsRes);
      setStates(statesRes.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load budget parameters.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const budgetItems: BudgetItem[] = (topDistricts?.items || []).map((d, index) => {
    const volume = d.incident_count;
    let resource = 'Mobile Patrol Unit';
    let units = Math.max(2, Math.round(volume / 100));

    if (index % 3 === 1) {
      resource = 'Investigation Squad Kit';
      units = Math.max(1, Math.round(volume / 200));
    } else if (index % 3 === 2) {
      resource = 'Forensic Response Asset';
      units = Math.max(1, Math.round(volume / 350));
    }

    const unitCost = UNIT_COSTS[resource] || 1000000;
    const estimatedCost = units * unitCost;

    return {
      districtName: d.district_name,
      stateName: d.state_name,
      resource,
      recommendedUnits: units,
      unitCost,
      estimatedCost,
    };
  });

  const totalRequirement = budgetItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const averagePerDistrict =
    budgetItems.length > 0 ? totalRequirement / budgetItems.length : 0;

  return (
    <DashboardLayout
      title="Budget Intelligence"
      subtitle="Financial modeling and estimated capital allocations for operational crime response"
      onRefresh={() => fetchData(true)}
      isRefreshing={isRefreshing}
    >
      {/* State Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA]">
              Budget Scope:
            </span>
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
              }}
              className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States &amp; UTs ({states.length || 36})</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>
          </div>

          {selectedStateId && (
            <button
              onClick={() => setSelectedStateId(undefined)}
              className="inline-flex h-10 items-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Calculating financial cost requirements..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Budget Calculation Error"
          message={error}
          onRetry={() => fetchData()}
        />
      )}

      {!isLoading && !error && topDistricts && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                Estimated Operational Requirement
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] font-bold text-[#0B1F3A]">
                  {currencyFormatter.format(totalRequirement)}
                </span>
                <BadgeDollarSign className="h-4 w-4 text-[#16845B]" />
              </div>
              <span className="text-[11px] text-[#7C8796]">
                Aggregate capital allocation across sample districts
              </span>
            </div>

            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                Monitored Jurisdictions
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] font-bold text-[#1769AA]">
                  {budgetItems.length} Districts
                </span>
                <Building className="h-4 w-4 text-[#1769AA]" />
              </div>
              <span className="text-[11px] text-[#7C8796]">
                Highest incident priority ranking
              </span>
            </div>

            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                Average District Allocation
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] font-bold text-[#0B1F3A]">
                  {currencyFormatter.format(averagePerDistrict)}
                </span>
                <TrendingUp className="h-4 w-4 text-[#C98512]" />
              </div>
              <span className="text-[11px] text-[#7C8796]">
                Mean capital allocation per jurisdiction
              </span>
            </div>
          </div>

          {/* Budget Intelligence Table */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                  <BadgeDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                    Jurisdiction Capital Requirements Schedule
                  </h3>
                  <p className="text-[12px] text-[#5D6878]">
                    Unit costs and financial forecasts mapped to operational load
                  </p>
                </div>
              </div>
              <span className="rounded bg-[#F4F7FA] px-2 py-0.5 text-[11px] font-semibold text-[#5D6878] border border-[#D9E1EA]">
                INR Standardized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
                    <th className="py-2.5 pl-3">District</th>
                    <th className="py-2.5 px-3">State / UT</th>
                    <th className="py-2.5 px-3">Resource Asset</th>
                    <th className="py-2.5 px-3 text-right">Recommended Units</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetItems.map((item, idx) => (
                    <tr key={`${item.districtName}-${idx}`} className="h-11 hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 pl-3 font-semibold text-[#0B1F3A]">
                        {item.districtName}
                      </td>
                      <td className="py-2 px-3 text-[#5D6878]">{item.stateName}</td>
                      <td className="py-2 px-3 text-[#172033] font-medium">{item.resource}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.recommendedUnits}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#5D6878]">
                        {currencyFormatter.format(item.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1769AA]">
                        {currencyFormatter.format(item.estimatedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BudgetIntelligencePage;
