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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              CMS Intelligence
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 font-medium">
              Phase 5: Analytics Dashboard
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : backendStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-slate-300 font-mono">
                API: {backendStatus === 'connected' ? 'Connected (200 OK)' : backendStatus === 'checking' ? 'Checking...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>191,679 Verified Crime Records &bull; 640 Districts</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Data-Driven Crime Management System
        </h1>

        <p className="mt-4 text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
          with AI-Based Resource Optimization
        </p>

        <p className="mt-5 text-slate-400 max-w-2xl text-base sm:text-lg leading-relaxed">
          Operational intelligence framework consuming real MySQL data via FastAPI for longitudinal crime trends, domain breakdown, diurnal patrol curves, and Census-normalized jurisdiction risk.
        </p>

        {/* Primary Call-to-Action to Launch Dashboard */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all hover:scale-105"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Launch Intelligence Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/trends"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3.5 text-sm font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-all"
          >
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span>View Temporal Trends</span>
          </Link>

          <Link
            to="/districts"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3.5 text-sm font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-all"
          >
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span>Jurisdiction Risk</span>
          </Link>
        </div>

        {/* Architecture & Engineering Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-14 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Clean Architecture</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Strictly decoupled: React UI → FastAPI Routes → Services → Repositories → MySQL 8.0.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Frozen Relational Schema</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              17 normalized tables storing 191,679 verified incidents with 0% mock data and full Census 2011 linkage.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-sky-950/60 border border-sky-800/50 text-sky-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Descriptive Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Live SQL aggregations: clearance rates, diurnal patrol hours, weapon types, and per-capita rates.
            </p>
          </div>
        </div>

        {/* Phase Status Banner */}
        <div className="mt-12 w-full max-w-4xl p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Phase 5 Complete: Frontend Analytics Dashboard</div>
              <div className="text-xs text-slate-400">Consuming real Phase 4 REST APIs with full filter cascading</div>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        Final-Year Major Project &bull; Step-by-Step Clean Engineering Foundation
      </footer>
    </div>
  );
};

export default LandingPage;
