import React, { useState } from 'react';
import {
  TrendingUp,
  CalendarRange,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TrendResponse, HourlyDistributionResponse } from '../../types';

interface TemporalAnalysisSectionProps {
  monthlyTrends: TrendResponse | null;
  yearlyTrends: TrendResponse | null;
  hourly?: HourlyDistributionResponse | null;
  isLoading?: boolean;
}

export const TemporalAnalysisSection: React.FC<TemporalAnalysisSectionProps> = ({
  monthlyTrends,
  yearlyTrends,
  isLoading,
}) => {
  const [temporalMode, setTemporalMode] = useState<'month' | 'year'>('month');

  const activeTrendData = temporalMode === 'month' ? monthlyTrends?.items || [] : yearlyTrends?.items || [];

  // Summary statistics for active trend view
  const counts = activeTrendData.map((d) => d.incident_count);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const avgCount = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;

  return (
    <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
      {/* Section Header */}
      <div className="border-b border-[#D9E1EA] pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
            <CalendarRange className="h-4 w-4" />
          </div>
          <h2 className="text-[17px] font-bold text-[#0B1F3A]">
            Longitudinal Offense Trajectory &amp; Period Comparison
          </h2>
        </div>
      </div>

      {/* Longitudinal Trajectory Area / Bar Chart (Full Width Expanded) */}
      <div className="w-full rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-[#0B1F3A] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#1769AA]" />
                <span>
                  {temporalMode === 'month'
                    ? 'Longitudinal Monthly Incident Volume'
                    : 'Annual Incident Volume Comparison'}
                </span>
              </h3>
            </div>

            {/* Right: Segmented Trajectory Toggle */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 bg-[#F4F7FA] p-0.5 rounded-lg border border-[#D9E1EA]">
                <button
                  type="button"
                  onClick={() => setTemporalMode('month')}
                  className={`px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-colors cursor-pointer ${
                    temporalMode === 'month'
                      ? 'bg-white text-[#1769AA] shadow-2xs'
                      : 'text-[#5D6878] hover:text-[#0B1F3A]'
                  }`}
                >
                  Monthly Trajectory
                </button>
                <button
                  type="button"
                  onClick={() => setTemporalMode('year')}
                  className={`px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-colors cursor-pointer ${
                    temporalMode === 'year'
                      ? 'bg-white text-[#1769AA] shadow-2xs'
                      : 'text-[#5D6878] hover:text-[#0B1F3A]'
                  }`}
                >
                  Yearly Comparison
                </button>
              </div>
            </div>
          </div>

          {/* Metric summary pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
            <div className="rounded bg-[#F8FAFC] border border-slate-200/70 p-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] block">
                Average
              </span>
              <span className="text-[15px] font-bold font-mono text-[#0B1F3A] block">
                {avgCount.toLocaleString()}
              </span>
            </div>
            <div className="rounded bg-rose-50/50 border border-rose-200/60 p-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
                Peak
              </span>
              <span className="text-[15px] font-bold font-mono text-rose-700 block">
                {maxCount.toLocaleString()}
              </span>
            </div>
            <div className="rounded bg-emerald-50/50 border border-emerald-200/60 p-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
                Lowest
              </span>
              <span className="text-[15px] font-bold font-mono text-emerald-800 block">
                {minCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {temporalMode === 'month' ? (
                <AreaChart data={activeTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1769AA" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1769AA" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="period"
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
                      return (
                        <div className="rounded-lg border border-[#BAC7D5] bg-white p-2.5 shadow-md text-[12px]">
                          <p className="font-semibold text-[#0B1F3A]">{data.period}</p>
                          <p className="text-[#1769AA] font-mono font-bold mt-0.5">
                            {Number(data.incident_count).toLocaleString()} incidents
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incident_count"
                    stroke="#1769AA"
                    strokeWidth={2}
                    fill="url(#analyticsTrendGrad)"
                    activeDot={{ r: 5, fill: '#1769AA', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={activeTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="period"
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
                      return (
                        <div className="rounded-lg border border-[#BAC7D5] bg-white p-2.5 shadow-md text-[12px]">
                          <p className="font-semibold text-[#0B1F3A]">Year {data.period}</p>
                          <p className="text-[#1769AA] font-mono font-bold mt-0.5">
                            {Number(data.incident_count).toLocaleString()} total incidents
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="incident_count" fill="#1769AA" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalysisSection;
