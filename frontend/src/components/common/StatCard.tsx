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
    iconBg: 'bg-[#EFF6FF]',
    iconColor: 'text-[#2563EB]',
  },
  emerald: {
    iconBg: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]',
  },
  amber: {
    iconBg: 'bg-[#FFFBEB]',
    iconColor: 'text-[#D97706]',
  },
  rose: {
    iconBg: 'bg-[#FEF2F2]',
    iconColor: 'text-[#DC2626]',
  },
  purple: {
    iconBg: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
  },
  indigo: {
    iconBg: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
  },
  cyan: {
    iconBg: 'bg-[#ECFEFF]',
    iconColor: 'text-[#0891B2]',
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
    <div
      className="relative overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-[#0F172A]">{value}</h3>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="mt-1 text-xs text-[#64748B]">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
