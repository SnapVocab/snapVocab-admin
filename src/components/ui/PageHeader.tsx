import React from 'react';

/** Toolbar search/select: same height and text size as Button md (36px / 13px). */
export const toolbarControl =
  'h-9 rounded-lg border border-border bg-surface px-3 text-body font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

export interface PageHeaderProps {
  title: string;
  /**
   * One line the operator needs to read the page correctly: a business rule or a unit the numbers use.
   * Not a summary of what the page shows (design.md §5.1).
   */
  description?: React.ReactNode;
  /** Page status (e.g. "Cập nhật 13:49") and page-level actions; at most one primary (design.md §3.5). */
  actions?: React.ReactNode;
}

/** Title row of list screens. The sidebar already says where the page lives, so there is no eyebrow or icon. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-body text-text-muted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
);
