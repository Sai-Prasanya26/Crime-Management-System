import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import type { TrendItem } from '../../types';

interface CrimeTrendChartProps {
  data: TrendItem[];
  interval: 'year' | 'month' | 'day';
  onIntervalChange?: (newInterval: 'year' | 'month' | 'day') => void;
  isLoading?: boolean;
}

export const CrimeTrendChart: React.FC<CrimeTrendChartProps> = ({
  data,
  interval,
  onIntervalChange,
  isLoading,
}) => {
  const [activeInterval, setActiveInterval] = useState<'year' | 'month' | 'day'>(interval);

  const handleIntervalClick = (intVal: 'year' | 'month' | 'day') => {
    setActiveInterval(intVal);
    onIntervalChange?.(intVal);
  };

  const totalIncidents = data.reduce((sum, item) => sum + item.incident_count, 0);

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#EEF2FF] p-2 text-[#4F46E5]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A]">Longitudinal Crime Incident Trends</h3>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Temporal distribution of verified crime reports ({totalIncidents.toLocaleString()} total incidents)
          </p>
        </div>

        {onIntervalChange && (
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
            {(['year', 'month'] as const).map((intVal) => (
              <button
                key={intVal}
                onClick={() => handleIntervalClick(intVal)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium capitalize transition-all ${
                  activeInterval === intVal
                    ? 'bg-white text-[#4F46E5] shadow-xs border border-[#E2E8F0] font-semibold'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {intVal}ly
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No longitudinal data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={{ stroke: '#E2E8F0' }}
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
                labelStyle={{ color: '#64748B', fontWeight: 600 }}
                formatter={(value: any) => [
                  Number(value || 0).toLocaleString() + ' incidents',
                  'Incident Volume',
                ]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="incident_count"
                stroke="#4F46E5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#incidentGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CrimeTrendChart;
