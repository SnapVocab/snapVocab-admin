import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useDialogFocus } from './useDialogFocus';

interface DrawerProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  /** While a write is in flight, Esc and the close button do nothing. */
  busy?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: 'md' | 'lg';
}

/** Right-hand modal panel for forms and detail that need more room than a dialog (design.md §5.5). */
export const Drawer: React.FC<DrawerProps> = ({ title, subtitle, onClose, busy, footer, children, width = 'md' }) => {
  const ref = useDialogFocus<HTMLDivElement>(true, busy ? () => {} : onClose);
  const titleId = useId();
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`flex h-full w-full flex-col bg-surface shadow-modal focus:outline-none ${width === 'lg' ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-text">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-text-muted">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" icon={<X />} label="Đóng" disabled={busy} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-subtle/70 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
