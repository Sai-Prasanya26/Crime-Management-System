import React, { useState, useEffect } from 'react';
import { officialCrimeApi } from '../../api';
import type { DataFreshnessResponse } from '../../types';
import { ShieldCheck } from 'lucide-react';

export const DataFreshnessBanner: React.FC = () => {
  const [metadata, setMetadata] = useState<DataFreshnessResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    officialCrimeApi
      .getDataFreshness()
      .then((data) => {
        if (mounted) {
          setMetadata(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !metadata) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#DCE2EA] bg-white p-3.5 shadow-2xs mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 text-[#1D4ED8] rounded shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Data Freshness &amp; Provenance
              </span>
              <span className="text-[11px] text-[#5B6577]">Operational Data Standards Verified</span>
            </div>
            <h3 className="text-[13px] font-bold text-[#172033] mt-0.5">
              India Crime Management &amp; Analytical Intelligence Platform
            </h3>
          </div>
        </div>

        {/* Quick Provenance Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="bg-slate-50 border border-[#DCE2EA] px-2 py-0.5 rounded">
            <span className="text-[#5B6577]">Historical: </span>
            <span className="font-semibold text-[#172033]">2020–2025</span>
          </div>
          <div className="bg-slate-50 border border-[#DCE2EA] px-2 py-0.5 rounded">
            <span className="text-[#5B6577]">Official NCRB: </span>
            <span className="font-semibold text-[#1D4ED8]">2024 / 2023</span>
          </div>
          <div className="bg-slate-50 border border-[#DCE2EA] px-2 py-0.5 rounded">
            <span className="text-[#5B6577]">Population: </span>
            <span className="font-semibold text-[#B7791F]">Census 2011</span>
          </div>
          <div className="bg-slate-50 border border-[#DCE2EA] px-2 py-0.5 rounded">
            <span className="text-[#5B6577]">Geography: </span>
            <span className="font-semibold text-[#16805C]">2026 Admin (789 Dists)</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#1D4ED8] hover:underline font-semibold text-[11px] cursor-pointer ml-1"
          >
            {isExpanded ? 'Hide Details' : 'View Disclosures'}
          </button>
        </div>
      </div>

      {/* Expanded Disclosures Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] text-[#5B6577]">
          <div className="bg-slate-50/70 p-2.5 rounded border border-[#DCE2EA]">
            <div className="font-semibold text-[#172033] mb-0.5">Historical Incident Layer</div>
            <div className="text-[11px] leading-relaxed">
              <strong>191,679</strong> micro-level incident records spanning 2020-01-01 through 2025-12-31, indexed across 640 Census-2011 district polygons.
            </div>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded border border-[#DCE2EA]">
            <div className="font-semibold text-[#172033] mb-0.5">Official NCRB Benchmarks</div>
            <div className="text-[11px] leading-relaxed">
              <strong>52</strong> published official records from <em>Crime in India 2022, 2023</em> and 2024 provisional police releases.
            </div>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded border border-[#DCE2EA]">
            <div className="font-semibold text-[#172033] mb-0.5">Demographic Baseline</div>
            <div className="text-[11px] leading-relaxed">
              Strictly Census 2011 enumerations. Post-2011 child districts inherit demographic baselines from parent district polygons.
            </div>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded border border-[#DCE2EA]">
            <div className="font-semibold text-[#172033] mb-0.5">Modern Administrative Layer</div>
            <div className="text-[11px] leading-relaxed">
              36 active entities (28 States, 8 UTs) and 789 current districts, incorporating the Andhra Pradesh 28-district reorganization of Dec 31, 2025.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFreshnessBanner;
