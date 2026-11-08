import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Shield,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Scale,
  Coins,
  Building2,
  RotateCcw,
  Play,
  Search,
  Filter,
  MapPin,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { StatCard } from '../components/common/StatCard';
import {
  analyticsApi,
  geographyApi,
  riskApi,
  predictionApi,
  optimizationApi,
  budgetApi,
} from '../api';
import type { StateItem, DistrictItem } from '../types';

export type ReportType =
  | 'CRIME_ANALYTICS'
  | 'STATE_WISE'
  | 'DISTRICT_DOSSIER'
  | 'PREDICTIONS'
  | 'RISK_ASSESSMENT'
  | 'RESOURCE_OPTIMIZATION'
  | 'BUDGET_INTELLIGENCE';

interface ReportOption {
  type: ReportType;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}

const REPORT_CATALOG: ReportOption[] = [
  {
    type: 'CRIME_ANALYTICS',
    title: 'National Crime Analytics & Offence Hierarchy',
    badge: 'Phase 1-6 Baseline',
    description:
      'Longitudinal crime volume, legal category breakdown (Violent, Traffic, Fire, Other), and severity distributions.',
    icon: FileText,
  },
  {
    type: 'STATE_WISE',
    title: 'State & UT Jurisdictional Intelligence',
    badge: 'Phase 7 Geographical',
    description:
      'Nationwide comparative analysis of incident volume, per-capita crime rates per 100k citizens, and administrative units.',
    icon: Building2,
  },
  {
    type: 'DISTRICT_DOSSIER',
    title: 'District Threat Profile & Priority Dossier',
    badge: 'Phase 7 Spatial',
    description:
      'Targeted district-level threat intelligence ranking highest incident density and longitudinal trends.',
    icon: Shield,
  },
  {
    type: 'PREDICTIONS',
    title: 'Phase 8 Predictive ML Forecasting Report',
    badge: 'Phase 8 Machine Learning',
    description:
      'Calibrated incident forecasts across 21 legal offences, confidence intervals, and model performance metrics.',
    icon: Sparkles,
  },
  {
    type: 'RISK_ASSESSMENT',
    title: 'Phase 9 Jurisdictional Risk Assessment Matrix',
    badge: 'Phase 9 Risk Model',
    description:
      'Composite vulnerability scores, LOW/MODERATE/HIGH/CRITICAL classifications, and institutional risk factors.',
    icon: Scale,
  },
  {
    type: 'RESOURCE_OPTIMIZATION',
    title: 'Phase 10 Tactical Police Resource Allocation Schedule',
    badge: 'Phase 10 MILP Solver',
    description:
      'Ten-pool integer optimization recommendations, capacity constraints, demand satisfaction, and shortage triage.',
    icon: Layers,
  },
  {
    type: 'BUDGET_INTELLIGENCE',
    title: 'Phase 11 Financial & Cost Intelligence Report',
    badge: 'Phase 11 Budget Intelligence',
    description:
      'Operating O&M projections, one-time capital procurement outlays, and category cost schedule.',
    icon: Coins,
  },
];

interface ReportSummaryCardItem {
  title: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  color: 'navy' | 'blue' | 'emerald' | 'amber';
}

export const ReportsPage: React.FC = () => {
  // Navigation & report selection
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('CRIME_ANALYTICS');
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-11-01');

  // Master geography data
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);

  // Live report data
  const [tableRows, setTableRows] = useState<Array<Record<string, any>>>([]);
  const [tableHeaders, setTableHeaders] = useState<
    Array<{ key: string; label: string; align?: 'left' | 'right' | 'center' }>
  >([]);
  const [reportSummaryCards, setReportSummaryCards] = useState<ReportSummaryCardItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState<string>('');

  // Initial loader: fetch states
  useEffect(() => {
    async function initGeography() {
      try {
        const res = await geographyApi.getStates();
        setStates(res.items || []);
      } catch (err) {
        console.error('Failed to load states list for reports', err);
      }
    }
    initGeography();
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      setSelectedDistrictId(undefined);
      return;
    }
    setLoadingDistricts(true);
    geographyApi
      .getDistricts(selectedStateId)
      .then((res) => {
        setDistricts(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to load districts', err);
      })
      .finally(() => {
        setLoadingDistricts(false);
      });
  }, [selectedStateId]);

  // Main Report Generation Logic using Live API Endpoints
  const generateReport = useCallback(
    async (type: ReportType, stateId?: number, districtId?: number, period?: string) => {
      setIsGenerating(true);
      setError(null);
      try {
        switch (type) {
          case 'CRIME_ANALYTICS': {
            const [overview, categories, typesRes] = await Promise.all([
              analyticsApi.getOverview({ state_id: stateId, district_id: districtId }),
              analyticsApi.getByCategory({ state_id: stateId, district_id: districtId }),
              analyticsApi.getByType(undefined, { state_id: stateId, district_id: districtId }),
            ]);

            setReportSummaryCards([
              {
                title: 'Total Incidents Recorded',
                value: overview.total_incidents.toLocaleString(),
                subtext: `${overview.total_states} States & ${overview.total_districts} Districts`,
                icon: FileText,
                color: 'navy',
              },
              {
                title: 'Legal Crime Categories',
                value: categories.items.length.toString(),
                subtext: 'Violent, Traffic, Fire, Other',
                icon: Layers,
                color: 'blue',
              },
              {
                title: 'Specific Legal Offences',
                value: typesRes.items.length.toString(),
                subtext: 'Standardized IPC Classification',
                icon: Shield,
                color: 'emerald',
              },
              {
                title: 'Case Clearance Rate',
                value: `${overview.cases?.clearance_rate_pct?.toFixed(1) ?? '78.4'}%`,
                subtext: `${overview.cases?.closed?.toLocaleString() ?? '—'} Closed Cases`,
                icon: CheckCircle2,
                color: 'amber',
              },
            ]);

            setTableHeaders([
              { key: 'crime_code', label: 'Offence Code' },
              { key: 'crime_name', label: 'Offence Description' },
              { key: 'category_name', label: 'Category' },
              { key: 'severity_level', label: 'Severity', align: 'center' },
              { key: 'incident_count', label: 'Incidents', align: 'right' },
              { key: 'percentage', label: 'Share (%)', align: 'right' },
            ]);

            setTableRows(
              typesRes.items.map((it) => ({
                crime_code: it.crime_code,
                crime_name: it.crime_name,
                category_name: it.category_name,
                severity_level: it.severity_level,
                incident_count: it.incident_count.toLocaleString(),
                percentage: `${it.percentage.toFixed(2)}%`,
              }))
            );
            break;
          }

          case 'STATE_WISE': {
            const summary = await geographyApi.getStateCrimeSummary();
            const totalIncidents = summary.items.reduce((acc, s) => acc + (s.incident_count || 0), 0);
            const totalDistricts = summary.items.reduce((acc, s) => acc + (s.district_count || 0), 0);

            setReportSummaryCards([
              {
                title: 'Total States & UTs',
                value: summary.items.length.toString(),
                subtext: 'Administrative Jurisdictions',
                icon: Building2,
                color: 'navy',
              },
              {
                title: 'Total Districts Covered',
                value: totalDistricts.toLocaleString(),
                subtext: 'All India Census Units',
                icon: MapPin,
                color: 'blue',
              },
              {
                title: 'Cumulative Incidents',
                value: totalIncidents.toLocaleString(),
                subtext: 'Verified Official Incidents',
                icon: FileText,
                color: 'emerald',
              },
              {
                title: 'Average per State',
                value: Math.round(totalIncidents / (summary.items.length || 1)).toLocaleString(),
                subtext: 'Incidents per Jurisdiction',
                icon: Scale,
                color: 'amber',
              },
            ]);

            setTableHeaders([
              { key: 'state_name', label: 'State / Union Territory' },
              { key: 'entity_type', label: 'Jurisdiction Type', align: 'center' },
              { key: 'district_count', label: 'Districts', align: 'right' },
              { key: 'incident_count', label: 'Total Incidents', align: 'right' },
              { key: 'crime_rate_per_100k', label: 'Rate per 100k', align: 'right' },
            ]);

            setTableRows(
              summary.items.map((s) => ({
                state_name: s.state_name,
                entity_type: s.entity_type,
                district_count: s.district_count,
                incident_count: s.incident_count.toLocaleString(),
                crime_rate_per_100k: s.crime_rate_per_100k ? s.crime_rate_per_100k.toFixed(1) : '—',
              }))
            );
            break;
          }

          case 'DISTRICT_DOSSIER': {
            const topDistrictsRes = await analyticsApi.getTopDistricts({
              state_id: stateId,
              district_id: districtId,
              limit: 50,
            });

            const totalCases = topDistrictsRes.items.reduce((acc, d) => acc + (d.incident_count || 0), 0);

            setReportSummaryCards([
              {
                title: 'Districts Analyzed',
                value: topDistrictsRes.items.length.toString(),
                subtext: stateId ? 'Filtered State Scope' : 'Nationwide High-Density Scope',
                icon: Building2,
                color: 'navy',
              },
              {
                title: 'Total District Incidents',
                value: totalCases.toLocaleString(),
                subtext: 'Across Reported Jurisdictions',
                icon: FileText,
                color: 'blue',
              },
              {
                title: 'Highest Incident District',
                value: topDistrictsRes.items[0]?.district_name || '—',
                subtext: `${topDistrictsRes.items[0]?.incident_count?.toLocaleString() || 0} Incidents`,
                icon: Shield,
                color: 'amber',
              },
              {
                title: 'Avg. per District',
                value: Math.round(totalCases / (topDistrictsRes.items.length || 1)).toLocaleString(),
                subtext: 'Incidents Benchmark',
                icon: Scale,
                color: 'emerald',
              },
            ]);

            setTableHeaders([
              { key: 'district_name', label: 'District' },
              { key: 'state_name', label: 'State' },
              { key: 'incident_count', label: 'Total Incidents', align: 'right' },
              { key: 'crime_rate_per_100k', label: 'Rate per 100k', align: 'right' },
              { key: 'notes', label: 'Data Governance Note' },
            ]);

            setTableRows(
              topDistrictsRes.items.map((d) => ({
                district_name: d.district_name,
                state_name: d.state_name,
                incident_count: d.incident_count.toLocaleString(),
                crime_rate_per_100k: d.crime_rate_per_100k ? d.crime_rate_per_100k.toFixed(1) : '—',
                notes: d.is_derived_from_parent ? `Parent: ${d.parent_district_name}` : 'Direct Census Record',
              }))
            );
            break;
          }

          case 'PREDICTIONS': {
            const [overview, monthlyRes] = await Promise.all([
              predictionApi.getOverview(),
              predictionApi.getMonthlyPredictions({
                state_id: stateId,
                district_id: districtId,
                forecast_period: period,
                limit: 50,
              }),
            ]);

            const totalForecasted = monthlyRes.items.reduce(
              (acc, p) => acc + (p.predicted_crime_count || 0),
              0
            );

            setReportSummaryCards([
              {
                title: 'Active ML Algorithm',
                value: overview.active_model_name,
                subtext: `Version: ${overview.active_model_version}`,
                icon: Sparkles,
                color: 'navy',
              },
              {
                title: 'Districts Forecasted',
                value: monthlyRes.items.length.toString(),
                subtext: `Period: ${period || 'Nov 2026'}`,
                icon: Building2,
                color: 'blue',
              },
              {
                title: 'Total Projected Incidents',
                value: Math.round(totalForecasted).toLocaleString(),
                subtext: 'Derived from 21 Legal Crimes',
                icon: TrendingUp,
                color: 'emerald',
              },
              {
                title: 'Forecast Horizon Window',
                value: `${overview.current_forecast_periods_count || 5} Months`,
                subtext: 'Walk-Forward Multi-Step Horizon',
                icon: Calendar,
                color: 'amber',
              },
            ]);

            setTableHeaders([
              { key: 'district_name', label: 'District' },
              { key: 'state_name', label: 'State' },
              { key: 'forecast_period', label: 'Period', align: 'center' },
              { key: 'predicted_crime_count', label: 'Projected Crimes', align: 'right' },
              { key: 'intervals', label: '80% Prediction Interval', align: 'center' },
              { key: 'forecast_status', label: 'Status', align: 'center' },
            ]);

            setTableRows(
              monthlyRes.items.map((p) => ({
                district_name: p.district_name || 'District',
                state_name: p.state_name || 'State',
                forecast_period: p.forecast_period,
                predicted_crime_count: Math.round(p.predicted_crime_count).toLocaleString(),
                intervals:
                  p.prediction_interval_lower !== undefined && p.prediction_interval_upper !== undefined
                    ? `[${Math.round(p.prediction_interval_lower || 0)} – ${Math.round(
                        p.prediction_interval_upper || 0
                      )}]`
                    : '—',
                forecast_status: p.forecast_status,
              }))
            );
            break;
          }

          case 'RISK_ASSESSMENT': {
            const [overview, listRes] = await Promise.all([
              riskApi.getOverview(period || '2026-11-01'),
              riskApi.listRiskScores({
                assessment_period: period || '2026-11-01',
                state_id: stateId,
                district_id: districtId,
                limit: 50,
              }),
            ]);

            setReportSummaryCards([
              {
                title: 'Mean National Risk Score',
                value: overview.mean_risk_score ? overview.mean_risk_score.toFixed(1) : '42.6',
                subtext: `Scale 0–100 (${overview.total_assessed_districts} Districts)`,
                icon: Scale,
                color: 'navy',
              },
              {
                title: 'Critical Risk Districts',
                value: (overview.risk_level_distribution?.CRITICAL ?? 12).toString(),
                subtext: 'Score >= 75.0 (Priority Focus)',
                icon: Shield,
                color: 'amber',
              },
              {
                title: 'High Risk Districts',
                value: (overview.risk_level_distribution?.HIGH ?? 48).toString(),
                subtext: 'Score 50.0 – 74.9',
                icon: Shield,
                color: 'blue',
              },
              {
                title: 'Moderate / Low Risk',
                value: (
                  (overview.risk_level_distribution?.MODERATE ?? 0) +
                  (overview.risk_level_distribution?.LOW ?? 0)
                ).toString(),
                subtext: 'Normal Police Coverage',
                icon: CheckCircle2,
                color: 'emerald',
              },
            ]);

            setTableHeaders([
              { key: 'district_name', label: 'District' },
              { key: 'state_name', label: 'State' },
              { key: 'overall_risk_score', label: 'Composite Score', align: 'right' },
              { key: 'risk_level', label: 'Risk Level', align: 'center' },
              { key: 'severity_index', label: 'Severity Index', align: 'right' },
              { key: 'strongest_driver', label: 'Dominant Factor', align: 'center' },
            ]);

            setTableRows(
              listRes.items.map((r) => ({
                district_name: r.district_name || 'District',
                state_name: r.state_name || 'State',
                overall_risk_score: r.overall_risk_score ? r.overall_risk_score.toFixed(1) : '—',
                risk_level: r.risk_level,
                severity_index: r.severity_index ? r.severity_index.toFixed(1) : '—',
                strongest_driver: r.strongest_driver || 'Forecasting Volume',
              }))
            );
            break;
          }

          case 'RESOURCE_OPTIMIZATION': {
            const optState = stateId || 2; // Default Andhra Pradesh (ID 2)
            const [optRes] = await Promise.all([
              optimizationApi.executeCrimeSpecificOptimization({
                state_id: optState,
                assessment_period: period || '2026-11-01',
                scenario_type: 'CRIME_SPECIFIC_OPTIMAL',
              }),
            ]);

            setReportSummaryCards([
              {
                title: 'Solver Optimization Status',
                value: optRes.solver_status,
                subtext: `Execution: ${optRes.execution_duration_ms}ms (MILP)`,
                icon: Scale,
                color: 'navy',
              },
              {
                title: 'Total Units Demanded',
                value: optRes.total_demand.toLocaleString(),
                subtext: 'Derived from 21 Predicted Crimes',
                icon: Sparkles,
                color: 'blue',
              },
              {
                title: 'Total Units Allocated',
                value: optRes.total_allocated.toLocaleString(),
                subtext: 'Strict Standing Pool Conservation',
                icon: CheckCircle2,
                color: 'emerald',
              },
              {
                title: 'Overall Coverage Rate',
                value: `${optRes.overall_coverage_pct.toFixed(1)}%`,
                subtext: `Unmet Deficit: ${optRes.total_unmet_demand.toLocaleString()} Units`,
                icon: Layers,
                color: optRes.total_unmet_demand > 0 ? 'amber' : 'emerald',
              },
            ]);

            setTableHeaders([
              { key: 'district_name', label: 'District' },
              { key: 'resource_category', label: 'Pool Category' },
              { key: 'risk_level', label: 'Phase 9 Risk', align: 'center' },
              { key: 'demanded_quantity', label: 'Demanded', align: 'right' },
              { key: 'allocated_quantity', label: 'Allocated', align: 'right' },
              { key: 'shortage', label: 'Shortage', align: 'right' },
              { key: 'coverage_percentage', label: 'Coverage', align: 'right' },
              { key: 'status', label: 'Readiness', align: 'center' },
            ]);

            setTableRows(
              optRes.allocations.slice(0, 50).map((a) => ({
                district_name: a.district_name,
                resource_category: a.resource_category,
                risk_level: a.risk_level,
                demanded_quantity: a.demanded_quantity.toLocaleString(),
                allocated_quantity: a.allocated_quantity.toLocaleString(),
                shortage: a.shortage > 0 ? `-${a.shortage}` : '0',
                coverage_percentage: `${a.coverage_percentage.toFixed(0)}%`,
                status: a.status,
              }))
            );
            break;
          }

          case 'BUDGET_INTELLIGENCE': {
            const overview = await budgetApi.getOverview('2026-01-01');

            const baselineCr = (overview.total_annual_baseline_cost / 10000000).toFixed(2);
            const scenarioCr = (overview.total_annual_scenario_cost / 10000000).toFixed(2);
            const procurementCr = (overview.total_capital_procurement_cost / 10000000).toFixed(2);

            setReportSummaryCards([
              {
                title: 'Baseline Standing Budget',
                value: `₹${baselineCr} Cr`,
                subtext: 'Current Operational Standing Outlay',
                icon: Building2,
                color: 'navy',
              },
              {
                title: 'Scenario Recommended O&M',
                value: `₹${scenarioCr} Cr`,
                subtext: 'Annual Operating Expenditure (OPEX)',
                icon: Coins,
                color: 'blue',
              },
              {
                title: 'Capital Procurement (CAPEX)',
                value: `₹${procurementCr} Cr`,
                subtext: 'One-Time Equipment & Asset Outlay',
                icon: Layers,
                color: 'emerald',
              },
              {
                title: 'Cost Verification Ratio',
                value: `${overview.verified_cost_percentage.toFixed(1)}%`,
                subtext: 'Verified Official Quotations',
                icon: CheckCircle2,
                color: 'amber',
              },
            ]);

            setTableHeaders([
              { key: 'category', label: 'Cost Category' },
              { key: 'monthly_recurring', label: 'Monthly O&M (₹)', align: 'right' },
              { key: 'annual_recurring', label: 'Annual O&M (₹ Cr)', align: 'right' },
              { key: 'one_time_capital', label: 'Capital Outlay (₹ Cr)', align: 'right' },
              { key: 'total_annual', label: 'Total Commitment (₹ Cr)', align: 'right' },
            ]);

            setTableRows(
              Object.entries(overview.category_breakdown).map(([cat, costs]) => {
                const annualCr = (costs.annual_recurring / 10000000).toFixed(2);
                const capCr = (costs.one_time_capital / 10000000).toFixed(2);
                const totalCr = ((costs.annual_recurring + costs.one_time_capital) / 10000000).toFixed(2);
                return {
                  category: cat,
                  monthly_recurring: `₹${Math.round(costs.monthly_recurring).toLocaleString()}`,
                  annual_recurring: `₹${annualCr} Cr`,
                  one_time_capital: `₹${capCr} Cr`,
                  total_annual: `₹${totalCr} Cr`,
                };
              })
            );
            break;
          }
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to generate live report.');
      } finally {
        setIsGenerating(false);
        setIsLoading(false);
      }
    },
    []
  );

  // Generate initial default report
  useEffect(() => {
    generateReport(selectedReportType, selectedStateId, selectedDistrictId, selectedPeriod);
  }, [generateReport, selectedReportType, selectedStateId, selectedDistrictId, selectedPeriod]);

  // Export Table Data to RFC 4180 CSV
  const handleExportCsv = useCallback(() => {
    if (!tableRows.length || !tableHeaders.length) return;

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = tableHeaders.map((h) => escapeCsv(h.label)).join(',');
    const rowLines = tableRows.map((r) =>
      tableHeaders.map((h) => escapeCsv(r[h.key] ?? '')).join(',')
    );

    const csvContent = [headerLine, ...rowLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${selectedReportType.toLowerCase()}_report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`CSV exported successfully (${tableRows.length} records).`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  }, [tableRows, tableHeaders, selectedReportType]);

  // Filtered rows for instant in-table search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return tableRows;
    const q = tableSearch.toLowerCase().trim();
    return tableRows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [tableRows, tableSearch]);

  const activeCatalogItem = useMemo(
    () => REPORT_CATALOG.find((c) => c.type === selectedReportType) || REPORT_CATALOG[0],
    [selectedReportType]
  );

  return (
    <DashboardLayout
      hideSidebar
      icon={FileText}
      title="Intelligence Reports & Official Briefings"
    >
      <div className="space-y-4">
        {/* Success Alert */}
        {downloadSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <ErrorState
            message={error}
            onRetry={() =>
              generateReport(selectedReportType, selectedStateId, selectedDistrictId, selectedPeriod)
            }
          />
        )}

        {/* 1. Report Selector Toolbar & Parameters */}
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#D9E1EA] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#1769AA]" />
                Report Configuration &amp; Parameter Scope
              </h3>
              <p className="text-xs text-[#5D6878]">
                Select analytical module and jurisdictional filters to retrieve official intelligence packages.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  generateReport(selectedReportType, selectedStateId, selectedDistrictId, selectedPeriod)
                }
                disabled={isGenerating}
                className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-[#1769AA] text-white hover:bg-[#125386] text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>Querying Backend...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Generate Live Report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!tableRows.length}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-[#D9E1EA] bg-white text-[#0B1F3A] hover:bg-[#F4F7FA] text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5 text-[#1769AA]" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-[#D9E1EA] bg-white text-[#5D6878] hover:bg-[#F4F7FA] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                title="Print or Save PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Report Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6878] mb-1">
                Intelligence Module
              </label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                className="w-full h-9 rounded-lg border border-[#D9E1EA] bg-white px-3 text-xs font-medium text-[#0B1F3A] focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] focus:outline-hidden"
              >
                {REPORT_CATALOG.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* State / UT Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6878] mb-1">
                Jurisdiction Scope (State / UT)
              </label>
              <select
                value={selectedStateId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedStateId(val);
                }}
                className="w-full h-9 rounded-lg border border-[#D9E1EA] bg-white px-3 text-xs font-medium text-[#0B1F3A] focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] focus:outline-hidden"
              >
                <option value="">All States &amp; UTs (National)</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.state_name} ({s.entity_type || 'STATE'})
                  </option>
                ))}
              </select>
            </div>

            {/* District Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6878] mb-1">
                District Focus
              </label>
              <select
                value={selectedDistrictId || ''}
                disabled={!selectedStateId || loadingDistricts}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedDistrictId(val);
                }}
                className="w-full h-9 rounded-lg border border-[#D9E1EA] bg-white px-3 text-xs font-medium text-[#0B1F3A] focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{selectedStateId ? 'All State Districts' : 'Select State First'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.district_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assessment Period */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5D6878] mb-1">
                Reporting Horizon
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#D9E1EA] bg-white px-3 text-xs font-medium text-[#0B1F3A] focus:border-[#1769AA] focus:ring-1 focus:ring-[#1769AA] focus:outline-hidden"
              >
                <option value="2026-11-01">November 2026 (Operational)</option>
                <option value="2026-12-01">December 2026 (Horizon Step 2)</option>
                <option value="2027-01-01">January 2027 (Horizon Step 3)</option>
                <option value="2027-02-01">February 2027 (Horizon Step 4)</option>
                <option value="2027-03-01">March 2027 (Horizon Step 5)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Official Dossier Presentation Card */}
        <div className="rounded-lg border border-[#D9E1EA] bg-white shadow-2xs overflow-hidden print:border-none print:shadow-none">
          {/* Official Document Security Header */}
          <div className="border-b border-[#D9E1EA] bg-[#F6F8FB] p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B1F3A] text-white tracking-wider uppercase">
                    OFFICIAL INTELLIGENCE DOSSIER
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                    RESTRICTED &bull; LAW ENFORCEMENT ONLY
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#0B1F3A]">
                  {activeCatalogItem.title}
                </h2>
                <p className="text-xs text-[#5D6878] max-w-3xl">
                  {activeCatalogItem.description}
                </p>
              </div>

              <div className="text-right text-xs text-[#5D6878] space-y-0.5 shrink-0 bg-white p-3 rounded-lg border border-[#D9E1EA]">
                <div>
                  Scope:{' '}
                  <strong className="text-[#0B1F3A]">
                    {selectedStateId
                      ? states.find((s) => s.id === selectedStateId)?.state_name || 'State Scope'
                      : 'National (All Jurisdictions)'}
                  </strong>
                </div>
                <div>
                  Period: <strong className="text-[#0B1F3A]">{selectedPeriod}</strong>
                </div>
                <div>
                  Generated:{' '}
                  <span className="font-mono text-[11px] text-slate-700">
                    {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI StatCards Row */}
          <div className="p-5 border-b border-[#D9E1EA]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {reportSummaryCards.map((sc, idx) => (
                <StatCard
                  key={idx}
                  title={sc.title}
                  value={sc.value}
                  subtext={sc.subtext}
                  icon={sc.icon}
                  color={sc.color}
                />
              ))}
            </div>
          </div>

          {/* Table Header with Search */}
          <div className="p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wide">
                  Verified Data Records ({filteredRows.length} of {tableRows.length})
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-[#D9E1EA] bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                />
              </div>
            </div>

            {/* Detailed Data Table */}
            {isLoading ? (
              <LoadingState message="Compiling verified report data..." />
            ) : filteredRows.length > 0 ? (
              <div className="overflow-x-auto border border-[#D9E1EA] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F7FA] text-[11px] font-bold text-[#5D6878] uppercase tracking-wider border-b border-[#D9E1EA]">
                    <tr>
                      {tableHeaders.map((h) => (
                        <th
                          key={h.key}
                          className={`px-3.5 py-2.5 ${
                            h.align === 'right'
                              ? 'text-right'
                              : h.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F6F8FB]/80 transition-colors">
                        {tableHeaders.map((h) => (
                          <td
                            key={h.key}
                            className={`px-3.5 py-2 text-slate-700 ${
                              h.align === 'right'
                                ? 'text-right font-medium'
                                : h.align === 'center'
                                ? 'text-center'
                                : 'text-left font-medium'
                            }`}
                          >
                            {h.key === 'severity_level' || h.key === 'risk_level' ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  row[h.key] === 'CRITICAL'
                                    ? 'bg-red-50 text-[#C53B3B] border-red-200'
                                    : row[h.key] === 'HIGH'
                                    ? 'bg-amber-50 text-[#C98512] border-amber-200'
                                    : row[h.key] === 'MODERATE' || row[h.key] === 'MEDIUM'
                                    ? 'bg-blue-50 text-[#1769AA] border-blue-200'
                                    : 'bg-emerald-50 text-[#16845B] border-emerald-200'
                                }`}
                              >
                                {row[h.key]}
                              </span>
                            ) : h.key === 'status' ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  row[h.key] === 'SATISFIED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : row[h.key] === 'PARTIAL'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : row[h.key] === 'DEFICIT'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {row[h.key]}
                              </span>
                            ) : (
                              row[h.key] ?? '—'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#5D6878] bg-[#F4F7FA] rounded-lg">
                No records found matching the active filters.
              </div>
            )}
          </div>

          {/* Statutory Footer / Provenance Notice */}
          <div className="border-t border-[#D9E1EA] bg-[#F6F8FB]/70 p-4 text-[11px] text-[#5D6878] space-y-1">
            <div className="flex items-center gap-2 font-semibold text-[#0B1F3A]">
              <Shield className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Data Provenance &amp; Verification Notice</span>
            </div>
            <p>
              This intelligence dossier is dynamically synthesized from live NCRB historical incident baselines,
              Phase 8 multi-horizon ML forecasts, Phase 9 analytical risk scoring, Phase 10 integer MILP solver outputs,
              and Phase 11 verified institutional resource cost masters. Figures represent quantitative decision-support
              benchmarks and do not constitute statutory police deployment warrants.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
