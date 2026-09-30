import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Shield,
  ShieldCheck,
  Users,
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
      label: 'Temporal Trends',
    },
    {
      to: '/districts',
      icon: MapPin,
      label: 'Jurisdiction Risk',
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#E2E8F0] bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F172A] text-white shadow-xs">
          <Shield className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#0F172A]">Crime Intelligence</h1>
          <p className="text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">
            Management Portal
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Analytical Modules
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

        {/* Administration (Admin Clearance Required) */}
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
                    <Users className={`h-4 w-4 ${isActive ? 'text-[#4F46E5]' : 'text-indigo-500'}`} />
                    <span>User Management</span>
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Operational Security Footer */}
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Protected Operation</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Clearance Level: <span className="font-semibold text-slate-700">{user?.role || 'Guest'}</span>
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
