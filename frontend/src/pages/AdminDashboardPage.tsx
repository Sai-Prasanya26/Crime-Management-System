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
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  ANALYST: 'bg-amber-50 text-[#B7791F] border-amber-200',
  OFFICER: 'bg-emerald-50 text-[#16805C] border-emerald-200',
  INVESTIGATOR: 'bg-blue-50 text-[#1D4ED8] border-blue-200',
  SUPERVISOR: 'bg-slate-100 text-slate-700 border-slate-200',
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

  const handleToggleStatus = async (userToUpdate: User) => {
    setStatusActionId(userToUpdate.id);
    setActionMessage(null);
    try {
      const newStatus = !userToUpdate.is_active;
      const updatedUser = await authApi.updateUserStatus(userToUpdate.id, newStatus);
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === userToUpdate.id ? { ...u, is_active: updatedUser.is_active } : u))
      );
      setActionMessage({
        type: 'success',
        text: `Account for ${userToUpdate.full_name} (${userToUpdate.username}) ${
          newStatus ? 'activated' : 'deactivated'
        } successfully.`,
      });
      loadAuditData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to update user account status.',
      });
    } finally {
      setStatusActionId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.fullName.trim()) {
      setFormError('Full legal name is required.');
      return;
    }
    if (!createForm.username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setFormError('A valid official email is required.');
      return;
    }
    if (createForm.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingUser(true);

    try {
      const created = await authApi.createStaff({
        full_name: createForm.fullName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        is_active: createForm.isActive,
      });

      setStaffUsers((prev) => [created, ...prev]);
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
        text: `Staff account successfully created for ${created.full_name} (@${created.username}) with ${created.role} clearance.`,
      });
      loadAuditData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to provision staff account. Please verify details.');
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
      subtitle="Manage authorized staff access, roles and security activity."
      onRefresh={verifyAdminStatus}
      isRefreshing={isLoading}
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingState message="Verifying administrative clearance with backend server..." />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Admin Verification Status Banner */}
          {adminVerified ? (
            <div className="flex items-center justify-between rounded-lg border border-[#DCE2EA] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="rounded p-2 bg-emerald-50 text-[#16805C]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#172033]">
                    Administrator Clearance Confirmed
                  </h3>
                  <p className="text-[12px] text-[#5B6577] mt-0.5">
                    Session: <span className="font-semibold text-[#172033]">{adminUser?.full_name}</span> (@{adminUser?.username}) &bull; Role: <span className="font-bold text-purple-700">ADMIN</span>
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16805C] border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                VERIFIED ADMIN
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="rounded p-2 bg-red-100 text-[#C53030]">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#C53030]">Admin Verification Failed</h3>
                  <p className="text-[12px] text-red-700 mt-0.5">{verificationError}</p>
                </div>
              </div>
              <button
                onClick={verifyAdminStatus}
                className="rounded-md bg-[#C53030] px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 transition-colors cursor-pointer"
              >
                Retry Check
              </button>
            </div>
          )}

          {/* Action Notification Alert */}
          {actionMessage && (
            <div
              className={`flex items-center justify-between rounded-md border p-3 text-[13px] font-medium ${
                actionMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-3 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center border-b border-[#DCE2EA] gap-5 h-10">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 pb-2 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-[#5B6577] hover:text-[#172033]'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Staff Accounts ({staffUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 pb-2 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-[#5B6577] hover:text-[#172033]'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Access &amp; Roles</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 pb-2 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-[#5B6577] hover:text-[#172033]'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Audit Log</span>
            </button>
          </div>

          {/* TAB 1: STAFF USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-3.5">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-lg border border-[#DCE2EA] bg-white p-3 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search staff by name, email, role..."
                    className="w-full h-10 rounded-md border border-[#DCE2EA] bg-white py-1.5 pl-9 pr-3 text-[13px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={loadStaffData}
                    disabled={loadingUsers}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#DCE2EA] bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
                    title="Refresh staff list"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormError(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3.5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#1E40AF] transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Provision Staff Account</span>
                  </button>
                </div>
              </div>

              {/* Staff Accounts Table */}
              <div className="overflow-hidden rounded-lg border border-[#DCE2EA] bg-white shadow-2xs">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-[#5B6577] border-b border-[#DCE2EA]">
                    <tr>
                      <th className="py-2.5 px-3.5">Staff Member</th>
                      <th className="py-2.5 px-3.5">Official Email</th>
                      <th className="py-2.5 px-3.5">Assigned Role</th>
                      <th className="py-2.5 px-3.5">Account Status</th>
                      <th className="py-2.5 px-3.5">Last Login</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1D4ED8] mb-2" />
                          <span className="text-xs font-medium">Loading personnel records...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-500 font-medium">
                          No staff accounts matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-[#172033] leading-tight">{member.full_name}</div>
                            <div className="text-[11px] font-mono text-[#5B6577] mt-0.5">@{member.username}</div>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[12px] text-slate-600">{member.email}</td>
                          <td className="py-2.5 px-3.5">
                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                ROLE_STYLES[member.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {member.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16805C]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-[12px] text-slate-500">
                            {member.last_login_at
                              ? new Date(member.last_login_at).toLocaleString()
                              : 'No login recorded'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {member.id === currentUser?.id ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">Current Session</span>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(member)}
                                disabled={statusActionId === member.id}
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                                  member.is_active
                                    ? 'border-red-200 bg-red-50 text-[#C53030] hover:bg-red-100'
                                    : 'border-emerald-200 bg-emerald-50 text-[#16805C] hover:bg-emerald-100'
                                }`}
                              >
                                {statusActionId === member.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin inline" />
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Authenticated Admin Identity */}
              <div className="rounded-lg border border-[#DCE2EA] bg-white p-4.5 shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="rounded p-1.5 bg-blue-50 text-[#1D4ED8]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#172033]">Administrator Session Identity</h3>
                    <p className="text-[12px] text-[#5B6577]">Active operational clearance credentials</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5 text-[12px]">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-[#5B6577]">Full Legal Name</span>
                    <span className="font-semibold text-[#172033]">
                      {adminUser?.full_name ?? currentUser?.full_name ?? 'Chief System Administrator'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-[#5B6577]">Username</span>
                    <span className="font-mono font-semibold text-[#1D4ED8]">
                      @{adminUser?.username ?? currentUser?.username ?? 'admin'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-[#5B6577]">Email Address</span>
                    <span className="font-mono text-slate-700">
                      {adminUser?.email ?? currentUser?.email ?? 'admin@crimeops.gov.in'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-[#5B6577]">Clearance Role</span>
                    <span className="rounded bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 border border-purple-200">
                      {adminUser?.role ?? currentUser?.role ?? 'ADMIN'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-[#5B6577]">Account Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#16805C]">
                      <CheckCircle2 className="h-3 w-3" /> Active &amp; Verified
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#5B6577]">Last Authentication</span>
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
              <div className="rounded-lg border border-[#DCE2EA] bg-white p-4.5 shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="rounded p-1.5 bg-purple-50 text-purple-700">
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#172033]">Access Control Matrix (RBAC)</h3>
                    <p className="text-[12px] text-[#5B6577]">Operational boundaries strictly enforced across API &amp; UI</p>
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded border border-[#DCE2EA]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-[#5B6577] border-b border-[#DCE2EA]">
                      <tr>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Operational Scope</th>
                        <th className="py-2 px-3">User Mgmt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-700">ADMIN</td>
                        <td className="py-2 px-3">Full system administration, security, analytics</td>
                        <td className="py-2 px-3 font-semibold text-[#16805C]">Full Access</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#B7791F]">ANALYST</td>
                        <td className="py-2 px-3">Crime analytics, temporal trends, risk assessment</td>
                        <td className="py-2 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-[#16805C]">OFFICER</td>
                        <td className="py-2 px-3">Field intelligence, district summaries, reports</td>
                        <td className="py-2 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-blue-700">INVESTIGATOR</td>
                        <td className="py-2 px-3">Case intelligence, specialized incident analysis</td>
                        <td className="py-2 px-3 text-slate-400">Restricted</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-700">SUPERVISOR</td>
                        <td className="py-2 px-3">Jurisdiction oversight, resource planning, reporting</td>
                        <td className="py-2 px-3 text-slate-400">Restricted</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="overflow-hidden rounded-lg border border-[#DCE2EA] bg-white shadow-2xs">
              <div className="p-3 border-b border-[#DCE2EA] flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[#172033]">Security Audit Log</h3>
                  <p className="text-[12px] text-[#5B6577]">Recent authentication, staff provisioning, and credential events</p>
                </div>
                <button
                  onClick={loadAuditData}
                  disabled={loadingAudit}
                  className="inline-flex items-center gap-1.5 rounded border border-[#DCE2EA] bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingAudit ? 'animate-spin' : ''}`} />
                  <span>Refresh Log</span>
                </button>
              </div>

              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-[#5B6577] border-b border-[#DCE2EA]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-[#1D4ED8] mb-1.5" />
                        <span>Loading audit records...</span>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-wider ${
                              log.action.includes('FAILURE') || log.action.includes('INACTIVE')
                                ? 'bg-red-50 text-[#C53030] border border-red-200'
                                : log.action.includes('SUCCESS') || log.action.includes('CREATED') || log.action === 'CREATE'
                                ? 'bg-emerald-50 text-[#16805C] border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#172033]">{log.entity_type}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                          {log.details ? JSON.stringify(log.details) : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CREATE STAFF ACCOUNT MODAL */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-[520px] rounded-xl border border-[#DCE2EA] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#DCE2EA] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded p-2 bg-blue-50 text-[#1D4ED8]">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[20px] font-bold text-[#172033]">Provision Staff Account</h3>
                      <p className="text-[12px] text-[#5B6577]">Authorize and provision verified operational personnel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {formError && (
                  <div className="mt-3.5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-[#C53030]">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[#172033] mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="e.g. Officer Rajesh Verma"
                      required
                      className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={createForm.username}
                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                        placeholder="e.g. rverma"
                        required
                        className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="rverma@crimeops.gov.in"
                        required
                        className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Assigned Role
                      </label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                        className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[13px] font-medium text-[#172033] shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] cursor-pointer"
                      >
                        <option value="OFFICER">OFFICER (Field Operations &amp; Intelligence)</option>
                        <option value="ANALYST">ANALYST (Crime Trends &amp; Analytics)</option>
                        <option value="INVESTIGATOR">INVESTIGATOR (Case Intelligence)</option>
                        <option value="SUPERVISOR">SUPERVISOR (Jurisdiction Oversight)</option>
                        <option value="ADMIN">ADMIN (Full System Administration)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#172033] mb-1">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Min 6 characters"
                        required
                        className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-1.5 px-3 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={createForm.isActive}
                      onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                    />
                    <label htmlFor="isActive" className="text-[13px] font-medium text-[#172033] cursor-pointer">
                      Activate account immediately upon provisioning
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2.5 pt-3.5 border-t border-[#DCE2EA]">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="h-10 rounded-md border border-[#DCE2EA] px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUser}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#1D4ED8] px-4.5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#1E40AF] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingUser ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
