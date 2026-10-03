import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hideSidebar?: boolean;
  children: React.ReactNode;
}

const DEDICATED_OPERATION_ROUTES = [
  '/analytics',
  '/districts',
  '/trends',
  '/risk',
  '/predictions',
  '/resources',
  '/budget',
  '/reports',
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  icon,
  onRefresh,
  isRefreshing,
  hideSidebar,
  children,
}) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDashboardFullscreen =
    location.pathname === '/dashboard' &&
    (location.search.includes('workspace=fullscreen') ||
      location.search.includes('fullscreen=true'));

  // Dedicated operation workspace: sidebar hidden, full width workspace
  const isOperationWorkspace =
    hideSidebar !== undefined
      ? hideSidebar
      : DEDICATED_OPERATION_ROUTES.includes(location.pathname) ||
        isDashboardFullscreen;

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#172033] flex flex-col">
      {/* Sidebar navigation: rendered only in normal portal workspace mode */}
      {!isOperationWorkspace && (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div
        className={`${
          isOperationWorkspace ? 'pl-0' : 'lg:pl-[240px] pl-0'
        } flex flex-col min-h-screen min-w-0 w-full transition-all`}
      >
        <Header
          title={title}
          subtitle={subtitle}
          icon={icon}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          hideSidebar={isOperationWorkspace}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 min-w-0 w-full">
          <div
            className={`mx-auto ${
              isOperationWorkspace ? 'max-w-[1680px]' : 'max-w-[1600px]'
            } w-full space-y-4 sm:space-y-5 min-w-0`}
          >
            {children}
          </div>
        </main>

        {/* Subtle Operational Footer */}
        <footer className="border-t border-[#D9E1EA] bg-white px-4 sm:px-6 py-3 mt-auto">
          <div
            className={`mx-auto ${
              isOperationWorkspace ? 'max-w-[1680px]' : 'max-w-[1600px]'
            } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#64748B]`}
          >
            <div className="min-w-0">
              <span className="font-semibold text-[#172033]">Crime Intelligence &amp; Management Portal</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span className="text-[#5D6878]">
                {isOperationWorkspace ? 'Dedicated Operation Workspace' : 'Operations & Analysis Center'}
              </span>
              <span className="hidden md:inline mx-1.5 text-slate-300">&bull;</span>
              <span className="block md:inline mt-0.5 md:mt-0 font-normal text-[#64748B]">
                Data-Driven Crime Management System with AI-Based Resource Optimization
              </span>
            </div>
            <div className="text-[11px] text-[#5D6878] shrink-0 font-medium">
              Restricted Law Enforcement Operations
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
