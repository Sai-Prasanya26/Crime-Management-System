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
  KeyRound,
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
      setErrorMessage(err?.message || 'Invalid username/email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradient */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Return to Home link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </Link>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          {/* Brand & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
              Law Enforcement Portal
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Data-Driven Crime Management & AI Resource Optimization
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Official Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. admin or officer@crimeops.gov.in"
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-10 text-xs text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Authenticate & Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Pill Bar */}
          <div className="mt-8 border-t border-slate-800/80 pt-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              <span>Quick Role Demo Access:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'Admin@12345')}
                className="flex flex-col items-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-center hover:bg-indigo-500/20 transition-colors"
              >
                <span className="text-[10px] font-bold text-indigo-300">ADMIN</span>
                <span className="text-[9px] text-slate-400">Chief Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('analyst', 'Analyst@12345')}
                className="flex flex-col items-center rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center hover:bg-amber-500/20 transition-colors"
              >
                <span className="text-[10px] font-bold text-amber-300">ANALYST</span>
                <span className="text-[9px] text-slate-400">Data Analyst</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('officer', 'Officer@12345')}
                className="flex flex-col items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center hover:bg-emerald-500/20 transition-colors"
              >
                <span className="text-[10px] font-bold text-emerald-300">OFFICER</span>
                <span className="text-[9px] text-slate-400">Patrol Officer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-6 text-center text-[11px] text-slate-500">
          Argon2id Password Hashing &bull; HS256 JWT Access Tokens &bull; Role-Based Authorization
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
