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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <LoadingState message="Verifying secure access credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <div className="rounded-full bg-rose-500/10 p-4 text-rose-400 border border-rose-500/20">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Access Restricted</h2>
        <p className="mt-2 max-w-md text-xs text-slate-400">
          Your current security role (<span className="font-mono font-bold text-rose-400">{user.role}</span>) does not have clearance for this operational view. Required role(s): {allowedRoles.join(', ')}.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
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
