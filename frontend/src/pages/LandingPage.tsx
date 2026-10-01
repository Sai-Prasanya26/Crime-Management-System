import React, { useState, useEffect } from 'react';
import {
  Shield,
  ArrowRight,
  LockKeyhole,
  BarChart3,
  MapPinned,
  ShieldAlert,
  TrendingUp,
  CarFront,
  FileText,
  LineChart,
  IndianRupee,
  UserRound,
  LogOut,
  ShieldCheck,
  ClipboardCheck,
  Menu,
  X,
  Layers,
  Activity,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analyticsApi';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live or verified baseline metrics
  const [metrics, setMetrics] = useState({
    totalIncidents: 191679,
    closedCases: 93490,
    openCases: 98189,
    clearanceRate: 48.77,
    statesCount: 36,
    districtsCount: 789,
  });

  useEffect(() => {
    let isMounted = true;
    analyticsApi
      .getOverview()
      .then((data) => {
        if (isMounted && data) {
          setMetrics((prev) => ({
            ...prev,
            totalIncidents: data.total_incidents ?? prev.totalIncidents,
            closedCases: data.cases?.closed ?? prev.closedCases,
            openCases: data.cases?.open ?? prev.openCases,
            clearanceRate: data.cases?.clearance_rate_pct ?? prev.clearanceRate,
            statesCount: data.total_states ?? prev.statesCount,
            districtsCount: data.total_districts ?? prev.districtsCount,
          }));
        }
      })
      .catch(() => {
        // Retain verified baseline repository figures if backend is starting
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 8 Core Intelligence Modules strictly matching the actual project architecture
  const intelligenceModules = [
    {
      number: '01',
      title: 'Crime Intelligence',
      description:
        'Analyse historical crime incidents and identify patterns across jurisdictions.',
      icon: BarChart3,
      link: '/dashboard',
      actionText: 'View Crime Analytics',
      type: 'category_bars',
    },
    {
      number: '02',
      title: 'Geographic Intelligence',
      description:
        'Explore crime distribution across states and districts.',
      icon: MapPinned,
      link: '/districts',
      actionText: 'Explore Jurisdictions',
      type: 'geographic_matrix',
    },
    {
      number: '03',
      title: 'Crime Trends',
      description:
        'Analyse monthly and yearly crime trends across selected jurisdictions.',
      icon: TrendingUp,
      link: '/trends',
      actionText: 'View Crime Trends',
      type: 'trend_sparkline',
    },
    {
      number: '04',
      title: 'Risk Assessment',
      description:
        'Assess jurisdiction-level crime risk using volume, severity and trend indicators.',
      icon: ShieldAlert,
      link: '/risk',
      actionText: 'Assess Risk',
      type: 'risk_matrix',
    },
    {
      number: '05',
      title: 'Predictive Intelligence',
      description:
        'Forecast future crime patterns using trained machine-learning models.',
      icon: LineChart,
      link: '/predictions',
      actionText: 'View Predictions',
      type: 'prediction_preview',
    },
    {
      number: '06',
      title: 'Resource Optimization',
      description:
        'Support police resource planning using risk, forecast and availability inputs.',
      icon: CarFront,
      link: '/resources',
      actionText: 'View Resource Planning',
      type: 'resource_matrix',
    },
    {
      number: '07',
      title: 'Budget Intelligence',
      description:
        'Estimate resource costs based on recommended quantities and configured unit costs.',
      icon: IndianRupee,
      link: '/budget',
      actionText: 'View Budget Intelligence',
      type: 'budget_matrix',
    },
    {
      number: '08',
      title: 'Intelligence Reports',
      description:
        'Generate structured analytical and operational reports.',
      icon: FileText,
      link: '/reports',
      actionText: 'View Reports',
      type: 'report_dossier',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#102A43] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* 1. Header: 3 clearly separated zones (Brand, Navigation, User Controls) */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white h-16 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1440px] w-full mx-auto h-full px-6 sm:px-8 flex items-center justify-between">
          {/* ZONE 1: BRAND AREA */}
          <div className="flex items-center gap-3.5 shrink-0 mr-6 lg:mr-10 min-w-[280px] max-w-[340px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-white shrink-0 shadow-2xs">
              <Shield className="h-5 w-5 text-[#1D7FE2]" />
            </div>
            <div className="min-w-0">
              <Link to="/" className="block">
                <span className="font-bold text-[15px] sm:text-[16px] tracking-tight text-[#0B1F3A] block leading-tight truncate">
                  Crime Intelligence &amp; Management Portal
                </span>
                <span className="text-[11.5px] font-medium text-[#52667A] block leading-none mt-1">
                  Operations &amp; Analysis Center
                </span>
              </Link>
            </div>
          </div>

          {/* ZONE 2: PRIMARY NAVIGATION */}
          <nav className="hidden xl:flex items-center justify-center gap-6 lg:gap-7 flex-1">
            <Link
              to="/"
              className="text-[13.5px] font-semibold text-[#1769AA] border-b-2 border-[#1769AA] pb-1"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="text-[13.5px] font-medium text-[#52667A] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Crime Analytics
            </Link>
            <Link
              to="/districts"
              className="text-[13.5px] font-medium text-[#52667A] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Geographic Intelligence
            </Link>
            <Link
              to="/trends"
              className="text-[13.5px] font-medium text-[#52667A] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Crime Trends
            </Link>
            <a
              href="#modules"
              className="text-[13.5px] font-medium text-[#52667A] hover:text-[#0B1F3A] transition-colors pb-1"
            >
              Capabilities
            </a>
          </nav>

          {/* ZONE 3: USER CONTROLS */}
          <div className="hidden lg:flex items-center justify-end shrink-0 gap-3 ml-auto">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 rounded-lg border border-[#D9E1EA] bg-white py-1.5 pl-2 pr-2.5 shadow-2xs hover:border-[#1769AA]/40 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF3FA] text-[#1769AA] shrink-0">
                    <UserRound className="h-4.5 w-4.5 text-[#1769AA]" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[13px] font-semibold text-[#102A43] leading-tight truncate max-w-[170px]">
                      {user.full_name}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-[11px] font-semibold bg-[#EEF2F6] text-[#415065] border border-[#D9E1EA]/60 uppercase tracking-wide shrink-0">
                    {user.role}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D9E1EA] bg-white text-[#52667A] hover:bg-[#EAF3FA] hover:text-[#1769AA] hover:border-[#1769AA]/40 transition-colors cursor-pointer shadow-2xs shrink-0"
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

          {/* Mobile Menu Button */}
          <div className="flex xl:hidden items-center gap-2 ml-auto">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D9E1EA] bg-white text-[#52667A] hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-[#D9E1EA] bg-white px-6 py-4 space-y-3 shadow-md">
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
                className="text-[#52667A] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Crime Analytics
              </Link>
              <Link
                to="/districts"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#52667A] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Geographic Intelligence
              </Link>
              <Link
                to="/trends"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#52667A] hover:text-[#0B1F3A] py-1 font-medium"
              >
                Crime Trends
              </Link>
              <a
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#52667A] hover:text-[#0B1F3A] py-1 font-medium"
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
                      <p className="text-[13px] font-semibold text-[#102A43]">{user.full_name}</p>
                      <span className="text-[11px] font-semibold text-[#415065] uppercase">{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#D9E1EA] text-[#52667A] hover:bg-[#EAF3FA]"
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
        {/* 2. REALISTIC DATA-DRIVEN HERO SECTION (NO AI PHOTOGRAPHS) */}
        <section className="border-b border-[#D9E1EA] bg-white py-12 sm:py-16">
          <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* LEFT COLUMN: Mission & Primary Actions */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#EAF3FA] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#1769AA] uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1769AA]" />
                <span>CRIME INTELLIGENCE &amp; MANAGEMENT</span>
              </div>

              <h1 className="text-[28px] sm:text-[32px] md:text-[34px] font-bold tracking-tight text-[#0B1F3A] leading-[1.2]">
                Transforming Crime Data
                <br />
                into Actionable Intelligence
              </h1>

              <p className="text-[14px] sm:text-[14.5px] text-[#52667A] leading-relaxed max-w-xl">
                A secure platform for analysing crime patterns, jurisdictional risk, crime trends and resource requirements.
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
                  className="inline-flex h-10 items-center gap-2 rounded border border-[#D9E1EA] bg-white px-5 text-[13px] font-medium text-[#0B1F3A] hover:bg-[#F5F7FA] transition-colors"
                >
                  <span>Explore Crime Intelligence</span>
                  <ArrowRight className="h-4 w-4 text-[#1769AA]" />
                </Link>
              </div>

              {/* Security Indicators with Lucide Icons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-[12px] text-[#52667A]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" />
                  <span className="font-medium text-[#102A43]">Secure Staff Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span className="font-medium text-[#102A43]">Role-Based Access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-[#B7791F]" />
                  <span className="font-medium text-[#102A43]">Audit Trail Active</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: REAL DATA VISUALIZATION PANEL (Authentic Analytics Screen) */}
            <div className="lg:col-span-7">
              <div className="rounded-[10px] border border-[#D9E1EA] bg-[#F8FAFC] p-4 sm:p-5 shadow-xs">
                {/* Panel Top Bar */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#D9E1EA]">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#1769AA]" />
                    <span className="text-[12px] font-bold text-[#0B1F3A] uppercase tracking-wide">
                      OPERATIONAL INTELLIGENCE DASHBOARD
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#15803D] font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#15803D] animate-pulse"></span>
                    <span>LIVE REPOSITORY SYNC</span>
                  </div>
                </div>

                {/* Micro-KPI Strip */}
                <div className="grid grid-cols-3 gap-2.5 py-3 border-b border-[#D9E1EA]">
                  <div className="bg-white rounded border border-[#D9E1EA] p-2.5">
                    <p className="text-[11px] text-[#52667A] font-medium">Total Incidents</p>
                    <p className="text-[18px] sm:text-[20px] font-bold text-[#0B1F3A] leading-tight mt-0.5">
                      {metrics.totalIncidents.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#1769AA] font-medium mt-0.5">2020–2025 Historical Base</p>
                  </div>
                  <div className="bg-white rounded border border-[#D9E1EA] p-2.5">
                    <p className="text-[11px] text-[#52667A] font-medium">Case Clearance</p>
                    <p className="text-[18px] sm:text-[20px] font-bold text-[#15803D] leading-tight mt-0.5">
                      {metrics.clearanceRate}%
                    </p>
                    <p className="text-[10px] text-[#52667A] mt-0.5">93,490 Closed / 98,189 Open</p>
                  </div>
                  <div className="bg-white rounded border border-[#D9E1EA] p-2.5">
                    <p className="text-[11px] text-[#52667A] font-medium">Coverage</p>
                    <p className="text-[18px] sm:text-[20px] font-bold text-[#0B1F3A] leading-tight mt-0.5">
                      36 Entities
                    </p>
                    <p className="text-[10px] text-[#52667A] mt-0.5">789 Standardized Districts</p>
                  </div>
                </div>

                {/* Real Visualization Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-3.5">
                  {/* Left: 6-Year Trend Chart */}
                  <div className="md:col-span-7 bg-white rounded border border-[#D9E1EA] p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11.5px] font-bold text-[#0B1F3A] flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-[#1769AA]" />
                        Annual Incident Volume (2020–2025)
                      </span>
                      <span className="text-[10.5px] text-[#52667A] font-mono">~31.9k / yr</span>
                    </div>

                    {/* SVG Sparkline Graph */}
                    <div className="w-full h-[110px] relative">
                      <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="300" y2="20" stroke="#EEF2F6" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="300" y2="50" stroke="#EEF2F6" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="0" y1="80" x2="300" y2="80" stroke="#EEF2F6" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Area Gradient Fill */}
                        <defs>
                          <linearGradient id="heroTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1769AA" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#1769AA" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points="20,55 70,45 125,50 180,42 235,52 280,60 280,95 20,95"
                          fill="url(#heroTrendGrad)"
                        />

                        {/* Trend Polyline */}
                        <polyline
                          fill="none"
                          stroke="#1769AA"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points="20,55 70,45 125,50 180,42 235,52 280,60"
                        />

                        {/* Data Points */}
                        {[
                          { x: 20, y: 55, year: "'20", val: '31.8k' },
                          { x: 70, y: 45, year: "'21", val: '32.1k' },
                          { x: 125, y: 50, year: "'22", val: '31.9k' },
                          { x: 180, y: 42, year: "'23", val: '32.2k' },
                          { x: 235, y: 52, year: "'24", val: '31.9k' },
                          { x: 280, y: 60, year: "'25", val: '31.7k' },
                        ].map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke="#1769AA" strokeWidth="2" />
                            <text x={pt.x} y="96" textAnchor="middle" fontSize="9" fill="#52667A" fontFamily="monospace">
                              {pt.year}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#52667A]">
                      <span>Peak: 2023 (32,198 incidents)</span>
                      <span className="text-[#15803D] font-medium">Variance: ±1.2%</span>
                    </div>
                  </div>

                  {/* Right: Crime Category Breakdown */}
                  <div className="md:col-span-5 bg-white rounded border border-[#D9E1EA] p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11.5px] font-bold text-[#0B1F3A] flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-[#1769AA]" />
                        Category Distribution
                      </span>
                      <span className="text-[10px] text-[#52667A]">4 Classes</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#102A43] font-medium">Other Crime</span>
                          <span className="text-[#52667A] font-mono">114,076 (59.5%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1769AA] rounded-full" style={{ width: '59.5%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#102A43] font-medium">Violent Crime</span>
                          <span className="text-[#52667A] font-mono">52,019 (27.1%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#DC2626] rounded-full" style={{ width: '27.1%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#102A43] font-medium">Fire Accident</span>
                          <span className="text-[#52667A] font-mono">17,521 (9.1%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#EA580C] rounded-full" style={{ width: '9.1%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-[#102A43] font-medium">Traffic Fatality</span>
                          <span className="text-[#52667A] font-mono">8,063 (4.2%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#64748B] rounded-full" style={{ width: '4.2%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#52667A]">
                      <span>Total Classified: 191,679</span>
                      <span className="font-semibold text-[#1769AA]">100% Coverage</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Lineage Strip */}
                <div className="mt-3 pt-2.5 border-t border-[#D9E1EA] flex items-center justify-between text-[10.5px] text-[#52667A]">
                  <span className="truncate">
                    Official Reference: National Crime Records Bureau &amp; Census 2011 Mapping Layer
                  </span>
                  <span className="font-mono text-[#0B1F3A] font-medium shrink-0 ml-2">
                    RBAC Protected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CORE INTELLIGENCE MODULES (8 Hybrid Enterprise Dashboard Cards) */}
        <section id="modules" className="py-12 sm:py-16 max-w-[1440px] w-full mx-auto px-6 sm:px-8">
          <div className="text-left mb-8 sm:mb-9">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              OPERATIONAL CAPABILITIES
            </p>
            <h2 className="text-[20px] sm:text-[24px] font-bold text-[#0B1F3A] mt-0.5">
              Core Intelligence &amp; Management Modules
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#52667A] mt-0.5">
              Integrated operational capabilities mapped directly to actual project modules, analytical pipelines, and resource planning workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {intelligenceModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.number}
                  className="rounded-[10px] border border-[#D9E1EA] bg-white overflow-hidden flex flex-col justify-between hover:border-[#1769AA] hover:shadow-xs transition-all duration-200"
                >
                  {/* Card Header & Description */}
                  <div className="p-4 sm:p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FA] text-[#1769AA] shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#52667A] bg-[#EEF2F6] px-1.5 py-0.5 rounded border border-[#D9E1EA]/60">
                          {module.number}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    </div>

                    <h3 className="text-[16px] sm:text-[17px] font-bold text-[#0B1F3A] leading-snug">
                      {module.title}
                    </h3>
                    <p className="text-[13px] text-[#52667A] mt-1.5 leading-relaxed min-h-[54px]">
                      {module.description}
                    </p>
                  </div>

                  {/* Embedded Data Visualization Panel (No AI Photographs) */}
                  <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-y border-[#D9E1EA] flex-1 flex flex-col justify-center">
                    {/* Visual 01: Category Breakdown */}
                    {module.type === 'category_bars' && (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A] mb-1">
                          <span>CATEGORY DISTRIBUTION</span>
                          <span>191.6k</span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10.5px] mb-0.5">
                            <span className="font-medium text-[#102A43]">Other Crime</span>
                            <span className="font-mono text-[#52667A]">59.5%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1769AA]" style={{ width: '59.5%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10.5px] mb-0.5">
                            <span className="font-medium text-[#102A43]">Violent Crime</span>
                            <span className="font-mono text-[#52667A]">27.1%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#DC2626]" style={{ width: '27.1%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10.5px] mb-0.5">
                            <span className="font-medium text-[#102A43]">Fire Accident</span>
                            <span className="font-mono text-[#52667A]">9.1%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#EA580C]" style={{ width: '9.1%' }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual 02: Geographic Hierarchy */}
                    {module.type === 'geographic_matrix' && (
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A]">
                          <span>JURISDICTIONAL HIERARCHY</span>
                          <span>NATIONAL</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-white rounded border border-[#D9E1EA] p-1.5">
                            <span className="text-[16px] font-bold text-[#0B1F3A] block">36</span>
                            <span className="text-[10px] text-[#52667A]">States &amp; UTs</span>
                          </div>
                          <div className="bg-white rounded border border-[#D9E1EA] p-1.5">
                            <span className="text-[16px] font-bold text-[#0B1F3A] block">789</span>
                            <span className="text-[10px] text-[#52667A]">Districts</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-[#52667A] flex items-center justify-between border-t border-slate-200 pt-1.5">
                          <span>Census 2011 + Current Mappings</span>
                          <span className="text-[#1769AA] font-mono font-medium">Mapped</span>
                        </div>
                      </div>
                    )}

                    {/* Visual 03: Trend Sparkline */}
                    {module.type === 'trend_sparkline' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A]">
                          <span>ANNUAL TRAJECTORY</span>
                          <span>2020–2025</span>
                        </div>
                        <div className="h-[52px] w-full">
                          <svg viewBox="0 0 160 50" className="w-full h-full overflow-visible">
                            <polyline
                              fill="none"
                              stroke="#1769AA"
                              strokeWidth="2"
                              points="10,28 35,22 65,26 95,20 125,24 150,29"
                            />
                            {[
                              { x: 10, y: 28 },
                              { x: 35, y: 22 },
                              { x: 65, y: 26 },
                              { x: 95, y: 20 },
                              { x: 125, y: 24 },
                              { x: 150, y: 29 },
                            ].map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#FFFFFF" stroke="#1769AA" strokeWidth="1.5" />
                            ))}
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#52667A] font-mono border-t border-slate-200 pt-1">
                          <span>2020 (31.8k)</span>
                          <span className="text-[#15803D]">Stable Trend</span>
                          <span>2025 (31.7k)</span>
                        </div>
                      </div>
                    )}

                    {/* Visual 04: Risk Matrix */}
                    {module.type === 'risk_matrix' && (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A] mb-1">
                          <span>RISK EVALUATION FACTORS</span>
                          <span>MULTI-FACTOR</span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-[#102A43] font-medium">Crime Volume</span>
                          <span className="font-mono text-[#B42318] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 text-[9.5px]">Weighted</span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-[#102A43] font-medium">Crime Severity</span>
                          <span className="font-mono text-[#B7791F] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[9.5px]">1.5x Index</span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-[#102A43] font-medium">Temporal Trend</span>
                          <span className="font-mono text-[#15803D] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[9.5px]">Monitored</span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-[#102A43] font-medium">Population Factor</span>
                          <span className="font-mono text-[#1769AA] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 text-[9.5px]">Adjusted</span>
                        </div>
                      </div>
                    )}

                    {/* Visual 05: Predictive Horizon */}
                    {module.type === 'prediction_preview' && (
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A]">
                          <span>FORECASTING HORIZON</span>
                          <span>ML MODEL</span>
                        </div>
                        <div className="h-[46px] w-full flex items-center justify-center">
                          <svg viewBox="0 0 160 40" className="w-full h-full overflow-visible">
                            {/* Historical Solid Line */}
                            <line x1="10" y1="25" x2="80" y2="18" stroke="#1769AA" strokeWidth="2" />
                            <circle cx="80" cy="18" r="3" fill="#1769AA" />
                            {/* Division Line */}
                            <line x1="80" y1="5" x2="80" y2="35" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
                            {/* Projected Dotted Line */}
                            <line x1="80" y1="18" x2="150" y2="12" stroke="#1769AA" strokeWidth="2" strokeDasharray="3 3" />
                            <circle cx="150" cy="12" r="3" fill="#FFFFFF" stroke="#1769AA" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#52667A] font-mono border-t border-slate-200 pt-1">
                          <span>Historical Baseline</span>
                          <span className="text-[#1769AA] font-semibold">ARIMA / ML</span>
                        </div>
                      </div>
                    )}

                    {/* Visual 06: Resource Matrix */}
                    {module.type === 'resource_matrix' && (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A] mb-1">
                          <span>RESOURCE CATEGORIES</span>
                          <span>OPERATIONAL</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div className="bg-white rounded border border-[#D9E1EA] p-1 text-center">
                            <span className="font-semibold text-[#102A43] block">Patrol Vehicles</span>
                            <span className="text-[#52667A]">Visibility</span>
                          </div>
                          <div className="bg-white rounded border border-[#D9E1EA] p-1 text-center">
                            <span className="font-semibold text-[#102A43] block">Investigation</span>
                            <span className="text-[#52667A]">Case Teams</span>
                          </div>
                          <div className="bg-white rounded border border-[#D9E1EA] p-1 text-center">
                            <span className="font-semibold text-[#102A43] block">Personnel</span>
                            <span className="text-[#52667A]">Station Shifts</span>
                          </div>
                          <div className="bg-white rounded border border-[#D9E1EA] p-1 text-center">
                            <span className="font-semibold text-[#102A43] block">Surveillance</span>
                            <span className="text-[#52667A]">Checkpoints</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual 07: Budget Intelligence */}
                    {module.type === 'budget_matrix' && (
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A]">
                          <span>BUDGET MODELING MATRIX</span>
                          <span>INR (₹)</span>
                        </div>
                        <div className="bg-white rounded border border-[#D9E1EA] p-2 space-y-1 text-[10px]">
                          <div className="flex justify-between text-[#52667A]">
                            <span>Recommended Units:</span>
                            <span className="font-mono font-medium text-[#102A43]">Calculated</span>
                          </div>
                          <div className="flex justify-between text-[#52667A]">
                            <span>Unit Cost Scale:</span>
                            <span className="font-mono font-medium text-[#102A43]">Configured</span>
                          </div>
                          <div className="flex justify-between text-[#1769AA] font-bold border-t border-slate-100 pt-1">
                            <span>Projected Budget:</span>
                            <span className="font-mono">Estimated Plan</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual 08: Intelligence Reports */}
                    {module.type === 'report_dossier' && (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[10.5px] font-mono text-[#52667A] mb-1">
                          <span>REPORT ARTIFACT PREVIEW</span>
                          <span>FORMAL</span>
                        </div>
                        <div className="bg-white rounded border border-[#D9E1EA] p-2 text-[9.5px] text-[#52667A] space-y-1">
                          <div className="font-bold text-[#0B1F3A] border-b border-slate-100 pb-0.5">
                            DISTRICT CRIME INTELLIGENCE DOSSIER
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-1 w-1 bg-[#1769AA] rounded-full"></span>
                            <span>Jurisdictional Overview &amp; Trends</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-1 w-1 bg-[#1769AA] rounded-full"></span>
                            <span>Risk Score &amp; Incident Distribution</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-1 w-1 bg-[#1769AA] rounded-full"></span>
                            <span>Operational Resource Recommendations</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer CTA */}
                  <div className="p-4 sm:p-5 pt-3">
                    <Link
                      to={module.link}
                      className="text-[13px] font-semibold text-[#1769AA] hover:text-[#0B1F3A] flex items-center justify-between group transition-colors"
                    >
                      <span>{module.actionText}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. ANALYTICS SNAPSHOT (Actual Database Statistics) */}
        <section className="py-10 bg-white border-y border-[#D9E1EA]">
          <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
                REPOSITORY AT A GLANCE
              </p>
              <h2 className="text-[19px] sm:text-[21px] font-bold text-[#0B1F3A] mt-0.5">
                Verified System Analytics Snapshot
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-medium text-[#52667A]">Crime Incidents</span>
                  <Database className="h-4 w-4 text-[#1769AA]" />
                </div>
                <p className="text-[24px] sm:text-[26px] font-bold text-[#0B1F3A] leading-tight">
                  {metrics.totalIncidents.toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[#52667A] mt-1">
                  Historical incidents recorded across 2020 through 2025.
                </p>
              </div>

              <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-medium text-[#52667A]">Crime Categories</span>
                  <Layers className="h-4 w-4 text-[#1769AA]" />
                </div>
                <p className="text-[24px] sm:text-[26px] font-bold text-[#0B1F3A] leading-tight">
                  4 Classes • 21 Types
                </p>
                <p className="text-[11.5px] text-[#52667A] mt-1">
                  Categorized by severity, modus operandi, and penal statutes.
                </p>
              </div>

              <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-medium text-[#52667A]">Jurisdictions</span>
                  <MapPinned className="h-4 w-4 text-[#1769AA]" />
                </div>
                <p className="text-[24px] sm:text-[26px] font-bold text-[#0B1F3A] leading-tight">
                  36 States • 789 Districts
                </p>
                <p className="text-[11.5px] text-[#52667A] mt-1">
                  Standardized spatial hierarchy with historical lineage.
                </p>
              </div>

              <div className="rounded-lg border border-[#D9E1EA] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-medium text-[#52667A]">Case Resolution</span>
                  <ShieldCheck className="h-4 w-4 text-[#15803D]" />
                </div>
                <p className="text-[24px] sm:text-[26px] font-bold text-[#15803D] leading-tight">
                  {metrics.clearanceRate}% Clearance
                </p>
                <p className="text-[11.5px] text-[#52667A] mt-1">
                  93,490 resolved cases out of 191,679 total recorded incidents.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SECURE STAFF ACCESS SECTION */}
        <section className="py-12 sm:py-14 max-w-[1440px] w-full mx-auto px-6 sm:px-8">
          <div className="rounded-[10px] border border-[#D9E1EA] bg-[#EAF3FA]/50 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-[#0B1F3A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="h-5 w-5 text-[#1D7FE2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA] block">
                  SECURE OPERATIONAL ACCESS
                </span>
                <p className="text-[13px] sm:text-[14px] text-[#52667A] mt-0.5 leading-relaxed max-w-2xl">
                  Authorized personnel only. Access to operational crime intelligence, risk assessment, and resource management modules is governed by role-based authentication and immutable audit logging.
                </p>
              </div>
            </div>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-flex h-10 items-center gap-2 rounded bg-[#0B1F3A] px-5 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
            >
              <span>Access Staff Portal</span>
              <ArrowRight className="h-4 w-4 text-[#1D7FE2]" />
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Professional Compact Footer (3-column layout) */}
      <footer className="border-t border-[#D9E1EA] bg-white py-4.5 sm:py-5">
        <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-12 items-center gap-4 sm:gap-6">
          {/* LEFT: Shield Icon + Portal Name + Subtitle + Official Project Title */}
          <div className="md:col-span-6 flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0B1F3A] text-white shrink-0 mt-0.5">
              <Shield className="h-3.5 w-3.5 text-[#1D7FE2]" />
            </div>
            <div className="min-w-0 max-w-[650px]">
              <p className="text-[13px] sm:text-[14px] font-semibold text-[#102A43] leading-tight">
                Crime Intelligence &amp; Management Portal
              </p>
              <p className="text-[11px] sm:text-[11.5px] font-medium text-[#52667A] leading-tight mt-0.5">
                Operations &amp; Analysis Center
              </p>
              <p className="text-[11px] sm:text-[11.5px] font-normal text-[#64748B] mt-1.5 leading-snug">
                Data-Driven Crime Management System with AI-Based Resource Optimization
              </p>
            </div>
          </div>

          {/* CENTER: Operational Intelligence Platform */}
          <div className="md:col-span-3 text-left md:text-center">
            <span className="text-[12px] sm:text-[12.5px] text-[#64748B] font-medium">
              Operational Intelligence Platform
            </span>
          </div>

          {/* RIGHT: Secure Staff Access */}
          <div className="md:col-span-3 text-left md:text-right">
            <Link
              to="/login"
              className="text-[12px] sm:text-[12.5px] text-[#1769AA] hover:text-[#0B1F3A] font-medium transition-colors"
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
