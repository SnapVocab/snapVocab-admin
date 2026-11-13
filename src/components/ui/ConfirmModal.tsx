import React, { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import { Button, ButtonVariant } from './Button';
import { useDialogFocus } from './useDialogFocus';
import { cn } from '../../lib/utils';

export type ConfirmModalTone = 'warning' | 'danger' | 'info' | 'primary';

export interface ConfirmModalProps {
  /** If undefined, defaults to true (useful when conditionally rendered: `{open && <ConfirmModal />}`) */
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  tone?: ConfirmModalTone;
  icon?: ReactNode;
  busy?: boolean;
  /** Confirm button text while `busy`, e.g. "Đang phát hành…". */
  busyLabel?: string;
  confirmDisabled?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
  disableBackdropDismiss?: boolean;
}

/**
 * Tone picks the confirm button and, for risky dialogs only, a small mark before the title.
 * No icon tile: the red or primary confirm button already says how serious the step is.
 */
const TONE_CONFIG: Record<ConfirmModalTone, { defaultVariant: ButtonVariant; mark: React.ReactElement | null }> = {
  warning: { defaultVariant: 'danger', mark: <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-dark" /> },
  danger: { defaultVariant: 'danger', mark: <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger-dark" /> },
  info: { defaultVariant: 'primary', mark: null },
  primary: { defaultVariant: 'primary', mark: null },
};

const MAX_WIDTH_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Shared accessible confirmation modal dialog.
 * - Adheres to shadcn/SnapVocab design tokens (#F8F9F7, #FFFFFF, #171717, #58CC02).
 * - Focus-trapped with Esc dismissal and autofocus on the safe "Cancel" button.
 * - Prevents background scrolling when active.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen = true,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmVariant,
  tone = 'warning',
  icon,
  busy = false,
  busyLabel,
  confirmDisabled = false,
  maxWidth = 'md',
  disableBackdropDismiss = false,
}) => {
  const dialogRef = useDialogFocus<HTMLDivElement>(isOpen, busy ? () => {} : onClose);
  const titleId = useId();
  const descId = useId();

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toneConfig = TONE_CONFIG[tone];
  const mark = icon ?? toneConfig.mark;
  const finalConfirmVariant = confirmVariant ?? toneConfig.defaultVariant;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !busy && !disableBackdropDismiss) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-[90vh] bg-surface border border-border rounded-lg shadow-modal overflow-hidden flex flex-col focus:outline-none animate-in fade-in zoom-in-95 duration-150',
          MAX_WIDTH_CLASS[maxWidth]
        )}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-start gap-2">
          {mark}
          <div className="flex-1 min-w-0 pr-2">
            <h3 id={titleId} className="text-base font-semibold text-text leading-snug">
              {title}
            </h3>
            {description && (
              <div id={descId} className="text-xs text-text-muted mt-1 leading-relaxed">
                {description}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<X />}
            label="Đóng"
            disabled={busy}
            onClick={onClose}
            className="shrink-0 -mr-2 -mt-1 text-text-muted hover:text-text"
          />
        </div>

        {/* Optional body content */}
        {children && <div className="min-h-0 overflow-y-auto px-5 py-2 text-xs text-text space-y-3">{children}</div>}

        {/* Footer actions */}
        <div className="px-5 py-3 bg-surface-subtle/60 border-t border-border flex items-center justify-end gap-2 mt-2">
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onClose}
            data-autofocus
          >
            {cancelLabel}
          </Button>

          <Button
            variant={finalConfirmVariant}
            size="md"
            disabled={busy || confirmDisabled}
            loading={busy}
            loadingText={busyLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
