import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Home,
  UserRound,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import UserAccountMenu from '../components/layout/UserAccountMenu';

const formatMemberSince = (isoString?: string | null): string => {
  if (!isoString) return 'Not Available';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

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

  // Sync initial values from user state
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
      setProfileErrorMsg('Full Name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 100) {
      setProfileErrorMsg('Full Name cannot exceed 100 characters.');
      return;
    }

    const emailRegex = /^[\w.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setProfileErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updatedUser = await authApi.updateProfile({
        full_name: trimmedName,
        email: trimmedEmail,
      });

      // Update AuthContext so Header and user menus update immediately
      updateUser(updatedUser);
      setProfileSuccessMsg('Profile details updated successfully.');
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
      setPasswordErrorMsg('New password must be at least 6 characters.');
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

      setPasswordSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errorDetail = err?.response?.data?.detail || err?.message || 'Current password is incorrect.';
      setPasswordErrorMsg(errorDetail);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* ======================================================== */}
      {/* 1. DEDICATED PROFILE HEADER: Clean, No Operational Clutter */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white h-[68px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="w-[calc(100%-48px)] max-w-[1240px] mx-auto h-full flex items-center justify-between gap-4">
          {/* LEFT: [Shield Logo] My Profile + Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-white shrink-0 shadow-2xs">
              <Shield className="h-5 w-5 text-[#1D7FE2]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-[#0B1F3A] leading-tight truncate">
                My Profile
              </h1>
              <p className="text-[11.5px] sm:text-xs text-[#5D6878] leading-tight mt-0.5 truncate hidden sm:block">
                Manage your personal information and account security.
              </p>
            </div>
          </div>

          {/* RIGHT: [Home Link (42–44px)] + [User Account Menu (42–44px)] */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-[#D9E1EA] bg-white px-4 text-[13px] font-semibold text-[#172033] hover:bg-[#F4F7FA] hover:text-[#1769AA] hover:border-[#BAC7D5] transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Return to Homepage"
            >
              <Home className="h-4 w-4 text-[#1769AA]" />
              <span>Home</span>
            </Link>

            <UserAccountMenu triggerClassName="h-[42px] px-3" />
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN PROFILE CONTENT: Two-Column Dedicated Layout     */}
      {/* ======================================================== */}
      <main className="w-[calc(100%-48px)] max-w-[1240px] mx-auto py-8 sm:py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,32%)_minmax(0,68%)] gap-6 items-start">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN: Profile Summary (Compact Card, ~32%)    */}
          {/* ---------------------------------------------------- */}
          <div>
            <div className="rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
              {/* Avatar, Name, Role Badge */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0B1F3A] text-xl font-bold text-white shadow-xs ring-4 ring-[#EAF3FA]">
                  {userInitial}
                </div>
                <h2 className="text-base font-bold text-[#0B1F3A] mt-2.5 leading-snug">
                  {user?.full_name || 'Staff User'}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200 mt-1">
                  {user?.role || 'OFFICER'}
                </span>
              </div>

              {/* Clean Horizontal Divider */}
              <div className="my-4 border-t border-[#E5EAF0]" />

              {/* Essential User Details List */}
              <div className="space-y-3.5 text-left">
                {/* FULL NAME */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Full Name
                  </p>
                  <p className="text-sm font-semibold text-[#0B1F3A] mt-0.5">
                    {user?.full_name || 'N/A'}
                  </p>
                </div>

                {/* USERNAME */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Username
                  </p>
                  <p className="text-sm font-mono font-medium text-[#0B1F3A] mt-0.5">
                    {user?.username || 'N/A'}
                  </p>
                </div>

                {/* EMAIL */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-sm font-mono font-medium text-[#0B1F3A] mt-0.5 truncate" title={user?.email}>
                    {user?.email || 'N/A'}
                  </p>
                </div>

                {/* ROLE */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-[#0B1F3A] mt-0.5">
                    {user?.role || 'N/A'}
                  </p>
                </div>

                {/* STATUS */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Status
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${user?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-[#0B1F3A]">
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* MEMBER SINCE */}
                <div>
                  <p className="text-[11px] font-bold text-[#5D6878] uppercase tracking-wider">
                    Member Since
                  </p>
                  <p className="text-sm font-medium text-[#0B1F3A] mt-0.5">
                    {formatMemberSince(user?.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN: Editable Content (~68%)                */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-6 w-full">
            {/* Card 1: PERSONAL INFORMATION (Primary / Large Card) */}
            <div className="w-full rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
              <div className="border-b border-[#E5EAF0] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4.5 w-4.5 text-[#1769AA]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A]">
                    Personal Information
                  </h3>
                </div>
                <p className="text-xs text-[#5D6878] mt-1">
                  Update your name and email address.
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="profileFullName"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="profileFullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="profileEmail"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="profileEmail"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full rounded-lg border border-[#D9E1EA] bg-white px-3.5 py-2 text-xs font-mono font-medium text-[#0B1F3A] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResetProfile}
                    disabled={isUpdatingProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1EA] bg-white px-4 py-2 text-xs font-semibold text-[#5D6878] hover:bg-[#F4F7FA] hover:text-[#0B1F3A] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5 text-[#1D7FE2]" />
                    <span>{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: CHANGE PASSWORD (Smaller Card) */}
            <div className="w-full rounded-xl border border-[#D9E1EA] bg-white p-6 shadow-2xs">
              <div className="border-b border-[#E5EAF0] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4.5 w-4.5 text-[#1769AA]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A]">
                    Change Password
                  </h3>
                </div>
                <p className="text-xs text-[#5D6878] mt-1">
                  Update your account password.
                </p>
              </div>

              {passwordSuccessMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-800">
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
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPasswordInput"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
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
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="newPasswordInput"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
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
                    <p className="text-[11px] text-[#718096] mt-1.5">
                      Use at least 6 characters.
                    </p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label
                      htmlFor="confirmPasswordInput"
                      className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPasswordInput"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
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
                  </div>
                </div>

                {/* Form Action */}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-[#1D7FE2]" />
                    <span>{isChangingPassword ? 'Changing Password...' : 'Change Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. SUBTLE PROFILE FOOTER                                */}
      {/* ======================================================== */}
      <footer className="border-t border-[#D9E1EA] bg-white py-3.5 text-center text-[11.5px] text-[#64748B]">
        <div className="w-[calc(100%-48px)] max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Crime Intelligence &amp; Management Portal &bull; Staff Profile &amp; Account Management</span>
          <span className="text-[#5D6878]">Authorized Personnel Only</span>
        </div>
      </footer>
    </div>
  );
};

export default ProfilePage;
