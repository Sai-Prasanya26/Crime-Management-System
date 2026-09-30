import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  MapPin,
  CalendarClock,
  FileText,
  Users,
  ShieldAlert,
  Shield,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-[#242E42] bg-[#172033] text-slate-200">
      {/* Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[#242E42] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-[14px] font-bold tracking-tight text-white leading-tight truncate">
            Crime Intelligence Portal
          </h1>
          <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
            Operations &amp; Analysis
          </p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 text-sm">
        {/* OVERVIEW */}
        <div>
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Overview
          </p>
          <nav className="mt-1 space-y-0.5">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'border-l-2 border-[#1D4ED8] bg-blue-600/15 pl-2 pr-2.5 text-white font-semibold rounded-r'
                    : 'px-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>Dashboard</span>
                </>
              )}
            </NavLink>
          </nav>
        </div>

        {/* INTELLIGENCE */}
        <div>
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Intelligence
          </p>
          <nav className="mt-1 space-y-0.5">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2 text-[14px] font-medium transition-colors ${
                  isActive && window.location.pathname === '/dashboard'
                    ? 'border-l-2 border-[#1D4ED8] bg-blue-600/15 pl-2 pr-2.5 text-white font-semibold rounded-r'
                    : 'px-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded'
                }`
              }
            >
              <BarChart3 className="h-[18px] w-[18px] shrink-0 text-slate-400" />
              <span>Crime Analytics</span>
            </NavLink>

            <NavLink
              to="/trends"
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'border-l-2 border-[#1D4ED8] bg-blue-600/15 pl-2 pr-2.5 text-white font-semibold rounded-r'
                    : 'px-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <TrendingUp className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>Crime Trends</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/districts"
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-2 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'border-l-2 border-[#1D4ED8] bg-blue-600/15 pl-2 pr-2.5 text-white font-semibold rounded-r'
                    : 'px-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MapPin className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>Risk Intelligence</span>
                </>
              )}
            </NavLink>
          </nav>
        </div>

        {/* OPERATIONS */}
        <div>
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Operations
          </p>
          <nav className="mt-1 space-y-0.5">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 px-2.5 py-2 text-[14px] font-medium text-slate-300 hover:bg-white/5 hover:text-white rounded transition-colors"
            >
              <CalendarClock className="h-[18px] w-[18px] shrink-0 text-slate-400" />
              <span>Resource Planning</span>
            </NavLink>

            <NavLink
              to="/trends"
              className="flex items-center gap-2.5 px-2.5 py-2 text-[14px] font-medium text-slate-300 hover:bg-white/5 hover:text-white rounded transition-colors"
            >
              <FileText className="h-[18px] w-[18px] shrink-0 text-slate-400" />
              <span>Reports</span>
            </NavLink>
          </nav>
        </div>

        {/* ADMINISTRATION (Admins Only) */}
        {user?.role === 'ADMIN' && (
          <div>
            <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              Administration
            </p>
            <nav className="mt-1 space-y-0.5">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-2 text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'border-l-2 border-[#1D4ED8] bg-blue-600/15 pl-2 pr-2.5 text-white font-semibold rounded-r'
                      : 'px-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>User Management</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/admin"
                className="flex items-center gap-2.5 px-2.5 py-2 text-[14px] font-medium text-slate-300 hover:bg-white/5 hover:text-white rounded transition-colors"
              >
                <ShieldAlert className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                <span>Audit Log</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#242E42] p-3">
        <div className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              {user?.full_name || 'Authorized Staff'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                {user?.role || 'User'} &bull; <span className="text-emerald-400 font-medium">Active</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
