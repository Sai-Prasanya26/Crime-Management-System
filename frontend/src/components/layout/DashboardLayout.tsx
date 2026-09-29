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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
