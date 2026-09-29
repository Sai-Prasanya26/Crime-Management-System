import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Shield,
  ShieldCheck,
  BrainCircuit,
  Cpu,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Intelligence Overview',
    },
    {
      to: '/trends',
      icon: TrendingUp,
      label: 'Longitudinal Trends',
    },
    {
      to: '/districts',
      icon: MapPin,
      label: 'Jurisdiction Risk',
    },
  ];

  const upcomingPhases = [
    { label: 'Phase 8: ML Forecast', icon: BrainCircuit },
    { label: 'Phase 10: Resource AI', icon: Cpu },
    { label: 'Phase 13: PDF Reports', icon: FileText },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#E2E8F0] bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4F46E5] shadow-sm shadow-indigo-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#0F172A]">CRIME OPS</h1>
          <p className="text-[10px] font-semibold tracking-wider text-[#4F46E5]">
            INTELLIGENCE SYSTEM
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Analytics Modules
          </p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold border border-indigo-100'
                        : 'text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-[#4F46E5]' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Navigation (When authenticated as ADMIN) */}
        {user?.role === 'ADMIN' && (
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Administration
            </p>
            <nav className="mt-2 space-y-1">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold border border-indigo-100'
                      : 'text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck className={`h-4 w-4 ${isActive ? 'text-[#4F46E5]' : 'text-indigo-500'}`} />
                    <span>Admin Console</span>
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        )}

        {/* Future Capabilities Pipeline */}
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Upcoming Phases
          </p>
          <div className="mt-2 space-y-1">
            {upcomingPhases.map((phase) => {
              const Icon = phase.icon;
              return (
                <div
                  key={phase.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                  title="Coming in subsequent implementation phases"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <span>{phase.label}</span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 border border-slate-200">
                    PLANNED
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Database & System Info */}
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Backend Engine</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FastAPI
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>MySQL 8.0</span>
            <span className="font-medium text-slate-700">191,679 Records</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
