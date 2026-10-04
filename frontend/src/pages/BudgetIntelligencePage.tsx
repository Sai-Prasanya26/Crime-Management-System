import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BadgeDollarSign,
  TrendingUp,
  Building,
  RotateCcw,
  Calendar,
  Layers,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi } from '../api';
import type { TopDistrictsResponse, StateItem } from '../types';

interface DistrictBudgetItem {
  districtName: string;
  stateName: string;
  recommendedUnits: number;
  estimatedCost: number;
  primaryAsset: string;
}

const RESOURCE_UNIT_COSTS: Record<string, { label: string; unitCost: number }> = {
  personnel: { label: 'Police Personnel Standard Unit', unitCost: 650000 }, // ₹6.5L annual per officer
  investigation: { label: 'Investigation Squad Equipment Kit', unitCost: 800000 }, // ₹8.0L
  surveillance: { label: 'Tactical Surveillance Intelligence Node', unitCost: 950000 }, // ₹9.5L
  vehicles: { label: 'Rapid Response Patrol Vehicle', unitCost: 1250000 }, // ₹12.5L
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

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  const { districtBudgetList, totalCost, averageCost, categoryBreakdown } = useMemo(() => {
    const rawItems = topDistricts?.items || [];

    let pUnits = 0, iUnits = 0, sUnits = 0, vUnits = 0;

    const list: DistrictBudgetItem[] = rawItems.map((d, index) => {
      const volume = d.incident_count;
      const p = Math.max(4, Math.round(volume / 120));
      const i = Math.max(1, Math.round(volume / 300));
      const s = Math.max(1, Math.round(volume / 400));
      const v = Math.max(2, Math.round(volume / 180));

      pUnits += p;
      iUnits += i;
      sUnits += s;
      vUnits += v;

      const cost =
        p * RESOURCE_UNIT_COSTS.personnel.unitCost +
        i * RESOURCE_UNIT_COSTS.investigation.unitCost +
        s * RESOURCE_UNIT_COSTS.surveillance.unitCost +
        v * RESOURCE_UNIT_COSTS.vehicles.unitCost;

      const primaryAsset =
        index % 4 === 0
          ? 'Patrol Vehicles'
          : index % 4 === 1
          ? 'Police Personnel'
          : index % 4 === 2
          ? 'Investigation Squads'
          : 'Surveillance Nodes';

      return {
        districtName: d.district_name,
        stateName: d.state_name,
        recommendedUnits: p + i + s + v,
        estimatedCost: cost,
        primaryAsset,
      };
    });

    const sumCost = list.reduce((sum, item) => sum + item.estimatedCost, 0);
    const avgCost = list.length > 0 ? sumCost / list.length : 0;

    const breakdown = [
      {
        resource: 'Patrol Vehicles',
        unitCost: RESOURCE_UNIT_COSTS.vehicles.unitCost,
        units: vUnits,
        totalCost: vUnits * RESOURCE_UNIT_COSTS.vehicles.unitCost,
      },
      {
        resource: 'Police Personnel',
        unitCost: RESOURCE_UNIT_COSTS.personnel.unitCost,
        units: pUnits,
        totalCost: pUnits * RESOURCE_UNIT_COSTS.personnel.unitCost,
      },
      {
        resource: 'Investigation Squads',
        unitCost: RESOURCE_UNIT_COSTS.investigation.unitCost,
        units: iUnits,
        totalCost: iUnits * RESOURCE_UNIT_COSTS.investigation.unitCost,
      },
      {
        resource: 'Surveillance Nodes',
        unitCost: RESOURCE_UNIT_COSTS.surveillance.unitCost,
        units: sUnits,
        totalCost: sUnits * RESOURCE_UNIT_COSTS.surveillance.unitCost,
      },
    ];

    return {
      districtBudgetList: list,
      totalCost: sumCost,
      averageCost: avgCost,
      categoryBreakdown: breakdown,
    };
  }, [topDistricts]);

  return (
    <DashboardLayout
      hideSidebar
      icon={BadgeDollarSign}
      title="Budget Intelligence"
      subtitle="Financial modeling, asset cost breakdown and capital allocation planning"
      onRefresh={() => fetchData(true)}
      isRefreshing={isRefreshing}
    >
      {/* State Filter Toolbar */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 shrink-0 text-center sm:text-left">
              Budget Jurisdiction Scope:
            </span>
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
              }}
              className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-white py-1 px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
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
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Modeling capital allocations and financial requirements..." />
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
          {/* SECTION 1: Budget Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Estimated Capital Requirement
              </span>
              <p className="mt-1 text-2xl font-bold text-[#0A192F]">
                {currencyFormatter.format(totalCost)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Aggregate capital allocation
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Average District Budget
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700">
                  {currencyFormatter.format(averageCost)}
                </span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Mean allocation per jurisdiction
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Jurisdictions Covered
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#0A192F]">
                  {districtBudgetList.length} Districts
                </span>
                <Building className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Highest priority allocations
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Fiscal Window
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  Annual Cycle
                </span>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Capital outlay schedule
              </p>
            </div>
          </div>

          {/* SECTION 2: Resource Cost Breakdown Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Resource Asset Cost Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standardized statutory asset valuation and unit expenditure model
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                INR Benchmarked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                    <th className="py-2.5 pl-3">Resource Asset Category</th>
                    <th className="py-2.5 px-3 text-right">Recommended Units</th>
                    <th className="py-2.5 px-3 text-right">Standard Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Estimated Expenditure</th>
                    <th className="py-2.5 px-3 text-right">Cost Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categoryBreakdown.map((item) => {
                    const share = totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0;
                    return (
                      <tr key={item.resource} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                        <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                          {item.resource}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.units.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {currencyFormatter.format(item.unitCost)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                          {currencyFormatter.format(item.totalCost)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: District Capital Requirements Schedule */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700">
                  <BadgeDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    District Capital Requirements Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparative required capital allocation mapped directly to jurisdictional caseload
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                {districtBudgetList.length} Jurisdictions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                    <th className="py-2.5 pl-3">District</th>
                    <th className="py-2.5 px-3">State / UT</th>
                    <th className="py-2.5 px-3">Primary Required Asset</th>
                    <th className="py-2.5 px-3 text-right">Target Units</th>
                    <th className="py-2.5 px-3 text-right">Estimated Total Outlay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {districtBudgetList.map((item, idx) => (
                    <tr key={`${item.districtName}-${idx}`} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                      <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                        {item.districtName}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.stateName}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium">
                        {item.primaryAsset}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {item.recommendedUnits}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
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
