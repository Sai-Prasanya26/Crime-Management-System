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
      <div className="pl-[240px]">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="p-4 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
