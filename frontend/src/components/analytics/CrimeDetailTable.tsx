import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import type { TypeBreakdownResponse } from '../../types';

interface CrimeDetailTableProps {
  types: TypeBreakdownResponse | null;
}

type SortField = 'crime_name' | 'category_name' | 'severity_level' | 'incident_count' | 'percentage';
type SortOrder = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const SEVERITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOW: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Violent Crime': { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500' },
  'Traffic Fatality': { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  'Fire Accident': { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Other Crime': { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500' },
};

export const CrimeDetailTable: React.FC<CrimeDetailTableProps> = ({ types }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('incident_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const items = useMemo(() => types?.items || [], [types]);

  // Extract unique categories & severities for filter dropdowns
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category_name));
    return Array.from(set).sort();
  }, [items]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchesName = item.crime_name.toLowerCase().includes(query);
          const matchesCode = item.crime_code.toLowerCase().includes(query);
          const matchesCat = item.category_name.toLowerCase().includes(query);
          if (!matchesName && !matchesCode && !matchesCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.category_name !== selectedCategory) {
          return false;
        }

        // Severity filter
        if (selectedSeverity !== 'ALL' && item.severity_level !== selectedSeverity) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortField === 'crime_name') {
          comparison = a.crime_name.localeCompare(b.crime_name);
        } else if (sortField === 'category_name') {
          comparison = a.category_name.localeCompare(b.category_name);
        } else if (sortField === 'severity_level') {
          const aWeight = SEVERITY_ORDER[a.severity_level] || 0;
          const bWeight = SEVERITY_ORDER[b.severity_level] || 0;
          comparison = aWeight - bWeight;
        } else if (sortField === 'incident_count') {
          comparison = a.incident_count - b.incident_count;
        } else if (sortField === 'percentage') {
          comparison = a.percentage - b.percentage;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [items, searchTerm, selectedCategory, selectedSeverity, sortField, sortOrder]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-blue-600 font-bold" />
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <TableIcon className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-[#0A192F]">
              Crime Analysis Detail
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive statutory offense inventory across all codified crime classifications with severity ratings, legal codes, and volume shares.
          </p>
        </div>

        <div className="text-xs text-slate-500 self-start sm:self-auto">
          Showing <span className="font-semibold text-slate-800">{filteredAndSortedItems.length}</span> of {items.length} offenses
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by offense name, legal code (OFF-xx), or category..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Responsive Table with horizontal internal scrolling */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th scope="col" className="py-3 px-3 w-16">
                Code
              </th>
              <th
                scope="col"
                onClick={() => handleSort('crime_name')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center">
                  <span>Crime Classification / Type</span>
                  {renderSortIndicator('crime_name')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('category_name')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center">
                  <span>Category Domain</span>
                  {renderSortIndicator('category_name')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('severity_level')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center">
                  <span>Severity Tier</span>
                  {renderSortIndicator('severity_level')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('incident_count')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end">
                  <span>Incident Count</span>
                  {renderSortIndicator('incident_count')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('percentage')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors w-32"
              >
                <div className="flex items-center justify-end">
                  <span>Volume Share</span>
                  {renderSortIndicator('percentage')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No crime classifications match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => {
                const badge = SEVERITY_BADGES[item.severity_level] || SEVERITY_BADGES.LOW;
                const catStyle = CATEGORY_COLORS[item.category_name] || {
                  bg: 'bg-slate-50',
                  text: 'text-slate-700',
                  dot: 'bg-slate-400',
                };

                return (
                  <tr
                    key={item.crime_type_id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-500">
                      {item.crime_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0A192F]">
                      {item.crime_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${catStyle.bg} ${catStyle.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                        {item.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {item.severity_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {item.incident_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-slate-700">
                          {item.percentage.toFixed(2)}%
                        </span>
                        <div className="hidden sm:block h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${Math.min(100, item.percentage * 10)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500">
        <span>Click any column header to sort. Table scrolls horizontally on smaller screens.</span>
        <span>Standard Indian Penal Code statutory offenses</span>
      </div>
    </div>
  );
};

export default CrimeDetailTable;
