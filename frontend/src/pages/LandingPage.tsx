import React from 'react';
import {
  Shield,
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Lock,
  Search,
  FileText,
  BarChart3,
  CalendarClock,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const scrollToCapabilities = (e: React.MouseEvent) => {
    e.preventDefault();
    const elem = document.getElementById('capabilities');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const capabilities = [
    {
      title: 'Crime Analytics',
      description:
        'Analyze crime patterns across jurisdictions, categories, time periods and incident characteristics.',
      icon: BarChart3,
      tag: 'Analytics',
    },
    {
      title: 'Trend Intelligence',
      description:
        'Identify temporal patterns and emerging crime trends using historical and predictive analysis.',
      icon: TrendingUp,
      tag: 'Trends',
    },
    {
      title: 'Risk Intelligence',
      description:
        'Assess jurisdiction-level crime risk using multiple analytical indicators.',
      icon: MapPin,
      tag: 'Jurisdictions',
    },
    {
      title: 'Resource Planning',
      description:
        'Support evidence-based operational resource planning based on crime patterns and projected demand.',
      icon: CalendarClock,
      tag: 'Planning',
    },
    {
      title: 'Investigation Support',
      description:
        'Provide authorized personnel with structured intelligence to support investigation and operational decisions.',
      icon: Search,
      tag: 'Investigation',
    },
    {
      title: 'Reports & Intelligence',
      description:
        'Generate structured intelligence reports for operational review and planning.',
      icon: FileText,
      tag: 'Reports',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between selection:bg-[#4F46E5] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-xs">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#0F172A] block leading-tight">
                Crime Intelligence Portal
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#64748B] uppercase block">
                Law Enforcement & Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <Link to="/" className="text-[#4F46E5] transition-colors">
              Home
            </Link>
            <Link to="/dashboard" className="hover:text-[#0F172A] transition-colors">
              Crime Analytics
            </Link>
            <Link to="/trends" className="hover:text-[#0F172A] transition-colors">
              Crime Trends
            </Link>
            <Link to="/districts" className="hover:text-[#0F172A] transition-colors">
              Risk Intelligence
            </Link>
            <a href="#capabilities" onClick={scrollToCapabilities} className="hover:text-[#0F172A] transition-colors">
              Resource Planning
            </a>
            <a href="#capabilities" onClick={scrollToCapabilities} className="hover:text-[#0F172A] transition-colors">
              Reports
            </a>
          </nav>

          {/* Auth State / Sign In CTA */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span>{user.full_name}</span>
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-[#E2E8F0] p-2 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Secure Staff Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center max-w-5xl mx-auto">
          {/* Operational Security Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#4F46E5] shadow-2xs mb-8">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Authorized Law Enforcement Intelligence Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0F172A] max-w-4xl mx-auto leading-[1.15]">
            Crime Intelligence & Management Portal
          </h1>

          {/* Tagline */}
          <p className="mt-4 text-xl sm:text-2xl font-semibold text-[#4F46E5] max-w-3xl mx-auto">
            Transforming crime data into actionable intelligence.
          </p>

          {/* Supporting Description */}
          <p className="mt-6 text-[#64748B] max-w-3xl mx-auto text-base sm:text-lg leading-relaxed font-normal">
            An integrated platform for authorized personnel to analyze crime patterns, monitor emerging trends, assess jurisdictional risk, and support evidence-based operational planning.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Access Crime Intelligence</span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </Link>

            <a
              href="#capabilities"
              onClick={scrollToCapabilities}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F172A] shadow-xs transition-all"
            >
              <span>Explore Capabilities</span>
            </a>
          </div>

          {/* Trust & Operational Pillars */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-[#0F172A]">Jurisdictional Coverage</div>
              <p className="mt-1 text-xs text-[#64748B]">
                Macro-level multi-year patterns and district-level comparative analytics.
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-[#0F172A]">Role-Based Access</div>
              <p className="mt-1 text-xs text-[#64748B]">
                Controlled staff clearance with end-to-end security audit trail.
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-[#0F172A]">Operational Planning</div>
              <p className="mt-1 text-xs text-[#64748B]">
                Evidence-driven decision support for resource deployment and prevention.
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities Grid Section */}
        <section id="capabilities" className="border-t border-[#E2E8F0] bg-white py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
                Platform Capabilities
              </h2>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A]">
                Structured Intelligence for Law Enforcement
              </p>
              <p className="mt-3 text-sm text-[#64748B]">
                Delivering actionable analytical modules tailored for command officers, investigation teams, and crime analysts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 hover:bg-white hover:border-slate-300 shadow-2xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-[#E2E8F0] text-[#4F46E5] shadow-2xs">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                          {cap.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A]">{cap.title}</h3>
                      <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                        {cap.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Authorized Personnel</span>
                      <Link
                        to={isAuthenticated ? '/dashboard' : '/login'}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                      >
                        <span>Access</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Access Restriction Notice */}
            <div className="mt-12 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 text-center text-xs text-[#64748B]">
              <p className="font-medium text-slate-700">
                Notice: Access to detailed operational intelligence is restricted to verified law enforcement and analytical personnel.
              </p>
              <p className="mt-1">
                Accounts are provisioned by system administrators. Public registration is not permitted.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Crime Intelligence & Management Portal</span>
            <span>&bull; Restricted Law Enforcement Platform</span>
          </div>
          <div>
            Authorized personnel only &bull; Unauthorized access is prohibited and subject to monitoring.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
