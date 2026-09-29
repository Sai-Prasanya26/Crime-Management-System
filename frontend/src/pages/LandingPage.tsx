import React, { useEffect, useState } from 'react';
import { Shield, Cpu, Database, Activity, CheckCircle2, Layers, ArrowRight } from 'lucide-react';
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
              Phase 1: Project Foundation
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
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-8 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>System Architecture & Scaffold Active</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Data-Driven Crime Management System
        </h1>

        <p className="mt-4 text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
          with AI-Based Resource Optimization
        </p>

        <p className="mt-6 text-slate-400 max-w-2xl text-base sm:text-lg leading-relaxed">
          An incremental intelligence framework designed for aggregate crime analytics, risk assessment, police resource planning, and budget estimation.
        </p>

        {/* Phase 1 Verification Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-14 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Clean Architecture</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Decoupled layers: API Routes → Domain Services → Repositories → SQLAlchemy ORM → MySQL.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-sky-950/60 border border-sky-800/50 text-sky-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Isolated ML Pipeline</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Dedicated preprocessing, feature engineering, and inference engine isolated from the web layer.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-100 text-base mb-2">Selective Storage</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Schema intentionally deferred to Phase 2 to ensure only standardized, necessary attributes are ingested.
            </p>
          </div>
        </div>

        {/* Next Step Banner */}
        <div className="mt-12 w-full max-w-4xl p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Foundation Ready</div>
              <div className="text-xs text-slate-400">Awaiting Phase 2: Crime Dataset Requirements & Schema Design</div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs font-medium text-indigo-400">
            <span>Phase 2 Next</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        Final-Year Major Project &bull; Step-by-Step Clean Engineering Foundation
      </footer>
    </div>
  );
};
