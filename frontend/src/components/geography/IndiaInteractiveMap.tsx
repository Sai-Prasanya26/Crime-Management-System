import React, { useState, useMemo, useRef } from 'react';
import {
  INDIA_STATES_MAP_DATA,
  INDIA_MAP_VIEWBOX,
  STATE_BBOX_MAP,
  type StateMapFeature,
} from '../../data/indiaMapData';
import {
  getDistrictCoordinate,
} from '../../data/districtCoordinates';
import type {
  StateCrimeSummaryItem,
  DistrictItem,
} from '../../types';

interface IndiaInteractiveMapProps {
  stateData: StateCrimeSummaryItem[];
  selectedStateId?: number;
  onSelectState: (stateId?: number) => void;
  selectedDistrictId?: number;
  onSelectDistrict?: (districtId?: number) => void;
  stateDistricts?: DistrictItem[];
  districtStatsMap?: Record<
    number,
    {
      incident_count: number;
      total_population?: number | null;
      crime_rate_per_100k?: number | null;
      is_census_2011?: boolean;
    }
  >;
  districtRiskMap?: Record<
    number,
    {
      risk_level: string;
      overall_risk_score?: number;
    }
  >;
  isLoading?: boolean;
}

export const IndiaInteractiveMap: React.FC<IndiaInteractiveMapProps> = ({
  stateData,
  selectedStateId,
  onSelectState,
  selectedDistrictId,
  onSelectDistrict,
  stateDistricts = [],
  districtStatsMap = {},
  districtRiskMap = {},
  isLoading = false,
}) => {
  const [hoveredState, setHoveredState] = useState<StateMapFeature | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Index stateData by state_id
  const stateSummaryMap = useMemo(() => {
    const map = new Map<number, StateCrimeSummaryItem>();
    stateData.forEach((s) => map.set(s.state_id, s));
    return map;
  }, [stateData]);

  // Compute reported crime count scale for state choropleth
  const { stateQ1, stateQ2, stateQ3 } = useMemo(() => {
    const values = stateData
      .map((s) => s.incident_count)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { stateQ1: 1000, stateQ2: 5000, stateQ3: 15000 };
    }
    const minVal = values[0];
    const maxVal = values[values.length - 1];
    const q1 = values[Math.floor(values.length * 0.25)] || minVal;
    const q2 = values[Math.floor(values.length * 0.5)] || (minVal + maxVal) / 2;
    const q3 = values[Math.floor(values.length * 0.75)] || maxVal;
    return { stateQ1: q1, stateQ2: q2, stateQ3: q3 };
  }, [stateData]);

  // Compute metric scale for district dots within selected state (fallback when risk score uncalculated)
  const { distQ1, distQ2, distQ3 } = useMemo(() => {
    const values = stateDistricts
      .map((d) => {
        const stats = districtStatsMap[d.id];
        return stats?.incident_count || 0;
      })
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { distQ1: 100, distQ2: 300, distQ3: 800 };
    }
    const minVal = values[0];
    const maxVal = values[values.length - 1];
    const q1 = values[Math.floor(values.length * 0.25)] || minVal;
    const q2 = values[Math.floor(values.length * 0.5)] || (minVal + maxVal) / 2;
    const q3 = values[Math.floor(values.length * 0.75)] || maxVal;
    return { distQ1: q1, distQ2: q2, distQ3: q3 };
  }, [stateDistricts, districtStatsMap]);

  // Color functions
  const getStateColor = (stateId: number): string => {
    const summary = stateSummaryMap.get(stateId);
    if (!summary) return '#1E293B';

    const val = summary.incident_count;
    if (val === 0) return '#1E293B';

    if (val >= stateQ3) return '#C53B3B'; // Critical Hotspot - Crimson
    if (val >= stateQ2) return '#F59E0B'; // High - Amber
    if (val >= stateQ1) return '#3B82F6'; // Moderate - Tactical Blue
    return '#38BDF8'; // Low - Sky Blue
  };

  const getDistrictDotColor = (districtId: number): string => {
    // 1. Prioritize actual risk classification
    const risk = districtRiskMap[districtId];
    if (risk && risk.risk_level) {
      switch (risk.risk_level.toUpperCase()) {
        case 'CRITICAL':
          return '#EF4444'; // Red
        case 'HIGH':
          return '#F59E0B'; // Orange
        case 'MODERATE':
          return '#3B82F6'; // Blue
        case 'LOW':
          return '#10B981'; // Green
      }
    }

    // 2. Fallback to stats quartile if risk assessment not yet calculated
    const stats = districtStatsMap[districtId];
    if (!stats || stats.incident_count === 0) return '#10B981';

    const val = stats.incident_count;
    if (val >= distQ3) return '#EF4444';
    if (val >= distQ2) return '#F59E0B';
    if (val >= distQ1) return '#3B82F6';
    return '#10B981';
  };

  const getDistrictRiskCategory = (districtId: number): { label: string; color: string } => {
    const risk = districtRiskMap[districtId];
    if (risk && risk.risk_level) {
      switch (risk.risk_level.toUpperCase()) {
        case 'CRITICAL':
          return { label: 'Critical Risk', color: 'text-red-400 bg-red-950/80 border-red-700' };
        case 'HIGH':
          return { label: 'High Risk', color: 'text-amber-400 bg-amber-950/80 border-amber-700' };
        case 'MODERATE':
          return { label: 'Moderate Risk', color: 'text-blue-400 bg-blue-950/80 border-blue-700' };
        case 'LOW':
          return { label: 'Low Risk', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700' };
      }
    }

    const stats = districtStatsMap[districtId];
    if (!stats || stats.incident_count === 0) {
      return { label: 'Low Risk', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700' };
    }
    const val = stats.incident_count;
    if (val >= distQ3) {
      return { label: 'Critical Hotspot', color: 'text-red-400 bg-red-950/80 border-red-700' };
    }
    if (val >= distQ2) {
      return { label: 'High Risk', color: 'text-amber-400 bg-amber-950/80 border-amber-700' };
    }
    if (val >= distQ1) {
      return { label: 'Moderate Risk', color: 'text-blue-400 bg-blue-950/80 border-blue-700' };
    }
    return { label: 'Low Risk', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700' };
  };

  // Tooltip tracking
  const updateTooltipPosition = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: Math.max(60, Math.min(rect.width - 60, e.clientX - rect.left)),
        y: Math.max(30, e.clientY - rect.top),
      });
    }
  };

  const handleStateMouseMove = (e: React.MouseEvent, feature: StateMapFeature) => {
    updateTooltipPosition(e);
    setHoveredState(feature);
    setHoveredDistrict(null);
  };

  const handleDistrictMouseMove = (e: React.MouseEvent, district: DistrictItem) => {
    e.stopPropagation();
    updateTooltipPosition(e);
    setHoveredDistrict(district);
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
    setHoveredDistrict(null);
    setTooltipPos(null);
  };

  // Dynamic viewBox: when state selected, tightly frames state with 8% padding; otherwise full India map
  const currentViewBox = useMemo(() => {
    if (!selectedStateId) {
      return INDIA_MAP_VIEWBOX;
    }
    const bbox = STATE_BBOX_MAP[selectedStateId];
    if (!bbox) return INDIA_MAP_VIEWBOX;
    const padX = Math.max(14, bbox.width * 0.08);
    const padY = Math.max(14, bbox.height * 0.08);
    const vWidth = bbox.width + padX * 2;
    const vHeight = bbox.height + padY * 2;
    const minX = bbox.minX - padX;
    const minY = bbox.minY - padY;
    return `${minX.toFixed(1)} ${minY.toFixed(1)} ${vWidth.toFixed(1)} ${vHeight.toFixed(1)}`;
  }, [selectedStateId]);

  // Scaled dot radius based on viewBox span
  const dotRadius = useMemo(() => {
    if (!selectedStateId) return 3.5;
    const bbox = STATE_BBOX_MAP[selectedStateId];
    if (!bbox) return 3.5;
    const span = Math.max(bbox.width, bbox.height);
    return Math.max(2.8, Math.min(5.6, span * 0.022));
  }, [selectedStateId]);

  const hoveredSummary = hoveredState ? stateSummaryMap.get(hoveredState.state_id) : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center select-none"
    >
      {/* Static Non-Animated Updating Indicator */}
      {isLoading && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-300 text-xs shadow-xs">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Updating...</span>
        </div>
      )}

      {/* SVG Interactive Map - Completely static without drop-shadow filters or transition morphs */}
      <svg
        viewBox={currentViewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full p-2"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 1. State Boundaries */}
        {INDIA_STATES_MAP_DATA.map((feature) => {
          const isSelected = selectedStateId === feature.state_id;
          const isHovered = hoveredState?.state_id === feature.state_id;
          const fillColor = getStateColor(feature.state_id);

          return (
            <path
              key={feature.code}
              id={`state-${feature.code}`}
              d={feature.d}
              fill={fillColor}
              stroke={isSelected ? '#F59E0B' : isHovered ? '#FFFFFF' : '#0B1F3A'}
              strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '0.6'}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="cursor-pointer transition-colors duration-150"
              style={{
                opacity: selectedStateId ? (isSelected ? 1 : 0.12) : 0.9,
              }}
              onMouseMove={(e) => handleStateMouseMove(e, feature)}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                if (selectedStateId === feature.state_id) {
                  onSelectState(undefined);
                  onSelectDistrict?.(undefined);
                } else {
                  onSelectState(feature.state_id);
                  onSelectDistrict?.(undefined);
                }
              }}
            >
              <title>{feature.name}</title>
            </path>
          );
        })}

        {/* 2. District Markers (when state selected) */}
        {selectedStateId && (
          <g id="district-dots-layer">
            {stateDistricts.map((d) => {
              const coord = getDistrictCoordinate(d.id);
              if (!coord || !coord.verified || coord.svg_x == null || coord.svg_y == null) {
                return null;
              }
              const isSelected = selectedDistrictId === d.id;
              const isHovered = hoveredDistrict?.id === d.id;
              const dotColor = getDistrictDotColor(d.id);

              return (
                <g
                  key={`dot-${d.id}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDistrict?.(isSelected ? undefined : d.id);
                  }}
                  onMouseEnter={(e) => handleDistrictMouseMove(e, d)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Clean Static Highlight Ring when Selected (No revolving or ping animations) */}
                  {isSelected && (
                    <circle
                      cx={coord.svg_x}
                      cy={coord.svg_y}
                      r={dotRadius * 1.8}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={Math.max(1.2, dotRadius * 0.35)}
                    />
                  )}

                  {/* Hover Highlight Ring */}
                  {isHovered && !isSelected && (
                    <circle
                      cx={coord.svg_x}
                      cy={coord.svg_y}
                      r={dotRadius * 1.6}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={Math.max(0.8, dotRadius * 0.25)}
                      opacity={0.85}
                    />
                  )}

                  {/* Main District Dot */}
                  <circle
                    cx={coord.svg_x}
                    cy={coord.svg_y}
                    r={dotRadius}
                    fill={dotColor}
                    stroke={isSelected ? '#F59E0B' : '#0B1F3A'}
                    strokeWidth={Math.max(0.6, dotRadius * 0.28)}
                  />

                  {/* Inner Core Reflection */}
                  <circle
                    cx={coord.svg_x}
                    cy={coord.svg_y}
                    r={dotRadius * 0.36}
                    fill="#FFFFFF"
                    opacity={0.9}
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* 3. Small Non-Obstructive Hover Tooltip */}
      {tooltipPos && (hoveredDistrict || hoveredState) && (
        <div
          className="pointer-events-none absolute z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 text-white px-2.5 py-1 rounded-md shadow-xl border border-slate-700 text-xs whitespace-nowrap flex items-center gap-1.5 animate-in fade-in duration-75"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 8}px`,
          }}
        >
          {hoveredDistrict ? (
            <>
              <span className="font-semibold text-white">
                {hoveredDistrict.district_name}
              </span>
              <span className="text-slate-500 text-[10px]">&bull;</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                  getDistrictRiskCategory(hoveredDistrict.id).color
                }`}
              >
                {getDistrictRiskCategory(hoveredDistrict.id).label}
              </span>
            </>
          ) : hoveredState ? (
            <>
              <span className="font-semibold text-white">
                {hoveredState.name}
              </span>
              <span className="text-slate-500 text-[10px]">&bull;</span>
              <span className="text-[10px] font-mono text-cyan-300">
                {hoveredSummary
                  ? `${hoveredSummary.incident_count.toLocaleString()} reported crimes`
                  : '0 reported crimes'}
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default IndiaInteractiveMap;
