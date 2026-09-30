import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { officialCrimeApi } from '../../api';
import type { OfficialCrimeStatisticItem } from '../../types';

export const OfficialNcrbCard: React.FC = () => {
  const [years, setYears] = useState<number[]>([2024, 2023, 2022]);
  const [selectedYear, setSelectedYear] = useState<number>(2023);
  const [selectedGeoLevel, setSelectedGeoLevel] = useState<string>('NATIONAL');
  const [statistics, setStatistics] = useState<OfficialCrimeStatisticItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const y = await officialCrimeApi.getAvailableYears();
        if (y.length > 0) {
          setYears(y);
          if (!y.includes(selectedYear)) {
            setSelectedYear(y[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load NCRB years:', err);
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await officialCrimeApi.getStatistics({
          report_year: selectedYear,
          geography_level: selectedGeoLevel,
        });
        setStatistics(res.items);
      } catch (err: any) {
        setError(err?.message || 'Failed to load official NCRB data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear, selectedGeoLevel]);

  return (
    <div className="rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
            <h3 className="text-[15px] font-bold text-[#172033]">Official Government (NCRB) Crime Statistics</h3>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[#16805C] border border-emerald-200">
              OFFICIAL PUBLISHED
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#5B6577]">
            Source:{' '}
            <span className="font-semibold text-slate-700">Crime in India {selectedYear}</span> | Published by{' '}
            <span className="font-medium text-slate-700">National Crime Records Bureau (NCRB)</span>, Ministry of Home Affairs
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="text-[11px] font-medium text-[#64748B]">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-semibold text-[#0F172A] focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setSelectedGeoLevel('NATIONAL')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedGeoLevel === 'NATIONAL'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              National
            </button>
            <button
              onClick={() => setSelectedGeoLevel('STATE')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedGeoLevel === 'STATE'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              State / UT
            </button>
            <button
              onClick={() => setSelectedGeoLevel('CITY')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedGeoLevel === 'CITY'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Metros
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-[#64748B]">Loading verified NCRB statistics...</div>
        ) : error ? (
          <div className="py-6 text-center text-xs text-rose-600">{error}</div>
        ) : statistics.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#64748B]">No official records found for this scope.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-3">Jurisdiction / Entity</th>
                  <th className="py-2.5 px-3">Crime Head</th>
                  <th className="py-2.5 px-3 text-right">Reported Cases</th>
                  <th className="py-2.5 px-3 text-right">Chargesheeting Rate</th>
                  <th className="py-2.5 px-3 text-right">Conviction Rate</th>
                  <th className="py-2.5 px-3 text-right">Source Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {statistics.slice(0, 15).map((stat) => (
                  <tr key={stat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        <span>{stat.entity_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">{stat.crime_head}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({stat.crime_category})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                      {stat.reported_cases.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                      {stat.chargesheet_rate != null ? `${stat.chargesheet_rate}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-indigo-700">
                      {stat.conviction_rate != null ? `${stat.conviction_rate}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={stat.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline"
                        title={stat.source_report}
                      >
                        <span>{stat.source_name}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {statistics.length > 15 && (
              <p className="mt-2 text-right text-[11px] text-[#64748B]">
                Showing top 15 of {statistics.length} official records
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialNcrbCard;
