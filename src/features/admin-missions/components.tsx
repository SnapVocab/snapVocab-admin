import React, { cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Đang bật' : 'Đang tắt'}</Badge>;
}
export function ErrorBanner({ message, children }: { message: string; children?: ReactNode }) {
  return <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-light p-3 text-xs text-danger-dark"><AlertCircle size={16} className="shrink-0" /><div className="space-y-2"><p>{message}</p>{children}</div></div>;
}
/** `children` must be the control itself: it receives id, aria-invalid and aria-describedby. `addon` sits inside the control box. */
export function Field({ label, error, hint, addon, required, children }: { label: string; error?: string; hint?: string; addon?: ReactNode; required?: boolean; children: ReactElement }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, required: required || undefined, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy }) : children;
  return <div className="space-y-1.5 text-xs font-semibold text-text"><label htmlFor={id} className="block">{label}{required && <span aria-hidden="true" className="text-danger-dark"> *</span>}</label>{addon ? <div className="relative">{control}{addon}</div> : control}{hint && <span id={`${id}-hint`} className="block font-normal text-text-muted">{hint}</span>}{error && <span id={`${id}-error`} className="block text-danger-dark">{error}</span>}</div>;
}
export function ConfirmModal({ title, children, busy, confirmDisabled, onClose, onConfirm, confirmLabel = 'Xác nhận' }: {
  title: string; children: ReactNode; busy?: boolean; confirmDisabled?: boolean; onClose: () => void; onConfirm: () => void; confirmLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { close.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busyRef.current) close.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex="0"]');
        if (!nodes?.length) { e.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-modal focus:outline-none">
      <div className="flex items-center justify-between bg-surface-subtle px-6 py-4"><h2 className="font-bold">{title}</h2><Button variant="ghost" size="sm" icon={<X />} label="Đóng" disabled={busy} onClick={onClose} /></div>
      <div className="space-y-3 p-6 text-sm">{children}</div>
      <div className="flex justify-end gap-2 border-t border-border px-6 py-4"><Button size="sm" disabled={busy} onClick={onClose}>Hủy</Button><Button size="sm" variant="primary" disabled={busy || confirmDisabled} onClick={onConfirm}>{busy ? 'Đang xử lý…' : confirmLabel}</Button></div>
    </div>
  </div>, document.body);
}
