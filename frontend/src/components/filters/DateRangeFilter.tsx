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
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300">
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">From:</span>
        <input
          type="date"
          value={startDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          onChange={(e) => onChange(e.target.value || undefined, endDate)}
          className="bg-transparent text-white focus:outline-none [color-scheme:dark]"
        />
        <span className="text-slate-400">To:</span>
        <input
          type="date"
          value={endDate || ''}
          min="2020-01-01"
          max="2025-12-31"
          onChange={(e) => onChange(startDate, e.target.value || undefined)}
          className="bg-transparent text-white focus:outline-none [color-scheme:dark]"
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
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
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
