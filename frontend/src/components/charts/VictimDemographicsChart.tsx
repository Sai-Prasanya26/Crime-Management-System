import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, UserCheck } from 'lucide-react';
import type { VictimDemographicsResponse } from '../../types';

interface VictimDemographicsChartProps {
  data: VictimDemographicsResponse;
}

const GENDER_COLORS: Record<string, string> = {
  F: '#ec4899',       // Pink
  M: '#3b82f6',       // Blue
  UNKNOWN: '#94a3b8', // Gray
};

const GENDER_LABELS: Record<string, string> = {
  F: 'Female',
  M: 'Male',
  UNKNOWN: 'Unspecified',
};

export const VictimDemographicsChart: React.FC<VictimDemographicsChartProps> = ({ data }) => {
  // Format age distribution data
  const ageOrder = ['0-18', '19-35', '36-50', '51-65', '65+'];
  const ageData = ageOrder.map((group) => ({
    cohort: group,
    count: data.age_distribution[group] || 0,
  }));

  // Format gender data
  const totalGender = Object.values(data.gender_distribution).reduce((a, b) => a + b, 0);
  const genderData = Object.entries(data.gender_distribution).map(([key, count]) => ({
    genderKey: key,
    label: GENDER_LABELS[key] || key,
    count,
    percentage: totalGender > 0 ? (count / totalGender) * 100 : 0,
  }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Victim Demographics Profile</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Age cohort distribution and disaggregated gender split
          </p>
        </div>

        {data.average_age !== undefined && data.average_age !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-slate-300">Average Age:</span>
            <span className="font-bold text-purple-300">{data.average_age} yrs</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Age Cohorts Bar Chart */}
        <div className="lg:col-span-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Incidents by Age Cohort
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis dataKey="cohort" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    color: '#f8fafc',
                    fontSize: '0.75rem',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} victims`, 'Cohort Count']}
                />
                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Breakdown Donut & Legend */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Gender Classification
          </p>
          <div className="flex items-center gap-3">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                  >
                    {genderData.map((entry) => (
                      <Cell
                        key={`cell-${entry.genderKey}`}
                        fill={GENDER_COLORS[entry.genderKey] || '#94a3b8'}
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
                    formatter={(val: any) => [
                      `${Number(val).toLocaleString()} (${(
                        (Number(val) / (totalGender || 1)) *
                        100
                      ).toFixed(1)}%)`,
                      'Victims',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2">
              {genderData.map((g) => (
                <div key={g.genderKey} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: GENDER_COLORS[g.genderKey] || '#94a3b8' }}
                    />
                    <span className="text-slate-300">{g.label}</span>
                  </div>
                  <span className="font-semibold text-white">{g.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VictimDemographicsChart;
