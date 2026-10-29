import React, { useState } from 'react';
import { Layers, ShieldAlert, Car, Flame, BarChart2 } from 'lucide-react';
import type { CategoryBreakdownResponse, TypeBreakdownResponse } from '../../types';

interface CrimeClassificationSectionProps {
  categories: CategoryBreakdownResponse | null;
  types: TypeBreakdownResponse | null;
}

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; bar: string; icon: typeof Layers }
> = {
  'Violent Crime': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    bar: 'bg-rose-600',
    icon: ShieldAlert,
  },
  'Traffic Fatality': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    icon: Car,
  },
  'Fire Accident': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    icon: Flame,
  },
  'Other Crime': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: 'bg-blue-600',
    icon: Layers,
  },
};

const SEVERITY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOW: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export const CrimeClassificationSection: React.FC<CrimeClassificationSectionProps> = ({
  categories,
  types,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(8);
  const [showAllTypes, setShowAllTypes] = useState(false);

  // Filter types by selected category if active
  const filteredTypes = types?.items
    ? selectedCategory
      ? types.items.filter((t) => t.category_name.toLowerCase() === selectedCategory.toLowerCase())
      : types.items
    : [];

  // Sort descending by incident count
  const sortedTypes = [...filteredTypes].sort((a, b) => b.incident_count - a.incident_count);
  const displayedTypes = showAllTypes ? sortedTypes : sortedTypes.slice(0, displayCount);

  const maxTypeCount = sortedTypes.length > 0 ? sortedTypes[0].incident_count : 1;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#D9E1EA] pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="text-[17px] font-bold text-[#0B1F3A]">
            Crime Classification &amp; Offense Distribution
          </h2>
        </div>
      </div>

      {/* Main Grid: Left 5 cols (Categories) | Right 7 cols (Ranked Types) - Anchored at top */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: 4 Category Distribution Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between h-6 mb-1">
            <h3 className="text-[14px] font-bold text-[#0B1F3A]">
              Statutory Categories
            </h3>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[11px] font-semibold text-[#1769AA] hover:underline cursor-pointer"
              >
                Reset Filter (Show All)
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {categories?.items.map((cat) => {
              const style = CATEGORY_STYLES[cat.category_name] || {
                bg: 'bg-slate-50',
                text: 'text-slate-700',
                border: 'border-slate-200',
                bar: 'bg-[#1769AA]',
                icon: Layers,
              };
              const Icon = style.icon;
              const isSelected = selectedCategory === cat.category_name;

              return (
                <div
                  key={cat.category_id}
                  onClick={() =>
                    setSelectedCategory(isSelected ? null : cat.category_name)
                  }
                  className={`rounded-lg border p-3.5 transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[#1769AA] bg-blue-50/50 shadow-xs'
                      : 'border-[#D9E1EA] bg-white hover:border-[#BAC7D5] hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`rounded p-1 ${style.bg} ${style.text} border ${style.border} shrink-0`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[13px] font-bold text-[#0B1F3A] truncate">
                        {cat.category_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[12px] shrink-0 ml-2">
                      <span className="font-bold text-[#0B1F3A]">
                        {cat.incident_count.toLocaleString()}
                      </span>
                      <span className="text-[#5D6878]">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Volume Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Ranked Crime Types Horizontal Bar List (Stable fixed height & internal scroll) */}
        <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col min-h-[390px] lg:h-[416px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#1769AA]" />
              <h3 className="text-[14px] font-bold text-[#0B1F3A]">
                Top Crime Types Ranking{selectedCategory ? ` (${selectedCategory})` : ''}
              </h3>
            </div>

            {/* Top 5, Top 8, Top 12, Top 21 controls */}
            <div className="flex items-center gap-1 rounded border border-[#D9E1EA] bg-[#F4F7FA] p-0.5 text-[11px] self-start sm:self-auto shrink-0">
              {[5, 8, 12, 21].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setDisplayCount(count);
                    setShowAllTypes(false);
                  }}
                  className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    !showAllTypes && displayCount === count
                      ? 'bg-white text-[#0B1F3A] shadow-2xs font-semibold'
                      : 'text-[#5D6878] hover:text-[#0B1F3A]'
                  }`}
                >
                  Top {count}
                </button>
              ))}
            </div>
          </div>

          {/* List of Ranked Bars with stable scrollable viewport */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {displayedTypes.length > 0 ? (
              displayedTypes.map((t, idx) => {
                const pctOfMax = (t.incident_count / maxTypeCount) * 100;
                const sevBadge = SEVERITY_BADGES[t.severity_level] || SEVERITY_BADGES.LOW;

                return (
                  <div key={t.crime_type_id} className="group">
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-mono text-[11px] font-bold text-[#5D6878] w-5 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-[#0B1F3A] truncate">
                          {t.crime_name}
                        </span>
                        <span className="font-mono text-[10px] text-[#7C8796] bg-[#F4F7FA] px-1.5 py-0.5 rounded border border-[#E2E8F0] shrink-0">
                          {t.crime_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}
                        >
                          {t.severity_level}
                        </span>
                        <span className="font-mono font-bold text-[#0B1F3A] text-[12px]">
                          {t.incident_count.toLocaleString()}
                        </span>
                        <span className="font-mono text-[11px] text-[#5D6878] w-12 text-right">
                          ({t.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Proportional Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1769AA] group-hover:bg-[#12345B] transition-colors"
                        style={{ width: `${Math.min(pctOfMax, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#7C8796]">
                No offenses recorded for this selection
              </div>
            )}
          </div>

          {/* View All toggle */}
          {sortedTypes.length > displayCount && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAllTypes((prev) => !prev)}
                className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors cursor-pointer"
              >
                {showAllTypes ? `Show Top ${displayCount} Only` : 'View All'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrimeClassificationSection;
