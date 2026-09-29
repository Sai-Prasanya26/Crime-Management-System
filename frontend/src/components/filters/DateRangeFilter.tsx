import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate?: string, endDate?: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const presets = [
    { label: 'All (2020-25)', start: '', end: '' },
    { label: '2025', start: '2025-01-01', end: '2025-12-31' },
    { label: '2024', start: '2024-01-01', end: '2024-12-31' },
    { label: '2023', start: '2023-01-01', end: '2023-12-31' },
    { label: '2020-22', start: '2020-01-01', end: '2022-12-31' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] shadow-xs">
        <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
        <span className="text-[#64748B] font-medium">From:</span>
        <input
          type="date"
          value={startDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          onChange={(e) => onChange(e.target.value || undefined, endDate)}
          className="bg-transparent text-[#0F172A] focus:outline-none [color-scheme:light] font-medium"
        />
        <span className="text-[#64748B] font-medium">To:</span>
        <input
          type="date"
          value={endDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          onChange={(e) => onChange(startDate, e.target.value || undefined)}
          className="bg-transparent text-[#0F172A] focus:outline-none [color-scheme:light] font-medium"
        />
      </div>

      <div className="flex items-center gap-1">
        {presets.map((p) => {
          const isActive =
            (!startDate && !endDate && !p.start && !p.end) ||
            (startDate === p.start && endDate === p.end);
          return (
            <button
              key={p.label}
              onClick={() => onChange(p.start || undefined, p.end || undefined)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#4F46E5] text-white shadow-xs font-semibold'
                  : 'bg-[#F1F5F9] text-slate-600 hover:bg-slate-200 hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateRangeFilter;
