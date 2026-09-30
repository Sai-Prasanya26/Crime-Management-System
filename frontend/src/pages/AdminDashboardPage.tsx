import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserPlus,
  Key,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  FileText,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import type { User, UserRole, SecurityAuditLog } from '../types';

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ANALYST: 'bg-amber-50 text-amber-700 border-amber-200',
  OFFICER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVESTIGATOR: 'bg-purple-50 text-purple-700 border-purple-200',
  SUPERVISOR: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminVerified, setAdminVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Tab State: 'users' | 'security' | 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'audit'>('users');

  // Staff Account Management State
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [statusActionId, setStatusActionId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Staff Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'OFFICER' as UserRole,
    isActive: true,
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const loadStaffData = async () => {
    setLoadingUsers(true);
    try {
      const users = await authApi.getUsers();
      setStaffUsers(users);
    } catch (err: any) {
      console.error('Failed to load staff accounts:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditData = async () => {
    setLoadingAudit(true);
    try {
      const logs = await authApi.getAuditLogs(30);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const verifyAdminStatus = async () => {
    setIsLoading(true);
    setVerificationError(null);
    try {
      const verifiedProfile = await authApi.checkAdmin();
      setAdminUser(verifiedProfile);
      setAdminVerified(true);
      await Promise.all([loadStaffData(), loadAuditData()]);
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

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      setActionMessage({
        type: 'error',
        text: 'Administrators cannot deactivate their own active account.',
      });
      return;
    }

    setStatusActionId(targetUser.id);
    setActionMessage(null);

    try {
      const updated = await authApi.updateUserStatus(targetUser.id, !targetUser.is_active);
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, is_active: updated.is_active } : u))
      );
      setActionMessage({
        type: 'success',
        text: `Account @${targetUser.username} ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
      });
      // Refresh audit logs
      loadAuditData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to update account status.',
      });
    } finally {
      setStatusActionId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.fullName.trim() || !createForm.username.trim() || !createForm.email.trim() || !createForm.password) {
      setFormError('All fields are required.');
      return;
    }

    if (createForm.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingUser(true);

    try {
      const newUser = await authApi.createStaff({
        full_name: createForm.fullName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        is_active: createForm.isActive,
      });

      setStaffUsers((prev) => [...prev, newUser]);
      setIsCreateModalOpen(false);
      setCreateForm({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'OFFICER',
        isActive: true,
      });
      setActionMessage({
        type: 'success',
        text: `Staff account created successfully. ${newUser.full_name} has been provisioned as an ${newUser.role}.`,
      });
      loadAuditData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create staff account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = staffUsers.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout
      title="System Administration"
      subtitle="Authorized Staff Account Provisioning • Role-Based Access Control • Audit Logs"
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
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    Administrator Clearance Confirmed
                  </h3>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Active Session: <span className="font-bold">{adminUser?.full_name}</span> (@{adminUser?.username}) &bull; Role: <span className="font-extrabold">ADMIN</span>
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                VERIFIED ADMIN
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950">Admin Verification Failed</h3>
                  <p className="text-sm text-rose-800 mt-0.5">{verificationError}</p>
                </div>
              </div>
              <button
                onClick={verifyAdminStatus}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Retry Clearance Check
              </button>
            </div>
          )}

          {/* Action Notification Alert */}
          {actionMessage && (
            <div
              className={`flex items-center justify-between rounded-xl border p-4.5 text-sm font-medium ${
                actionMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-4 text-base"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center border-b border-[#E2E8F0] gap-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 pb-3.5 text-[15px] font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Staff Accounts ({staffUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 pb-3.5 text-[15px] font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Key className="h-4.5 w-4.5" />
              <span>Access &amp; Roles</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 pb-3.5 text-[15px] font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4.5 w-4.5" />
              <span>Audit Log</span>
            </button>
          </div>

          {/* TAB 1: STAFF USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search staff by name, email, role..."
                    className="w-full min-h-[46px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-[15px] text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={loadStaffData}
                    disabled={loadingUsers}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
                    title="Refresh staff list"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormError(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm sm:text-[15px] font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-4.5 w-4.5" />
                    <span>Create Staff Account</span>
                  </button>
                </div>
              </div>

              {/* Staff Accounts Table */}
              <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-600 border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-4 px-5">Staff Member</th>
                      <th className="py-4 px-5">Official Email</th>
                      <th className="py-4 px-5">Assigned Role</th>
                      <th className="py-4 px-5">Account Status</th>
                      <th className="py-4 px-5">Last Login</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-slate-700">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#4F46E5] mb-2.5" />
                          <span className="text-sm font-medium">Loading authorized personnel records...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-slate-500 font-medium">
                          No staff accounts matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4.5 px-5">
                            <div className="text-sm sm:text-base font-bold text-[#0F172A]">{member.full_name}</div>
                            <div className="text-xs sm:text-[13px] font-mono text-[#64748B] mt-0.5">@{member.username}</div>
                          </td>
                          <td className="py-4.5 px-5 font-mono text-sm sm:text-[15px] text-slate-600">{member.email}</td>
                          <td className="py-4.5 px-5">
                            <span
                              className={`rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                ROLE_STYLES[member.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="py-4.5 px-5">
                            {member.is_active ? (
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-4.5 px-5 text-sm text-slate-500">
                            {member.last_login_at
                              ? new Date(member.last_login_at).toLocaleString()
                              : 'No login recorded'}
                          </td>
                          <td className="py-4.5 px-5 text-right">
                            {member.id === currentUser?.id ? (
                              <span className="text-xs font-semibold text-slate-400 italic">Current Session</span>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(member)}
                                disabled={statusActionId === member.id}
                                className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                                  member.is_active
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {statusActionId === member.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                                ) : member.is_active ? (
                                  'Deactivate'
                                ) : (
                                  'Activate'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC MATRIX & ADMIN IDENTITY */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Authenticated Admin Identity */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-[#4F46E5]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Administrator Session Identity</h3>
                    <p className="text-xs text-[#64748B]">Active operational clearance credentials</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-500">Official Full Name</span>
                    <span className="font-bold text-[#0F172A]">
                      {adminUser?.full_name ?? currentUser?.full_name ?? 'System Administrator'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-500">Username</span>
                    <span className="font-mono font-bold text-[#4F46E5]">
                      @{adminUser?.username ?? currentUser?.username ?? 'admin'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-500">Email Address</span>
                    <span className="font-mono text-slate-700">
                      {adminUser?.email ?? currentUser?.email ?? 'admin@crimeops.gov.in'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-500">Clearance Role</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 border border-indigo-200">
                      {adminUser?.role ?? currentUser?.role ?? 'ADMIN'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-500">Account Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Active & Verified
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="font-medium text-slate-500">Last Authentication</span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {adminUser?.last_login_at
                        ? new Date(adminUser.last_login_at).toLocaleString()
                        : 'Current Active Session'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RBAC Role Clearance Matrix */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Access Control Matrix (RBAC)</h3>
                    <p className="text-xs text-[#64748B]">Operational boundaries strictly enforced across API & UI</p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-[#E2E8F0]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase text-slate-600 border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Operational Scope</th>
                        <th className="py-2.5 px-3">User Mgmt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-slate-600">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-indigo-700">ADMIN</td>
                        <td className="py-2.5 px-3">Full system administration, security, analytics</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">Full Access</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-amber-700">ANALYST</td>
                        <td className="py-2.5 px-3">Crime analytics, temporal trends, risk assessment</td>
                        <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">OFFICER</td>
                        <td className="py-2.5 px-3">Field intelligence, district summaries, reports</td>
                        <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-purple-700">INVESTIGATOR</td>
                        <td className="py-2.5 px-3">Case intelligence, specialized incident analysis</td>
                        <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-blue-700">SUPERVISOR</td>
                        <td className="py-2.5 px-3">Jurisdiction oversight, resource planning, reporting</td>
                        <td className="py-2.5 px-3 text-slate-400">Restricted</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Security Audit Log</h3>
                  <p className="text-xs text-[#64748B]">Recent authentication, staff provisioning, and credential events</p>
                </div>
                <button
                  onClick={loadAuditData}
                  disabled={loadingAudit}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  <span>Refresh Log</span>
                </button>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase text-slate-600 border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-slate-700">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#4F46E5] mb-2" />
                        <span>Loading security audit records...</span>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4.5 px-5 font-mono text-sm text-slate-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-4.5 px-5">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold font-mono tracking-wider ${
                              log.action.includes('FAILURE') || log.action.includes('INACTIVE')
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : log.action.includes('SUCCESS') || log.action.includes('CREATED') || log.action === 'CREATE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4.5 px-5 font-bold text-sm sm:text-[15px] text-slate-800">{log.entity_type}</td>
                        <td className="py-4.5 px-5 font-mono text-xs sm:text-[13px] text-slate-600">
                          {log.details ? JSON.stringify(log.details) : 'N/A'}
                        </td>
                        <td className="py-4.5 px-5 font-mono text-xs sm:text-sm text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CREATE STAFF ACCOUNT MODAL */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-[560px] rounded-2xl border border-[#E2E8F0] bg-white p-7 sm:p-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4.5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2.5 text-[#4F46E5]">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Provision Staff Account</h3>
                      <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Authorize and provision verified operational personnel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {formError && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-[#FEF2F2] p-3.5 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="mt-5 space-y-4.5">
                  <div>
                    <label className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="e.g. Officer Rajesh Verma"
                      required
                      className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        value={createForm.username}
                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                        placeholder="e.g. rverma"
                        required
                        className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-1.5">
                        Official Email
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="rverma@crimeops.gov.in"
                        required
                        className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-1.5">
                        Assigned Role
                      </label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                        className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-[15px] font-medium text-[#0F172A] shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
                      >
                        <option value="OFFICER">OFFICER (Field Operations &amp; Intelligence)</option>
                        <option value="ANALYST">ANALYST (Crime Trends &amp; Analytics)</option>
                        <option value="INVESTIGATOR">INVESTIGATOR (Case Intelligence)</option>
                        <option value="SUPERVISOR">SUPERVISOR (Jurisdiction Oversight)</option>
                        <option value="ADMIN">ADMIN (Full System Administration)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-1.5">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Min 6 characters"
                        required
                        className="w-full min-h-[48px] rounded-xl border border-[#E2E8F0] bg-white py-2.5 px-4 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={createForm.isActive}
                      onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Activate account immediately upon provisioning
                    </label>
                  </div>

                  <div className="mt-7 flex items-center justify-end gap-3 pt-5 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="min-h-[46px] rounded-xl border border-[#E2E8F0] px-5 py-2.5 text-sm sm:text-[15px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUser}
                      className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm sm:text-[15px] font-semibold text-white shadow-xs hover:bg-[#4338CA] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingUser ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Provisioning Account...</span>
                        </>
                      ) : (
                        <span>Create Staff Account</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
