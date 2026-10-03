import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'navy';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const colorStyles = {
  blue: {
    iconBg: 'bg-[#EAF3FA]',
    iconColor: 'text-[#1769AA]',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-[#16845B]',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-[#C98512]',
  },
  rose: {
    iconBg: 'bg-red-50',
    iconColor: 'text-[#C53B3B]',
  },
  navy: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-[#0B1F3A]',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  trend,
}) => {
  const styles = colorStyles[color] || colorStyles.blue;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-[#D9E1EA] bg-white p-3.5 sm:p-4 shadow-2xs hover:border-[#1769AA]/40 transition-colors min-h-[105px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5D6878] truncate">
          {title}
        </p>
        <div className={`rounded p-1.5 shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-[22px] sm:text-[24px] lg:text-[26px] font-bold tracking-tight text-[#0B1F3A] leading-none">
            {value}
          </h3>
          {trend && (
            <span
              className={`inline-flex items-center text-[11px] font-bold ${
                trend.isPositive ? 'text-[#16845B]' : 'text-[#C53B3B]'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        {subtext && (
          <p className="mt-1 text-[11px] text-[#7C8796] truncate leading-tight">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
