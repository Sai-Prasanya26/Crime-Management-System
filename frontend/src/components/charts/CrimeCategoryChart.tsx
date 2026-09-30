import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldAlert, Layers } from 'lucide-react';
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
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-red-50 text-[#C53B3B]">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">Crime Category Distribution</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Categorization by legal domain &amp; severity weighting
          </p>
        </div>
        <span className="rounded bg-[#F4F7FA] px-2 py-0.5 text-[11px] font-semibold text-[#5D6878] border border-[#D9E1EA]">
          4 Categories
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-1 items-center gap-3.5 lg:grid-cols-12">
        {/* Donut Chart */}
        <div className="h-48 w-full lg:col-span-5">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="incident_count"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
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

        {/* Category List with Severity Weights */}
        <div className="space-y-2 lg:col-span-7">
          {data.map((cat) => {
            const color = CATEGORY_COLORS[cat.category_name] || DEFAULT_COLOR;
            return (
              <div
                key={cat.category_id}
                className="flex items-center justify-between rounded border border-[#D9E1EA] bg-[#F4F7FA] p-2 transition-colors hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#0B1F3A] leading-tight">{cat.category_name}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#5D6878]">
                      <Layers className="h-2.5 w-2.5" />
                      Severity: {cat.severity_weight.toFixed(2)}x
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#0B1F3A] leading-tight">
                    {cat.incident_count.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-medium text-[#5D6878]">
                    {cat.percentage.toFixed(1)}%
                  </p>
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
