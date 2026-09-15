import React from 'react';
import { Mission, MissionGuardrailConfig } from '../../../domains/missions/types';
import {
  X,
  Target,
  Edit2,
  Archive,
  Copy,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  History,
  Sparkles,
} from 'lucide-react';

interface MissionInspectorDrawerProps {
  mission: Mission | null;
  isOpen: boolean;
  guardrailConfig: MissionGuardrailConfig;
  onClose: () => void;
  onEdit: (mission: Mission) => void;
  onDuplicate: (mission: Mission) => void;
  onArchive: (mission: Mission) => void;
}

export const MissionInspectorDrawer: React.FC<MissionInspectorDrawerProps> = ({
  mission,
  isOpen,
  guardrailConfig,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
}) => {
  if (!isOpen || !mission) return null;

  const isOverCeiling =
    (mission.reward.coins || 0) > guardrailConfig.maxCoinsCapPerQuest;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-surface h-full shadow-2xl border-l border-border flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-light text-primary border border-primary/20">
              {mission.code}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                mission.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : mission.status === 'draft'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {mission.status}
            </span>
            {mission.isBonus && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-snapy-light text-snapy border border-snapy/20">
                ★ BONUS
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {/* Mission Title & Description */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                mission.isBonus
                  ? 'bg-snapy-light text-snapy border-snapy/20'
                  : 'bg-primary-light text-primary border-primary/20'
              }`}>
                {mission.isBonus ? '★ BONUS QUEST' : mission.category}
              </span>
              <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-surface-subtle border border-border">
                v{mission.version || 1}
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                Client: {mission.minimumSupportedClientVersion || 'v1.0.0'}
              </span>
            </div>
            <h2 className="text-base font-bold text-text mb-1 leading-snug">
              {mission.title}
            </h2>
            <p className="text-text-muted leading-relaxed">{mission.description}</p>
          </div>

          {/* Technical Capability & Rules Box */}
          <div className="p-3 bg-surface-subtle border border-border rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-text uppercase tracking-wider block">
              Quy Chuẩn Kỹ Thuật (BF-12C & BF-15A)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-text-muted block">Hành Động (Action):</span>
                <strong className="text-text font-mono">{mission.actionType}</strong>
              </div>
              <div>
                <span className="text-text-muted block">Gom Tụ (Aggregation):</span>
                <strong className="text-text font-mono">{mission.aggregationType}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted block">Trigger Event:</span>
                <code className="text-primary font-mono text-[10px] bg-surface px-1 py-0.5 rounded border border-border">
                  {mission.triggerEvent}
                </code>
              </div>
              <div className="col-span-2">
                <span className="text-text-muted block">Màn Hình Điều Hướng (CTA Route):</span>
                <strong className="text-text font-mono">
                  {mission.navigationParams?.targetScreen || 'HOME_HUB'}
                </strong>
                {mission.navigationParams?.ctaLabel && (
                  <span className="text-text-muted text-[10px] ml-1">
                    ("{mission.navigationParams.ctaLabel}")
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Target Metric Box */}
          <div className="p-3 bg-surface-subtle border border-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-info-light text-info flex items-center justify-center">
                <Target size={16} />
              </div>
              <div>
                <span className="text-[11px] text-text-muted">Chỉ Tiêu Hành Động</span>
                <div className="font-bold text-text">
                  {mission.targetCount} {mission.unit}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-text-muted">Độ Khó</span>
              <div className="font-bold text-text capitalize">{mission.difficulty}</div>
            </div>
          </div>

          {/* Rewards Grid */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Phần Thưởng Nhận Được
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-reward-light/60 border border-reward/30 rounded-xl text-center">
                <div className="text-[10px] text-[#9A7000] font-semibold">Coins</div>
                <div className="text-sm font-bold text-[#9A7000] font-mono">
                  +{mission.reward.coins}
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                <div className="text-[10px] text-emerald-800 font-semibold">XP</div>
                <div className="text-sm font-bold text-emerald-700 font-mono">
                  +{mission.reward.xp}
                </div>
              </div>
            </div>
          </div>

          {/* LiveOps Guardrail Assessment */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Đánh Giá Guardrails & Anti-Cheat
            </span>
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                isOverCeiling
                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
              }`}
            >
              {isOverCeiling ? (
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs">
                  {isOverCeiling ? 'Vượt Trần An Toàn (Whitelisted)' : 'Tuân Thủ Chuẩn Kinh Tế'}
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  {isOverCeiling
                    ? 'Nhiệm vụ này có mức thưởng lớn hơn 1,000 Coins và đã được gán ngoại lệ trong Audit Trail.'
                    : 'Nằm trong ngưỡng trần an toàn (≤ 1,000 Coins). Tương thích thuật toán F-GAME-11.'}
                </p>
              </div>
            </div>
          </div>

          {/* Performance & Completion Stats */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Hiệu Suất & Lượt Tương Tác
            </span>
            <div className="p-3 bg-surface border border-border rounded-xl space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">Tỷ Lệ Hoàn Thành:</span>
                  <span className="font-bold text-text font-mono">{mission.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-info h-full rounded-full"
                    style={{ width: `${mission.completionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">Tỷ Lệ Nhận Thưởng (Claim):</span>
                  <span className="font-bold text-text font-mono">{mission.claimRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${mission.claimRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-text-muted">Đã hoàn thành:</span>
                  <div className="font-mono font-bold text-text">
                    {mission.totalCompletedCount.toLocaleString()} lượt
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Đã nhận thưởng:</span>
                  <div className="font-mono font-bold text-text">
                    {mission.totalClaimedCount.toLocaleString()} lượt
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail Metadata */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <History size={13} />
              <span>Cập nhật lần cuối:</span>
              <strong className="text-text">{mission.lastUpdated}</strong>
            </div>
            <div className="text-[11px] text-text-muted">
              Người chỉnh sửa: <strong className="text-text">{mission.updatedBy}</strong>
            </div>
            {mission.auditNotes && (
              <div className="p-2.5 bg-surface-subtle rounded-lg text-[11px] text-text-muted italic border border-border/70">
                "{mission.auditNotes}"
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-subtle/50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onArchive(mission)}
            className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-danger hover:bg-danger-light/30 transition-all flex items-center gap-1.5"
          >
            <Archive size={14} />
            <span>{mission.status === 'archived' ? 'Khôi Phục' : 'Lưu Trữ'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDuplicate(mission)}
              className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-text hover:bg-surface transition-all flex items-center gap-1.5"
            >
              <Copy size={14} />
              <span>Nhân Bản</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(mission)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Edit2 size={14} />
              <span>Chỉnh Sửa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
