import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import IndiaInteractiveMap from '../components/geography/IndiaInteractiveMap';
import CompactDistrictInfoPanel from '../components/geography/CompactDistrictInfoPanel';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { analyticsApi, geographyApi, riskApi } from '../api';
import type {
  StateItem,
  DistrictItem,
  StateCrimeSummaryItem,
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

  // Master Data State
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [stateSummaries, setStateSummaries] = useState<StateCrimeSummaryItem[]>([]);

  // District Risk Scores for Selected State
  const [districtRiskMap, setDistrictRiskMap] = useState<
    Record<number, { risk_level: string; overall_risk_score: number }>
  >({});
  const [loadingRiskScores, setLoadingRiskScores] = useState<boolean>(false);

  // District statistics (for tooltips)
  const [districtStatsMap, setDistrictStatsMap] = useState<
    Record<
      number,
      {
        incident_count: number;
        total_population?: number | null;
        crime_rate_per_100k?: number | null;
        is_census_2011?: boolean;
      }
    >
  >({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        setDistrictStatsMap({});
        return;
      }
      try {
        const [res, statsRes] = await Promise.all([
          geographyApi.getDistricts(selectedStateId, geographyMode),
          analyticsApi.getTopDistricts({
            state_id: selectedStateId,
            metric: 'volume',
            limit: 100,
            geography_mode: geographyMode,
          }).catch(() => null),
        ]);

        if (isMounted) {
          setDistricts(res.items);
          if (statsRes?.items) {
            const sMap: Record<number, any> = {};
            statsRes.items.forEach((item) => {
              sMap[item.district_id] = {
                incident_count: item.incident_count,
                total_population: item.total_population,
                crime_rate_per_100k: item.crime_rate_per_100k,
                is_census_2011: !item.is_derived_from_parent,
              };
            });
            setDistrictStatsMap(sMap);
          }
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

  // Fetch Nationwide State Summaries for Choropleth Map
  const fetchStateSummaries = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await geographyApi.getStateCrimeSummary({
        view: geographyMode,
      });
      setStateSummaries(res.items);
    } catch (err: any) {
      console.error('Failed to load state crime summaries:', err);
      setError(err?.message || 'Failed to load geographic crime data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [geographyMode]);

  useEffect(() => {
    fetchStateSummaries();
  }, [fetchStateSummaries]);

  // Fetch District Risk Scores when a state is selected
  useEffect(() => {
    if (!selectedStateId) {
      setDistrictRiskMap({});
      return;
    }

    let isMounted = true;
    const fetchStateRiskScores = async () => {
      setLoadingRiskScores(true);
      try {
        const res = await riskApi.listRiskScores({
          state_id: selectedStateId,
          assessment_period: '2026-11-01',
          limit: 150,
        });
        if (isMounted && res?.items) {
          const rMap: Record<number, { risk_level: string; overall_risk_score: number }> = {};
          res.items.forEach((item) => {
            rMap[item.district_id] = {
              risk_level: item.risk_level,
              overall_risk_score: item.overall_risk_score,
            };
          });
          setDistrictRiskMap(rMap);
        }
      } catch (err) {
        console.error('Failed to load district risk scores for state:', err);
      } finally {
        if (isMounted) setLoadingRiskScores(false);
      }
    };

    fetchStateRiskScores();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId]);

  const selectedStateName = useMemo(() => {
    if (!selectedStateId) return null;
    return states.find((s) => s.id === selectedStateId)?.state_name;
  }, [selectedStateId, states]);

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return null;
    return districts.find((d) => d.id === selectedDistrictId)?.district_name;
  }, [selectedDistrictId, districts]);

  // Handle State selection
  const handleStateChange = (stateId?: number) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    const nextParams = new URLSearchParams(searchParams);
    if (stateId) {
      nextParams.set('state_id', String(stateId));
    } else {
      nextParams.delete('state_id');
    }
    nextParams.delete('district_id');
    setSearchParams(nextParams, { replace: true });
  };

  // Handle District selection
  const handleDistrictChange = (districtId?: number) => {
    setSelectedDistrictId(districtId);
    const nextParams = new URLSearchParams(searchParams);
    if (districtId) {
      nextParams.set('district_id', String(districtId));
    } else {
      nextParams.delete('district_id');
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Compute map header title
  const mapHeaderTitle = useMemo(() => {
    if (selectedDistrictId && selectedDistrictName && selectedStateName) {
      return `${selectedStateName.toUpperCase()} > ${selectedDistrictName.toUpperCase()}`;
    }
    if (selectedStateId && selectedStateName) {
      return selectedStateName.toUpperCase();
    }
    return 'India';
  }, [selectedDistrictId, selectedDistrictName, selectedStateId, selectedStateName]);

  return (
    <DashboardLayout
      hideSidebar
      hideFooter
      icon={MapPin}
      title="Geographic Intelligence"
      onRefresh={() => fetchStateSummaries(true)}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-xl border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Aggregating geographical boundaries and telemetry..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Geographic Data Error"
          message={error}
          onRetry={() => fetchStateSummaries()}
        />
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {/* 1. Map Header HUD: displays ONLY "India", "[STATE]", or "[STATE] > [DISTRICT]" with simple risk legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
                {mapHeaderTitle}
              </h2>
              {selectedDistrictId ? (
                <button
                  type="button"
                  onClick={() => handleDistrictChange(undefined)}
                  className="inline-flex items-center gap-1 text-xs text-[#1769AA] hover:underline font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to {selectedStateName}</span>
                </button>
              ) : selectedStateId ? (
                <button
                  type="button"
                  onClick={() => handleStateChange(undefined)}
                  className="inline-flex items-center gap-1 text-xs text-[#1769AA] hover:underline font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to India</span>
                </button>
              ) : null}
            </div>

            {/* Simple Risk Legend: Low, Moderate, High, Critical */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Risk:
              </span>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="text-slate-700">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                <span className="text-slate-700">Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-slate-700">High</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-slate-700 font-semibold">Critical</span>
              </div>
            </div>
          </div>

          {/* 2. Main Map Viewport (Fitted to viewport height without vertical page scrolling) */}
          <div className="w-full h-[calc(100vh-160px)] min-h-[520px] max-h-[860px] flex flex-col lg:flex-row gap-4 items-stretch">
            {/* Interactive Map */}
            <div className="flex-1 w-full min-w-0 h-full">
              <IndiaInteractiveMap
                stateData={stateSummaries}
                selectedStateId={selectedStateId}
                onSelectState={handleStateChange}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={handleDistrictChange}
                stateDistricts={districts}
                districtStatsMap={districtStatsMap}
                districtRiskMap={districtRiskMap}
                isLoading={isRefreshing || loadingRiskScores}
              />
            </div>

            {/* Dedicated District Details Panel (Right side) */}
            {selectedDistrictId && (
              <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
                <CompactDistrictInfoPanel
                  districtId={selectedDistrictId}
                  districtName={selectedDistrictName || undefined}
                  stateName={selectedStateName || undefined}
                  geographyMode={geographyMode}
                  onClose={() => handleDistrictChange(undefined)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DistrictsPage;
