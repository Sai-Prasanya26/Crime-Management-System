import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Shield,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

export const ReportsPage: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const reportPacks = [
    {
      id: 'incident-summary',
      title: 'Incident Intelligence Executive Briefing',
      period: '2020–2025 Longitudinal',
      description:
        'High-level summary of total reported incidents, clearance disposition rates, and top statutory crime classifications across 789 districts.',
      classification: 'RESTRICTED',
      format: 'JSON / PDF',
    },
    {
      id: 'risk-matrix',
      title: 'Jurisdictional Risk & Threat Assessment Report',
      period: 'Active Operational Year',
      description:
        'Complete per-capita crime rate rankings, population normalization benchmarks, and threat categorization (Critical, High, Moderate, Low).',
      classification: 'OFFICIAL USE ONLY',
      format: 'JSON / PDF',
    },
    {
      id: 'resource-allocation',
      title: 'Operational Resource Requirements Schedule',
      period: 'Annual Budget Planning',
      description:
        'District-level asset recommendations for mobile patrol units, investigation squads, and forensic kits with capital allocation requirements.',
      classification: 'INTERNAL OPERATIONAL',
      format: 'JSON / PDF',
    },
    {
      id: 'audit-log',
      title: 'Security Auditing & Session Integrity Log',
      period: 'Rolling 30-Day Window',
      description:
        'Cryptographic audit trail of staff authentications, role assignments, account status toggles, and administrative operations.',
      classification: 'ADMINISTRATIVE AUDIT',
      format: 'JSON / CSV',
    },
  ];

  const handleExport = (reportId: string, title: string) => {
    // Generate simulated export data download
    const exportData = {
      report_id: reportId,
      report_title: title,
      generated_at: new Date().toISOString(),
      platform: 'Crime Intelligence & Management Portal',
      operational_unit: 'Operations & Analysis Center',
      project_title:
        'Data-Driven Crime Management System with AI-Based Resource Optimization',
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout
      hideSidebar
      icon={FileText}
      title="Intelligence Reports"
      subtitle="Standardized briefings and analytical case dossiers"
    >
      {downloadSuccess && (
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-medium text-emerald-900 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportPacks.map((report) => (
          <div
            key={report.id}
            className="rounded-lg border border-[#D9E1EA] bg-white p-5 shadow-2xs flex flex-col justify-between hover:border-[#1769AA]/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-[#F4F7FA] px-2 py-0.5 text-[10px] font-bold text-[#5D6878] border border-[#D9E1EA]">
                  {report.classification}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#7C8796]">
                  <Calendar className="h-3 w-3" />
                  {report.period}
                </span>
              </div>

              <div className="mt-3 flex items-start gap-2.5">
                <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA] shrink-0 mt-0.5">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0B1F3A] leading-tight">
                    {report.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] sm:text-[13px] text-[#5D6878] leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#D9E1EA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <span className="text-[11px] font-medium text-[#7C8796]">
                Format: <span className="font-semibold text-[#172033]">{report.format}</span>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handlePrint}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-[#D9E1EA] bg-white px-2.5 text-[12px] font-medium text-[#5D6878] hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Print Report"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleExport(report.id, report.title)}
                  className="inline-flex h-8 items-center gap-1.5 rounded bg-[#0B1F3A] px-3 text-[12px] font-semibold text-white hover:bg-[#12345B] transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-[#1D7FE2]" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-[#5D6878]">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#1769AA] shrink-0" />
          <span>All intelligence exports are digitally signed and recorded in the audit trail.</span>
        </div>
        <span className="font-mono text-[11px] shrink-0">CLASSIFICATION: RESTRICTED</span>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
