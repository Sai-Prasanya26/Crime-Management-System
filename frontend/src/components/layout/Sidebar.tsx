import React, { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    onClose?.();
    await logout();
  };

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  interface NavItem {
    name: string;
    path: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
  }

  const overviewItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard?workspace=fullscreen',
      icon: LayoutDashboard,
      exact: true,
    },
  ];

  const intelligenceItems: NavItem[] = [
    { name: 'Crime Analytics', path: '/analytics', icon: BarChart3 },
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

  const isItemActive = (item: NavItem, navActive: boolean) => {
    if (item.name === 'Dashboard') {
      return location.pathname === '/dashboard';
    }
    return navActive;
  };

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
              onClick={() => onClose?.()}
              className={({ isActive: navActive }) => {
                const isActive = isItemActive(item, navActive);
                return `flex items-center gap-2.5 py-1.5 text-[13px] transition-colors rounded ${
                  isActive
                    ? 'border-l-[3px] border-[#1D7FE2] bg-[#1769AA]/25 pl-2.5 pr-2.5 text-white font-semibold'
                    : 'px-3 text-slate-300 hover:bg-white/5 hover:text-white'
                }`;
              }}
            >
              {({ isActive: navActive }) => {
                const isActive = isItemActive(item, navActive);
                return (
                  <>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#1D7FE2]' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Navigation (Responsive: Persistent on lg+, Drawer on <lg) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85vw] flex-col border-r border-[#12345B] bg-[#0B1F3A] text-slate-200 transition-transform duration-200 ease-in-out lg:z-30 lg:w-[240px] lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo / Wordmark Area with mobile close button */}
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-[#12345B] px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1769AA] text-white shrink-0">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1
                className="text-[12.5px] font-bold tracking-tight text-white leading-tight truncate"
                title="Crime Intelligence & Management Portal"
              >
                Crime Intelligence &amp; Management Portal
              </h1>
              <p className="text-[10.5px] font-medium text-slate-400 leading-none mt-0.5 truncate">
                Operations &amp; Analysis Center
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors shrink-0 cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
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
              onClick={() => onClose?.()}
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
    </>
  );
};

export default Sidebar;
