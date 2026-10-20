import React, { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Đang bật' : 'Đang tắt'}</Badge>;
}
export function ErrorBanner({ message, children }: { message: string; children?: ReactNode }) {
  return <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-light p-3 text-xs text-danger-dark"><AlertCircle size={16} className="shrink-0" /><div className="space-y-2"><p>{message}</p>{children}</div></div>;
}
/** Shared form field (components/ui); re-exported for existing Missions call sites. */
export { Field } from '../../components/ui/Field';
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
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-modal focus:outline-none">
      <div className="flex items-center justify-between px-5 pb-2 pt-4"><h2 className="text-base font-semibold">{title}</h2><Button variant="ghost" size="sm" icon={<X />} label="Đóng" disabled={busy} onClick={onClose} /></div>
      <div className="space-y-3 px-5 py-2 text-sm">{children}</div>
      <div className="mt-2 flex justify-end gap-2 border-t border-border bg-surface-subtle/60 px-5 py-3"><Button disabled={busy} onClick={onClose}>Hủy</Button><Button variant="primary" disabled={busy || confirmDisabled} onClick={onConfirm}>{busy ? 'Đang xử lý…' : confirmLabel}</Button></div>
    </div>
  </div>, document.body);
}
