import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock, Siren } from 'lucide-react';
import type { HourlyDistributionItem } from '../../types';

interface HourlyDistributionChartProps {
  data: HourlyDistributionItem[];
  peakHour: number;
}

export const HourlyDistributionChart: React.FC<HourlyDistributionChartProps> = ({
  data,
  peakHour,
}) => {
  const chartData = data.map((item) => ({
    ...item,
    displayHour: `${item.hour.toString().padStart(2, '0')}:00`,
    isPeak: item.hour === peakHour,
  }));

  const peakItem = data.find((d) => d.hour === peakHour);

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#ECFEFF] p-2 text-[#0891B2]">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A]">24-Hour Diurnal Crime Distribution</h3>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Hourly incident volume profiling for police shift planning and patrol optimization
          </p>
        </div>

        {peakItem && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#B45309]">
            <Siren className="h-3.5 w-3.5 text-[#D97706]" />
            <span>
              Peak Hour: {peakHour.toString().padStart(2, '0')}:00 ({peakItem.incident_count.toLocaleString()} cases)
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No hourly distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="displayHour"
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 10 }}
                interval={2}
              />
              <YAxis
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.5rem',
                  color: '#0F172A',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                }}
                itemStyle={{ color: '#0F172A', fontWeight: 600 }}
                formatter={(val: any, _name: any, item: any) => [
                  `${Number(val).toLocaleString()} incidents (${item.payload.percentage.toFixed(1)}%)`,
                  item.payload.isPeak ? '★ PEAK CRIME HOUR' : 'Hourly Volume',
                ]}
              />
              <Bar dataKey="incident_count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.hour}`}
                    fill={entry.isPeak ? '#F59E0B' : '#6366F1'}
                    opacity={entry.isPeak ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
        <span className="text-[11px] font-medium">
          Operational Insight: Shift staffing should concentrate between 16:00 and 22:00.
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#6366F1]" /> Normal
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" /> Peak Hour
          </span>
        </div>
      </div>
    </div>
  );
};

export default HourlyDistributionChart;
