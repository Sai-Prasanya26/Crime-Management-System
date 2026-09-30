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
    <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-blue-50 text-[#1D4ED8]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#172033]">Longitudinal Crime Incident Trends</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5B6577]">
            Temporal distribution of verified crime reports ({totalIncidents.toLocaleString()} total incidents)
          </p>
        </div>

        {onIntervalChange && (
          <div className="flex items-center rounded border border-[#DCE2EA] bg-slate-50 p-0.5 text-[12px]">
            {(['year', 'month'] as const).map((intVal) => (
              <button
                key={intVal}
                onClick={() => handleIntervalClick(intVal)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium capitalize transition-colors ${
                  activeInterval === intVal
                    ? 'bg-white text-[#1D4ED8] shadow-2xs font-semibold'
                    : 'text-[#5B6577] hover:text-[#172033]'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {intVal}ly
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3.5 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No longitudinal data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="#DCE2EA"
                tick={{ fill: '#5B6577', fontSize: 11 }}
                tickLine={{ stroke: '#DCE2EA' }}
              />
              <YAxis
                stroke="#DCE2EA"
                tick={{ fill: '#5B6577', fontSize: 11 }}
                tickLine={{ stroke: '#DCE2EA' }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCE2EA',
                  borderRadius: '0.375rem',
                  color: '#172033',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                }}
                itemStyle={{ color: '#172033', fontWeight: 600 }}
                labelStyle={{ color: '#5B6577', fontWeight: 600 }}
                formatter={(value: any) => [
                  Number(value || 0).toLocaleString() + ' incidents',
                  'Incident Volume',
                ]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="incident_count"
                stroke="#1D4ED8"
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
