import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  CarFront,
  FileText,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { geographyApi } from '../../api/geographyApi';
import type { StateItem, DistrictItem } from '../../types';
import {
  interpretQuery,
  generateSearchSuggestions,
  type QueryResolution,
  type AmbiguousLocationMatch,
  type SearchSuggestion,
  type SuggestionIconType,
} from './queryInterpreter';

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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ambiguousMatches, setAmbiguousMatches] = useState<AmbiguousLocationMatch[] | null>(null);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  const showDesktop = variant === 'auto' || variant === 'desktop-only';
  const showMobile = variant === 'auto' || variant === 'mobile-only';

  // Geographic caches
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

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

  // Debounce query input (150ms) for high-performance responsive autocomplete
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(handler);
  }, [query]);

  // Generate dynamic, context-aware suggestions whenever debouncedQuery or caches update
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }
    const results = generateSearchSuggestions(trimmed, states, districts);
    setSuggestions(results);
    setSelectedIndex(-1);
  }, [debouncedQuery, states, districts]);

  // Close suggestions / error on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        setAmbiguousMatches(null);
        setErrorMessage(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute resolved navigation
  const executeResolution = (resolution: QueryResolution) => {
    setErrorMessage(null);
    setAmbiguousMatches(null);
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    setMobileModalOpen(false);

    if (resolution.adminOnly && !isAdmin) {
      setErrorMessage('Administrative console requires administrator privileges.');
      return;
    }

    if (resolution.authRequired && !isAuthenticated) {
      navigate('/login', { state: { from: resolution.route } });
    } else {
      navigate(resolution.route);
    }

    if (onNavigateCallback) {
      onNavigateCallback();
    }
  };

  // Handle Selection of an Autocomplete Suggestion
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    setQuery('');
    setSuggestions([]);
    setErrorMessage(null);
    setAmbiguousMatches(null);
    setMobileModalOpen(false);

    if (suggestion.authRequired && !isAuthenticated) {
      navigate('/login', { state: { from: suggestion.route } });
    } else {
      navigate(suggestion.route);
    }

    if (onNavigateCallback) {
      onNavigateCallback();
    }
  };

  // Submit Query on Enter or Search Click
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // If an autocomplete item is actively highlighted with keyboard, select it
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[selectedIndex]);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setIsDropdownOpen(false);
    setErrorMessage(null);
    setAmbiguousMatches(null);

    const result = interpretQuery(trimmed, states, districts, isAdmin);

    if (result.status === 'resolved' && result.resolution) {
      executeResolution(result.resolution);
    } else if (result.status === 'ambiguous' && result.ambiguousMatches) {
      setAmbiguousMatches(result.ambiguousMatches);
    } else {
      setErrorMessage(
        result.errorMessage ||
          "Could not identify a project destination. Try a state, district, year, or analysis such as 'Telangana crime trends'."
      );
    }
  };

  // Handle Input Changes
  const handleInputChange = (val: string) => {
    setQuery(val);
    if (val.trim().length >= 1) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
    if (ambiguousMatches) {
      setAmbiguousMatches(null);
    }
  };

  // Keyboard navigation for suggestions (Arrow Up, Arrow Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isTyping = query.trim().length >= 1;
    const showDropdown = isDropdownOpen && isTyping;

    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      setErrorMessage(null);
      setAmbiguousMatches(null);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      if (!isTyping) {
        setMobileModalOpen(false);
      }
    }
  };

  // Map icon types to appropriate Lucide components and semantic colors
  const renderSuggestionIcon = (icon: SuggestionIconType) => {
    switch (icon) {
      case 'MapPin':
        return <MapPin className="h-4 w-4 text-[#1769AA]" />;
      case 'BarChart3':
        return <BarChart3 className="h-4 w-4 text-[#1769AA]" />;
      case 'TrendingUp':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'ShieldAlert':
        return <ShieldAlert className="h-4 w-4 text-amber-600" />;
      case 'CarFront':
        return <CarFront className="h-4 w-4 text-indigo-600" />;
      case 'FileText':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'Layers':
        return <Layers className="h-4 w-4 text-purple-600" />;
      default:
        return <Search className="h-4 w-4 text-[#5D6878]" />;
    }
  };

  const isTyping = query.trim().length >= 1;
  const showDropdown = isDropdownOpen && isTyping;

  return (
    <>
      {/* 1. Desktop Search Field Container with Professional Autocomplete Dropdown */}
      {showDesktop && (
        <div
          ref={containerRef}
          className={`relative w-full ${variant === 'auto' ? 'hidden md:block' : ''} ${className}`}
        >
          <form
            onSubmit={handleSearchSubmit}
            className="flex h-[42px] w-full items-center rounded-lg border border-[#D9E1EA] bg-white px-3 shadow-2xs transition-colors hover:border-[#BAC7D5] focus-within:border-[#1769AA] focus-within:ring-2 focus-within:ring-[#1769AA]/15"
          >
            {/* Search Submit Icon Button */}
            <button
              type="submit"
              className="p-1 -ml-1 text-[#5D6878] hover:text-[#1769AA] transition-colors cursor-pointer mr-1.5"
              title="Search intelligence query"
              aria-label="Submit search query"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Natural Language Query Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= 1) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search intelligence, states, districts, reports..."
              className="w-full bg-transparent text-[14px] text-[#172033] placeholder:text-[#8896A6] outline-none"
              aria-label="Global intelligence search"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setIsDropdownOpen(false);
                  setSelectedIndex(-1);
                  setErrorMessage(null);
                  setAmbiguousMatches(null);
                  inputRef.current?.focus();
                }}
                className="p-1 text-[#8896A6] hover:text-[#172033] rounded transition-colors mr-1 cursor-pointer"
                title="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Context-Aware Search Suggestions Dropdown */}
          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-[#D9E1EA] bg-white shadow-xl overflow-hidden animate-in fade-in-50 duration-100"
              role="listbox"
            >
              {suggestions.length > 0 ? (
                <div className="py-1 divide-y divide-slate-100">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#EAF3FA]' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`shrink-0 p-1 rounded-md ${
                              isSelected ? 'bg-white shadow-2xs' : 'bg-[#F4F7FA]'
                            }`}
                          >
                            {renderSuggestionIcon(suggestion.icon)}
                          </span>
                          <span
                            className={`text-[13px] font-semibold truncate leading-tight ${
                              isSelected ? 'text-[#1769AA]' : 'text-[#172033]'
                            }`}
                          >
                            {suggestion.title}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-semibold text-[#5D6878] shrink-0 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                          {suggestion.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-3.5 text-center text-[12.5px] font-medium text-[#5D6878]">
                  No matching intelligence found
                </div>
              )}
            </div>
          )}

          {/* Inline Feedback for Ambiguity Resolution */}
          {ambiguousMatches && ambiguousMatches.length > 0 && !showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-lg border border-[#D9E1EA] bg-white p-2 shadow-xl animate-in fade-in-50 duration-100">
              <p className="text-[11px] font-semibold text-[#5D6878] px-2.5 py-1 uppercase tracking-wider">
                Select matching jurisdiction:
              </p>
              <div className="divide-y divide-slate-100">
                {ambiguousMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => executeResolution(match.resolution)}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[13px] hover:bg-[#EAF3FA] hover:text-[#1769AA] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-[#172033] flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[#1769AA]" />
                      {match.name}
                    </span>
                    <span className="text-[11.5px] text-[#5D6878]">{match.context}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline Unrecognized Query Message */}
          {errorMessage && !showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[12px] text-amber-900 shadow-md flex items-center justify-between gap-2 animate-in fade-in-50 duration-100">
              <span className="leading-snug">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-0.5 text-amber-700 hover:text-amber-950 rounded cursor-pointer shrink-0"
                title="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Mobile Trigger Button (Visible below md) */}
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

      {/* 3. Mobile Query Dialog with Autocomplete Support */}
      {mobileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-xs p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMobileModalOpen(false);
              setErrorMessage(null);
              setAmbiguousMatches(null);
              setIsDropdownOpen(false);
            }
          }}
        >
          <div
            ref={mobileContainerRef}
            className="bg-white rounded-xl border border-[#D9E1EA] shadow-2xl p-4 my-auto w-full max-w-lg mx-auto space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EDF2F7]">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#0B1F3A] flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-[#1769AA]" />
                Intelligence Query Box
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileModalOpen(false);
                  setErrorMessage(null);
                  setAmbiguousMatches(null);
                  setIsDropdownOpen(false);
                }}
                className="p-1 text-[#8896A6] hover:text-[#172033] rounded cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="flex h-11 w-full items-center rounded-lg border border-[#D9E1EA] bg-white px-3 shadow-2xs focus-within:border-[#1769AA] focus-within:ring-2 focus-within:ring-[#1769AA]/15"
            >
              <button
                type="submit"
                className="p-1 -ml-1 text-[#5D6878] hover:text-[#1769AA] mr-1.5 cursor-pointer"
                title="Submit query"
              >
                <Search className="h-4 w-4" />
              </button>
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                  if (query.trim().length >= 1) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search intelligence, states, districts, reports..."
                className="w-full bg-transparent text-[14px] text-[#172033] placeholder:text-[#8896A6] outline-none"
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    setIsDropdownOpen(false);
                    setSelectedIndex(-1);
                    setErrorMessage(null);
                    setAmbiguousMatches(null);
                    mobileInputRef.current?.focus();
                  }}
                  className="p-1 text-[#8896A6] hover:text-[#172033] rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {/* Mobile Context-Aware Suggestions Dropdown */}
            {showDropdown && (
              <div
                className="rounded-lg border border-[#D9E1EA] bg-white shadow-md overflow-hidden animate-in fade-in-50 duration-100 max-h-60 overflow-y-auto"
                role="listbox"
              >
                {suggestions.length > 0 ? (
                  <div className="py-1 divide-y divide-slate-100">
                    {suggestions.map((suggestion, index) => {
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={`mob-${suggestion.id}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#EAF3FA]' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`shrink-0 p-1 rounded-md ${
                                isSelected ? 'bg-white shadow-2xs' : 'bg-[#F4F7FA]'
                              }`}
                            >
                              {renderSuggestionIcon(suggestion.icon)}
                            </span>
                            <span
                              className={`text-[13px] font-semibold truncate leading-tight ${
                                isSelected ? 'text-[#1769AA]' : 'text-[#172033]'
                              }`}
                            >
                              {suggestion.title}
                            </span>
                          </div>
                          <span className="text-[10.5px] font-semibold text-[#5D6878] shrink-0 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {suggestion.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center text-[12.5px] font-medium text-[#5D6878]">
                    No matching intelligence found
                  </div>
                )}
              </div>
            )}

            {/* Mobile Ambiguity list */}
            {ambiguousMatches && ambiguousMatches.length > 0 && !showDropdown && (
              <div className="rounded-lg border border-[#D9E1EA] bg-slate-50 p-2 space-y-1">
                <p className="text-[11px] font-semibold text-[#5D6878] px-2 py-0.5 uppercase tracking-wider">
                  Select matching jurisdiction:
                </p>
                {ambiguousMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => executeResolution(match.resolution)}
                    className="w-full text-left px-2.5 py-2 rounded-md bg-white border border-[#D9E1EA] text-[13px] hover:bg-[#EAF3FA] hover:text-[#1769AA] flex items-center justify-between"
                  >
                    <span className="font-semibold text-[#172033]">{match.name}</span>
                    <span className="text-[11px] text-[#5D6878]">{match.context}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Mobile Error Message */}
            {errorMessage && !showDropdown && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 leading-snug">
                {errorMessage}
              </div>
            )}

            <p className="text-[11.5px] text-[#5D6878] leading-relaxed">
              Enter any location, temporal filter, or analysis type (e.g.{' '}
              <span className="font-medium text-[#172033]">"Telangana trends"</span>,{' '}
              <span className="font-medium text-[#172033]">"Hyderabad crime"</span>,{' '}
              <span className="font-medium text-[#172033]">"risk Hyderabad"</span>).
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalIntelligenceSearch;
