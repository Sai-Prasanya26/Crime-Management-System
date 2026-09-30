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
      description: 'Analyze patterns across jurisdictions and crime categories.',
      icon: BarChart3,
      tag: 'Analytics',
    },
    {
      title: 'Trend Intelligence',
      description: 'Review temporal patterns and emerging trends.',
      icon: TrendingUp,
      tag: 'Trends',
    },
    {
      title: 'Risk Intelligence',
      description: 'Assess jurisdiction-level risk indicators.',
      icon: MapPin,
      tag: 'Jurisdiction',
    },
    {
      title: 'Resource Planning',
      description: 'Support evidence-based operational planning.',
      icon: CalendarClock,
      tag: 'Planning',
    },
    {
      title: 'Investigation Support',
      description: 'Provide structured intelligence for authorized personnel.',
      icon: Search,
      tag: 'Operations',
    },
    {
      title: 'Reports',
      description: 'Generate structured intelligence reports.',
      icon: FileText,
      tag: 'Reporting',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#172033] flex flex-col justify-between selection:bg-[#1D4ED8] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#DCE2EA] bg-white/95 backdrop-blur-xs px-5 sm:px-6 h-15 flex items-center">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#172033] text-white">
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <span className="font-bold text-[14px] tracking-tight text-[#172033] block leading-tight">
                Crime Intelligence Portal
              </span>
              <span className="text-[11px] font-medium text-[#5B6577] block leading-none mt-0.5">
                Restricted Operational Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#5B6577]">
            <Link to="/" className="text-[#1D4ED8] font-semibold">
              Home
            </Link>
            <Link to="/dashboard" className="hover:text-[#172033] transition-colors">
              Crime Analytics
            </Link>
            <Link to="/trends" className="hover:text-[#172033] transition-colors">
              Crime Trends
            </Link>
            <Link to="/districts" className="hover:text-[#172033] transition-colors">
              Risk Intelligence
            </Link>
            <a href="#capabilities" onClick={scrollToCapabilities} className="hover:text-[#172033] transition-colors">
              Capabilities
            </a>
          </nav>

          {/* Auth State / Sign In CTA */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-md border border-[#DCE2EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  <span>{user.full_name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-[#DCE2EA] p-1.5 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#172033] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
              >
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                <span>Staff Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Compact Hero Section */}
        <section className="relative px-5 pt-10 pb-12 md:pt-14 md:pb-16 text-center max-w-4xl mx-auto border-b border-[#DCE2EA]/60 [background-image:radial-gradient(#DCE2EA_1px,transparent_1px)] [background-size:20px_20px]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-[11px] font-bold tracking-widest text-[#1D4ED8] uppercase mb-4">
            <span>Secure Crime Intelligence Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight text-[#172033] leading-tight">
            Crime Intelligence &amp; Management Portal
          </h1>

          {/* Tagline */}
          <p className="mt-2 text-base sm:text-lg font-medium text-slate-700">
            Transforming crime data into actionable intelligence.
          </p>

          {/* Description */}
          <p className="mt-3 text-[13px] sm:text-[14px] text-[#5B6577] max-w-2xl mx-auto leading-relaxed">
            An integrated platform for authorized personnel to analyze crime patterns, monitor emerging trends, assess jurisdictional risk, and support evidence-based operational planning.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1D4ED8] px-4.5 text-xs sm:text-[13px] font-semibold text-white shadow-2xs hover:bg-[#1E40AF] transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Access Crime Intelligence</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>

            <a
              href="#capabilities"
              onClick={scrollToCapabilities}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#DCE2EA] bg-white px-4.5 text-xs sm:text-[13px] font-medium text-[#172033] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>Explore Capabilities</span>
            </a>
          </div>
        </section>

        {/* Compact Capabilities Section */}
        <section id="capabilities" className="py-10 max-w-6xl mx-auto px-5">
          <div className="text-left mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Platform Modules
            </p>
            <h2 className="text-[20px] font-bold text-[#172033] mt-0.5">
              Operational Analytical Capabilities
            </h2>
            <p className="text-[13px] text-[#5B6577] mt-0.5">
              Structured intelligence tooling for authorized crime prevention and investigation personnel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="rounded-lg border border-[#DCE2EA] bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between h-[175px] sm:h-[185px]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-[#1D4ED8]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8492A6]">
                        {cap.tag}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#172033] mt-3">
                      {cap.title}
                    </h3>
                    <p className="text-[12px] sm:text-[13px] text-[#5B6577] mt-1 leading-normal">
                      {cap.description}
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-[#1D4ED8] flex items-center gap-1">
                    <span>Authorized Access Only</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DCE2EA] bg-white py-5 px-5 text-xs text-[#5B6577]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1D4ED8]" />
            <span className="font-semibold text-[#172033]">Crime Intelligence &amp; Management Portal</span>
            <span>&bull; Operational Access Level</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Authorized Personnel Only &bull; All sessions monitored and audited
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
