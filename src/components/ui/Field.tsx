import React, { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/** Form input/select/textarea look (36px row, 13px text), shared by editors and dialogs. */
export const fieldControl =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-body text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-surface-subtle disabled:text-text-muted aria-[invalid=true]:border-danger';

/** `children` must be the control itself: it receives id, aria-invalid and aria-describedby. `addon` sits inside the control box. */
export function Field({ label, error, hint, addon, required, children }: { label: string; error?: string; hint?: string; addon?: ReactNode; required?: boolean; children: ReactElement }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, required: required || undefined, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy }) : children;
  return <div className="space-y-1.5 text-xs font-semibold text-text"><label htmlFor={id} className="block">{label}{required && <span aria-hidden="true" className="text-danger-dark"> *</span>}</label>{addon ? <div className="relative">{control}{addon}</div> : control}{hint && <span id={`${id}-hint`} className="block font-normal text-text-muted">{hint}</span>}{error && <span id={`${id}-error`} className="block text-danger-dark">{error}</span>}</div>;
}
