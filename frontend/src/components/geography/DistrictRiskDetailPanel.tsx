import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  Compass,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  Info,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { riskApi, analyticsApi, geographyApi } from '../../api';
import type {
  DistrictRiskDetailResponse,
  CategoryBreakdownItem,
  TrendItem,
  DistrictDetailResponse,
} from '../../types';
import CrimeCategoryChart from '../charts/CrimeCategoryChart';
import CrimeTrendChart from '../charts/CrimeTrendChart';
import LoadingState from '../common/LoadingState';

interface DistrictRiskDetailPanelProps {
  districtId: number;
  districtName?: string;
  stateName?: string;
  geographyMode?: 'current' | 'historical';
  startDate?: string;
  endDate?: string;
  districtDetail?: DistrictDetailResponse | null;
  onBackToState: () => void;
  onBackToNational: () => void;
}

export const DistrictRiskDetailPanel: React.FC<DistrictRiskDetailPanelProps> = ({
  districtId,
  districtName,
  stateName,
  geographyMode = 'current',
  startDate,
  endDate,
  districtDetail: propDistrictDetail,
  onBackToState,
  onBackToNational,
}) => {
  const [riskDetail, setRiskDetail] = useState<DistrictRiskDetailResponse | null>(null);
  const [districtDetail, setDistrictDetail] = useState<DistrictDetailResponse | null>(
    propDistrictDetail || null
  );
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [trendInterval, setTrendInterval] = useState<'year' | 'month' | 'day'>('month');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propDistrictDetail) {
      setDistrictDetail(propDistrictDetail);
    }
  }, [propDistrictDetail]);

  useEffect(() => {
    let isMounted = true;
    const fetchDistrictData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [detailRes, catRes, trendRes, geoDetailRes] = await Promise.all([
          riskApi.getDistrictRiskDetail(districtId).catch(() => null),
          analyticsApi
            .getByCategory({
              district_id: districtId,
              geography_mode: geographyMode,
              start_date: startDate,
              end_date: endDate,
            })
            .catch(() => ({ total_incidents: 0, items: [] })),
          analyticsApi
            .getTrends(trendInterval, {
              district_id: districtId,
              geography_mode: geographyMode,
              start_date: startDate,
              end_date: endDate,
            })
            .catch(() => ({ interval: trendInterval, items: [] })),
          propDistrictDetail
            ? Promise.resolve(propDistrictDetail)
            : geographyApi.getDistrictDetail(districtId).catch(() => null),
        ]);

        if (isMounted) {
          setRiskDetail(detailRes);
          setCategories(catRes.items || []);
          setTrends(trendRes.items || []);
          if (geoDetailRes) setDistrictDetail(geoDetailRes);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load district risk intelligence:', err);
          setError(err?.message || 'Failed to retrieve district risk intelligence.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDistrictData();
    return () => {
      isMounted = false;
    };
  }, [districtId, geographyMode, startDate, endDate, trendInterval, propDistrictDetail]);

  const getRiskBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 border border-red-300 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            Critical Risk Hotspot
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
            High Risk Zone
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-300 shadow-2xs">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-700" />
            Moderate Risk Area
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Low Risk Area
          </span>
        );
    }
  };

  const formatDriverName = (driver?: string | null): string => {
    switch (driver) {
      case 'forecast_volume':
        return 'Crime Volume (Forecast Predicted)';
      case 'historical_volume':
        return 'Crime Volume (Observed Incidents)';
      case 'severity_profile':
      case 'severity_index':
      case 'severity_contribution':
        return 'Crime Severity Weight (30%)';
      case 'crime_rate_per_100k':
      case 'density_contribution':
        return 'Demographic Density (15%)';
      case 'trend_ratio':
      case 'trend_contribution':
        return 'Trend Direction (20%)';
      case 'volume_contribution':
        return 'Crime Volume Weight (35%)';
      default:
        return driver
          ? driver.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'N/A';
    }
  };

  const displayName = districtName || riskDetail?.district_name || `District #${districtId}`;
  const displayState = stateName || riskDetail?.state_name || '';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* 1. Header Toolbar with Three-Level Breadcrumb and Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900 text-cyan-200 border border-cyan-700">
              LEVEL 3 INTELLIGENCE
            </span>
            <span className="text-xs text-slate-500">
              India GIS Map &rsaquo; {displayState} &rsaquo;{' '}
              <strong className="text-slate-900">{displayName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#0B1F3A]">{displayName}</h2>
            {displayState && (
              <span className="text-sm font-semibold text-slate-500">
                ({displayState})
              </span>
            )}
            {riskDetail && getRiskBadge(riskDetail.risk_level)}
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToState}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {displayState ? `${displayState} Dots` : 'District Dots'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToNational}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 bg-blue-50 text-[#1769AA] hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Back to All-India Map</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="py-10">
          <LoadingState message={`Retrieving explainable risk score and factor decomposition for ${displayName}...`} />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={onBackToState}
            className="font-bold underline cursor-pointer"
          >
            Return to District View
          </button>
        </div>
      )}

      {!isLoading && !error && riskDetail && (
        <div className="space-y-5">
          {/* 2. Key Risk KPI Highlights Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Overall Risk Score */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-sm border border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Overall Composite Risk Score
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-amber-400">
                  {riskDetail.overall_risk_score.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
              <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                  style={{ width: `${Math.min(100, Math.max(0, riskDetail.overall_risk_score))}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Phase 9 Calibrated composite index
              </p>
            </div>

            {/* Assessment Mode & Scoring Engine */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Assessment Mode
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                    riskDetail.score_type === 'FORECAST'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}
                >
                  {riskDetail.score_type === 'FORECAST'
                    ? 'Forecast Predicted'
                    : 'Historical Observed'}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#1769AA] font-medium">
                Engine: <strong className="font-mono">{riskDetail.calculation_version}</strong>
              </p>
              <p className="text-[10px] text-slate-500">
                Period: {riskDetail.assessment_period}
              </p>
            </div>

            {/* Strongest Risk Driver */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Primary Risk Driver
              </span>
              <p className="mt-2 text-base font-bold text-[#0B1F3A]">
                {formatDriverName(riskDetail.strongest_driver)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Largest mathematical contributor to composite risk posture
              </p>
            </div>

            {/* Demographics & Incidence Density */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Crime Rate / 100k
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                  Census 2011
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-[#1769AA]">
                  {riskDetail.crime_rate_per_100k.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">per 100k</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Population: {riskDetail.census_2011_population.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 3. Explainable Factor Contributions Decomposition (The 4 Official Components) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  Explainable Risk Factor Decomposition (100% Weight Matrix)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Formula: Volume (35%) + Severity (30%) + Trend (20%) + Density (15%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Factor 1: Crime Volume (35%) */}
              {(() => {
                const vol =
                  riskDetail.factor_contributions?.volume_contribution ||
                  riskDetail.factor_contributions?.historical_volume ||
                  riskDetail.factor_contributions?.forecast_volume;
                return (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1F3A]">Crime Volume</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                        35% Weight
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Raw Volume:</span>
                      <strong className="font-mono text-slate-800">
                        {(vol?.raw ?? riskDetail.historical_volume).toLocaleString()}
                      </strong>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Percentile:</span>
                      <strong className="font-mono text-[#1769AA]">
                        {vol?.percentile != null ? `${vol.percentile.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Weighted:</span>
                      <span className="font-mono font-bold text-[#0B1F3A]">
                        {vol?.weighted != null ? vol.weighted.toFixed(1) : 'N/A'} / 35
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Factor 2: Crime Severity (30%) */}
              {(() => {
                const sev =
                  riskDetail.factor_contributions?.severity_contribution ||
                  riskDetail.factor_contributions?.severity_profile;
                return (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1F3A]">Crime Severity</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                        30% Weight
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Severity Index:</span>
                      <strong className="font-mono text-slate-800">
                        {riskDetail.severity_index.toFixed(2)}
                      </strong>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Percentile:</span>
                      <strong className="font-mono text-[#1769AA]">
                        {sev?.percentile != null ? `${sev.percentile.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Weighted:</span>
                      <span className="font-mono font-bold text-[#0B1F3A]">
                        {sev?.weighted != null ? sev.weighted.toFixed(1) : 'N/A'} / 30
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Factor 3: Trend Direction (20%) */}
              {(() => {
                const trd =
                  riskDetail.factor_contributions?.trend_contribution ||
                  riskDetail.factor_contributions?.trend_ratio;
                return (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1F3A]">Trend Direction</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                        20% Weight
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Trend Ratio:</span>
                      <strong className="font-mono text-slate-800">
                        {riskDetail.trend_ratio.toFixed(2)}x
                      </strong>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Percentile:</span>
                      <strong className="font-mono text-[#1769AA]">
                        {trd?.percentile != null ? `${trd.percentile.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Weighted:</span>
                      <span className="font-mono font-bold text-[#0B1F3A]">
                        {trd?.weighted != null ? trd.weighted.toFixed(1) : 'N/A'} / 20
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Factor 4: Demographic Density (15%) */}
              {(() => {
                const den =
                  riskDetail.factor_contributions?.density_contribution ||
                  riskDetail.factor_contributions?.crime_rate_per_100k;
                return (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1F3A]">Demographic Density</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                        15% Weight
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Incidence Rate:</span>
                      <strong className="font-mono text-slate-800">
                        {riskDetail.crime_rate_per_100k.toFixed(1)} / 100k
                      </strong>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Percentile:</span>
                      <strong className="font-mono text-[#1769AA]">
                        {den?.percentile != null ? `${den.percentile.toFixed(1)}%` : 'N/A'}
                      </strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Weighted:</span>
                      <span className="font-mono font-bold text-[#0B1F3A]">
                        {den?.weighted != null ? den.weighted.toFixed(1) : 'N/A'} / 15
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 4. Forecast Indicators (Explicitly Separated from Historical Risk) */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B1F3A]">
                <Sparkles className="h-4 w-4 text-[#1769AA]" />
                <span>Historical vs. Machine Learning Forecast Telemetry</span>
              </div>
              <span className="text-[11px] font-mono text-[#1769AA]">
                Phase 8 ML Inference Integration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-semibold">
                  Historical Observed Volume
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-[#0B1F3A]">
                  {riskDetail.historical_volume.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">Baseline incident count</span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-semibold">
                  Forecast Predicted Volume
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-purple-700">
                  {Math.round(riskDetail.forecast_volume).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">
                  Model: {riskDetail.model_name || 'Ridge / CatBoost Ensemble'} ({riskDetail.model_version || 'v2.0'})
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-semibold">
                  Forecast Momentum Shift
                </span>
                <p className="mt-1 text-xl font-bold font-mono text-[#1769AA]">
                  {(
                    ((riskDetail.forecast_volume - riskDetail.historical_volume) /
                      Math.max(1, riskDetail.historical_volume)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
                <span className="text-[10px] text-slate-400">
                  Projected period-over-period delta
                </span>
              </div>
            </div>

            {/* Plain-Language Explainability Narrative */}
            {riskDetail.explanation_summary && (
              <div className="mt-2.5 p-3 rounded-lg bg-white/90 border border-blue-100 text-xs text-[#0B1F3A] leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 text-[#1769AA] shrink-0 mt-0.5" />
                <span>{riskDetail.explanation_summary}</span>
              </div>
            )}
          </div>

          {/* 4.5. Census 2011 Socio-Demographic Baseline Indicators */}
          {districtDetail && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#1769AA]" />
                  <h3 className="text-sm font-bold text-[#0B1F3A]">
                    Census 2011 Demographic Baseline &amp; Socio-Economic Structure
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Census 2011 Baseline
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-semibold">Total Population</span>
                    <p className="font-mono font-bold text-base text-[#0B1F3A] mt-0.5">
                      {districtDetail.demographics.total_population.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-semibold">Gender Breakdown</span>
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
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-semibold">Literate Population</span>
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
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-semibold">Workforce Participation</span>
                    <p className="font-mono font-bold text-base text-[#0B1F3A] mt-0.5">
                      {districtDetail.demographics.total_workers.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Participation Rate:{' '}
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
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-800">
                  <p className="font-semibold">Census 2011 Standalone Demographics Unavailable</p>
                  <p className="text-[11px] mt-0.5 text-amber-700">
                    {districtDetail.notes ||
                      `This modern carved administrative district does not have an independent Census 2011 enumeration record. Lineage is mapped to parent jurisdiction #${districtDetail.parent_district_id}. Standalone enumeration awaits upcoming decennial Census.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5. Granular Visualizations: Category-Wise Breakdown & Longitudinal Trends */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#1769AA]" />
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  District Longitudinal Trends &amp; Crime Distribution
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Granular incident telemetry for {displayName}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Category Breakdown Donut */}
              <div className="lg:col-span-5">
                <CrimeCategoryChart
                  data={categories}
                  totalIncidents={categories.reduce((acc, c) => acc + c.incident_count, 0)}
                />
              </div>

              {/* Longitudinal Trend Chart */}
              <div className="lg:col-span-7">
                <CrimeTrendChart
                  data={trends}
                  interval={trendInterval}
                  onIntervalChange={(newInt) => setTrendInterval(newInt)}
                />
              </div>
            </div>
          </div>

          {/* 6. Administrative Lineage & Census Compliance Note */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              {riskDetail.is_derived_from_parent ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <GitBranch className="h-3 w-3" />
                  Carved Jurisdiction linked to Parent #{riskDetail.parent_district_id} ({riskDetail.parent_district_name})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Census 2011 Standalone Enumerated District
                </span>
              )}
            </div>
            <span className="font-mono text-[10px]">
              District Master ID: #{riskDetail.district_id} &bull; State ID: #{riskDetail.state_id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictRiskDetailPanel;
