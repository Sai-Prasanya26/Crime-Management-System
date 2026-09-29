import React from 'react';
import { RefreshCw, Database, Home, LogOut, LogIn, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-[#EEF2FF] text-[#4F46E5] border-indigo-200',
  ANALYST: 'bg-amber-50 text-amber-700 border-amber-200',
  OFFICER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

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

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-8">
      <div>
        <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Live Database Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-xs text-[#047857]">
          <Database className="h-3.5 w-3.5" />
          <span className="font-semibold">crime_management_db</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
        </div>

        {/* User Profile / Auth Badge */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white p-1.5 pl-3 shadow-xs">
            <UserCheck className="h-4 w-4 text-[#4F46E5]" />
            <div className="text-left">
              <p className="text-xs font-semibold text-[#0F172A] leading-none">{user.full_name}</p>
              <p className="text-[10px] text-[#64748B] font-mono mt-0.5">@{user.username}</p>
            </div>
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                ROLE_STYLES[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors"
              title="Terminate session / Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#4338CA] transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </Link>
        )}

        {/* Landing Page Link */}
        <Link
          to="/"
          className="rounded-lg border border-[#E2E8F0] bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] shadow-xs transition-colors"
          title="Return to Landing Page"
        >
          <Home className="h-4 w-4" />
        </Link>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F172A] shadow-xs disabled:opacity-50 transition-colors"
            title="Refresh analytics data from MySQL"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#4F46E5]' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
