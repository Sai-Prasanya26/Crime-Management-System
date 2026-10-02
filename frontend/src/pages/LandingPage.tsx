import React from 'react';
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
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalIntelligenceSearch from '../components/search/GlobalIntelligenceSearch';
import UserAccountMenu from '../components/layout/UserAccountMenu';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // 6 Primary Operational Modules strictly mapped to the actual Crime Management System
  const capabilityModules = [
    {
      number: '01',
      title: 'Crime Analytics',
      description:
        'Analyse crime incidents across categories, types, jurisdictions, demographics, weapons and time periods.',
      icon: BarChart3,
      image: '/images/crime-analytics.jpg',
      link: '/dashboard',
      actionText: 'View Crime Analytics',
    },
    {
      number: '02',
      title: 'Geographic Intelligence',
      description:
        'Explore crime distribution across states and districts with geographic and population-based context.',
      icon: MapPinned,
      image: '/images/geographic-intelligence.jpg',
      link: '/districts',
      actionText: 'Explore Jurisdictions',
    },
    {
      number: '03',
      title: 'Crime Trends & Forecasting',
      description:
        'Analyse historical crime trends and support future crime forecasting using temporal patterns.',
      icon: TrendingUp,
      image: '/images/crime-trends.jpg',
      link: '/trends',
      actionText: 'View Crime Trends',
    },
    {
      number: '04',
      title: 'Crime Risk Assessment',
      description:
        'Assess jurisdiction-level risk using crime volume, severity, trends and population-based indicators.',
      icon: ShieldAlert,
      image: '/images/risk-assessment.jpg',
      link: '/risk',
      actionText: 'Assess Risk',
    },
    {
      number: '05',
      title: 'Resource Optimization',
      description:
        'Compare available resources with recommended requirements and identify operational shortfalls.',
      icon: CarFront,
      image: '/images/resource-optimization.jpg',
      link: '/resources',
      actionText: 'Optimize Resources',
    },
    {
      number: '06',
      title: 'Budget & Intelligence Reports',
      description:
        'Estimate resource costs and generate structured intelligence, risk, resource and executive reports.',
      icon: FileText,
      image: '/images/intelligence-reports.jpg',
      link: '/reports',
      actionText: 'View Reports',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#172033] flex flex-col justify-between selection:bg-[#1769AA] selection:text-white">
      {/* 1. Simplified Enterprise Header (Logo | Global Search | Access Staff Portal) */}
      <header className="sticky top-0 z-30 border-b border-[#D9E1EA] bg-white h-16 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1440px] w-full mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4">
          {/* LEFT: [Shield Logo] Crime Intelligence & Management Portal */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F3A] text-white shrink-0">
              <Shield className="h-5 w-5 text-[#1D7FE2]" />
            </div>
            <div className="min-w-0">
              <Link to="/" className="block">
                <span className="font-bold text-[14.5px] sm:text-[16px] tracking-tight text-[#0B1F3A] block leading-tight truncate">
                  <span className="hidden sm:inline">Crime Intelligence &amp; Management Portal</span>
                  <span className="sm:hidden">Crime Intelligence Portal</span>
                </span>
              </Link>
            </div>
          </div>

          {/* CENTER: [ 🔍 Search intelligence, states, districts, reports... ] (500–600px wide on desktop) */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-[560px] xl:max-w-[600px] mx-2 lg:mx-4">
            <GlobalIntelligenceSearch variant="desktop-only" className="w-full" />
          </div>

          {/* RIGHT: [ 🔍 Search (Mobile) ] + [ 🔐 Access Staff Portal ] */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile search trigger button (visible below md) */}
            <div className="md:hidden">
              <GlobalIntelligenceSearch variant="mobile-only" />
            </div>

            {isAuthenticated && user ? (
              <UserAccountMenu />
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 sm:px-4 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#12345B] transition-colors shrink-0"
              >
                <LockKeyhole className="h-3.5 w-3.5 text-[#1D7FE2]" />
                <span className="hidden lg:inline">Access Staff Portal</span>
                <span className="hidden sm:inline lg:hidden">Staff Portal</span>
                <span className="sm:hidden">Staff Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Strong Two-Column Hero with Real Photographic Centerpiece */}
        <section className="border-b border-[#D9E1EA] bg-white py-14 sm:py-16">
          <div className="max-w-[1440px] w-full mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 48–50%: Mission & Operational Actions */}
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded border border-[#D9E1EA] bg-[#EAF3FA] px-2.5 py-1 text-[11px] font-bold tracking-wider text-[#1769AA] uppercase">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CRIME INTELLIGENCE &amp; MANAGEMENT</span>
              </div>

              <h1 className="text-[30px] sm:text-[35px] md:text-[38px] font-bold tracking-tight text-[#0B1F3A] leading-[1.18]">
                Transforming Crime Data
                <br />
                into Actionable Intelligence
              </h1>

              <p className="text-[14px] sm:text-[15px] text-[#5D6878] leading-relaxed max-w-xl">
                A secure operational platform for analysing crime patterns, assessing jurisdictional risk, forecasting crime trends and supporting data-driven resource planning.
              </p>

            </div>

            {/* Right 50–52%: Large Clean Realistic Crime-Intelligence Image */}
            <div className="lg:col-span-6 flex justify-end">
              <div className="relative rounded-[10px] border border-[#D9E1EA] overflow-hidden bg-[#0B1F3A] shadow-xs w-full max-w-[650px] h-[360px] sm:h-[410px] md:h-[420px]">
                <img
                  src="/images/hero-investigation.jpg"
                  alt="Crime Intelligence Operations Center"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. CORE INTELLIGENCE CAPABILITIES (6 Real Photograph-Topped Modules) */}
        <section id="modules" className="py-14 sm:py-16 max-w-[1440px] w-full mx-auto px-6 sm:px-8">
          <div className="text-left mb-8 sm:mb-9">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA]">
              CORE INTELLIGENCE CAPABILITIES
            </p>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-[#0B1F3A] mt-0.5">
              Crime Intelligence &amp; Operational Modules
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#5D6878] mt-0.5">
              Integrated analytical capabilities for understanding crime patterns, jurisdictional risk and operational resource requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilityModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.number}
                  to={module.link}
                  aria-label={`Open ${module.title}`}
                  className="group rounded-[10px] border border-[#D9E1EA] bg-white overflow-hidden flex flex-col justify-between hover:border-[#1769AA] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-2xs h-[405px] sm:h-[420px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1769AA]/40 focus:ring-offset-2 block text-left"
                >
                  {/* Top Real Photograph: 230–235px height */}
                  <div className="relative h-[230px] sm:h-[235px] w-full overflow-hidden bg-[#0B1F3A] shrink-0">
                    <img
                      src={module.image}
                      alt={module.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Content (160–180px with 20px padding) */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-lg bg-[#EAF3FA] text-[#1769AA] flex items-center justify-center shrink-0 group-hover:bg-[#1769AA] group-hover:text-white transition-colors duration-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-[17px] sm:text-[18px] font-bold text-[#0B1F3A] leading-tight group-hover:text-[#1769AA] transition-colors">
                          {module.title}
                        </h3>
                      </div>
                      <p className="text-[13.5px] sm:text-[14px] text-[#5D6878] mt-2.5 leading-relaxed">
                        {module.description}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-[#D9E1EA] mt-auto">
                      <div className="text-[13px] sm:text-[13.5px] font-semibold text-[#1769AA] group-hover:text-[#0B1F3A] flex items-center justify-between transition-colors">
                        <span>{module.actionText}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </main>

      {/* ======================================================== */}
      {/* 4. MINIMAL PROFESSIONAL ENTERPRISE FOOTER               */}
      {/* ======================================================== */}
      <footer className="border-t border-[#152B4A] bg-[#071A33] text-white py-10 sm:py-12 px-6 sm:px-8">
        <div className="max-w-[1440px] w-full mx-auto">
          {/* Brand Row: [Shield Logo] Crime Intelligence & Management Portal */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-[#0B1F3A] border border-[#1E3A5F] text-white shrink-0">
              <Shield className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-[#1D7FE2]" />
            </div>
            <h3 className="text-[17px] sm:text-[18px] font-bold text-[#FFFFFF] tracking-tight">
              Crime Intelligence &amp; Management Portal
            </h3>
          </div>

          {/* Academic / Project Title */}
          <p className="text-[13px] sm:text-[14px] text-[#AFC0D4] leading-relaxed mt-4 sm:mt-4.5 max-w-xl">
            Data-Driven Crime Management System with
            <br className="hidden sm:inline" /> AI-Based Resource Optimization
          </p>

          {/* Copyright */}
          <p className="text-[12px] text-[#8FA5BC] mt-4 sm:mt-5">
            &copy; 2026 Crime Intelligence &amp; Management Portal
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
