import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface YearOption {
  label: string;
  value: string;
  start: string;
  end: string;
}

const YEAR_OPTIONS: YearOption[] = [
  { label: 'All Years (2020–2025)', value: 'ALL', start: '2020-01-01', end: '2025-12-31' },
  { label: '2025', value: '2025', start: '2025-01-01', end: '2025-12-31' },
  { label: '2024', value: '2024', start: '2024-01-01', end: '2024-12-31' },
  { label: '2023', value: '2023', start: '2023-01-01', end: '2023-12-31' },
  { label: '2022', value: '2022', start: '2022-01-01', end: '2022-12-31' },
  { label: '2021', value: '2021', start: '2021-01-01', end: '2021-12-31' },
  { label: '2020', value: '2020', start: '2020-01-01', end: '2020-12-31' },
];

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate?: string, endDate?: string) => void;
  disabled?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  disabled = false,
}) => {
  const selectedValue = useMemo(() => {
    if (!startDate && !endDate) {
      return 'ALL';
    }
    const match = YEAR_OPTIONS.find(
      (opt) => opt.start === startDate && opt.end === endDate
    );
    return match ? match.value : 'CUSTOM';
  }, [startDate, endDate]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const match = YEAR_OPTIONS.find((opt) => opt.value === val);
    if (match) {
      onChange(match.start, match.end);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="year-select" className="text-sm font-bold text-slate-700 whitespace-nowrap">
          Year:
        </label>
        <div className="relative min-w-[200px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#64748B]">
            <Calendar className="h-4 w-4" />
          </div>
          <select
            id="year-select"
            aria-label="Year"
            value={selectedValue}
            onChange={handleYearChange}
            disabled={disabled}
            className="w-full min-h-[46px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-4 text-[15px] font-medium text-[#0F172A] shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-60 cursor-pointer"
          >
            {selectedValue === 'CUSTOM' && (
              <option value="CUSTOM" disabled hidden>
                Custom Range
              </option>
            )}
            {YEAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom Date Pickers */}
      <div className="flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm text-[#0F172A] shadow-2xs">
        <span className="text-[#64748B] font-semibold text-xs sm:text-sm">From:</span>
        <input
          type="date"
          aria-label="Start date"
          value={startDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined, endDate)}
          className="bg-transparent text-[15px] text-[#0F172A] focus:outline-none [color-scheme:light] font-medium disabled:opacity-60"
        />
        <span className="text-[#64748B] font-semibold text-xs sm:text-sm">To:</span>
        <input
          type="date"
          aria-label="End date"
          value={endDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          disabled={disabled}
          onChange={(e) => onChange(startDate, e.target.value || undefined)}
          className="bg-transparent text-[15px] text-[#0F172A] focus:outline-none [color-scheme:light] font-medium disabled:opacity-60"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
