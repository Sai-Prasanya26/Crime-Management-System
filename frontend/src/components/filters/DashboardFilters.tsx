import React, { useEffect, useState } from 'react';
import { RotateCcw, Filter } from 'lucide-react';
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

  // Load States on mount (Current Administrative Geography master: 28 States + 8 UTs = 36 total)
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const data = await geographyApi.getStates('current');
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
        const data = await geographyApi.getDistricts(filters.state_id, 'current');
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
      geography_mode: 'current',
      state_id: val,
      district_id: undefined, // Reset district when state changes
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onFilterChange({
      ...filters,
      geography_mode: 'current',
      district_id: val,
    });
  };

  const handleDateChange = (startDate?: string, endDate?: string) => {
    onFilterChange({
      ...filters,
      geography_mode: 'current',
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleReset = () => {
    onFilterChange({
      geography_mode: 'current',
      state_id: undefined,
      district_id: undefined,
      start_date: undefined,
      end_date: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.state_id || filters.district_id || filters.start_date || filters.end_date
  );

  return (
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
      <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
          {/* Analysis Filters Badge */}
          <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
            <Filter className="h-3.5 w-3.5 text-[#1769AA]" />
            <span>Analysis Filters:</span>
          </div>

          {/* State / UT Selector */}
          <select
            id="state-select"
            aria-label="State or Union Territory"
            value={filters.state_id || ''}
            onChange={handleStateChange}
            disabled={loadingStates || isLoading}
            className="h-10 w-full sm:w-auto sm:min-w-[190px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-60 cursor-pointer"
          >
            <option value="">All States &amp; UTs ({states.length || 36})</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.state_name}
              </option>
            ))}
          </select>

          {/* District Selector */}
          <select
            id="district-select"
            aria-label="District"
            value={filters.district_id || ''}
            onChange={handleDistrictChange}
            disabled={!filters.state_id || loadingDistricts || isLoading}
            className="h-10 w-full sm:w-auto sm:min-w-[170px] rounded border border-[#D9E1EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:cursor-not-allowed disabled:bg-[#F4F7FA] disabled:text-[#7C8796] disabled:opacity-60 cursor-pointer"
          >
            <option value="">
              {!filters.state_id
                ? 'All Districts'
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

          {/* Date Range Filter */}
          <DateRangeFilter
            startDate={filters.start_date}
            endDate={filters.end_date}
            onChange={handleDateChange}
            disabled={isLoading}
          />
        </div>

        {/* Reset Filter Action */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
            title="Reset all active filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardFilters;
