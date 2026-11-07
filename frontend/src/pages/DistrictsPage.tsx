import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  ShieldAlert,
  Layers,
  RotateCcw,
  Compass,
  AlertTriangle,
  Building,
  RefreshCw,
  Users,
  Info,
  GitBranch,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import TopDistrictsTable from '../components/charts/TopDistrictsTable';
import CrimeCategoryChart from '../components/charts/CrimeCategoryChart';
import CrimeTrendChart from '../components/charts/CrimeTrendChart';
import IndiaInteractiveMap from '../components/geography/IndiaInteractiveMap';
import DateRangeFilter from '../components/filters/DateRangeFilter';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi } from '../api';
import type {
  TopDistrictsResponse,
  StateItem,
  DistrictItem,
  DistrictDetailResponse,
  JurisdictionProfileResponse,
  StateCrimeSummaryItem,
  CategoryBreakdownItem,
  TrendItem,
} from '../types';

export const DistrictsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const geographyMode = (searchParams.get('geography_mode') || searchParams.get('view') || 'current') as
    | 'current'
    | 'historical';

  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(() => {
    const sId = searchParams.get('state_id');
    return sId ? Number(sId) : undefined;
  });
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(() => {
    const dId = searchParams.get('district_id');
    return dId ? Number(dId) : undefined;
  });

  const [startDate, setStartDate] = useState<string | undefined>(() => {
    const sDate = searchParams.get('start_date');
    if (sDate) return sDate;
    const yr = searchParams.get('year');
    if (yr && yr !== 'ALL') return `${yr}-01-01`;
    return undefined;
  });

  const [endDate, setEndDate] = useState<string | undefined>(() => {
    const eDate = searchParams.get('end_date');
    if (eDate) return eDate;
    const yr = searchParams.get('year');
    if (yr && yr !== 'ALL') return `${yr}-12-31`;
    return undefined;
  });

  // Table & Map Metric and Category state
  const [rankingMetric, setRankingMetric] = useState<'volume' | 'rate'>('volume');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');

  // Master Data State
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetailResponse | null>(null);
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);
  const [stateSummaries, setStateSummaries] = useState<StateCrimeSummaryItem[]>([]);

  // State Crime Analysis Data (Category breakdown & Trends)
  const [stateCategories, setStateCategories] = useState<CategoryBreakdownItem[]>([]);
  const [stateTrends, setStateTrends] = useState<TrendItem[]>([]);
  const [loadingStateAnalysis, setLoadingStateAnalysis] = useState<boolean>(false);

  // Jurisdiction Profile State
  const [jurisdictionProfile, setJurisdictionProfile] = useState<JurisdictionProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize temporal filters from URL params
  useEffect(() => {
    const sDate = searchParams.get('start_date');
    const eDate = searchParams.get('end_date');
    const yr = searchParams.get('year');

    if (sDate) {
      setStartDate(sDate);
    } else if (yr && yr !== 'ALL') {
      setStartDate(`${yr}-01-01`);
    } else {
      setStartDate(undefined);
    }

    if (eDate) {
      setEndDate(eDate);
    } else if (yr && yr !== 'ALL') {
      setEndDate(`${yr}-12-31`);
    } else {
      setEndDate(undefined);
    }
  }, [searchParams]);

  // Load States list
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      try {
        const res = await geographyApi.getStates(geographyMode);
        if (isMounted) {
          setStates(res.items);
          const stateParam = searchParams.get('state');
          const stateIdParam = searchParams.get('state_id');
          if (stateIdParam) {
            setSelectedStateId(Number(stateIdParam));
          } else if (stateParam) {
            const found = res.items.find(
              (s) => s.state_name.toLowerCase() === stateParam.toLowerCase()
            );
            if (found) setSelectedStateId(found.id);
          }
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    loadStates();
    return () => {
      isMounted = false;
    };
  }, [searchParams, geographyMode]);

  // Load Districts when state changes
  useEffect(() => {
    let isMounted = true;
    const loadDistricts = async () => {
      if (!selectedStateId) {
        setDistricts([]);
        return;
      }
      try {
        const res = await geographyApi.getDistricts(selectedStateId, geographyMode);
        if (isMounted) {
          setDistricts(res.items);
          const districtParam = searchParams.get('district');
          const districtIdParam = searchParams.get('district_id');
          if (districtIdParam) {
            setSelectedDistrictId(Number(districtIdParam));
          } else if (districtParam) {
            const found = res.items.find(
              (d) => d.district_name.toLowerCase() === districtParam.toLowerCase()
            );
            if (found) setSelectedDistrictId(found.id);
          }
        }
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    };
    loadDistricts();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId, searchParams, geographyMode]);

  // Load District Detail with Demographics
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedDistrictId) {
        setDistrictDetail(null);
        return;
      }
      try {
        const res = await geographyApi.getDistrictDetail(selectedDistrictId);
        setDistrictDetail(res);
      } catch (err) {
        console.error('Failed to load district detail:', err);
      }
    };
    loadDetail();
  }, [selectedDistrictId]);

  // Fetch Nationwide State Summaries for Choropleth Map
  const fetchStateSummaries = useCallback(async () => {
    try {
      const res = await geographyApi.getStateCrimeSummary({
        view: geographyMode,
        start_date: startDate,
        end_date: endDate,
        category_id: selectedCategoryId,
      });
      setStateSummaries(res.items);
    } catch (err) {
      console.error('Failed to load state crime summaries:', err);
    }
  }, [geographyMode, startDate, endDate, selectedCategoryId]);

  useEffect(() => {
    fetchStateSummaries();
  }, [fetchStateSummaries]);

  // Fetch Jurisdiction Profile
  const fetchJurisdictionProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await geographyApi.getJurisdictionProfile({
        scope: !selectedStateId && !selectedDistrictId ? 'national' : undefined,
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        geography_mode: geographyMode,
        start_date: startDate,
        end_date: endDate,
      });
      setJurisdictionProfile(res);
    } catch (err: any) {
      console.error('Failed to load jurisdiction profile:', err);
      setProfileError(
        err?.response?.data?.detail || err?.message || 'Failed to load jurisdiction profile data.'
      );
      setJurisdictionProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [selectedStateId, selectedDistrictId, geographyMode, startDate, endDate]);

  useEffect(() => {
    fetchJurisdictionProfile();
  }, [fetchJurisdictionProfile]);

  // Load Top Districts ranking (State-level or National)
  const fetchTopDistricts = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const data = await analyticsApi.getTopDistricts({
          metric: rankingMetric,
          limit: selectedStateId ? 100 : 25,
          state_id: selectedStateId,
          category_id: selectedCategoryId,
          geography_mode: geographyMode,
          start_date: startDate,
          end_date: endDate,
        });
        setTopDistricts(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load geographic crime data.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStateId, rankingMetric, selectedCategoryId, geographyMode, startDate, endDate]
  );

  useEffect(() => {
    fetchTopDistricts();
  }, [fetchTopDistricts]);

  // Fetch State-Wise Crime Analysis (Categories & Trends) when a state is selected
  useEffect(() => {
    if (!selectedStateId) {
      setStateCategories([]);
      setStateTrends([]);
      return;
    }

    let isMounted = true;
    const fetchStateAnalysis = async () => {
      setLoadingStateAnalysis(true);
      try {
        const [catRes, trendRes] = await Promise.all([
          analyticsApi.getByCategory({
            state_id: selectedStateId,
            geography_mode: geographyMode,
            start_date: startDate,
            end_date: endDate,
          }),
          analyticsApi.getTrends(trendInterval, {
            state_id: selectedStateId,
            geography_mode: geographyMode,
            start_date: startDate,
            end_date: endDate,
          }),
        ]);

        if (isMounted) {
          setStateCategories(catRes.items);
          setStateTrends(trendRes.items);
        }
      } catch (err) {
        console.error('Failed to load state crime breakdown analysis:', err);
      } finally {
        if (isMounted) setLoadingStateAnalysis(false);
      }
    };

    fetchStateAnalysis();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId, geographyMode, startDate, endDate, trendInterval]);

  // Construct map of district statistics for selected state
  const districtStatsMap = useMemo(() => {
    const map: Record<
      number,
      {
        incident_count: number;
        total_population?: number | null;
        crime_rate_per_100k?: number | null;
        is_census_2011?: boolean;
      }
    > = {};

    if (topDistricts?.items) {
      topDistricts.items.forEach((item) => {
        map[item.district_id] = {
          incident_count: item.incident_count,
          total_population: item.total_population,
          crime_rate_per_100k: item.crime_rate_per_100k,
          is_census_2011: !item.is_derived_from_parent,
        };
      });
    }

    return map;
  }, [topDistricts]);

  const selectedStateName = useMemo(() => {
    if (!selectedStateId) return null;
    return states.find((s) => s.id === selectedStateId)?.state_name;
  }, [selectedStateId, states]);

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return null;
    return (
      districts.find((d) => d.id === selectedDistrictId)?.district_name ||
      districtDetail?.district_name ||
      jurisdictionProfile?.district_name
    );
  }, [selectedDistrictId, districts, districtDetail, jurisdictionProfile]);

  const profileHeading = useMemo(() => {
    if (selectedDistrictId) {
      const dist = selectedDistrictName || 'Selected District';
      const st = selectedStateName || districtDetail?.state_name || jurisdictionProfile?.state_name || '';
      return `${dist}${st ? `, ${st}` : ''}`;
    }
    if (selectedStateName) {
      return `${selectedStateName} (State Overview)`;
    }
    return 'All States & UTs (National Overview)';
  }, [selectedDistrictId, selectedDistrictName, selectedStateName, districtDetail, jurisdictionProfile]);

  const handleStateChange = (stateId?: number) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    const nextParams = new URLSearchParams(searchParams);
    if (stateId) {
      nextParams.set('state_id', String(stateId));
    } else {
      nextParams.delete('state_id');
    }
    nextParams.delete('district_id');
    nextParams.delete('state');
    nextParams.delete('district');
    setSearchParams(nextParams, { replace: true });
  };

  const handleDistrictChange = (districtId?: number) => {
    setSelectedDistrictId(districtId);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    const nextParams = new URLSearchParams(searchParams);
    if (districtId) {
      nextParams.set('district_id', String(districtId));
    } else {
      nextParams.delete('district_id');
    }
    nextParams.delete('district');
    setSearchParams(nextParams, { replace: true });
  };

  const handleDateChange = (newStart?: string, newEnd?: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    const nextParams = new URLSearchParams(searchParams);
    if (newStart) {
      nextParams.set('start_date', newStart);
    } else {
      nextParams.delete('start_date');
    }
    if (newEnd) {
      nextParams.set('end_date', newEnd);
    } else {
      nextParams.delete('end_date');
    }
    nextParams.delete('year');
    setSearchParams(nextParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedCategoryId(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('state_id');
    nextParams.delete('district_id');
    nextParams.delete('state');
    nextParams.delete('district');
    nextParams.delete('start_date');
    nextParams.delete('end_date');
    nextParams.delete('year');
    setSearchParams(nextParams, { replace: true });
  };

  const hasActiveFilters = Boolean(
    selectedStateId !== undefined ||
    selectedDistrictId !== undefined ||
    selectedCategoryId !== undefined ||
    startDate !== undefined ||
    endDate !== undefined
  );

  return (
    <DashboardLayout
      hideSidebar
      icon={MapPin}
      title="Geographic Intelligence"
      onRefresh={() => {
        fetchTopDistricts(true);
        fetchJurisdictionProfile();
        fetchStateSummaries();
      }}
      isRefreshing={isRefreshing}
    >
      {/* State, District & Date Lookup Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
              <Compass className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Jurisdiction:</span>
            </div>

            {/* State Selector */}
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                handleStateChange(val);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States / UTs (National)</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>

            {/* District Selector (Visible when State selected) */}
            {selectedStateId && (
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  handleDistrictChange(val);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">All Districts in State</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name} {!d.is_census_2011 ? '(Carved)' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Universal Date Range Filter */}
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              disabled={isLoading}
            />
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating spatial crime density and jurisdiction boundaries..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Geographic Data Error"
          message={error}
          onRetry={() => fetchTopDistricts()}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {/* SECTION 1: Interactive GIS India Choropleth Map */}
          <IndiaInteractiveMap
            stateData={stateSummaries}
            selectedStateId={selectedStateId}
            onSelectState={handleStateChange}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={handleDistrictChange}
            stateDistricts={districts}
            districtStatsMap={districtStatsMap}
            geographyMode={geographyMode}
            isLoading={isRefreshing}
            metric={rankingMetric}
            onMetricChange={setRankingMetric}
          />

          {/* SECTION 2: Jurisdiction Profile Section */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs transition-all">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                  Jurisdiction Profile: {profileHeading}
                </h3>
              </div>
            </div>

            {profileError ? (
              <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                <span>{profileError}</span>
                <button
                  type="button"
                  onClick={() => fetchJurisdictionProfile()}
                  className="inline-flex items-center gap-1 font-bold text-[#C53B3B] hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : loadingProfile ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#1769AA]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1769AA] border-t-transparent" />
                <span className="text-xs font-medium">
                  Aggregating jurisdictional profile metrics...
                </span>
              </div>
            ) : jurisdictionProfile ? (
              <div className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Metric 1: Total Crime Incidents */}
                  <div className="rounded border border-blue-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Total Crime Incidents
                    </span>
                    <p className="mt-1 text-xl font-bold font-mono text-[#0B1F3A]">
                      {jurisdictionProfile.reported_incidents !== null &&
                      jurisdictionProfile.reported_incidents !== undefined
                        ? jurisdictionProfile.reported_incidents.toLocaleString()
                        : 'Not available'}
                    </p>
                  </div>

                  {/* Metric 2: Total Population (Census 2011) */}
                  <div className="rounded border border-blue-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Total Population
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        Census 2011
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono text-[#0B1F3A]">
                      {jurisdictionProfile.population !== null && jurisdictionProfile.population !== undefined
                        ? jurisdictionProfile.population.toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>

                  {/* Metric 3: Crime Rate per 100,000 People */}
                  <div className="rounded border border-blue-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Crime Rate per 100,000 People
                    </span>
                    <p className="mt-1 text-xl font-bold font-mono text-[#1769AA]">
                      {jurisdictionProfile.crime_rate_per_100k !== null &&
                      jurisdictionProfile.crime_rate_per_100k !== undefined
                        ? jurisdictionProfile.crime_rate_per_100k.toFixed(1)
                        : 'N/A'}
                    </p>
                  </div>

                  {/* Metric 4: Risk Level */}
                  <div className="rounded border border-blue-200/80 bg-white p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Risk Level
                    </span>
                    <div className="mt-1">
                      {jurisdictionProfile.risk_level === 'CRITICAL' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold border border-red-200">
                          <AlertTriangle className="h-3 w-3" />
                          Critical Risk Hotspot{' '}
                          {jurisdictionProfile.risk_score
                            ? `(${jurisdictionProfile.risk_score.toFixed(1)})`
                            : ''}
                        </span>
                      ) : jurisdictionProfile.risk_level === 'HIGH' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold border border-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          High Risk Hotspot{' '}
                          {jurisdictionProfile.risk_score
                            ? `(${jurisdictionProfile.risk_score.toFixed(1)})`
                            : ''}
                        </span>
                      ) : jurisdictionProfile.risk_level === 'MODERATE' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold border border-blue-200">
                          <ShieldAlert className="h-3 w-3" />
                          Moderate Crime Zone{' '}
                          {jurisdictionProfile.risk_score
                            ? `(${jurisdictionProfile.risk_score.toFixed(1)})`
                            : ''}
                        </span>
                      ) : jurisdictionProfile.risk_level === 'LOW' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold border border-emerald-200">
                          Low Incidence Area{' '}
                          {jurisdictionProfile.risk_score
                            ? `(${jurisdictionProfile.risk_score.toFixed(1)})`
                            : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-semibold border border-slate-200">
                          {jurisdictionProfile.risk_label || 'Not available'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanatory Lineage Notes */}
                {jurisdictionProfile.notes && (
                  <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-[#5D6878] bg-white/70 p-2 rounded border border-blue-100">
                    <Info className="h-3.5 w-3.5 text-[#1769AA] shrink-0 mt-0.5" />
                    <span>{jurisdictionProfile.notes}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* SECTION 3: State-Wise Crime Analysis (Visible when a State is Selected) */}
          {selectedStateId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded p-1 bg-[#EAF3FA] text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0B1F3A]">
                    {selectedStateName} — State Crime Analysis & Temporal Dynamics
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  State ID #{selectedStateId}
                </span>
              </div>

              {loadingStateAnalysis ? (
                <div className="p-8 bg-white rounded-lg border border-[#D9E1EA]">
                  <LoadingState message={`Aggregating crime categories and longitudinal trends for ${selectedStateName}...`} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Category Breakdown Donut */}
                  <div className="lg:col-span-5">
                    <CrimeCategoryChart
                      data={stateCategories}
                      totalIncidents={stateCategories.reduce((acc, c) => acc + c.incident_count, 0)}
                    />
                  </div>

                  {/* Longitudinal Trend Chart */}
                  <div className="lg:col-span-7">
                    <CrimeTrendChart
                      data={stateTrends}
                      interval={trendInterval}
                      onIntervalChange={(newInt) => setTrendInterval(newInt)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: District Demographic Profile (Visible when a District is Selected) */}
          {selectedDistrictId && districtDetail && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                    Census 2011 Demographic Profile: {districtDetail.district_name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Census Year: 2011 Baseline
                  </span>
                  {districtDetail.is_derived_from_parent && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      Derived Lineage
                    </span>
                  )}
                </div>
              </div>

              {districtDetail.demographics ? (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA]">
                    <span className="text-slate-500 uppercase text-[10px]">Total Population</span>
                    <p className="font-mono font-bold text-base text-[#0B1F3A] mt-0.5">
                      {districtDetail.demographics.total_population.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA]">
                    <span className="text-slate-500 uppercase text-[10px]">Gender Distribution</span>
                    <p className="font-mono text-[11px] text-[#0B1F3A] mt-0.5">
                      Male: {districtDetail.demographics.male_population.toLocaleString()} (
                      {(
                        (districtDetail.demographics.male_population /
                          districtDetail.demographics.total_population) *
                        100
                      ).toFixed(1)}
                      %)
                    </p>
                    <p className="font-mono text-[11px] text-[#0B1F3A]">
                      Female: {districtDetail.demographics.female_population.toLocaleString()} (
                      {(
                        (districtDetail.demographics.female_population /
                          districtDetail.demographics.total_population) *
                        100
                      ).toFixed(1)}
                      %)
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA]">
                    <span className="text-slate-500 uppercase text-[10px]">Literate Population</span>
                    <p className="font-mono font-bold text-base text-[#1769AA] mt-0.5">
                      {districtDetail.demographics.literate_population.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Literacy Rate:{' '}
                      {(
                        (districtDetail.demographics.literate_population /
                          districtDetail.demographics.total_population) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#D9E1EA]">
                    <span className="text-slate-500 uppercase text-[10px]">Total Workforce</span>
                    <p className="font-mono font-bold text-base text-[#0B1F3A] mt-0.5">
                      {districtDetail.demographics.total_workers.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Work Participation:{' '}
                      {(
                        (districtDetail.demographics.total_workers /
                          districtDetail.demographics.total_population) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded bg-amber-50/70 border border-amber-200 text-xs text-amber-800">
                  <p className="font-semibold">Census 2011 Standalone Demographics Unavailable</p>
                  <p className="text-[11px] mt-0.5 text-amber-700">
                    {districtDetail.notes ||
                      `This modern carved administrative district does not have an independent Census 2011 enumeration record. Lineage is mapped to parent jurisdiction #${districtDetail.parent_district_id}. Standalone enumeration awaits upcoming decennial Census.`}
                  </p>
                </div>
              )}

              {/* Urban / Rural Demographics Specification Note */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  <strong>Urban / Rural Disaggregation:</strong> N/A (Census 2011 administrative baseline does not separate urban/rural aggregates at district table level).
                </span>
                <span className="font-mono text-[10px]">
                  LGD Code: {districtDetail.lgd_code || 'N/A'} | Census Code: {districtDetail.census_district_code || 'N/A'}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 5: District Crime Comparison & Ranking Table */}
          {topDistricts && (
            <TopDistrictsTable
              districts={topDistricts.items}
              metric={rankingMetric}
              onMetricChange={setRankingMetric}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              isLoading={isRefreshing}
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={handleDistrictChange}
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DistrictsPage;
