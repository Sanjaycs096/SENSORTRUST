import React from 'react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  badge?: {
    text: string;
    variant?: 'neutral' | 'emerald' | 'amber' | 'rose' | 'indigo';
  };
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor = 'text-emerald-700',
  badge,
  breadcrumbs,
  actions
}) => {
  const getBadgeClasses = (variant: string = 'neutral') => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-3 pb-3 border-b border-stone-200/90">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span className="material-symbols-outlined text-[14px] text-stone-400 select-none">
                    chevron_right
                  </span>
                )}
                {crumb.onClick && !isLast ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-stone-900 font-medium transition flex items-center gap-1 focus:outline-none focus-visible:underline"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className={isLast ? 'text-stone-800 font-mono font-medium truncate max-w-[280px] sm:max-w-md' : 'text-stone-500'}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {icon && (
              <span className={`material-symbols-outlined text-2xl ${iconColor}`}>
                {icon}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {title}
            </h2>
            {badge && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-semibold ${getBadgeClasses(
                  badge.variant
                )}`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
