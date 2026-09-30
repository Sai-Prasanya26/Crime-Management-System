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
  F: '#C53B3B',       // Critical/Rose
  M: '#1769AA',       // Operational Blue
  UNKNOWN: '#7C8796', // Muted Slate
};

const GENDER_LABELS: Record<string, string> = {
  F: 'Female',
  M: 'Male',
  UNKNOWN: 'Unspecified',
};

export const VictimDemographicsChart: React.FC<VictimDemographicsChartProps> = ({ data }) => {
  const ageOrder = ['0-18', '19-35', '36-50', '51-65', '65+'];
  const ageData = ageOrder.map((group) => ({
    cohort: group,
    count: data.age_distribution[group] || 0,
  }));

  const totalGender = Object.values(data.gender_distribution).reduce((a, b) => a + b, 0);
  const genderData = Object.entries(data.gender_distribution).map(([key, count]) => ({
    genderKey: key,
    label: GENDER_LABELS[key] || key,
    count,
    percentage: totalGender > 0 ? (count / totalGender) * 100 : 0,
  }));

  return (
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">Victim Demographics Profile</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5D6878]">
            Age cohort distribution and disaggregated gender split
          </p>
        </div>

        {data.average_age !== undefined && data.average_age !== null && (
          <div className="flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#F4F7FA] px-2.5 py-1 text-[11px] font-medium text-slate-700">
            <UserCheck className="h-3.5 w-3.5 text-[#1769AA]" />
            <span className="text-[#5D6878]">Avg Age:</span>
            <span className="font-bold text-[#0B1F3A]">{data.average_age} yrs</span>
          </div>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Age Cohorts Bar Chart */}
        <div className="lg:col-span-7">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
            Incidents by Age Cohort
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
                <XAxis dataKey="cohort" stroke="#D9E1EA" tick={{ fill: '#5D6878', fontSize: 10 }} />
                <YAxis
                  stroke="#D9E1EA"
                  tick={{ fill: '#5D6878', fontSize: 10 }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
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
                  formatter={(val: any) => [`${Number(val).toLocaleString()} victims`, 'Cohort Count']}
                />
                <Bar dataKey="count" fill="#1769AA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Breakdown Donut & Legend */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5D6878]">
            Gender Classification
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={48}
                    paddingAngle={3}
                  >
                    {genderData.map((entry) => (
                      <Cell
                        key={`cell-${entry.genderKey}`}
                        fill={GENDER_COLORS[entry.genderKey] || '#7C8796'}
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

            <div className="flex-1 space-y-1.5">
              {genderData.map((g) => (
                <div key={g.genderKey} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: GENDER_COLORS[g.genderKey] || '#7C8796' }}
                    />
                    <span className="text-slate-600 font-medium">{g.label}</span>
                  </div>
                  <span className="font-semibold text-[#0B1F3A]">{g.percentage.toFixed(1)}%</span>
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
