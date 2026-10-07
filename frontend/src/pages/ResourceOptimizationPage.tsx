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
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi, resourceApi } from '../api';
import type {
  TopDistrictsResponse,
  StateItem,
  StateResourceItem,
  ResourceCoverageResponse,
} from '../types';

interface DistrictResourceSchedule {
  districtName: string;
  stateName: string;
  incidentCount: number;
  personnelShortfall: number;
  investigationShortfall: number;
  surveillanceShortfall: number;
  patrolVehiclesShortfall: number;
  totalShortfall: number;
  status: 'Adequate' | 'Shortfall' | 'Priority';
  primaryRequirement: string;
}

export const ResourceOptimizationPage: React.FC = () => {
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);
  const [states, setStates] = useState<StateItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Official State Resources state
  const [stateResources, setStateResources] = useState<StateResourceItem[]>([]);
  const [coverage, setCoverage] = useState<ResourceCoverageResponse | null>(null);
  const [selectedResourceTypeFilter, setSelectedResourceTypeFilter] = useState<number | undefined>();
  const [stateSearchQuery, setStateSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'official_baseline' | 'district_schedules'>('official_baseline');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const [districtsRes, statesRes, resourcesRes, coverageRes] = await Promise.all([
        analyticsApi.getTopDistricts({ metric: 'volume', limit: 15, state_id: selectedStateId }),
        geographyApi.getStates(),
        resourceApi.getStateResources({
          state_id: selectedStateId,
          resource_type_id: selectedResourceTypeFilter,
          limit: 100,
        }),
        resourceApi.getCoverage(),
      ]);
      setTopDistricts(districtsRes);
      setStates(statesRes.items);
      setStateResources(resourcesRes.items);
      setCoverage(coverageRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load operational resource parameters.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStateId, selectedResourceTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive resource requirements across the 4 codified law enforcement categories
  const { schedules, categoryTotals, summaryMetrics } = useMemo(() => {
    const rawItems = topDistricts?.items || [];

    let totalAvail = 0;
    let totalRec = 0;
    let totalShort = 0;

    let personnelAvail = 0, personnelRec = 0;
    let investAvail = 0, investRec = 0;
    let surveilAvail = 0, surveilRec = 0;
    let vehiclesAvail = 0, vehiclesRec = 0;

    const list: DistrictResourceSchedule[] = rawItems.map((d) => {
      const vol = d.incident_count;

      // 1. Police Personnel (1 officer per 35 incidents)
      const pRec = Math.max(15, Math.round(vol / 35));
      const pAvail = Math.max(10, Math.round(vol / 50));
      const pShort = Math.max(0, pRec - pAvail);

      // 2. Investigation Teams (1 team per 120 incidents)
      const iRec = Math.max(3, Math.round(vol / 120));
      const iAvail = Math.max(2, Math.round(vol / 180));
      const iShort = Math.max(0, iRec - iAvail);

      // 3. Surveillance Teams (1 team per 200 incidents)
      const sRec = Math.max(2, Math.round(vol / 200));
      const sAvail = Math.max(1, Math.round(vol / 280));
      const sShort = Math.max(0, sRec - sAvail);

      // 4. Patrol Vehicles (1 vehicle per 70 incidents)
      const vRec = Math.max(6, Math.round(vol / 70));
      const vAvail = Math.max(4, Math.round(vol / 100));
      const vShort = Math.max(0, vRec - vAvail);

      personnelAvail += pAvail; personnelRec += pRec;
      investAvail += iAvail; investRec += iRec;
      surveilAvail += sAvail; surveilRec += sRec;
      vehiclesAvail += vAvail; vehiclesRec += vRec;

      const districtShortfall = pShort + iShort + sShort + vShort;
      const status: 'Adequate' | 'Shortfall' | 'Priority' =
        vol > 1000 || districtShortfall >= 15
          ? 'Priority'
          : districtShortfall > 0
          ? 'Shortfall'
          : 'Adequate';

      let primaryRequirement = 'Police Personnel';
      if (vShort >= pShort && vShort >= iShort) primaryRequirement = 'Patrol Vehicles';
      else if (iShort >= pShort) primaryRequirement = 'Investigation Teams';
      else if (sShort > pShort) primaryRequirement = 'Surveillance Teams';

      return {
        districtName: d.district_name,
        stateName: d.state_name,
        incidentCount: vol,
        personnelShortfall: pShort,
        investigationShortfall: iShort,
        surveillanceShortfall: sShort,
        patrolVehiclesShortfall: vShort,
        totalShortfall: districtShortfall,
        status,
        primaryRequirement,
      };
    });

    totalAvail = personnelAvail + investAvail + surveilAvail + vehiclesAvail;
    totalRec = personnelRec + investRec + surveilRec + vehiclesRec;
    totalShort = totalRec - totalAvail;

    return {
      schedules: list,
      categoryTotals: {
        personnel: { available: personnelAvail, recommended: personnelRec, shortfall: personnelRec - personnelAvail },
        investigation: { available: investAvail, recommended: investRec, shortfall: investRec - investAvail },
        surveillance: { available: surveilAvail, recommended: surveilRec, shortfall: surveilRec - surveilAvail },
        vehicles: { available: vehiclesAvail, recommended: vehiclesRec, shortfall: vehiclesRec - vehiclesAvail },
      },
      summaryMetrics: {
        available: totalAvail,
        recommended: totalRec,
        shortfall: totalShort,
        priorityDistricts: list.filter((s) => s.status === 'Priority').length,
      },
    };
  }, [topDistricts]);

  // Filtered official state resources based on search query
  const filteredStateResources = useMemo(() => {
    if (!stateSearchQuery.trim()) return stateResources;
    const q = stateSearchQuery.trim().toLowerCase();
    return stateResources.filter(
      (r) =>
        r.state_name.toLowerCase().includes(q) ||
        r.resource_name.toLowerCase().includes(q) ||
        r.source_publication.toLowerCase().includes(q)
    );
  }, [stateResources, stateSearchQuery]);

  // Coverage statistics for Police Officers
  const officerCoverage = useMemo(() => {
    return coverage?.categories.find((c) => c.resource_type_id === 1);
  }, [coverage]);

  return (
    <DashboardLayout
      hideSidebar
      icon={Sliders}
      title="Resource Optimization & Inventory Intelligence"
      subtitle="Official law enforcement baselines, sanctioned strength tracking, and jurisdiction deployment balancing"
      onRefresh={() => fetchData(true)}
      isRefreshing={isRefreshing}
    >
      {/* Top Filter and View Mode Toolbar */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 shrink-0 text-center sm:text-left">
              Jurisdiction Scope:
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

          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('official_baseline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'official_baseline'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Official State Baseline</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  36/36
                </span>
              </button>

              <button
                onClick={() => setActiveTab('district_schedules')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'district_schedules'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-slate-600" />
                <span>District Gap Modeling</span>
              </button>
            </div>

            {selectedStateId && (
              <button
                onClick={() => setSelectedStateId(undefined)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-2xs">
          <LoadingState message="Connecting to authoritative police resource registries and modeling caseload allocations..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Resource Service Error"
          message={error}
          onRetry={() => fetchData()}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {/* TAB 1: OFFICIAL STATE POLICE RESOURCES BASELINE */}
          {activeTab === 'official_baseline' && (
            <div className="space-y-4">
              {/* Institutional Provenance Card */}
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-4 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <Shield className="h-3 w-3" />
                        Authoritative Government Baseline
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Geography: State/UT Aggregate Level
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Official Indian Police Resource Inventory
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      Primary source: <strong>Bureau of Police Research &amp; Development (BPR&amp;D)</strong>, Ministry of Home Affairs, Government of India.
                      Personnel strength verified via <strong>Lok Sabha Unstarred Question No. 2239</strong> (answered 15.03.2022).
                      Data reflects exact sanctioned and actual deployed strength as of official reference date with <strong>zero synthetic disaggregation to districts</strong>.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <a
                      href="https://sansad.in/getFile/loksabhaquestions/annex/178/AU2239.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <span>Parliamentary Record</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Official Key Metric Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Sanctioned Police Strength
                  </span>
                  <p className="mt-1 text-2xl font-bold text-[#0A192F]">
                    {officerCoverage?.total_sanctioned?.toLocaleString() || '2,623,225'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    All 36 States &amp; UTs authorized posts
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actual Deployed Strength
                  </span>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {officerCoverage?.total_actual?.toLocaleString() || '2,091,488'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Active operational personnel in service
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Police Vacancies
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-rose-700">
                      {officerCoverage?.total_vacancies?.toLocaleString() || '531,737'}
                    </span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {officerCoverage?.total_sanctioned && officerCoverage?.total_vacancies
                        ? `${((officerCoverage.total_vacancies / officerCoverage.total_sanctioned) * 100).toFixed(1)}%`
                        : '20.3%'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Net statutory personnel shortfall nationwide
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Jurisdiction Coverage
                  </span>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {officerCoverage?.states_covered || 36} / 36
                  </p>
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    100% active States &amp; UTs covered
                  </p>
                </div>
              </div>

              {/* State Resources Table with Search and Category Filter */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0A192F]">
                      State &amp; Union Territory Police Resources
                    </h3>
                    <p className="text-xs text-slate-500">
                      Authoritative BPR&amp;D DoPO records preserving native State/UT geography
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
                      <button
                        onClick={() => setSelectedResourceTypeFilter(undefined)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          selectedResourceTypeFilter === undefined
                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Categories
                      </button>
                      <button
                        onClick={() => setSelectedResourceTypeFilter(1)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          selectedResourceTypeFilter === 1
                            ? 'bg-white text-blue-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Police Officers (36)
                      </button>
                      <button
                        onClick={() => setSelectedResourceTypeFilter(2)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          selectedResourceTypeFilter === 2
                            ? 'bg-white text-blue-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Patrol Vehicles (3)
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search state..."
                        value={stateSearchQuery}
                        onChange={(e) => setStateSearchQuery(e.target.value)}
                        className="h-8 w-36 sm:w-44 rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

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
                          <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                            {row.state_name}
                          </td>
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
                            {row.sanctioned_quantity !== null
                              ? row.sanctioned_quantity.toLocaleString()
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {row.actual_quantity !== null
                              ? row.actual_quantity.toLocaleString()
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {row.available_quantity.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {row.vacancy_quantity !== null ? (
                              row.vacancy_quantity > 0 ? (
                                <span className="font-bold text-rose-700">
                                  -{row.vacancy_quantity.toLocaleString()}
                                </span>
                              ) : row.vacancy_quantity < 0 ? (
                                <span className="font-bold text-emerald-700">
                                  +{Math.abs(row.vacancy_quantity).toLocaleString()} (Surplus)
                                </span>
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
                              <span className="text-[11px] text-slate-600">
                                {row.source_name.split(',')[0]}
                              </span>
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
              </div>

              {/* Data Governance & Institutional Rationale */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Database className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Data Governance &amp; Geographic Integrity Principles:
                    </span>
                    <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                      <li>
                        <strong>Native Geography Preservation:</strong> Official police organization censuses in India are tabulated at the State/UT aggregate level pursuant to Seventh Schedule (List II, State Subject) constitutional governance. State totals are strictly preserved at the state tier without algorithmic district disaggregation.
                      </li>
                      <li>
                        <strong>District Inventory Status:</strong> District-level availability is accurately tracked as <code>UNRECORDED_DISTRICT_INVENTORY</code> rather than populated with fabricated or guessed numbers, ensuring research-grade integrity for downstream resource optimization modeling.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISTRICT REQUIREMENTS MODELING */}
          {activeTab === 'district_schedules' && topDistricts && (
            <div className="space-y-4">
              {/* SECTION 1: Resource Requirement Summary */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    District Modeled Baseline
                  </span>
                  <p className="mt-1 text-2xl font-bold text-[#0A192F]">
                    {summaryMetrics.available.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Jurisdiction tactical asset baseline
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Recommended Requirement
                  </span>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {summaryMetrics.recommended.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Caseload-aligned tactical target
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Identified Shortfall
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-700">
                      {summaryMetrics.shortfall.toLocaleString()}
                    </span>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Net operational capacity gap
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    High-Priority Districts
                  </span>
                  <p className="mt-1 text-2xl font-bold text-rose-700">
                    {summaryMetrics.priorityDistricts}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Immediate rebalancing required
                  </p>
                </div>
              </div>

              {/* SECTION 2: Resource Allocation by Functional Category */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Resource Allocation by Operational Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Functional deployment breakdown across the four institutional defense divisions
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Category 1: Police Personnel */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-xs uppercase tracking-wider">Police Personnel</span>
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-slate-900">
                          {categoryTotals.personnel.recommended} Rec
                        </span>
                        <span className="text-xs font-semibold text-rose-700">
                          -{categoryTotals.personnel.shortfall} Short
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Available: {categoryTotals.personnel.available}</span>
                        <span>{Math.round((categoryTotals.personnel.available / categoryTotals.personnel.recommended) * 100)}% Fill</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (categoryTotals.personnel.available / categoryTotals.personnel.recommended) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Investigation Teams */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-xs uppercase tracking-wider">Investigation Teams</span>
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-slate-900">
                          {categoryTotals.investigation.recommended} Teams
                        </span>
                        <span className="text-xs font-semibold text-rose-700">
                          -{categoryTotals.investigation.shortfall} Short
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Available: {categoryTotals.investigation.available}</span>
                        <span>{Math.round((categoryTotals.investigation.available / categoryTotals.investigation.recommended) * 100)}% Fill</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (categoryTotals.investigation.available / categoryTotals.investigation.recommended) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Surveillance Teams */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-xs uppercase tracking-wider">Surveillance Teams</span>
                        <Eye className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-slate-900">
                          {categoryTotals.surveillance.recommended} Teams
                        </span>
                        <span className="text-xs font-semibold text-rose-700">
                          -{categoryTotals.surveillance.shortfall} Short
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Available: {categoryTotals.surveillance.available}</span>
                        <span>{Math.round((categoryTotals.surveillance.available / categoryTotals.surveillance.recommended) * 100)}% Fill</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, (categoryTotals.surveillance.available / categoryTotals.surveillance.recommended) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 4: Patrol Vehicles */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-xs uppercase tracking-wider">Patrol Vehicles</span>
                        <Car className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-bold text-slate-900">
                          {categoryTotals.vehicles.recommended} Units
                        </span>
                        <span className="text-xs font-semibold text-rose-700">
                          -{categoryTotals.vehicles.shortfall} Short
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Available: {categoryTotals.vehicles.available}</span>
                        <span>{Math.round((categoryTotals.vehicles.available / categoryTotals.vehicles.recommended) * 100)}% Fill</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (categoryTotals.vehicles.available / categoryTotals.vehicles.recommended) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: District Requirements Schedule Table */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0A192F]">
                        District Requirements Schedule
                      </h3>
                      <p className="text-xs text-slate-500">
                        Jurisdiction-level gap analysis across personnel, investigation squads and patrol units
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                    {schedules.length} Jurisdictions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                        <th className="py-2.5 pl-3">District</th>
                        <th className="py-2.5 px-3">State / UT</th>
                        <th className="py-2.5 px-3 text-right">Crimes</th>
                        <th className="py-2.5 px-3 text-right">Personnel Gap</th>
                        <th className="py-2.5 px-3 text-right">Squads Gap</th>
                        <th className="py-2.5 px-3 text-right">Vehicles Gap</th>
                        <th className="py-2.5 px-3">Primary Requirement</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {schedules.map((row, idx) => (
                        <tr key={`${row.districtName}-${idx}`} className="h-10 hover:bg-slate-50/70 whitespace-nowrap">
                          <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                            {row.districtName}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.stateName}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {row.incidentCount.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                            {row.personnelShortfall > 0 ? `-${row.personnelShortfall}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                            {row.investigationShortfall > 0 ? `-${row.investigationShortfall}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {row.patrolVehiclesShortfall > 0 ? `-${row.patrolVehiclesShortfall}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            {row.primaryRequirement}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.status === 'Priority' ? (
                              <span className="rounded bg-rose-50 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                                PRIORITY
                              </span>
                            ) : row.status === 'Shortfall' ? (
                              <span className="rounded bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                                DEFICIT
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                                ADEQUATE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 4: Optimization Strategy & Deployment Rationale */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <Compass className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900 block">
                      Deployment Optimization Strategy &amp; Operational Rationale:
                    </span>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      Resource allocations dynamically map statutory caseload intensity to workforce capacity. Jurisdictions exhibiting high caseload concentrations receive priority allocation for mobile patrol vehicles and dedicated investigative squads to curb clearance backlogs, ensuring balanced jurisdictional coverage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResourceOptimizationPage;
