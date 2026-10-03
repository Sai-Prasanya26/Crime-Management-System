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
  { label: '2020', value: '2020', start: '2020-01-01', end: '2020-01-31' },
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
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
      {/* Year Dropdown */}
      <div className="relative w-full sm:w-auto sm:min-w-[150px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7C8796]">
          <Calendar className="h-3.5 w-3.5" />
        </div>
        <select
          id="year-select"
          aria-label="Year"
          value={selectedValue}
          onChange={handleYearChange}
          disabled={disabled}
          className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 pl-8 pr-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-60 cursor-pointer"
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

      {/* Custom Date Pickers */}
      <div className="flex h-10 items-center justify-between sm:justify-start gap-1.5 rounded border border-[#D9E1EA] bg-white px-2.5 py-1 text-[13px] text-[#172033] shadow-2xs w-full sm:w-auto overflow-hidden">
        <span className="text-[#5D6878] text-[11px] font-medium uppercase shrink-0">From:</span>
        <input
          type="date"
          aria-label="Start date"
          value={startDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined, endDate)}
          className="bg-transparent text-[12px] sm:text-[13px] text-[#172033] focus:outline-none [color-scheme:light] font-medium disabled:opacity-60 min-w-0"
        />
        <span className="text-[#5D6878] text-[11px] font-medium uppercase shrink-0">To:</span>
        <input
          type="date"
          aria-label="End date"
          value={endDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          disabled={disabled}
          onChange={(e) => onChange(startDate, e.target.value || undefined)}
          className="bg-transparent text-[12px] sm:text-[13px] text-[#172033] focus:outline-none [color-scheme:light] font-medium disabled:opacity-60 min-w-0"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
