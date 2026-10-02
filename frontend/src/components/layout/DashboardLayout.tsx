import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#172033]">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-[240px] flex flex-col min-h-screen min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 sm:p-5 lg:p-6 min-w-0">
          <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5 min-w-0">{children}</div>
        </main>

        {/* Subtle Operational Footer */}
        <footer className="border-t border-[#D9E1EA] bg-white px-5 sm:px-6 py-3 mt-auto">
          <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <div className="min-w-0">
              <span className="font-semibold text-[#172033]">Crime Intelligence &amp; Management Portal</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span className="text-[#5D6878]">Operations &amp; Analysis Center</span>
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
