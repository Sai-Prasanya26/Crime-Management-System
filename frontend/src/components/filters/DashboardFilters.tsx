import React, { useEffect, useState } from 'react';
import { MapPin, Building, RotateCcw, Filter, Globe } from 'lucide-react';
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
  const [geoView, setGeoView] = useState<'current' | 'historical'>('current');
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Load States whenever geoView changes
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const data = await geographyApi.getStates(geoView);
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
  }, [geoView]);

  // Load districts when selected state changes or geoView changes
  useEffect(() => {
    let isMounted = true;
    const loadDistricts = async () => {
      if (!filters.state_id) {
        setDistricts([]);
        return;
      }
      setLoadingDistricts(true);
      try {
        const data = await geographyApi.getDistricts(filters.state_id, geoView);
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
  }, [filters.state_id, geoView]);

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

  const toggleGeoView = () => {
    const nextView = geoView === 'current' ? 'historical' : 'current';
    setGeoView(nextView);
    onFilterChange({
      ...filters,
      state_id: undefined,
      district_id: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.state_id || filters.district_id || filters.start_date || filters.end_date
  );

  return (
    <div className="rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Left: Geography Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <div className="flex h-10 items-center justify-center sm:justify-start gap-1.5 rounded bg-[#F4F7FA] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0B1F3A] border border-[#D9E1EA] shrink-0">
            <Filter className="h-3.5 w-3.5 text-[#1769AA]" />
            <span>Analysis Filters</span>
          </div>

          {/* Geography Layer Switcher */}
          <button
            onClick={toggleGeoView}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#D9E1EA] bg-[#F4F7FA] px-2.5 text-[13px] font-medium text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Toggle between Current Administrative and Census 2011 Historical Geography"
          >
            <Globe className="h-3.5 w-3.5 text-[#7C8796]" />
            <span>{geoView === 'current' ? 'Current Admin (36 Entities)' : 'Historical (Census 2011)'}</span>
          </button>

          {/* State Selector */}
          <div className="relative w-full sm:w-auto sm:min-w-[190px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7C8796]">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <select
              value={filters.state_id || ''}
              onChange={handleStateChange}
              disabled={loadingStates || isLoading}
              className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 pl-8 pr-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-60 cursor-pointer"
            >
              <option value="">
                {geoView === 'current'
                  ? `All States & UTs (${states.length || 36})`
                  : `All Census 2011 States (${states.length || 35})`}
              </option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state_name} {s.entity_type ? `(${s.entity_type})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector (active only when State is selected) */}
          <div className="relative w-full sm:w-auto sm:min-w-[190px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7C8796]">
              <Building className="h-3.5 w-3.5" />
            </div>
            <select
              value={filters.district_id || ''}
              onChange={handleDistrictChange}
              disabled={!filters.state_id || loadingDistricts || isLoading}
              className="h-10 w-full rounded border border-[#D9E1EA] bg-white py-1.5 pl-8 pr-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 cursor-pointer"
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

        {/* Right: Date Range Picker & Reset */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <DateRangeFilter
            startDate={filters.start_date}
            endDate={filters.end_date}
            onChange={handleDateChange}
            disabled={isLoading}
          />

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded border border-[#C53B3B]/30 bg-red-50/80 px-3 text-[12px] font-semibold text-[#C53B3B] hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              title="Reset all active filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
