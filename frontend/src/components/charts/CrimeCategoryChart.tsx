import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldAlert, Layers } from 'lucide-react';
import type { CategoryBreakdownItem } from '../../types';

interface CrimeCategoryChartProps {
  data: CategoryBreakdownItem[];
  totalIncidents: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Violent Crime': '#EF4444',     // Red
  'Fire Accident': '#F97316',     // Orange
  'Traffic Fatality': '#EAB308',  // Yellow
  'Other Crime': '#3B82F6',       // Blue
};

const DEFAULT_COLOR = '#4F46E5';

export const CrimeCategoryChart: React.FC<CrimeCategoryChartProps> = ({
  data,
  totalIncidents,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">Crime Domain Breakdown</h3>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Categorization by legal domain & severity weighting
          </p>
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200">
          4 Domains
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
        {/* Donut Chart */}
        <div className="h-60 w-full lg:col-span-5">
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
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.75rem',
                  color: '#0F172A',
                  fontSize: '0.8125rem',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                }}
                itemStyle={{ color: '#0F172A', fontWeight: 600 }}
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
        <div className="space-y-3 lg:col-span-7">
          {data.map((cat) => {
            const color = CATEGORY_COLORS[cat.category_name] || DEFAULT_COLOR;
            return (
              <div
                key={cat.category_id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-[#0F172A]">{cat.category_name}</h4>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Layers className="h-3 w-3" />
                      Severity Weight: {cat.severity_weight.toFixed(2)}x
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-[#0F172A]">
                    {cat.incident_count.toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
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
