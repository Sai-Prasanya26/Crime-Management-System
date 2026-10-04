import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Info,
} from 'lucide-react';
import type { CrimeOverviewResponse } from '../../types';

interface CaseOutcomeSectionProps {
  overview: CrimeOverviewResponse | null;
}

export const CaseOutcomeSection: React.FC<CaseOutcomeSectionProps> = ({ overview }) => {
  if (!overview) {
    return null;
  }

  const { cases, total_incidents } = overview;
  const clearanceRate = cases.clearance_rate_pct;
  const pendingRate = Math.max(0, 100 - clearanceRate);
  const benchmarkRate = 60.0; // Institutional standard resolution benchmark
  const benchmarkDiff = clearanceRate - benchmarkRate;
  const backlogRatio = (cases.open / (cases.closed || 1)).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Scale className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-[#0A192F]">
              Case Outcome &amp; Clearance Analysis
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Institutional case resolution metrics, investigative backlog burden, and formal adjudication status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            National Target: {benchmarkRate.toFixed(0)}% Clearance
          </span>
        </div>
      </div>

      {/* Analytical Disposition Cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Registered Inquiries */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Caseload
            </span>
            <Scale className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#0A192F]">
            {total_incidents.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Registered statutory proceedings
          </p>
        </div>

        {/* Resolved / Closed Dispositions */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Closed Dispositions
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
            {cases.closed.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-emerald-800">
            <span>Formal resolution count</span>
            <span className="font-semibold">{clearanceRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Active Investigations */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Active Inquiries
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
            {cases.open.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-amber-800">
            <span>Pending investigation</span>
            <span className="font-semibold">{pendingRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Backlog Burden Index */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
              Backlog Ratio
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-blue-700">
            {backlogRatio}x
          </p>
          <p className="mt-1 text-xs text-blue-800">
            Active inquiries per closed case
          </p>
        </div>
      </div>

      {/* Clearance Benchmark & Proportional Disposition Meter */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Resolution Benchmark Progress Meter */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Clearance Rate vs. Institutional Target
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                benchmarkDiff >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {benchmarkDiff >= 0 ? '+' : ''}
              {benchmarkDiff.toFixed(1)}% vs. Target
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-xs text-slate-500">Current Clearance</span>
              <span className="text-xl font-bold text-[#0A192F]">{clearanceRate.toFixed(1)}%</span>
            </div>

            {/* Custom Multi-point Progress Bar */}
            <div className="relative mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, clearanceRate))}%` }}
              />
              {/* Target Marker at 60% */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-600"
                style={{ left: `${benchmarkRate}%` }}
                title={`Target Benchmark: ${benchmarkRate}%`}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>0%</span>
              <span className="font-semibold text-rose-600">
                Institutional Target ({benchmarkRate}%)
              </span>
              <span>100%</span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            {benchmarkDiff >= 0
              ? 'The jurisdictional clearance rate exceeds national operational resolution thresholds, reflecting efficient prosecutorial turnaround.'
              : `The current clearance rate of ${clearanceRate.toFixed(1)}% is ${Math.abs(benchmarkDiff).toFixed(1)} percentage points below the institutional 60.0% benchmark target, indicating backlog accumulation in open investigations.`}
          </p>
        </div>

        {/* Right: Stacked Proportional Caseload Meter */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Proportional Caseload Distribution
            </h4>
            <span className="text-xs text-slate-500">
              {total_incidents.toLocaleString()} Total Records
            </span>
          </div>

          {/* Stacked Disposition Bar */}
          <div className="mt-4">
            <div className="flex h-5 w-full overflow-hidden rounded-md bg-slate-200">
              <div
                className="h-full bg-emerald-600 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${clearanceRate}%` }}
                title={`Closed: ${cases.closed.toLocaleString()} (${clearanceRate.toFixed(1)}%)`}
              >
                {clearanceRate > 15 ? `${clearanceRate.toFixed(0)}% Closed` : ''}
              </div>
              <div
                className="h-full bg-amber-500 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${pendingRate}%` }}
                title={`Active: ${cases.open.toLocaleString()} (${pendingRate.toFixed(1)}%)`}
              >
                {pendingRate > 15 ? `${pendingRate.toFixed(0)}% Active` : ''}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-xs bg-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">Closed Dispositions: </span>
                  <span className="text-slate-500">
                    {cases.closed.toLocaleString()} ({clearanceRate.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-xs bg-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">Active Inquiries: </span>
                  <span className="text-slate-500">
                    {cases.open.toLocaleString()} ({pendingRate.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-slate-200/80 bg-white p-3 text-xs text-slate-600 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              Adjudication tracking monitors official case closure status across jurisdictional police records. Active cases remain under active investigation or judicial docketing.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseOutcomeSection;
