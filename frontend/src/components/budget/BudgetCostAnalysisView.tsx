import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import { budgetApi, geographyApi } from '../../api';
import type {
  StateItem,
  DistrictItem,
  DistrictBudgetSummaryItem,
} from '../../types';

export interface BudgetCostAnalysisViewProps {
  states?: StateItem[];
  selectedStateId?: number;
  onStateSelect?: (stateId: number | undefined) => void;
  initialDistrictId?: number;
  initialPeriod?: string;
}

export const BudgetCostAnalysisView: React.FC<BudgetCostAnalysisViewProps> = ({
  states: propStates = [],
  selectedStateId,
  onStateSelect,
  initialDistrictId,
  initialPeriod,
}) => {
  // State / UT
  const [internalStates, setInternalStates] = useState<StateItem[]>(propStates);
  const [optStateId, setOptStateId] = useState<number>(selectedStateId || 2); // Default Andhra Pradesh (ID 2)

  // Districts for selected State
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [isDistrictsLoading, setIsDistrictsLoading] = useState<boolean>(false);
  const [activeDistrictId, setActiveDistrictId] = useState<number | null>(initialDistrictId || null);

  // Period Selector (defaults to 2026-11-01)
  const [assessmentPeriod, setAssessmentPeriod] = useState<string>(initialPeriod || '2026-11-01');

  // Parse Year and Month
  const { periodYear, periodMonth } = useMemo(() => {
    try {
      const parts = assessmentPeriod.split('-');
      return {
        periodYear: parseInt(parts[0], 10) || 2026,
        periodMonth: parseInt(parts[1], 10) || 11,
      };
    } catch {
      return { periodYear: 2026, periodMonth: 11 };
    }
  }, [assessmentPeriod]);

  // Budget data for active district
  const [budgetData, setBudgetData] = useState<DistrictBudgetSummaryItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize internalStates with propStates
  useEffect(() => {
    if (propStates && propStates.length > 0) {
      setInternalStates(propStates);
    } else {
      geographyApi
        .getStates()
        .then((res) => {
          if (res?.items) setInternalStates(res.items);
        })
        .catch((err) => {
          console.error('Failed to load fallback states:', err);
        });
    }
  }, [propStates]);

  // Synchronize selectedStateId from parent
  useEffect(() => {
    if (selectedStateId && selectedStateId !== optStateId) {
      setOptStateId(selectedStateId);
      setActiveDistrictId(null);
    }
  }, [selectedStateId, optStateId]);

  // Synchronize initialDistrictId
  useEffect(() => {
    if (initialDistrictId && activeDistrictId !== initialDistrictId) {
      setActiveDistrictId(initialDistrictId);
    }
  }, [initialDistrictId, activeDistrictId]);

  // Load districts whenever optStateId changes
  const loadDistricts = useCallback(async (stateId: number) => {
    setIsDistrictsLoading(true);
    try {
      const res = await geographyApi.getDistricts(stateId, 'current');
      const items = res?.items || [];
      items.sort((a, b) => a.district_name.localeCompare(b.district_name));
      setDistricts(items);

      if (items.length > 0) {
        setActiveDistrictId((prev) => {
          if (prev && items.some((d) => d.id === prev)) {
            return prev;
          }
          return items[0].id;
        });
      } else {
        setActiveDistrictId(null);
      }
    } catch (err: any) {
      console.error('Failed to load districts for state:', err);
    } finally {
      setIsDistrictsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (optStateId) {
      loadDistricts(optStateId);
    }
  }, [optStateId, loadDistricts]);

  // Load district budget detail
  const loadDistrictBudget = useCallback(async () => {
    if (!activeDistrictId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await budgetApi.getDistrictBudgetDetail(activeDistrictId, {
        year: periodYear,
        month: periodMonth,
      });
      setBudgetData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load district budget data.');
    } finally {
      setIsLoading(false);
    }
  }, [activeDistrictId, periodYear, periodMonth]);

  useEffect(() => {
    loadDistrictBudget();
  }, [loadDistrictBudget]);

  // Currency Formatter in INR (₹)
  const formatINR = useCallback((val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const absVal = Math.abs(val);
    if (absVal === 0) return '₹0';
    if (absVal >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  }, []);

  // Filter only resources required by current optimization result
  const {
    policePools,
    partnerPools,
    policeAcquisitionTotal,
    policeOperatingTotal,
    partnerAcquisitionTotal,
    partnerOperatingTotal,
  } = useMemo(() => {
    if (!budgetData?.pool_breakdown) {
      return {
        policePools: [],
        partnerPools: [],
        policeAcquisitionTotal: 0,
        policeOperatingTotal: 0,
        partnerAcquisitionTotal: 0,
        partnerOperatingTotal: 0,
      };
    }
    const police = budgetData.pool_breakdown.filter(
      (p) => !p.is_partner_agency && (p.recommended_units > 0 || p.total_annual_requirement > 0)
    );
    const partner = budgetData.pool_breakdown.filter(
      (p) => p.is_partner_agency && (p.recommended_units > 0 || p.total_annual_requirement > 0)
    );

    const policeAcq = police.reduce((sum, p) => sum + (p.total_acquisition_cost || 0), 0);
    const policeOps = police.reduce(
      (sum, p) => sum + ((p.annual_operating_cost || 0) + (p.annual_maintenance_cost || 0)),
      0
    );

    const partnerAcq = partner.reduce((sum, p) => sum + (p.total_acquisition_cost || 0), 0);
    const partnerOps = partner.reduce(
      (sum, p) => sum + ((p.annual_operating_cost || 0) + (p.annual_maintenance_cost || 0)),
      0
    );

    return {
      policePools: police,
      partnerPools: partner,
      policeAcquisitionTotal: policeAcq,
      policeOperatingTotal: policeOps,
      partnerAcquisitionTotal: partnerAcq,
      partnerOperatingTotal: partnerOps,
    };
  }, [budgetData?.pool_breakdown]);

  // CAPEX vs OPEX Calculations (12-Month Annual Horizon)
  const { capexTotal, opexTotal, capexPct, opexPct } = useMemo(() => {
    if (!budgetData) {
      return { capexTotal: 0, opexTotal: 0, capexPct: 0, opexPct: 0 };
    }
    const capex = budgetData.total_capex_procurement || 0;
    const opex = (budgetData.total_opex_annual || 0) + (budgetData.total_maintenance_annual || 0);
    const combined = capex + opex;
    if (combined <= 0) {
      return { capexTotal: capex, opexTotal: opex, capexPct: 0, opexPct: 0 };
    }
    return {
      capexTotal: capex,
      opexTotal: opex,
      capexPct: (capex / combined) * 100,
      opexPct: (opex / combined) * 100,
    };
  }, [budgetData]);

  return (
    <div className="space-y-3">
      {/* ==================================================================== */}
      {/* 1. SELECTION TOOLBAR: STATE, DISTRICT, PERIOD, REFRESH                */}
      {/* ==================================================================== */}
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* State Selection */}
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">State/UT:</label>
              <select
                value={optStateId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setOptStateId(newId);
                  onStateSelect?.(newId);
                  setActiveDistrictId(null);
                }}
                className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                {internalStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">District:</label>
              <select
                value={activeDistrictId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setActiveDistrictId(val);
                }}
                disabled={isDistrictsLoading || districts.length === 0}
                className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden max-w-[220px]"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assessment Period */}
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">Period:</label>
              <select
                value={assessmentPeriod}
                onChange={(e) => setAssessmentPeriod(e.target.value)}
                className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="2026-11-01">November 2026</option>
                <option value="2026-12-01">December 2026</option>
                <option value="2027-01-01">January 2027</option>
                <option value="2027-02-01">February 2027</option>
                <option value="2027-03-01">March 2027</option>
                <option value="2027-04-01">April 2027</option>
              </select>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={loadDistrictBudget}
            disabled={isLoading || !activeDistrictId}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh budget data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Loading budget calculations..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Error Loading Budget Data"
          message={error}
          onRetry={loadDistrictBudget}
        />
      )}

      {!isLoading && !error && budgetData && (
        <>
          {/* ================================================================== */}
          {/* 2. TOP SUMMARY: 3 COMPACT CARDS                                    */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1 – Estimated Cost */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Estimated Cost</div>
              <div className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                {formatINR(budgetData.total_police_budget_requirement)}
              </div>
              <div className="mt-1 flex items-center justify-between text-2xs text-slate-500 border-t border-slate-100 pt-1">
                <span>Partner Agency: {formatINR(budgetData.total_partner_agency_cost)}</span>
                <span>Combined: {formatINR(budgetData.total_estimated_requirement)}</span>
              </div>
            </div>

            {/* Card 2 – Available Budget */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Available Budget</div>
              <div className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                {budgetData.configured_budget != null
                  ? formatINR(budgetData.configured_budget)
                  : 'Not Available'}
              </div>
              <div className="mt-1 text-2xs text-slate-400 border-t border-slate-100 pt-1">
                {budgetData.configured_budget != null ? 'Sanctioned allocation' : '—'}
              </div>
            </div>

            {/* Card 3 – Budget Balance */}
            {(() => {
              const hasBudget = budgetData.configured_budget != null;
              const balance = hasBudget
                ? budgetData.configured_budget! - budgetData.total_police_budget_requirement
                : null;
              const isSurplus = balance !== null && balance >= 0;

              return (
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="text-xs font-semibold text-slate-500">Budget Balance</div>
                  <div
                    className={`mt-1 text-xl font-bold tracking-tight ${
                      !hasBudget ? 'text-slate-500' : isSurplus ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {!hasBudget
                      ? 'Cannot Calculate'
                      : isSurplus
                      ? `+${formatINR(balance!)}`
                      : `-${formatINR(Math.abs(balance!))}`}
                  </div>
                  <div className="mt-1 text-2xs text-slate-500 border-t border-slate-100 pt-1 truncate">
                    {!hasBudget
                      ? 'Budget data is unavailable for this district and year.'
                      : isSurplus
                      ? 'Surplus'
                      : 'Deficit'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ================================================================== */}
          {/* 3. RESOURCE-WISE COST BREAKDOWN TABLE                              */}
          {/* ================================================================== */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="border-b border-slate-200 px-3.5 py-2.5">
              <h3 className="text-sm font-semibold text-slate-900">Resource-wise Cost Breakdown</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2 px-3">Resource</th>
                    <th className="py-2 px-3 text-center">Quantity</th>
                    <th className="py-2 px-3 text-right">Acquisition Cost</th>
                    <th className="py-2 px-3 text-right">Operating Cost</th>
                    <th className="py-2 px-3 text-right">Total Estimated Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policePools.length === 0 && partnerPools.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No resources required for the current incident forecast.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Police Department Resource Pools */}
                      {policePools.map((pool) => {
                        const opsCost =
                          (pool.annual_operating_cost || 0) + (pool.annual_maintenance_cost || 0);

                        return (
                          <tr key={pool.resource_category} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {pool.resource_name}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700">
                              {pool.recommended_units} {pool.unit_of_measure}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatINR(pool.total_acquisition_cost)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatINR(opsCost)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {formatINR(pool.total_annual_requirement)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Subtotal Police Requirement */}
                      {policePools.length > 0 && (
                        <tr className="bg-slate-50 font-semibold border-t border-slate-200 text-slate-800">
                          <td className="py-2 px-3">Police Department Subtotal</td>
                          <td className="py-2 px-3 text-center">—</td>
                          <td className="py-2 px-3 text-right">{formatINR(policeAcquisitionTotal)}</td>
                          <td className="py-2 px-3 text-right">{formatINR(policeOperatingTotal)}</td>
                          <td className="py-2 px-3 text-right text-blue-700 font-bold">
                            {formatINR(budgetData.total_police_budget_requirement)}
                          </td>
                        </tr>
                      )}

                      {/* Partner Agency Header / Divider */}
                      {partnerPools.length > 0 && (
                        <tr className="bg-amber-50/40 border-t border-amber-100">
                          <td
                            colSpan={5}
                            className="py-1.5 px-3 font-semibold text-amber-900 text-2xs uppercase tracking-wider"
                          >
                            Partner Agency Resources
                          </td>
                        </tr>
                      )}

                      {/* Partner Agency Resource Pools */}
                      {partnerPools.map((pool) => {
                        const opsCost =
                          (pool.annual_operating_cost || 0) + (pool.annual_maintenance_cost || 0);

                        return (
                          <tr key={pool.resource_category} className="hover:bg-slate-50/50 bg-amber-50/10">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {pool.resource_name}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700">
                              {pool.recommended_units} {pool.unit_of_measure}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatINR(pool.total_acquisition_cost)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatINR(opsCost)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {formatINR(pool.total_annual_requirement)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Subtotal Partner Agency Requirement */}
                      {partnerPools.length > 0 && (
                        <tr className="bg-amber-50/60 font-semibold text-amber-900">
                          <td className="py-2 px-3">Partner Agency Subtotal</td>
                          <td className="py-2 px-3 text-center">—</td>
                          <td className="py-2 px-3 text-right">{formatINR(partnerAcquisitionTotal)}</td>
                          <td className="py-2 px-3 text-right">{formatINR(partnerOperatingTotal)}</td>
                          <td className="py-2 px-3 text-right text-amber-800 font-bold">
                            {formatINR(budgetData.total_partner_agency_cost)}
                          </td>
                        </tr>
                      )}

                      {/* Grand Combined Total */}
                      {partnerPools.length > 0 && (
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                          <td className="py-2.5 px-3">Combined Estimated Requirement</td>
                          <td className="py-2.5 px-3 text-center">—</td>
                          <td className="py-2.5 px-3 text-right">{formatINR(capexTotal)}</td>
                          <td className="py-2.5 px-3 text-right">{formatINR(opexTotal)}</td>
                          <td className="py-2.5 px-3 text-right font-extrabold">
                            {formatINR(budgetData.total_estimated_requirement)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================== */}
          {/* 4. CAPEX AND OPEX SUMMARY                                          */}
          {/* ================================================================== */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-900">CAPEX and OPEX</h3>
              <span className="text-2xs text-slate-400">12-Month Expenditure Profile</span>
            </div>

            {/* Horizontal Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex mb-3">
              <div
                className="bg-indigo-600 h-full transition-all"
                style={{ width: `${capexPct}%` }}
                title={`CAPEX: ${capexPct.toFixed(1)}%`}
              />
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${opexPct}%` }}
                title={`OPEX: ${opexPct.toFixed(1)}%`}
              />
            </div>

            {/* Compact Summary Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>CAPEX</span>
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    One-time equipment and resource purchase costs
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatINR(capexTotal)}</div>
                  <div className="text-2xs text-slate-500">{capexPct.toFixed(1)}%</div>
                </div>
              </div>

              <div className="p-2.5 rounded border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>OPEX</span>
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Recurring operating and maintenance costs
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatINR(opexTotal)}</div>
                  <div className="text-2xs text-slate-500">{opexPct.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetCostAnalysisView;
