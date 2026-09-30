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

const WEAPON_COLORS = ['#C53030', '#B7791F', '#D97706', '#1D4ED8', '#0891B2', '#5B6577'];

export const WeaponDistributionChart: React.FC<WeaponDistributionChartProps> = ({ data }) => {
  return (
    <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-red-50 text-[#C53030]">
              <Crosshair className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#172033]">Weapon Involvement Distribution</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5B6577]">
            Recorded weapon classifications utilized during commission of offenses
          </p>
        </div>
      </div>

      <div className="mt-3.5 h-60 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No weapon data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 75, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" horizontal={false} />
              <XAxis
                type="number"
                stroke="#DCE2EA"
                tick={{ fill: '#5B6577', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="weapon_name"
                type="category"
                stroke="#DCE2EA"
                tick={{ fill: '#172033', fontSize: 10 }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCE2EA',
                  borderRadius: '0.375rem',
                  color: '#172033',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                }}
                itemStyle={{ color: '#172033', fontWeight: 600 }}
                formatter={(val: any, _name: any, item: any) => [
                  `${Number(val).toLocaleString()} incidents (${item.payload.percentage.toFixed(1)}%)`,
                  'Weapon Involvement',
                ]}
              />
              <Bar dataKey="incident_count" radius={[0, 3, 3, 0]}>
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
