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
  CRITICAL: '#C53B3B', // Red
  HIGH: '#C98512',     // Amber
  MEDIUM: '#1769AA',   // Operational Blue
  LOW: '#16845B',      // Emerald Green
};

export const CrimeTypeChart: React.FC<CrimeTypeChartProps> = ({ data }) => {
  const [displayCount, setDisplayCount] = useState<number>(8);

  const displayedData = data.slice(0, displayCount);

  return (
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-amber-50 text-[#C98512]">
              <Scale className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">Legal Crime Type Distribution</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Statutory offenses classified by volume and legal severity tier
          </p>
        </div>

        <div className="flex items-center gap-1 rounded border border-[#D9E1EA] bg-[#F4F7FA] p-0.5 text-[12px]">
          {[5, 8, 12, 21].map((count) => (
            <button
              key={count}
              onClick={() => setDisplayCount(count)}
              className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                displayCount === count
                  ? 'bg-white text-[#0B1F3A] shadow-2xs font-semibold'
                  : 'text-[#5D6878] hover:text-[#0B1F3A]'
              }`}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No crime type data found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" horizontal={false} />
              <XAxis
                type="number"
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="crime_name"
                type="category"
                stroke="#D9E1EA"
                tick={{ fill: '#0B1F3A', fontSize: 11, width: 80 }}
                width={80}
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
                  `Code: ${item.payload.crime_code} [${item.payload.severity_level}]`,
                ]}
              />
              <Bar dataKey="incident_count" radius={[0, 3, 3, 0]}>
                {displayedData.map((entry) => (
                  <Cell
                    key={`bar-${entry.crime_type_id}`}
                    fill={SEVERITY_COLORS[entry.severity_level] || '#1769AA'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Severity Legend */}
      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-3 pt-2 text-[11px] text-[#5D6878]">
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
