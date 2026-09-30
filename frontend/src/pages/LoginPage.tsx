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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8FB] [background-image:radial-gradient(#DCE2EA_1px,transparent_1px)] [background-size:20px_20px] px-4 py-8 text-[#172033] selection:bg-[#1D4ED8] selection:text-white">
      <div className="w-full max-w-[420px]">
        {/* Return to Portal Link */}
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6577] hover:text-[#172033] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Portal Overview</span>
        </Link>

        {/* Login Container Card */}
        <div className="rounded-xl border border-[#DCE2EA] bg-white p-6 sm:p-7 shadow-sm">
          {/* Header & Badging */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#172033] text-white">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>

            <h1 className="mt-3 text-[24px] font-bold tracking-tight text-[#172033] leading-tight">
              Secure Staff Access
            </h1>

            <p className="mt-1 text-[14px] font-medium text-[#5B6577]">
              Crime Intelligence &amp; Management Portal
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-[#DCE2EA]">
              <ShieldCheck className="h-3 w-3 text-[#16805C]" />
              <span>Authorized personnel only.</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-[#C53030]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div>
              <label
                htmlFor="username-or-email"
                className="block text-[13px] font-medium text-[#172033] mb-1"
              >
                Username or Official Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8492A6]">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  id="username-or-email"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter username or email"
                  disabled={isLoading}
                  autoComplete="username"
                  required
                  className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-2 pl-9 pr-3 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#172033] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8492A6]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                  className="w-full h-11 rounded-md border border-[#DCE2EA] bg-white py-2 pl-9 pr-10 text-[14px] text-[#172033] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8492A6] hover:text-[#172033]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-11 rounded-md bg-[#1D4ED8] text-white text-[14px] font-semibold hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-1 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In Securely</span>
              )}
            </button>
          </form>

          {/* Need access callout */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <p className="text-[13px] font-semibold text-[#172033]">
              Need access?
            </p>
            <p className="text-[12px] text-[#5B6577] mt-0.5 leading-relaxed">
              Contact your system administrator to have an authorized staff account created.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
