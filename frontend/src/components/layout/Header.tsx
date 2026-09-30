import React from 'react';
import { RefreshCw, Home, LogOut, LogIn, UserCheck, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ANALYST: 'bg-amber-50 text-amber-700 border-amber-200',
  OFFICER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVESTIGATOR: 'bg-purple-50 text-purple-700 border-purple-200',
  SUPERVISOR: 'bg-blue-50 text-blue-700 border-blue-200',
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
        {/* Operational Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold">System Operational</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* User Profile / Auth Badge */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white p-1.5 pl-3 shadow-2xs">
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
            className="flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5 text-indigo-400" />
            <span>Staff Sign In</span>
          </Link>
        )}

        {/* Home Portal Link */}
        <Link
          to="/"
          className="rounded-lg border border-[#E2E8F0] bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] shadow-2xs transition-colors"
          title="Return to Portal Overview"
        >
          <Home className="h-4 w-4" />
        </Link>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F172A] shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh current intelligence view"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#4F46E5]' : 'text-slate-500'}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
