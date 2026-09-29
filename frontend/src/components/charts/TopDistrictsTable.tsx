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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Award className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Top High-Risk Jurisdictions</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {metric === 'volume'
              ? 'Ranked by absolute reported incident volume'
              : 'Ranked by per-capita crime rate per 100,000 citizens (Census 2011 normalized)'}
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
          <button
            onClick={() => onMetricChange('volume')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-colors ${
              metric === 'volume'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            By Volume
          </button>
          <button
            onClick={() => onMetricChange('rate')}
            disabled={isLoading}
            className={`flex items-center gap-1 rounded-md px-3 py-1 font-medium transition-colors ${
              metric === 'rate'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
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
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="pb-3 pl-2"># Rank</th>
              <th className="pb-3">District</th>
              <th className="pb-3">State / UT</th>
              <th className="pb-3 text-right">Population</th>
              <th className="pb-3 text-right">
                {metric === 'volume' ? 'Reported Crimes' : 'Rate / 100k'}
              </th>
              <th className="pb-3 pl-4 pr-2">Relative Intensity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {districts.map((d, index) => {
              const currentVal =
                metric === 'volume' ? d.incident_count : d.crime_rate_per_100k || 0;
              const ratio = Math.min(100, Math.max(5, (currentVal / (maxVal || 1)) * 100));

              return (
                <tr
                  key={d.district_id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  <td className="py-2.5 pl-2 font-mono font-bold text-slate-400">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-300'
                          : index === 1
                          ? 'bg-slate-500/20 text-slate-300'
                          : index === 2
                          ? 'bg-amber-700/20 text-amber-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2.5 font-semibold text-white">{d.district_name}</td>
                  <td className="py-2.5 text-slate-400">{d.state_name}</td>
                  <td className="py-2.5 text-right font-mono text-slate-300">
                    {d.total_population ? d.total_population.toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                    {metric === 'volume'
                      ? d.incident_count.toLocaleString()
                      : `${d.crime_rate_per_100k?.toFixed(2) ?? '—'}`}
                  </td>
                  <td className="py-2.5 pl-4 pr-2">
                    <div className="h-1.5 w-full rounded-full bg-slate-800">
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
