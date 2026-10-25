import React from 'react';
import {
  Home,
  LogIn,
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
import UserAccountMenu from './UserAccountMenu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleSidebar?: () => void;
  hideSidebar?: boolean;
  action?: React.ReactNode;
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
  onToggleSidebar,
  hideSidebar = false,
  action,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const OperationIcon = getOperationIcon(title, location.pathname, icon);

  // =========================================================================
  // FULL-SCREEN OPERATION WORKSPACE HEADER
  // Clean, focused layout: [← Back] | [Icon] Title / Subtitle | [Home] [User ▾]
  // =========================================================================
  if (hideSidebar) {
    return (
      <header className="sticky top-0 z-20 flex min-h-16 w-full items-center justify-between border-b border-[#D9E1EA] bg-white px-3 sm:px-5 lg:px-6 shadow-2xs gap-3 py-2 flex-wrap sm:flex-nowrap">
        {/* Left: [← Back] | [Icon] Title + Subtitle + Optional Action */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 min-w-0 pr-1">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-2.5 sm:px-3 text-[12px] font-semibold text-[#0B1F3A] hover:bg-[#F4F7FA] hover:text-[#1769AA] hover:border-[#BAC7D5] transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Return to previous portal page"
            aria-label="Return to previous portal page"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#1769AA]" />
            <span>Back</span>
          </button>

          <div className="h-5 w-px bg-[#D9E1EA] shrink-0" />

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FA] text-[#1769AA] border border-[#BAC7D5]/40 shrink-0">
            {React.createElement(OperationIcon, { className: 'h-4 w-4' })}
          </div>

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

          {action && (
            <div className="flex items-center shrink-0">
              {action}
            </div>
          )}
        </div>

        {/* Right: Home Navigation & User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-2.5 sm:px-3 text-[12px] font-semibold text-[#0B1F3A] hover:bg-[#F4F7FA] hover:text-[#1769AA] hover:border-[#BAC7D5] transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <Home className="h-3.5 w-3.5 text-[#1769AA]" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          {isAuthenticated && user ? (
            <UserAccountMenu />
          ) : (
            <Link
              to="/login"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-2.5 sm:px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
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
  // NORMAL PORTAL / DASHBOARD HEADER
  // Clean layout: Menu (mobile) | [Shield] Title & Subtitle | [Home] [User ▾]
  // REMOVED: Search, Live Clock, System Operational Badge, Refresh Button
  // =========================================================================
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#D9E1EA] bg-white px-3 sm:px-5 lg:px-6 shadow-2xs gap-3">
      {/* Left: Mobile Drawer Trigger + Shield Logo & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E1EA] bg-white text-[#5D6878] hover:text-[#0B1F3A] hover:bg-[#F4F7FA] transition-colors cursor-pointer shrink-0"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Shield / Logo Icon with Link to Home */}
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1F3A] text-white shrink-0 hover:bg-[#12345B] transition-colors shadow-2xs"
          title="Back to Home"
          aria-label="Back to Home"
        >
          <Shield className="h-4 w-4 text-[#1D7FE2]" />
        </Link>

        <div className="h-6 w-px bg-[#D9E1EA] hidden sm:block shrink-0" />

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

        {action && (
          <div className="flex items-center shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Right: Home Navigation Button & User Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link
          to="/"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-2.5 sm:px-3 text-[12px] font-semibold text-[#0B1F3A] hover:bg-[#F4F7FA] hover:text-[#1769AA] hover:border-[#BAC7D5] transition-all cursor-pointer shadow-2xs shrink-0"
          title="Back to Home"
          aria-label="Back to Home"
        >
          <Home className="h-4 w-4 text-[#1769AA]" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {isAuthenticated && user ? (
          <UserAccountMenu />
        ) : (
          <Link
            to="/login"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-2.5 sm:px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
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
