import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  LockKeyhole,
  ScanSearch,
  MapPinned,
  ShieldAlert,
  TrendingUp,
  CarFront,
  FileSearch,
  UserRound,
  LogOut,
  ShieldCheck,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 6 Rich Operational Modules (3 columns on desktop, 2 on tablet, 1 on mobile)
  const capabilityModules = [
    {
      number: '01',
      title: 'Crime Intelligence',
      description:
        'Analyse historical incidents and identify patterns across jurisdictions.',
      icon: ScanSearch,
      image: '/assets/crime-intelligence/cyber-investigation.jpg',
      link: '/dashboard',
      actionText: 'View Analytics',
    },
    {
      number: '02',
      title: 'Geographic Intelligence',
      description:
        'Explore crime distribution across states and districts.',
      icon: MapPinned,
      image: '/assets/crime-intelligence/geographic-intelligence.jpg',
      link: '/districts',
      actionText: 'Explore Jurisdictions',
    },
    {
      number: '03',
      title: 'Risk Assessment',
      description:
        'Assess jurisdiction-level crime indicators and risk levels.',
      icon: ShieldAlert,
      image: '/assets/crime-intelligence/risk-assessment.jpg',
      link: '/risk',
      actionText: 'Assess Risk',
    },
    {
      number: '04',
      title: 'Predictive Intelligence',
      description:
        'Analyse historical patterns and support future crime forecasting.',
      icon: TrendingUp,
      image: '/assets/crime-intelligence/predictive-intelligence.jpg',
      link: '/predictions',
      actionText: 'View Forecasts',
    },
    {
      number: '05',
      title: 'Resource Optimization',
      description:
        'Support operational resource planning across jurisdictions.',
      icon: CarFront,
      image: '/assets/crime-intelligence/resource-optimization.jpg',
      link: '/resources',
      actionText: 'View Resources',
    },
    {
      number: '06',
      title: 'Intelligence Reports',
      description:
        'Review structured analytical summaries and operational reports.',
      icon: FileSearch,
      image: '/assets/crime-intelligence/intelligence-reports.jpg',
      link: '/reports',
      actionText: 'View Reports',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* 1. Professional Header: 3 clearly separated zones (Brand, Navigation, User) */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white h-16 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1440px] w-full mx-auto h-full px-6 sm:px-8 flex items-center justify-between">
          {/* ZONE 1: LEFT BRAND AREA (width ~300-330px, margin-right 32-40px) */}
          <div className="flex items-center gap-3.5 shrink-0 mr-6 lg:mr-10 min-w-[280px] max-w-[340px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-white shrink-0">
              <Shield className="h-5 w-5 text-[#1D7FE2]" />
            </div>
            <div className="min-w-0">
              <Link to="/" className="block">
                <span className="font-bold text-[15px] sm:text-[16px] tracking-tight text-[#0B1F3A] block leading-tight truncate">
                  Crime Intelligence &amp; Management Portal
                </span>
                <span className="text-[11.5px] font-medium text-[#5D6878] block leading-none mt-1">
                  Operations &amp; Analysis Center
                </span>
              </Link>
            </div>
          </div>

          {/* ZONE 2: CENTER PRIMARY NAVIGATION (gap 24-28px, font 13-14px, weight 500, color #536174, active #1769AA) */}
          <nav className="hidden xl:flex items-center justify-center gap-6 lg:gap-7 flex-1">
            <Link
              to="/"
              className="text-[13.5px] font-semibold text-[#1769AA] border-b-2 border-[#1769AA] pb-1"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="text-[13.5px] font-medium text-[#536174] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Crime Intelligence
            </Link>
            <Link
              to="/districts"
              className="text-[13.5px] font-medium text-[#536174] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Geographic Intelligence
            </Link>
            <Link
              to="/trends"
              className="text-[13.5px] font-medium text-[#536174] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Crime Trends
            </Link>
            <a
              href="#modules"
              className="text-[13.5px] font-medium text-[#536174] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Capabilities
            </a>
          </nav>

          {/* ZONE 3: RIGHT AUTHENTICATED USER CONTROLS (far right, gap 12-16px between identity & logout) */}
          <div className="hidden lg:flex items-center justify-end shrink-0 gap-3 ml-auto">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* User identity container */}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 rounded-lg border border-[#D9E1EA] bg-white py-1.5 pl-2 pr-2.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF3FA] text-[#1769AA] shrink-0">
                    <UserRound className="h-4.5 w-4.5 text-[#1769AA]" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[13px] font-semibold text-[#172033] leading-tight truncate max-w-[170px]">
                      {user.full_name}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-[11px] font-semibold bg-[#EEF2F6] text-[#415065] border border-[#D9E1EA]/60 uppercase tracking-wide shrink-0">
                    {user.role}
                  </span>
                </Link>

                {/* Dedicated square logout button */}
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D9E1EA] bg-white text-[#536174] hover:bg-[#EAF3FA] hover:text-[#1769AA] hover:border-[#1769AA]/40 transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-9 sm:h-10 items-center gap-2 rounded bg-[#0B1F3A] px-4 text-[13px] font-semibold text-white hover:bg-[#12345B] transition-colors shadow-2xs"
              >
                <LockKeyhole className="h-3.5 w-3.5 text-[#1D7FE2]" />
                <span>Access Staff Portal</span>
              </Link>
            )}
          </div>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex xl:hidden items-center gap-2 ml-auto">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D9E1EA] bg-white text-[#536174] hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-[#D9E1EA] bg-white px-6 py-4 space-y-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-2 text-[14px]">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-[#1769AA] py-1"
              >
                Home
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#536174] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Crime Intelligence
              </Link>
              <Link
                to="/districts"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#536174] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Geographic Intelligence
              </Link>
              <Link
                to="/trends"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#536174] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Crime Trends
              </Link>
              <a
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#536174] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Capabilities
              </a>
            </nav>

            <div className="pt-3 border-t border-[#D9E1EA]">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF3FA] text-[#1769AA]">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#172033]">{user.full_name}</p>
                      <span className="text-[11px] font-semibold text-[#415065] uppercase">{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#D9E1EA] text-[#536174] hover:bg-[#EAF3FA] hover:text-[#C53B3B]"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded bg-[#0B1F3A] text-white text-[13px] font-semibold"
                >
                  <LockKeyhole className="h-3.5 w-3.5 text-[#1D7FE2]" />
                  <span>Access Staff Portal</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Strong Two-Column Hero (aligned to max-w-[1440px]) */}
        <section className="border-b border-[#D9E1EA] bg-white py-10 md:py-14">
          <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 54%: Mission & Operational Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#EAF3FA] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#1769AA] uppercase">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CRIME INTELLIGENCE &amp; MANAGEMENT</span>
              </div>

              <h1 className="text-[30px] sm:text-[34px] md:text-[38px] font-bold tracking-tight text-[#0B1F3A] leading-[1.18]">
                Transforming Crime Data
                <br />
                into Actionable Intelligence
              </h1>

              <p className="text-[14px] sm:text-[15px] text-[#5D6878] leading-relaxed max-w-2xl">
                A secure operational platform for analysing crime patterns, understanding jurisdictional risk and supporting data-driven resource planning.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  className="inline-flex h-10 items-center gap-2 rounded bg-[#0B1F3A] px-5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors"
                >
                  <LockKeyhole className="h-4 w-4 text-[#1D7FE2]" />
                  <span>Access Staff Portal</span>
                </Link>

                <Link
                  to="/dashboard"
                  className="inline-flex h-10 items-center gap-2 rounded border border-[#D9E1EA] bg-white px-5 text-[13px] font-medium text-[#0B1F3A] hover:bg-[#F4F7FA] transition-colors"
                >
                  <span>Explore Intelligence</span>
                  <ArrowRight className="h-4 w-4 text-[#1769AA]" />
                </Link>
              </div>

              {/* Security Indicators with Lucide Icons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-[12px] text-[#5D6878]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
                  <span className="font-medium text-[#172033]">Secure Staff Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span className="font-medium text-[#172033]">Role-Based Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-[#C98512]" />
                  <span className="font-medium text-[#172033]">Audit Trail</span>
                </div>
              </div>
            </div>

            {/* Right 46%: Large Realistic Crime-Intelligence Image */}
            <div className="lg:col-span-5 flex justify-end">
              <div className="relative rounded-[10px] border border-[#D9E1EA] overflow-hidden bg-[#0B1F3A] shadow-xs w-full max-w-[560px] max-h-[360px]">
                <img
                  src="/assets/crime-intelligence/crime-intelligence-hero.jpg"
                  alt="Crime Intelligence Operations Center"
                  className="w-full h-[280px] sm:h-[340px] object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/80 via-[#0B1F3A]/20 to-transparent pointer-events-none" />

                {/* Professional Operational Status Label (No fake statistics or fake live alerts) */}
                <div className="absolute bottom-3 left-3 bg-[#0B1F3A]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 text-[11px] font-semibold tracking-wide text-slate-200">
                  INTELLIGENCE OPERATIONS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Intelligence Capabilities Grid (aligned to max-w-[1440px]) */}
        <section id="modules" className="py-12 max-w-[1440px] w-full mx-auto px-6 sm:px-8">
          <div className="text-left mb-7">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              INTELLIGENCE CAPABILITIES
            </p>
            <h2 className="text-[22px] font-bold text-[#0B1F3A] mt-0.5">
              Intelligence Capabilities
            </h2>
            <p className="text-[13px] text-[#5D6878] mt-0.5">
              Explore the platform&apos;s core analytical and operational capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {capabilityModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.number}
                  className="rounded-lg border border-[#D9E1EA] bg-white overflow-hidden flex flex-col justify-between hover:border-[#1769AA] hover:-translate-y-1 transition-all duration-200 shadow-2xs h-[350px] sm:h-[365px]"
                >
                  {/* Top Image (180px) with Badges */}
                  <div className="relative h-[180px] w-full overflow-hidden bg-[#0B1F3A] shrink-0">
                    <img
                      src={module.image}
                      alt={module.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/85 via-transparent to-transparent pointer-events-none" />

                    {/* Top Left Numbered Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-[#0B1F3A]/90 backdrop-blur-xs px-2.5 py-0.5 rounded text-[11px] font-bold text-white border border-white/10 font-mono">
                      <span>{module.number}</span>
                    </div>

                    {/* Top Right Lucide Icon Overlay */}
                    <div className="absolute top-2.5 right-2.5 bg-[#0B1F3A]/90 backdrop-blur-xs p-1.5 rounded text-[#1D7FE2] border border-white/10">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-[#EAF3FA] text-[#1769AA] flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-[15px] font-bold text-[#0B1F3A] leading-tight">
                          {module.title}
                        </h3>
                      </div>
                      <p className="text-[12px] sm:text-[13px] text-[#5D6878] mt-2.5 leading-relaxed">
                        {module.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#D9E1EA]">
                      <Link
                        to={module.link}
                        className="text-[12px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] flex items-center justify-between group transition-colors"
                      >
                        <span>{module.actionText}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Small Professional Operational-Information Section (aligned to max-w-[1440px]) */}
        <section className="pb-12 max-w-[1440px] w-full mx-auto px-6 sm:px-8">
          <div className="rounded-lg border border-[#D9E1EA] bg-[#EAF3FA]/50 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-[#1D7FE2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA] block">
                  SECURE OPERATIONAL ACCESS
                </span>
                <p className="text-[13px] sm:text-[14px] text-[#5D6878] mt-0.5 leading-relaxed">
                  Designed for authorized personnel working with crime intelligence, jurisdictional analysis and operational planning.
                </p>
              </div>
            </div>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-flex h-10 items-center gap-2 rounded bg-[#0B1F3A] px-4.5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
            >
              <span>Access Staff Portal</span>
              <ArrowRight className="h-4 w-4 text-[#1D7FE2]" />
            </Link>
          </div>
        </section>
      </main>

      {/* 5. Professional Compact Footer (3-column layout inside max-w-[1440px]) */}
      <footer className="border-t border-[#D9E1EA] bg-white">
        <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8 h-16 sm:h-[68px] grid grid-cols-1 md:grid-cols-3 items-center gap-3">
          {/* LEFT: Shield Icon + Portal Name */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0B1F3A] text-white shrink-0">
              <Shield className="h-3.5 w-3.5 text-[#1D7FE2]" />
            </div>
            <span className="text-[13px] sm:text-[14px] font-semibold text-[#172033] truncate">
              Crime Intelligence &amp; Management Portal
            </span>
          </div>

          {/* CENTER: Operational Intelligence Platform */}
          <div className="text-left md:text-center">
            <span className="text-[12px] sm:text-[13px] text-[#64748B]">
              Operational Intelligence Platform
            </span>
          </div>

          {/* RIGHT: Secure Staff Access */}
          <div className="text-left md:text-right">
            <Link
              to="/login"
              className="text-[12px] sm:text-[13px] text-[#1769AA] hover:text-[#0B1F3A] font-medium transition-colors"
            >
              Secure Staff Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
