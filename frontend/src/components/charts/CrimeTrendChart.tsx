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
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">Crime Trend Analysis</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Temporal volume distribution across reporting periods ({totalIncidents.toLocaleString()} incidents)
          </p>
        </div>

        {onIntervalChange && (
          <div className="flex items-center rounded border border-[#D9E1EA] bg-[#F4F7FA] p-0.5 text-[12px]">
            {(['year', 'month'] as const).map((intVal) => (
              <button
                key={intVal}
                onClick={() => handleIntervalClick(intVal)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium capitalize transition-colors cursor-pointer ${
                  activeInterval === intVal
                    ? 'bg-white text-[#1769AA] shadow-2xs font-semibold'
                    : 'text-[#5D6878] hover:text-[#0B1F3A]'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {intVal}ly
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No temporal incident data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1769AA" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1769AA" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 11 }}
                tickLine={{ stroke: '#D9E1EA' }}
              />
              <YAxis
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 11 }}
                tickLine={{ stroke: '#D9E1EA' }}
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
                labelStyle={{ color: '#5D6878', fontWeight: 600 }}
                formatter={(value: any) => [
                  Number(value || 0).toLocaleString() + ' incidents',
                  'Incident Volume',
                ]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="incident_count"
                stroke="#1769AA"
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
