import React from 'react';
import { Database, FilterX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  onClearFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No incidents recorded',
  message = 'No crime records match the currently selected state, district, or date criteria.',
  onClearFilters,
}) => {
  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
      <div className="rounded-full bg-[#F1F5F9] p-3 text-[#64748B]">
        <Database className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-[#0F172A]">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-[#64748B]">{message}</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <FilterX className="h-3.5 w-3.5" />
          Reset All Filters
        </button>
      )}
    </div>
  );
};

export default EmptyState;
