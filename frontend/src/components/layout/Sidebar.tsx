import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Shield,
  BrainCircuit,
  Cpu,
  FileText,
  Lock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Intelligence Overview',
      active: true,
    },
    {
      to: '/trends',
      icon: TrendingUp,
      label: 'Longitudinal Trends',
      active: true,
    },
    {
      to: '/districts',
      icon: MapPin,
      label: 'Jurisdiction Risk',
      active: true,
    },
  ];

  const upcomingPhases = [
    { label: 'Phase 6: Auth & Roles', icon: Lock },
    { label: 'Phase 7-8: ML Forecast', icon: BrainCircuit },
    { label: 'Phase 10: Resource AI', icon: Cpu },
    { label: 'Phase 13: PDF Reports', icon: FileText },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">CRIME OPS</h1>
          <p className="text-[10px] font-medium tracking-wider text-indigo-400">
            INTELLIGENCE SYSTEM
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Future Capabilities Pipeline */}
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Upcoming Phases
          </p>
          <div className="mt-2 space-y-1">
            {upcomingPhases.map((phase) => {
              const Icon = phase.icon;
              return (
                <div
                  key={phase.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-500 opacity-60"
                  title="Coming in subsequent implementation phases"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{phase.label}</span>
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                    PLANNED
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Database & System Info */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Backend Engine</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              FastAPI
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>MySQL 8.0</span>
            <span>191,679 Records</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
