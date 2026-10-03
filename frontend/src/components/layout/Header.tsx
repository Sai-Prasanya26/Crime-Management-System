import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Home,
  LogIn,
  Clock,
  Shield,
  Menu,
  ArrowLeft,
  LayoutDashboard,
  BarChart3,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Activity,
  Sliders,
  BadgeDollarSign,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GlobalIntelligenceSearch from '../search/GlobalIntelligenceSearch';
import UserAccountMenu from './UserAccountMenu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleSidebar?: () => void;
  hideSidebar?: boolean;
}

const getOperationIcon = (title: string, pathname: string, customIcon?: LucideIcon): LucideIcon => {
  if (customIcon) return customIcon;
  const path = pathname.toLowerCase();
  const t = title.toLowerCase();

  if (path.includes('/analytics') || t.includes('analytics')) return BarChart3;
  if (path.includes('/districts') || t.includes('geographic')) return MapPin;
  if (path.includes('/trends') || t.includes('trends')) return TrendingUp;
  if (path.includes('/risk') || t.includes('risk')) return ShieldAlert;
  if (path.includes('/predictions') || t.includes('predict')) return Activity;
  if (path.includes('/resources') || t.includes('resource')) return Sliders;
  if (path.includes('/budget') || t.includes('budget')) return BadgeDollarSign;
  if (path.includes('/reports') || t.includes('report')) return FileText;
  if (path.includes('/dashboard') || t.includes('overview') || t.includes('dashboard')) return LayoutDashboard;

  return Shield;
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  icon,
  onRefresh,
  isRefreshing,
  onToggleSidebar,
  hideSidebar = false,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock is only updated when in normal portal mode
  useEffect(() => {
    if (hideSidebar) return;
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [hideSidebar]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const OperationIcon = getOperationIcon(title, location.pathname, icon);

  // =========================================================================
  // DEDICATED FULL-SCREEN OPERATION WORKSPACE HEADER
  // Minimal, focused header: [← Back] | [Icon] Title / Subtitle | [User ▾]
  // REMOVED: Search, Date/Time, System Operational, Refresh, Home icon.
  // =========================================================================
  if (hideSidebar) {
    return (
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#D9E1EA] bg-white px-3 sm:px-5 lg:px-6 shadow-2xs gap-3">
        {/* Left: [← Back] | [Icon] Title + Short Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-1">
          {/* 1. Back button */}
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-2.5 sm:px-3 text-[12px] font-semibold text-[#0B1F3A] hover:bg-[#F4F7FA] hover:text-[#1769AA] transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Return to previous portal page"
            aria-label="Return to previous portal page"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#1769AA]" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-[#D9E1EA] shrink-0" />

          {/* 2. Relevant Operation Lucide Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FA] text-[#1769AA] border border-[#BAC7D5]/40 shrink-0">
            <OperationIcon className="h-4 w-4" />
          </div>

          {/* 3. Title & 4. Short Subtitle */}
          <div className="min-w-0">
            <h1 className="text-[14px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-[#0B1F3A] leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10.5px] sm:text-[11.5px] text-[#5D6878] mt-0.5 leading-tight truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: 5. User Profile Dropdown ONLY */}
        <div className="flex items-center shrink-0">
          {isAuthenticated && user ? (
            <UserAccountMenu />
          ) : (
            <Link
              to="/login"
              className="flex h-8 items-center gap-1.5 rounded bg-[#0B1F3A] px-2.5 sm:px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
            >
              <LogIn className="h-3.5 w-3.5 text-[#1D7FE2]" />
              <span className="hidden sm:inline">Staff Sign In</span>
            </Link>
          )}
        </div>
      </header>
    );
  }

  // =========================================================================
  // NORMAL PORTAL / DASHBOARD HEADER (UNCHANGED)
  // Contains: Menu (mobile), Shield, Title/Subtitle, Search, Clock, Status, Refresh, Home, User
  // =========================================================================
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#D9E1EA] bg-white px-3 sm:px-5 lg:px-6 shadow-2xs gap-2 sm:gap-3">
      {/* Left: Mobile Drawer Trigger + Shield Emblem & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-1 sm:pr-2">
        {/* Hamburger Menu Toggle Button (Visible below lg / 1024px) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E1EA] bg-white text-[#5D6878] hover:text-[#0B1F3A] hover:bg-[#F4F7FA] transition-colors cursor-pointer shrink-0"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Shield Emblem Link to Home */}
        <Link
          to="/"
          className="hidden xs:flex sm:flex h-8 w-8 items-center justify-center rounded bg-[#0B1F3A] text-white shrink-0 hover:bg-[#12345B] transition-colors"
          title="Return to Portal Overview"
        >
          <Shield className="h-4 w-4 text-[#1D7FE2]" />
        </Link>
        <div className="h-6 w-px bg-[#D9E1EA] hidden md:block shrink-0" />
        <div className="min-w-0">
          <h1 className="text-[14px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-[#0B1F3A] leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10.5px] sm:text-[11.5px] text-[#5D6878] mt-0.5 leading-tight truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Global Intelligence Search (accessible on large desktop) */}
      <div className="hidden xl:flex items-center flex-1 max-w-[500px] 2xl:max-w-[580px] mx-3">
        <GlobalIntelligenceSearch variant="desktop-only" className="w-full" />
      </div>

      {/* Right: Operational Status, Time & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Mobile / Tablet search trigger button */}
        <div className="xl:hidden">
          <GlobalIntelligenceSearch variant="mobile-only" />
        </div>

        {/* Operational Date/Time */}
        <div className="hidden xl:flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#F4F7FA] px-2.5 py-1 text-[11px] font-medium text-[#5D6878]">
          <Clock className="h-3 w-3 text-[#1769AA]" />
          <span>{currentTime || 'Synchronized'}</span>
        </div>

        {/* Live Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>System Operational</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-8 items-center gap-1.5 rounded border border-[#D9E1EA] bg-white px-2 sm:px-2.5 text-[12px] font-medium text-[#5D6878] hover:bg-slate-50 hover:text-[#0B1F3A] disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh current data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#1769AA]' : 'text-slate-500'}`}
            />
            <span className="hidden md:inline">Refresh</span>
          </button>
        )}

        {/* Home Portal Link */}
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded border border-[#D9E1EA] bg-white text-[#5D6878] hover:bg-slate-50 hover:text-[#0B1F3A] transition-colors"
          title="Return to Portal Overview"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>

        {/* User Account / Profile Menu */}
        {isAuthenticated && user ? (
          <UserAccountMenu />
        ) : (
          <Link
            to="/login"
            className="flex h-8 items-center gap-1.5 rounded bg-[#0B1F3A] px-2.5 sm:px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
          >
            <LogIn className="h-3.5 w-3.5 text-[#1D7FE2]" />
            <span className="hidden sm:inline">Staff Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
