import React from 'react';
import { Award, TrendingUp, Users } from 'lucide-react';
import type { TopDistrictItem } from '../../types';

interface TopDistrictsTableProps {
  districts: TopDistrictItem[];
  metric: 'volume' | 'rate';
  onMetricChange: (metric: 'volume' | 'rate') => void;
  isLoading?: boolean;
}

export const TopDistrictsTable: React.FC<TopDistrictsTableProps> = ({
  districts,
  metric,
  onMetricChange,
  isLoading,
}) => {
  const maxVal =
    districts.length > 0
      ? metric === 'volume'
        ? districts[0].incident_count
        : districts[0].crime_rate_per_100k || 1
      : 1;

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A]">Top High-Risk Jurisdictions</h3>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            {metric === 'volume'
              ? 'Ranked by absolute reported incident volume'
              : 'Ranked by per-capita crime rate per 100,000 citizens (Census 2011 normalized)'}
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
          <button
            onClick={() => onMetricChange('volume')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-all ${
              metric === 'volume'
                ? 'bg-white text-emerald-700 shadow-xs border border-[#E2E8F0] font-semibold'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            By Volume
          </button>
          <button
            onClick={() => onMetricChange('rate')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-all ${
              metric === 'rate'
                ? 'bg-white text-emerald-700 shadow-xs border border-[#E2E8F0] font-semibold'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Users className="h-3 w-3" />
            Per 100k Rate
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
              <th className="py-2.5 pl-3"># Rank</th>
              <th className="py-2.5">District</th>
              <th className="py-2.5">State / UT</th>
              <th className="py-2.5 text-right">Population</th>
              <th className="py-2.5 text-right">
                {metric === 'volume' ? 'Reported Crimes' : 'Rate / 100k'}
              </th>
              <th className="py-2.5 pl-4 pr-3">Relative Intensity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {districts.map((d, index) => {
              const currentVal =
                metric === 'volume' ? d.incident_count : d.crime_rate_per_100k || 0;
              const ratio = Math.min(100, Math.max(5, (currentVal / (maxVal || 1)) * 100));

              return (
                <tr
                  key={d.district_id}
                  className="transition-colors hover:bg-[#F8FAFC]"
                >
                  <td className="py-2.5 pl-3 font-mono font-bold text-slate-500">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2.5 font-semibold text-[#0F172A]">{d.district_name}</td>
                  <td className="py-2.5 text-[#64748B]">{d.state_name}</td>
                  <td className="py-2.5 text-right font-mono text-slate-700">
                    {d.total_population ? d.total_population.toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                    {metric === 'volume'
                      ? d.incident_count.toLocaleString()
                      : `${d.crime_rate_per_100k?.toFixed(2) ?? '—'}`}
                  </td>
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopDistrictsTable;
