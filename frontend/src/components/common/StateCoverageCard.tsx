import React, { useState, useEffect } from 'react';
import { officialCrimeApi } from '../../api';
import type { StateCoverageItem, StateCoverageListResponse } from '../../types';

export const StateCoverageCard: React.FC = () => {
  const [coverageData, setCoverageData] = useState<StateCoverageListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'STATE' | 'UT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    officialCrimeApi
      .getStateCoverage()
      .then((data) => {
        if (mounted) {
          setCoverageData(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message || 'Failed to load state crime data coverage audit.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse mb-6">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !coverageData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm mb-6">
        {error || 'Unable to retrieve coverage statistics.'}
      </div>
    );
  }

  const filteredItems = coverageData.items.filter((item: StateCoverageItem) => {
    const matchesType =
      filterType === 'ALL' ? true : item.entity_type === filterType;
    const matchesSearch = item.state_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              India Crime Data Coverage
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              36 States & UTs Complete
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dual-layer coverage audit contrasting the <strong>2020–2025 Historical Project Incident Dataset</strong> with published <strong>Official NCRB Benchmarks</strong>.
          </p>
        </div>

        {/* Aggregate Counters */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Entities</div>
            <div className="text-sm font-bold text-slate-800">
              {coverageData.total_entities} (28 States, 8 UTs)
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Current Districts</div>
            <div className="text-sm font-bold text-emerald-600">
              {coverageData.total_current_districts}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Historical Incidents</div>
            <div className="text-sm font-bold text-blue-600">
              {coverageData.total_historical_incidents.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            All (36)
          </button>
          <button
            onClick={() => setFilterType('STATE')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'STATE'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            States (28)
          </button>
          <button
            onClick={() => setFilterType('UT')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'UT'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Union Territories (8)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search State or UT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Coverage Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">State / UT Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3 text-right">Current Districts</th>
              <th className="py-2.5 px-3 text-right">
                Historical Incidents
                <span className="block text-[10px] text-slate-400 font-normal">2020–2025 Project</span>
              </th>
              <th className="py-2.5 px-3 text-right">
                Official NCRB
                <span className="block text-[10px] text-slate-400 font-normal">Reported Cases</span>
              </th>
              <th className="py-2.5 px-3">Data Freshness & Source</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredItems.map((item) => (
              <tr key={item.state_id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {item.state_name}
                  {item.notes && (
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                      {item.notes}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded ${
                      item.entity_type === 'STATE'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {item.entity_type}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                  {item.district_count}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {item.historical_incident_count > 0 ? (
                    <span className="font-semibold text-blue-700">
                      {item.historical_incident_count.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-amber-600 text-[11px] italic">
                      No incident-level records in project dataset
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {item.official_data_available && item.latest_official_cases ? (
                    <div>
                      <span className="font-semibold text-indigo-700">
                        {item.latest_official_cases.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Year: {item.latest_official_crime_year}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">None</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                  <div>{item.data_source}</div>
                  <span className="text-[10px] text-slate-400">
                    {item.data_freshness} ({item.data_status})
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.coverage_status === 'COMPLETE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.coverage_status === 'HISTORICAL_ONLY'
                        ? 'bg-blue-100 text-blue-800'
                        : item.coverage_status === 'OFFICIAL_BENCHMARK_ONLY'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.coverage_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Academic Transparency Footer */}
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <div>
          Showing <strong>{filteredItems.length}</strong> of <strong>{coverageData.total_entities}</strong> administrative entities.
        </div>
        <div className="flex items-center gap-1 text-slate-400 mt-1 sm:mt-0">
          <span>Source Citation: NCRB <em>Crime in India</em> & Official State Police Publications</span>
        </div>
      </div>
    </div>
  );
};

export default StateCoverageCard;
