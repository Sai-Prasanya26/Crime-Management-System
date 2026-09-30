import React from 'react';
import { RefreshCw, Home, LogOut, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#DCE2EA] bg-white px-5 sm:px-6 shadow-2xs">
      {/* Left: Page Title & Context */}
      <div className="min-w-0 pr-4">
        <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[#172033] leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-[#5B6577] mt-0.5 leading-tight truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Operational Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* System Status: Operational */}
        <div className="hidden md:flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[12px] font-medium text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Operational</span>
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#DCE2EA] bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#172033] disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh current data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#1D4ED8]' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Home Portal Link */}
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#DCE2EA] bg-white text-slate-600 hover:bg-slate-50 hover:text-[#172033] transition-colors"
          title="Return to Portal Overview"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>

        {/* User Account / Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 rounded-md border border-[#DCE2EA] bg-white py-1 pl-2 pr-1.5 shadow-2xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#172033] text-[11px] font-bold text-white shrink-0">
              {userInitial}
            </div>
            <div className="hidden sm:block text-left pr-1">
              <p className="text-[13px] font-medium text-[#172033] leading-tight truncate max-w-[140px]">
                {user.full_name}
              </p>
              <p className="text-[11px] text-[#5B6577] leading-tight">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer ml-0.5"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#1E40AF] transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Staff Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
