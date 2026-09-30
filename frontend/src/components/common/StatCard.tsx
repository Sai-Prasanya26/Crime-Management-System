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
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-[#16805C]',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-[#B7791F]',
  },
  rose: {
    iconBg: 'bg-red-50',
    iconColor: 'text-[#C53030]',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
  },
  indigo: {
    iconBg: 'bg-indigo-50',
    iconColor: 'text-[#1D4ED8]',
  },
  cyan: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-700',
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
  const styles = colorStyles[color] || colorStyles.indigo;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-[#DCE2EA] bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors min-h-[110px] max-h-[130px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6577] truncate">
          {title}
        </p>
        <div className={`rounded-md p-1.5 shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-[#172033] leading-none">
            {value}
          </h3>
          {trend && (
            <span
              className={`inline-flex items-center text-[11px] font-bold ${
                trend.isPositive ? 'text-[#16805C]' : 'text-[#C53030]'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        {subtext && (
          <p className="mt-1 text-[12px] text-[#5B6577] truncate leading-tight">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
