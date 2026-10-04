import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Shield,
  CheckCircle2,
  Calendar,
  FileCheck,
  Send,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

interface ReportEntry {
  id: string;
  name: string;
  type: string;
  districtScope: string;
  period: string;
  generatedDate: string;
  classification: string;
}

export const ReportsPage: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [reportType, setReportType] = useState('executive');
  const [targetScope, setTargetScope] = useState('National');
  const [timeframe, setTimeframe] = useState('2020-2025');

  const [reportsList, setReportsList] = useState<ReportEntry[]>([
    {
      id: 'rep-01',
      name: 'Incident Intelligence Executive Briefing',
      type: 'Executive Dossier',
      districtScope: 'Nationwide (789 Districts)',
      period: '2020–2025 Longitudinal',
      generatedDate: '2026-10-01',
      classification: 'RESTRICTED',
    },
    {
      id: 'rep-02',
      name: 'Jurisdictional Risk & Threat Matrix',
      type: 'Risk Assessment',
      districtScope: 'All States & UTs',
      period: 'Current Operational Year',
      generatedDate: '2026-10-02',
      classification: 'OFFICIAL USE ONLY',
    },
    {
      id: 'rep-03',
      name: 'Resource Optimization & Asset Schedule',
      type: 'Deployment Plan',
      districtScope: 'Priority High-Density Districts',
      period: 'Annual Budget Planning',
      generatedDate: '2026-10-03',
      classification: 'OPERATIONAL',
    },
    {
      id: 'rep-04',
      name: 'Security Auditing & Session Integrity Log',
      type: 'Audit Log',
      districtScope: 'System Administrative Scope',
      period: 'Rolling 30-Day Window',
      generatedDate: '2026-10-04',
      classification: 'ADMINISTRATIVE',
    },
  ]);

  const handleExport = (reportId: string, title: string) => {
    const exportData = {
      report_id: reportId,
      report_title: title,
      generated_at: new Date().toISOString(),
      platform: 'Crime Intelligence & Management Portal',
      operational_unit: 'Operations & Analysis Center',
      access_level: 'Restricted Law Enforcement Operations',
      status: 'VERIFIED_DISCLOSURE',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Export completed for "${title}".`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `rep-0${reportsList.length + 1}`;
    const typeLabel =
      reportType === 'executive'
        ? 'Executive Summary'
        : reportType === 'risk'
        ? 'Risk Dossier'
        : reportType === 'resource'
        ? 'Resource Allocation Plan'
        : 'Crime Analysis Audit';

    const newReport: ReportEntry = {
      id: newId,
      name: `${typeLabel} — ${targetScope}`,
      type: typeLabel,
      districtScope: targetScope,
      period: timeframe,
      generatedDate: new Date().toISOString().slice(0, 10),
      classification: 'OFFICIAL USE ONLY',
    };

    setReportsList((prev) => [newReport, ...prev]);
    handleExport(newId, newReport.name);
  };

  return (
    <DashboardLayout
      hideSidebar
      icon={FileText}
      title="Intelligence Reports"
      subtitle="Standardized intelligence packages, analytical case dossiers and export schedules"
    >
      {downloadSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* SECTION 1: Report Summary Metrics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Available Dossiers
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0A192F]">
                {reportsList.length} Packages
              </span>
              <FileCheck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Active verified intelligence dossiers
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Security Classification
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">
                Restricted
              </span>
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Law enforcement access only
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Audit Compliance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">
                100% Verified
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              All exports cryptographically logged
            </p>
          </div>
        </div>

        {/* SECTION 2: Standard Intelligence Reports List */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0A192F]">
                  Available Intelligence Reports
                </h3>
                <p className="text-xs text-slate-500">
                  Standardized analytical briefings and statutory incident summaries
                </p>
              </div>
            </div>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {reportsList.length} Active Dossiers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 whitespace-nowrap">
                  <th className="py-2.5 pl-3">Report Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Jurisdiction Scope</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Generated Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reportsList.map((rep) => (
                  <tr key={rep.id} className="h-11 hover:bg-slate-50/70 whitespace-nowrap">
                    <td className="py-2 pl-3 font-semibold text-[#0A192F]">
                      <div className="flex items-center gap-2">
                        <span>{rep.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {rep.classification}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium">{rep.type}</td>
                    <td className="py-2 px-3 text-slate-700">{rep.districtScope}</td>
                    <td className="py-2 px-3 text-slate-500 flex items-center gap-1 mt-3">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{rep.period}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono">{rep.generatedDate}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
                          title="Print Document"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(rep.id, rep.name)}
                          className="inline-flex items-center gap-1 rounded bg-[#0A192F] px-2.5 py-1 text-white hover:bg-blue-900 text-[11px] font-semibold cursor-pointer shadow-2xs"
                        >
                          <Download className="h-3 w-3 text-blue-400" />
                          <span>Export</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Generate Custom Report (Clean Form) */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-[#0A192F]">
              Generate Custom Intelligence Dossier
            </h3>
            <p className="text-xs text-slate-500">
              Configure parameters to package and export a focused analytical intelligence briefing
            </p>
          </div>

          <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="executive">Executive Summary</option>
                <option value="risk">Risk &amp; Vulnerability Matrix</option>
                <option value="resource">Resource Optimization Schedule</option>
                <option value="audit">Incident Analysis Audit</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Jurisdiction Scope
              </label>
              <select
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="National">National (All States &amp; UTs)</option>
                <option value="Maharashtra">State: Maharashtra</option>
                <option value="West Bengal">State: West Bengal</option>
                <option value="Telangana">State: Telangana</option>
                <option value="Thane District">District: Thane</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Reporting Period
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="2020-2025">Complete Baseline (2020–2025)</option>
                <option value="2025">Latest Annual (2025)</option>
                <option value="2024">Annual (2024)</option>
                <option value="2023">Annual (2023)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Generate Dossier</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
