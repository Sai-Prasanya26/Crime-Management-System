import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        username_or_email: usernameOrEmail.trim(),
        password,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] [background-image:radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] px-4 py-12 text-[#0F172A] selection:bg-[#4F46E5] selection:text-white">
      <div className="w-full max-w-[480px]">
        {/* Return to Portal Link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Portal Overview</span>
        </Link>

        {/* Login Container Card */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          {/* Header & Badging */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-md">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>

            <h1 className="mt-5 text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#0F172A]">
              Secure Staff Access
            </h1>

            <p className="mt-1.5 text-sm sm:text-base font-semibold text-[#4F46E5]">
              Crime Intelligence &amp; Management Portal
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Authorized personnel only</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-[#FEF2F2] p-3.5 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-[#B91C1C] mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="username-or-email"
                className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-2"
              >
                Username or Official Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="username-or-email"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter assigned username or email"
                  disabled={isLoading}
                  autoComplete="username"
                  required
                  className="w-full min-h-[50px] rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm sm:text-[15px] font-semibold text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                  className="w-full min-h-[50px] rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-11 text-base text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3.5 text-base font-bold text-white shadow-sm hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In Securely</span>
              )}
            </button>
          </form>

          {/* Staff Access Guidance */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm sm:text-[15px] font-bold text-slate-800">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span>Need access?</span>
            </div>
            <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-slate-600">
              Contact your system administrator to have an authorized staff account created.
            </p>
          </div>

          {/* Operational Security Notice */}
          <div className="mt-6 border-t border-[#E2E8F0] pt-5 text-center">
            <p className="text-xs sm:text-[13px] font-medium text-slate-600">
              Access is restricted to authorized crime-management personnel.
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              Protected operational access &bull; All authentication events are monitored and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
