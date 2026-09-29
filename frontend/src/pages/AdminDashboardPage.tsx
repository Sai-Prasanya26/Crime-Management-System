import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  Users,
  Lock,
  Server,
  Activity,
  CheckCircle2,
  Clock,
  Key,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import type { User } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminVerified, setAdminVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const verifyAdminStatus = async () => {
    setIsLoading(true);
    setVerificationError(null);
    try {
      const verifiedProfile = await authApi.checkAdmin();
      setAdminUser(verifiedProfile);
      setAdminVerified(true);
    } catch (err: unknown) {
      setAdminVerified(false);
      const message =
        err instanceof Error ? err.message : 'Administrative credential verification failed.';
      setVerificationError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyAdminStatus();
  }, []);

  return (
    <DashboardLayout
      title="System Administration & Security"
      subtitle="Role-Based Access Control • Database Health & Security Audit"
      onRefresh={verifyAdminStatus}
      isRefreshing={isLoading}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingState message="Verifying administrative clearance with backend server..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admin Verification Status Banner */}
          {adminVerified ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Administrator Clearance Confirmed
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Backend endpoint <code className="font-mono text-[11px] bg-emerald-100 px-1 py-0.5 rounded">GET /api/v1/auth/admin-check</code> verified your ADMIN role. Full access granted.
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                VERIFIED ADMIN
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">Admin Verification Failed</h3>
                  <p className="text-xs text-rose-700">{verificationError}</p>
                </div>
              </div>
              <button
                onClick={verifyAdminStatus}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Retry Check
              </button>
            </div>
          )}

          {/* Core System Indicators */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Database
                </span>
                <Database className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">crime_management_db</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>MySQL 8.0 • Connected</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Incidents
                </span>
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">191,679</p>
              <p className="mt-2 text-xs text-slate-500">2020-01-01 to 2025-12-31</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Districts & Geography
                </span>
                <Server className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">789 Districts</p>
              <p className="mt-2 text-xs text-slate-500">36 States & UTs (28 + 8)</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Security Scheme
                </span>
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">JWT + Argon2</p>
              <p className="mt-2 text-xs text-slate-500">Role-Based Access Control</p>
            </div>
          </div>

          {/* User Profile & Security Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Authenticated Admin Identity */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Admin Account Profile</h3>
                  <p className="text-xs text-slate-500">Active session credentials and metadata</p>
                </div>
              </div>

              <div className="mt-5 space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">User ID</span>
                  <span className="font-mono font-bold text-slate-800">
                    {adminUser?.id ?? currentUser?.id ?? 1}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">Username</span>
                  <span className="font-mono font-bold text-indigo-600">
                    @{adminUser?.username ?? currentUser?.username ?? 'admin'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">Full Name</span>
                  <span className="font-bold text-slate-900">
                    {adminUser?.full_name ?? currentUser?.full_name ?? 'System Administrator'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">Email Address</span>
                  <span className="font-mono text-slate-700">
                    {adminUser?.email ?? currentUser?.email ?? 'admin@crimeops.gov.in'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">System Role</span>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 border border-indigo-200">
                    {adminUser?.role ?? currentUser?.role ?? 'ADMIN'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="font-medium text-slate-500">Account Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="font-medium text-slate-500">Last Login</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {adminUser?.last_login_at
                      ? new Date(adminUser.last_login_at).toLocaleString()
                      : 'Current Session'}
                  </span>
                </div>
              </div>
            </div>

            {/* RBAC Role Clearance Matrix */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Access Control Matrix (RBAC)</h3>
                  <p className="text-xs text-slate-500">Security clearance boundaries by role</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3 text-indigo-700">ADMIN</th>
                      <th className="py-2.5 px-3 text-amber-700">ANALYST</th>
                      <th className="py-2.5 px-3 text-emerald-700">OFFICER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900">System Admin & Config</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                      <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900">Historical Analytics</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900">Longitudinal Trends</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-slate-600">Read-Only</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900">Modern Geography (789)</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-slate-600">Read-Only</td>
                      <td className="py-2.5 px-3 text-slate-600">Read-Only</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-900">Official NCRB Statistics</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">Full</td>
                      <td className="py-2.5 px-3 text-slate-600">Read-Only</td>
                      <td className="py-2.5 px-3 text-slate-600">Read-Only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
