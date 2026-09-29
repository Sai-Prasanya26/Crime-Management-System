import React, { useEffect, useState } from 'react';
import { MapPin, Building, RotateCcw, Filter } from 'lucide-react';
import { geographyApi } from '../../api';
import type { StateItem, DistrictItem, FilterParams } from '../../types';
import DateRangeFilter from './DateRangeFilter';

interface DashboardFiltersProps {
  filters: FilterParams;
  onFilterChange: (newFilters: FilterParams) => void;
  isLoading?: boolean;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onFilterChange,
  isLoading,
}) => {
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Load all 35 States on mount
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const data = await geographyApi.getStates();
        if (isMounted) {
          setStates(data.items);
        }
      } catch (err) {
        console.error('Failed to load states for filter:', err);
      } finally {
        if (isMounted) setLoadingStates(false);
      }
    };
    loadStates();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load districts when selected state changes
  useEffect(() => {
    let isMounted = true;
    const loadDistricts = async () => {
      if (!filters.state_id) {
        setDistricts([]);
        return;
      }
      setLoadingDistricts(true);
      try {
        const data = await geographyApi.getDistricts(filters.state_id);
        if (isMounted) {
          setDistricts(data.items);
        }
      } catch (err) {
        console.error('Failed to load districts for state:', err);
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    };
    loadDistricts();
    return () => {
      isMounted = false;
    };
  }, [filters.state_id]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onFilterChange({
      ...filters,
      state_id: val,
      district_id: undefined, // Reset district when state changes
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onFilterChange({
      ...filters,
      district_id: val,
    });
  };

  const handleDateChange = (startDate?: string, endDate?: string) => {
    onFilterChange({
      ...filters,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Boolean(
    filters.state_id || filters.district_id || filters.start_date || filters.end_date
  );

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            <Filter className="h-4 w-4 text-[#4F46E5]" />
            <span>Filters</span>
          </div>

          {/* State Selector */}
          <div className="relative min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#64748B]">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <select
              value={filters.state_id || ''}
              onChange={handleStateChange}
              disabled={loadingStates || isLoading}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white py-1.5 pl-8 pr-4 text-xs font-medium text-[#0F172A] shadow-xs focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-60"
            >
              <option value="">All States & UTs (35)</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector (active only when State is selected) */}
          <div className="relative min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#64748B]">
              <Building className="h-3.5 w-3.5" />
            </div>
            <select
              value={filters.district_id || ''}
              onChange={handleDistrictChange}
              disabled={!filters.state_id || loadingDistricts || isLoading}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white py-1.5 pl-8 pr-4 text-xs font-medium text-[#0F172A] shadow-xs focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
            >
              <option value="">
                {!filters.state_id
                  ? 'Select state first'
                  : loadingDistricts
                  ? 'Loading districts...'
                  : `All Districts (${districts.length})`}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Picker & Reset */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter
            startDate={filters.start_date}
            endDate={filters.end_date}
            onChange={handleDateChange}
          />

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-600 shadow-xs transition-colors"
              title="Reset all active filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
