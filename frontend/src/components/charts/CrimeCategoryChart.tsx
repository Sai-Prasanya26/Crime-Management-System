import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldAlert, Layers } from 'lucide-react';
import type { CategoryBreakdownItem } from '../../types';

interface CrimeCategoryChartProps {
  data: CategoryBreakdownItem[];
  totalIncidents: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Violent Crime': '#ef4444',     // Red
  'Fire Accident': '#f97316',     // Orange
  'Traffic Fatality': '#eab308',  // Yellow
  'Other Crime': '#3b82f6',       // Blue
};

const DEFAULT_COLOR = '#6366f1';

export const CrimeCategoryChart: React.FC<CrimeCategoryChartProps> = ({
  data,
  totalIncidents,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Crime Domain Breakdown</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Categorization by legal domain & severity weighting
          </p>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
          4 Domains
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
        {/* Donut Chart */}
        <div className="h-56 w-full lg:col-span-5">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="incident_count"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
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
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                }}
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
        <div className="space-y-2.5 lg:col-span-7">
          {data.map((cat) => {
            const color = CATEGORY_COLORS[cat.category_name] || DEFAULT_COLOR;
            return (
              <div
                key={cat.category_id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-white">{cat.category_name}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Layers className="h-2.5 w-2.5" />
                      Severity Weight: {cat.severity_weight.toFixed(2)}x
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-white">
                    {cat.incident_count.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
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
