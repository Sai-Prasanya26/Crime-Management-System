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

const WEAPON_COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'];

export const WeaponDistributionChart: React.FC<WeaponDistributionChartProps> = ({ data }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
              <Crosshair className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Weapon Involvement Distribution</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Recorded weapon classifications utilized during commission of offenses
          </p>
        </div>
      </div>

      <div className="mt-4 h-60 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No weapon data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="weapon_name"
                type="category"
                stroke="#64748b"
                tick={{ fill: '#cbd5e1', fontSize: 10 }}
                width={75}
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
