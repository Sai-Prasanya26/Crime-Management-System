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
  CRITICAL: '#EF4444', // Red
  HIGH: '#F97316',     // Orange
  MEDIUM: '#EAB308',   // Yellow
  LOW: '#10B981',      // Emerald
};

export const CrimeTypeChart: React.FC<CrimeTypeChartProps> = ({ data }) => {
  const [displayCount, setDisplayCount] = useState<number>(8);

  const displayedData = data.slice(0, displayCount);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">Legal Crime Type Distribution</h3>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Top statutory IPC offenses disaggregated by severity tier (21 types total)
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
          {[5, 8, 12, 21].map((count) => (
            <button
              key={count}
              onClick={() => setDisplayCount(count)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                displayCount === count
                  ? 'bg-white text-amber-800 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No crime type data found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis
                type="number"
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="crime_name"
                type="category"
                stroke="#E2E8F0"
                tick={{ fill: '#0F172A', fontSize: 10, width: 85 }}
                width={85}
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
                  `IPC: ${item.payload.crime_code} [${item.payload.severity_level}]`,
                ]}
              />
              <Bar dataKey="incident_count" radius={[0, 4, 4, 0]}>
                {displayedData.map((entry) => (
                  <Cell
                    key={`bar-${entry.crime_type_id}`}
                    fill={SEVERITY_COLORS[entry.severity_level] || '#4F46E5'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Severity Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 pt-2 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Severity:</span>
        {Object.entries(SEVERITY_COLORS).map(([tier, color]) => (
          <div key={tier} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-medium">{tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrimeTypeChart;
