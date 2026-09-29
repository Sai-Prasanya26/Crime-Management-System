import React, { useState } from 'react';
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
import { Scale } from 'lucide-react';
import type { TypeBreakdownItem } from '../../types';

interface CrimeTypeChartProps {
  data: TypeBreakdownItem[];
  totalIncidents: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', // Red
  HIGH: '#f97316',     // Orange
  MEDIUM: '#eab308',   // Yellow
  LOW: '#10b981',      // Emerald
};

export const CrimeTypeChart: React.FC<CrimeTypeChartProps> = ({ data }) => {
  const [displayCount, setDisplayCount] = useState<number>(8);

  const displayedData = data.slice(0, displayCount);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Scale className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Legal Crime Type Distribution</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Top statutory IPC offenses disaggregated by severity tier (21 types total)
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
          {[5, 8, 12, 21].map((count) => (
            <button
              key={count}
              onClick={() => setDisplayCount(count)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                displayCount === count
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No crime type data found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="crime_name"
                type="category"
                stroke="#64748b"
                tick={{ fill: '#e2e8f0', fontSize: 10, width: 85 }}
                width={85}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                }}
                formatter={(val: any, _name: any, item: any) => [
                  `${Number(val).toLocaleString()} incidents (${item.payload.percentage.toFixed(1)}%)`,
                  `IPC: ${item.payload.crime_code} [${item.payload.severity_level}]`,
                ]}
              />
              <Bar dataKey="incident_count" radius={[0, 4, 4, 0]}>
                {displayedData.map((entry) => (
                  <Cell
                    key={`bar-${entry.crime_type_id}`}
                    fill={SEVERITY_COLORS[entry.severity_level] || '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Severity Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 pt-2 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-500">Severity:</span>
        {Object.entries(SEVERITY_COLORS).map(([tier, color]) => (
          <div key={tier} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span>{tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrimeTypeChart;
