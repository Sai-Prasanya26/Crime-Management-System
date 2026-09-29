import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'cyan';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-400',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-400',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'indigo',
  trend,
}) => {
  const styles = colorStyles[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
