import React, { useState, useEffect } from 'react';
import {
  UserRound,
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';

const ROLE_METADATA: Record<string, { label: string; badge: string; description: string }> = {
  ADMIN: {
    label: 'Chief System Administrator',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Full administrative authority across user provisioning, audit logging, and system configurations.',
  },
  ANALYST: {
    label: 'Crime Intelligence Analyst',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Authorized access to longitudinal crime analytics, forecasting models, and incident distribution reports.',
  },
  OFFICER: {
    label: 'Law Enforcement Officer',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Field officer access for jurisdictional crime monitoring, patrol tracking, and incident review.',
  },
  INVESTIGATOR: {
    label: 'Senior Crime Investigator',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Specialized investigative access for detailed incident dossiers, weapon analytics, and case clearance.',
  },
  SUPERVISOR: {
    label: 'Divisional Operations Supervisor',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Supervisory oversight for resource optimization, patrol allocation, and operational intelligence.',
  },
};

const formatDate = (isoString?: string | null): string => {
  if (!isoString) return 'Not Available';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Sync initial profile values from user state
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Handle Profile Update Submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setProfileErrorMsg('Full Name must be at least 2 characters long.');
      return;
    }
    if (trimmedName.length > 100) {
      setProfileErrorMsg('Full Name cannot exceed 100 characters.');
      return;
    }

    const emailRegex = /^[\w.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setProfileErrorMsg('Please enter a valid official email address.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updatedUser = await authApi.updateProfile({
        full_name: trimmedName,
        email: trimmedEmail,
      });

      // Update AuthContext so Header and Sidebar update instantaneously
      updateUser(updatedUser);
      setProfileSuccessMsg('Profile details successfully updated. All administrative records synchronized.');
    } catch (err: any) {
      const errorDetail = err?.response?.data?.detail || err?.message || 'Failed to update profile details.';
      setProfileErrorMsg(errorDetail);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Reset Profile Form
  const handleResetProfile = () => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setProfileSuccessMsg(null);
      setProfileErrorMsg(null);
    }
  };

  // Handle Password Change Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPasswordSuccessMsg('Your account password has been updated securely. Future logins will require the new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errorDetail = err?.response?.data?.detail || err?.message || 'Failed to change password. Please verify current password.';
      setPasswordErrorMsg(errorDetail);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const roleMeta = (user?.role && ROLE_METADATA[user.role]) || {
    label: user?.role || 'Staff Member',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Authorized law enforcement and analytics portal access.',
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <DashboardLayout
      title="User Profile & Account Security"
      subtitle="Manage your personal staff credentials, official contact details, and account security"
      onRefresh={refreshUser}
    >
      <div className="space-y-6 pb-12 max-w-6xl mx-auto">
        {/* Top Operational Identity Banner */}
        <div className="rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B1F3A] text-2xl font-bold text-white shadow-sm ring-4 ring-[#EAF3FA] shrink-0">
                {userInitial}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-[#0B1F3A]">
                    {user?.full_name || 'Staff User'}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleMeta.badge}`}
                  >
                    {user?.role}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </div>
                <p className="text-xs text-[#5D6878] mt-1 font-mono">
                  Official Account: <span className="font-semibold text-[#0B1F3A]">@{user?.username}</span> &bull; Staff ID: #{user?.id ? String(user.id).padStart(4, '0') : '0000'}
                </p>
                <p className="text-xs text-[#5D6878] mt-0.5">
                  {roleMeta.description}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-end gap-1.5 shrink-0 text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9E1EA]">
              <div className="flex items-center gap-1.5 text-xs text-[#5D6878]">
                <Clock className="h-3.5 w-3.5 text-[#1769AA]" />
                <span>Last login:</span>
              </div>
              <span className="text-xs font-semibold text-[#0B1F3A]">
                {formatDate(user?.last_login_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Read-Only System Identity & Permissions (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-[#D9E1EA] bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-[#E5EAF0] pb-3 mb-4">
                <ShieldCheck className="h-5 w-5 text-[#1769AA]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A]">
                  Account Overview
                </h3>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider block">
                    Full Name
                  </label>
                  <p className="text-sm font-semibold text-[#0B1F3A] mt-0.5">
                    {user?.full_name || 'N/A'}
                  </p>
                </div>

                {/* Username */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider block">
                      Username
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                      <Lock className="h-2.5 w-2.5" /> Immutable
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-[#F4F7FA] border border-[#D9E1EA] px-3 py-1.5">
                    <span className="text-xs font-mono font-semibold text-[#0B1F3A]">
                      @{user?.username}
                    </span>
                    <span className="text-[10px] text-[#718096] uppercase font-semibold">
                      System ID
                    </span>
                  </div>
                </div>

                {/* Official Email */}
                <div>
                  <label className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider block">
                    Official Email
                  </label>
                  <p className="text-xs font-mono font-medium text-[#0B1F3A] mt-0.5 truncate" title={user?.email}>
                    {user?.email || 'N/A'}
                  </p>
                </div>

                {/* System Role */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider block">
                      System Role
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                      <Lock className="h-2.5 w-2.5" /> Admin Only
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-[#F4F7FA] border border-[#D9E1EA] px-3 py-1.5">
                    <span className="text-xs font-semibold text-[#0B1F3A]">
                      {roleMeta.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${roleMeta.badge}`}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                {/* Account Status */}
                <div>
                  <label className="text-[11px] font-semibold text-[#5D6878] uppercase tracking-wider block">
                    Account Status
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-emerald-800">
                      ACTIVE &bull; Full Clearance
                    </span>
                  </div>
                </div>

                {/* Account Created Date */}
                <div className="pt-2 border-t border-[#E5EAF0]">
                  <div className="flex items-center gap-1.5 text-xs text-[#5D6878]">
                    <Calendar className="h-3.5 w-3.5 text-[#1769AA]" />
                    <span>Account Created:</span>
                  </div>
                  <p className="text-xs font-semibold text-[#0B1F3A] mt-0.5">
                    {formatDate(user?.created_at)}
                  </p>
                </div>

                {/* Last Refreshed / Updated */}
                {user?.updated_at && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#5D6878]">
                      <Sparkles className="h-3.5 w-3.5 text-[#1769AA]" />
                      <span>Last Modified:</span>
                    </div>
                    <p className="text-xs font-semibold text-[#0B1F3A] mt-0.5">
                      {formatDate(user?.updated_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Policy Notice Box */}
              <div className="mt-5 rounded-lg bg-[#EAF3FA]/60 border border-[#BAC7D5] p-3 text-[11.5px] text-[#415065] leading-relaxed">
                <div className="flex items-start gap-1.5 font-semibold text-[#1769AA] mb-0.5">
                  <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Security &amp; Governance Policy</span>
                </div>
                User identifiers, assigned roles, and operational clearance levels are governed strictly by the Chief Administrator to prevent privilege escalation.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Edit Profile Details + Change Password (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: Edit Profile Form */}
            <div className="rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-[#1769AA]" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A]">
                      Edit Personal Profile Details
                    </h3>
                    <p className="text-xs text-[#5D6878]">
                      Update your displayed legal name and official contact email address.
                    </p>
                  </div>
                </div>
              </div>

              {profileSuccessMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-medium text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-800 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name Input */}
                  <div>
                    <label
                      htmlFor="fullNameInput"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="fullNameInput"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Chief Inspector Rajesh Sharma"
                        className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                      />
                    </div>
                    <p className="text-[10.5px] text-[#718096] mt-1">
                      Minimum 2 characters, maximum 100 characters.
                    </p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="emailInput"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Official Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="emailInput"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rajesh.sharma@crimeops.gov.in"
                        className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 text-xs font-mono font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                      />
                    </div>
                    <p className="text-[10.5px] text-[#718096] mt-1">
                      Must be unique across all system staff members.
                    </p>
                  </div>
                </div>

                {/* Read-Only Non-Editable Info Strip */}
                <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-[#64748B] block">
                      Username (Immutable)
                    </span>
                    <span className="text-xs font-mono font-bold text-[#334155] mt-0.5 block">
                      @{user?.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-[#64748B] block">
                      Role (Admin Governed)
                    </span>
                    <span className="text-xs font-bold text-[#334155] mt-0.5 block">
                      {user?.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-[#64748B] block">
                      Database Sync
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">
                      Active (Bi-directional)
                    </span>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetProfile}
                    disabled={isUpdatingProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-4 py-2 text-xs font-semibold text-[#5D6878] hover:bg-[#F4F7FA] hover:text-[#0B1F3A] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5 text-[#1D7FE2]" />
                    <span>{isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Change Password Form */}
            <div className="rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#1769AA]" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A]">
                      Change Account Password
                    </h3>
                    <p className="text-xs text-[#5D6878]">
                      Update your account authentication credential using Argon2id cryptographic hashing.
                    </p>
                  </div>
                </div>
              </div>

              {passwordSuccessMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-medium text-emerald-800 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-800 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label
                    htmlFor="currentPasswordInput"
                    className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                  >
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="currentPasswordInput"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your existing account password"
                      className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 pr-10 text-xs font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="newPasswordInput"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="newPasswordInput"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 pr-10 text-xs font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10.5px] text-[#718096] mt-1">
                      Must be at least 6 characters.
                    </p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label
                      htmlFor="confirmPasswordInput"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPasswordInput"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 pr-10 text-xs font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10.5px] text-[#718096] mt-1">
                      Must match the new password entered on the left.
                    </p>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-[#1D7FE2]" />
                    <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
