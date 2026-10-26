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
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import TopDistrictsTable from '../components/charts/TopDistrictsTable';
import { CrimeTrendChart } from '../components/charts/CrimeTrendChart';
import { CrimeCategoryChart } from '../components/charts/CrimeCategoryChart';
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
  TrendResponse,
  CategoryBreakdownResponse,
  FilterParams,
} from '../types';

export const DistrictsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const geographyMode = (searchParams.get('geography_mode') || searchParams.get('view') || 'current') as 'current' | 'historical';

  const [metric, setMetric] = useState<'volume' | 'rate'>('volume');
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(() => {
    const sId = searchParams.get('state_id');
    return sId ? Number(sId) : undefined;
  });
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(() => {
    const dId = searchParams.get('district_id');
    return dId ? Number(dId) : undefined;
  });

  // Date and Time Filtering States
  const [startDate, setStartDate] = useState<string | undefined>(() => {
    const start = searchParams.get('start_date');
    const year = searchParams.get('year');
    if (start) return start;
    if (year) return `${year}-01-01`;
    return undefined;
  });

  const [endDate, setEndDate] = useState<string | undefined>(() => {
    const end = searchParams.get('end_date');
    const year = searchParams.get('year');
    if (end) return end;
    if (year) return `${year}-12-31`;
    return undefined;
  });

  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetailResponse | null>(null);
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);

  // Jurisdiction Profile State
  const [jurisdictionProfile, setJurisdictionProfile] = useState<JurisdictionProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Temporal & Category Breakdown Analytics States
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');
  const [loadingTrends, setLoadingTrends] = useState<boolean>(false);

  const [categories, setCategories] = useState<CategoryBreakdownResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load States and apply initial state param if present
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

  // Load Districts when state changes and apply district param if present
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

  // Helper to sync URL search parameters
  const updateUrlParams = useCallback(
    (updates: {
      state_id?: number;
      district_id?: number;
      start_date?: string;
      end_date?: string;
    }) => {
      const nextParams = new URLSearchParams(searchParams);

      if (updates.state_id) nextParams.set('state_id', String(updates.state_id));
      else nextParams.delete('state_id');

      if (updates.district_id) nextParams.set('district_id', String(updates.district_id));
      else nextParams.delete('district_id');

      if (updates.start_date) nextParams.set('start_date', updates.start_date);
      else nextParams.delete('start_date');

      if (updates.end_date) nextParams.set('end_date', updates.end_date);
      else nextParams.delete('end_date');

      nextParams.delete('year');
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Fetch Jurisdiction Profile (State Overview or District Profile)
  const fetchJurisdictionProfile = useCallback(async () => {
    if (!selectedStateId && !selectedDistrictId) {
      setJurisdictionProfile(null);
      setProfileError(null);
      return;
    }
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await geographyApi.getJurisdictionProfile({
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

  // Load Top Districts ranking
  const fetchTopDistricts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await analyticsApi.getTopDistricts({
        metric,
        limit: 15,
        state_id: selectedStateId,
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
  }, [metric, selectedStateId, geographyMode, startDate, endDate]);

  useEffect(() => {
    fetchTopDistricts();
  }, [fetchTopDistricts]);

  // Filter params object for analytics APIs
  const analyticsFilters: FilterParams = useMemo(
    () => ({
      state_id: selectedStateId,
      district_id: selectedDistrictId,
      geography_mode: geographyMode,
      start_date: startDate,
      end_date: endDate,
    }),
    [selectedStateId, selectedDistrictId, geographyMode, startDate, endDate]
  );

  // Fetch Longitudinal Crime Trend Data
  const fetchTrends = useCallback(async () => {
    setLoadingTrends(true);
    try {
      const res = await analyticsApi.getTrends(trendInterval, analyticsFilters);
      setTrends(res);
    } catch (err) {
      console.error('Failed to load geographic crime trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  }, [trendInterval, analyticsFilters]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Fetch Crime Category Distribution Data
  const fetchCategories = useCallback(async () => {
    try {
      const res = await analyticsApi.getByCategory(analyticsFilters);
      setCategories(res);
    } catch (err) {
      console.error('Failed to load geographic category distribution:', err);
    }
  }, [analyticsFilters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    return 'Jurisdiction Profile';
  }, [selectedDistrictId, selectedDistrictName, selectedStateName, districtDetail, jurisdictionProfile]);

  // Dynamic hotspot categorization based on top districts crime rates
  const hotspotCounts = useMemo(() => {
    if (!topDistricts || !topDistricts.items) {
      return { high: 0, moderate: 0, low: 0, total: 0 };
    }
    let high = 0;
    let moderate = 0;
    let low = 0;
    topDistricts.items.forEach((item) => {
      const rate = item.crime_rate_per_100k;
      if (rate !== null && rate !== undefined) {
        if (rate >= 250) high++;
        else if (rate >= 150) moderate++;
        else low++;
      }
    });
    return { high, moderate, low, total: topDistricts.items.length };
  }, [topDistricts]);

  const handleStateChange = (stateId?: number) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    updateUrlParams({
      state_id: stateId,
      district_id: undefined,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleDistrictChange = (districtId?: number) => {
    setSelectedDistrictId(districtId);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    updateUrlParams({
      state_id: selectedStateId,
      district_id: districtId,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleDateChange = (newStart?: string, newEnd?: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    updateUrlParams({
      state_id: selectedStateId,
      district_id: selectedDistrictId,
      start_date: newStart,
      end_date: newEnd,
    });
  };

  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setDistrictDetail(null);
    setJurisdictionProfile(null);
    setProfileError(null);
    updateUrlParams({
      state_id: undefined,
      district_id: undefined,
      start_date: undefined,
      end_date: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    selectedStateId || selectedDistrictId || startDate || endDate
  );

  return (
    <DashboardLayout
      hideSidebar
      icon={MapPin}
      title="Geographic Intelligence"
      subtitle="Spatial crime density, hotspots and jurisdictional distribution"
      onRefresh={() => {
        fetchTopDistricts(true);
        if (selectedStateId || selectedDistrictId) {
          fetchJurisdictionProfile();
        }
        fetchTrends();
        fetchCategories();
      }}
      isRefreshing={isRefreshing}
    >
      {/* State, District & Time Period Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Left: Jurisdiction Selectors */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
              <Compass className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Jurisdiction:</span>
            </div>

            {/* State Selector */}
            <div className="relative w-full sm:w-auto sm:min-w-[190px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7C8796]">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <select
                value={selectedStateId || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  handleStateChange(val);
                }}
                className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 pl-8 pr-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">
                  {geographyMode === 'current'
                    ? `All States & UTs (${states.length || 36})`
                    : `All Census 2011 States (${states.length || 35})`}
                </option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selector (active only when State is selected) */}
            <div className="relative w-full sm:w-auto sm:min-w-[190px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7C8796]">
                <Building className="h-3.5 w-3.5" />
              </div>
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  handleDistrictChange(val);
                }}
                disabled={!selectedStateId}
                className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 pl-8 pr-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <option value="">
                  {!selectedStateId
                    ? 'Select state first'
                    : `All Districts (${districts.length})`}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Date Range Filter & Reset Button */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              disabled={isLoading}
            />

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                title="Reset all active jurisdiction and date filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
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
          onRetry={() => {
            fetchTopDistricts();
            fetchTrends();
            fetchCategories();
          }}
        />
      )}

      {!isLoading && !error && topDistricts && (
        <div className="space-y-4">
          {/* SECTION 1: Selected Jurisdiction Profile (When state or district selected) */}
          {(selectedDistrictId || selectedStateId) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                    Jurisdiction Profile: {profileHeading}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {jurisdictionProfile?.start_date && jurisdictionProfile?.end_date ? (
                    <span className="rounded bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                      Period:{' '}
                      {jurisdictionProfile.start_date.substring(0, 4) === jurisdictionProfile.end_date.substring(0, 4)
                        ? jurisdictionProfile.start_date.substring(0, 4)
                        : `${jurisdictionProfile.start_date} to ${jurisdictionProfile.end_date}`}
                    </span>
                  ) : (
                    <span className="rounded bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#5D6878] border border-blue-200">
                      All Supported Years (2020–2025)
                    </span>
                  )}
                  {(jurisdictionProfile?.parent_district_id || districtDetail?.parent_district_id) && (
                    <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                      Census 2011 Parent #{jurisdictionProfile?.parent_district_id || districtDetail?.parent_district_id}
                    </span>
                  )}
                </div>
              </div>

              {profileError ? (
                <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                  <span>{profileError}</span>
                  <button
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
                <div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Metric 1: Reported Incidents */}
                    <div className="rounded border border-blue-200/80 bg-white p-3">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        Reported Incidents
                      </span>
                      <p className="mt-1 text-xl font-bold text-[#0B1F3A]">
                        {jurisdictionProfile.reported_incidents !== null && jurisdictionProfile.reported_incidents !== undefined
                          ? jurisdictionProfile.reported_incidents.toLocaleString()
                          : '—'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {jurisdictionProfile.scope === 'STATE'
                          ? 'Attributed state proceedings'
                          : 'Recorded crime proceedings'}
                        {startDate || endDate ? ' in period' : ' (2020–2025)'}
                      </p>
                    </div>

                    {/* Metric 2: Population Density */}
                    <div className="rounded border border-blue-200/80 bg-white p-3">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        Population Density
                      </span>
                      <p className="mt-1 text-xl font-bold text-[#0B1F3A]">
                        {jurisdictionProfile.population !== null && jurisdictionProfile.population !== undefined
                          ? jurisdictionProfile.population.toLocaleString()
                          : 'Not available'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {jurisdictionProfile.scope === 'STATE'
                          ? 'Census 2011 state aggregate'
                          : jurisdictionProfile.parent_district_id
                          ? 'Census 2011 parent residents'
                          : jurisdictionProfile.population
                          ? 'Census 2011 residents'
                          : 'Baseline unavailable'}
                      </p>
                    </div>

                    {/* Metric 3: Crime Rate / 100k */}
                    <div className="rounded border border-blue-200/80 bg-white p-3">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        Crime Rate / 100k
                      </span>
                      <p className="mt-1 text-xl font-bold text-[#1769AA]">
                        {jurisdictionProfile.crime_rate_per_100k !== null && jurisdictionProfile.crime_rate_per_100k !== undefined
                          ? jurisdictionProfile.crime_rate_per_100k.toFixed(1)
                          : 'Not available'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {jurisdictionProfile.crime_rate_per_100k !== null
                          ? (startDate || endDate ? 'Period normalized density' : '6-year cumulative exposure')
                          : 'Requires valid population'}
                      </p>
                    </div>

                    {/* Metric 4: Risk Classification */}
                    <div className="rounded border border-blue-200/80 bg-white p-3">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        Risk Classification
                      </span>
                      <div className="mt-1">
                        {jurisdictionProfile.risk_level === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold border border-red-200">
                            <AlertTriangle className="h-3 w-3" />
                            Critical Risk Hotspot {jurisdictionProfile.risk_score ? `(${jurisdictionProfile.risk_score.toFixed(1)})` : ''}
                          </span>
                        ) : jurisdictionProfile.risk_level === 'HIGH' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold border border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            High Risk Hotspot {jurisdictionProfile.risk_score ? `(${jurisdictionProfile.risk_score.toFixed(1)})` : ''}
                          </span>
                        ) : jurisdictionProfile.risk_level === 'MODERATE' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold border border-blue-200">
                            <ShieldAlert className="h-3 w-3" />
                            Moderate Crime Zone {jurisdictionProfile.risk_score ? `(${jurisdictionProfile.risk_score.toFixed(1)})` : ''}
                          </span>
                        ) : jurisdictionProfile.risk_level === 'LOW' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold border border-emerald-200">
                            Low Incidence Area {jurisdictionProfile.risk_score ? `(${jurisdictionProfile.risk_score.toFixed(1)})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-semibold border border-slate-200">
                            Not available
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {jurisdictionProfile.scope === 'STATE'
                          ? 'Assessed at district level'
                          : jurisdictionProfile.risk_level
                          ? 'Operational posture'
                          : 'Baseline uncalibrated'}
                      </p>
                    </div>
                  </div>

                  {jurisdictionProfile.notes && (
                    <div className="mt-3 text-[11px] text-slate-500 italic">
                      {jurisdictionProfile.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No profile statistics available for this jurisdiction.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Tactical Geographic Overview (Map) & Crime Hotspots Matrix */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* GIS Photographic Visualization */}
            <div className="lg:col-span-8 rounded-lg border border-[#D9E1EA] bg-white overflow-hidden shadow-2xs flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                      Tactical Geographic Crime Distribution
                    </h3>
                    <p className="text-[12px] text-[#5D6878]">
                      Spatial incident density across {geographyMode === 'historical' ? '640 Census 2011 districts' : '789 administrative districts'}
                    </p>
                  </div>
                </div>
                <span className="rounded bg-[#EAF3FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-[#D9E1EA]">
                  Active GIS Layer
                </span>
              </div>

              <div className="relative h-[240px] sm:h-[280px] bg-[#0B1F3A] overflow-hidden">
                <img
                  src="/images/geographic-intelligence.jpg"
                  alt="Geographic Crime Map"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/85 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                  <span className="bg-[#0B1F3A]/80 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10">
                    Spatial Coordinate Grid &bull; Boundary Analysis
                  </span>
                  <span className="bg-[#0B1F3A]/80 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 text-[#1D7FE2]">
                    {geographyMode === 'historical' ? '640 Monitored Jurisdictions' : '789 Monitored Jurisdictions'}
                  </span>
                </div>
              </div>
            </div>

            {/* Crime Hotspots Intensity Matrix */}
            <div className="lg:col-span-4 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1.5 bg-amber-50 text-[#C98512]">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-[#0B1F3A]">
                        Crime Hotspot Matrix
                      </h4>
                      <p className="text-[11px] text-[#5D6878]">
                        {selectedStateName
                          ? `District incidence density in ${selectedStateName}`
                          : 'Jurisdictional incidence density classification'}
                      </p>
                    </div>
                  </div>
                  {topDistricts.items && topDistricts.items.length > 0 && (
                    <span className="rounded bg-[#F4F7FA] px-2 py-0.5 text-[10.5px] font-bold text-[#5D6878] border border-[#D9E1EA]">
                      {topDistricts.items.length} Evaluated
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-2.5 text-[12px]">
                  <div className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    jurisdictionProfile?.risk_level === 'CRITICAL' || (jurisdictionProfile?.crime_rate_per_100k && jurisdictionProfile.crime_rate_per_100k >= 250)
                      ? 'bg-red-100/90 border-red-300 ring-1 ring-red-400'
                      : 'bg-red-50/80 border-red-200'
                  }`}>
                    <div>
                      <span className="font-bold text-[#C53B3B] block">HIGH INTENSITY HOTSPOTS</span>
                      <span className="text-[11px] text-[#5D6878]">Rate &gt; 250 per 100k</span>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-[#C53B3B] px-2 py-0.5 text-[11px] font-bold text-white">
                        {hotspotCounts.high} Districts
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    jurisdictionProfile?.risk_level === 'HIGH' || jurisdictionProfile?.risk_level === 'MODERATE' || (jurisdictionProfile?.crime_rate_per_100k && jurisdictionProfile.crime_rate_per_100k >= 150 && jurisdictionProfile.crime_rate_per_100k < 250)
                      ? 'bg-amber-100/90 border-amber-300 ring-1 ring-amber-400'
                      : 'bg-amber-50/80 border-amber-200'
                  }`}>
                    <div>
                      <span className="font-bold text-[#C98512] block">MODERATE CRIME ZONES</span>
                      <span className="text-[11px] text-[#5D6878]">Rate 150–250 per 100k</span>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-[#C98512] px-2 py-0.5 text-[11px] font-bold text-white">
                        {hotspotCounts.moderate} Districts
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    jurisdictionProfile?.risk_level === 'LOW' || (jurisdictionProfile?.crime_rate_per_100k && jurisdictionProfile.crime_rate_per_100k < 150)
                      ? 'bg-emerald-100/90 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-emerald-50/80 border-emerald-200'
                  }`}>
                    <div>
                      <span className="font-bold text-[#16845B] block">LOW INCIDENCE AREAS</span>
                      <span className="text-[11px] text-[#5D6878]">Rate &lt; 150 per 100k</span>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-[#16845B] px-2 py-0.5 text-[11px] font-bold text-white">
                        {hotspotCounts.low} Districts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D9E1EA] text-[11px] text-[#5D6878] flex items-center justify-between">
                <span>Census 2011 population baseline per-capita exposure.</span>
                {startDate || endDate ? (
                  <span className="font-semibold text-[#1769AA]">Filtered Period</span>
                ) : (
                  <span className="text-slate-400">All Years</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Temporal Crime Trend (Monthly/Yearly) & Crime Category Breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Longitudinal Trend Chart with Compact Monthly / Yearly Toggle */}
            <div className="lg:col-span-7 xl:col-span-8">
              <CrimeTrendChart
                data={trends?.items || []}
                interval={trendInterval}
                onIntervalChange={(newInterval) => setTrendInterval(newInterval)}
                isLoading={loadingTrends}
              />
            </div>

            {/* Crime Category Distribution Chart */}
            <div className="lg:col-span-5 xl:col-span-4">
              <CrimeCategoryChart
                data={categories?.items || []}
                totalIncidents={categories?.total_incidents || 0}
              />
            </div>
          </div>

          {/* SECTION 4: Jurisdiction Comparison (Top Districts Table) */}
          <TopDistrictsTable
            districts={topDistricts.items}
            metric={metric}
            onMetricChange={(newMetric) => setMetric(newMetric)}
            isLoading={isRefreshing}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default DistrictsPage;
