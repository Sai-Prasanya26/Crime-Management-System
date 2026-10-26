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

  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetailResponse | null>(null);
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);

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

  // Fetch Jurisdiction Profile (National, State Overview, or District Profile)
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

  const activePeriodLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate.endsWith('-01-01') && endDate.endsWith('-12-31') && startDate.slice(0, 4) === endDate.slice(0, 4)) {
        return `Period: ${startDate.slice(0, 4)}`;
      }
      return `Period: ${startDate} to ${endDate}`;
    }
    if (startDate) return `Period: From ${startDate}`;
    if (endDate) return `Period: Up to ${endDate}`;
    return 'Period: 2020–2025 (All Years)';
  }, [startDate, endDate]);

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
    startDate !== undefined ||
    endDate !== undefined
  );

  return (
    <DashboardLayout
      hideSidebar
      icon={MapPin}
      title="Geographic Intelligence"
      subtitle="Spatial crime patterns, high-intensity hotspots, and district-level operational telemetry."
      onRefresh={() => {
        fetchTopDistricts(true);
        fetchJurisdictionProfile();
      }}
      isRefreshing={isRefreshing}
    >
      {/* State, District & Date Lookup Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
              <Compass className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Jurisdiction Filter:</span>
            </div>

            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                handleStateChange(val);
              }}
              className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
            >
              <option value="">All States &amp; UTs ({states.length || 36})</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>

            {selectedStateId && (
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  handleDistrictChange(val);
                }}
                className="h-10 w-full sm:w-auto rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="">Select District ({districts.length})</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>
            )}

            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              disabled={isLoading}
            />
          </div>

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

      {!isLoading && !error && topDistricts && (
        <div className="space-y-4">
          {/* SECTION 1: Tactical Geographic Overview (Map) & Crime Hotspots Matrix */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Tactical Geographic Crime Distribution Panel */}
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

              {/* GIS Photographic Visualization */}
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

            {/* Crime Hotspot Matrix */}
            <div className="lg:col-span-4 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="rounded p-1.5 bg-amber-50 text-[#C98512]">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#0B1F3A]">
                      Crime Hotspot Matrix
                    </h4>
                    <p className="text-[11px] text-[#5D6878]">
                      Incidence density classification
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5 text-[12px]">
                  <div className="flex items-center justify-between p-2 rounded bg-red-50/80 border border-red-200">
                    <div>
                      <span className="font-bold text-[#C53B3B] block">HIGH INTENSITY HOTSPOTS</span>
                      <span className="text-[11px] text-[#5D6878]">Rate &gt; 250 per 100k</span>
                    </div>
                    <span className="rounded bg-[#C53B3B] px-2 py-0.5 text-[11px] font-bold text-white">
                      HIGH
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-amber-50/80 border border-amber-200">
                    <div>
                      <span className="font-bold text-[#C98512] block">MODERATE CRIME ZONES</span>
                      <span className="text-[11px] text-[#5D6878]">Rate 150–250 per 100k</span>
                    </div>
                    <span className="rounded bg-[#C98512] px-2 py-0.5 text-[11px] font-bold text-white">
                      MODERATE
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50/80 border border-emerald-200">
                    <div>
                      <span className="font-bold text-[#16845B] block">LOW INCIDENCE AREAS</span>
                      <span className="text-[11px] text-[#5D6878]">Rate &lt; 150 per 100k</span>
                    </div>
                    <span className="rounded bg-[#16845B] px-2 py-0.5 text-[11px] font-bold text-white">
                      LOW
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#D9E1EA] text-[11px] text-[#5D6878]">
                Census 2011 population baseline applied to calculate per-capita exposure.
              </div>
            </div>
          </div>

          {/* SECTION 2: Jurisdiction Profile Section */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200/60 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                  Jurisdiction Profile: {profileHeading}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                  {activePeriodLabel}
                </span>
                {(jurisdictionProfile?.parent_district_id || districtDetail?.parent_district_id) ? (
                  <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                    Census 2011 Parent #{jurisdictionProfile?.parent_district_id || districtDetail?.parent_district_id}
                  </span>
                ) : (
                  <span className="rounded bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-blue-200">
                    {selectedDistrictId ? 'District Scope' : selectedStateId ? 'State Scope' : 'National Scope'}
                  </span>
                )}
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
                        : 'Not available'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {jurisdictionProfile.scope === 'NATIONAL'
                        ? 'Attributed national proceedings'
                        : jurisdictionProfile.scope === 'STATE'
                        ? 'Attributed state proceedings'
                        : 'Recorded crime proceedings'}
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
                      {jurisdictionProfile.scope === 'NATIONAL'
                        ? 'Census 2011 national baseline'
                        : jurisdictionProfile.scope === 'STATE'
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
                        ? 'Normalized incidence density'
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
                      {jurisdictionProfile.scope === 'NATIONAL' || jurisdictionProfile.scope === 'STATE'
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

          {/* SECTION 3: Jurisdiction Comparison (Top Districts Table) */}
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
