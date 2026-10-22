import React, { useCallback, useState } from 'react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { auditReasonError } from '../../domains/admin-audit/mappers';
import { ApiClientError } from '../../lib/api-client';
import { cn } from '../../lib/utils';

/**
 * "Lý do" of a sensitive admin write (design.md §8.3, FE-AUD-01). It lands in the activity log, so the hint says so.
 * The error shows once the field was left or a confirm was tried (`touched`).
 */
export function ReasonField({ value, onChange, touched, onBlur, placeholder }: {
  value: string; onChange: (v: string) => void; touched: boolean; onBlur: () => void; placeholder?: string;
}) {
  const error = auditReasonError(value);
  return (
    <label className="block space-y-1.5 font-semibold">
      <span>Lý do <span className="text-danger-dark">*</span></span>
      <textarea rows={3} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        aria-invalid={touched && error ? true : undefined}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder={placeholder} />
      <span className={cn('block font-normal', touched && error ? 'text-danger-dark' : 'text-text-muted')}>
        {touched && error ? error : 'Ghi vào nhật ký hoạt động cùng thay đổi.'}
      </span>
    </label>
  );
}

/** The admin closed the reason dialog: the write was not sent again. Callers ignore it. */
export class ReasonCancelled extends Error {
  constructor() {
    super('Đã hủy: chưa lưu.');
  }
}

interface Ask {
  guardrail: string | null;
  send: (reason: string) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

/**
 * Sends a write as usual; when the server answers AUDIT_REASON_REQUIRED (a guardrail was passed,
 * admin_audit_log_backend.md §4.5), asks for a reason and sends the same write again with it.
 * `run` resolves with the server result, or rejects with the server error or ReasonCancelled.
 * Render `dialog` once in the page.
 */
export function useReasonPrompt() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const run = useCallback(<T,>(send: (reason?: string) => Promise<T>): Promise<T> => send().catch((e: unknown) => {
    if (!(e instanceof ApiClientError && e.code === 'AUDIT_REASON_REQUIRED')) throw e;
    const guardrail = typeof e.details?.guardrail === 'string' ? e.details.guardrail : null;
    return new Promise<T>((resolve, reject) => setAsk({ guardrail, send, resolve: resolve as (v: unknown) => void, reject }));
  }), []);
  const dialog = ask && <ReasonDialog key={String(ask.guardrail)} ask={ask} onDone={() => setAsk(null)} />;
  return { run, dialog };
}

function ReasonDialog({ ask, onDone }: { ask: Ask; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invalid = auditReasonError(reason);
  const cancel = () => { if (busy) return; ask.reject(new ReasonCancelled()); onDone(); };
  const confirm = async () => {
    setTouched(true);
    if (invalid || busy) return;
    setBusy(true); setError('');
    try {
      ask.resolve(await ask.send(reason.trim()));
      onDone();
    } catch (e) {
      // A bad reason stays here to fix; anything else (conflict, validation, network) goes back to the page.
      if (e instanceof ApiClientError && e.code === 'AUDIT_REASON_INVALID') { setError(e.message); setBusy(false); return; }
      ask.reject(e);
      onDone();
    }
  };
  return (
    <ConfirmModal title="Cần ghi lý do để lưu" tone="warning" confirmVariant="primary" confirmLabel="Lưu kèm lý do"
      busy={busy} busyLabel="Đang lưu…" confirmDisabled={touched && Boolean(invalid)} disableBackdropDismiss
      onClose={cancel} onConfirm={() => void confirm()}
      description={ask.guardrail ?? 'Thay đổi này vượt mức gợi ý nên cần lý do.'}>
      <p className="text-text-muted">Mức gợi ý không chặn lưu. Ghi lại vì sao bạn vẫn chọn giá trị này để người sau hiểu.</p>
      <ReasonField value={reason} onChange={setReason} touched={touched} onBlur={() => setTouched(true)}
        placeholder="VD: Vật phẩm giới hạn mùa xuân, định giá cao hơn các khung đang bán." />
      {error && <p role="alert" className="text-danger-dark">{error}</p>}
    </ConfirmModal>
  );
}
