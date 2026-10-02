import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  MapPinned,
  MapPin,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  CarFront,
  IndianRupee,
  FileText,
  LockKeyhole,
  Shield,
  Layers,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { geographyApi } from '../../api/geographyApi';
import type { StateItem, DistrictItem } from '../../types';

export type SearchCategory =
  | 'INTELLIGENCE'
  | 'GEOGRAPHY'
  | 'DISTRICTS'
  | 'ANALYTICS'
  | 'OPERATIONS'
  | 'ACCESS';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  badge?: string;
  authRequired?: boolean;
  adminOnly?: boolean;
}

const CATEGORY_ORDER: SearchCategory[] = [
  'INTELLIGENCE',
  'GEOGRAPHY',
  'DISTRICTS',
  'ANALYTICS',
  'OPERATIONS',
  'ACCESS',
];

interface GlobalIntelligenceSearchProps {
  className?: string;
  onNavigateCallback?: () => void;
  variant?: 'auto' | 'desktop-only' | 'mobile-only';
}

export const GlobalIntelligenceSearch: React.FC<GlobalIntelligenceSearchProps> = ({
  className = '',
  onNavigateCallback,
  variant = 'auto',
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const showDesktop = variant === 'auto' || variant === 'desktop-only';
  const showMobile = variant === 'auto' || variant === 'mobile-only';

  // Geographic caches
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);

  const isAdmin = Boolean(isAuthenticated && user && user.role === 'ADMIN');

  // Load Geographic Index on mount
  useEffect(() => {
    let isMounted = true;
    const loadGeography = async () => {
      try {
        const [statesRes, districtsRes] = await Promise.all([
          geographyApi.getStates('current'),
          geographyApi.getDistricts(undefined, 'current'),
        ]);
        if (isMounted) {
          setStates(statesRes.items || []);
          setDistricts(districtsRes.items || []);
        }
      } catch (err) {
        console.warn('[GlobalSearch] Geography index pre-load notice:', err);
      }
    };
    loadGeography();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global Ctrl+K / Cmd+K Hotkey Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        if (window.innerWidth < 768) {
          setMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Static Application Capabilities Index
  const staticModules: SearchResultItem[] = useMemo(
    () => [
      {
        id: 'mod-overview',
        category: 'INTELLIGENCE',
        title: 'Crime Intelligence',
        description: 'Multi-dimensional crime management, intelligence analysis and operational tracking',
        icon: ShieldCheck,
        route: '/dashboard',
        badge: 'Intelligence',
        authRequired: true,
      },
      {
        id: 'mod-analytics',
        category: 'INTELLIGENCE',
        title: 'Crime Analytics',
        description: 'Multi-dimensional incident breakdown, trends and demographic analysis',
        icon: BarChart3,
        route: '/dashboard',
        badge: 'Core Module',
        authRequired: true,
      },
      {
        id: 'mod-districts',
        category: 'GEOGRAPHY',
        title: 'Geographic Intelligence',
        description: 'Jurisdictional analysis across 36 states/UTs and 789 current districts',
        icon: MapPinned,
        route: '/districts',
        badge: 'Jurisdictions',
        authRequired: true,
      },
      {
        id: 'mod-trends',
        category: 'INTELLIGENCE',
        title: 'Crime Trends & Forecasting',
        description: 'Historical temporal patterns, seasonality and multi-year forecasting',
        icon: TrendingUp,
        route: '/trends',
        badge: 'Temporal',
        authRequired: true,
      },
      {
        id: 'mod-risk',
        category: 'INTELLIGENCE',
        title: 'Crime Risk Assessment',
        description: 'Jurisdiction-level vulnerability scoring, crime severity and rate indexes',
        icon: ShieldAlert,
        route: '/risk',
        badge: 'Risk Engine',
        authRequired: true,
      },
      {
        id: 'mod-predictions',
        category: 'INTELLIGENCE',
        title: 'Predictive Intelligence',
        description: 'Predictive crime modeling and trend forecasts across jurisdictions',
        icon: TrendingUp,
        route: '/predictions',
        badge: 'Forecasting',
        authRequired: true,
      },
      {
        id: 'mod-resources',
        category: 'OPERATIONS',
        title: 'Resource Optimization',
        description: 'Patrol units, police personnel allocation and operational shortfalls',
        icon: CarFront,
        route: '/resources',
        badge: 'Operations',
        authRequired: true,
      },
      {
        id: 'mod-budget',
        category: 'OPERATIONS',
        title: 'Budget Intelligence',
        description: 'Resource cost modeling, equipment expenditures and fiscal planning',
        icon: IndianRupee,
        route: '/budget',
        badge: 'Fiscal',
        authRequired: true,
      },
      {
        id: 'mod-reports',
        category: 'OPERATIONS',
        title: 'Budget & Intelligence Reports',
        description: 'Structured executive intelligence briefings and operational reports',
        icon: FileText,
        route: '/reports',
        badge: 'Reports',
        authRequired: true,
      },
      // Analytical Dimensions
      {
        id: 'dim-types',
        category: 'ANALYTICS',
        title: 'Crime Types Analysis',
        description: 'Detailed analysis of 21 standardized crime offense types',
        icon: FileText,
        route: '/dashboard?dimension=types',
        badge: 'Offenses',
        authRequired: true,
      },
      {
        id: 'dim-weapons',
        category: 'ANALYTICS',
        title: 'Weapon Distribution Analysis',
        description: 'Firearms, sharp instruments, explosives and weapon involvement metrics',
        icon: ShieldAlert,
        route: '/dashboard?dimension=weapons',
        badge: 'Weapons',
        authRequired: true,
      },
      {
        id: 'dim-demographics',
        category: 'ANALYTICS',
        title: 'Victim & Offender Demographics',
        description: 'Age profiles, gender distribution and vulnerable group analysis',
        icon: Users,
        route: '/dashboard?dimension=demographics',
        badge: 'Demographics',
        authRequired: true,
      },
      {
        id: 'dim-hourly',
        category: 'ANALYTICS',
        title: 'Hourly Crime Distribution',
        description: '24-hour diurnal patterns, peak operational crime hours and shifts',
        icon: Clock,
        route: '/dashboard?dimension=hourly',
        badge: 'Diurnal',
        authRequired: true,
      },
      {
        id: 'dim-categories',
        category: 'ANALYTICS',
        title: 'Crime Categories Breakdown',
        description: 'Violent Crime, Traffic Fatalities, Fire Accidents and Other Offenses',
        icon: Layers,
        route: '/dashboard?dimension=categories',
        badge: 'Categories',
        authRequired: true,
      },
      // Access & Administration
      {
        id: 'acc-login',
        category: 'ACCESS',
        title: 'Staff Portal Sign In',
        description: 'Secure authentication, role-based session and credentials management',
        icon: LockKeyhole,
        route: '/login',
        badge: 'Authentication',
        authRequired: false,
      },
      {
        id: 'acc-admin',
        category: 'ACCESS',
        title: 'System Administration & Staff Management',
        description: 'User access control, audit logs, staff provisioning and platform configuration',
        icon: Shield,
        route: '/admin',
        badge: 'Admin Only',
        authRequired: true,
        adminOnly: true,
      },
    ],
    []
  );

  // Compute Search Results with Intent Analysis
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) {
      // Suggest high-priority operational capabilities when search input is empty
      const defaultSuggestions: SearchResultItem[] = [
        staticModules.find((m) => m.id === 'mod-overview')!,
        staticModules.find((m) => m.id === 'mod-analytics')!,
        staticModules.find((m) => m.id === 'mod-districts')!,
        staticModules.find((m) => m.id === 'mod-trends')!,
        staticModules.find((m) => m.id === 'mod-risk')!,
        staticModules.find((m) => m.id === 'mod-resources')!,
        staticModules.find((m) => m.id === 'mod-reports')!,
      ].filter(Boolean);
      return defaultSuggestions;
    }

    const results: SearchResultItem[] = [];

    // 1. Natural Language Intent Parsing
    const yearMatch = raw.match(/\b(20\d\d)\b/);
    const extractedYear = yearMatch ? yearMatch[1] : null;

    // Detect state matches (exact or substring)
    const matchedState = states.find((s) => {
      const name = s.state_name.toLowerCase();
      return raw.includes(name) || name.includes(raw);
    });

    // Detect district matches
    const matchedDistricts = districts.filter((d) => {
      const name = d.district_name.toLowerCase();
      return raw.includes(name) || name.includes(raw);
    });

    const isTrendsIntent =
      raw.includes('trend') || raw.includes('temporal') || raw.includes('timeline');
    const isWeaponsIntent =
      raw.includes('weapon') || raw.includes('firearm') || raw.includes('knife') || raw.includes('arms');
    const isCrimeTypeIntent =
      raw.includes('type') || raw.includes('offense') || raw.includes('homicide') || raw.includes('robbery');
    const isDemographicsIntent =
      raw.includes('demograph') || raw.includes('victim') || raw.includes('gender') || raw.includes('age');
    const isHourlyIntent =
      raw.includes('hour') || raw.includes('diurnal') || raw.includes('night') || raw.includes('shift');
    const isDistrictIntent =
      raw.includes('district') || raw.includes('jurisdiction');
    const isRiskIntent =
      raw.includes('risk') || raw.includes('vulnerab') || raw.includes('threat') || raw.includes('severity');
    const isResourceIntent =
      raw.includes('resource') || raw.includes('patrol') || raw.includes('vehicle') || raw.includes('fleet') || raw.includes('shortfall');
    const isBudgetIntent =
      raw.includes('budget') || raw.includes('cost') || raw.includes('expenditure') || raw.includes('financial');
    const isReportIntent =
      raw.includes('report') || raw.includes('briefing') || raw.includes('export') || raw.includes('summary');
    const isStaffIntent =
      raw.includes('staff') || raw.includes('login') || raw.includes('portal') || raw.includes('auth');
    const isAdminIntent =
      raw.includes('admin') || raw.includes('user management') || raw.includes('audit');

    // 2. State-Specific Matching Results
    if (matchedState) {
      const stateName = matchedState.state_name;
      const stateId = matchedState.id;

      // GEOGRAPHY: State Overview
      results.push({
        id: `geo-state-${stateId}`,
        category: 'GEOGRAPHY',
        title: stateName,
        description: `View ${stateName} geographic intelligence and jurisdiction profile`,
        icon: MapPinned,
        route: `/districts?state=${encodeURIComponent(stateName)}&state_id=${stateId}`,
        badge: matchedState.entity_type,
        authRequired: true,
      });

      // DISTRICTS: State Districts Listing
      results.push({
        id: `dist-state-${stateId}`,
        category: 'DISTRICTS',
        title: `${stateName} Districts`,
        description: `View all monitored districts in ${stateName}`,
        icon: MapPin,
        route: `/districts?state=${encodeURIComponent(stateName)}&state_id=${stateId}`,
        badge: 'Jurisdiction',
        authRequired: true,
      });

      // ANALYTICS: State Crime Analytics
      results.push({
        id: `ana-state-${stateId}`,
        category: 'ANALYTICS',
        title: `${stateName} Crime Analytics`,
        description: `View crime incident analysis and pattern breakdown for ${stateName}`,
        icon: BarChart3,
        route: `/dashboard?state=${encodeURIComponent(stateName)}&state_id=${stateId}`,
        badge: 'Analytics',
        authRequired: true,
      });

      // Specialized Intent Sub-cards
      if (isTrendsIntent || extractedYear) {
        results.push({
          id: `trend-state-${stateId}`,
          category: 'INTELLIGENCE',
          title: `${stateName} Crime Trends ${extractedYear || ''}`.trim(),
          description: `Analyze monthly & yearly crime trends in ${stateName}${extractedYear ? ` for year ${extractedYear}` : ''}`,
          icon: TrendingUp,
          route: `/trends?state=${encodeURIComponent(stateName)}&state_id=${stateId}${extractedYear ? `&year=${extractedYear}` : ''}`,
          badge: 'Trends',
          authRequired: true,
        });
      }

      if (isWeaponsIntent) {
        results.push({
          id: `weap-state-${stateId}`,
          category: 'ANALYTICS',
          title: `Weapons in ${stateName}`,
          description: `Weapon involvement and distribution patterns in ${stateName}`,
          icon: ShieldAlert,
          route: `/dashboard?state=${encodeURIComponent(stateName)}&state_id=${stateId}&dimension=weapons`,
          badge: 'Weapons',
          authRequired: true,
        });
      }

      if (isCrimeTypeIntent) {
        results.push({
          id: `type-state-${stateId}`,
          category: 'ANALYTICS',
          title: `Crime Types in ${stateName}`,
          description: `Specific offense type distribution for ${stateName}`,
          icon: FileText,
          route: `/dashboard?state=${encodeURIComponent(stateName)}&state_id=${stateId}&dimension=types`,
          badge: 'Offenses',
          authRequired: true,
        });
      }
    }

    // 3. District-Specific Matching Results
    if (matchedDistricts.length > 0) {
      matchedDistricts.slice(0, 3).forEach((d) => {
        results.push({
          id: `dist-item-${d.id}`,
          category: 'DISTRICTS',
          title: `${d.district_name} District`,
          description: `View district intelligence for ${d.district_name} (${d.state_name})`,
          icon: MapPin,
          route: `/districts?state=${encodeURIComponent(d.state_name)}&state_id=${d.state_id}&district=${encodeURIComponent(d.district_name)}&district_id=${d.id}`,
          badge: d.state_name,
          authRequired: true,
        });

        results.push({
          id: `ana-dist-${d.id}`,
          category: 'ANALYTICS',
          title: `${d.district_name} Crime Analytics`,
          description: `Local crime records and pattern analytics for ${d.district_name}`,
          icon: BarChart3,
          route: `/dashboard?state=${encodeURIComponent(d.state_name)}&state_id=${d.state_id}&district=${encodeURIComponent(d.district_name)}&district_id=${d.id}`,
          badge: 'District Analytics',
          authRequired: true,
        });
      });
    }

    // 4. Year-Specific Trends & Analytics Matching
    if (extractedYear) {
      results.push({
        id: `year-trend-${extractedYear}`,
        category: 'INTELLIGENCE',
        title: `${extractedYear} Crime Trends`,
        description: `Analyze historical and forecasted crime trends for year ${extractedYear}`,
        icon: TrendingUp,
        route: `/trends?year=${extractedYear}`,
        badge: extractedYear,
        authRequired: true,
      });

      results.push({
        id: `year-ana-${extractedYear}`,
        category: 'ANALYTICS',
        title: `${extractedYear} Crime Analytics`,
        description: `Explore incident distributions and crime metrics for year ${extractedYear}`,
        icon: BarChart3,
        route: `/dashboard?year=${extractedYear}`,
        badge: extractedYear,
        authRequired: true,
      });
    }

    // 5. Static Modules and Dimension Keyword Matching
    staticModules.forEach((mod) => {
      // Security Guard: Hide Admin routes from non-admin users
      if (mod.adminOnly && !isAdmin) {
        return;
      }

      const modText = `${mod.title} ${mod.description} ${mod.badge || ''}`.toLowerCase();

      let matched = false;
      if (modText.includes(raw) || raw.includes(mod.title.toLowerCase())) {
        matched = true;
      }

      // Keyword associations
      if (
        (raw.includes('crime intelligence') || raw.includes('intelligence') || raw.includes('incident')) &&
        mod.id === 'mod-overview'
      ) {
        matched = true;
      }
      if (raw.includes('state') && mod.id === 'mod-districts') matched = true;
      if (isTrendsIntent && mod.id === 'mod-trends') matched = true;
      if (isRiskIntent && mod.id === 'mod-risk') matched = true;
      if (isResourceIntent && mod.id === 'mod-resources') matched = true;
      if (isBudgetIntent && mod.id === 'mod-budget') matched = true;
      if (isReportIntent && mod.id === 'mod-reports') matched = true;
      if (isWeaponsIntent && mod.id === 'dim-weapons') matched = true;
      if (isCrimeTypeIntent && mod.id === 'dim-types') matched = true;
      if (isDemographicsIntent && mod.id === 'dim-demographics') matched = true;
      if (isHourlyIntent && mod.id === 'dim-hourly') matched = true;
      if (isDistrictIntent && mod.id === 'mod-districts') matched = true;
      if (isStaffIntent && mod.id === 'acc-login') matched = true;
      if (isAdminIntent && mod.id === 'acc-admin' && isAdmin) matched = true;

      // Prediction / Forecasting matches
      if ((raw.includes('predict') || raw.includes('forecast')) && mod.id === 'mod-predictions') {
        matched = true;
      }

      if (matched && !results.some((r) => r.id === mod.id)) {
        results.push(mod);
      }
    });

    // Deduplicate results by ID
    const uniqueMap = new Map<string, SearchResultItem>();
    results.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [query, states, districts, staticModules, isAdmin]);

  const groupedResults = useMemo(() => {
    const map = new Map<SearchCategory, SearchResultItem[]>();
    CATEGORY_ORDER.forEach((cat) => map.set(cat, []));

    searchResults.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });

    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [searchResults]);

  // Flattened items list for index-based keyboard navigation
  const flatResultItems = useMemo(() => {
    return groupedResults.flatMap(([, items]) => items);
  }, [groupedResults]);

  // Execute Navigation for a Search Result
  const handleSelectResult = useCallback(
    (item: SearchResultItem) => {
      setIsOpen(false);
      setMobileModalOpen(false);
      setQuery('');

      if (onNavigateCallback) {
        onNavigateCallback();
      }

      // Check if item requires authentication and user is unauthenticated
      if (item.authRequired && !isAuthenticated) {
        navigate('/login', { state: { from: { pathname: item.route } } });
      } else {
        navigate(item.route);
      }
    },
    [navigate, isAuthenticated, onNavigateCallback]
  );

  // Keyboard Navigation Handling (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== 'Escape') {
      setIsOpen(true);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatResultItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatResultItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResultItems.length > 0 && selectedIndex < flatResultItems.length) {
        handleSelectResult(flatResultItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setMobileModalOpen(false);
      inputRef.current?.blur();
    }
  };

  // Keep highlighted item visible in scroll container
  useEffect(() => {
    if (resultsListRef.current) {
      const activeEl = resultsListRef.current.querySelector(
        `[data-item-index="${selectedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* 1. Desktop Search Input Field Container */}
      {showDesktop && (
        <div
          ref={containerRef}
          className={`relative w-full ${variant === 'auto' ? 'hidden md:block' : ''} ${className}`}
        >
          <div
            className={`flex h-[42px] w-full items-center rounded-lg border bg-white px-3 transition-all duration-150 shadow-2xs ${
              isOpen
                ? 'border-[#1769AA] ring-2 ring-[#1769AA]/15'
                : 'border-[#D9E1EA] hover:border-[#BAC7D5]'
            }`}
          >
            <Search className="h-4 w-4 text-[#5D6878] shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search intelligence, states, districts..."
              className="w-full bg-transparent text-[14px] text-[#172033] placeholder:text-[#8896A6] outline-none"
              aria-label="Global intelligence search"
              autoComplete="off"
              spellCheck="false"
            />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-[#8896A6] hover:text-[#172033] rounded transition-colors mr-1 cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 pl-1 shrink-0 select-none">
            <kbd className="inline-flex items-center justify-center rounded border border-[#D9E1EA] bg-[#F4F7FA] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-[#718294] leading-none">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* 2. Desktop Results Dropdown / Command Palette */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[#D9E1EA] bg-white shadow-xl overflow-hidden animate-in fade-in-50 duration-100"
            style={{ width: '100%', minWidth: '380px', maxWidth: '440px' }}
          >
            {/* Header context info */}
            <div className="flex items-center justify-between border-b border-[#EDF2F7] bg-[#F8FAFC] px-3.5 py-2">
              <span className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#1769AA]" />
                {query.trim() ? 'Matching Capabilities & Intelligence' : 'Quick Access Capabilities'}
              </span>
              <span className="text-[10.5px] text-[#8896A6] font-mono">
                {flatResultItems.length} {flatResultItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Results List */}
            <div
              ref={resultsListRef}
              className="max-h-[380px] overflow-y-auto divide-y divide-[#F1F5F9] focus:outline-none"
            >
              {flatResultItems.length === 0 ? (
                <div className="p-7 text-center">
                  <p className="text-[13.5px] font-semibold text-[#0B1F3A]">No matching results</p>
                  <p className="text-[12px] text-[#5D6878] mt-1 max-w-[280px] mx-auto">
                    Try searching for states (e.g. "Telangana"), districts, crime trends, weapons or reports.
                  </p>
                </div>
              ) : (
                (() => {
                  let globalIdx = 0;
                  return groupedResults.map(([category, items]) => (
                    <div key={category} className="py-1">
                      {/* Group Header */}
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8896A6] bg-slate-50/70">
                        {category}
                      </div>

                      {/* Group Items */}
                      {items.map((item) => {
                        const isCurrent = globalIdx === selectedIndex;
                        const thisIndex = globalIdx;
                        globalIdx++;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            data-item-index={thisIndex}
                            onClick={() => handleSelectResult(item)}
                            onMouseEnter={() => setSelectedIndex(thisIndex)}
                            className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-[#EAF3FA] text-[#0B1F3A] border-l-3 border-[#1769AA]'
                                : 'hover:bg-[#F8FAFC] text-[#172033]'
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 transition-colors ${
                                isCurrent
                                  ? 'bg-[#1769AA] text-white shadow-2xs'
                                  : 'bg-[#F1F5F9] text-[#5D6878]'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold truncate leading-tight">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="rounded bg-white/80 border border-[#D9E1EA] px-1.5 py-0.5 text-[10px] font-medium text-[#5D6878] shrink-0 font-mono">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] text-[#5D6878] mt-0.5 leading-snug line-clamp-1">
                                {item.description}
                              </p>
                            </div>

                            <ArrowRight
                              className={`h-3.5 w-3.5 shrink-0 self-center transition-transform ${
                                isCurrent
                                  ? 'text-[#1769AA] translate-x-0.5'
                                  : 'text-slate-300'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>

            {/* Dropdown Keyboard Footer */}
            <div className="border-t border-[#EDF2F7] bg-[#F8FAFC] px-3.5 py-2 flex items-center justify-between text-[11px] text-[#8896A6]">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[#D9E1EA] bg-white px-1 py-0.5 text-[9.5px] font-mono leading-none">
                  ↑
                </kbd>
                <kbd className="rounded border border-[#D9E1EA] bg-white px-1 py-0.5 text-[9.5px] font-mono leading-none">
                  ↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[#D9E1EA] bg-white px-1.5 py-0.5 text-[9.5px] font-mono leading-none">
                  ↵ Enter
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[#D9E1EA] bg-white px-1 py-0.5 text-[9.5px] font-mono leading-none">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 3. Mobile Trigger Button (Visible when full search bar is hidden on smaller screens) */}
      {showMobile && (
        <button
          type="button"
          onClick={() => {
            setMobileModalOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 100);
          }}
          className={`${
            variant === 'auto' ? 'flex md:hidden' : 'flex'
          } h-9 w-9 items-center justify-center rounded-lg border border-[#D9E1EA] bg-white text-[#5D6878] hover:text-[#0B1F3A] hover:bg-[#F4F7FA] transition-colors cursor-pointer shrink-0`}
          title="Open intelligence search"
          aria-label="Open intelligence search"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* 4. Mobile Full-Width Command Palette Dialog */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-xl border border-[#D9E1EA] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto w-full max-w-lg mx-auto">
            {/* Search Header Input */}
            <div className="flex h-12 items-center border-b border-[#D9E1EA] px-3.5 bg-white">
              <Search className="h-4 w-4 text-[#5D6878] shrink-0 mr-2.5" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search intelligence, states, districts..."
                className="w-full bg-transparent text-[14px] text-[#172033] placeholder:text-[#8896A6] outline-none"
                autoComplete="off"
              />
              <button
                onClick={() => setMobileModalOpen(false)}
                className="p-1 text-[#8896A6] hover:text-[#172033] rounded ml-2 cursor-pointer"
                title="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Results in Modal */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] max-h-[60vh]">
              {flatResultItems.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[13.5px] font-semibold text-[#0B1F3A]">No matching results</p>
                  <p className="text-[12px] text-[#5D6878] mt-1">
                    Try searching for a state name, district, or capability.
                  </p>
                </div>
              ) : (
                (() => {
                  let globalIdx = 0;
                  return groupedResults.map(([category, items]) => (
                    <div key={category} className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8896A6] bg-slate-50">
                        {category}
                      </div>
                      {items.map((item) => {
                        const isCurrent = globalIdx === selectedIndex;
                        const thisIndex = globalIdx;
                        globalIdx++;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectResult(item)}
                            onMouseEnter={() => setSelectedIndex(thisIndex)}
                            className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer ${
                              isCurrent ? 'bg-[#EAF3FA]' : 'active:bg-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FA] text-[#1769AA] shrink-0 mt-0.5">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[13px] font-semibold text-[#0B1F3A] block truncate leading-tight">
                                {item.title}
                              </span>
                              <p className="text-[11.5px] text-[#5D6878] mt-0.5 leading-snug line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#1769AA] shrink-0 self-center" />
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>

            {/* Mobile Footer */}
            <div className="border-t border-[#EDF2F7] bg-[#F8FAFC] px-3.5 py-2 text-right">
              <button
                onClick={() => setMobileModalOpen(false)}
                className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalIntelligenceSearch;
