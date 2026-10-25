import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  colorTheme?: 'emerald' | 'amber' | 'sky' | 'rose' | 'stone';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  colorTheme = 'stone',
  badge
}) => {
  const getThemeStyles = () => {
    switch (colorTheme) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          border: 'border-emerald-200/80',
          valueColor: 'text-emerald-950',
          indicator: 'bg-emerald-500'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-50 text-amber-900 border-amber-200/60',
          border: 'border-amber-200/80',
          valueColor: 'text-amber-950',
          indicator: 'bg-amber-500'
        };
      case 'sky':
        return {
          iconBg: 'bg-sky-50 text-sky-800 border-sky-200/60',
          border: 'border-sky-200/80',
          valueColor: 'text-sky-950',
          indicator: 'bg-sky-500'
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-50 text-rose-800 border-rose-200/60',
          border: 'border-rose-200/80',
          valueColor: 'text-rose-950',
          indicator: 'bg-rose-500'
        };
      default:
        return {
          iconBg: 'bg-stone-100 text-stone-700 border-stone-200',
          border: 'border-stone-200',
          valueColor: 'text-stone-900',
          indicator: 'bg-stone-400'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      className={`bg-white rounded-xl border ${theme.border} p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between gap-3 relative overflow-hidden`}
    >
      <div className="space-y-1 z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider font-mono">
            {label}
          </span>
          {badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${theme.valueColor}`}>
          {value}
        </div>
        {subtext && <p className="text-[11px] text-stone-600 leading-tight">{subtext}</p>}
      </div>

      <div
        className={`w-10 h-10 rounded-lg ${theme.iconBg} border flex items-center justify-center shrink-0 z-10`}
      >
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
    </div>
  );
};
