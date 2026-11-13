import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Car,
  FileText,
  ShieldAlert,
  Camera,
  Microscope,
  Laptop,
  HeartPulse,
  Radio,
  Gauge,
  Play,
  RotateCcw,
  Layers,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { geographyApi, optimizationApi } from '../api';
import type {
  StateItem,
  DistrictItem,
  DistrictCrimeDemandResponse,
  CrimeSpecificOptimizationResponse,
  ResourceInventorySummaryResponse,
  CrimeTypeMatrixItem,
} from '../types';

interface PoolConfig {
  key: string;
  name: string;
  unit: string;
  icon: React.ElementType;
}

const RESOURCE_POOLS: Record<string, PoolConfig> = {
  PERSONNEL: {
    key: 'PERSONNEL',
    name: 'Police Personnel',
    unit: 'Officers',
    icon: Users,
  },
  MOBILITY: {
    key: 'MOBILITY',
    name: 'Patrol & Mobility',
    unit: 'Vehicles',
    icon: Car,
  },
  INVESTIGATION: {
    key: 'INVESTIGATION',
    name: 'Investigation Teams',
    unit: 'Teams',
    icon: FileText,
  },
  SPECIALIZED: {
    key: 'SPECIALIZED',
    name: 'Specialized Tactical Units',
    unit: 'Units',
    icon: ShieldAlert,
  },
  SURVEILLANCE: {
    key: 'SURVEILLANCE',
    name: 'Surveillance & CCTV',
    unit: 'Cameras',
    icon: Camera,
  },
  FORENSIC: {
    key: 'FORENSIC',
    name: 'Forensic Examination',
    unit: 'Tests/Mo',
    icon: Microscope,
  },
  CYBER_TECHNOLOGY: {
    key: 'CYBER_TECHNOLOGY',
    name: 'Digital Forensics Workstations',
    unit: 'Workstations',
    icon: Laptop,
  },
  EMERGENCY_RESPONSE: {
    key: 'EMERGENCY_RESPONSE',
    name: 'Emergency Response (112)',
    unit: 'Ambulances',
    icon: HeartPulse,
  },
  COMMUNICATION: {
    key: 'COMMUNICATION',
    name: 'Tactical Communication Channels',
    unit: 'Channels',
    icon: Radio,
  },
  TRAFFIC_SAFETY: {
    key: 'TRAFFIC_SAFETY',
    name: 'Traffic Enforcement Devices',
    unit: 'Devices',
    icon: Gauge,
  },
};

export const ResourceOptimizationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary filters
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number>(2); // Default to Andhra Pradesh (ID 2)
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>();
  const [assessmentPeriod, setAssessmentPeriod] = useState<string>('2026-11'); // Format YYYY-MM

  // Section 1 State: Selected Crime Type ID
  const [selectedCrimeId, setSelectedCrimeId] = useState<number | null>(null);

  // Loading States
  const [isLoadingGeography, setIsLoadingGeography] = useState<boolean>(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(false);
  const [isLoadingDemand, setIsLoadingDemand] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [demandError, setDemandError] = useState<string | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Data States
  const [demandDetail, setDistrictDemandDetail] = useState<DistrictCrimeDemandResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<CrimeSpecificOptimizationResponse | null>(null);
  const [inventorySummary, setInventorySummary] = useState<ResourceInventorySummaryResponse | null>(null);
  const [hasOptimized, setHasOptimized] = useState<boolean>(false);

  // Initialize from URL search params
  useEffect(() => {
    const stateIdParam = searchParams.get('state_id');
    const districtIdParam = searchParams.get('district_id');
    const periodParam = searchParams.get('period') || searchParams.get('assessment_period');

    if (stateIdParam) {
      const parsed = parseInt(stateIdParam, 10);
      if (!isNaN(parsed)) setSelectedStateId(parsed);
    }
    if (districtIdParam) {
      const parsed = parseInt(districtIdParam, 10);
      if (!isNaN(parsed)) setSelectedDistrictId(parsed);
    }
    if (periodParam) {
      const cleanPeriod = periodParam.slice(0, 7);
      if (cleanPeriod.match(/^\d{4}-\d{2}$/)) {
        setAssessmentPeriod(cleanPeriod);
      }
    }
  }, [searchParams]);

  // Load States list once on mount
  useEffect(() => {
    const loadStates = async () => {
      try {
        setIsLoadingGeography(true);
        const res = await geographyApi.getStates('current');
        const sorted = (res.items || []).sort((a, b) => a.state_name.localeCompare(b.state_name));
        setStates(sorted);
      } catch (err: any) {
        console.error('Failed to load states', err);
        setDemandError('Failed to load states list. Please check backend connection.');
      } finally {
        setIsLoadingGeography(false);
      }
    };
    loadStates();
  }, []);

  // When selectedStateId changes, load districts
  useEffect(() => {
    if (!selectedStateId) return;

    let isMounted = true;
    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const res = await geographyApi.getDistricts(selectedStateId, 'current');
        const sorted = (res.items || []).sort((a, b) => a.district_name.localeCompare(b.district_name));
        if (isMounted) {
          setDistricts(sorted);
          const districtExists = sorted.some((d) => d.id === selectedDistrictId);
          if (!districtExists && sorted.length > 0) {
            setSelectedDistrictId(sorted[0].id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load districts for state', selectedStateId, err);
      } finally {
        if (isMounted) setIsLoadingDistricts(false);
      }
    };

    loadDistricts();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId]);

  // Load District Predicted Crime Demand & Inventory Baseline
  // Note: Does NOT automatically execute optimization; Section 3 remains hidden until "Optimize Resources" is clicked
  const loadDistrictDemand = useCallback(async () => {
    if (!selectedDistrictId) return;

    setIsLoadingDemand(true);
    setDemandError(null);
    // Clear previous optimization results when district/period changes
    setHasOptimized(false);
    setOptimizationResult(null);
    setOptimizationError(null);

    const [yearStr, monthStr] = assessmentPeriod.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 11;

    try {
      const [demandRes, invRes] = await Promise.all([
        optimizationApi.getDistrictCrimeDemand({
          district_id: selectedDistrictId,
          year,
          month,
        }),
        optimizationApi.getInventorySummary(selectedStateId),
      ]);

      setDistrictDemandDetail(demandRes);
      setInventorySummary(invRes);

      // Auto-select first positive crime type
      const positive = (demandRes.crime_matrix || []).filter((c) => c.predicted_count > 0);
      if (positive.length > 0) {
        setSelectedCrimeId(positive[0].crime_type_id);
      } else {
        setSelectedCrimeId(null);
      }
    } catch (err: any) {
      console.error('Failed to load district demand', err);
      setDemandError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to retrieve district crime predictions.'
      );
    } finally {
      setIsLoadingDemand(false);
    }
  }, [selectedStateId, selectedDistrictId, assessmentPeriod]);

  // Fetch demand whenever district or period changes
  useEffect(() => {
    if (selectedStateId && selectedDistrictId) {
      loadDistrictDemand();
    }
  }, [selectedStateId, selectedDistrictId, assessmentPeriod, loadDistrictDemand]);

  // Execute Optimization Handler — triggered strictly by clicking "Optimize Resources"
  const handleOptimizeClick = async () => {
    if (!selectedStateId || !selectedDistrictId) return;

    setIsOptimizing(true);
    setOptimizationError(null);

    const [yearStr, monthStr] = assessmentPeriod.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 11;
    const dateFormatted = `${year}-${month.toString().padStart(2, '0')}-01`;

    try {
      const [optRes, invRes] = await Promise.all([
        optimizationApi.executeCrimeSpecificOptimization({
          state_id: selectedStateId,
          assessment_period: dateFormatted,
          scenario_type: 'CRIME_SPECIFIC_OPTIMAL',
        }),
        optimizationApi.getInventorySummary(selectedStateId),
      ]);

      setOptimizationResult(optRes);
      setInventorySummary(invRes);
      setHasOptimized(true);
    } catch (err: any) {
      console.error('Optimization solver execution failed', err);
      setOptimizationError(
        err?.response?.data?.detail ||
          err?.message ||
          'Optimization solver execution failed. Please retry.'
      );
      setOptimizationResult(null);
      setHasOptimized(false);
    } finally {
      setIsOptimizing(false);
    }
  };

  // --------------------------------------------------------------------------
  // SECTION 1: Predicted Crimes (Only Positive Predicted Incidents)
  // --------------------------------------------------------------------------
  const positiveCrimes: CrimeTypeMatrixItem[] = useMemo(() => {
    if (!demandDetail?.crime_matrix) return [];
    return demandDetail.crime_matrix.filter((c) => c.predicted_count > 0);
  }, [demandDetail]);

  // Selected crime object
  const selectedCrime = useMemo(() => {
    if (!positiveCrimes.length) return null;
    return positiveCrimes.find((c) => c.crime_type_id === selectedCrimeId) || positiveCrimes[0];
  }, [positiveCrimes, selectedCrimeId]);

  // --------------------------------------------------------------------------
  // SECTION 2: Crime-wise Resource Mapping (EXACTLY TWO COLUMNS: Resource Pool, Calculated Demand)
  // Sourced strictly from the selected crime's single-crime demands: r_ij = p_i * c_ij
  // --------------------------------------------------------------------------
  const crimeSpecificMappings = useMemo(() => {
    if (!selectedCrime || !selectedCrime.raw_demands) return [];

    return Object.entries(selectedCrime.raw_demands)
      .filter(([_, demand]) => typeof demand === 'number' && demand > 0)
      .map(([poolKey, demand]) => {
        const meta = RESOURCE_POOLS[poolKey] || {
          key: poolKey,
          name: poolKey,
          unit: 'Units',
          icon: Layers,
        };
        return {
          poolKey,
          name: meta.name,
          unit: meta.unit,
          icon: meta.icon,
          demand,
        };
      })
      .sort((a, b) => b.demand - a.demand);
  }, [selectedCrime]);

  // --------------------------------------------------------------------------
  // SECTION 3: Optimized Resource Allocation (EXACTLY FIVE COLUMNS)
  // Displayed ONLY after clicking "Optimize Resources" and request succeeds
  // Columns: Resource Pool, Required, Available, Recommended Allocation, Shortage / Remaining
  // Sourced from aggregated demand D_j across ALL active crimes & SciPy MILP
  // --------------------------------------------------------------------------
  const optimizedAllocations = useMemo(() => {
    if (!selectedDistrictId || !optimizationResult?.allocations) return [];

    const districtItems = optimizationResult.allocations.filter(
      (a) => a.district_id === selectedDistrictId
    );

    return districtItems
      .filter((a) => a.demanded_quantity > 0)
      .map((a) => {
        const meta = RESOURCE_POOLS[a.resource_category] || {
          key: a.resource_category,
          name: a.resource_name || a.resource_category,
          unit: a.unit_of_measure || 'Units',
          icon: Layers,
        };
        const available =
          inventorySummary?.available_by_category?.[a.resource_category] ??
          a.baseline_available ??
          0;

        return {
          category: a.resource_category,
          name: meta.name,
          unit: a.unit_of_measure || meta.unit,
          icon: meta.icon,
          required: a.demanded_quantity,
          available,
          recommended: a.allocated_quantity,
          shortage: a.shortage,
        };
      })
      .sort((a, b) => b.required - a.required);
  }, [optimizationResult, selectedDistrictId, inventorySummary]);

  return (
    <DashboardLayout title="Resource Optimization">
      <div className="bg-slate-50 min-h-screen p-6 space-y-6">
        {/* Page Title */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-black text-[#0B1F3A] tracking-tight">
            Resource Optimization
          </h1>
        </div>

        {/* Top Selectors & Action Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* 1. State / UT Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State / UT
              </label>
              <select
                value={selectedStateId}
                onChange={(e) => {
                  const newId = parseInt(e.target.value, 10);
                  setSelectedStateId(newId);
                  setSearchParams({
                    state_id: String(newId),
                    period: assessmentPeriod,
                  });
                }}
                disabled={isLoadingGeography}
                className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1769AA] focus:bg-white"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. District Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                District
              </label>
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const newId = parseInt(e.target.value, 10);
                  setSelectedDistrictId(newId);
                  setSearchParams({
                    state_id: String(selectedStateId),
                    district_id: String(newId),
                    period: assessmentPeriod,
                  });
                }}
                disabled={isLoadingDistricts || districts.length === 0}
                className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1769AA] focus:bg-white"
              >
                {isLoadingDistricts ? (
                  <option value="">Loading districts...</option>
                ) : districts.length === 0 ? (
                  <option value="">No districts available</option>
                ) : (
                  districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 3. Assessment Period Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assessment Period
              </label>
              <select
                value={assessmentPeriod}
                onChange={(e) => {
                  const newPeriod = e.target.value;
                  setAssessmentPeriod(newPeriod);
                  if (selectedDistrictId) {
                    setSearchParams({
                      state_id: String(selectedStateId),
                      district_id: String(selectedDistrictId),
                      period: newPeriod,
                    });
                  }
                }}
                className="w-full h-10 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1769AA] focus:bg-white"
              >
                <option value="2026-11">2026-11 (November 2026)</option>
                <option value="2026-12">2026-12 (December 2026)</option>
                <option value="2027-01">2027-01 (January 2027)</option>
                <option value="2027-02">2027-02 (February 2027)</option>
                <option value="2027-03">2027-03 (March 2027)</option>
              </select>
            </div>

            {/* 4. Optimize Resources Button */}
            <div>
              <button
                type="button"
                onClick={handleOptimizeClick}
                disabled={isLoadingDemand || isOptimizing}
                className="w-full h-10 px-4 inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#0B1F3A] hover:bg-[#1769AA] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isOptimizing ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white text-white" />
                    <span>Optimize Resources</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Demand Loading Error */}
        {demandError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{demandError}</span>
            </div>
            <button
              onClick={loadDistrictDemand}
              className="px-3 py-1 font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Demand State */}
        {isLoadingDemand && !demandDetail ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <LoadingState message="Loading predicted crime demands..." />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ================================================================ */}
            {/* SIDE-BY-SIDE PANELS (LEFT: Predicted Crimes, RIGHT: Mapping)     */}
            {/* ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* LEFT PANEL — Predicted Crimes */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-base font-bold text-[#0B1F3A]">Predicted Crimes</h2>
                </div>

                {positiveCrimes.length === 0 ? (
                  <div className="p-8 text-center">
                    <EmptyState
                      title="No Positive Crime Predictions"
                      message="No crime types have positive projected incidents for this district and period."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0B1F3A]/5 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 bg-slate-50">
                        <tr>
                          <th className="px-5 py-3">Crime Type</th>
                          <th className="px-5 py-3 text-right">Predicted Incidents</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {positiveCrimes.map((c) => {
                          const isSelected = selectedCrime?.crime_type_id === c.crime_type_id;
                          return (
                            <tr
                              key={c.crime_type_id}
                              onClick={() => setSelectedCrimeId(c.crime_type_id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/80 border-l-4 border-l-[#1769AA] font-bold text-[#0B1F3A]'
                                  : 'hover:bg-slate-50/80 text-slate-800'
                              }`}
                            >
                              <td className="px-5 py-3">
                                <span className="font-semibold text-slate-900">{c.crime_name}</span>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                                {c.predicted_count.toFixed(3)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL — Crime-wise Resource Mapping */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-base font-bold text-[#0B1F3A]">Crime-wise Resource Mapping</h2>
                </div>

                {!selectedCrime || crimeSpecificMappings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Select a predicted crime to view resource requirements.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0B1F3A]/5 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 bg-slate-50">
                        <tr>
                          <th className="px-5 py-3">Resource Pool</th>
                          <th className="px-5 py-3 text-right">Calculated Demand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {crimeSpecificMappings.map((m) => {
                          const Icon = m.icon;
                          return (
                            <tr key={m.poolKey} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#1769AA] shrink-0">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{m.name}</div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      Unit: {m.unit}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                                {m.demand.toFixed(3)}{' '}
                                <span className="text-slate-500 font-normal text-[11px]">
                                  {m.unit}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Optimization Solver Error (if run failed) */}
            {optimizationError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{optimizationError}</span>
                </div>
                <button
                  onClick={handleOptimizeClick}
                  className="px-3 py-1 font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md transition-colors cursor-pointer"
                >
                  Retry Optimization
                </button>
              </div>
            )}

            {/* ================================================================ */}
            {/* SECTION 3: OPTIMIZED RESOURCE ALLOCATION                         */}
            {/* Displayed ONLY after successful optimization execution           */}
            {/* EXACTLY FIVE COLUMNS: Resource Pool, Required, Available,        */}
            {/* Recommended Allocation, Shortage / Remaining                     */}
            {/* ================================================================ */}
            {hasOptimized && optimizationResult && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-base font-bold text-[#0B1F3A]">Optimized Resource Allocation</h2>
                </div>

                {optimizedAllocations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No resource pools currently have active demand for this district and period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0B1F3A]/5 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-5 py-3">Resource Pool</th>
                          <th className="px-5 py-3 text-right">Required</th>
                          <th className="px-5 py-3 text-right">Available</th>
                          <th className="px-5 py-3 text-right">Recommended Allocation</th>
                          <th className="px-5 py-3 text-right">Shortage / Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {optimizedAllocations.map((item) => {
                          const Icon = item.icon;
                          const isShortage = item.shortage > 0;

                          return (
                            <tr key={item.category} className="hover:bg-slate-50/80 transition-colors">
                              {/* Col 1: Resource Pool */}
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#1769AA] shrink-0">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{item.name}</div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      Unit: {item.unit}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Col 2: Required */}
                              <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                                {item.required.toLocaleString()}{' '}
                                <span className="text-slate-500 font-normal text-[11px]">
                                  {item.unit}
                                </span>
                              </td>

                              {/* Col 3: Available */}
                              <td className="px-5 py-3 text-right font-mono text-slate-700">
                                {item.available.toLocaleString()}{' '}
                                <span className="text-slate-500 font-normal text-[11px]">
                                  {item.unit}
                                </span>
                              </td>

                              {/* Col 4: Recommended Allocation */}
                              <td className="px-5 py-3 text-right font-mono font-black text-[#1769AA]">
                                {item.recommended.toLocaleString()}{' '}
                                <span className="text-slate-500 font-normal text-[11px]">
                                  {item.unit}
                                </span>
                              </td>

                              {/* Col 5: Shortage / Remaining */}
                              <td className="px-5 py-3 text-right">
                                {isShortage ? (
                                  <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    {item.shortage.toLocaleString()} Shortfall
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    0 (Fully Covered)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResourceOptimizationPage;
