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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">Top High-Risk Jurisdictions</h3>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            {metric === 'volume'
              ? 'Ranked by absolute reported incident volume'
              : 'Ranked by per-capita crime rate per 100,000 citizens (Census 2011 normalized)'}
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
          <button
            onClick={() => onMetricChange('volume')}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
              metric === 'volume'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            By Volume
          </button>
          <button
            onClick={() => onMetricChange('rate')}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
              metric === 'rate'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Users className="h-4 w-4" />
            Per 100k Rate
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3.5 pl-4"># Rank</th>
              <th className="py-3.5 px-3">District</th>
              <th className="py-3.5 px-3">State / UT</th>
              <th className="py-3.5 px-3 text-right">Population</th>
              <th className="py-3.5 px-3 text-right">
                {metric === 'volume' ? 'Reported Crimes' : 'Rate / 100k'}
              </th>
              <th className="py-3.5 pl-4 pr-4">Relative Intensity</th>
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
                  className="transition-colors hover:bg-slate-50/70"
                >
                  <td className="py-3.5 pl-4 font-mono font-bold text-slate-500">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">{d.district_name}</td>
                  <td className="py-3.5 px-3 text-slate-600">{d.state_name}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                    {d.total_population ? d.total_population.toLocaleString() : '—'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {metric === 'volume'
                      ? d.incident_count.toLocaleString()
                      : `${d.crime_rate_per_100k?.toFixed(2) ?? '—'}`}
                  </td>
                  <td className="py-3.5 pl-4 pr-4">
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
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
