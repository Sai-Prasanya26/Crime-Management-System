import React, { useMemo, useState } from 'react';
import { Award, Filter, Search, Info, GitBranch } from 'lucide-react';
import type { TopDistrictItem } from '../../types';

interface TopDistrictsTableProps {
  districts: TopDistrictItem[];
  metric?: 'volume' | 'rate';
  onMetricChange?: (metric: 'volume' | 'rate') => void;
  selectedCategoryId?: number;
  onCategoryChange?: (categoryId?: number) => void;
  isLoading?: boolean;
  onSelectDistrict?: (districtId: number) => void;
  selectedDistrictId?: number;
}

const CRIME_CATEGORIES = [
  { id: undefined, name: 'All Categories' },
  { id: 1, name: 'Violent Crime' },
  { id: 2, name: 'Fire Accident' },
  { id: 3, name: 'Traffic Fatality' },
  { id: 4, name: 'Other Crime' },
];

export const TopDistrictsTable: React.FC<TopDistrictsTableProps> = ({
  districts,
  metric = 'volume',
  onMetricChange,
  selectedCategoryId,
  onCategoryChange,
  isLoading = false,
  onSelectDistrict,
  selectedDistrictId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredDistricts = useMemo(() => {
    let list = [...districts];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (d) =>
          d.district_name.toLowerCase().includes(q) ||
          d.state_name.toLowerCase().includes(q)
      );
    }

    if (metric === 'rate') {
      list.sort((a, b) => {
        const rateA = a.crime_rate_per_100k ?? -1;
        const rateB = b.crime_rate_per_100k ?? -1;
        return rateB - rateA;
      });
    } else {
      list.sort((a, b) => b.incident_count - a.incident_count);
    }

    return list;
  }, [districts, searchTerm, metric]);

  return (
    <div className="flex flex-col justify-between h-full rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#0B1F3A]">
              District Crime Comparison & Ranking
            </h3>
            <p className="text-[11px] text-[#5D6878]">
              Ranking {sortedAndFilteredDistricts.length} jurisdictions by {metric === 'volume' ? 'Reported Crime Volume' : 'Population-Normalized Rate per 100,000 citizens'}
            </p>
          </div>
        </div>

        {/* Toolbar: Category Filter, Metric Toggle & District Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Crime Category Filter */}
          {onCategoryChange && (
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  onCategoryChange(val);
                }}
                className="h-8 rounded border border-[#D9E1EA] bg-white px-2 text-[12px] font-medium text-[#172033] focus:border-[#1769AA] focus:outline-none cursor-pointer"
              >
                {CRIME_CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.id || ''}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Metric Selector Toggle */}
          {onMetricChange && (
            <div className="inline-flex rounded-md border border-[#D9E1EA] bg-white p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => onMetricChange('volume')}
                className={`px-2.5 py-1 font-semibold rounded transition-colors cursor-pointer ${
                  metric === 'volume'
                    ? 'bg-[#1769AA] text-white shadow-2xs'
                    : 'text-[#5D6878] hover:text-[#0B1F3A]'
                }`}
              >
                Total Volume
              </button>
              <button
                type="button"
                onClick={() => onMetricChange('rate')}
                className={`px-2.5 py-1 font-semibold rounded transition-colors cursor-pointer ${
                  metric === 'rate'
                    ? 'bg-[#1769AA] text-white shadow-2xs'
                    : 'text-[#5D6878] hover:text-[#0B1F3A]'
                }`}
              >
                Rate / 100k
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-36 sm:w-44 rounded border border-[#D9E1EA] pl-8 pr-2 text-[12px] focus:border-[#1769AA] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="my-2 flex-1 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] whitespace-nowrap">
              <th className="py-2.5 pl-3 w-16"># Rank</th>
              <th className="py-2.5 px-3">District & Lineage</th>
              <th className="py-2.5 px-3">State / UT</th>
              <th className="py-2.5 px-3 text-right">Reported Crimes</th>
              <th className="py-2.5 px-3 text-right">Census 2011 Pop.</th>
              <th className="py-2.5 px-3 pr-4 text-right">Rate / 100k</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 whitespace-nowrap">
            {sortedAndFilteredDistricts.map((d, index) => {
              const isSelected = selectedDistrictId === d.district_id;
              const hasPop = d.total_population !== null && d.total_population !== undefined && d.total_population > 0;
              const isCarved = d.is_derived_from_parent || Boolean(d.parent_district_id);

              return (
                <tr
                  key={d.district_id}
                  onClick={() => onSelectDistrict?.(d.district_id)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 font-medium'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2.5 pl-3 font-mono font-bold text-[#5D6878]">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-[#C98512]'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'text-[#5D6878] bg-slate-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#0B1F3A]">{d.district_name}</span>
                      {isCarved && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                          title={d.notes || `Carved modern district (lineage mapped to parent #${d.parent_district_id})`}
                        >
                          <GitBranch className="h-2.5 w-2.5" />
                          <span>Carved</span>
                        </span>
                      )}
                    </div>
                    {isCarved && d.parent_district_name && (
                      <span className="text-[10px] text-slate-400 block">
                        Parent: {d.parent_district_name}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#5D6878]">{d.state_name}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1769AA]">
                    {d.incident_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {hasPop ? (
                      d.total_population!.toLocaleString()
                    ) : (
                      <span className="text-slate-400 italic text-[11px]" title="Census 2011 enumeration unavailable for this carved entity">
                        N/A
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 pr-4 text-right font-mono font-bold">
                    {d.crime_rate_per_100k !== null && d.crime_rate_per_100k !== undefined ? (
                      <span className={d.crime_rate_per_100k > 50 ? 'text-[#C53B3B]' : 'text-[#1769AA]'}>
                        {d.crime_rate_per_100k.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]" title="Rate requires valid Census population baseline">
                        N/A
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sortedAndFilteredDistricts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  {isLoading
                    ? 'Aggregating jurisdictional crime load...'
                    : 'No jurisdictions match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footnote on Demographic Normalization */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#5D6878] gap-1">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3 text-[#1769AA]" />
          <span>
            <strong>Census Reference Year: 2011 Baseline.</strong> Crime Rate per 100,000 citizens = (Reported Crimes / Population) &times; 100,000.
          </span>
        </span>
        <span className="text-[10px] text-slate-400">
          Showing top {sortedAndFilteredDistricts.length} jurisdictions
        </span>
      </div>
    </div>
  );
};

export default TopDistrictsTable;
