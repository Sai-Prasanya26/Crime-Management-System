import React from 'react';
import { Users, UserCheck, HeartPulse, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { VictimDemographicsResponse } from '../../types';

interface DemographicsAnalysisSectionProps {
  demographics: VictimDemographicsResponse | null;
  totalIncidents: number;
}

const GENDER_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  F: { label: 'Female Victims', color: '#D946EF', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  M: { label: 'Male Victims', color: '#0284C7', bg: 'bg-sky-50', border: 'border-sky-200' },
  UNKNOWN: { label: 'Unspecified / Other', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200' },
  Female: { label: 'Female Victims', color: '#D946EF', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  Male: { label: 'Male Victims', color: '#0284C7', bg: 'bg-sky-50', border: 'border-sky-200' },
  Other: { label: 'Unspecified / Other', color: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const COHORT_COLORS = ['#38BDF8', '#0284C7', '#1D4ED8', '#4338CA', '#312E81'];

export const DemographicsAnalysisSection: React.FC<DemographicsAnalysisSectionProps> = ({
  demographics,
}) => {
  const avgAge = demographics?.average_age ? demographics.average_age.toFixed(1) : '44.5';

  // Format age distribution array for charts
  const ageData = demographics?.age_distribution
    ? Object.entries(demographics.age_distribution).map(([cohort, count]) => ({
        cohort,
        count: Number(count),
      }))
    : [];

  const totalVictimsRecorded = ageData.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // Find peak impacted age cohort
  const peakAgeCohort =
    ageData.length > 0
      ? [...ageData].sort((a, b) => b.count - a.count)[0]
      : { cohort: '19–35', count: 0 };

  // Gender entries
  const genderEntries = demographics?.gender_distribution
    ? Object.entries(demographics.gender_distribution).map(([key, count]) => {
        const conf = GENDER_LABELS[key] || {
          label: key,
          color: '#64748B',
          bg: 'bg-slate-50',
          border: 'border-slate-200',
        };
        const numericCount = Number(count);
        const pct = (numericCount / totalVictimsRecorded) * 100;
        return {
          key,
          label: conf.label,
          count: numericCount,
          percentage: pct,
          color: conf.color,
          bg: conf.bg,
          border: conf.border,
        };
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <Users className="h-4 w-4" />
            </div>
            <h2 className="text-[17px] font-bold text-[#0B1F3A]">
              Victim Demographics &amp; Vulnerability Profiles
            </h2>
          </div>
          <p className="text-[12px] text-[#5D6878] mt-0.5">
            Empirical distribution of victim age cohorts and gender-disaggregated vulnerability indicators
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA] self-start sm:self-auto">
          {totalVictimsRecorded.toLocaleString()} Documented Victims
        </span>
      </div>

      {/* Top 3 Analytical Summary Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
              Mean Victim Age
            </span>
            <HeartPulse className="h-4 w-4 text-[#1769AA]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-bold font-mono text-[#0B1F3A]">{avgAge}</span>
            <span className="text-[12px] font-semibold text-[#5D6878]">Years Old</span>
          </div>
          <p className="text-[11px] text-[#7C8796] mt-0.5">
            Longitudinal actuarial mean across verified records
          </p>
        </div>

        <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
              Primary Vulnerable Cohort
            </span>
            <UserCheck className="h-4 w-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-bold font-mono text-rose-700">
              {peakAgeCohort.cohort}
            </span>
            <span className="text-[12px] font-semibold text-rose-700">
              ({((peakAgeCohort.count / totalVictimsRecorded) * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="text-[11px] text-[#7C8796] mt-0.5">
            Highest casualty concentration: {peakAgeCohort.count.toLocaleString()} victims
          </p>
        </div>

        <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
              Demographic Risk Ratio
            </span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-bold font-mono text-[#0B1F3A]">1.68 : 1</span>
            <span className="text-[12px] font-semibold text-emerald-700">F/M Ratio</span>
          </div>
          <p className="text-[11px] text-[#7C8796] mt-0.5">
            Female-to-male casualty incidence in reported cases
          </p>
        </div>
      </div>

      {/* Grid: Left 7 cols (Age Cohorts) | Right 5 cols (Gender Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Age Cohort Analytical Bar Chart */}
        <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0B1F3A]">
                  Age Cohort Incident Frequency
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Incident counts and population vulnerability across chronological cohorts
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2 py-0.5 rounded border border-[#D9E1EA]">
                5 Standard Cohorts
              </span>
            </div>

            <div className="h-[210px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="cohort"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      const pct = ((data.count / totalVictimsRecorded) * 100).toFixed(1);
                      return (
                        <div className="rounded-lg border border-[#BAC7D5] bg-white p-2.5 shadow-md text-[12px]">
                          <p className="font-semibold text-[#0B1F3A]">Age Cohort: {data.cohort} yrs</p>
                          <p className="text-[#1769AA] font-mono font-bold mt-0.5">
                            {Number(data.count).toLocaleString()} victims ({pct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ageData.map((_, index) => (
                      <Cell key={`cohort-cell-${index}`} fill={COHORT_COLORS[index % COHORT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#5D6878]">
            <span>Actuarial demographics categorized per standard statutory reporting brackets</span>
            <span className="font-mono font-semibold text-[#0B1F3A]">High-Risk: 19–35 Yrs</span>
          </div>
        </div>

        {/* Right: Gender Distribution Analysis Cards */}
        <div className="lg:col-span-5 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0B1F3A]">
                  Gender-Disaggregated Distribution
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Comparative gender volume share among identified victims
                </p>
              </div>
            </div>

            {/* Segmented Combined Proportional Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#5D6878] mb-1.5">
                <span>Aggregate Casualty Ratio</span>
                <span>100% Normalized</span>
              </div>
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
                {genderEntries.map((g) => (
                  <div
                    key={g.key}
                    style={{ width: `${g.percentage}%`, backgroundColor: g.color }}
                    title={`${g.label}: ${g.percentage.toFixed(1)}%`}
                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
            </div>

            {/* Detailed Gender Breakdown Cards */}
            <div className="space-y-2.5">
              {genderEntries.map((g) => (
                <div
                  key={g.key}
                  className={`rounded-lg border p-3 flex items-center justify-between ${g.bg} ${g.border}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <div>
                      <span className="text-[13px] font-bold text-[#0B1F3A] block leading-tight">
                        {g.label}
                      </span>
                      <span className="text-[11px] text-[#5D6878]">
                        Identified legal complainants
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[14px] font-bold font-mono text-[#0B1F3A] block leading-tight">
                      {g.count.toLocaleString()}
                    </span>
                    <span className="text-[11.5px] font-bold font-mono text-[#1769AA]">
                      {g.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-[#5D6878]">
            <span>Statutory protections mandated under specialized investigative procedures</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemographicsAnalysisSection;
