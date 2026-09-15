import React, { useState } from 'react';
import {
  Mission,
  MissionGuardrailConfig,
} from '../../../domains/missions/types';
import {
  validateMissionActivation,
  ActivationValidationResult,
} from '../../../domains/missions/selectors';
import { getSlotCategoryBadge } from '../../../domains/missions/capabilities';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface MissionActivationModalProps {
  isOpen: boolean;
  mission: Mission | null;
  allMissions: Mission[];
  guardrailConfig: MissionGuardrailConfig;
  onClose: () => void;
  onConfirmActivate: (mission: Mission, auditReason: string, approvalCode?: string) => void;
}

export const MissionActivationModal: React.FC<MissionActivationModalProps> = ({
  isOpen,
  mission,
  allMissions,
  guardrailConfig,
  onClose,
  onConfirmActivate,
}) => {
  const [auditReason, setAuditReason] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [errorText, setErrorText] = useState('');

  if (!isOpen || !mission) return null;

  const validation: ActivationValidationResult = validateMissionActivation(
    mission,
    allMissions,
    guardrailConfig
  );

  const slotBadge = getSlotCategoryBadge(mission.category);
  const worstCase = validation.worstCaseOutput;

  const handleActivate = () => {
    if (!auditReason.trim()) {
      setErrorText('Vui lòng nhập lý do kích hoạt để ghi nhận vào Audit Log (BF-15A).');
      return;
    }

    if (validation.requiresSuperAdminOverride && !approvalCode.trim()) {
      setErrorText('Phần thưởng vượt trần an toàn. Bắt buộc nhập Mã Phê Duyệt từ Super Admin.');
      return;
    }

    onConfirmActivate(mission, auditReason.trim(), approvalCode.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">
                Kích Hoạt Nhiệm Vụ Vào Pool: {mission.code}
              </h2>
              <p className="text-[11px] text-text-muted">
                Kiểm duyệt điều kiện kỹ thuật & trần kinh tế LiveOps (BF-15A)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {errorText && (
            <div className="p-3 bg-danger-light/60 border border-danger/20 rounded-xl text-danger flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Mission Summary Card */}
          <div className="p-3.5 bg-surface-subtle/80 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${slotBadge.color}`}>
                {mission.isBonus ? 'Bonus Slot' : slotBadge.label}
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                Phiên bản tiếp theo: <strong className="text-primary font-bold">v{mission.version + 1}</strong>
              </span>
            </div>
            <h3 className="font-bold text-sm text-text">{mission.title}</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">{mission.description}</p>
            <div className="flex items-center gap-4 text-[11px] text-text font-mono pt-1">
              <span>Chỉ tiêu: <strong>{mission.targetCount} {mission.unit}</strong></span>
              <span>Thưởng: <strong>+{mission.reward.coins}🪙</strong> · <strong>+{mission.reward.xp}XP</strong></span>
              <span>Trọng số: <strong>{mission.weight}</strong></span>
            </div>
          </div>

          {/* Checklist Validation */}
          <div className="space-y-2">
            <h4 className="font-bold text-text text-xs flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              <span>Danh Sách Kiểm Duyệt Tiền Kích Hoạt (Pre-Activation Checklist)</span>
            </h4>

            <div className="space-y-1.5">
              {/* Capability */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-surface text-[11px]">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-text">Capability & Event Producer: </span>
                  <span className="text-text-muted">
                    Hành động <code>{mission.actionType}</code> tương thích với event <code>{mission.triggerEvent}</code> ({mission.aggregationType}).
                  </span>
                </div>
              </div>

              {/* Target & Rules */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-surface text-[11px]">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-text">Quy tắc hoàn thành (Completion Rule): </span>
                  <span className="text-text-muted">
                    Schema hợp lệ, target {mission.targetCount} {mission.unit}.
                  </span>
                </div>
              </div>

              {/* Worst Case Output Simulation */}
              <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${
                worstCase.isExceeded
                  ? 'border-danger/30 bg-danger-light/20'
                  : 'border-border bg-surface'
              }`}>
                {worstCase.isExceeded ? (
                  <AlertTriangle size={15} className="text-danger shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">Mô phỏng trần phát thưởng Daily Pool:</span>
                    <span className={`font-mono font-bold ${worstCase.isExceeded ? 'text-danger' : 'text-emerald-600'}`}>
                      {worstCase.totalWorstCaseCoins.toLocaleString()} / {worstCase.capLimit.toLocaleString()} Coins
                    </span>
                  </div>
                  <p className="text-text-muted text-[10px] mt-0.5">
                    Kịch bản xấu nhất (5 slot bắt buộc max + bonus max + Daily Chest) nếu đưa nhiệm vụ này vào hoạt động.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings or Errors */}
          {validation.errors.length > 0 && (
            <div className="p-3 bg-danger-light/40 border border-danger/30 rounded-xl space-y-1">
              <span className="font-bold text-danger flex items-center gap-1">
                <AlertTriangle size={13} />
                Không Thể Kích Hoạt Do Lỗi Sau:
              </span>
              <ul className="list-disc list-inside text-danger text-[11px] space-y-0.5">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <Info size={13} />
                Cảnh Báo Cần Lưu Ý:
              </span>
              <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Super Admin Override Code Required */}
          {validation.requiresSuperAdminOverride && (
            <div className="p-3 bg-surface-subtle border border-danger/30 rounded-xl space-y-2">
              <label className="block font-semibold text-danger">
                Mã Phê Duyệt Ngoại Lệ Của Super Admin <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={approvalCode}
                onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
                placeholder="VD: SA-APPR-202609-XYZ"
                className="w-full p-2 rounded-lg border border-danger/40 bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-danger"
              />
              <span className="text-[10px] text-text-muted block">
                Nhiệm vụ có mức thưởng vượt trần an toàn, bắt buộc có Ticket phê duyệt chính thức.
              </span>
            </div>
          )}

          {/* Mandatory Audit Reason */}
          <div>
            <label className="block font-semibold text-text mb-1">
              Lý Do Kích Hoạt (Audit Reason) <span className="text-danger">*</span>
            </label>
            <textarea
              rows={2}
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              placeholder="VD: Kích hoạt thay thế template MS-D-01 cũ, bổ sung nhóm từ vựng mới cho sự kiện..."
              className="w-full p-2 rounded-lg border border-border bg-surface text-text focus:ring-1 focus:ring-primary text-xs"
            />
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Ghi nhận vào Audit Trail bất biến. Các nhiệm vụ đã cấp trong ngày hôm nay sẽ không bị thay đổi.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-subtle transition-all"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            disabled={!validation.canActivate}
            onClick={handleActivate}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Zap size={14} />
            <span>Kích Hoạt (Lên v{mission.version + 1})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
