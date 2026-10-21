import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { Button } from './Button';

/**
 * A block of one subject on Dashboard / Phân tích / profiles (design.md §5.2).
 * Title, an optional short meta (period, count) and at most one link out. No icon tile, no per-block scope tag:
 * the page says once whether its numbers are sample data (SampleDataNotice).
 */
export const Panel: React.FC<{
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, meta, action, className, bodyClassName, children }) => (
  <section aria-label={typeof title === 'string' ? title : undefined} className={cn('flex min-w-0 flex-col rounded-lg border border-border bg-surface', className)}>
    <header className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
      <h2 className="min-w-0 text-sm font-semibold text-text">
        {title}
        {meta && <span className="ml-2 text-xs font-normal text-text-muted">{meta}</span>}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    <div className={cn('flex flex-1 flex-col gap-3 p-4 pt-3', bodyClassName)}>{children}</div>
  </section>
);

/** In-app link that still opens in a new tab with Ctrl/Cmd/middle click. */
export const TextLink: React.FC<{ to: string; children: React.ReactNode; className?: string; arrow?: boolean; title?: string }> = ({ to, children, className, arrow = true, title }) => (
  <a
    href={to}
    title={title}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    }}
    className={cn('inline-flex items-center gap-1 rounded text-xs font-medium text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', className)}
  >
    {children}
    {arrow && <ArrowRight size={12} aria-hidden />}
  </a>
);

export const PanelSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 4, className }) => (
  <div role="status" aria-label="Đang tải" className={cn('space-y-3 rounded-lg border border-border bg-surface p-4', className)}>
    <div className="h-5 w-40 animate-pulse rounded bg-surface-subtle" />
    {Array.from({ length: rows }, (_, i) => <div key={i} className="h-9 animate-pulse rounded bg-surface-subtle" />)}
  </div>
);

/** A data source failed: say which one, keep stale data visible when there is some (design.md §5.8). */
export const SourceError: React.FC<{ what: string; onRetry: () => void; stale?: boolean; detail?: string }> = ({ what, onRetry, stale, detail }) => (
  <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-light px-4 py-2.5 text-xs text-danger-dark">
    <span className="flex items-center gap-2"><AlertTriangle size={14} className="shrink-0" />{stale ? `Không làm mới được ${what}; đang hiển thị bản đã tải trước đó.` : `Không tải được ${what}.`}{detail && ` ${detail}`}</span>
    <Button size="sm" onClick={onRetry}>Thử lại</Button>
  </div>
);

/** Thin proportion bar inside tables and lists. */
export const Bar: React.FC<{ value: number; max: number; tone?: string }> = ({ value, max, tone = 'bg-text-light' }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
    <div className={cn('h-full rounded-full', tone)} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
  </div>
);

/** One small number inside a panel; `bad` when it breaks a rule. */
export const Mini: React.FC<{ value: React.ReactNode; label: string; bad?: boolean; hint?: string }> = ({ value, label, bad, hint }) => (
  <div title={hint} className="min-w-0 px-3 py-2">
    <div className={cn('truncate text-base font-semibold tabular-nums', bad ? 'text-danger-dark' : 'text-text')}>{value}</div>
    <div className="truncate text-xs text-text-muted">{label}</div>
  </div>
);
export const MiniStrip: React.FC<{ children: React.ReactNode; cols: string }> = ({ children, cols }) => (
  <div className={cn('grid divide-x divide-border rounded-md border border-border', cols)}>{children}</div>
);
