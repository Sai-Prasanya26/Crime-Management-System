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
import { Crosshair, ShieldAlert } from 'lucide-react';
import type { WeaponDistributionItem } from '../../types';

interface WeaponDistributionChartProps {
  data: WeaponDistributionItem[];
  totalIncidents: number;
}

const WEAPON_COLORS = ['#C53B3B', '#C98512', '#1769AA', '#0B1F3A', '#16845B', '#7C8796'];

export const WeaponDistributionChart: React.FC<WeaponDistributionChartProps> = ({
  data,
  totalIncidents,
}) => {
  const topWeapon = data.length > 0 ? data[0] : null;

  return (
    <div className="flex flex-col justify-between h-full rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 min-h-[58px]">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <Crosshair className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">Weapon Involvement Profile</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Recorded weapon classifications utilized during commission of offenses
          </p>
        </div>

        {topWeapon && (
          <div className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#C53B3B] shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-[#C53B3B]" />
            <span>
              Primary: {topWeapon.weapon_name} ({topWeapon.incident_count.toLocaleString()} cases)
            </span>
          </div>
        )}
      </div>

      <div className="my-auto py-2 h-[260px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No weapon data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 25, left: 95, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" horizontal={false} />
              <XAxis
                type="number"
                stroke="#D9E1EA"
                tick={{ fill: '#5D6878', fontSize: 10 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <YAxis
                dataKey="weapon_name"
                type="category"
                stroke="#D9E1EA"
                tick={{ fill: '#0B1F3A', fontSize: 11 }}
                width={95}
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

      {/* Aligned Bottom Tactical Recommendation Box */}
      <div className="mt-auto flex items-center justify-between rounded border border-[#D9E1EA] bg-[#F4F7FA] px-3 py-2 text-xs text-[#5D6878]">
        <span className="text-[11px] font-medium truncate mr-2">
          Tactical Assessment: High prevalence of sharp instruments and edged weapons.
        </span>
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <span className="font-semibold text-[#0B1F3A]">{data.length} Classifications</span>
          <span className="text-slate-300">|</span>
          <span className="font-medium text-[#1769AA]">{totalIncidents.toLocaleString()} Incidents</span>
        </div>
      </div>
    </div>
  );
};

export default WeaponDistributionChart;
