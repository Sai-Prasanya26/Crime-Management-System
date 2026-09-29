import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import LoadingState from '../common/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <LoadingState message="Verifying secure access credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center text-[#0F172A]">
        <div className="rounded-full bg-rose-50 p-4 text-[#DC2626] border border-rose-200">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#0F172A]">Access Restricted</h2>
        <p className="mt-2 max-w-md text-xs text-[#64748B]">
          Your current security role (<span className="font-mono font-bold text-rose-600">{user.role}</span>) does not have clearance for this operational view. Required role(s): {allowedRoles.join(', ')}.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Intelligence Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
