import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { geographyApi } from '../../api/geographyApi';
import type { StateItem, DistrictItem } from '../../types';
import {
  interpretQuery,
  type QueryResolution,
  type AmbiguousLocationMatch,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ambiguousMatches, setAmbiguousMatches] = useState<AmbiguousLocationMatch[] | null>(null);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);

  const showDesktop = variant === 'auto' || variant === 'desktop-only';
  const showMobile = variant === 'auto' || variant === 'mobile-only';

  // Geographic caches
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
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

  // Global Ctrl+K / Cmd+K Hotkey Listener — ONLY focuses input, NO dropdown/command palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
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

  // Close disambiguation/error on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  // Submit Query on Enter or Search Click
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

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
    if (errorMessage) {
      setErrorMessage(null);
    }
    if (ambiguousMatches) {
      setAmbiguousMatches(null);
    }
  };

  // Handle Escape key: clears and blurs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setErrorMessage(null);
      setAmbiguousMatches(null);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      setMobileModalOpen(false);
    }
  };

  return (
    <>
      {/* 1. Desktop Search Field Container (No Popup, User-Driven Input) */}
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

          {/* Minimal Inline Feedback for Ambiguity Resolution */}
          {ambiguousMatches && ambiguousMatches.length > 0 && (
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

          {/* Minimal Inline Unrecognized Query Message */}
          {errorMessage && (
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

      {/* 3. Mobile Clean Query Dialog (No Command Palette, Just Query Field) */}
      {mobileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-xs p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMobileModalOpen(false);
              setErrorMessage(null);
              setAmbiguousMatches(null);
            }
          }}
        >
          <div className="bg-white rounded-xl border border-[#D9E1EA] shadow-2xl p-4 my-auto w-full max-w-lg mx-auto space-y-3">
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

            {/* Mobile Ambiguity list */}
            {ambiguousMatches && ambiguousMatches.length > 0 && (
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
            {errorMessage && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 leading-snug">
                {errorMessage}
              </div>
            )}

            <p className="text-[11.5px] text-[#5D6878] leading-relaxed">
              Enter any location, temporal filter, or analysis type (e.g.{' '}
              <span className="font-medium text-[#172033]">"Telangana crime trends"</span>,{' '}
              <span className="font-medium text-[#172033]">"Hyderabad"</span>,{' '}
              <span className="font-medium text-[#172033]">"Weapons in Maharashtra"</span>) and press Enter.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalIntelligenceSearch;
