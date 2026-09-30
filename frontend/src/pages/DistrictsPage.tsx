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
import { MapPin, Users, BookOpen, Briefcase, Award } from 'lucide-react';
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
      title="Risk Intelligence"
      subtitle="Assess jurisdiction-level risk indicators derived from historical crime activity."
      onRefresh={() => fetchTopDistricts(true)}
      isRefreshing={isRefreshing}
    >
      {/* Operational Disclosures & Data Freshness Banner */}
      <DataFreshnessBanner />

      {/* State & District Lookup Filter */}
      <div className="rounded-lg border border-[#DCE2EA] bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6577]">
              State Filter:
            </span>
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
                setSelectedDistrictId(undefined);
              }}
              className="h-10 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] cursor-pointer"
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
                className="h-10 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] cursor-pointer"
              >
                <option value="">Select District Profile ({districts.length})</option>
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
              className="inline-flex h-10 items-center rounded-md border border-rose-200 bg-rose-50 px-3 text-[12px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Selected District Census Demographics Card */}
      {selectedDistrictId && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#1D4ED8]" />
              <h3 className="text-[15px] font-bold text-[#172033]">
                Demographic Profile: {districtDetail?.district_name || 'Loading...'},{' '}
                {districtDetail?.state_name}
              </h3>
            </div>
            {districtDetail?.parent_district_id && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8] border border-blue-200">
                Census 2011 Parent #{districtDetail.parent_district_id}
              </span>
            )}
          </div>

          {loadingDetail ? (
            <div className="py-4 text-center text-xs font-medium text-[#1D4ED8]">
              Loading Census metrics from district_demographics table...
            </div>
          ) : districtDetail?.demographics ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-[#DCE2EA] bg-slate-50/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[#5B6577]">
                  <Users className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  <span className="text-[11px] font-medium">Population</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#172033]">
                  {districtDetail.demographics.total_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5B6577]">
                  M: {districtDetail.demographics.male_population.toLocaleString()} | F:{' '}
                  {districtDetail.demographics.female_population.toLocaleString()}
                </p>
              </div>

              <div className="rounded-md border border-[#DCE2EA] bg-slate-50/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[#5B6577]">
                  <BookOpen className="h-3.5 w-3.5 text-[#16805C]" />
                  <span className="text-[11px] font-medium">Literacy</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#16805C]">
                  {districtDetail.demographics.literate_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5B6577]">
                  {(
                    (districtDetail.demographics.literate_population /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % literacy rate
                </p>
              </div>

              <div className="rounded-md border border-[#DCE2EA] bg-slate-50/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[#5B6577]">
                  <Briefcase className="h-3.5 w-3.5 text-[#B7791F]" />
                  <span className="text-[11px] font-medium">Workforce</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-[#B7791F]">
                  {districtDetail.demographics.total_workers.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#5B6577]">
                  {(
                    (districtDetail.demographics.total_workers /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % participation
                </p>
              </div>

              <div className="rounded-md border border-[#DCE2EA] bg-slate-50/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[#5B6577]">
                  <Award className="h-3.5 w-3.5 text-purple-700" />
                  <span className="text-[11px] font-medium">Census Code</span>
                </div>
                <p className="mt-1 text-[16px] font-mono font-bold text-purple-700">
                  #{districtDetail.census_district_code ?? 'N/A'}
                </p>
                <p className="text-[10px] text-[#5B6577]">Census Year: 2011</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#5B6577]">
              No demographic record found for this district.
            </p>
          )}
        </div>
      )}

      {/* Main Ranking Table */}
      {isLoading && !topDistricts && (
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-8 shadow-2xs">
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
