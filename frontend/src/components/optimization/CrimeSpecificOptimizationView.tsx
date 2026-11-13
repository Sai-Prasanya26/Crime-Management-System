import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Scale,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Search,
  RotateCcw,
  Users,
  Car,
  FileText,
  ShieldAlert,
  ChevronRight,
  X,
  Edit2,
  Save,
  Database,
  Activity,
  Camera,
  Microscope,
  Laptop,
  HeartPulse,
  Radio,
  Gauge,
  MapPin,
  Table,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import LoadingState from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import { optimizationApi } from '../../api';
import type {
  StateItem,
  CrimeSpecificOptimizationResponse,
  DistrictCrimeAllocationItem,
  ResourceInventorySummaryResponse,
  CrimeResourceMappingItem,
  ResourceInventoryItem,
  DistrictCrimeDemandResponse,
} from '../../types';

interface CrimeSpecificOptimizationViewProps {
  states: StateItem[];
  selectedStateId?: number;
  onStateSelect: (stateId: number | undefined) => void;
  initialDistrictId?: number;
  initialPeriod?: string;
}

type SubTab = 'OPTIMIZATION' | 'MAPPINGS' | 'INVENTORY';

const POOL_METADATA: Record<
  string,
  {
    name: string;
    subtext: string;
    icon: React.ElementType;
    bgLight: string;
    textColor: string;
    barColor: string;
    unitDefault: string;
    isPartner?: boolean;
  }
> = {
  PERSONNEL: {
    name: 'Personnel Pool',
    subtext: 'Police & Traffic Officers',
    icon: Users,
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    barColor: 'bg-blue-600',
    unitDefault: 'Personnel',
  },
  MOBILITY: {
    name: 'Mobility Pool',
    subtext: 'Patrol Vehicles & PCR Vans',
    icon: Car,
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    barColor: 'bg-emerald-600',
    unitDefault: 'Vehicles',
  },
  INVESTIGATION: {
    name: 'Investigation Pool',
    subtext: 'Investigation & SIT Teams',
    icon: FileText,
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    barColor: 'bg-amber-600',
    unitDefault: 'Teams',
  },
  SPECIALIZED: {
    name: 'Specialized Tactical',
    subtext: 'Crime Branch & QRT Units',
    icon: ShieldAlert,
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    barColor: 'bg-purple-600',
    unitDefault: 'Units',
  },
  SURVEILLANCE: {
    name: 'Surveillance Pool',
    subtext: 'CCTV & ANPR Cameras',
    icon: Camera,
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    barColor: 'bg-cyan-600',
    unitDefault: 'Cameras',
  },
  FORENSIC: {
    name: 'Forensic Lab Pool',
    subtext: 'Crime Scene & DNA Testing',
    icon: Microscope,
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-700',
    barColor: 'bg-rose-600',
    unitDefault: 'Tests/Month',
  },
  CYBER_TECHNOLOGY: {
    name: 'Cyber Tech Pool',
    subtext: 'Digital Forensic Workstations',
    icon: Laptop,
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    barColor: 'bg-indigo-600',
    unitDefault: 'Workstations',
  },
  EMERGENCY_RESPONSE: {
    name: 'Emergency Medical (EMS)',
    subtext: '108 Ambulances & Trauma Teams',
    icon: HeartPulse,
    bgLight: 'bg-red-50',
    textColor: 'text-red-700',
    barColor: 'bg-red-600',
    unitDefault: 'Ambulances',
    isPartner: true,
  },
  COMMUNICATION: {
    name: 'Communication Pool',
    subtext: 'Radio & Dispatch Channels',
    icon: Radio,
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-700',
    barColor: 'bg-teal-600',
    unitDefault: 'Channels',
  },
  TRAFFIC_SAFETY: {
    name: 'Traffic Safety Pool',
    subtext: 'Speed Radars & Breathalyzers',
    icon: Gauge,
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    barColor: 'bg-orange-600',
    unitDefault: 'Devices',
  },
};

export const CrimeSpecificOptimizationView: React.FC<CrimeSpecificOptimizationViewProps> = ({
  states,
  selectedStateId,
  onStateSelect,
  initialDistrictId,
  initialPeriod,
}) => {
  // Navigation
  const [subTab, setSubTab] = useState<SubTab>('OPTIMIZATION');

  // Request Parameters
  const [optStateId, setOptStateId] = useState<number>(selectedStateId || 2); // Default Andhra Pradesh (ID 2)
  const [assessmentPeriod, setAssessmentPeriod] = useState<string>(initialPeriod || '2026-11-01');
  const [scenarioType, setScenarioType] = useState<string>('CRIME_SPECIFIC_OPTIMAL');

  // Optimization Result
  const [optimizationResult, setOptimizationResult] = useState<CrimeSpecificOptimizationResponse | null>(null);
  const [inventorySummary, setInventorySummary] = useState<ResourceInventorySummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // District Table Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Tactical Geographical Workspace State
  const [activeTacticalDistrictId, setActiveTacticalDistrictId] = useState<number | null>(initialDistrictId || null);
  const [tacticalRiskFilter, setTacticalRiskFilter] = useState<string>('ALL');
  const [tacticalSearch, setTacticalSearch] = useState<string>('');
  const [tacticalDemandDetail, setTacticalDemandDetail] = useState<DistrictCrimeDemandResponse | null>(null);
  const [isTacticalDemandLoading, setIsTacticalDemandLoading] = useState<boolean>(false);
  const [selectedCrimeName, setSelectedCrimeName] = useState<string | null>(null);
  const [allocationViewMode, setAllocationViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Drill-Down Drawer / Modal
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictCrimeAllocationItem | null>(null);
  const [districtDemandDetail, setDistrictDemandDetail] = useState<DistrictCrimeDemandResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [drillDownTab, setDrillDownTab] = useState<'EXPLANATION' | 'MATRIX'>('EXPLANATION');

  // Mapping Master State
  const [mappings, setMappings] = useState<CrimeResourceMappingItem[]>([]);
  const [mappingCategoryFilter, setMappingCategoryFilter] = useState<string>('ALL');
  const [editingMapping, setEditingMapping] = useState<CrimeResourceMappingItem | null>(null);
  const [isUpdatingMapping, setIsUpdatingMapping] = useState<boolean>(false);
  const [mappingSuccessMsg, setMappingSuccessMsg] = useState<string | null>(null);

  // Inventory State
  const [inventoryRecords, setInventoryRecords] = useState<ResourceInventoryItem[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('ALL');
  const [editingInventory, setEditingInventory] = useState<ResourceInventoryItem | null>(null);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState<boolean>(false);
  const [inventorySuccessMsg, setInventorySuccessMsg] = useState<string | null>(null);

  // Sync state selection
  useEffect(() => {
    if (selectedStateId && selectedStateId !== optStateId) {
      setOptStateId(selectedStateId);
    }
  }, [selectedStateId, optStateId]);

  // Load baseline inventory summary and execute initial optimization
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, optRes] = await Promise.all([
        optimizationApi.getInventorySummary(optStateId),
        optimizationApi.executeCrimeSpecificOptimization({
          state_id: optStateId,
          assessment_period: assessmentPeriod,
          scenario_type: scenarioType,
        }),
      ]);
      setInventorySummary(invRes);
      setOptimizationResult(optRes);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load crime-specific optimization data.');
    } finally {
      setIsLoading(false);
    }
  }, [optStateId, assessmentPeriod, scenarioType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Optimization Handler
  const handleExecuteOptimization = async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const res = await optimizationApi.executeCrimeSpecificOptimization({
        state_id: optStateId,
        assessment_period: assessmentPeriod,
        scenario_type: scenarioType,
      });
      setOptimizationResult(res);
      const invRes = await optimizationApi.getInventorySummary(optStateId);
      setInventorySummary(invRes);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Optimization solver failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Open District Drill-Down
  const handleOpenDistrictDetail = async (item: DistrictCrimeAllocationItem) => {
    setSelectedDistrict(item);
    setIsLoadingDetail(true);
    try {
      const detail = await optimizationApi.getDistrictCrimeDemand({
        district_id: item.district_id,
      });
      setDistrictDemandDetail(detail);
    } catch (err: any) {
      console.error('Failed to load district demand detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Auto-open district drilldown when navigated from Predictions page
  const initialDistrictHandledRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      initialDistrictId &&
      optimizationResult?.allocations &&
      initialDistrictHandledRef.current !== initialDistrictId
    ) {
      const match = optimizationResult.allocations.find((a) => a.district_id === initialDistrictId);
      if (match) {
        initialDistrictHandledRef.current = initialDistrictId;
        handleOpenDistrictDetail(match);
      }
    }
  }, [initialDistrictId, optimizationResult]);

  // Load Mappings Master
  const loadMappings = useCallback(async () => {
    try {
      const res = await optimizationApi.getCrimeMappings({
        shared_pool_category: mappingCategoryFilter !== 'ALL' ? mappingCategoryFilter : undefined,
      });
      setMappings(res.items);
    } catch (err: any) {
      console.error('Failed to load mappings', err);
    }
  }, [mappingCategoryFilter]);

  useEffect(() => {
    if (subTab === 'MAPPINGS') {
      loadMappings();
    }
  }, [subTab, loadMappings]);

  // Load Inventory Records
  const loadInventory = useCallback(async () => {
    try {
      const res = await optimizationApi.getInventory({
        state_id: optStateId,
        category: inventoryCategoryFilter !== 'ALL' ? inventoryCategoryFilter : undefined,
      });
      setInventoryRecords(res.items);
    } catch (err: any) {
      console.error('Failed to load inventory records', err);
    }
  }, [optStateId, inventoryCategoryFilter]);

  useEffect(() => {
    if (subTab === 'INVENTORY') {
      loadInventory();
    }
  }, [subTab, loadInventory]);

  // Save Mapping Updates
  const handleSaveMapping = async () => {
    if (!editingMapping) return;
    setIsUpdatingMapping(true);
    try {
      await optimizationApi.updateCrimeMapping(editingMapping.id, {
        coefficient: editingMapping.coefficient,
        min_demand_threshold: editingMapping.min_demand_threshold,
        priority_weight: editingMapping.priority_weight,
        is_active: editingMapping.is_active,
        operational_rationale: editingMapping.operational_rationale || undefined,
      });
      setMappingSuccessMsg(`Mapping for ${editingMapping.crime_name} updated successfully.`);
      setEditingMapping(null);
      loadMappings();
      setTimeout(() => setMappingSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update mapping.');
    } finally {
      setIsUpdatingMapping(false);
    }
  };

  // Reset Mappings to Defaults
  const handleResetMappings = async () => {
    if (!confirm('Are you sure you want to reset all 21 crime-to-resource mappings back to institutional baseline defaults?')) {
      return;
    }
    try {
      await optimizationApi.resetCrimeMappings();
      setMappingSuccessMsg('All mappings successfully reset to verified institutional defaults.');
      loadMappings();
      setTimeout(() => setMappingSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to reset mappings.');
    }
  };

  // Save Inventory Updates
  const handleSaveInventory = async () => {
    if (!editingInventory) return;
    setIsUpdatingInventory(true);
    try {
      await optimizationApi.updateInventory(editingInventory.id, {
        total_inventory: editingInventory.total_inventory,
        deployed_count: editingInventory.deployed_count,
        unavailable_count: editingInventory.unavailable_count,
        notes: editingInventory.notes || undefined,
      });
      setInventorySuccessMsg(`Inventory record for ${editingInventory.category} updated.`);
      setEditingInventory(null);
      loadInventory();
      setTimeout(() => setInventorySuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update inventory record.');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  // Filtered district allocations
  const filteredAllocations = useMemo(() => {
    if (!optimizationResult?.allocations) return [];
    let list = optimizationResult.allocations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => a.district_name.toLowerCase().includes(q));
    }

    if (riskFilter !== 'ALL') {
      list = list.filter((a) => a.risk_level === riskFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === statusFilter);
    }

    return list;
  }, [optimizationResult?.allocations, searchQuery, riskFilter, statusFilter]);

  // Compute total available standing pool capacity from pool_summaries
  const totalAvailablePool = useMemo(() => {
    if (!optimizationResult?.pool_summaries) return 0;
    return Object.values(optimizationResult.pool_summaries).reduce((acc, p) => acc + (p.capacity || 0), 0);
  }, [optimizationResult]);

  // District Groups for Geographical Tactical Allocation Workspace
  const districtGroups = useMemo(() => {
    if (!optimizationResult?.allocations) return [];
    const map = new Map<
      number,
      {
        district_id: number;
        district_name: string;
        state_name: string;
        risk_score: number;
        risk_level: string;
        priority_weight: number;
        total_demanded: number;
        total_allocated: number;
        total_shortage: number;
        coverage_pct: number;
        pools: Record<string, DistrictCrimeAllocationItem>;
        top_predicted_crimes: any[];
        representativeItem: DistrictCrimeAllocationItem;
      }
    >();

    for (const item of optimizationResult.allocations) {
      if (!map.has(item.district_id)) {
        map.set(item.district_id, {
          district_id: item.district_id,
          district_name: item.district_name,
          state_name: item.state_name,
          risk_score: item.risk_score,
          risk_level: item.risk_level,
          priority_weight: (item as any).priority_weight || 0,
          total_demanded: 0,
          total_allocated: 0,
          total_shortage: 0,
          coverage_pct: 0,
          pools: {},
          top_predicted_crimes: item.top_predicted_crimes || [],
          representativeItem: item,
        });
      }
      const d = map.get(item.district_id)!;
      d.pools[item.resource_category] = item;
      d.total_demanded += item.demanded_quantity;
      d.total_allocated += item.allocated_quantity;
      d.total_shortage += item.shortage;
    }

    const list = Array.from(map.values()).map((d) => ({
      ...d,
      coverage_pct: d.total_demanded > 0 ? (d.total_allocated / d.total_demanded) * 100 : 100,
    }));

    list.sort((a, b) => b.risk_score - a.risk_score);
    return list;
  }, [optimizationResult?.allocations]);

  const activeTacticalDistrict = useMemo(() => {
    if (!districtGroups.length) return null;
    if (activeTacticalDistrictId) {
      const found = districtGroups.find((d) => d.district_id === activeTacticalDistrictId);
      if (found) return found;
    }
    return districtGroups[0];
  }, [districtGroups, activeTacticalDistrictId]);

  const filteredTacticalDistricts = useMemo(() => {
    let list = districtGroups;
    if (tacticalRiskFilter !== 'ALL') {
      list = list.filter((d) => d.risk_level === tacticalRiskFilter);
    }
    if (tacticalSearch.trim()) {
      const q = tacticalSearch.toLowerCase().trim();
      list = list.filter((d) => d.district_name.toLowerCase().includes(q));
    }
    return list;
  }, [districtGroups, tacticalRiskFilter, tacticalSearch]);

  // Synchronize initialDistrictId if provided via props
  useEffect(() => {
    if (initialDistrictId) {
      setActiveTacticalDistrictId(initialDistrictId);
    }
  }, [initialDistrictId]);

  // Fetch dynamic district crime demand details whenever active tactical district or period changes
  useEffect(() => {
    if (!activeTacticalDistrict) {
      setTacticalDemandDetail(null);
      return;
    }
    let isMounted = true;
    setIsTacticalDemandLoading(true);
    const [yStr, mStr] = assessmentPeriod.split('-');
    const year = parseInt(yStr, 10) || 2026;
    const month = parseInt(mStr, 10) || 11;

    optimizationApi
      .getDistrictCrimeDemand({
        district_id: activeTacticalDistrict.district_id,
        year,
        month,
      })
      .then((res) => {
        if (!isMounted) return;
        setTacticalDemandDetail(res);
        const posCrimes = (res.crime_matrix || []).filter((c) => c.predicted_count > 0);
        if (posCrimes.length > 0) {
          setSelectedCrimeName((prev) => {
            if (prev && posCrimes.some((c) => c.crime_name === prev)) return prev;
            return posCrimes[0].crime_name;
          });
        } else {
          setSelectedCrimeName(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load tactical district demand detail', err);
        if (isMounted) setTacticalDemandDetail(null);
      })
      .finally(() => {
        if (isMounted) setIsTacticalDemandLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTacticalDistrict?.district_id, assessmentPeriod]);

  // Positive predicted crimes for active tactical district (Section B)
  const districtPositiveCrimes = useMemo(() => {
    if (!tacticalDemandDetail?.crime_matrix) return [];
    return tacticalDemandDetail.crime_matrix.filter((c) => c.predicted_count > 0);
  }, [tacticalDemandDetail]);

  // Selected crime for single-crime requirements (Section C)
  const activeSelectedCrime = useMemo(() => {
    if (!districtPositiveCrimes.length) return null;
    if (selectedCrimeName) {
      const match = districtPositiveCrimes.find((c) => c.crime_name === selectedCrimeName);
      if (match) return match;
    }
    return districtPositiveCrimes[0];
  }, [districtPositiveCrimes, selectedCrimeName]);

  // Section C: Mapped pools for selected single crime
  const selectedCrimeMappedPools = useMemo(() => {
    if (!activeSelectedCrime) return [];
    const items: Array<{
      poolKey: string;
      poolName: string;
      unit: string;
      coefficient: number;
      rawDemand: number;
      rationale: string;
      isPartner?: boolean;
      icon: React.ElementType;
      textColor: string;
      bgLight: string;
    }> = [];

    for (const poolKey of Object.keys(POOL_METADATA)) {
      const coef = activeSelectedCrime.coefficients?.[poolKey] ?? 0;
      const raw = activeSelectedCrime.raw_demands?.[poolKey] ?? 0;
      if (coef > 0 || raw > 0) {
        const meta = POOL_METADATA[poolKey];
        items.push({
          poolKey,
          poolName: meta.name,
          unit: activeSelectedCrime.units?.[poolKey] || meta.unitDefault,
          coefficient: coef,
          rawDemand: raw,
          rationale: activeSelectedCrime.rationales?.[poolKey] || 'Institutional preventive deployment ratio',
          isPartner: meta.isPartner,
          icon: meta.icon,
          textColor: meta.textColor,
          bgLight: meta.bgLight,
        });
      }
    }

    return items;
  }, [activeSelectedCrime]);

  // Section D: All 10 specialized resource pools aggregated allocation table
  const districtTenPoolAllocations = useMemo(() => {
    if (!activeTacticalDistrict || !optimizationResult) return [];
    return Object.keys(POOL_METADATA).map((poolKey) => {
      const meta = POOL_METADATA[poolKey];
      const poolAlloc = activeTacticalDistrict.pools[poolKey];
      const poolSummary = optimizationResult.pool_summaries?.[poolKey];
      const demanded = poolAlloc?.demanded_quantity ?? 0;
      const allocated = poolAlloc?.allocated_quantity ?? 0;
      const available = poolSummary?.capacity ?? poolAlloc?.baseline_available ?? 0;
      const shortage = poolAlloc?.shortage ?? Math.max(0, demanded - allocated);
      const coverage = poolAlloc?.coverage_percentage ?? (demanded > 0 ? (allocated / demanded) * 100 : 100);
      const status = poolAlloc?.status ?? (demanded === 0 ? 'SATISFIED' : allocated >= demanded ? 'SATISFIED' : allocated > 0 ? 'PARTIAL' : 'DEFICIT');

      return {
        poolKey,
        poolName: meta.name,
        subtext: meta.subtext,
        unit: poolAlloc?.unit_of_measure || meta.unitDefault,
        demanded,
        available,
        allocated,
        shortage,
        coverage,
        status,
        isPartner: meta.isPartner,
        icon: meta.icon,
        textColor: meta.textColor,
        bgLight: meta.bgLight,
        barColor: meta.barColor,
      };
    });
  }, [activeTacticalDistrict, optimizationResult]);

  if (isLoading) {
    return <LoadingState message="Integrating Phase 8 crime forecasts & Phase 9 risk assessments into MILP solver..." />;
  }

  if (error && !optimizationResult) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Planning Disclaimer & Architecture Banner */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/60 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                <Scale className="h-3.5 w-3.5 text-indigo-700" />
                Phase 10: Crime-Specific Preventive AI Resource Optimization
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Phase 8 Forecasts &times; Phase 9 Risk Integration
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <Layers className="h-3 w-3" />
                4 Shared Pools &bull; Integer MILP
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Demand-Driven Police Resource Allocation Engine
            </h2>
            <p className="text-xs text-slate-600 max-w-4xl">
              Allocates standing physical police inventories strictly according to <strong>crime-specific demand</strong> derived from
              all 21 predicted crime types in Phase 8, calibrated by Phase 9 risk scores. Integer programming guarantees zero fractional
              personnel and strict physical conservation without exceeding available inventory.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setSubTab('OPTIMIZATION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                subTab === 'OPTIMIZATION'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Activity className="h-3.5 w-3.5 inline mr-1" />
              Optimization Results
            </button>
            <button
              onClick={() => setSubTab('MAPPINGS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                subTab === 'MAPPINGS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1" />
              Mapping Master (21 Crimes)
            </button>
            <button
              onClick={() => setSubTab('INVENTORY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                subTab === 'INVENTORY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Database className="h-3.5 w-3.5 inline mr-1" />
              Standing Inventory
            </button>
          </div>
        </div>

        {/* Prominent Statutory Disclaimer */}
        <div className="mt-4 pt-3 border-t border-indigo-100 flex items-start gap-2 text-xs text-slate-600">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            <strong>Decision-Support Notice:</strong> All allocations generated by this system represent quantitative scenario planning benchmarks.
            They do not constitute statutory police deployment orders under the Police Act. Demand is strictly driven by statistical incident forecasts
            and recorded severity, with zero demographic or socioeconomic profiling.
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OPTIMIZATION RUN & RESULTS                                    */}
      {/* ==================================================================== */}
      {subTab === 'OPTIMIZATION' && (
        <>
          {/* Controls & Configuration Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* State Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jurisdiction (State / UT)
                  </label>
                  <select
                    value={optStateId}
                    onChange={(e) => {
                      const newId = Number(e.target.value);
                      setOptStateId(newId);
                      onStateSelect(newId);
                    }}
                    className="h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.state_name} ({s.entity_type || 'STATE'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Forecast Period */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Forecast Horizon
                  </label>
                  <select
                    value={assessmentPeriod}
                    onChange={(e) => setAssessmentPeriod(e.target.value)}
                    className="h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="2026-11-01">Nov 2026</option>
                    <option value="2026-12-01">Dec 2026</option>
                    <option value="2027-01-01">Jan 2027</option>
                    <option value="2027-02-01">Feb 2027</option>
                    <option value="2027-03-01">Mar 2027</option>
                  </select>
                </div>

                {/* Scenario Archetype */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Optimization Strategy Archetype
                  </label>
                  <select
                    value={scenarioType}
                    onChange={(e) => setScenarioType(e.target.value)}
                    className="h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="CRIME_SPECIFIC_OPTIMAL">Balanced Crime-Specific (Optimal MILP)</option>
                    <option value="HIGH_SEVERITY_PRIORITY">Violent &amp; Heinous Crime Priority</option>
                    <option value="CYBER_SPECIALIZED">Cyber Forensics &amp; Financial Specialization</option>
                    <option value="HIGHWAY_SAFETY">Traffic &amp; Highway Corridor Enforcement</option>
                    <option value="EQUAL_DEFICIT_REDUCTION">Equal Deficit Reduction</option>
                  </select>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end lg:self-center">
                <button
                  type="button"
                  onClick={handleExecuteOptimization}
                  disabled={isOptimizing}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isOptimizing ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                      Solving MILP...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Run AI Optimization
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Top-Level KPI Cards (5 Cards) */}
          {optimizationResult && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <StatCard
                title="Available Standing Pool"
                value={totalAvailablePool.toLocaleString()}
                subtext={`State: ${optimizationResult.state_name}`}
                icon={Database}
                color="blue"
              />
              <StatCard
                title="Total Crime Demand"
                value={optimizationResult.total_demand.toLocaleString()}
                subtext="Calculated from 21 predicted crimes"
                icon={Sparkles}
                color="navy"
              />
              <StatCard
                title="Total Allocated"
                value={optimizationResult.total_allocated.toLocaleString()}
                subtext="Strict conservation (<= pool)"
                icon={CheckCircle2}
                color="emerald"
              />
              <StatCard
                title="Unmet Demand / Shortage"
                value={optimizationResult.total_unmet_demand.toLocaleString()}
                subtext={optimizationResult.total_unmet_demand === 0 ? 'Full coverage achieved' : 'Prioritized triage applied'}
                icon={AlertTriangle}
                color="amber"
              />
              <StatCard
                title="Overall Coverage Rate"
                value={`${optimizationResult.overall_coverage_pct.toFixed(1)}%`}
                subtext={`Solver: ${optimizationResult.solver_status} (${optimizationResult.execution_duration_ms}ms)`}
                icon={Scale}
                color="blue"
              />
            </div>
          )}

          {/* 3. Ten Shared Resource Pools Summary Cards */}
          {optimizationResult && optimizationResult.pool_summaries && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {Object.entries(optimizationResult.pool_summaries).map(([poolKey, poolInfo]) => {
                const meta = POOL_METADATA[poolKey] || {
                  name: `${poolKey} Pool`,
                  subtext: 'Resource Allocation Pool',
                  icon: Layers,
                  bgLight: 'bg-slate-50',
                  textColor: 'text-slate-700',
                  barColor: 'bg-indigo-600',
                  unitDefault: 'Units',
                };
                const IconComponent = meta.icon;
                const isUnconfigured = poolInfo.solver_status === 'UNCONFIGURED_CAPACITY' || poolInfo.is_configured === false;
                const unitStr = poolInfo.unit_of_measure || meta.unitDefault;

                return (
                  <div
                    key={poolKey}
                    className={`rounded-xl border p-3.5 shadow-xs space-y-2.5 transition-all ${
                      isUnconfigured
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${meta.bgLight} ${meta.textColor}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{meta.name}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{meta.subtext}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isUnconfigured ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Unconfigured
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {poolInfo.coverage_pct.toFixed(0)}%
                          </span>
                        )}
                        {meta.isPartner && (
                          <span className="block mt-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Partner Agency
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`${isUnconfigured ? 'bg-amber-400' : meta.barColor} h-1.5 rounded-full transition-all`}
                        style={{
                          width: `${isUnconfigured ? 0 : Math.min(100, poolInfo.coverage_pct)}%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 text-center text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-500 block truncate">Cap ({unitStr})</span>
                        <span className="font-bold text-slate-800 text-[11px]">
                          {poolInfo.capacity.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block truncate">Demanded</span>
                        <span className="font-bold text-slate-800 text-[11px]">
                          {poolInfo.demand.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block truncate">Allocated</span>
                        <span className={`font-bold text-[11px] ${isUnconfigured ? 'text-amber-700' : meta.textColor}`}>
                          {poolInfo.allocated.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {isUnconfigured && (
                      <p className="text-[9px] text-amber-700 bg-amber-50 p-1 rounded text-center font-medium">
                        Allocations withheld (Audit Required)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3.5 Geographical Police Resource Allocation Workspace */}
          {optimizationResult && districtGroups.length > 0 && (
            <div className="rounded-xl border border-[#D9E1EA] bg-white shadow-xs overflow-hidden">
              <div className="border-b border-[#D9E1EA] bg-gradient-to-r from-[#F4F7FA] to-white p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#1769AA]/10 text-[#1769AA]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
                        Tactical Police Resource Deployment Workspace
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1769AA]/10 text-[#1769AA] border border-[#1769AA]/20">
                          Phase 10 Geo-Tactical
                        </span>
                      </h3>
                      <p className="text-xs text-[#5D6878]">
                        Multi-district tactical allocation planning console calibrated by Phase 8 crime forecasts and Phase 9 risk rankings.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#5D6878] bg-white px-3 py-1.5 rounded-lg border border-[#D9E1EA] shrink-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      MILP Solver: <strong>{optimizationResult.solver_status}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>{optimizationResult.execution_duration_ms}ms</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#D9E1EA]">
                {/* LEFT: Geographical District Selector & Risk Rankings (5 cols) */}
                <div className="lg:col-span-5 p-4 space-y-3 bg-[#F6F8FB]/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide">
                      Jurisdictional Districts ({districtGroups.length})
                    </span>
                    <span className="text-[11px] text-[#5D6878]">
                      State: <strong>{optimizationResult.state_name}</strong>
                    </span>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search district..."
                        value={tacticalSearch}
                        onChange={(e) => setTacticalSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-[#D9E1EA] bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                      />
                    </div>
                    <select
                      value={tacticalRiskFilter}
                      onChange={(e) => setTacticalRiskFilter(e.target.value)}
                      className="h-8 px-2 text-xs rounded-lg border border-[#D9E1EA] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                    >
                      <option value="ALL">All Risk</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* District Cards List */}
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {filteredTacticalDistricts.map((d, idx) => {
                      const isSelected = activeTacticalDistrict?.district_id === d.district_id;
                      const isCritical = d.risk_level === 'CRITICAL';
                      const isHigh = d.risk_level === 'HIGH';
                      const isMod = d.risk_level === 'MODERATE';

                      const riskBadgeClass = isCritical
                        ? 'bg-red-50 text-[#C53B3B] border-red-200'
                        : isHigh
                        ? 'bg-amber-50 text-[#C98512] border-amber-200'
                        : isMod
                        ? 'bg-blue-50 text-[#1769AA] border-blue-200'
                        : 'bg-emerald-50 text-[#16845B] border-emerald-200';

                      return (
                        <button
                          key={d.district_id}
                          type="button"
                          onClick={() => setActiveTacticalDistrictId(d.district_id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#1769AA] bg-white shadow-xs ring-2 ring-[#1769AA]/20'
                              : 'border-[#D9E1EA] bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                                <h4 className="text-xs font-bold text-[#0B1F3A] truncate">{d.district_name}</h4>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Demanded: <strong>{d.total_demanded.toLocaleString()}</strong> &bull; Allocated:{' '}
                                <strong>{d.total_allocated.toLocaleString()}</strong>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${riskBadgeClass}`}
                              >
                                {d.risk_level}
                              </span>
                              <span className="block text-[10px] font-semibold text-slate-600 mt-0.5">
                                Risk: {d.risk_score.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar & shortage notice */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>Coverage</span>
                              <span className="font-bold text-slate-700">{d.coverage_pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  d.coverage_pct >= 90
                                    ? 'bg-emerald-500'
                                    : d.coverage_pct >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, d.coverage_pct)}%` }}
                              />
                            </div>
                            {d.total_shortage > 0 && (
                              <div className="text-[10px] font-semibold text-[#C53B3B] flex items-center justify-between pt-0.5">
                                <span>Deficit:</span>
                                <span>-{d.total_shortage.toLocaleString()} units</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT: Detailed District 10-Pool Tactical Console (7 cols) */}
                <div className="lg:col-span-7 p-5 space-y-4 bg-white">
                  {activeTacticalDistrict ? (
                    <>
                      {/* District Tactical Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E1EA] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-[#0B1F3A]">
                              {activeTacticalDistrict.district_name}
                            </h4>
                            <span className="text-xs text-[#5D6878]">({activeTacticalDistrict.state_name})</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                activeTacticalDistrict.risk_level === 'CRITICAL'
                                  ? 'bg-red-50 text-[#C53B3B] border-red-200'
                                  : activeTacticalDistrict.risk_level === 'HIGH'
                                  ? 'bg-amber-50 text-[#C98512] border-amber-200'
                                  : 'bg-blue-50 text-[#1769AA] border-blue-200'
                              }`}
                            >
                              {activeTacticalDistrict.risk_level} &bull; Score:{' '}
                              {activeTacticalDistrict.risk_score.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-[#5D6878] mt-0.5">
                            Allocations solved under integer MILP demand constraints across all 10 specialized resource
                            pools.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenDistrictDetail(activeTacticalDistrict.representativeItem)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1769AA] text-white hover:bg-[#125386] transition-colors cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          <span>Explain Math &amp; Formulas</span>
                        </button>
                      </div>

                      {/* Quick Metrics Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#D9E1EA]">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Demanded</span>
                          <span className="text-sm font-bold text-[#0B1F3A]">
                            {activeTacticalDistrict.total_demanded.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#D9E1EA]">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Allocated</span>
                          <span className="text-sm font-bold text-[#1769AA]">
                            {activeTacticalDistrict.total_allocated.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#D9E1EA]">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase block">District Shortage</span>
                          <span
                            className={`text-sm font-bold ${
                              activeTacticalDistrict.total_shortage > 0 ? 'text-[#C53B3B]' : 'text-[#16845B]'
                            }`}
                          >
                            {activeTacticalDistrict.total_shortage > 0
                              ? `-${activeTacticalDistrict.total_shortage.toLocaleString()}`
                              : '0'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#D9E1EA]">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase block">Coverage Rate</span>
                          <span className="text-sm font-bold text-slate-800">
                            {activeTacticalDistrict.coverage_pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* SECTION B: PREDICTED CRIMES (PHASE 8 FORECASTS) */}
                      <div className="rounded-lg border border-[#D9E1EA] bg-[#F6F8FB]/40 p-3.5 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide">
                                Section B: Predicted Crimes
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {districtPositiveCrimes.length} Positive Forecast Offences
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5D6878]">
                              Compositionally derived from district ML forecasts. Select an offence to inspect mapped resource demand in Section C.
                            </p>
                          </div>
                        </div>

                        {isTacticalDemandLoading ? (
                          <div className="py-4 text-center text-xs text-slate-500">
                            Loading predicted offences and demand matrices...
                          </div>
                        ) : districtPositiveCrimes.length > 0 ? (
                          <div className="max-h-[220px] overflow-y-auto border border-[#D9E1EA] rounded-lg bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-[#F4F7FA] text-[11px] font-bold text-[#0B1F3A] border-b border-[#D9E1EA]">
                                <tr>
                                  <th className="py-2 px-3">Offence / Crime Type</th>
                                  <th className="py-2 px-3">Category</th>
                                  <th className="py-2 px-3 text-right">Predicted Volume (ŷ)</th>
                                  <th className="py-2 px-3 text-center">Severity</th>
                                  <th className="py-2 px-3 text-center">Mapped Pools</th>
                                  <th className="py-2 px-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#D9E1EA]/60">
                                {districtPositiveCrimes.map((c) => {
                                  const isSelected = activeSelectedCrime?.crime_name === c.crime_name;
                                  const mappedCount = Object.values(c.coefficients || {}).filter((v) => v > 0).length;
                                  const sev = c.severity_level?.toUpperCase() || 'MODERATE';
                                  const sevBadge =
                                    sev === 'CRITICAL'
                                      ? 'bg-red-50 text-[#C53B3B] border-red-200'
                                      : sev === 'HIGH'
                                      ? 'bg-amber-50 text-[#C98512] border-amber-200'
                                      : sev === 'LOW'
                                      ? 'bg-emerald-50 text-[#16845B] border-emerald-200'
                                      : 'bg-blue-50 text-[#1769AA] border-blue-200';

                                  return (
                                    <tr
                                      key={c.crime_code || c.crime_name}
                                      onClick={() => setSelectedCrimeName(c.crime_name)}
                                      className={`h-9 cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-indigo-50/80 font-semibold text-indigo-950'
                                          : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <td className="py-1.5 px-3">
                                        <div className="flex items-center gap-1.5">
                                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                          <span>{c.crime_name}</span>
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">{c.category_name}</td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                        {c.predicted_count.toFixed(3)}
                                      </td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevBadge}`}>
                                          {sev}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-3 text-center text-[11px] text-slate-600 font-medium">
                                        {mappedCount} pools
                                      </td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          {isSelected ? 'Selected' : 'Inspect'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-3 text-center text-xs text-slate-500">
                            No positive predicted offences recorded for this period.
                          </div>
                        )}
                      </div>

                      {/* SECTION C: SELECTED CRIME – RESOURCE REQUIREMENTS */}
                      {activeSelectedCrime && selectedCrimeMappedPools.length > 0 && (
                        <div className="rounded-lg border border-[#D9E1EA] bg-[#F6F8FB]/40 p-3.5 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide">
                                  Section C: Selected Crime – Resource Requirements
                                </h5>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {activeSelectedCrime.crime_name} ({activeSelectedCrime.predicted_count.toFixed(3)} Incidents)
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5D6878]">
                                Configured coefficients (c_ij) and calculated single-crime demand contribution (r_ij = p_i &times; c_ij).
                              </p>
                            </div>
                          </div>

                          <div className="border border-[#D9E1EA] rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#F4F7FA] text-[11px] font-bold text-[#0B1F3A] border-b border-[#D9E1EA]">
                                <tr>
                                  <th className="py-2 px-3">Resource Pool</th>
                                  <th className="py-2 px-3 text-right">Planning Coefficient (&alpha;)</th>
                                  <th className="py-2 px-3 text-right">Calculated Demand Contribution</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#D9E1EA]/60">
                                {selectedCrimeMappedPools.map((pool) => {
                                  const Icon = pool.icon;
                                  return (
                                    <tr key={pool.poolKey} className="h-8 hover:bg-slate-50">
                                      <td className="py-1.5 px-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1 rounded ${pool.bgLight} ${pool.textColor}`}>
                                            <Icon className="h-3 w-3" />
                                          </div>
                                          <span>{pool.poolName}</span>
                                          {pool.isPartner && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-red-50 text-red-700 border border-red-200">
                                              Partner Agency
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                                        {pool.coefficient.toFixed(3)}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-[#1769AA]">
                                        {pool.rawDemand.toFixed(3)} {pool.unit}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="text-[10px] text-slate-500 italic">
                            * Emergency Response and Traffic Safety are omitted when coefficient is 0.000 for this offence.
                          </div>
                        </div>
                      )}

                      {/* SECTION D: FINAL AGGREGATED RESOURCE ALLOCATION */}
                      <div className="space-y-2 pt-2 border-t border-[#D9E1EA]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide">
                                Section D: Final Aggregated Resource Allocation
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                SciPy MILP Optimal Allocation
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5D6878]">
                              Unified district-wide allocation solved under integer MILP demand constraints across all 10 specialized resource pools.
                            </p>
                          </div>

                          <div className="flex items-center gap-1 bg-[#F4F7FA] p-0.5 rounded-lg border border-[#D9E1EA] shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setAllocationViewMode('TABLE')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                allocationViewMode === 'TABLE'
                                  ? 'bg-[#0B1F3A] text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Table className="h-3 w-3" />
                              <span>Table View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllocationViewMode('CARDS')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                allocationViewMode === 'CARDS'
                                  ? 'bg-[#0B1F3A] text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Layers className="h-3 w-3" />
                              <span>Cards Grid</span>
                            </button>
                          </div>
                        </div>

                        {allocationViewMode === 'TABLE' ? (
                          <div className="border border-[#D9E1EA] rounded-lg overflow-hidden bg-white shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#F4F7FA] text-[11px] font-bold text-[#0B1F3A] border-b border-[#D9E1EA]">
                                <tr>
                                  <th className="py-2.5 px-3">Resource Pool</th>
                                  <th className="py-2.5 px-3 text-right">Required (D_j)</th>
                                  <th className="py-2.5 px-3 text-right">Available</th>
                                  <th className="py-2.5 px-3 text-right font-bold text-[#1769AA]">
                                    Recommended Allocation
                                  </th>
                                  <th className="py-2.5 px-3 text-right">Shortage</th>
                                  <th className="py-2.5 px-3 text-center">Coverage &amp; Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#D9E1EA]/60">
                                {districtTenPoolAllocations.map((alloc) => {
                                  const Icon = alloc.icon;
                                  const statusClass =
                                    alloc.status === 'SATISFIED'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : alloc.status === 'PARTIAL'
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : alloc.status === 'DEFICIT'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200';

                                  return (
                                    <tr key={alloc.poolKey} className="h-9 hover:bg-slate-50 transition-colors">
                                      <td className="py-1.5 px-3">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1 rounded ${alloc.bgLight} ${alloc.textColor}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                          </div>
                                          <div>
                                            <div className="font-semibold text-[#0B1F3A] flex items-center gap-1.5">
                                              <span>{alloc.poolName}</span>
                                              {alloc.isPartner && (
                                                <span className="text-[9px] px-1 py-0.2 rounded bg-red-50 text-red-700 border border-red-200 font-normal">
                                                  Partner Agency
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 block">
                                              {alloc.subtext} &bull; {alloc.unit}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                        {alloc.demanded.toLocaleString()}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                                        {alloc.available.toLocaleString()}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-extrabold text-[#1769AA]">
                                        {alloc.allocated.toLocaleString()}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        {alloc.shortage > 0 ? (
                                          <span className="text-[#C53B3B]">-{alloc.shortage.toLocaleString()}</span>
                                        ) : (
                                          <span className="text-[#16845B]">0</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-3 text-center">
                                        <div className="inline-flex items-center gap-1.5">
                                          <span className="text-[10px] font-mono text-slate-600">
                                            {alloc.coverage.toFixed(0)}%
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusClass}`}
                                          >
                                            {alloc.status}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-[#F8FAFC] border-t border-[#D9E1EA] text-[11px] text-slate-600">
                                <tr>
                                  <td colSpan={6} className="py-2 px-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-700">
                                        Evaluation Scope Summary: 10/10 Resource Pools Evaluated &amp; Satisfied
                                      </span>
                                      <span className="font-mono text-slate-500">
                                        Solver Status: <strong>{optimizationResult.solver_status}</strong> (Execution: {optimizationResult.execution_duration_ms}ms)
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          /* Cards Grid View */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {districtTenPoolAllocations.map((alloc) => {
                              const Icon = alloc.icon;
                              const statusClass =
                                alloc.status === 'SATISFIED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : alloc.status === 'PARTIAL'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : alloc.status === 'DEFICIT'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200';

                              return (
                                <div
                                  key={alloc.poolKey}
                                  className="p-3 rounded-lg border border-[#D9E1EA] bg-[#F6F8FB]/30 hover:bg-white hover:border-[#BAC7D5] transition-all space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`p-1.5 rounded-md ${alloc.bgLight} ${alloc.textColor}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-[#0B1F3A] truncate">{alloc.poolName}</h5>
                                        <span className="text-[10px] text-slate-500 block truncate">{alloc.subtext}</span>
                                      </div>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusClass} shrink-0`}
                                    >
                                      {alloc.status}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 text-center text-xs pt-1 border-t border-slate-100">
                                    <div>
                                      <span className="text-[9px] text-slate-500 block">Required</span>
                                      <span className="font-bold text-slate-800 text-[11px]">{alloc.demanded}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 block">Allocated</span>
                                      <span className={`font-bold text-[11px] ${alloc.textColor}`}>{alloc.allocated}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 block">Shortage</span>
                                      <span
                                        className={`font-bold text-[11px] ${
                                          alloc.shortage > 0 ? 'text-[#C53B3B]' : 'text-slate-600'
                                        }`}
                                      >
                                        {alloc.shortage > 0 ? `-${alloc.shortage}` : '0'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                    <div
                                      className={`h-1 rounded-full ${alloc.barColor}`}
                                      style={{ width: `${Math.min(100, alloc.coverage)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Top Predicted Crime Drivers for Selected District */}
                      {activeTacticalDistrict.top_predicted_crimes &&
                        activeTacticalDistrict.top_predicted_crimes.length > 0 && (
                          <div className="pt-2 border-t border-[#D9E1EA]">
                            <span className="text-[11px] font-bold text-[#0B1F3A] block mb-1.5">
                              Top Predicted Incident Drivers (Phase 8 Forecasts)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeTacticalDistrict.top_predicted_crimes.slice(0, 4).map((c: any, cidx: number) => (
                                <span
                                  key={cidx}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F4F7FA] text-slate-700 border border-[#D9E1EA]"
                                >
                                  {c.crime_name || c.crime_type_name || 'Crime'}:{' '}
                                  <strong>{Math.round(c.predicted_count || 0)}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-[#5D6878]">
                      Select a district from the jurisdiction list to inspect its tactical allocation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. District Recommendations Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  District Allocation Recommendations &bull; {filteredAllocations.length} District Allocations
                </h3>
                <p className="text-xs text-slate-600">
                  Click &ldquo;Explain &amp; Breakdown&rdquo; on any district to inspect its predicted crime counts, mapping formulas, and pool demands.
                </p>
              </div>

              {/* Table Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-600 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="CRITICAL">Critical Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MODERATE">Moderate Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SATISFIED">Satisfied (100%)</option>
                  <option value="PARTIAL">Partial (50-99%)</option>
                  <option value="DEFICIT">Deficit (&lt;50%)</option>
                  <option value="UNMET">Unmet (0%)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">District</th>
                    <th className="px-3 py-2.5">Resource Pool</th>
                    <th className="px-3 py-2.5">Phase 9 Risk</th>
                    <th className="px-3 py-2.5">Top Predicted Crimes</th>
                    <th className="px-3 py-2.5 text-right">Demanded</th>
                    <th className="px-3 py-2.5 text-right">Allocated</th>
                    <th className="px-3 py-2.5 text-right">Shortage</th>
                    <th className="px-3 py-2.5 text-center">Coverage</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllocations.map((item, idx) => {
                    const isCritical = item.risk_level === 'CRITICAL';
                    const isHigh = item.risk_level === 'HIGH';
                    const isMod = item.risk_level === 'MODERATE';

                    const statusBadge =
                      item.status === 'SATISFIED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : item.status === 'PARTIAL'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : item.status === 'DEFICIT'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200';

                    return (
                      <tr key={`${item.district_id}-${item.resource_category}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {item.district_name}
                          <span className="block text-[10px] font-normal text-slate-600">
                            {item.state_name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.resource_category}
                          </span>
                          <span className="block text-[10px] text-slate-600">{item.resource_name}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isCritical
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isHigh
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isMod
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.risk_score.toFixed(1)} &bull; {item.risk_level}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.top_predicted_crimes.slice(0, 2).map((ct: any, cidx: number) => (
                              <span
                                key={cidx}
                                className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] truncate"
                              >
                                {ct.crime_name || ct.crime_type_name || 'Crime'}: {Math.round(ct.predicted_count || 0)}
                              </span>
                            ))}
                            {item.top_predicted_crimes.length > 2 && (
                              <span className="text-[10px] text-slate-600">
                                +{item.top_predicted_crimes.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                          {item.demanded_quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-indigo-700">
                          {item.allocated_quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-rose-600">
                          {item.shortage > 0 ? `-${item.shortage}` : '0'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold">
                          {item.coverage_percentage.toFixed(0)}%
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleOpenDistrictDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            Explain
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CRIME-TO-RESOURCE MAPPING MASTER (21 CRIME TYPES)             */}
      {/* ==================================================================== */}
      {subTab === 'MAPPINGS' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Institutional Crime-to-Resource Mapping Master
              </h3>
              <p className="text-xs text-slate-600">
                Explicit institutional parameters linking all 21 Phase 8 predicted crime types to 10 preventive shared resource pools.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={mappingCategoryFilter}
                onChange={(e) => setMappingCategoryFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
              >
                <option value="ALL">All 10 Shared Pools</option>
                <option value="PERSONNEL">Personnel Pool</option>
                <option value="MOBILITY">Mobility Pool</option>
                <option value="INVESTIGATION">Investigation Pool</option>
                <option value="SPECIALIZED">Specialized Tactical Pool</option>
                <option value="SURVEILLANCE">Surveillance & CCTV Pool</option>
                <option value="FORENSIC">Forensic Lab Pool</option>
                <option value="CYBER_TECHNOLOGY">Cyber Tech Workstations Pool</option>
                <option value="EMERGENCY_RESPONSE">Emergency Medical EMS Pool</option>
                <option value="COMMUNICATION">Radio & Dispatch Pool</option>
                <option value="TRAFFIC_SAFETY">Traffic Safety Pool</option>
              </select>

              <button
                onClick={handleResetMappings}
                className="h-8 px-3 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Defaults
              </button>
            </div>
          </div>

          {mappingSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{mappingSuccessMsg}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Crime Type &amp; Category</th>
                  <th className="px-3 py-2.5">Mapped Resource</th>
                  <th className="px-3 py-2.5">Shared Pool</th>
                  <th className="px-3 py-2.5 text-right">Coefficient</th>
                  <th className="px-3 py-2.5 text-right">Threshold</th>
                  <th className="px-3 py-2.5 text-right">Weight</th>
                  <th className="px-3 py-2.5">Institutional Mitigation Rationale</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      {m.crime_name}
                      <span className="block text-[10px] font-normal text-slate-600">
                        {m.category_name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {m.resource_name}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {m.shared_pool_category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                      {m.coefficient.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {m.min_demand_threshold}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {m.priority_weight.toFixed(1)}&times;
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-600 max-w-md">
                      {m.operational_rationale}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setEditingMapping(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-600" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: STANDING RESOURCE INVENTORY (36 STATES AUDIT)                 */}
      {/* ==================================================================== */}
      {subTab === 'INVENTORY' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-600" />
                Standing Resource Inventory Baseline Audit
              </h3>
              <p className="text-xs text-slate-600">
                Accurate physical standing pools separating total sanctioned inventory, currently deployed units, and unavailable maintenance pools.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={inventoryCategoryFilter}
                onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
              >
                <option value="ALL">All 10 Resource Categories</option>
                <option value="PERSONNEL">Personnel</option>
                <option value="MOBILITY">Mobility</option>
                <option value="INVESTIGATION">Investigation</option>
                <option value="SPECIALIZED">Specialized Tactical</option>
                <option value="SURVEILLANCE">Surveillance & CCTV</option>
                <option value="FORENSIC">Forensic Examination</option>
                <option value="CYBER_TECHNOLOGY">Cyber Technology</option>
                <option value="EMERGENCY_RESPONSE">Emergency Medical (EMS)</option>
                <option value="COMMUNICATION">Communication & Radio</option>
                <option value="TRAFFIC_SAFETY">Traffic Safety</option>
              </select>
            </div>
          </div>

          {inventorySummary && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold">Total Available Standing Pool ({inventorySummary.state_name || 'National'}): </span>
                <span className="font-extrabold text-indigo-700">
                  {Object.values(inventorySummary.available_by_category || {}).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
                <span className="mx-2 text-indigo-300">|</span>
                <span>Reference Year: {inventorySummary.reference_year}</span>
              </div>
              <span className="text-[11px] text-slate-500 italic">{inventorySummary.disclaimer}</span>
            </div>
          )}

          {inventorySuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{inventorySuccessMsg}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Jurisdiction</th>
                  <th className="px-3 py-2.5">Resource &amp; Category</th>
                  <th className="px-3 py-2.5 text-right">Total Inventory</th>
                  <th className="px-3 py-2.5 text-right">Currently Deployed</th>
                  <th className="px-3 py-2.5 text-right">Unavailable / Maint</th>
                  <th className="px-3 py-2.5 text-right">Available Standing Pool</th>
                  <th className="px-3 py-2.5 text-center">Data Status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      {r.state_name}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-800">{r.resource_name}</span>
                      <span className="block text-[10px] text-slate-600">{r.category}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {r.total_inventory.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {r.deployed_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-rose-600">
                      {r.unavailable_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                      {r.available_pool.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {r.data_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setEditingInventory(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-600" />
                        Edit Inputs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: DISTRICT EXPLANATION & PREDICTION BREAKDOWN DRAWER          */}
      {/* ==================================================================== */}
      {selectedDistrict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                    District Explainability
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Risk: {selectedDistrict.risk_score.toFixed(1)} &bull; {selectedDistrict.risk_level}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedDistrict.district_name}, {selectedDistrict.state_name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedDistrict(null);
                  setDistrictDemandDetail(null);
                }}
                className="p-1.5 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Plain Language Rationale */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                  Preventive Allocation Recommendation Rationale
                </h4>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  {selectedDistrict.recommendation_rationale}
                </p>
              </div>

              {/* Pool Allocation Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>{selectedDistrict.resource_category}</span>
                    <span className="text-indigo-700 font-extrabold">{selectedDistrict.coverage_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, selectedDistrict.coverage_percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                    <span>Dem: {selectedDistrict.demanded_quantity}</span>
                    <span>Alloc: {selectedDistrict.allocated_quantity}</span>
                    <span className="text-rose-600">{selectedDistrict.shortage > 0 ? `-${selectedDistrict.shortage}` : '0'}</span>
                  </div>
                </div>
              </div>

              {/* Tab Selector inside Modal */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setDrillDownTab('EXPLANATION')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drillDownTab === 'EXPLANATION'
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {selectedDistrict.resource_category} Allocation Explanation ({selectedDistrict.allocated_quantity} of {selectedDistrict.demanded_quantity} Allocated)
                </button>
                <button
                  type="button"
                  onClick={() => setDrillDownTab('MATRIX')}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drillDownTab === 'MATRIX'
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Complete 21-Crime Demand Matrix (All 10 Pools)
                </button>
              </div>

              {/* TAB 1: CRIME-WISE EXPLANATION FOR SELECTED RESOURCE POOL */}
              {drillDownTab === 'EXPLANATION' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                      Detailed Crime Explanation for {selectedDistrict.resource_category} Pool
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      State Available: {selectedDistrict.crime_explanations?.[0]?.pool_available_capacity ?? 'N/A'} | District Demanded: {selectedDistrict.demanded_quantity} | Allocated: {selectedDistrict.allocated_quantity}
                    </span>
                  </div>

                  {selectedDistrict.crime_explanations && selectedDistrict.crime_explanations.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-[11px] text-slate-700">
                        <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-2.5 py-2">Predicted Crime Type</th>
                            <th className="px-2.5 py-2 text-center">Severity</th>
                            <th className="px-2.5 py-2 text-right">Forecast (&ycirc;)</th>
                            <th className="px-2.5 py-2 text-right">Planning Coeff (&alpha;)</th>
                            <th className="px-2.5 py-2 text-right">Physical Demand</th>
                            <th className="px-2.5 py-2 text-right font-bold text-indigo-700">Allocated Share</th>
                            <th className="px-2.5 py-2">Operational Preventive Rationale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDistrict.crime_explanations.map((exp, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-2.5 py-2 font-medium text-slate-900">
                                {exp.crime_name}
                                <span className="block text-[9px] text-slate-500">{exp.category_name}</span>
                              </td>
                              <td className="px-2.5 py-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                  {exp.severity_level}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-right font-bold text-slate-800">
                                {exp.predicted_count.toFixed(1)}
                              </td>
                              <td className="px-2.5 py-2 text-right text-slate-600 font-mono">
                                {exp.resource_coefficient.toFixed(2)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-semibold text-slate-700">
                                {exp.calculated_demand.toFixed(2)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-bold text-indigo-700">
                                {exp.proportional_allocation.toFixed(2)}
                              </td>
                              <td className="px-2.5 py-2 text-[10px] text-slate-600 max-w-xs">
                                {exp.operational_rationale}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 py-4 text-center">No crime explanation records found for this pool.</p>
                  )}
                </div>
              )}

              {/* TAB 2: COMPLETE 21-CRIME MATRIX (ALL 10 POOLS) */}
              {drillDownTab === 'MATRIX' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-700" />
                      All 21 Predicted Crime Types &times; 10 Resource Pools Matrix
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Coefficients &amp; Raw Demands across all 10 institutional pools (Personnel, Mobility, Investigation, Specialized, Surveillance, Forensic, Cyber Tech, Emergency EMS, Communication &amp; Traffic Safety)
                    </span>
                  </div>

                  {isLoadingDetail ? (
                    <div className="py-6 text-center text-slate-600">
                      <RotateCcw className="h-4 w-4 animate-spin inline mr-1" />
                      Loading complete 21-crime demand matrix...
                    </div>
                  ) : districtDemandDetail && districtDemandDetail.crime_matrix ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-[11px] text-slate-700 whitespace-nowrap">
                        <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-2.5 py-2">Crime Type</th>
                            <th className="px-2 py-2 text-center">Severity</th>
                            <th className="px-2.5 py-2 text-right">Predicted (&ycirc;)</th>
                            <th className="px-2 py-2 text-center">Personnel (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Mobility (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Investigation (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Specialized (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Surveillance (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Forensic (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Cyber Tech (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Emergency EMS (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Comm (Coeff / Dem)</th>
                            <th className="px-2 py-2 text-center">Traffic (Coeff / Dem)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {districtDemandDetail.crime_matrix.map((cm, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-2.5 py-2 font-medium text-slate-900">
                                {cm.crime_name}
                                <span className="block text-[9px] text-slate-500">{cm.category_name}</span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                  {cm.severity_level}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-right font-bold text-slate-800">
                                {cm.predicted_count.toFixed(1)}
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['PERSONNEL']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['PERSONNEL']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['MOBILITY']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['MOBILITY']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['INVESTIGATION']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['INVESTIGATION']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['SPECIALIZED']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['SPECIALIZED']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['SURVEILLANCE']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['SURVEILLANCE']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['FORENSIC']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['FORENSIC']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['CYBER_TECHNOLOGY']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['CYBER_TECHNOLOGY']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['EMERGENCY_RESPONSE']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['EMERGENCY_RESPONSE']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['COMMUNICATION']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['COMMUNICATION']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                              <td className="px-2 py-2 text-center text-slate-700 font-mono">
                                {cm.coefficients['TRAFFIC_SAFETY']?.toFixed(2) ?? '0.00'} / <span className="font-semibold">{cm.raw_demands['TRAFFIC_SAFETY']?.toFixed(2) ?? '0.00'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : districtDemandDetail && districtDemandDetail.crime_breakdowns ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-[11px] text-slate-700">
                        <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-2.5 py-2">Predicted Crime Type</th>
                            <th className="px-2.5 py-2 text-right">Predicted Count</th>
                            <th className="px-2.5 py-2 text-center">Severity</th>
                            <th className="px-2.5 py-2">Mapped Pool</th>
                            <th className="px-2.5 py-2 text-right">Coeff</th>
                            <th className="px-2.5 py-2 text-right">Raw Demand</th>
                            <th className="px-2.5 py-2">Preventive Rationale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {districtDemandDetail.crime_breakdowns.map((cb, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-2.5 py-2 font-medium text-slate-900">
                                {cb.crime_name}
                                <span className="block text-[9px] text-slate-600">{cb.category_name}</span>
                              </td>
                              <td className="px-2.5 py-2 text-right font-bold text-slate-800">
                                {cb.predicted_crime_count.toFixed(1)}
                              </td>
                              <td className="px-2.5 py-2 text-center">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                  {cb.severity_level}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 font-semibold text-indigo-700">
                                {cb.shared_pool_category}
                              </td>
                              <td className="px-2.5 py-2 text-right text-slate-600">
                                {cb.coefficient.toFixed(2)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-medium text-slate-700">
                                {cb.raw_demand.toFixed(2)}
                              </td>
                              <td className="px-2.5 py-2 text-[10px] text-slate-600 max-w-xs truncate">
                                {cb.operational_rationale}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-600">No crime breakdown available for this district.</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setSelectedDistrict(null);
                  setDistrictDemandDetail(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EDIT CRIME-TO-RESOURCE MAPPING (ADMIN)                      */}
      {/* ==================================================================== */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                Configure Mapping: {editingMapping.crime_name}
              </h3>
              <button
                onClick={() => setEditingMapping(null)}
                className="text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Requirement Coefficient (Resources per Incident):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingMapping.coefficient}
                  onChange={(e) =>
                    setEditingMapping({
                      ...editingMapping,
                      coefficient: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Activation Threshold (Minimum Incidents to trigger):
                </label>
                <input
                  type="number"
                  value={editingMapping.min_demand_threshold}
                  onChange={(e) =>
                    setEditingMapping({
                      ...editingMapping,
                      min_demand_threshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Priority Weight (Heuristic Multiplier):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMapping.priority_weight}
                  onChange={(e) =>
                    setEditingMapping({
                      ...editingMapping,
                      priority_weight: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Operational Mitigation Rationale:
                </label>
                <textarea
                  rows={3}
                  value={editingMapping.operational_rationale || ''}
                  onChange={(e) =>
                    setEditingMapping({
                      ...editingMapping,
                      operational_rationale: e.target.value,
                    })
                  }
                  className="w-full p-2 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMapping(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={isUpdatingMapping}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDIT INVENTORY RECORD (ADMIN)                               */}
      {/* ==================================================================== */}
      {editingInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                Update Standing Inventory: {editingInventory.category} ({editingInventory.state_name})
              </h3>
              <button
                onClick={() => setEditingInventory(null)}
                className="text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Total Sanctioned / Standing Inventory:
                </label>
                <input
                  type="number"
                  value={editingInventory.total_inventory}
                  onChange={(e) =>
                    setEditingInventory({
                      ...editingInventory,
                      total_inventory: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Currently Deployed / Committed Count:
                </label>
                <input
                  type="number"
                  value={editingInventory.deployed_count}
                  onChange={(e) =>
                    setEditingInventory({
                      ...editingInventory,
                      deployed_count: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Unavailable / Maintenance Count:
                </label>
                <input
                  type="number"
                  value={editingInventory.unavailable_count}
                  onChange={(e) =>
                    setEditingInventory({
                      ...editingInventory,
                      unavailable_count: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Computed Available Standing Pool:
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {Math.max(
                    0,
                    editingInventory.total_inventory -
                      editingInventory.deployed_count -
                      editingInventory.unavailable_count
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingInventory(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInventory}
                disabled={isUpdatingInventory}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Save Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrimeSpecificOptimizationView;
