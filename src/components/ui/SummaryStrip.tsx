import React from 'react';
import { cn } from '../../lib/utils';

/** design.md §5.2: one bordered strip of numbers instead of KPI cards; cells are divided by hairlines. */
export const SummaryStrip: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div role="group" aria-label={label} className="flex items-stretch overflow-x-auto rounded-lg border border-border bg-surface divide-x divide-border">
    {children}
  </div>
);

/** One number of the strip; it is also the filter for that group (pressed = active, empty = disabled). */
export const StripCell: React.FC<{ value: number; label: string; dot?: string; active: boolean; onClick: () => void }> = ({
  value, label, dot, active, onClick,
}) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={value === 0 && !active}
    onClick={onClick}
    className={cn(
      'shrink-0 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info enabled:hover:bg-surface-subtle',
      active && 'bg-surface-subtle shadow-[inset_0_-2px_0_#171717]',
    )}
  >
    <div className={cn('text-figure tabular-nums', value === 0 ? 'text-text-light' : 'text-text')}>{value.toLocaleString('vi-VN')}</div>
    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-text-muted">
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {label}
    </div>
  </button>
);

/** Right-hand context cell of the strip: one operational conclusion (price band, rule, reward per day). */
export const StripNote: React.FC<{ children: React.ReactNode; title?: string; push?: boolean }> = ({ children, title, push }) => (
  <div title={title} className={cn('flex shrink-0 flex-col justify-center gap-1 px-4 py-2.5 text-xs text-text-muted', push && 'ml-auto')}>
    {children}
  </div>
);

/** Read-only number of the strip (profile pages): same look as StripCell, no filter behind it. */
export const StatCell: React.FC<{ value: React.ReactNode; label: string; hint?: string }> = ({ value, label, hint }) => (
  <div className="shrink-0 px-4 py-2.5" title={hint}>
    <div className="text-figure tabular-nums text-text">{value}</div>
    <div className="whitespace-nowrap text-xs text-text-muted">{label}</div>
  </div>
);

/** Column sparkline in one neutral tone; the last column (today) is drawn darker. */
export const Spark: React.FC<{ values: number[]; label: string }> = ({ values, label }) => {
  const max = Math.max(...values, 1);
  return (
    <div role="img" aria-label={`${label}: ${values.join(' → ')}`} className="flex h-6 w-16 shrink-0 items-end gap-[2px]">
      {values.map((v, i) => <span key={i} className={cn('flex-1 rounded-[1px]', i === values.length - 1 ? 'bg-text-muted' : 'bg-border-strong')} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}
    </div>
  );
};

/** KPI of a strip: number, its context ("/ 44", "lỗi 9,7%"), label and an optional sparkline; a link when `onClick` is set. */
export const KpiCell: React.FC<{ value: React.ReactNode; of?: React.ReactNode; label: string; spark?: number[]; hint?: string; onClick?: () => void }> = ({
  value, of, label, spark, hint, onClick,
}) => {
  const body = (
    <div className="flex items-end gap-3">
      <div className="min-w-0">
        <div className="whitespace-nowrap text-figure tabular-nums text-text">{value}{of && <span className="ml-1 text-body font-normal text-text-muted">{of}</span>}</div>
        <div className="whitespace-nowrap text-xs text-text-muted">{label}</div>
      </div>
      {spark && <Spark values={spark} label={label} />}
    </div>
  );
  return onClick
    ? <button type="button" title={hint} onClick={onClick} className="shrink-0 px-4 py-2.5 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info">{body}</button>
    : <div title={hint} className="shrink-0 px-4 py-2.5">{body}</div>;
};
