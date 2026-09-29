import React from 'react';
import { RefreshCw, Database, Activity, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 backdrop-blur-md">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Live Database Badge */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          <Database className="h-3.5 w-3.5" />
          <span className="font-medium">crime_management_db</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* API v1 Indicator */}
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-mono text-slate-400 sm:flex">
          <Activity className="h-3 w-3 text-indigo-400" />
          <span>API v1 Connected</span>
        </div>

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
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
