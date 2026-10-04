import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  Compass,
  Info,
} from 'lucide-react';
import type { TopDistrictsResponse } from '../../types';

interface JurisdictionComparisonSectionProps {
  topDistrictsVolume: TopDistrictsResponse | null;
  topDistrictsRate: TopDistrictsResponse | null;
  selectedStateName?: string;
}

export const JurisdictionComparisonSection: React.FC<JurisdictionComparisonSectionProps> = ({
  topDistrictsVolume,
  topDistrictsRate,
  selectedStateName,
}) => {
  const [metricMode, setMetricMode] = useState<'volume' | 'rate'>('volume');

  const activeData = metricMode === 'volume' ? topDistrictsVolume : topDistrictsRate;
  const items = activeData?.items || [];
  const maxVal = items.length > 0
    ? metricMode === 'volume'
      ? Math.max(...items.map((i) => i.incident_count))
      : Math.max(...items.map((i) => i.crime_rate_per_100k || 0))
    : 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Header & Metric Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Compass className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-[#0A192F]">
              Jurisdiction Crime Comparison
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Comparative analysis of jurisdictional crime concentration by raw incident volume versus per-capita population rate.
            {selectedStateName && (
              <span className="ml-1 font-semibold text-blue-600">
                (Filtered to {selectedStateName})
              </span>
            )}
          </p>
        </div>

        {/* Metric Toggle Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('volume')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              metricMode === 'volume'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Incident Volume
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('rate')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              metricMode === 'rate'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Rate per 100k
          </button>
        </div>
      </div>

      {/* Top 3 Highlight Cards */}
      {items.length >= 3 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.slice(0, 3).map((item, idx) => {
            const rankMedals = ['#1 Ranked', '#2 Ranked', '#3 Ranked'];
            const medalColors = [
              'bg-amber-100 text-amber-900 border-amber-300',
              'bg-slate-100 text-slate-800 border-slate-300',
              'bg-orange-100 text-orange-900 border-orange-300',
            ];

            return (
              <div
                key={item.district_id}
                className="relative rounded-lg border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-blue-300 hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                      medalColors[idx]
                    }`}
                  >
                    {rankMedals[idx]}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {item.state_name}
                  </span>
                </div>

                <h4 className="mt-2 text-base font-bold text-[#0A192F] truncate" title={item.district_name}>
                  {item.district_name}
                </h4>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xl font-bold text-blue-700">
                      {metricMode === 'volume'
                        ? item.incident_count.toLocaleString()
                        : (item.crime_rate_per_100k?.toFixed(1) || 'N/A')}
                    </span>
                    <span className="ml-1 text-xs text-slate-500">
                      {metricMode === 'volume' ? 'incidents' : '/ 100k pop'}
                    </span>
                  </div>
                  {item.total_population && (
                    <div className="text-right text-[11px] text-slate-500">
                      <span>Pop: {(item.total_population / 1000000).toFixed(2)}M</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked Horizontal Comparison List */}
      <div className="mt-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Jurisdiction Rank &amp; Name</span>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">Census Population</span>
            <span>{metricMode === 'volume' ? 'Recorded Volume' : 'Incidence / 100k'}</span>
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {items.map((district, idx) => {
            const currentVal =
              metricMode === 'volume'
                ? district.incident_count
                : district.crime_rate_per_100k || 0;
            const pctOfMax = Math.round((currentVal / (maxVal || 1)) * 100);

            return (
              <div key={district.district_id} className="py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-slate-100 text-[11px] font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 truncate block">
                        {district.district_name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {district.state_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    {district.total_population ? (
                      <span className="hidden sm:inline text-xs text-slate-500">
                        {district.total_population.toLocaleString()}
                      </span>
                    ) : (
                      <span className="hidden sm:inline text-xs text-slate-400">—</span>
                    )}

                    <div className="text-right">
                      <span className="font-bold text-slate-900">
                        {metricMode === 'volume'
                          ? district.incident_count.toLocaleString()
                          : (district.crime_rate_per_100k?.toFixed(1) || '0.0')}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-500">
                        {metricMode === 'volume' ? 'crimes' : 'rate'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      metricMode === 'volume' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${pctOfMax}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytical Comparison Insight Box */}
      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-slate-700">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-blue-900">
              Analytical Comparison Note:
            </span>
            <p className="text-slate-600 leading-relaxed">
              {metricMode === 'volume'
                ? 'Absolute Incident Volume highlights high-density metropolitan administrative centers (e.g., Thane, Mumbai Suburban, 24 Parganas) requiring largest total officer deployment and logistical infrastructure.'
                : 'Per-Capita Rate (crimes per 100,000 residents) adjusts for population scale, revealing jurisdictions with highest relative crime incidence per citizen (such as remote valley districts), guiding targeted vulnerability intervention.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JurisdictionComparisonSection;
