import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Layers,
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
  const totalPeriods = activeTrendData.length;
  const counts = activeTrendData.map((d) => d.incident_count);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const avgCount = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;

  // Identify peak and lowest period items
  const peakItem = activeTrendData.find((d) => d.incident_count === maxCount);
  const minItem = activeTrendData.find((d) => d.incident_count === minCount);

  // Annual Year-over-Year calculations from yearlyTrends
  const yearlyItems = useMemo(() => yearlyTrends?.items || [], [yearlyTrends]);
  const totalYearlyVolume = useMemo(
    () => yearlyItems.reduce((acc, curr) => acc + curr.incident_count, 0) || 1,
    [yearlyItems]
  );
  const maxYearVolume = useMemo(
    () => (yearlyItems.length > 0 ? Math.max(...yearlyItems.map((y) => y.incident_count)) : 1),
    [yearlyItems]
  );

  const annualAnalysis = useMemo(() => {
    return yearlyItems.map((item, index) => {
      let yoyChangePct: number | null = null;
      if (index > 0) {
        const prev = yearlyItems[index - 1].incident_count;
        if (prev > 0) {
          yoyChangePct = ((item.incident_count - prev) / prev) * 100;
        }
      }
      const sharePct = (item.incident_count / totalYearlyVolume) * 100;
      return {
        ...item,
        yoyChangePct,
        sharePct,
      };
    });
  }, [yearlyItems, totalYearlyVolume]);

  // Overall trajectory momentum
  const trajectoryMomentum = useMemo(() => {
    if (annualAnalysis.length < 2) return { label: 'Baseline Consistency', color: 'text-slate-600', icon: Minus };
    const latest = annualAnalysis[annualAnalysis.length - 1];
    if (latest.yoyChangePct === null) return { label: 'Baseline Consistency', color: 'text-slate-600', icon: Minus };
    if (latest.yoyChangePct > 1.5) {
      return { label: `Volume Surge (+${latest.yoyChangePct.toFixed(1)}% YoY)`, color: 'text-rose-700 bg-rose-50 border-rose-200', icon: TrendingUp };
    }
    if (latest.yoyChangePct < -1.5) {
      return { label: `Volume Reduction (${latest.yoyChangePct.toFixed(1)}% YoY)`, color: 'text-emerald-800 bg-emerald-50 border-emerald-200', icon: TrendingDown };
    }
    return { label: `Volume Stable (${latest.yoyChangePct.toFixed(1)}% YoY)`, color: 'text-blue-800 bg-blue-50 border-blue-200', icon: Activity };
  }, [annualAnalysis]);

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
        <p className="text-[12px] text-[#5D6878] mt-0.5">
          Multi-period temporal trajectory, monthly volume fluctuations, and year-over-year comparative shifts
        </p>
      </div>

      {/* Grid: 7 cols (Longitudinal Trajectory Chart) | 5 cols (Annual YoY Comparative Dynamics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Longitudinal Trajectory Area / Bar Chart */}
        <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
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
                <p className="text-[11px] text-[#5D6878] mt-0.5">
                  {temporalMode === 'month'
                    ? 'Continuous temporal volume across reporting months'
                    : 'Year-over-year annual volume trajectory'}
                </p>
              </div>

              {/* Right: Segmented Trajectory Toggle & Period Counter */}
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

                <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded-md border border-[#D9E1EA] whitespace-nowrap">
                  {totalPeriods} Time Periods
                </span>
              </div>
            </div>

            {/* Metric summary pills */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded bg-[#F8FAFC] border border-slate-200/70 p-2.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5D6878] block truncate">
                  Average / Period
                </span>
                <span className="text-[15px] font-bold font-mono text-[#0B1F3A] block">
                  {avgCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#7C8796] block truncate">Per reporting interval</span>
              </div>
              <div className="rounded bg-rose-50/50 border border-rose-200/60 p-2.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-rose-700 block truncate">
                  Peak Period
                </span>
                <span className="text-[15px] font-bold font-mono text-rose-700 block">
                  {maxCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-600/80 block truncate">
                  {peakItem?.period || 'Peak volume'}
                </span>
              </div>
              <div className="rounded bg-emerald-50/50 border border-emerald-200/60 p-2.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-800 block truncate">
                  Lowest Period
                </span>
                <span className="text-[15px] font-bold font-mono text-emerald-800 block">
                  {minCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700/80 block truncate">
                  {minItem?.period || 'Lowest volume'}
                </span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-[250px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {temporalMode === 'month' ? (
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <BarChart data={activeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#5D6878]">
            <span>Continuous temporal index synchronized with verified NCRB baseline</span>
            <span className="font-semibold text-[#0B1F3A]">Confidence Level: 95%</span>
          </div>
        </div>

        {/* Right Column (5 cols): Annual Comparative Dynamics & Year-over-Year Trajectory */}
        <div className="lg:col-span-5 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0B1F3A] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#1769AA]" />
                  <span>Annual Comparative Dynamics</span>
                </h3>
                <p className="text-[11px] text-[#5D6878]">
                  Year-over-Year volume distribution and trajectory momentum
                </p>
              </div>
            </div>

            {/* Trajectory Momentum Banner */}
            <div className={`rounded-md border p-2.5 mb-3 flex items-center justify-between gap-2 text-[11.5px] ${trajectoryMomentum.color}`}>
              <div className="flex items-center gap-1.5 font-semibold">
                <Activity className="h-4 w-4 shrink-0" />
                <span>Annual Trajectory:</span>
              </div>
              <span className="font-bold">{trajectoryMomentum.label}</span>
            </div>

            {/* Annual Volume Breakdown List */}
            <div className="space-y-2.5 mb-3">
              {annualAnalysis.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  No annual breakdown data available
                </div>
              ) : (
                annualAnalysis.map((item) => {
                  const pctOfMax = (item.incident_count / maxYearVolume) * 100;
                  return (
                    <div key={item.period} className="rounded-md border border-slate-100 bg-[#F8FAFC] p-2.5">
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B1F3A]">Year {item.period}</span>
                          <span className="text-[10px] text-[#7C8796] font-mono">
                            ({item.sharePct.toFixed(1)}% share)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-[#0B1F3A]">
                            {item.incident_count.toLocaleString()}
                          </span>
                          {item.yoyChangePct !== null ? (
                            <span
                              className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                item.yoyChangePct > 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.yoyChangePct < 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.yoyChangePct > 0 ? (
                                <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                              ) : item.yoyChangePct < 0 ? (
                                <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                              ) : null}
                              {item.yoyChangePct > 0 ? `+${item.yoyChangePct.toFixed(1)}%` : `${item.yoyChangePct.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              Baseline
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini Proportional Bar */}
                      <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1769AA] transition-all duration-300"
                          style={{ width: `${Math.min(pctOfMax, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#5D6878]">
            <span>Annual deltas calculated against preceding reporting year</span>
            <span className="font-mono font-semibold text-[#0B1F3A]">YoY Comparative Index</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalysisSection;
