import React from 'react';
import {
  Shield,
  ArrowRight,
  LockKeyhole,
  ScanSearch,
  Fingerprint,
  MapPinned,
  ShieldAlert,
  TrendingUp,
  CarFront,
  FileSearch,
  UserCheck,
  LogOut,
  ShieldCheck,
  KeyRound,
  ClipboardCheck,
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

  // 6 Rich Operational Modules (3 columns on desktop, 2 on tablet, 1 on mobile)
  const capabilityModules = [
    {
      number: '01',
      title: 'Crime Intelligence',
      description:
        'Analyse historical incidents, crime categories and patterns across jurisdictions.',
      icon: ScanSearch,
      image: '/assets/crime-intelligence/cyber-investigation.jpg',
      link: '/dashboard',
      actionText: 'Explore Intelligence',
    },
    {
      number: '02',
      title: 'Geographic Intelligence',
      description:
        'Explore crime distribution across states and districts with geographic context.',
      icon: MapPinned,
      image: '/assets/crime-intelligence/geographic-intelligence.jpg',
      link: '/districts',
      actionText: 'Explore Jurisdictions',
    },
    {
      number: '03',
      title: 'Risk Assessment',
      description:
        'Assess jurisdiction-level risk using crime volume, severity and trend indicators.',
      icon: ShieldAlert,
      image: '/assets/crime-intelligence/risk-assessment.jpg',
      link: '/risk',
      actionText: 'Assess Risk Levels',
    },
    {
      number: '04',
      title: 'Predictive Intelligence',
      description:
        'Analyse historical patterns and support future crime forecasting.',
      icon: TrendingUp,
      image: '/assets/crime-intelligence/predictive-intelligence.jpg',
      link: '/predictions',
      actionText: 'Review Forecasting',
    },
    {
      number: '05',
      title: 'Resource Optimization',
      description:
        'Support operational resource planning across high-workload jurisdictions.',
      icon: CarFront,
      image: '/assets/crime-intelligence/resource-optimization.jpg',
      link: '/resources',
      actionText: 'Optimize Resources',
    },
    {
      number: '06',
      title: 'Intelligence Reports',
      description:
        'Generate structured intelligence summaries and operational reports.',
      icon: FileSearch,
      image: '/assets/crime-intelligence/intelligence-reports.jpg',
      link: '/reports',
      actionText: 'Generate Reports',
    },
  ];

  // 4-step workflow explaining system architecture without developer jargon
  const workflowSteps = [
    {
      number: '01',
      title: 'Incident Data',
      description: 'Structured crime records form the analytical foundation.',
      icon: Fingerprint,
    },
    {
      number: '02',
      title: 'Pattern Analysis',
      description: 'Identify temporal, geographic and categorical patterns.',
      icon: ScanSearch,
    },
    {
      number: '03',
      title: 'Risk Assessment',
      description: 'Evaluate jurisdiction-level crime indicators.',
      icon: ShieldAlert,
    },
    {
      number: '04',
      title: 'Operational Planning',
      description: 'Translate intelligence into resource recommendations.',
      icon: CarFront,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white px-5 sm:px-6 h-15 flex items-center shadow-2xs">
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
                Operations &amp; Analysis Center
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
            <Link to="/risk" className="hover:text-[#0B1F3A] transition-colors">
              Risk Assessment
            </Link>
            <a href="#modules" className="hover:text-[#0B1F3A] transition-colors">
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
                <LockKeyhole className="h-3.5 w-3.5 text-[#1D7FE2]" />
                <span>Access Staff Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* SECTION 1: Premium Two-Column Hero */}
        <section className="border-b border-[#D9E1EA] bg-white py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
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

              <p className="text-[14px] sm:text-[15px] text-[#5D6878] leading-relaxed max-w-xl">
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
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[12px] text-[#5D6878]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
                  <span className="font-medium text-[#172033]">Secure Staff Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span className="font-medium text-[#172033]">Role-Based Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-[#C98512]" />
                  <span className="font-medium text-[#172033]">Audit Trail</span>
                </div>
              </div>
            </div>

            {/* Right 46%: High Quality Crime Intelligence Operations Visual */}
            <div className="lg:col-span-5">
              <div className="relative rounded-[10px] border border-[#D9E1EA] overflow-hidden bg-[#0B1F3A] shadow-xs max-h-[360px]">
                <img
                  src="/assets/crime-intelligence/crime-intelligence-hero.jpg"
                  alt="Crime Intelligence Operations Center"
                  className="w-full h-[280px] sm:h-[340px] object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/90 via-[#0B1F3A]/25 to-transparent pointer-events-none" />

                {/* Floating Operational Panel */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                  <div className="bg-[#0B1F3A]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="font-semibold tracking-wide text-slate-200">
                      INTELLIGENCE OPERATIONS
                    </span>
                  </div>
                  <div className="bg-[#0B1F3A]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-300 font-medium">System Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Intelligence Network Workflow Section */}
        <section className="py-10 max-w-6xl mx-auto px-5">
          <div className="text-left mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              OPERATIONAL FRAMEWORK
            </p>
            <h2 className="text-[20px] font-bold text-[#0B1F3A] mt-0.5">
              From Incident Data to Operational Intelligence
            </h2>
            <p className="text-[13px] text-[#5D6878] mt-0.5">
              A structured workflow for analysing crime patterns and supporting operational decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="rounded-lg border border-[#D9E1EA] bg-white p-4.5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-[#EAF3FA] text-[#1769AA] flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[12px] font-bold text-[#1769AA] font-mono">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-[#0B1F3A]">
                      {step.title}
                    </h3>
                    <p className="text-[12px] text-[#5D6878] mt-1.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: Dark Navy Feature Strip "Crime Intelligence at a Glance" */}
        <section className="bg-[#0B1F3A] text-white py-7 border-y border-[#12345B]">
          <div className="max-w-6xl mx-auto px-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="shrink-0 text-center md:text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1D7FE2] block">
                  SYSTEM OVERVIEW
                </span>
                <h3 className="text-[17px] font-bold text-white mt-0.5">
                  Crime Intelligence at a Glance
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded px-3 py-2">
                  <Fingerprint className="h-5 w-5 text-[#1D7FE2] shrink-0" />
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-tight">
                      Incident Analysis
                    </span>
                    <span className="text-[10px] text-slate-400">Classified Offenses</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded px-3 py-2">
                  <MapPinned className="h-5 w-5 text-[#1D7FE2] shrink-0" />
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-tight">
                      Geographic Intel
                    </span>
                    <span className="text-[10px] text-slate-400">789 Districts</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded px-3 py-2">
                  <ShieldAlert className="h-5 w-5 text-[#1D7FE2] shrink-0" />
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-tight">
                      Risk Assessment
                    </span>
                    <span className="text-[10px] text-slate-400">Threat Matrix</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded px-3 py-2">
                  <TrendingUp className="h-5 w-5 text-[#1D7FE2] shrink-0" />
                  <div>
                    <span className="text-[12px] font-bold text-white block leading-tight">
                      Predictive Intel
                    </span>
                    <span className="text-[10px] text-slate-400">Forecasting Series</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Redesigned 3-Column Capability Modules */}
        <section id="modules" className="py-12 max-w-6xl mx-auto px-5">
          <div className="text-left mb-7">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              INTELLIGENCE MODULES
            </p>
            <h2 className="text-[22px] font-bold text-[#0B1F3A] mt-0.5">
              Comprehensive Operational Modules
            </h2>
            <p className="text-[13px] text-[#5D6878] mt-0.5">
              End-to-end analytical toolsets engineered for investigative officers, intelligence analysts, and operational commanders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilityModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.number}
                  className="rounded-lg border border-[#D9E1EA] bg-white overflow-hidden flex flex-col justify-between hover:border-[#1769AA] hover:-translate-y-1 transition-all duration-200 shadow-2xs h-[350px] sm:h-[365px]"
                >
                  {/* Top Image (175–185px) with Badges */}
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

                  {/* Content (150–165px) */}
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
      </main>

      {/* SECTION 5: Professional Compact Footer */}
      <footer className="border-t border-[#D9E1EA] bg-white py-4 px-5 text-xs text-[#5D6878]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1769AA]" />
            <span className="font-semibold text-[#0B1F3A]">Crime Intelligence &amp; Management Portal</span>
          </div>
          <span className="text-[11px] text-[#5D6878]">Operational Intelligence Platform</span>
          <Link
            to="/login"
            className="text-[11px] text-[#1769AA] hover:text-[#0B1F3A] font-medium"
          >
            Secure Staff Access
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
