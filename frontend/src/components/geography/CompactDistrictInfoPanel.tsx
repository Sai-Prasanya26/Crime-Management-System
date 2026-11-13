import React, { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { riskApi, analyticsApi } from '../../api';
import type { DistrictRiskDetailResponse } from '../../types';

interface CompactDistrictInfoPanelProps {
  districtId: number;
  districtName?: string;
  stateName?: string;
  geographyMode?: 'current' | 'historical';
  startDate?: string;
  endDate?: string;
  assessmentPeriod?: string;
  onClose: () => void;
}

export const CompactDistrictInfoPanel: React.FC<CompactDistrictInfoPanelProps> = ({
  districtId,
  districtName: propDistrictName,
  stateName: propStateName,
  geographyMode = 'current',
  startDate,
  endDate,
  assessmentPeriod = '2026-11-01',
  onClose,
}) => {
  const [riskDetail, setRiskDetail] = useState<DistrictRiskDetailResponse | null>(null);
  const [incidentCount, setIncidentCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDistrictData = async () => {
      setIsLoading(true);
      try {
        const [riskRes, statsRes] = await Promise.all([
          riskApi.getDistrictRiskDetail(districtId, assessmentPeriod).catch(() => null),
          analyticsApi
            .getTopDistricts({
              district_id: districtId,
              metric: 'volume',
              geography_mode: geographyMode,
              start_date: startDate,
              end_date: endDate,
              limit: 1,
            })
            .catch(() => null),
        ]);

        if (isMounted) {
          setRiskDetail(riskRes);
          if (statsRes?.items?.[0]) {
            setIncidentCount(statsRes.items[0].incident_count);
          } else if (riskRes?.historical_volume != null) {
            setIncidentCount(riskRes.historical_volume);
          }
        }
      } catch (err) {
        console.error('Failed to load district details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDistrictData();
    return () => {
      isMounted = false;
    };
  }, [districtId, assessmentPeriod, geographyMode, startDate, endDate]);

  const displayName =
    riskDetail?.district_name || propDistrictName || `District #${districtId}`;
  const displayState =
    riskDetail?.state_name || propStateName || 'State Jurisdiction';

  const riskLevel = (riskDetail?.risk_level || 'LOW').toUpperCase();
  const riskBadgeConfig = (() => {
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          label: 'Critical',
          badge: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
        };
      case 'HIGH':
        return {
          label: 'High',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'MODERATE':
        return {
          label: 'Moderate',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'LOW':
      default:
        return {
          label: 'Low',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
    }
  })();

  const reportedCrimes =
    incidentCount != null
      ? incidentCount
      : riskDetail?.historical_volume != null
      ? riskDetail.historical_volume
      : 0;

  return (
    <aside
      aria-label="District Details"
      className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col"
    >
      {/* Header with District Name and State Name */}
      <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">
            {displayName}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            {displayState}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close panel"
          aria-label="Close district panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center text-slate-400 text-xs my-auto">
          Loading district details...
        </div>
      ) : (
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Risk Classification & Risk Score */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Risk Classification
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${riskBadgeConfig.badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${riskBadgeConfig.dot}`} />
                  {riskBadgeConfig.label}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Risk Score
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-slate-900">
                    {riskDetail?.overall_risk_score != null
                      ? riskDetail.overall_risk_score.toFixed(1)
                      : 'N/A'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Reported Crimes */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Reported Crimes
              </span>
              <p className="mt-1.5 text-2xl font-bold font-mono text-[#0B1F3A]">
                {reportedCrimes.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Back Action */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs mt-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to State Map</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default CompactDistrictInfoPanel;
