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
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#E2E8F0] bg-white shadow-[1px_0_2px_rgba(15,23,42,0.03)]">
      {/* Brand Header */}
      <div className="flex min-h-[72px] items-center gap-3 border-b border-[#E2E8F0] px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-xs">
          <Shield className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#0F172A] leading-tight">Crime Intelligence</h1>
          <p className="text-xs font-semibold tracking-wider text-[#4F46E5] uppercase mt-0.5">
            Operations Portal
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div>
          <p className="px-3.5 text-xs font-bold uppercase tracking-wider text-[#64748B]">
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
                    `flex items-center gap-3 py-2.5 text-[15px] font-medium transition-all ${
                      isActive
                        ? 'border-l-4 border-[#4F46E5] bg-[#EEF2FF] pl-3 pr-3.5 text-[#4F46E5] font-semibold rounded-r-xl shadow-2xs'
                        : 'px-3.5 text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-xl'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#4F46E5]' : 'text-slate-500'}`} />
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
            <p className="px-3.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              System Administration
            </p>
            <nav className="mt-2 space-y-1">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 text-[15px] font-medium transition-all ${
                    isActive
                      ? 'border-l-4 border-[#4F46E5] bg-[#EEF2FF] pl-3 pr-3.5 text-[#4F46E5] font-semibold rounded-r-xl shadow-2xs'
                      : 'px-3.5 text-slate-600 hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-xl'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#4F46E5]' : 'text-indigo-500'}`} />
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
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>Protected Operation</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Clearance: <span className="font-bold text-slate-800">{user?.role || 'Guest'}</span>
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
