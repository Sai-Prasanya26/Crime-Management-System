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
    <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-emerald-50 text-[#16805C]">
              <Award className="h-4 w-4" />
            </div>
            <h3 className="text-[16px] font-bold text-[#172033]">Top High-Risk Jurisdictions</h3>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5B6577]">
            {metric === 'volume'
              ? 'Ranked by absolute reported incident volume'
              : 'Ranked by per-capita crime rate per 100,000 citizens (Census 2011 normalized)'}
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center rounded border border-[#DCE2EA] bg-slate-50 p-0.5 text-[12px]">
          <button
            onClick={() => onMetricChange('volume')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors ${
              metric === 'volume'
                ? 'bg-white text-[#16805C] shadow-2xs font-semibold'
                : 'text-[#5B6577] hover:text-[#172033]'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            By Volume
          </button>
          <button
            onClick={() => onMetricChange('rate')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors ${
              metric === 'rate'
                ? 'bg-white text-[#16805C] shadow-2xs font-semibold'
                : 'text-[#5B6577] hover:text-[#172033]'
            }`}
          >
            <Users className="h-3 w-3" />
            Per 100k Rate
          </button>
        </div>
      </div>

      <div className="mt-3.5 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#DCE2EA] bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-[#5B6577]">
              <th className="py-2.5 pl-3"># Rank</th>
              <th className="py-2.5 px-3">District</th>
              <th className="py-2.5 px-3">State / UT</th>
              <th className="py-2.5 px-3 text-right">Population</th>
              <th className="py-2.5 px-3 text-right">
                {metric === 'volume' ? 'Reported Crimes' : 'Rate / 100k'}
              </th>
              <th className="py-2.5 pl-3 pr-3">Relative Intensity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {districts.map((d, index) => {
              const currentVal =
                metric === 'volume' ? d.incident_count : d.crime_rate_per_100k || 0;
              const ratio = Math.min(100, Math.max(5, (currentVal / (maxVal || 1)) * 100));

              return (
                <tr
                  key={d.district_id}
                  className="transition-colors hover:bg-slate-50/60"
                >
                  <td className="py-2.5 pl-3 font-mono font-bold text-[#5B6577]">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-[#B7791F]'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-[#5B6577] bg-slate-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#172033]">{d.district_name}</td>
                  <td className="py-2.5 px-3 text-[#5B6577]">{d.state_name}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {d.total_population ? d.total_population.toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#16805C]">
                    {metric === 'volume'
                      ? d.incident_count.toLocaleString()
                      : `${d.crime_rate_per_100k?.toFixed(2) ?? '—'}`}
                  </td>
                  <td className="py-2.5 pl-3 pr-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-[#16805C] transition-all duration-300"
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
