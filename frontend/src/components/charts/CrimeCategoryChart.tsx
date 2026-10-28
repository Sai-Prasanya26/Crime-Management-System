import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldAlert } from 'lucide-react';
import type { CategoryBreakdownItem } from '../../types';

interface CrimeCategoryChartProps {
  data: CategoryBreakdownItem[];
  totalIncidents: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Violent Crime': '#C53B3B',     // Critical
  'Fire Accident': '#C98512',     // Warning
  'Traffic Fatality': '#1769AA',  // Operational Blue
  'Other Crime': '#0B1F3A',       // Deep Navy
};

const DEFAULT_COLOR = '#172033';

export const CrimeCategoryChart: React.FC<CrimeCategoryChartProps> = ({
  data,
  totalIncidents,
}) => {
  return (
    <div className="flex flex-col justify-between h-full rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 min-h-[46px]">
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5 bg-red-50 text-[#C53B3B]">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <h3 className="text-[16px] font-bold text-[#0B1F3A]">Crime Category Distribution</h3>
        </div>
      </div>

      <div className="my-auto py-2 grid grid-cols-1 sm:grid-cols-12 items-center gap-4 min-h-[260px]">
        {/* Donut Chart */}
        <div className="h-[210px] sm:h-[240px] w-full sm:col-span-5 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="incident_count"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.category_id}`}
                    fill={CATEGORY_COLORS[entry.category_name] || DEFAULT_COLOR}
                  />
                ))}
              </Pie>
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
                formatter={(value: any, name: any) => [
                  `${Number(value).toLocaleString()} (${(
                    (Number(value) / (totalIncidents || 1)) *
                    100
                  ).toFixed(1)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="sm:col-span-7 space-y-2.5">
          {data.map((cat) => {
            const color = CATEGORY_COLORS[cat.category_name] || DEFAULT_COLOR;
            return (
              <div
                key={cat.category_id}
                className="flex items-center justify-between rounded border border-[#D9E1EA] bg-[#F4F7FA] px-3 py-2.5 transition-colors hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h4 className="text-[13px] font-semibold text-[#0B1F3A] truncate">
                    {cat.category_name}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[13px] font-bold text-[#0B1F3A] font-mono">
                    {cat.incident_count.toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-[11px] font-medium text-[#5D6878]">
                    ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default CrimeCategoryChart;
