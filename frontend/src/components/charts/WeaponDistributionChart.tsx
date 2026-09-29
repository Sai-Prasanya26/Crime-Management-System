import React from 'react';
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
import { Crosshair } from 'lucide-react';
import type { WeaponDistributionItem } from '../../types';

interface WeaponDistributionChartProps {
  data: WeaponDistributionItem[];
  totalIncidents: number;
}

const WEAPON_COLORS = ['#EF4444', '#F97316', '#EAB308', '#8B5CF6', '#06B6D4', '#64748B'];

export const WeaponDistributionChart: React.FC<WeaponDistributionChartProps> = ({ data }) => {
  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <Crosshair className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A]">Weapon Involvement Distribution</h3>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Recorded weapon classifications utilized during commission of offenses
          </p>
        </div>
      </div>

      <div className="mt-4 h-60 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No weapon data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis
                type="number"
                stroke="#E2E8F0"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="weapon_name"
                type="category"
                stroke="#E2E8F0"
                tick={{ fill: '#0F172A', fontSize: 10 }}
                width={75}
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
                  'Weapon Involvement',
                ]}
              />
              <Bar dataKey="incident_count" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={WEAPON_COLORS[index % WEAPON_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default WeaponDistributionChart;
