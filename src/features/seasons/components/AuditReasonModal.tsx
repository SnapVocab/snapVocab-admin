import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface AuditReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionLabel: string;
  isDangerous?: boolean;
  onConfirm: (reason: string, ticketId: string) => void;
}

export const AuditReasonModal: React.FC<AuditReasonModalProps> = (props) => {
  if (!props.isOpen) return null;

  return <AuditReasonModalContent {...props} />;
};

const AuditReasonModalContent: React.FC<AuditReasonModalProps> = ({
  onClose,
  title,
  description,
  actionLabel,
  isDangerous = false,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do vận hành cho hành động này.');
      return;
    }
    onConfirm(reason.trim(), ticketId.trim());
    setReason('');
    setTicketId('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDangerous
              ? 'bg-danger-light/50 border-danger/20 text-danger'
              : 'bg-canvas border-border text-text'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDangerous
                  ? 'bg-danger text-white'
                  : 'bg-primary-light text-primary'
              }`}
            >
              {isDangerous ? (
                <AlertTriangle size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
              <p className="text-[11px] text-text-muted">
                Yêu cầu ghi nhật ký kiểm toán (Audit Trail)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <p className="text-text-muted leading-relaxed">{description}</p>

          {errorMsg && (
            <div className="p-2 rounded bg-danger-light border border-danger/20 text-danger font-semibold text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-text mb-1">
              Lý Do Vận Hành <span className="text-danger">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Điều tra bug tính điểm lặp lại; Xử lý tố cáo gian lận theo Ticket #..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-text mb-1">
              Mã Ticket Hỗ Trợ / Bảo Mật (Nếu có)
            </label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="#LEAD-2026-881 hoặc #CHEAT-102"
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-medium text-text focus:outline-none focus:border-primary uppercase"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-canvas border border-border font-semibold text-text text-xs transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-xs ${
                isDangerous
                  ? 'bg-danger hover:bg-danger-hover text-white'
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
