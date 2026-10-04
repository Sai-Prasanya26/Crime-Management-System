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
  const [showAllTypes, setShowAllTypes] = useState(false);

  // Filter types by selected category if active
  const filteredTypes = types?.items
    ? selectedCategory
      ? types.items.filter((t) => t.category_name.toLowerCase() === selectedCategory.toLowerCase())
      : types.items
    : [];

  // Sort descending by incident count
  const sortedTypes = [...filteredTypes].sort((a, b) => b.incident_count - a.incident_count);
  const displayedTypes = showAllTypes ? sortedTypes : sortedTypes.slice(0, 8);

  const maxTypeCount = sortedTypes.length > 0 ? sortedTypes[0].incident_count : 1;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <Layers className="h-4 w-4" />
            </div>
            <h2 className="text-[17px] font-bold text-[#0B1F3A]">
              Crime Classification &amp; Offense Distribution
            </h2>
          </div>
          <p className="text-[12px] text-[#5D6878] mt-0.5">
            Statutory breakdown across 4 major classifications and 21 codified offense types
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA] self-start sm:self-auto">
          21 Codified Offenses
        </span>
      </div>

      {/* Main Grid: Left 5 cols (Categories) | Right 7 cols (Ranked Types) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 4 Category Distribution Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] font-bold text-[#0B1F3A]">
              Statutory Categories
            </h3>
            {selectedCategory && (
              <button
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
                  className={`rounded-lg border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#1769AA] bg-blue-50/50 shadow-xs ring-1 ring-[#1769AA]'
                      : 'border-[#D9E1EA] bg-white hover:border-[#BAC7D5] hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`rounded p-1 ${style.bg} ${style.text} border ${style.border}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[13px] font-bold text-[#0B1F3A]">
                        {cat.category_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-[#5D6878]">
                        {cat.severity_weight.toFixed(1)}x Severity
                      </span>
                      <span className={`text-[12px] font-bold font-mono ${style.text}`}>
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Volume Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full ${style.bar} transition-all duration-500`}
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#5D6878]">
                    <span>
                      {cat.incident_count.toLocaleString()} reported incidents
                    </span>
                    <span className="font-medium text-[#1769AA]">
                      {isSelected ? 'Filtering Offenses ▾' : 'Click to filter offenses'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Ranked Crime Types Horizontal Bar List */}
        <div className="lg:col-span-7 rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0B1F3A] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#1769AA]" />
                  <span>
                    Top Crime Types Ranking {selectedCategory ? `(${selectedCategory})` : ''}
                  </span>
                </h3>
                <p className="text-[11px] text-[#5D6878] mt-0.5">
                  Ranked by reported incident frequency and legal severity tier
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#1769AA] bg-[#EAF3FA] px-2.5 py-0.5 rounded border border-[#BAC7D5]/40 self-start sm:self-auto">
                Showing {displayedTypes.length} of {sortedTypes.length} Types
              </span>
            </div>

            {/* List of Ranked Bars */}
            <div className="space-y-2.5">
              {displayedTypes.map((t, idx) => {
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
                        className="h-full rounded-full bg-[#1769AA] group-hover:bg-[#12345B] transition-all duration-300"
                        style={{ width: `${Math.min(pctOfMax, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle All 21 Types button */}
          {sortedTypes.length > 8 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-[#5D6878]">
                {showAllTypes ? 'Viewing complete statutory inventory' : `Showing top 8 of ${sortedTypes.length} crime types`}
              </span>
              <button
                type="button"
                onClick={() => setShowAllTypes((prev) => !prev)}
                className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] transition-colors cursor-pointer"
              >
                {showAllTypes ? 'Show Top 8 Only' : `View All ${sortedTypes.length} Types →`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrimeClassificationSection;
