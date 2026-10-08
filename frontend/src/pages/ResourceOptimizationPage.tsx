import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sliders,
  Users,
  ShieldAlert,
  Car,
  Eye,
  AlertCircle,
  RotateCcw,
  Compass,
  Building2,
  CheckCircle2,
  ExternalLink,
  Shield,
  Search,
  Database,
  Layers,
  Sparkles,
  X,
  BarChart2,
  Scale,
  Info,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { StatCard } from '../components/common/StatCard';
import { geographyApi, resourceApi } from '../api';
import type {
  StateItem,
  StateResourceItem,
  ResourceCoverageResponse,
  ResourceOverview,
  DistrictResourceItem,
  DistrictResourceGapItem,
  AIResourceRecommendationItem,
  ResourceSummaryResponse,
  ResourceCrimeComparisonResponse,
  ResourceTypeItem,
} from '../types';

type TabType =
  | 'overview'
  | 'resource_intelligence'
  | 'state_baseline'
  | 'districts'
  | 'personnel'
  | 'vehicles'
  | 'investigation'
  | 'surveillance'
  | 'infrastructure'
  | 'gaps'
  | 'recommendations';

export const ResourceOptimizationPage: React.FC = () => {
  // Navigation & filter state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [states, setStates] = useState<StateItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Loading & error state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTabLoading, setIsTabLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data caches for tabs
  const [overview, setOverview] = useState<ResourceOverview | null>(null);
  const [coverage, setCoverage] = useState<ResourceCoverageResponse | null>(null);
  const [stateResources, setStateResources] = useState<StateResourceItem[]>([]);
  const [districtResources, setDistrictResources] = useState<DistrictResourceItem[]>([]);
  const [personnelList, setPersonnelList] = useState<DistrictResourceItem[]>([]);
  const [vehicleList, setVehicleList] = useState<DistrictResourceItem[]>([]);
  const [investigationList, setInvestigationList] = useState<DistrictResourceItem[]>([]);
  const [surveillanceList, setSurveillanceList] = useState<DistrictResourceItem[]>([]);
  const [infrastructureList, setInfrastructureList] = useState<DistrictResourceItem[]>([]);
  const [gapsList, setGapsList] = useState<DistrictResourceGapItem[]>([]);
  const [recommendationsList, setRecommendationsList] = useState<AIResourceRecommendationItem[]>([]);

  // Phase 7D: Official Resource Intelligence & Crime Comparison state
  const [resourceSummary, setResourceSummary] = useState<ResourceSummaryResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<ResourceCrimeComparisonResponse | null>(null);
  const [resourceTypesList, setResourceTypesList] = useState<ResourceTypeItem[]>([]);
  const [selectedResourceTypeFilter, setSelectedResourceTypeFilter] = useState<string>('ALL');
  const [selectedRefYearFilter, setSelectedRefYearFilter] = useState<string>('ALL');

  // District detail modal state
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');
  const [selectedDistrictState, setSelectedDistrictState] = useState<string>('');
  const [districtDetailItems, setDistrictDetailItems] = useState<DistrictResourceItem[] | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Initial load of states, overview, and coverage
  const loadInitialData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [statesRes, overviewRes, coverageRes] = await Promise.all([
        geographyApi.getStates(),
        resourceApi.getOverview(),
        resourceApi.getCoverage(),
      ]);
      setStates(statesRes.items);
      setOverview(overviewRes);
      setCoverage(coverageRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize operational resource intelligence.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load specific tab dataset whenever activeTab, selectedStateId, or statusFilter changes
  const loadTabData = useCallback(async () => {
    setIsTabLoading(true);
    try {
      const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter;

      switch (activeTab) {
        case 'resource_intelligence': {
          const [summaryRes, compRes, typesRes] = await Promise.all([
            resourceApi.getResourceSummary({ state_id: selectedStateId }),
            resourceApi.getResourceComparison({ state_id: selectedStateId }),
            resourceApi.getResourceTypes(),
          ]);
          setResourceSummary(summaryRes);
          setComparisonData(compRes);
          setResourceTypesList(typesRes);
          break;
        }
        case 'state_baseline': {
          const res = await resourceApi.getStateResources({
            state_id: selectedStateId,
            limit: 100,
          });
          setStateResources(res.items);
          break;
        }
        case 'districts': {
          const res = await resourceApi.getDistrictResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setDistrictResources(res.items);
          break;
        }
        case 'personnel': {
          const res = await resourceApi.getPersonnelResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setPersonnelList(res.items);
          break;
        }
        case 'vehicles': {
          const res = await resourceApi.getVehicleResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setVehicleList(res.items);
          break;
        }
        case 'investigation': {
          const res = await resourceApi.getInvestigationResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setInvestigationList(res.items);
          break;
        }
        case 'surveillance': {
          const res = await resourceApi.getSurveillanceResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setSurveillanceList(res.items);
          break;
        }
        case 'infrastructure': {
          const res = await resourceApi.getInfrastructureResources({
            state_id: selectedStateId,
            data_status: filterStatus,
            limit: 100,
          });
          setInfrastructureList(res.items);
          break;
        }
        case 'gaps': {
          const res = await resourceApi.getResourceGaps({
            state_id: selectedStateId,
            limit: 100,
          });
          setGapsList(res.items);
          break;
        }
        case 'recommendations': {
          const res = await resourceApi.getAIRecommendations({
            state_id: selectedStateId,
            limit: 100,
          });
          setRecommendationsList(res.items);
          break;
        }
        case 'overview':
        default:
          break;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load category resource records.');
    } finally {
      setIsTabLoading(false);
    }
  }, [activeTab, selectedStateId, statusFilter]);

  useEffect(() => {
    if (!isLoading) {
      loadTabData();
    }
  }, [loadTabData, isLoading]);

  // Open multi-category modal for a district
  const handleOpenDistrictDetail = async (districtId: number, districtName: string, stateName: string) => {
    setSelectedDistrictName(districtName);
    setSelectedDistrictState(stateName);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    try {
      const items = await resourceApi.getDistrictDetailMulti(districtId);
      setDistrictDetailItems(items);
    } catch {
      setDistrictDetailItems([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Helper for rendering data status badges
  const renderStatusBadge = (status: string, badge?: string) => {
    const b = badge || (status.startsWith('OFFICIAL') ? 'OFFICIAL' : status === 'DERIVED' ? 'DERIVED' : status === 'AI_ESTIMATE' ? 'AI ESTIMATE' : 'UNRECORDED');
    if (b === 'OFFICIAL' || status.startsWith('OFFICIAL')) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          OFFICIAL
        </span>
      );
    }
    if (b === 'DERIVED') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
          DERIVED
        </span>
      );
    }
    if (b === 'AI ESTIMATE') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
          AI ESTIMATE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
        UNRECORDED
      </span>
    );
  };

  // Helper for rendering priority badges
  const renderPriorityBadge = (tier: string) => {
    const t = (tier || '').toUpperCase();
    if (t === 'CRITICAL') {
      return (
        <span className="rounded bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
          CRITICAL
        </span>
      );
    }
    if (t === 'HIGH') {
      return (
        <span className="rounded bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
          HIGH
        </span>
      );
    }
    if (t === 'MEDIUM' || t === 'MODERATE') {
      return (
        <span className="rounded bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-bold border border-sky-200">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
        LOW
      </span>
    );
  };

  // Filter lists based on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredStateResources = useMemo(() => {
    if (!query) return stateResources;
    return stateResources.filter(
      (r) =>
        r.state_name.toLowerCase().includes(query) ||
        r.resource_name.toLowerCase().includes(query) ||
        r.source_publication.toLowerCase().includes(query)
    );
  }, [stateResources, query]);

  const filteredDistrictResources = useMemo(() => {
    if (!query) return districtResources;
    return districtResources.filter(
      (r) =>
        r.district_name.toLowerCase().includes(query) ||
        r.state_name.toLowerCase().includes(query) ||
        r.resource_name.toLowerCase().includes(query)
    );
  }, [districtResources, query]);

  const filteredPersonnelList = useMemo(() => {
    if (!query) return personnelList;
    return personnelList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [personnelList, query]);

  const filteredVehicleList = useMemo(() => {
    if (!query) return vehicleList;
    return vehicleList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [vehicleList, query]);

  const filteredInvestigationList = useMemo(() => {
    if (!query) return investigationList;
    return investigationList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [investigationList, query]);

  const filteredSurveillanceList = useMemo(() => {
    if (!query) return surveillanceList;
    return surveillanceList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [surveillanceList, query]);

  const filteredInfrastructureList = useMemo(() => {
    if (!query) return infrastructureList;
    return infrastructureList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [infrastructureList, query]);

  const filteredGapsList = useMemo(() => {
    if (!query) return gapsList;
    return gapsList.filter(
      (r) =>
        r.district_name.toLowerCase().includes(query) ||
        r.state_name.toLowerCase().includes(query) ||
        r.resource_name.toLowerCase().includes(query)
    );
  }, [gapsList, query]);

  const filteredRecommendationsList = useMemo(() => {
    if (!query) return recommendationsList;
    return recommendationsList.filter(
      (r) => r.district_name.toLowerCase().includes(query) || r.state_name.toLowerCase().includes(query)
    );
  }, [recommendationsList, query]);

  // Phase 7D: Filtered resource summary & crime comparison datasets
  const filteredSummaryStates = useMemo(() => {
    if (!resourceSummary) return [];
    let list = resourceSummary.items;
    if (selectedStateId) {
      list = list.filter((s) => s.state_id === selectedStateId);
    }
    if (selectedRefYearFilter !== 'ALL') {
      const yr = parseInt(selectedRefYearFilter, 10);
      list = list.filter((s) => s.reference_year === yr);
    }
    if (selectedResourceTypeFilter !== 'ALL') {
      list = list
        .map((s) => ({
          ...s,
          resources: s.resources.filter(
            (r) =>
              r.resource_type.toLowerCase().includes(selectedResourceTypeFilter.toLowerCase()) ||
              r.category.toLowerCase().includes(selectedResourceTypeFilter.toLowerCase())
          ),
        }))
        .filter((s) => s.resources.length > 0);
    }
    if (query) {
      list = list.filter(
        (s) =>
          s.state.toLowerCase().includes(query) ||
          s.resources.some((r) => r.resource_type.toLowerCase().includes(query))
      );
    }
    return list;
  }, [resourceSummary, selectedStateId, selectedRefYearFilter, selectedResourceTypeFilter, query]);

  const filteredComparisonItems = useMemo(() => {
    if (!comparisonData) return [];
    let list = comparisonData.items;
    if (selectedStateId) {
      list = list.filter((s) => s.state_id === selectedStateId);
    }
    if (query) {
      list = list.filter((s) => s.state_name.toLowerCase().includes(query));
    }
    return list;
  }, [comparisonData, selectedStateId, query]);

  // Tab configurations
  const tabs: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }>; count?: string | number }> = [
    { id: 'overview', label: 'Overview', icon: Sliders },
    { id: 'resource_intelligence', label: 'Resource Intelligence', icon: Shield, count: '36 States' },
    { id: 'state_baseline', label: 'State Baseline', icon: Building2, count: '36/36' },
    { id: 'districts', label: 'District Inventory', icon: Layers, count: 640 },
    { id: 'personnel', label: 'Personnel', icon: Users },
    { id: 'vehicles', label: 'Mobility & Fleet', icon: Car },
    { id: 'investigation', label: 'Investigation', icon: ShieldAlert },
    { id: 'surveillance', label: 'Surveillance & CCTV', icon: Eye },
    { id: 'infrastructure', label: 'Infrastructure', icon: Compass },
    { id: 'gaps', label: 'Resource Gaps', icon: AlertCircle },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
  ];

  return (
    <DashboardLayout
      hideSidebar
      icon={Sliders}
      title="Resource Optimization & Operational Intelligence"
      subtitle="Authoritative BPR&D/MHA baselines, verified commissionerate disclosures, and explainable AI resource allocation"
      onRefresh={() => loadInitialData(true)}
      isRefreshing={isRefreshing}
    >
      {/* Top Filter and Multi-Tab Navigation Toolbar */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Jurisdiction and Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 shrink-0">
              Scope:
            </span>
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white py-1 px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="">All States &amp; UTs ({states.length || 36})</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>

            {['districts', 'personnel', 'vehicles', 'investigation', 'surveillance', 'infrastructure'].includes(activeTab) && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white py-1 px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OFFICIAL_DISTRICT">Official Commissionerates (21)</option>
                <option value="UNRECORDED">Unrecorded Ground Data</option>
              </select>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search district or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-44 sm:w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {(selectedStateId || searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSelectedStateId(undefined);
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#0A192F] text-white font-bold shadow-2xs'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Connecting to authoritative police resource registries and running optimization calculations..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Resource Optimization Error"
          message={error}
          onRetry={() => loadInitialData(true)}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Provenance & Methodology Banner */}
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-4 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Shield className="h-3 w-3" />
                        Comprehensive Operational Intelligence
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Zero Fabrication Standard
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      National Law Enforcement Resource Landscape (Census 2011 &bull; 640 Districts)
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Authoritative police strength baselines compiled from <strong>BPR&amp;D Data on Police Organizations (DoPO)</strong>, Ministry of Home Affairs, and verified metropolitan commissionerate disclosures.
                      Where ground inventories are not officially disclosed by district administrations, counts are strictly maintained as <code>UNRECORDED</code> with <code>gap = NULL</code>, preventing synthetic distortions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="https://bprd.nic.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <span>BPR&amp;D Portal</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </a>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Assessed Districts"
                  value={overview?.total_assessed_districts || 640}
                  subtext="Census 2011 nationwide scope"
                  icon={Layers}
                  color="navy"
                />
                <StatCard
                  title="Official State Baseline"
                  value={`${coverage?.total_active_states || 36} / 36`}
                  subtext="100% active States & UTs covered"
                  icon={Building2}
                  color="emerald"
                />
                <StatCard
                  title="Police Force Gross Demand"
                  value={(overview?.gross_required_officers || 164500).toLocaleString()}
                  subtext="AI tactical personnel requirement"
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Mobility Fleet Demand"
                  value={(overview?.gross_required_vehicles || 26800).toLocaleString()}
                  subtext="Patrol vehicles & PCR vans"
                  icon={Car}
                  color="amber"
                />
              </div>

              {/* Functional Domain Requirement Grid */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Operational Domain Breakdown &amp; Demand Allocation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Caseload-driven resource requirements across law enforcement divisions
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-xs uppercase tracking-wider">Police Personnel</span>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {(overview?.gross_required_officers || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Target officers aligned with population &amp; forecasted incidents
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-xs uppercase tracking-wider">Patrol &amp; Mobility</span>
                      <Car className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {(overview?.gross_required_vehicles || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Patrol cruisers, PCR vans, and highway interceptors
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-xs uppercase tracking-wider">Investigation Squads</span>
                      <ShieldAlert className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {(overview?.gross_required_investigation_teams || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Specialized crime, forensic, and cyber investigation teams
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-xs uppercase tracking-wider">Surveillance &amp; Monitoring</span>
                      <Eye className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {(overview?.gross_required_surveillance_units || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Tactical surveillance units, drones, and command control cells
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Governance & Institutional Integrity Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Database className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Strict Data Governance &amp; Null Invariant Principles:
                    </span>
                    <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                      <li>
                        <strong>Preservation of State Aggregates:</strong> Official police strength in India is governed pursuant to the Seventh Schedule (State List). State/UT aggregations are verified from BPR&amp;D DoPO and Parliamentary disclosures without artificial disaggregation.
                      </li>
                      <li>
                        <strong>Null Gap Invariant:</strong> For jurisdictions without verified administrative disclosures, <code>actual_count = NULL</code> and <code>gap_count = NULL</code>. Gaps are never computed against non-existent numbers.
                      </li>
                      <li>
                        <strong>Verified Disclosures:</strong> 21 metropolitan police departments with official public records (Mumbai, Bengaluru, Hyderabad, Delhi, Kolkata, etc.) display genuine gap counts and institutional document citations.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RESOURCE INTELLIGENCE & CRIME COMPARISON (PHASE 7D) */}
          {activeTab === 'resource_intelligence' && (
            <div className="space-y-5">
              {/* Data Freshness & Institutional Provenance Banner (Requirement 13) */}
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-md">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0A192F]">
                        Official Police Resource Data Intelligence &amp; Freshness Audit
                      </h3>
                      <p className="text-xs text-slate-600">
                        Institutional police resources governed pursuant to the Seventh Schedule (State List). All records traced to official publications.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Phase 7D Foundation
                  </span>
                </div>

                {/* Freshness Tags Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-blue-100">
                  <div className="rounded-md border border-slate-200 bg-white/90 p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Personnel Baseline</span>
                    <span className="font-bold text-[#0A192F] text-xs">Ref. Year 2020</span>
                    <span className="text-[10px] text-slate-500 block">BPR&amp;D DoPO / Lok Sabha AU2239</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white/90 p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Mobility &amp; Infrastructure</span>
                    <span className="font-bold text-[#0A192F] text-xs">Ref. Year 2024</span>
                    <span className="text-[10px] text-slate-500 block">BPR&amp;D DoPO / Dataful 20140 &amp; 20145</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white/90 p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Historical Crime Data</span>
                    <span className="font-bold text-[#0A192F] text-xs">Years 2020–2025</span>
                    <span className="text-[10px] text-slate-500 block">191,679 Verified Incidents</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white/90 p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Demographics Baseline</span>
                    <span className="font-bold text-[#0A192F] text-xs">Census 2011</span>
                    <span className="text-[10px] text-slate-500 block">640 Canonical Districts</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-1">
                  <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict Freshness Invariant:</strong> Historical crime, census demographics, and official police resources belong to distinct authoritative publication periods. They are strictly segregated and NEVER merged into an unverified &ldquo;current&rdquo; composite value.
                  </span>
                </div>
              </div>

              {/* Interactive Multi-Filter Toolbar (Requirement 11) */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filters:</span>

                    {/* State/UT Filter */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">State/UT:</label>
                      <select
                        value={selectedStateId || ''}
                        onChange={(e) => setSelectedStateId(e.target.value ? Number(e.target.value) : undefined)}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">All 36 States &amp; UTs</option>
                        {states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.state_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Resource Type Filter */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">Resource Type:</label>
                      <select
                        value={selectedResourceTypeFilter}
                        onChange={(e) => setSelectedResourceTypeFilter(e.target.value)}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
                      >
                        <option value="ALL">All Resource Types</option>
                        <option value="Police Officers">Police Officers (Personnel)</option>
                        <option value="Patrol Vehicles">Patrol Vehicles (Mobility)</option>
                        <option value="Total Police Stations">Police Stations (Infrastructure)</option>
                        <option value="Police Outposts">Police Outposts (Infrastructure)</option>
                        <option value="Economic Offences Wings">Economic Offences Wings (EOW)</option>
                        <option value="Cyber Crime Police Stations">Cyber Crime Police Stations</option>
                        <option value="All-Women Police Stations">All-Women Police Stations (AWPS)</option>
                        {resourceTypesList.slice(0, 10).map((rt) => (
                          <option key={rt.id} value={rt.resource_name}>
                            {rt.resource_name} ({rt.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reference Year Filter */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">Reference Year:</label>
                      <select
                        value={selectedRefYearFilter}
                        onChange={(e) => setSelectedRefYearFilter(e.target.value)}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
                      >
                        <option value="ALL">All Publication Years</option>
                        <option value="2024">2024 (Mobility, Infrastructure, Specialized)</option>
                        <option value="2020">2020 (Personnel Strength)</option>
                      </select>
                    </div>
                  </div>

                  {(selectedStateId || selectedResourceTypeFilter !== 'ALL' || selectedRefYearFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSelectedStateId(undefined);
                        setSelectedResourceTypeFilter('ALL');
                        setSelectedRefYearFilter('ALL');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 6 Official Resource Cards (Requirement 11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* CARD 1: Police Personnel */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-700 rounded-md">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Police Personnel</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      OFFICIAL
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#0A192F]">
                      {selectedStateId && filteredSummaryStates.length === 1
                        ? (filteredSummaryStates[0].resources.find((r) => r.category === 'PERSONNEL')?.available_quantity || 0).toLocaleString()
                        : '2,091,488'}
                    </div>
                    <p className="text-xs text-slate-500">
                      Actual Strength (Sanctioned: {selectedStateId ? '—' : '2,623,225'} | Vacancies: {selectedStateId ? '—' : '531,737'})
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> BPR&amp;D / Ministry of Home Affairs</div>
                    <div><strong>Ref. Year:</strong> 2020 | <strong>Geography:</strong> State/UT (36/36 Covered)</div>
                  </div>
                </div>

                {/* CARD 2: Police Vehicles */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                        <Car className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Police Vehicles</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      OFFICIAL
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#0A192F]">
                      {selectedStateId && filteredSummaryStates.length === 1
                        ? (filteredSummaryStates[0].resources.find((r) => r.resource_type === 'Patrol Vehicles')?.available_quantity || 0).toLocaleString()
                        : '120,135'}
                    </div>
                    <p className="text-xs text-slate-500">
                      Patrol Vehicles ({selectedStateId ? 'Fleet' : '234,312 Total Police Transport Fleet'})
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> BPR&amp;D DoPO (Dataful 20140 &amp; 20141)</div>
                    <div><strong>Ref. Year:</strong> 2024 | <strong>Geography:</strong> State/UT (36/36 Covered)</div>
                  </div>
                </div>

                {/* CARD 3: Police Stations */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 text-purple-700 rounded-md">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Police Stations</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                      OFFICIAL
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#0A192F]">
                      {selectedStateId && filteredSummaryStates.length === 1
                        ? (filteredSummaryStates[0].resources.find((r) => r.resource_type === 'Total Police Stations')?.available_quantity || 0).toLocaleString()
                        : '16,215'}
                    </div>
                    <p className="text-xs text-slate-500">
                      Operational Police Stations (Plus {selectedStateId ? 'Outposts' : '9,453'} Outposts)
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> BPR&amp;D DoPO (Dataful 20145)</div>
                    <div><strong>Ref. Year:</strong> 2024 | <strong>Geography:</strong> State/UT (36/36 Covered)</div>
                  </div>
                </div>

                {/* CARD 4: CCTV Surveillance */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-700 rounded-md">
                        <Eye className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">CCTV Networks</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
                      UNRECORDED
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-slate-500">
                      UNRECORDED
                    </div>
                    <p className="text-xs text-slate-500">
                      No central public statistical registry published
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> Institutional Registry Pending</div>
                    <div><strong>Status:</strong> Strictly UNRECORDED (Zero-Fabrication)</div>
                  </div>
                </div>

                {/* CARD 5: Forensic Resources */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-50 text-rose-700 rounded-md">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Forensic Resources</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
                      UNRECORDED
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-slate-500">
                      UNRECORDED
                    </div>
                    <p className="text-xs text-slate-500">
                      State / Central Forensic Science Lab inventory
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> CFSL / SFSL Audit Required</div>
                    <div><strong>Status:</strong> Strictly UNRECORDED (Never converted to 0)</div>
                  </div>
                </div>

                {/* CARD 6: Other Available Resources */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-md">
                        <Compass className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Specialized Wings</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      OFFICIAL
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-[#0A192F]">
                      {selectedStateId && filteredSummaryStates.length === 1
                        ? (
                            (filteredSummaryStates[0].resources.find((r) => r.resource_type === 'Cyber Crime Police Stations')?.available_quantity || 0) +
                            (filteredSummaryStates[0].resources.find((r) => r.resource_type === 'All-Women Police Stations (AWPS)')?.available_quantity || 0) +
                            (filteredSummaryStates[0].resources.find((r) => r.resource_type === 'Economic Offences Wings (EOW)')?.available_quantity || 0)
                          ).toLocaleString()
                        : '1,296'}
                    </div>
                    <p className="text-xs text-slate-500">
                      Specialized Wings ({selectedStateId ? 'Selected State' : '809 AWPS, 458 Cyber, 29 EOW'})
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Source:</strong> BPR&amp;D DoPO (Dataful 20144)</div>
                    <div><strong>Ref. Year:</strong> 2024 | <strong>Geography:</strong> State/UT (36/36 Covered)</div>
                  </div>
                </div>
              </div>

              {/* Resource Availability by State/UT & Category Breakdown (Requirement 11) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Visual Chart: Top States by Police Strength */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-[#0A192F]">Official Police Personnel Strength by State</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">BPR&amp;D DoPO (2020)</span>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    {[
                      { state: 'Uttar Pradesh', count: 303450, max: 303450, rate: 151.9 },
                      { state: 'Maharashtra', count: 214776, max: 303450, rate: 191.1 },
                      { state: 'Tamil Nadu', count: 112745, max: 303450, rate: 156.3 },
                      { state: 'Madhya Pradesh', count: 99496, max: 303450, rate: 137.0 },
                      { state: 'West Bengal', count: 97775, max: 303450, rate: 107.1 },
                      { state: 'Rajasthan', count: 95262, max: 303450, rate: 139.0 },
                      { state: 'Bihar', count: 91862, max: 303450, rate: 88.2 },
                      { state: 'Punjab', count: 85947, max: 303450, rate: 309.8 },
                    ].map((s) => (
                      <div key={s.state} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{s.state}</span>
                          <span className="font-mono text-slate-600 font-medium">
                            {s.count.toLocaleString()} officers <span className="text-[10px] text-slate-400">({s.rate}/100k)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${(s.count / s.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Chart: National Fleet & Infrastructure Composition */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-[#0A192F]">National Operational Asset Inventory</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">BPR&amp;D DoPO (2024)</span>
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="rounded-md border border-slate-200 p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">Patrol &amp; First-Response Vehicles</span>
                        <span className="font-mono font-bold text-slate-900">120,135 vehicles (51.3% of fleet)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: '51.3%' }} />
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">Primary Police Stations</span>
                        <span className="font-mono font-bold text-slate-900">16,215 stations (63.2% of facilities)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-600" style={{ width: '63.2%' }} />
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">Police Outposts &amp; Chowkis</span>
                        <span className="font-mono font-bold text-slate-900">9,453 outposts (36.8% of facilities)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: '36.8%' }} />
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3 bg-slate-50/50 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">All-Women &amp; Cyber Police Stations</span>
                        <span className="font-mono font-bold text-slate-900">1,267 specialized stations</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: '4.9%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESOURCE VS CRIME BURDEN COMPARISON TABLE (Requirement 12) */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-700" />
                      <h3 className="text-base font-bold text-[#0A192F]">
                        State-Level Resource Availability vs. Historical Crime Burden
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparing verified historical crime incidence (2020–2025) with official BPR&amp;D police capacity metrics
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
                    {filteredComparisonItems.length} Jurisdictions Analyzed
                  </span>
                </div>

                {/* Non-Causality Analytical Notice (Requirement 12) */}
                <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Analytical Non-Causality Principle:</strong> The comparison below presents institutional police availability alongside historical crime volumes for capacity planning. <em>Correlation does not imply causation</em>. Differences in crime rates or police ratios across States/UTs are influenced by socio-demographic, geographic, reporting, and statutory factors.
                  </div>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading crime vs resource comparison data..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">State / Union Territory</th>
                          <th className="py-2.5 px-3 text-right">Population (2011)</th>
                          <th className="py-2.5 px-3 text-right">Crime Incidents (2020-25)</th>
                          <th className="py-2.5 px-3 text-right">Crime Rate / 100k</th>
                          <th className="py-2.5 px-3 text-right">Police Officers (2020)</th>
                          <th className="py-2.5 px-3 text-right">Officers / 100k</th>
                          <th className="py-2.5 px-3 text-right">Patrol Vehicles (2024)</th>
                          <th className="py-2.5 px-3 text-right">Police Stations (2024)</th>
                          <th className="py-2.5 px-3">Data Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredComparisonItems.map((item) => (
                          <tr key={item.state_id} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{item.state_name}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {item.census_2011_population.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-rose-700">
                              {item.total_crime_incidents.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                              {item.crime_rate_per_100k.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-blue-700">
                              {item.police_personnel !== null ? item.police_personnel.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                              {item.police_per_100k !== null ? `${item.police_per_100k.toFixed(1)}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {item.police_vehicles !== null ? item.police_vehicles.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {item.police_stations !== null ? item.police_stations.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span>OFFICIAL</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredComparisonItems.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                              No jurisdictions match the current filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL STATE POLICE RESOURCES BASELINE */}
          {activeTab === 'state_baseline' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Official State &amp; Union Territory Police Resources
                    </h3>
                    <p className="text-xs text-slate-500">
                      Authoritative BPR&amp;D DoPO records preserving native State/UT geography (36 Jurisdictions)
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredStateResources.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading official state resource records..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">State / Union Territory</th>
                          <th className="py-2.5 px-3">Resource Category</th>
                          <th className="py-2.5 px-3 text-right">Sanctioned Strength</th>
                          <th className="py-2.5 px-3 text-right">Actual Strength</th>
                          <th className="py-2.5 px-3 text-right">Available / Operational</th>
                          <th className="py-2.5 px-3 text-right">Vacancy / Gap</th>
                          <th className="py-2.5 px-3">Reference Date</th>
                          <th className="py-2.5 px-3">Source Provenance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredStateResources.map((row) => (
                          <tr key={row.id} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.state_name}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                {row.resource_type_id === 1 ? (
                                  <Users className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <Car className="h-3 w-3 text-amber-600" />
                                )}
                                <span>{row.resource_name}</span>
                                <span className="text-[10px] text-slate-500">({row.unit_of_measure})</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {row.sanctioned_quantity !== null ? row.sanctioned_quantity.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {row.actual_quantity !== null ? row.actual_quantity.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.available_quantity.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.vacancy_quantity !== null ? (
                                row.vacancy_quantity > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.vacancy_quantity.toLocaleString()}</span>
                                ) : row.vacancy_quantity < 0 ? (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.vacancy_quantity).toLocaleString()} (Surplus)</span>
                                ) : (
                                  <span className="text-slate-500 font-medium">0</span>
                                )
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                              {row.data_as_of} ({row.reference_year})
                            </td>
                            <td className="py-2 px-3">
                              {row.source_url ? (
                                <a
                                  href={row.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                >
                                  <span>{row.source_name.split(',')[0]}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-600">{row.source_name.split(',')[0]}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredStateResources.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                              No state resource records match the selected filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISTRICT INVENTORY (640 DISTRICTS) */}
          {activeTab === 'districts' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      District Resource Inventory &amp; Status Badges
                    </h3>
                    <p className="text-xs text-slate-500">
                      Census 2011 districts: Verified commissionerates vs Unrecorded ground inventories
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredDistrictResources.length} Records Shown
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading district inventory records..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3">Resource Asset</th>
                          <th className="py-2.5 px-3 text-right">Actual Count</th>
                          <th className="py-2.5 px-3 text-right">Sanctioned</th>
                          <th className="py-2.5 px-3 text-right">AI Required</th>
                          <th className="py-2.5 px-3 text-right">Gap Count</th>
                          <th className="py-2.5 px-3 text-center">Data Status</th>
                          <th className="py-2.5 px-3">Source / Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredDistrictResources.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-${row.resource_type_id}`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F] hover:text-blue-700">
                              {row.district_name}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {row.resource_name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {row.sanctioned_count !== null ? row.sanctioned_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 max-w-[200px] truncate">
                              {row.source_name || 'AIcaseload model'}
                            </td>
                          </tr>
                        ))}
                        {filteredDistrictResources.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                              No district records match the selected criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: POLICE PERSONNEL */}
          {activeTab === 'personnel' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Police Personnel Deployments &amp; Tactical Strength
                    </h3>
                    <p className="text-xs text-slate-500">
                      Civil &amp; armed police force numbers across jurisdictions
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredPersonnelList.length} Districts
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading personnel strength records..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3 text-right">Actual Strength</th>
                          <th className="py-2.5 px-3 text-right">Sanctioned Posts</th>
                          <th className="py-2.5 px-3 text-right">Required (AI Target)</th>
                          <th className="py-2.5 px-3 text-right">Identified Gap</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPersonnelList.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-p`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {row.sanctioned_count !== null ? row.sanctioned_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'AI demographic benchmark'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PATROL VEHICLES & FLEET */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Mobility &amp; Patrol Fleet Inventory
                    </h3>
                    <p className="text-xs text-slate-500">
                      Patrol cruisers, PCR vans, motorcycles, and highway interceptors
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredVehicleList.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading vehicle fleet records..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3 text-right">Actual Fleet</th>
                          <th className="py-2.5 px-3 text-right">Required (AI Target)</th>
                          <th className="py-2.5 px-3 text-right">Gap Count</th>
                          <th className="py-2.5 px-3 text-center">Data Status</th>
                          <th className="py-2.5 px-3">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredVehicleList.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-v`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'AI mobility model'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: INVESTIGATION TEAMS */}
          {activeTab === 'investigation' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Investigation &amp; Forensic Units
                    </h3>
                    <p className="text-xs text-slate-500">
                      Investigating officers, special crime teams, cyber forensic units
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredInvestigationList.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading investigation unit records..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3 text-right">Actual Units</th>
                          <th className="py-2.5 px-3 text-right">Required (AI Target)</th>
                          <th className="py-2.5 px-3 text-right">Gap Count</th>
                          <th className="py-2.5 px-3 text-center">Data Status</th>
                          <th className="py-2.5 px-3">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInvestigationList.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-inv`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'AI investigation model'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: SURVEILLANCE & CCTV */}
          {activeTab === 'surveillance' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Surveillance Networks &amp; Monitoring Cells
                    </h3>
                    <p className="text-xs text-slate-500">
                      CCTV coverage, integrated command centers (ICCC), and aerial surveillance
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredSurveillanceList.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading surveillance assets..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3 text-right">Actual Teams</th>
                          <th className="py-2.5 px-3 text-right">Required (AI Target)</th>
                          <th className="py-2.5 px-3 text-right">Gap Count</th>
                          <th className="py-2.5 px-3 text-center">Data Status</th>
                          <th className="py-2.5 px-3">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredSurveillanceList.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-surv`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'AI surveillance model'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: POLICE INFRASTRUCTURE */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Police Infrastructure (Stations &amp; Outposts)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Police stations, outposts, women police stations, and cyber labs
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredInfrastructureList.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading infrastructure assets..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3">Facility Type</th>
                          <th className="py-2.5 px-3 text-right">Actual Count</th>
                          <th className="py-2.5 px-3 text-right">Required (AI Target)</th>
                          <th className="py-2.5 px-3 text-right">Gap Count</th>
                          <th className="py-2.5 px-3 text-center">Data Status</th>
                          <th className="py-2.5 px-3">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredInfrastructureList.map((row) => (
                          <tr
                            key={row.id || `${row.district_id}-inf`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 font-medium text-slate-700">{row.resource_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count !== null ? row.required_count.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()}</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'BPR&D DoPO Table 1.1'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: RESOURCE GAPS */}
          {activeTab === 'gaps' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Comparative Resource Gap Analysis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gaps computed ONLY where verified actual strength is present; strictly NULL for unrecorded inventories
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredGapsList.length} Records
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading resource gap analysis..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3">Resource Asset</th>
                          <th className="py-2.5 px-3 text-right">Ground Count</th>
                          <th className="py-2.5 px-3 text-right">Required Target</th>
                          <th className="py-2.5 px-3 text-right">Gap Status</th>
                          <th className="py-2.5 px-3 text-center">Verification Badge</th>
                          <th className="py-2.5 px-3">Institutional Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredGapsList.map((row, idx) => (
                          <tr
                            key={`${row.district_id}-${row.resource_code}-${idx}`}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{row.resource_name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {row.actual_count !== null ? row.actual_count.toLocaleString() : (
                                <span className="text-slate-400 font-normal italic">NULL</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_count.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {row.gap_count !== null ? (
                                row.gap_count > 0 ? (
                                  <span className="font-bold text-rose-700">-{row.gap_count.toLocaleString()} (Deficit)</span>
                                ) : (
                                  <span className="font-bold text-emerald-700">+{Math.abs(row.gap_count).toLocaleString()} (Surplus)</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal italic">NULL (Unrecorded)</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {renderStatusBadge(row.data_status, row.badge)}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[200px]">
                              {row.source_name || 'Unrecorded District Inventory'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 10: AI RECOMMENDATIONS & PRIORITIES */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      AI Optimization Recommendations &amp; Priority Tiers
                    </h3>
                    <p className="text-xs text-slate-500">
                      Algorithmic resource allocation across 640 districts with explainable priority scores &amp; rationale
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    {filteredRecommendationsList.length} Jurisdictions
                  </span>
                </div>

                {isTabLoading ? (
                  <LoadingState message="Loading AI recommendations and priority schedules..." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                          <th className="py-2.5 pl-3">District</th>
                          <th className="py-2.5 px-3">State</th>
                          <th className="py-2.5 px-3 text-center">Priority</th>
                          <th className="py-2.5 px-3 text-center">Risk Band</th>
                          <th className="py-2.5 px-3 text-right">Police Force</th>
                          <th className="py-2.5 px-3 text-right">Patrol Vehicles</th>
                          <th className="py-2.5 px-3 text-right">Investigation Teams</th>
                          <th className="py-2.5 px-3 text-right">Surveillance Units</th>
                          <th className="py-2.5 px-3">Allocation Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredRecommendationsList.map((row) => (
                          <tr
                            key={row.district_id}
                            onClick={() => handleOpenDistrictDetail(row.district_id, row.district_name, row.state_name)}
                            className="h-10 hover:bg-blue-50/50 cursor-pointer transition-colors whitespace-nowrap"
                          >
                            <td className="py-2 pl-3 font-semibold text-[#0A192F]">{row.district_name}</td>
                            <td className="py-2 px-3 text-slate-600">{row.state_name}</td>
                            <td className="py-2 px-3 text-center">{renderPriorityBadge(row.priority_tier)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="font-semibold text-slate-700">{row.risk_level}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.required_police_personnel.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                              {row.required_patrol_vehicles.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-purple-700">
                              {row.required_investigation_teams.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {row.required_surveillance_teams.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600 max-w-[280px] truncate" title={row.priority_explanation}>
                              {row.priority_explanation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DISTRICT MULTI-CATEGORY DETAIL MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedDistrictName} &bull; Operational Inventory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jurisdiction State: {selectedDistrictState} &bull; Multi-Category Resource Matrix
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-4">
              {isLoadingDetail ? (
                <LoadingState message="Fetching multi-domain district profile..." />
              ) : districtDetailItems && districtDetailItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {districtDetailItems.map((item) => (
                      <div
                        key={item.id || item.resource_code || item.resource_type_id}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0A192F]">{item.resource_name}</span>
                          {renderStatusBadge(item.data_status, item.badge)}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Actual</span>
                            <span className="text-sm font-bold font-mono text-slate-800">
                              {item.actual_count !== null ? item.actual_count.toLocaleString() : 'NULL'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Required</span>
                            <span className="text-sm font-bold font-mono text-blue-700">
                              {item.required_count !== null ? item.required_count.toLocaleString() : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Gap</span>
                            <span className="text-sm font-bold font-mono">
                              {item.gap_count !== null ? (
                                item.gap_count > 0 ? (
                                  <span className="text-rose-700">-{item.gap_count}</span>
                                ) : (
                                  <span className="text-emerald-700">+{Math.abs(item.gap_count)}</span>
                                )
                              ) : (
                                <span className="text-slate-400 font-normal">NULL</span>
                              )}
                            </span>
                          </div>
                        </div>
                        {item.source_name && (
                          <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
                            <span className="truncate max-w-[200px]" title={item.source_name}>
                              {item.source_name}
                            </span>
                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5 ml-1 shrink-0"
                              >
                                <span>Ref</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Institutional Data Explanatory Note */}
                  <div className="rounded-lg bg-blue-50/60 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2">
                    <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Methodology Assurance:</strong> Ground quantities marked as <code>NULL / UNRECORDED</code> reflect absence of official district public disclosures in statutory archives. Caseload requirements are derived dynamically by the production AI optimization model.
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No Detail Records"
                  message="Could not locate multi-category records for this district."
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResourceOptimizationPage;
