import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Activity,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  MapPin,
  RotateCcw,
  Layers,
  BarChart2,
  ShieldAlert,
  Car,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Sliders,
  Users,
  ExternalLink,
  Camera,
  Microscope,
  Laptop,
  HeartPulse,
  Radio,
  Gauge,
  FileSearch,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { predictionApi, geographyApi, optimizationApi } from '../api';
import type {
  PredictionOverview,
  EvaluationComparison,
  PredictionItem,
} from '../api/predictionApi';
import type {
  DistrictPipelineForecastResponse,
  StateItem,
  DistrictItem,
} from '../types';

const FORECAST_PERIOD_OPTIONS = [
  { value: '2026-11', label: 'November 2026 (Active Forecast)', year: 2026, month: 11 },
  { value: '2026-12', label: 'December 2026 (Active Forecast)', year: 2026, month: 12 },
  { value: '2027-01', label: 'January 2027 (Active Forecast)', year: 2027, month: 1 },
  { value: '2027-02', label: 'February 2027 (Active Forecast)', year: 2027, month: 2 },
  { value: '2027-03', label: 'March 2027 (Active Forecast)', year: 2027, month: 3 },
  { value: '2027-04', label: 'April 2027 (Active Forecast)', year: 2027, month: 4 },
  { value: '2027-05', label: 'May 2027 (Active Forecast)', year: 2027, month: 5 },
  { value: '2027-06', label: 'June 2027 (Active Forecast)', year: 2027, month: 6 },
  { value: '2027-07', label: 'July 2027 (Active Forecast)', year: 2027, month: 7 },
  { value: '2027-08', label: 'August 2027 (Active Forecast)', year: 2027, month: 8 },
  { value: '2027-09', label: 'September 2027 (Active Forecast)', year: 2027, month: 9 },
  { value: '2027-10', label: 'October 2027 (Active Forecast)', year: 2027, month: 10 },
];

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; bar: string; icon: typeof Layers }
> = {
  'Other Crime': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: 'bg-[#1769AA]',
    icon: Layers,
  },
  'Violent Crime': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: 'bg-rose-600',
    icon: ShieldAlert,
  },
  'Fire Accident': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    icon: Flame,
  },
  'Traffic Fatality': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: 'bg-emerald-600',
    icon: Car,
  },
};

const PRIORITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const POOL_METADATA: Record<
  string,
  {
    name: string;
    unit: string;
    icon: typeof Users;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  PERSONNEL: {
    name: 'Police Personnel',
    unit: 'Personnel',
    icon: Users,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
  },
  MOBILITY: {
    name: 'Mobility Fleet',
    unit: 'Vehicles',
    icon: Car,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
  },
  INVESTIGATION: {
    name: 'Investigation Teams',
    unit: 'Teams',
    icon: FileSearch,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  SPECIALIZED: {
    name: 'Specialized Units',
    unit: 'Units',
    icon: ShieldAlert,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
  SURVEILLANCE: {
    name: 'Surveillance CCTV',
    unit: 'Cameras',
    icon: Camera,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200',
  },
  FORENSIC: {
    name: 'Forensic Lab Capacity',
    unit: 'Tests/Month',
    icon: Microscope,
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
  },
  CYBER_TECHNOLOGY: {
    name: 'Cyber Workstations',
    unit: 'Workstations',
    icon: Laptop,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  EMERGENCY_RESPONSE: {
    name: 'EMS Ambulances',
    unit: 'Ambulances',
    icon: HeartPulse,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
  COMMUNICATION: {
    name: 'Radio & Dispatch',
    unit: 'Channels',
    icon: Radio,
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
  TRAFFIC_SAFETY: {
    name: 'Traffic Safety Devices',
    unit: 'Devices',
    icon: Gauge,
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
  },
};

export const PredictionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Geographic and temporal controls
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(() => {
    const s = searchParams.get('state_id');
    return s ? Number(s) : undefined;
  });
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(() => {
    const d = searchParams.get('district_id');
    return d ? Number(d) : undefined;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    return searchParams.get('period') || '2026-11';
  });

  // Overview and Model Evaluation data
  const [overview, setOverview] = useState<PredictionOverview | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationComparison | null>(null);
  const [stateTopDistricts, setStateTopDistricts] = useState<PredictionItem[]>([]);
  const [showEvaluationReport, setShowEvaluationReport] = useState<boolean>(false);

  // Integrated Pipeline Forecast Data (Predictions + Risk + 10-Pool Resources)
  const [pipelineData, setPipelineData] = useState<DistrictPipelineForecastResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  // Filter tabs for the 21-crime prediction table
  const [crimeCategoryFilter, setCrimeCategoryFilter] = useState<string>('ALL');
  const [resourcePoolFilter, setResourcePoolFilter] = useState<string>('ALL');

  // UI section expansion
  const [showResourceSection, setShowResourceSection] = useState<boolean>(true);
  const resourcesRef = useRef<HTMLDivElement | null>(null);

  // Page initialization loading/error
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Initial load: Fetch states, pipeline overview, and evaluation comparisons
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true);
    setPageError(null);
    try {
      const [statesRes, overviewRes, evalRes] = await Promise.all([
        geographyApi.getStates(),
        predictionApi.getOverview().catch(() => null),
        predictionApi.getEvaluation().catch(() => null),
      ]);
      const stateList = statesRes.items || [];
      setStates(stateList);
      setOverview(overviewRes);
      setEvaluation(evalRes);

      // Check URL parameters for pre-selected state/district
      const paramStateId = searchParams.get('state_id') ? Number(searchParams.get('state_id')) : undefined;
      const paramDistId = searchParams.get('district_id') ? Number(searchParams.get('district_id')) : undefined;
      const paramPeriod = searchParams.get('period') || '2026-11';

      if (paramStateId) {
        setSelectedStateId(paramStateId);
        const distsRes = await geographyApi.getDistricts(paramStateId, 'current');
        const dItems = distsRes.items || [];
        setDistricts(dItems);

        if (paramDistId) {
          setSelectedDistrictId(paramDistId);
          const [yearStr, monthStr] = paramPeriod.split('-');
          const y = Number(yearStr) || 2026;
          const m = Number(monthStr) || 11;
          // Auto-trigger prediction for URL-provided target
          executePipelinePrediction(paramDistId, y, m);
        }
      }
    } catch (err: any) {
      setPageError(err?.message || 'Failed to initialize crime predictions.');
    } finally {
      setIsInitialLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When State changes, load districts and state-level top forecast predictions
  const handleStateChange = async (stateId: number | undefined) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId(undefined);
    setDistricts([]);
    setPipelineData(null);
    setPredictError(null);

    if (!stateId) {
      setStateTopDistricts([]);
      setSearchParams({});
      return;
    }

    setSearchParams({ state_id: String(stateId), period: selectedPeriod });

    try {
      const [distsRes, predsRes] = await Promise.all([
        geographyApi.getDistricts(stateId, 'current'),
        predictionApi.getMonthlyPredictions({
          state_id: stateId,
          forecast_status: 'CURRENT_FUTURE_FORECAST',
          limit: 15,
        }),
      ]);
      setDistricts(distsRes.items || []);
      setStateTopDistricts(predsRes.items || []);
    } catch {
      setDistricts([]);
      setStateTopDistricts([]);
    }
  };

  // When District changes
  const handleDistrictChange = (districtId: number | undefined) => {
    setSelectedDistrictId(districtId);
    setPredictError(null);
    setPipelineData(null);

    if (districtId && selectedStateId) {
      setSearchParams({
        state_id: String(selectedStateId),
        district_id: String(districtId),
        period: selectedPeriod,
      });
    }
  };

  // When Period changes
  const handlePeriodChange = (periodVal: string) => {
    setSelectedPeriod(periodVal);
    setPredictError(null);
    if (selectedDistrictId) {
      const [yStr, mStr] = periodVal.split('-');
      executePipelinePrediction(selectedDistrictId, Number(yStr), Number(mStr));
    }
  };

  // Reset Filters handler
  const handleResetFilters = () => {
    setSelectedStateId(undefined);
    setSelectedDistrictId(undefined);
    setSelectedPeriod('2026-11');
    setDistricts([]);
    setStateTopDistricts([]);
    setPipelineData(null);
    setPredictError(null);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    selectedStateId !== undefined ||
    selectedDistrictId !== undefined ||
    selectedPeriod !== '2026-11'
  );

  // Execute integrated prediction & 10-pool optimization pipeline
  const executePipelinePrediction = async (districtId: number, year: number, month: number) => {
    setIsPredicting(true);
    setPredictError(null);
    try {
      const data = await optimizationApi.getDistrictPipelineForecast({
        district_id: districtId,
        year,
        month,
      });
      setPipelineData(data);
      setShowResourceSection(true);
    } catch (err: any) {
      setPredictError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to execute crime forecasting and resource optimization pipeline.'
      );
      setPipelineData(null);
    } finally {
      setIsPredicting(false);
    }
  };

  const handlePredictClick = () => {
    if (!selectedDistrictId) {
      setPredictError('Please select a state and district to generate predictions.');
      return;
    }
    const [yStr, mStr] = selectedPeriod.split('-');
    executePipelinePrediction(selectedDistrictId, Number(yStr), Number(mStr));
  };

  // Quick select a district from the comparison ranking table
  const handleQuickSelectDistrict = (item: PredictionItem) => {
    setSelectedStateId(item.state_id);
    setSelectedDistrictId(item.district_id);
    setSelectedPeriod('2026-11');
    if (item.state_id) {
      geographyApi.getDistricts(item.state_id, 'current').then((res) => {
        setDistricts(res.items || []);
      });
    }
    executePipelinePrediction(item.district_id, 2026, 11);
  };

  // Scroll to Resource Optimization section
  const handleScrollToResources = () => {
    setShowResourceSection(true);
    if (resourcesRef.current) {
      resourcesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Navigate to full Resource Optimization studio
  const handleNavigateToStudio = () => {
    if (!selectedDistrictId || !selectedStateId) return;
    navigate(
      `/resources?state_id=${selectedStateId}&district_id=${selectedDistrictId}&period=${selectedPeriod}&tab=ai_optimization`
    );
  };

  // Filtered canonical crime predictions
  const filteredCrimePredictions = useMemo(() => {
    if (!pipelineData) return [];
    if (crimeCategoryFilter === 'ALL') return pipelineData.canonical_crime_predictions;
    return pipelineData.canonical_crime_predictions.filter(
      (cp) => cp.category_name.toLowerCase() === crimeCategoryFilter.toLowerCase()
    );
  }, [pipelineData, crimeCategoryFilter]);

  // Max predicted count for relative progress bars
  const maxCrimeCount = useMemo(() => {
    if (!pipelineData || pipelineData.canonical_crime_predictions.length === 0) return 1;
    return Math.max(...pipelineData.canonical_crime_predictions.map((p) => p.predicted_count), 0.01);
  }, [pipelineData]);

  // Top 8 predicted crime types for Bar Chart visualization
  const topCrimesChartData = useMemo(() => {
    if (!pipelineData) return [];
    return pipelineData.canonical_crime_predictions
      .filter((cp) => cp.predicted_count > 0)
      .slice(0, 8)
      .map((cp) => ({
        name: cp.crime_name.length > 18 ? `${cp.crime_name.substring(0, 16)}...` : cp.crime_name,
        fullName: cp.crime_name,
        count: cp.predicted_count,
        category: cp.category_name,
        severity: cp.severity_level,
      }));
  }, [pipelineData]);

  // Timeline chart formatting
  const chartPoints = useMemo(() => {
    if (!pipelineData || !pipelineData.timeline_points) return [];
    return pipelineData.timeline_points.map((pt) => ({
      period: pt.period,
      actual: pt.actual !== null && pt.actual !== undefined ? pt.actual : undefined,
      current_future: pt.predicted !== null && pt.predicted !== undefined ? pt.predicted : undefined,
    }));
  }, [pipelineData]);

  // Filtered resource recommendations
  const filteredResourceRecs = useMemo(() => {
    if (!pipelineData) return [];
    if (resourcePoolFilter === 'ALL') return pipelineData.resource_recommendations;
    return pipelineData.resource_recommendations.filter(
      (r) => r.resource_category === resourcePoolFilter
    );
  }, [pipelineData, resourcePoolFilter]);

  return (
    <DashboardLayout
      hideSidebar
      icon={Activity}
      title="Crime Predictions & Preventive Resource Optimization"
      onRefresh={loadInitialData}
      isRefreshing={isInitialLoading}
    >
      {isInitialLoading && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Loading predictions and optimization pipeline..." />
        </div>
      )}

      {pageError && (
        <ErrorState
          title="Prediction Service Error"
          message={pageError}
          onRetry={loadInitialData}
        />
      )}

      {!isInitialLoading && !pageError && (
        <div className="space-y-4">
          {/* HIGH-LEVEL ARCHITECTURE & MODEL EVALUATION ACCORDION */}
          {overview && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200/60 pb-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded p-1 bg-[#EAF3FA] text-[#1769AA]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1F3A]">
                      AI Crime Prediction & 10-Pool Resource Optimization Pipeline
                    </h3>
                    <p className="text-[11px] text-[#5D6878]">
                      Production ML Model: <span className="font-semibold text-[#1769AA]">{overview.active_model_name}</span> ({overview.algorithm} {overview.active_model_version})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-[#1769AA] border border-blue-200">
                    Active Horizon: {overview.current_forecast_start || '2026-11'} to {overview.current_forecast_end || '2027-10'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEvaluationReport((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-white border border-[#D9E1EA] text-[#0B1F3A] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-[#1769AA]" />
                    <span>{showEvaluationReport ? 'Hide Evaluation' : 'Model Evaluation'}</span>
                    {showEvaluationReport ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable Model Evaluation Comparison Report */}
              {showEvaluationReport && evaluation && (
                <div className="mt-3 pt-3 border-t border-blue-200/60 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[#C98512]" />
                      <span>Model Evaluation (Evaluated on Untouched 2025 Test Observations)</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      7,680 Test Observations | WAPE 36.84% | R² 0.6063
                    </span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded border border-[#D9E1EA]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[10px] font-semibold uppercase text-slate-500">
                          <th className="py-2 px-3">Model Architecture</th>
                          <th className="py-2 px-3 text-right">MAE</th>
                          <th className="py-2 px-3 text-right">RMSE</th>
                          <th className="py-2 px-3 text-right">WAPE %</th>
                          <th className="py-2 px-3 text-right">R² Score</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {Object.entries(evaluation.metrics_summary).map(([name, m]) => {
                          const isPrimary = name === 'HistGradientBoosting';
                          return (
                            <tr key={name} className={isPrimary ? 'bg-blue-50/70 font-bold text-[#1769AA]' : 'hover:bg-slate-50'}>
                              <td className="py-2 px-3 font-sans">
                                <div className="flex items-center gap-1.5">
                                  <span>{name.replace(/_/g, ' ')}</span>
                                  {isPrimary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[#1769AA] text-white">
                                      Production Primary
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right">{m.MAE.toFixed(4)}</td>
                              <td className="py-2 px-3 text-right">{m.RMSE.toFixed(4)}</td>
                              <td className="py-2 px-3 text-right">{m['WAPE%'].toFixed(2)}%</td>
                              <td className="py-2 px-3 text-right">{m.R2.toFixed(4)}</td>
                              <td className="py-2 px-3 text-right font-sans">
                                {isPrimary ? (
                                  <span className="text-emerald-700 font-bold">Selected</span>
                                ) : (
                                  <span className="text-slate-400">Evaluated</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PART 1 & PART 7: INTUITIVE CONTROL PANEL AT TOP */}
          <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Target Forecast:</span>
                </div>

                {/* 1. State / UT Selector */}
                <select
                  aria-label="Select State"
                  value={selectedStateId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleStateChange(val);
                  }}
                  className="h-10 w-full sm:w-auto sm:min-w-[200px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  <option value="">Select State / UT</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.state_name}
                    </option>
                  ))}
                </select>

                {/* 2. District Selector */}
                <select
                  aria-label="Select District"
                  value={selectedDistrictId || ''}
                  disabled={!selectedStateId || districts.length === 0}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    handleDistrictChange(val);
                  }}
                  className="h-10 w-full sm:w-auto sm:min-w-[200px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedStateId ? 'First Choose State' : 'Select District'}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name} {!d.is_census_2011 ? '(Carved)' : ''}
                    </option>
                  ))}
                </select>

                {/* 3. Forecast Month / Period Selector */}
                <select
                  aria-label="Forecast Month"
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="h-10 w-full sm:w-auto sm:min-w-[210px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
                >
                  {FORECAST_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* 4. Predict Button */}
                <button
                  type="button"
                  onClick={handlePredictClick}
                  disabled={isPredicting || !selectedDistrictId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#1769AA] px-5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isPredicting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating ML Predictions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Predict Crime</span>
                    </>
                  )}
                </button>
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                  title="Reset filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {predictError && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{predictError}</span>
              </div>
            )}
          </div>

          {/* STATE-LEVEL RANKING TABLE (Visible before district prediction is run) */}
          {!pipelineData && !isPredicting && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                      {selectedStateId
                        ? `District Forecast Ranking — ${states.find((s) => s.id === selectedStateId)?.state_name || 'Selected State'}`
                        : 'Top Projected Jurisdictions (National Forecast Comparison)'}
                    </h3>
                    <p className="text-[11px] text-[#5D6878]">
                      Click &apos;Predict District&apos; to generate full crime-wise predictions and 10-pool preventive resource optimization.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {stateTopDistricts.length > 0 ? stateTopDistricts.length : overview?.top_predicted_districts?.length || 0} Districts Monitored
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[10px] font-semibold uppercase text-[#5D6878]">
                      <th className="py-2.5 pl-3 w-14"># Rank</th>
                      <th className="py-2.5 px-3">District & Lineage</th>
                      <th className="py-2.5 px-3">State / UT</th>
                      <th className="py-2.5 px-3">Forecast Period</th>
                      <th className="py-2.5 px-3 text-right">Projected Crimes</th>
                      <th className="py-2.5 px-3 text-right">80% Conformal Interval</th>
                      <th className="py-2.5 pr-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                    {(stateTopDistricts.length > 0 ? stateTopDistricts : overview?.top_predicted_districts || []).map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => handleQuickSelectDistrict(item)}
                      >
                        <td className="py-2.5 pl-3 font-mono font-bold text-slate-500">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-[#C98512]'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#0B1F3A]">{item.district_name}</span>
                            {item.is_derived_from_parent && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <GitBranch className="h-2.5 w-2.5" />
                                <span>Carved</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#5D6878]">{item.state_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.forecast_period}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1769AA] text-[13px]">
                          {item.predicted_crime_count.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.prediction_interval_lower !== null &&
                          item.prediction_interval_lower !== undefined &&
                          item.prediction_interval_upper !== null &&
                          item.prediction_interval_upper !== undefined
                            ? `[${item.prediction_interval_lower.toFixed(2)} – ${item.prediction_interval_upper.toFixed(2)}]`
                            : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickSelectDistrict(item);
                            }}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold text-[#1769AA] bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Predict District
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOADING STATE */}
          {isPredicting && (
            <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 text-center shadow-2xs">
              <div className="flex flex-col items-center justify-center gap-2 text-[#1769AA]">
                <RefreshCw className="h-6 w-6 animate-spin text-[#1769AA]" />
                <span className="text-sm font-semibold">Running Phase 8 ML Crime Prediction Pipeline...</span>
                <span className="text-xs text-[#5D6878]">Generating 21 canonical crime types, risk scores, and 10-pool resource demands</span>
              </div>
            </div>
          )}

          {/* PART 2: DISPLAY CRIME-WISE PREDICTIONS RESULTS */}
          {!isPredicting && pipelineData && (
            <div className="space-y-4">
              {/* SECTION A: PREDICTION SUMMARY KPI BAR */}
              <div className="rounded-lg border border-[#D9E1EA] bg-white shadow-2xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-50/60 to-white border-b border-[#D9E1EA]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1769AA] shrink-0" />
                    <h2 className="text-base font-bold text-[#0B1F3A]">
                      {pipelineData.district_name}, {pipelineData.state_name}
                    </h2>
                    {pipelineData.is_derived_from_parent && (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Derived from {pipelineData.parent_district_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-white text-[#1769AA] border border-blue-200">
                      Forecast Period: {pipelineData.forecast_period.substring(0, 7)}
                    </span>
                    <button
                      type="button"
                      onClick={handleScrollToResources}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#1769AA] text-white hover:bg-[#12558a] shadow-2xs transition-colors cursor-pointer"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Optimize Resources</span>
                    </button>
                  </div>
                </div>

                {/* 4 Summary Cards */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Total Predicted Crime Incidents */}
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <span className="text-xs font-medium text-[#5D6878]">Total Predicted Incidents</span>
                    <div className="mt-1">
                      <span className="text-2xl font-bold font-mono text-[#1769AA]">
                        {pipelineData.total_predicted_crimes.toFixed(2)}
                      </span>
                      {pipelineData.prediction_interval_lower !== null &&
                        pipelineData.prediction_interval_lower !== undefined &&
                        pipelineData.prediction_interval_upper !== null &&
                        pipelineData.prediction_interval_upper !== undefined && (
                          <span className="text-[11px] text-[#7C8796] block mt-0.5">
                            80% CI: [{pipelineData.prediction_interval_lower.toFixed(2)} – {pipelineData.prediction_interval_upper.toFixed(2)}]
                          </span>
                        )}
                    </div>
                  </div>

                  {/* 2. Expected Trend */}
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <span className="text-xs font-medium text-[#5D6878]">Overall Forecast Trend</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                          pipelineData.overall_trend === 'Higher'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : pipelineData.overall_trend === 'Lower'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {pipelineData.overall_trend === 'Higher' && <ArrowUpRight className="h-3.5 w-3.5" />}
                        {pipelineData.overall_trend === 'Lower' && <ArrowDownRight className="h-3.5 w-3.5" />}
                        {pipelineData.overall_trend === 'Similar' && <Minus className="h-3.5 w-3.5" />}
                        {pipelineData.overall_trend}
                      </span>
                      <span className="text-[11px] text-[#7C8796] block mt-0.5">
                        Compared to historical seasonal baseline
                      </span>
                    </div>
                  </div>

                  {/* 3. District Risk Score (Phase 9) */}
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <span className="text-xs font-medium text-[#5D6878]">District Risk Score (Phase 9)</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-2xl font-bold font-mono text-[#0B1F3A]">
                        {pipelineData.district_risk_score.toFixed(1)} / 100
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          PRIORITY_BADGES[pipelineData.district_risk_level]?.bg || 'bg-slate-50'
                        } ${PRIORITY_BADGES[pipelineData.district_risk_level]?.text || 'text-slate-700'} ${
                          PRIORITY_BADGES[pipelineData.district_risk_level]?.border || 'border-slate-200'
                        }`}
                      >
                        {pipelineData.district_risk_level}
                      </span>
                    </div>
                  </div>

                  {/* 4. Downstream 10-Pool Demand */}
                  <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
                    <span className="text-xs font-medium text-[#5D6878]">Resource Demand Status</span>
                    <div className="mt-1">
                      <span className="text-xl font-bold font-mono text-emerald-700">
                        10 Pools Active
                      </span>
                      <span className="text-[11px] text-[#7C8796] block mt-0.5">
                        210 institutional mappings mapped
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: INDIVIDUAL CRIME PREDICTIONS TABLE (21 CANONICAL CRIME TYPES) */}
              <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
                      <BarChart2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F3A]">
                        Individual Crime-Wise Predictions (All 21 Canonical Crime Types)
                      </h3>
                      <p className="text-xs text-[#5D6878]">
                        Exact model predicted counts, trends, and Phase 9 risk-prioritized threat rankings
                      </p>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['ALL', 'Violent Crime', 'Other Crime', 'Traffic Fatality', 'Fire Accident'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCrimeCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          crimeCategoryFilter === cat
                            ? 'bg-[#1769AA] text-white shadow-2xs'
                            : 'bg-slate-100 text-[#5D6878] hover:bg-slate-200'
                        }`}
                      >
                        {cat === 'ALL' ? 'All (21 Types)' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[10px] font-semibold uppercase text-[#5D6878]">
                        <th className="py-2.5 pl-3 w-12"># Rank</th>
                        <th className="py-2.5 px-3">Crime Type</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Predicted Incidents</th>
                        <th className="py-2.5 px-3 w-36">Caseload Volume</th>
                        <th className="py-2.5 px-3 text-right">Baseline Comparison</th>
                        <th className="py-2.5 px-3 text-center">Trend</th>
                        <th className="py-2.5 pr-3 text-center">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                      {filteredCrimePredictions.map((cp, idx) => {
                        const pctOfMax = maxCrimeCount > 0 ? (cp.predicted_count / maxCrimeCount) * 100 : 0;
                        const catStyle = CATEGORY_STYLES[cp.category_name] || CATEGORY_STYLES['Other Crime'];
                        const prioBadge = PRIORITY_BADGES[cp.priority_level] || PRIORITY_BADGES.LOW;

                        return (
                          <tr key={cp.crime_type_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 pl-3 font-mono font-bold text-slate-500">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">
                              <div className="flex items-center gap-1.5">
                                <span>{cp.crime_name}</span>
                                <span className="font-mono text-[9.5px] text-[#7C8796] bg-[#F4F7FA] px-1.5 py-0.2 rounded border border-[#E2E8F0]">
                                  {cp.crime_code}
                                </span>
                                {cp.is_sparse && (
                                  <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    Rare
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#5D6878]">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                                {cp.category_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[13px] text-[#0B1F3A]">
                              {cp.predicted_count > 0 ? (
                                cp.predicted_count.toFixed(2)
                              ) : (
                                <span className="text-slate-400 font-normal text-xs">0.00 (None)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${catStyle.bar}`}
                                  style={{ width: `${Math.max(pctOfMax, cp.predicted_count > 0 ? 3 : 0)}%` }}
                                />
                              </div>
                              <span className="text-[9.5px] text-slate-400 block mt-0.5">
                                {cp.share_of_total_percent.toFixed(1)}% of district total
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                              {cp.historical_baseline_count !== null && cp.historical_baseline_count !== undefined ? (
                                <span>
                                  {cp.historical_baseline_count.toFixed(2)}{' '}
                                  {cp.percentage_change !== null && cp.percentage_change !== undefined && (
                                    <span
                                      className={
                                        cp.percentage_change > 0
                                          ? 'text-rose-600 font-semibold'
                                          : 'text-emerald-600 font-semibold'
                                      }
                                    >
                                      ({cp.percentage_change > 0 ? '+' : ''}
                                      {cp.percentage_change.toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                                  cp.trend_status === 'Increasing'
                                    ? 'bg-rose-50 text-rose-700'
                                    : cp.trend_status === 'Decreasing'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {cp.trend_status}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${prioBadge.bg} ${prioBadge.text} ${prioBadge.border}`}
                              >
                                {cp.priority_level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C: VISUALIZATIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Visual 1: Crime-Wise Predicted Incidents Bar Chart */}
                <div className="lg:col-span-6 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-[#1769AA]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                        Top Projected Crime Types (Incident Count)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {topCrimesChartData.length} Active Crimes
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    {topCrimesChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topCrimesChartData}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" stroke="#CBD5E1" tick={{ fill: '#64748B', fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#CBD5E1"
                            tick={{ fill: '#334155', fontSize: 10 }}
                            width={110}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '0.5rem',
                              fontSize: '0.75rem',
                            }}
                            formatter={(val: any) => [`${Number(val).toFixed(2)} incidents`, 'Predicted Count']}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {topCrimesChartData.map((entry, index) => {
                              const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES['Other Crime'];
                              const barColor =
                                style.bar === 'bg-rose-600'
                                  ? '#E11D48'
                                  : style.bar === 'bg-amber-500'
                                  ? '#F59E0B'
                                  : style.bar === 'bg-emerald-600'
                                  ? '#059669'
                                  : '#1769AA';
                              return <Cell key={`cell-${index}`} fill={barColor} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        No non-zero crime predictions for this district.
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual 2: Historical Actuals vs Forecast Timeline */}
                <div className="lg:col-span-6 rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-[#1769AA]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                        Historical Actuals vs Forecast Trend
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Strict Separation (≤2025 vs ≥2026)
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    {chartPoints.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartPoints} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="period" stroke="#CBD5E1" tick={{ fill: '#64748B', fontSize: 10 }} />
                          <YAxis stroke="#CBD5E1" tick={{ fill: '#64748B', fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '0.5rem',
                              fontSize: '0.75rem',
                            }}
                          />
                          <Legend
                            verticalAlign="top"
                            height={28}
                            formatter={(value) => {
                              if (value === 'actual') return <span className="text-xs font-semibold text-[#1769AA]">Historical Actuals</span>;
                              if (value === 'current_future') return <span className="text-xs font-bold text-emerald-700">Projected Estimate</span>;
                              return <span className="text-xs text-slate-500">{value}</span>;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="actual"
                            name="actual"
                            stroke="#1769AA"
                            strokeWidth={2}
                            fill="#1769AA"
                            fillOpacity={0.12}
                          />
                          <Line
                            type="monotone"
                            dataKey="current_future"
                            name="current_future"
                            stroke="#059669"
                            strokeWidth={2.5}
                            dot={{ r: 2.5, fill: '#059669' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        No timeline points available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual 3: Category Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pipelineData.category_distribution.map((cat: any) => {
                  const style = CATEGORY_STYLES[cat.category_name] || CATEGORY_STYLES['Other Crime'];
                  const Icon = style.icon;
                  return (
                    <div key={cat.category_id} className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`rounded p-1 ${style.bg} ${style.text} border ${style.border}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-[#0B1F3A]">{cat.category_name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#0B1F3A]">
                          {cat.predicted_count.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${style.bar}`}
                          style={{ width: `${Math.min(cat.share_of_total_percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10.5px] text-[#5D6878]">
                        <span>{cat.crime_types_count} crime types</span>
                        <span className="font-semibold">{cat.share_of_total_percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SECTION D: PROMINENT OPTIMIZE RESOURCES ACTION BANNER */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg p-2 bg-emerald-100 text-emerald-800">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Phase 10 AI Preventive Resource Optimization
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Convert these {pipelineData.canonical_crime_predictions.length} crime predictions into optimal preventive resource allocations across all 10 resource pools.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleScrollToResources}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#1769AA] text-white shadow-2xs hover:bg-[#12558a] transition-colors cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>View District Resource Allocations</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNavigateToStudio}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                  >
                    <span>Open Optimization Studio</span>
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                  </button>
                </div>
              </div>

              {/* PART 4: SECTION E: 10-POOL RESOURCE RECOMMENDATIONS FOR THIS DISTRICT */}
              <div ref={resourcesRef} className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded p-1 bg-[#EAF3FA] text-[#1769AA]">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F3A]">
                        Resource Recommendations — {pipelineData.district_name} ({pipelineData.forecast_period.substring(0, 7)})
                      </h3>
                      <p className="text-xs text-[#5D6878]">
                        Allocations derived via Scipy Integer MILP based on 21 predicted crime types and standing state capacity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      State: {pipelineData.state_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowResourceSection((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs text-[#5D6878] hover:text-[#0B1F3A] px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {showResourceSection ? (
                        <>
                          <span>Collapse</span>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Expand</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showResourceSection && (
                  <>
                    {/* 10 Thematic Pool Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(pipelineData.pool_summaries).map(([cat, pool]) => {
                    const meta = POOL_METADATA[cat] || {
                      name: cat,
                      unit: 'Units',
                      icon: Users,
                      color: 'text-slate-600',
                      badgeBg: 'bg-slate-50',
                      badgeText: 'text-slate-700',
                      badgeBorder: 'border-slate-200',
                    };
                    const Icon = meta.icon;
                    const isConfigured = pool.is_configured !== false;

                    return (
                      <div
                        key={cat}
                        className={`rounded-lg border p-3 flex flex-col justify-between shadow-2xs ${
                          isConfigured ? 'border-[#D9E1EA] bg-white' : 'border-amber-200 bg-amber-50/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                              <span className="text-xs font-bold text-[#0B1F3A] truncate" title={meta.name}>
                                {meta.name}
                              </span>
                            </div>
                            {pool.is_external_partner && (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded">
                                Partner
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-base font-bold font-mono text-[#0B1F3A]">
                              {isConfigured ? (
                                <>
                                  {pool.allocated}{' '}
                                  <span className="text-[10px] font-normal text-slate-500">{pool.unit_of_measure || meta.unit}</span>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-amber-800">Unconfigured</span>
                              )}
                            </span>
                            <span className="text-[10.5px] font-mono text-slate-500">
                              Dem: {pool.demand}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Pool Avail:</span>
                          <span className="font-mono font-semibold text-slate-600">
                            {isConfigured ? `${pool.capacity} ${pool.unit_of_measure || meta.unit}` : '0 (Audit Req)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Granular Crime-to-Resource Operational Breakdown Table */}
                <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded p-1 bg-[#EAF3FA] text-[#1769AA]">
                        <SlidersHorizontal className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                          Crime-Specific Demand & Operational Allocation Breakdown
                        </h4>
                        <p className="text-[11px] text-[#5D6878]">
                          Each predicted crime type mapped to its required preventive pools via institutional coefficients
                        </p>
                      </div>
                    </div>

                    {/* Filter by Pool Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Filter Pool:</span>
                      <select
                        aria-label="Filter by Pool"
                        value={resourcePoolFilter}
                        onChange={(e) => setResourcePoolFilter(e.target.value)}
                        className="h-8 rounded border border-[#D9E1EA] bg-white py-1 px-2.5 text-xs font-medium text-[#172033] shadow-2xs cursor-pointer"
                      >
                        <option value="ALL">All 10 Pools</option>
                        {Object.keys(POOL_METADATA).map((p) => (
                          <option key={p} value={p}>
                            {POOL_METADATA[p].name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[750px]">
                      <thead>
                        <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[10px] font-semibold uppercase text-[#5D6878]">
                          <th className="py-2.5 pl-3">Predicted Crime Type</th>
                          <th className="py-2.5 px-3 text-right">Forecast Incidents</th>
                          <th className="py-2.5 px-3">Resource Pool</th>
                          <th className="py-2.5 px-3 text-right">Coefficient</th>
                          <th className="py-2.5 px-3 text-right">Calculated Demand</th>
                          <th className="py-2.5 px-3 text-right">District Allocation</th>
                          <th className="py-2.5 px-3 text-right">Deficit</th>
                          <th className="py-2.5 pr-3">Operational Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredResourceRecs.map((rec, idx) => {
                          const meta = POOL_METADATA[rec.resource_category] || POOL_METADATA.PERSONNEL;
                          const Icon = meta.icon;

                          return (
                            <tr key={`${rec.crime_type_id}-${rec.resource_category}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 pl-3 font-semibold text-[#0B1F3A]">
                                {rec.crime_name}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                {rec.predicted_count.toFixed(2)}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}>
                                  <Icon className="h-3 w-3" />
                                  <span>{meta.name}</span>
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                {rec.coefficient.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-[#1769AA]">
                                {rec.raw_demand.toFixed(2)} {rec.unit_of_measure}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                {rec.is_configured ? (
                                  `${rec.allocated_quantity} ${rec.unit_of_measure}`
                                ) : (
                                  <span className="text-amber-700 font-normal text-[11px]">0 (Unconfigured)</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                {rec.shortage > 0 ? (
                                  <span className="text-rose-600 font-semibold">{rec.shortage}</span>
                                ) : (
                                  <span className="text-emerald-600">0</span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-[11px] text-[#5D6878] max-w-xs truncate" title={rec.operational_rationale || ''}>
                                {rec.operational_rationale || 'Standard preventive deployment protocol.'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-[10.5px] text-[#5D6878] italic">
                    * {pipelineData.planning_disclaimer}
                  </p>
                </div>
                </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PredictionsPage;
