import React, { useState, useEffect } from 'react';
import { RefreshCw, Home, LogOut, LogIn, Clock } from 'lucide-react';
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

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
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
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-20 flex h-15 w-full items-center justify-between border-b border-[#D9E1EA] bg-white px-5 sm:px-6 shadow-2xs">
      {/* Left: Current Page Title / Breadcrumb */}
      <div className="min-w-0 pr-4">
        <h1 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[#0B1F3A] leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-[#5D6878] mt-0.5 leading-tight truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Operational Status, Time & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Operational Date/Time */}
        <div className="hidden lg:flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#F4F7FA] px-2.5 py-1 text-[11px] font-medium text-[#5D6878]">
          <Clock className="h-3 w-3 text-[#1769AA]" />
          <span>{currentTime || 'Synchronized'}</span>
        </div>

        {/* Live Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
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
            className="flex h-8 items-center gap-1.5 rounded border border-[#D9E1EA] bg-white px-2.5 text-[12px] font-medium text-[#5D6878] hover:bg-slate-50 hover:text-[#0B1F3A] disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh current data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#1769AA]' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">Refresh</span>
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

        {/* User Account / Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 rounded border border-[#D9E1EA] bg-white py-1 pl-2 pr-1.5 shadow-2xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1F3A] text-[11px] font-bold text-white shrink-0">
              {userInitial}
            </div>
            <div className="hidden sm:block text-left pr-1">
              <p className="text-[12px] font-semibold text-[#0B1F3A] leading-tight truncate max-w-[130px]">
                {user.full_name}
              </p>
              <p className="text-[10px] text-[#5D6878] leading-tight uppercase font-medium">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#C53B3B] transition-colors cursor-pointer ml-0.5"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex h-8 items-center gap-1.5 rounded bg-[#0B1F3A] px-3 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors"
          >
            <LogIn className="h-3.5 w-3.5 text-[#1D7FE2]" />
            <span>Staff Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
