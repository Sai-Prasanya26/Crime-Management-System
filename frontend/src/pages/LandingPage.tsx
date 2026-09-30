import React from 'react';
import {
  Shield,
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Lock,
  BarChart3,
  AlertTriangle,
  UserCheck,
  LogOut,
  ShieldCheck,
  CheckCircle2,
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

  const capabilities = [
    {
      number: '01',
      title: 'Crime Intelligence',
      description: 'Analyse historical incidents and identify patterns across jurisdictions.',
      icon: BarChart3,
      image: '/assets/crime-intelligence/cyber-investigation.jpg',
      link: '/dashboard',
      actionText: 'View Incident Analytics',
    },
    {
      number: '02',
      title: 'Geographic Intelligence',
      description: 'Explore crime distribution across states and districts.',
      icon: MapPin,
      image: '/assets/crime-intelligence/geographic-intelligence.jpg',
      link: '/districts',
      actionText: 'View Jurisdictions',
    },
    {
      number: '03',
      title: 'Risk Assessment',
      description: 'Identify areas requiring closer operational attention.',
      icon: AlertTriangle,
      image: '/assets/crime-intelligence/risk-assessment.jpg',
      link: '/districts',
      actionText: 'Assess Risk Levels',
    },
    {
      number: '04',
      title: 'Predictive Intelligence',
      description: 'Use historical patterns to support future crime forecasting.',
      icon: TrendingUp,
      image: '/assets/crime-intelligence/predictive-intelligence.jpg',
      link: '/trends',
      actionText: 'Review Forecasting',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white px-5 sm:px-6 h-15 flex items-center">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0B1F3A] text-white">
              <Shield className="h-4 w-4 text-[#1D7FE2]" />
            </div>
            <div>
              <span className="font-bold text-[14px] tracking-tight text-[#0B1F3A] block leading-tight">
                Crime Intelligence &amp; Management Portal
              </span>
              <span className="text-[11px] font-medium text-[#5D6878] block leading-none mt-0.5">
                Restricted Operational Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#5D6878]">
            <Link to="/" className="text-[#1769AA] font-semibold">
              Home
            </Link>
            <Link to="/dashboard" className="hover:text-[#0B1F3A] transition-colors">
              Crime Intelligence
            </Link>
            <Link to="/districts" className="hover:text-[#0B1F3A] transition-colors">
              Geographic Intelligence
            </Link>
            <Link to="/trends" className="hover:text-[#0B1F3A] transition-colors">
              Crime Trends
            </Link>
            <a href="#capabilities" className="hover:text-[#0B1F3A] transition-colors">
              Capabilities
            </a>
          </nav>

          {/* Auth State / Sign In CTA */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded border border-[#D9E1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>{user.full_name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded border border-[#D9E1EA] p-1.5 text-[#5D6878] hover:bg-slate-50 hover:text-[#C53B3B] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded bg-[#0B1F3A] px-3.5 text-xs font-semibold text-white hover:bg-[#12345B] transition-colors shadow-2xs"
              >
                <Lock className="h-3.5 w-3.5 text-[#1D7FE2]" />
                <span>Access Staff Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Institutional Hero Section: Two-Column Layout */}
        <section className="border-b border-[#D9E1EA] bg-white py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Mission & Operational Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#EAF3FA] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#1769AA] uppercase">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CRIME INTELLIGENCE &amp; MANAGEMENT</span>
              </div>

              <h1 className="text-[28px] sm:text-[34px] md:text-[38px] font-bold tracking-tight text-[#0B1F3A] leading-[1.18]">
                Transforming Crime Data into Actionable Intelligence
              </h1>

              <p className="text-[14px] sm:text-[15px] text-[#5D6878] leading-relaxed max-w-xl">
                A secure intelligence platform for analysing crime patterns, assessing risk and supporting data-driven operational planning.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  className="inline-flex h-10 items-center gap-2 rounded bg-[#0B1F3A] px-5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors"
                >
                  <Lock className="h-4 w-4 text-[#1D7FE2]" />
                  <span>Access Staff Portal</span>
                </Link>

                <Link
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  className="inline-flex h-10 items-center gap-2 rounded border border-[#D9E1EA] bg-white px-5 text-[13px] font-medium text-[#172033] hover:bg-[#F4F7FA] transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#1769AA]" />
                  <span>Explore Intelligence</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#5D6878]" />
                </Link>
              </div>

              {/* Security Credential Notice */}
              <div className="pt-2 flex items-center gap-2 text-[12px] text-[#5D6878]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
                <span>Authorized personnel only &bull; End-to-end audit tracking enabled</span>
              </div>
            </div>

            {/* Right Column: High Quality Crime Intelligence Visual */}
            <div className="lg:col-span-5">
              <div className="relative rounded-lg border border-[#D9E1EA] overflow-hidden bg-[#0B1F3A] shadow-xs">
                <img
                  src="/assets/crime-intelligence/crime-intelligence-hero.jpg"
                  alt="Crime Intelligence Operations Center"
                  className="w-full h-[260px] sm:h-[300px] object-cover"
                  onError={(e) => {
                    // Graceful fallback if image unavailable
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/90 via-[#0B1F3A]/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                  <span className="font-semibold bg-[#0B1F3A]/85 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10">
                    ● Intelligence Command Center
                  </span>
                  <span className="text-slate-300 font-medium">
                    Tactical Operations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligence Capabilities Section */}
        <section id="capabilities" className="py-10 max-w-6xl mx-auto px-5">
          <div className="text-left mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              Platform Modules
            </p>
            <h2 className="text-[20px] font-bold text-[#0B1F3A] mt-0.5">
              Intelligence Capabilities
            </h2>
            <p className="text-[13px] text-[#5D6878] mt-0.5">
              Structured operational workflows supporting incident analysis, spatial monitoring, and resource coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.number}
                  className="rounded-lg border border-[#D9E1EA] bg-white overflow-hidden flex flex-col justify-between hover:border-[#1769AA]/40 transition-colors shadow-2xs"
                >
                  {/* Visual Header Image */}
                  <div className="relative h-32 w-full overflow-hidden bg-[#0B1F3A]">
                    <img
                      src={cap.image}
                      alt={cap.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#0B1F3A]/85 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-bold text-[#1D7FE2]">
                      <span>{cap.number}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#0B1F3A]">
                        <Icon className="h-4 w-4 text-[#1769AA] shrink-0" />
                        <h3 className="text-[15px] font-bold leading-tight">
                          {cap.title}
                        </h3>
                      </div>
                      <p className="text-[12px] sm:text-[13px] text-[#5D6878] mt-2 leading-relaxed">
                        {cap.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#D9E1EA]">
                      <Link
                        to={cap.link}
                        className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] flex items-center justify-between group transition-colors"
                      >
                        <span>{cap.actionText}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9E1EA] bg-white py-5 px-5 text-xs text-[#5D6878]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1769AA]" />
            <span className="font-semibold text-[#0B1F3A]">Crime Intelligence &amp; Management Portal</span>
            <span>&bull; Operational Access Level</span>
          </div>
          <p className="text-[11px] text-[#7C8796]">
            Authorized Personnel Only &bull; All sessions monitored and audited
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
