import React from 'react';

/** Toolbar search/select: same height and text size as Button md (36px / 13px). */
export const toolbarControl =
  'h-9 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

export interface PageHeaderProps {
  /** Sidebar section the page lives in, e.g. "Gamification". */
  eyebrow: string;
  icon: React.ReactElement<{ size?: number; className?: string }>;
  title: string;
  description: React.ReactNode;
  /** Page-level actions; at most one primary (design.md §3). */
  actions?: React.ReactNode;
}

/** Standard page header for list screens (Shop, Missions, Badges). */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, icon, title, description, actions }) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <p className="mb-1 text-xs text-text-muted">{eyebrow}</p>
      <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-text">
        {React.cloneElement(icon, { size: 20, className: 'text-primary shrink-0' })}
        {title}
      </h1>
      <p className="mt-1 max-w-3xl text-xs text-text-muted">{description}</p>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
);
