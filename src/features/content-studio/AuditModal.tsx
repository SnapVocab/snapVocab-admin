import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ShieldAlert, Check, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CardViewModel, VocabStatus } from '../../domains/flashcard/types';

interface AuditModalProps {
  isOpen: boolean;
  word: string;
  currentStatus: VocabStatus;
  targetStatus: VocabStatus;
  card?: CardViewModel;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const STATUS_LABELS: Record<VocabStatus, { label: string; color: string }> = {
  draft: { label: 'Bản nháp (Draft)', color: 'bg-slate-100 text-slate-700' },
  review: { label: 'Chờ duyệt (In Review)', color: 'bg-info-light text-info' },
  published: { label: 'Đã xuất bản (Published)', color: 'bg-primary-light text-primary' },
  archived: { label: 'Lưu trữ / Đã ẩn (Archived)', color: 'bg-danger-light text-danger' },
};

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  word,
  currentStatus,
  targetStatus,
  card,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on textarea when modal opens & register keyboard shortcuts
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Validation checks for target status
  const validationItems: { label: string; passed: boolean; requiredFor: VocabStatus[] }[] = [
    {
      label: 'Tên từ vựng chính không được để trống',
      passed: Boolean(card?.word && card.word.trim().length > 0),
      requiredFor: ['review', 'published'],
    },
    {
      label: 'Định nghĩa tiếng Việt tối thiểu cho nghĩa đầu tiên',
      passed: Boolean(card?.meanings[0]?.definitionVi && card.meanings[0].definitionVi.trim().length >= 3),
      requiredFor: ['review', 'published'],
    },
    {
      label: 'Phiên âm quốc tế IPA chuẩn (/.../)',
      passed: Boolean(card?.phonetic && card.phonetic.trim().length > 0),
      requiredFor: ['published'],
    },
    {
      label: 'Ít nhất 1 câu ví dụ song ngữ (EN & VI)',
      passed: Boolean(
        card?.meanings.some(
          (m) => m.examples && m.examples.length > 0 && m.examples.some((ex) => ex.en.trim() && ex.vi.trim())
        )
      ),
      requiredFor: ['published'],
    },
  ];

  const relevantChecks = validationItems.filter((item) =>
    item.requiredFor.includes(targetStatus)
  );
  const blockingIssues = relevantChecks.filter((item) => !item.passed);
  const hasBlockingIssues = blockingIssues.length > 0;

  const handleConfirm = () => {
    if (hasBlockingIssues) {
      setError('Vui lòng hoàn thiện các tiêu chuẩn bắt buộc trước khi chuyển trạng thái.');
      return;
    }

    if (!reason.trim()) {
      setError('Vui lòng nhập lý do chuyển trạng thái để lưu vết Audit Trail.');
      textareaRef.current?.focus();
      return;
    }

    onConfirm(reason.trim());
    setReason('');
    setError('');
  };

  const curr = STATUS_LABELS[currentStatus] || STATUS_LABELS.draft;
  const target = STATUS_LABELS[targetStatus] || STATUS_LABELS.published;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-modal p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-text font-bold text-base" id="audit-modal-title">
            <ShieldAlert size={20} className="text-primary" />
            <span>Audit Trail — Kiểm toán trạng thái từ vựng</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng cửa sổ"
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-subtle transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transition Preview Badge */}
        <div className="bg-surface-subtle p-3.5 rounded-xl border border-border space-y-2">
          <div className="text-xs text-text-muted">
            Từ vựng: <span className="font-extrabold text-text font-mono text-base">{word || card?.word}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${curr.color}`}>
              {curr.label}
            </span>
            <span className="text-text-muted font-bold">➔</span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${target.color}`}>
              {target.label}
            </span>
          </div>
        </div>

        {/* Readiness Validation Checklist */}
        {relevantChecks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-text flex items-center justify-between">
              <span>Điều kiện chuyển trạng thái ({relevantChecks.filter((c) => c.passed).length}/{relevantChecks.length})</span>
              {hasBlockingIssues ? (
                <span className="text-[11px] font-bold text-danger flex items-center gap-1">
                  <AlertTriangle size={12} /> Còn {blockingIssues.length} tiêu chí chưa đạt
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Đã đủ tiêu chuẩn
                </span>
              )}
            </div>

            <div className="space-y-1.5 bg-surface rounded-xl p-3 border border-border/80 text-xs">
              {relevantChecks.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-1.5 rounded-lg ${
                    item.passed
                      ? 'text-emerald-700 bg-emerald-50/50'
                      : 'text-danger bg-danger-light/50 font-medium'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-danger shrink-0" />
                  )}
                  <span className="text-xs leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reason Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text flex items-center justify-between">
            <span>Lý do thay đổi (Bắt buộc cho nhật ký kiểm toán) *</span>
            <span className="text-[11px] text-text-muted font-normal">Operator: Lead Admin (Nhấn Ctrl+Enter để lưu)</span>
          </label>
          <textarea
            ref={textareaRef}
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder="Nhập chi tiết căn cứ duyệt nội dung (ví dụ: Đã kiểm tra phát âm chuẩn US, bổ sung 2 câu ví dụ ngữ cảnh chuẩn đề thi)..."
            className="w-full text-xs p-3 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-text-light resize-none"
          />
          {error && (
            <p className="text-xs text-danger font-medium flex items-center gap-1.5 bg-danger-light/60 p-2 rounded-lg" role="alert">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-subtle border border-border transition-all"
          >
            Hủy bỏ (Esc)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={hasBlockingIssues}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-xs ${
              hasBlockingIssues
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-primary hover:bg-primary-hover active:scale-95'
            }`}
          >
            <Check size={15} />
            <span>{hasBlockingIssues ? 'Chưa đủ điều kiện duyệt' : 'Xác nhận & Lưu vết'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

