import React, { useEffect, useState, useCallback } from 'react';
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
import { MapPin, Users, BookOpen, Briefcase, Award, ShieldAlert, Layers } from 'lucide-react';
import OfficialNcrbCard from '../components/common/OfficialNcrbCard';
import DataFreshnessBanner from '../components/common/DataFreshnessBanner';
import StateCoverageCard from '../components/common/StateCoverageCard';

export const DistrictsPage: React.FC = () => {
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

  // Load States
  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await geographyApi.getStates();
        setStates(res.items);
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    loadStates();
  }, []);

  // Load Districts when state changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedStateId) {
        setDistricts([]);
        return;
      }
      try {
        const res = await geographyApi.getDistricts(selectedStateId);
        setDistricts(res.items);
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    };
    loadDistricts();
  }, [selectedStateId]);

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
        limit: 20,
        state_id: selectedStateId,
      });
      setTopDistricts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load district risk data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [metric, selectedStateId]);

  useEffect(() => {
    fetchTopDistricts();
  }, [fetchTopDistricts]);

  return (
    <DashboardLayout
      title="Geographic Intelligence"
      subtitle="Crime distribution across jurisdictions"
      onRefresh={() => fetchTopDistricts(true)}
      isRefreshing={isRefreshing}
    >
      {/* Operational Disclosures & Data Freshness Banner */}
      <DataFreshnessBanner />

      {/* State & District Lookup Filter Toolbar */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-10 items-center gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA]">
              <MapPin className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Jurisdiction Filter:</span>
            </div>

            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
                setSelectedDistrictId(undefined);
              }}
              className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
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
                className="h-10 rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
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
              className="inline-flex h-10 items-center rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Tactical Geographic Overview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Geographic Map Visualization Card */}
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
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#EAF3FA] px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-[#D9E1EA]">
                ● Active GIS Layer
              </span>
            </div>
          </div>

          {/* GIS Visual Graphic */}
          <div className="relative h-[240px] sm:h-[280px] bg-[#0B1F3A] overflow-hidden">
            <img
              src="/assets/crime-intelligence/geographic-intelligence.jpg"
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

        {/* Spatial Intensity Distribution Summary */}
        <div className="lg:col-span-4 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="rounded p-1.5 bg-amber-50 text-[#C98512]">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#0B1F3A]">
                  Crime Concentration Matrix
                </h4>
                <p className="text-[11px] text-[#5D6878]">
                  Derived from verified incident frequencies
                </p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between p-2 rounded bg-red-50/80 border border-red-200">
                <div>
                  <span className="font-bold text-[#C53B3B] block">HIGH RISK JURISDICTIONS</span>
                  <span className="text-[11px] text-[#5D6878]">Rate &gt; 400 per 100k</span>
                </div>
                <span className="rounded bg-[#C53B3B] px-2 py-0.5 text-[11px] font-bold text-white">
                  HIGH
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-amber-50/80 border border-amber-200">
                <div>
                  <span className="font-bold text-[#C98512] block">MODERATE RISK JURISDICTIONS</span>
                  <span className="text-[11px] text-[#5D6878]">Rate 200–400 per 100k</span>
                </div>
                <span className="rounded bg-[#C98512] px-2 py-0.5 text-[11px] font-bold text-white">
                  MODERATE
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-emerald-50/80 border border-emerald-200">
                <div>
                  <span className="font-bold text-[#16845B] block">LOW RISK JURISDICTIONS</span>
                  <span className="text-[11px] text-[#5D6878]">Rate &lt; 200 per 100k</span>
                </div>
                <span className="rounded bg-[#16845B] px-2 py-0.5 text-[11px] font-bold text-white">
                  LOW
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9E1EA] text-[11px] text-[#5D6878]">
            Population normalizations benchmarked against official Census data.
          </div>
        </div>
      </div>

      {/* Selected District Census Demographics Card */}
      {selectedDistrictId && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#1769AA]" />
              <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                Demographic Profile: {districtDetail?.district_name || 'Loading...'},{' '}
                {districtDetail?.state_name}
              </h3>
            </div>
            {districtDetail?.parent_district_id && (
              <span className="rounded bg-[#EAF3FA] px-2 py-0.5 text-[11px] font-semibold text-[#1769AA] border border-blue-200">
                Census 2011 Parent #{districtDetail.parent_district_id}
              </span>
            )}
          </div>

          {loadingDetail ? (
            <div className="py-4 text-center text-xs font-medium text-[#1769AA]">
              Loading Census metrics from district_demographics table...
            </div>
          ) : districtDetail?.demographics ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded border border-[#D9E1EA] bg-[#F4F7FA] p-2.5">
                <div className="flex items-center gap-1.5 text-[#5D6878]">
                  <Users className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span className="text-[11px] font-medium">Population</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#0B1F3A]">
                  {districtDetail.demographics.total_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5D6878]">
                  M: {districtDetail.demographics.male_population.toLocaleString()} | F:{' '}
                  {districtDetail.demographics.female_population.toLocaleString()}
                </p>
              </div>

              <div className="rounded border border-[#D9E1EA] bg-[#F4F7FA] p-2.5">
                <div className="flex items-center gap-1.5 text-[#5D6878]">
                  <BookOpen className="h-3.5 w-3.5 text-[#16845B]" />
                  <span className="text-[11px] font-medium">Literacy</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#16845B]">
                  {districtDetail.demographics.literate_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5D6878]">
                  {(
                    (districtDetail.demographics.literate_population /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % literacy rate
                </p>
              </div>

              <div className="rounded border border-[#D9E1EA] bg-[#F4F7FA] p-2.5">
                <div className="flex items-center gap-1.5 text-[#5D6878]">
                  <Briefcase className="h-3.5 w-3.5 text-[#C98512]" />
                  <span className="text-[11px] font-medium">Workforce</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#C98512]">
                  {districtDetail.demographics.total_workers.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5D6878]">
                  {(
                    (districtDetail.demographics.total_workers /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % participation
                </p>
              </div>

              <div className="rounded border border-[#D9E1EA] bg-[#F4F7FA] p-2.5">
                <div className="flex items-center gap-1.5 text-[#5D6878]">
                  <Award className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span className="text-[11px] font-medium">Census Code</span>
                </div>
                <p className="mt-1 text-[16px] font-mono font-bold text-[#0B1F3A]">
                  #{districtDetail.census_district_code ?? 'N/A'}
                </p>
                <p className="text-[10px] text-[#5D6878]">Census Year: 2011</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#5D6878]">
              No demographic record found for this district.
            </p>
          )}
        </div>
      )}

      {/* Main Ranking Table */}
      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Ranking districts based on Census demographics..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Ranking Fetch Error"
          message={error}
          onRetry={() => fetchTopDistricts()}
        />
      )}

      {!isLoading && !error && topDistricts && (
        <div className="space-y-4">
          <TopDistrictsTable
            districts={topDistricts.items}
            metric={metric}
            onMetricChange={(newMetric) => setMetric(newMetric)}
            isLoading={isRefreshing}
          />

          {/* India Crime Data Coverage (All 36 States/UTs) */}
          <StateCoverageCard />

          {/* Official NCRB Published Crime Statistics */}
          <OfficialNcrbCard />
        </div>
      )}
    </DashboardLayout>
  );
};

export default DistrictsPage;
