import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import type { TopDistrictItem } from '../../types';

interface TopDistrictsTableProps {
  districts: TopDistrictItem[];
  metric?: 'volume' | 'rate';
  onMetricChange?: (metric: 'volume' | 'rate') => void;
  isLoading?: boolean;
}

export const TopDistrictsTable: React.FC<TopDistrictsTableProps> = ({
  districts,
  isLoading,
}) => {
  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => b.incident_count - a.incident_count);
  }, [districts]);

  return (
    <div className="flex flex-col justify-between h-full rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-h-[46px]">
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
            <Award className="h-4 w-4" />
          </div>
          <h3 className="text-[16px] font-bold text-[#0B1F3A]">Top Jurisdictions by Crime Load</h3>
        </div>
      </div>

      <div className="my-2 flex-1 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#D9E1EA] bg-[#F4F7FA] text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] whitespace-nowrap">
              <th className="py-2.5 pl-3 w-16"># Rank</th>
              <th className="py-2.5 px-3">District</th>
              <th className="py-2.5 px-3">State / UT</th>
              <th className="py-2.5 px-3 pr-4 text-right">Crime Incidents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 whitespace-nowrap">
            {sortedDistricts.map((d, index) => (
              <tr
                key={d.district_id}
                className="transition-colors hover:bg-slate-50/70"
              >
                <td className="py-2.5 pl-3 font-mono font-bold text-[#5D6878]">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-[#C98512]'
                        : index === 1
                        ? 'bg-slate-200 text-slate-700'
                        : index === 2
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'text-[#5D6878] bg-slate-100'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-semibold text-[#0B1F3A]">{d.district_name}</td>
                <td className="py-2.5 px-3 text-[#5D6878]">{d.state_name}</td>
                <td className="py-2.5 px-3 pr-4 text-right font-mono font-bold text-[#1769AA]">
                  {d.incident_count.toLocaleString()}
                </td>
              </tr>
            ))}
            {sortedDistricts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                  {isLoading ? 'Loading jurisdictions...' : 'No jurisdictions found for the selected criteria.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopDistrictsTable;
