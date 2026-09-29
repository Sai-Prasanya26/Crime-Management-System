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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Longitudinal Crime Incident Trends</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Temporal distribution of verified crime reports ({totalIncidents.toLocaleString()} total incidents)
          </p>
        </div>

        {onIntervalChange && (
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
            {(['year', 'month'] as const).map((intVal) => (
              <button
                key={intVal}
                onClick={() => handleIntervalClick(intVal)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                  activeInterval === intVal
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
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
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No longitudinal data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="period"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#475569' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#475569' }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                formatter={(value: any) => [
                  Number(value || 0).toLocaleString() + ' incidents',
                  'Incident Volume',
                ]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="incident_count"
                stroke="#818cf8"
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
