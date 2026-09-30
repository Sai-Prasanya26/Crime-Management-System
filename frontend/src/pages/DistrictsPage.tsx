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
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#64748B]">
              Filter By State:
            </span>
            <select
              value={selectedStateId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedStateId(val);
                setSelectedDistrictId(undefined);
              }}
              className="min-h-[46px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-[15px] font-medium text-[#0F172A] shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
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
                className="min-h-[46px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-[15px] font-medium text-[#0F172A] shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
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
              className="inline-flex min-h-[44px] items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Clear State Filter
            </button>
          )}
        </div>
      </div>

      {/* Selected District Census Demographics Card */}
      {selectedDistrictId && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-5 w-5 text-[#4F46E5]" />
              <h3 className="text-base font-bold text-[#0F172A]">
                Demographic Profile: {districtDetail?.district_name || 'Loading...'},{' '}
                {districtDetail?.state_name}
              </h3>
            </div>
            {districtDetail?.parent_district_id && (
              <span className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                Administrative Unit (Census 2011 Parent #{districtDetail.parent_district_id})
              </span>
            )}
          </div>

          {loadingDetail ? (
            <div className="py-6 text-center text-xs font-medium text-[#4F46E5]">
              Loading Census metrics from district_demographics table...
            </div>
          ) : districtDetail?.demographics ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span className="text-[11px] font-medium">Census 2011 Population</span>
                </div>
                <p className="mt-1 text-lg font-bold text-[#0F172A]">
                  {districtDetail.demographics.total_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  Male: {districtDetail.demographics.male_population.toLocaleString()} | Female:{' '}
                  {districtDetail.demographics.female_population.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <BookOpen className="h-3.5 w-3.5 text-[#059669]" />
                  <span className="text-[11px] font-medium">Literacy Count</span>
                </div>
                <p className="mt-1 text-lg font-bold text-emerald-700">
                  {districtDetail.demographics.literate_population.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  {(
                    (districtDetail.demographics.literate_population /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % literacy rate
                </p>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <Briefcase className="h-3.5 w-3.5 text-[#D97706]" />
                  <span className="text-[11px] font-medium">Working Workforce</span>
                </div>
                <p className="mt-1 text-lg font-bold text-amber-700">
                  {districtDetail.demographics.total_workers.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  {(
                    (districtDetail.demographics.total_workers /
                      (districtDetail.demographics.total_population || 1)) *
                    100
                  ).toFixed(1)}
                  % workforce participation
                </p>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <Award className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span className="text-[11px] font-medium">Census Code</span>
                </div>
                <p className="mt-1 text-lg font-mono font-bold text-[#4F46E5]">
                  #{districtDetail.census_district_code ?? 'N/A'}
                </p>
                <p className="text-[10px] text-[#64748B]">Census Year: 2011</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#64748B]">
              No demographic record found for this district.
            </p>
          )}
        </div>
      )}

      {/* Main Ranking Table */}
      {isLoading && !topDistricts && (
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-12 shadow-xs">
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
        <div className="space-y-8">
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
