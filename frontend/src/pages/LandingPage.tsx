import React, { useEffect, useState } from 'react';
import {
  Shield,
  Cpu,
  Database,
  Activity,
  CheckCircle2,
  Layers,
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../services/api';

export const LandingPage: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    const verifyConnection = async () => {
      try {
        const res = await checkHealth();
        if (res.status === 'ok') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch {
        setBackendStatus('disconnected');
      }
    };

    verifyConnection();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between selection:bg-[#4F46E5] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#EEF2FF] border border-indigo-200 rounded-lg text-[#4F46E5]">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#0F172A]">
              CMS Intelligence
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200 font-semibold">
              Phase 5 & 6: Analytics & Auth
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] shadow-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : backendStatus === 'checking'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-700 font-medium font-mono">
                API: {backendStatus === 'connected' ? 'Connected (200 OK)' : backendStatus === 'checking' ? 'Checking...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold mb-6 shadow-xs">
          <Activity className="w-3.5 h-3.5 text-[#4F46E5]" />
          <span>191,679 Verified Crime Records &bull; 640 Districts</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0F172A] max-w-4xl leading-tight">
          Data-Driven Crime Management System
        </h1>

        <p className="mt-4 text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#4F46E5] bg-clip-text text-transparent">
          with AI-Based Resource Optimization
        </p>

        <p className="mt-5 text-[#64748B] max-w-2xl text-base sm:text-lg leading-relaxed">
          Operational intelligence framework consuming real MySQL data via FastAPI for longitudinal crime trends, domain breakdown, diurnal patrol curves, and Census-normalized jurisdiction risk.
        </p>

        {/* Primary Call-to-Action to Launch Dashboard */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-xl bg-[#4F46E5] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 transition-all hover:scale-105"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Launch Intelligence Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/trends"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F172A] shadow-xs transition-all"
          >
            <TrendingUp className="h-4 w-4 text-[#4F46E5]" />
            <span>View Temporal Trends</span>
          </Link>

          <Link
            to="/districts"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F172A] shadow-xs transition-all"
          >
            <MapPin className="h-4 w-4 text-[#059669]" />
            <span>Jurisdiction Risk</span>
          </Link>
        </div>

        {/* Architecture & Engineering Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-14 text-left">
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] hover:border-slate-300 shadow-xs transition">
            <div className="p-2.5 w-fit rounded-lg bg-[#EEF2FF] border border-indigo-100 text-[#4F46E5] mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[#0F172A] text-base mb-2">Clean Architecture</h3>
            <p className="text-[#64748B] text-sm leading-relaxed">
              Strictly decoupled: React UI → FastAPI Routes → Services → Repositories → MySQL 8.0.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] hover:border-slate-300 shadow-xs transition">
            <div className="p-2.5 w-fit rounded-lg bg-[#ECFDF5] border border-emerald-100 text-[#059669] mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[#0F172A] text-base mb-2">Frozen Relational Schema</h3>
            <p className="text-[#64748B] text-sm leading-relaxed">
              17 normalized tables storing 191,679 verified incidents with 0% mock data and full Census 2011 linkage.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] hover:border-slate-300 shadow-xs transition">
            <div className="p-2.5 w-fit rounded-lg bg-[#EFF6FF] border border-blue-100 text-[#2563EB] mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[#0F172A] text-base mb-2">Descriptive Intelligence</h3>
            <p className="text-[#64748B] text-sm leading-relaxed">
              Live SQL aggregations: clearance rates, diurnal patrol hours, weapon types, and per-capita rates.
            </p>
          </div>
        </div>

        {/* Phase Status Banner */}
        <div className="mt-12 w-full max-w-4xl p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">Phase 5 & 6 Complete: Verified & Authenticated</div>
              <div className="text-xs text-[#64748B]">Consuming live FastAPI REST endpoints with Argon2id & JWT protection</div>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center space-x-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] px-6 py-4 text-center text-xs text-[#64748B] bg-white">
        Final-Year Major Project &bull; Step-by-Step Clean Engineering Foundation
      </footer>
    </div>
  );
};

export default LandingPage;
