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

const ROLE_STYLES = {
  ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  ANALYST: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  OFFICER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 backdrop-blur-md">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Live Database Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          <Database className="h-3.5 w-3.5" />
          <span className="font-medium">crime_management_db</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* User Profile / Auth Badge */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 pl-3">
            <UserCheck className="h-4 w-4 text-indigo-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-white leading-none">{user.full_name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">@{user.username}</p>
            </div>
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                ROLE_STYLES[user.role] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
              title="Terminate session / Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </Link>
        )}

        {/* Landing Page Link */}
        <Link
          to="/"
          className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
          title="Return to Landing Page"
        >
          <Home className="h-4 w-4" />
        </Link>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white disabled:opacity-50 transition-colors"
            title="Refresh analytics data from MySQL"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`}
            />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
