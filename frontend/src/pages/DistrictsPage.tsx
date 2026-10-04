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
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import TopDistrictsTable from '../components/charts/TopDistrictsTable';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi } from '../api';
import type {
  TopDistrictsResponse,
  StateItem,
  DistrictItem,
  DistrictDetailResponse,
} from '../types';

export const DistrictsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [metric, setMetric] = useState<'volume' | 'rate'>('volume');
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>();

  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetailResponse | null>(null);
  const [topDistricts, setTopDistricts] = useState<TopDistrictsResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load States and apply initial state param if present
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      try {
        const res = await geographyApi.getStates();
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
  }, [searchParams]);

  // Load Districts when state changes and apply district param if present
  useEffect(() => {
    let isMounted = true;
    const loadDistricts = async () => {
      if (!selectedStateId) {
        setDistricts([]);
        return;
      }
      try {
        const res = await geographyApi.getDistricts(selectedStateId);
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
  }, [selectedStateId, searchParams]);

  // Load District Detail with Demographics
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedDistrictId) {
        setDistrictDetail(null);
        return;
      }
      setLoadingDetail(true);
      try {
        const res = await geographyApi.getDistrictDetail(selectedDistrictId);
        setDistrictDetail(res);
      } catch (err) {
        console.error('Failed to load district detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedDistrictId]);

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
      });
      setTopDistricts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load geographic crime data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [metric, selectedStateId]);

  useEffect(() => {
    fetchTopDistricts();
  }, [fetchTopDistricts]);

  // Selected district crime metrics lookup
  const selectedDistrictStats = useMemo(() => {
    if (!selectedDistrictId || !topDistricts) return null;
    return topDistricts.items.find((d) => d.district_id === selectedDistrictId);
  }, [selectedDistrictId, topDistricts]);

  const selectedStateName = useMemo(() => {
    if (!selectedStateId) return null;
    return states.find((s) => s.id === selectedStateId)?.state_name;
  }, [selectedStateId, states]);

  return (
    <DashboardLayout
      hideSidebar
      icon={MapPin}
      title="Geographic Intelligence"
      subtitle="Spatial crime density, hotspots and jurisdictional distribution"
      onRefresh={() => fetchTopDistricts(true)}
      isRefreshing={isRefreshing}
    >
      {/* State & District Lookup Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
              <Compass className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Jurisdiction Filter:</span>
            </div>

            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
                setSelectedDistrictId(undefined);
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
                  setSelectedDistrictId(val);
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
          </div>

          {selectedStateId && (
            <button
              onClick={() => {
                setSelectedStateId(undefined);
                setSelectedDistrictId(undefined);
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filter</span>
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
          {/* SECTION 1 & 2: Tactical Geographic Overview (Map) & Crime Hotspots Matrix */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* SECTION 1: Geographic Overview Map */}
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
                      Spatial incident density across 789 administrative districts
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
                    789 Monitored Jurisdictions
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Crime Hotspots Intensity Matrix */}
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

          {/* SECTION 4: Selected Location Detail (When state or district selected) */}
          {(selectedDistrictId || selectedStateId) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                    Jurisdiction Profile:{' '}
                    {selectedDistrictId
                      ? `${districtDetail?.district_name || 'Selected District'}, ${districtDetail?.state_name || selectedStateName}`
                      : `${selectedStateName} (State Overview)`}
                  </h3>
                </div>
                {districtDetail?.parent_district_id && (
                  <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                    Census 2011 Parent #{districtDetail.parent_district_id}
                  </span>
                )}
              </div>

              {loadingDetail ? (
                <div className="py-4 text-center text-xs font-medium text-[#1769AA]">
                  Loading jurisdictional profile data...
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded border border-blue-200/80 bg-white p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Reported Incidents
                    </span>
                    <p className="mt-1 text-xl font-bold text-[#0B1F3A]">
                      {selectedDistrictStats
                        ? selectedDistrictStats.incident_count.toLocaleString()
                        : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">Recorded crime proceedings</p>
                  </div>

                  <div className="rounded border border-blue-200/80 bg-white p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Population Density
                    </span>
                    <p className="mt-1 text-xl font-bold text-[#0B1F3A]">
                      {districtDetail?.demographics?.total_population
                        ? districtDetail.demographics.total_population.toLocaleString()
                        : selectedDistrictStats?.total_population
                        ? selectedDistrictStats.total_population.toLocaleString()
                        : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">Census 2011 residents</p>
                  </div>

                  <div className="rounded border border-blue-200/80 bg-white p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Crime Rate / 100k
                    </span>
                    <p className="mt-1 text-xl font-bold text-[#1769AA]">
                      {selectedDistrictStats?.crime_rate_per_100k
                        ? selectedDistrictStats.crime_rate_per_100k.toFixed(1)
                        : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">Normalized incidence density</p>
                  </div>

                  <div className="rounded border border-blue-200/80 bg-white p-3">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Risk Classification
                    </span>
                    <div className="mt-1">
                      {selectedDistrictStats?.crime_rate_per_100k &&
                      selectedDistrictStats.crime_rate_per_100k > 250 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          High Risk Hotspot
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold">
                          Monitored Area
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">Operational posture</p>
                  </div>
                </div>
              )}
            </div>
          )}

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
