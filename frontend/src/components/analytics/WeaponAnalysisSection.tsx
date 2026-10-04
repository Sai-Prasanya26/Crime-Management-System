import React from 'react';
import { ShieldAlert, Crosshair, AlertOctagon, Skull, Shield, Zap } from 'lucide-react';
import type { WeaponDistributionResponse } from '../../types';

interface WeaponAnalysisSectionProps {
  weapons: WeaponDistributionResponse | null;
}

const WEAPON_CONFIGS: Record<
  string,
  { label: string; riskTier: string; riskClass: string; barColor: string; icon: typeof Shield }
> = {
  FIREARM: {
    label: 'Firearms & Ballistics',
    riskTier: 'Critical Lethality',
    riskClass: 'bg-rose-50 text-rose-700 border-rose-200',
    barColor: 'bg-rose-600',
    icon: Crosshair,
  },
  EXPLOSIVES: {
    label: 'Explosives & Detonators',
    riskTier: 'Critical Lethality',
    riskClass: 'bg-rose-50 text-rose-700 border-rose-200',
    barColor: 'bg-rose-500',
    icon: AlertOctagon,
  },
  KNIFE: {
    label: 'Edged Weapons & Knives',
    riskTier: 'Severe Threat',
    riskClass: 'bg-amber-50 text-amber-700 border-amber-200',
    barColor: 'bg-amber-500',
    icon: Zap,
  },
  'BLUNT OBJECT': {
    label: 'Blunt Impact Weapons',
    riskTier: 'High Physical Harm',
    riskClass: 'bg-amber-50 text-amber-700 border-amber-200',
    barColor: 'bg-amber-600',
    icon: ShieldAlert,
  },
  POISON: {
    label: 'Toxic Agents & Poison',
    riskTier: 'Specialized Chemical',
    riskClass: 'bg-purple-50 text-purple-700 border-purple-200',
    barColor: 'bg-purple-600',
    icon: Skull,
  },
  OTHER: {
    label: 'Improvised / Other Weapons',
    riskTier: 'Secondary Threat',
    riskClass: 'bg-slate-100 text-slate-700 border-slate-200',
    barColor: 'bg-slate-500',
    icon: Shield,
  },
};

export const WeaponAnalysisSection: React.FC<WeaponAnalysisSectionProps> = ({ weapons }) => {
  const items = weapons?.items ? [...weapons.items].sort((a, b) => b.incident_count - a.incident_count) : [];
  const totalWeaponIncidents = weapons?.total_incidents || items.reduce((s, i) => s + i.incident_count, 0) || 1;
  const maxWeaponCount = items.length > 0 ? items[0].incident_count : 1;

  // Firearms + Explosives (Lethal Grade)
  const lethalCount = items
    .filter((w) => w.weapon_name === 'FIREARM' || w.weapon_name === 'EXPLOSIVES')
    .reduce((s, i) => s + i.incident_count, 0);
  const lethalPct = ((lethalCount / totalWeaponIncidents) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EA] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-[#EAF3FA] text-[#1769AA]">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h2 className="text-[17px] font-bold text-[#0B1F3A]">
              Weapon Involvement &amp; Tactical Threat Instruments
            </h2>
          </div>
          <p className="text-[12px] text-[#5D6878] mt-0.5">
            Empirical breakdown of offensive instruments, ballistic arms, and tactical lethality ratings
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#5D6878] bg-[#F4F7FA] px-2.5 py-1 rounded border border-[#D9E1EA] self-start sm:self-auto">
          6 Recognized Classifications
        </span>
      </div>

      {/* Main Container */}
      <div className="rounded-lg border border-[#D9E1EA] bg-white p-4 sm:p-5 shadow-2xs">
        {/* Top analytical summary banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-[#F8FAFC] border border-slate-200/70 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] block">
              Total Weapon-Linked Cases
            </span>
            <span className="text-[20px] font-bold font-mono text-[#0B1F3A]">
              {totalWeaponIncidents.toLocaleString()}
            </span>
            <p className="text-[11px] text-[#7C8796] mt-0.5">Verified forensic logs</p>
          </div>

          <div className="rounded-lg bg-rose-50/50 border border-rose-200/60 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
              High-Lethality Weapons
            </span>
            <span className="text-[20px] font-bold font-mono text-rose-700">
              {lethalCount.toLocaleString()}
            </span>
            <p className="text-[11px] text-rose-700/80 mt-0.5">{lethalPct}% Firearm / Explosive ratio</p>
          </div>

          <div className="rounded-lg bg-amber-50/50 border border-amber-200/60 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block">
              Prevalent Weapon
            </span>
            <span className="text-[20px] font-bold text-amber-900 truncate block">
              {items[0]?.weapon_name || 'Knife'}
            </span>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              {items[0]?.incident_count.toLocaleString()} cases ({items[0]?.percentage.toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Ranked Horizontal Bar Chart List */}
        <div className="space-y-3.5">
          {items.map((item, idx) => {
            const conf = WEAPON_CONFIGS[item.weapon_name] || {
              label: item.weapon_name,
              riskTier: 'Standard Risk',
              riskClass: 'bg-slate-100 text-slate-700 border-slate-200',
              barColor: 'bg-[#1769AA]',
              icon: Shield,
            };
            const Icon = conf.icon;
            const pctOfMax = (item.incident_count / maxWeaponCount) * 100;

            return (
              <div key={item.weapon_name} className="group rounded-md p-2 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[12.5px] mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-[#5D6878] w-5">
                      #{idx + 1}
                    </span>
                    <div className="rounded p-1 bg-[#F4F7FA] border border-[#D9E1EA] text-[#0B1F3A]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-[#0B1F3A]">{conf.label}</span>
                    <span
                      className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${conf.riskClass}`}
                    >
                      {conf.riskTier}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto font-mono">
                    <span className="font-bold text-[#0B1F3A] text-[13px]">
                      {item.incident_count.toLocaleString()}
                    </span>
                    <span className="text-[#1769AA] font-bold text-[12px] w-14 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${conf.barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(pctOfMax, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#5D6878]">
          <span>Ballistics and instrument recovery catalogued per statutory evidence collection protocol</span>
          <span className="font-semibold text-[#0B1F3A]">Evidence Tracking: Complete</span>
        </div>
      </div>
    </div>
  );
};

export default WeaponAnalysisSection;
