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
  CheckCircle2,
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
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-center items-center px-4 py-8 sm:px-6 selection:bg-[#1769AA] selection:text-white">
      {/* Return to Portal Link */}
      <div className="w-full max-w-[880px] mb-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5D6878] hover:text-[#0B1F3A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Portal Overview</span>
        </Link>
      </div>

      {/* Split Layout Container */}
      <div className="w-full max-w-[880px] overflow-hidden rounded-lg border border-[#D9E1EA] bg-white shadow-xs grid grid-cols-1 md:grid-cols-12 min-h-[490px]">
        {/* LEFT PANE: Dark Navy Visual Area (5 cols) */}
        <div className="relative hidden md:flex md:col-span-5 flex-col justify-between p-7 bg-[#0B1F3A] text-white overflow-hidden">
          {/* Background Image with Dark Navy Gradient */}
          <img
            src="/assets/crime-intelligence/security-operations.jpg"
            alt="Security Operations Center"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1F3A]/95 via-[#0B1F3A]/85 to-[#0B1F3A]/95 pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#1769AA] text-white mb-4">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-[20px] font-bold leading-tight tracking-tight text-white">
              Crime Intelligence Portal
            </h2>
            <p className="mt-1 text-[13px] text-[#1D7FE2] font-semibold tracking-wide uppercase">
              Secure Operational Access
            </p>
          </div>

          {/* Operational Badges */}
          <div className="relative z-10 space-y-2.5 pt-6 border-t border-white/10 text-[12px] text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
              <span>Cryptographic Session Auditing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
              <span>Authorized Law Enforcement Use</span>
            </div>
          </div>

          {/* System Footer Notice */}
          <div className="relative z-10 pt-4 text-[11px] text-slate-400">
            <span>Operational Console &bull; Restricted Access</span>
          </div>
        </div>

        {/* RIGHT PANE: White Login Panel (7 cols) */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[360px] mx-auto">
            {/* Header with ShieldCheck Icon */}
            <div>
              <div className="flex items-center gap-2.5 text-[#0B1F3A] mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#EAF3FA] text-[#1769AA]">
                  <ShieldCheck className="h-5 w-5 text-[#1769AA]" />
                </div>
                <h1 className="text-[22px] sm:text-[23px] font-bold tracking-tight text-[#0B1F3A]">
                  Secure Staff Access
                </h1>
              </div>
              <p className="text-[13px] text-[#5D6878] pl-10.5">
                Authorized personnel only.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-2.5 rounded border border-[#C53B3B]/30 bg-red-50 p-2.5 text-xs text-[#C53B3B]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <div>
                <label
                  htmlFor="username-or-email"
                  className="block text-[13px] font-medium text-[#172033] mb-1"
                >
                  Username or Official Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7C8796]">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="username-or-email"
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Enter username or official email"
                    disabled={isLoading}
                    autoComplete="username"
                    required
                    className="w-full h-[46px] rounded border border-[#D9E1EA] bg-white py-2 pl-9 pr-3 text-[14px] text-[#172033] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-50"
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
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7C8796]">
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
                    className="w-full h-[46px] rounded border border-[#D9E1EA] bg-white py-2 pl-9 pr-10 text-[14px] text-[#172033] placeholder-slate-400 focus:border-[#1769AA] focus:outline-none focus:ring-1 focus:ring-[#1769AA] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7C8796] hover:text-[#172033] cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full h-[46px] rounded bg-[#0B1F3A] text-white text-[13.5px] font-semibold hover:bg-[#12345B] focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:ring-offset-1 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D7FE2]" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-[#1D7FE2]" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Need access callout */}
            <div className="mt-6 border-t border-[#D9E1EA] pt-4 text-center">
              <p className="text-[13px] font-semibold text-[#0B1F3A]">
                Need access?
              </p>
              <p className="text-[12px] text-[#5D6878] mt-0.5 leading-relaxed">
                Contact your system administrator to have an authorized staff account created.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
