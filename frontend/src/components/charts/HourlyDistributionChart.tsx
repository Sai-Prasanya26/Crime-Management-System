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
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">24-Hour Diurnal Pattern</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Hourly incident distribution for shift planning and patrol optimization
          </p>
        </div>

        {peakItem && (
          <div className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-[#C98512]">
            <Siren className="h-3.5 w-3.5 text-[#C98512]" />
            <span>
              Peak: {peakHour.toString().padStart(2, '0')}:00 ({peakItem.incident_count.toLocaleString()} cases)
            </span>
          </div>
        )}
      </div>

      <div className="mt-3.5 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No hourly distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis
                dataKey="displayHour"
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 10 }}
                interval={2}
              />
              <YAxis
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D9E1EA',
                  borderRadius: '0.375rem',
                  color: '#0B1F3A',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                }}
                itemStyle={{ color: '#0B1F3A', fontWeight: 600 }}
                formatter={(val: any, _name: any, item: any) => [
                  `${Number(val).toLocaleString()} incidents (${item.payload.percentage.toFixed(1)}%)`,
                  item.payload.isPeak ? '★ PEAK PATROL HOUR' : 'Hourly Volume',
                ]}
              />
              <Bar dataKey="incident_count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.hour}`}
                    fill={entry.isPeak ? '#C98512' : '#1769AA'}
                    opacity={entry.isPeak ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between rounded border border-[#D9E1EA] bg-[#F4F7FA] px-3 py-1.5 text-xs text-[#5D6878]">
        <span className="text-[11px] font-medium">
          Operational Shift Recommendation: Concentrate coverage 16:00–22:00.
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-xs bg-[#1769AA]" /> Normal
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2 w-2 rounded-xs bg-[#C98512]" /> Peak Hour
          </span>
        </div>
      </div>
    </div>
  );
};

export default HourlyDistributionChart;
