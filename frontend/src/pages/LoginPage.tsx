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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12 text-[#0F172A] selection:bg-[#4F46E5] selection:text-white">
      <div className="w-full max-w-md">
        {/* Return to Portal Link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Portal Overview</span>
        </Link>

        {/* Login Container Card */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          {/* Header & Badging */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-xs">
              <Shield className="h-6 w-6 text-indigo-400" />
            </div>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-[#0F172A]">
              Secure Staff Access
            </h1>

            <p className="mt-1 text-xs font-semibold text-[#4F46E5]">
              Crime Intelligence & Management Portal
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Authorized personnel only</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-[#FEF2F2] p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#B91C1C] mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username-or-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username or Official Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#64748B]">
                  <UserIcon className="h-4 w-4" />
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
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#64748B]">
                  <Lock className="h-4 w-4" />
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
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-10 text-xs text-[#0F172A] placeholder-slate-400 shadow-2xs focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#64748B] hover:text-[#0F172A]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In Securely</span>
              )}
            </button>
          </form>

          {/* Staff Access Guidance */}
          <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              <span>Need access?</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Contact your system administrator to have an authorized staff account created.
            </p>
          </div>

          {/* Operational Security Notice */}
          <div className="mt-5 border-t border-[#E2E8F0] pt-4 text-center">
            <p className="text-[11px] font-medium text-slate-500">
              Access is restricted to authorized crime-management personnel.
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Protected operational access &bull; All authentication events are monitored and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
