import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Activity,
  Sliders,
  BadgeDollarSign,
  FileText,
  UserCog,
  Shield,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  interface NavItem {
    name: string;
    path: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  }

  const overviewItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
  ];

  const intelligenceItems: NavItem[] = [
    { name: 'Crime Analytics', path: '/dashboard#analytics', icon: BarChart3 },
    { name: 'Geographic Intelligence', path: '/districts', icon: MapPin },
    { name: 'Crime Trends', path: '/trends', icon: TrendingUp },
    { name: 'Risk Assessment', path: '/risk', icon: ShieldAlert },
    { name: 'Predictions', path: '/predictions', icon: Activity },
  ];

  const operationsItems: NavItem[] = [
    { name: 'Resource Optimization', path: '/resources', icon: Sliders },
    { name: 'Budget Intelligence', path: '/budget', icon: BadgeDollarSign },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  const renderNavGroup = (title: string, items: NavItem[], isAccentTitle = false) => (
    <div>
      <p
        className={`px-3 text-[10.5px] font-semibold uppercase tracking-wider mb-1 ${
          isAccentTitle ? 'text-[#1D7FE2]' : 'text-slate-400'
        }`}
      >
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 py-1.5 text-[13px] transition-colors rounded ${
                  isActive
                    ? 'border-l-[3px] border-[#1D7FE2] bg-[#1769AA]/25 pl-2.5 pr-2.5 text-white font-semibold'
                    : 'px-3 text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#1D7FE2]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-[#12345B] bg-[#0B1F3A] text-slate-200">
      {/* Top Logo / Wordmark Area */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[#12345B] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1769AA] text-white shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-[12.5px] font-bold tracking-tight text-white leading-tight truncate" title="Crime Intelligence & Management Portal">
            Crime Intelligence &amp; Management Portal
          </h1>
          <p className="text-[10.5px] font-medium text-slate-400 leading-none mt-0.5">
            Operations &amp; Analysis Center
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 space-y-3.5 overflow-y-auto px-2.5 py-3 text-sm">
        {/* OVERVIEW */}
        {renderNavGroup('OVERVIEW', overviewItems)}

        {/* INTELLIGENCE */}
        {renderNavGroup('INTELLIGENCE', intelligenceItems)}

        {/* OPERATIONS */}
        {renderNavGroup('OPERATIONS', operationsItems)}

        {/* ADMINISTRATION (Admins Only) */}
        {user?.role === 'ADMIN' &&
          renderNavGroup(
            'ADMINISTRATION',
            [{ name: 'Administration', path: '/admin', icon: UserCog, exact: false }],
            true
          )}
      </div>

      {/* Footer: User Details & Logout */}
      <div className="border-t border-[#12345B] p-2.5">
        <div className="flex items-center justify-between gap-2 rounded bg-white/5 px-2.5 py-2">
          <Link
            to="/profile"
            className="min-w-0 flex-1 hover:opacity-85 transition-opacity block"
            title="View & Edit Profile"
          >
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              {user?.full_name || 'Authorized Staff'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16845B]" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                {user?.role || 'Staff'} &bull;{' '}
                <span className="text-[#16845B] font-medium">Active</span>
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-[#C53B3B] transition-colors cursor-pointer shrink-0"
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
