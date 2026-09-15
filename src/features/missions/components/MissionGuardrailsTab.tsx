import React, { useState } from 'react';
import {
  MissionGuardrailConfig,
  MissionViolation,
} from '../../../domains/missions/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Coins,
  Camera,
  Check,
  RotateCw,
  Clock,
  History,
  Lock,
  Sparkles,
} from 'lucide-react';

interface MissionGuardrailsTabProps {
  guardrailConfig: MissionGuardrailConfig;
  violations: MissionViolation[];
  onUpdateConfig: (newConfig: MissionGuardrailConfig) => void;
  onWhitelistViolation: (violationId: string) => void;
  onMitigateViolation: (violationId: string) => void;
}

export const MissionGuardrailsTab: React.FC<MissionGuardrailsTabProps> = ({
  guardrailConfig,
  violations,
  onUpdateConfig,
  onWhitelistViolation,
  onMitigateViolation,
}) => {
  const [configForm, setConfigForm] = useState<MissionGuardrailConfig>(guardrailConfig);
  const [saveToast, setSaveToast] = useState(false);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(configForm);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="space-y-5 select-none text-xs">
      {/* Top Banner */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text">
                LiveOps Guardrails & Anti-Cheat System
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                ENFORCED
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Bảo vệ nền kinh tế ảo chống lạm phát (Trần 1,000🪙 / 100💎) và chống gian lận
              scan camera (F-GAME-11).
            </p>
          </div>
        </div>

        {saveToast && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
            <Check size={14} />
            <span>Đã cập nhật chính sách an toàn!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* CỘT TRÁI: FORM CẤU HÌNH TRẦN & QUY TẮC AN TOÀN (1 CỘT) */}
        <form
          onSubmit={handleSavePolicy}
          className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-text-muted" />
              <h3 className="text-sm font-bold text-text">Chính Sách Trần Thưởng</h3>
            </div>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs"
            >
              Lưu Chính Sách
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-text mb-1">
                Trần Coins Tối Đa / Nhiệm Vụ <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="50"
                  value={configForm.maxCoinsCapPerQuest}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      maxCoinsCapPerQuest: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 pl-3 pr-12 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-2 text-[11px] text-[#9A7000] font-bold font-mono">
                  Coins
                </span>
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Mặc định: 1,000 Coins (Vượt trần cần Super Admin)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-text mb-1">
                Trần Faucet Ngày / Người Học
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  value={configForm.maxDailyPoolCoinsOutput}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      maxDailyPoolCoinsOutput: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 pl-3 pr-12 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-2 text-[11px] text-text-muted font-bold font-mono">
                  Coins/day
                </span>
              </div>
            </div>

            {/* Anti-cheat Toggles */}
            <div className="pt-3 border-t border-border space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.antiSpamScanRule}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      antiSpamScanRule: e.target.checked,
                    })
                  }
                  className="rounded border-border text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-text block">
                    Quy tắc Chống Spam AI Scan (F-GAME-11)
                  </span>
                  <span className="text-[10px] text-text-muted leading-relaxed block">
                    Chỉ tính tiến độ khi lượt chụp nhận diện có lưu thành công ≥ 1 từ vựng.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.strictIdempotencyKey}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      strictIdempotencyKey: e.target.checked,
                    })
                  }
                  className="rounded border-border text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-text block">
                    Bắt Buộc Idempotency Event Key
                  </span>
                  <span className="text-[10px] text-text-muted leading-relaxed block">
                    Ngăn chặn học viên spam claim nhiều lần khi mạng chập chờn.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </form>

        {/* CỘT PHẢI: BẢNG DANH SÁCH VI PHẠM & CAN THIỆP (2 CỘT) */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600" />
              <h3 className="text-sm font-bold text-text">
                Nhật Ký Cảnh Báo & Vi Phạm Trần ({violations.length})
              </h3>
            </div>
            <span className="text-[10px] text-text-muted">
              Yêu cầu quyền Super Admin để duyệt ngoại lệ
            </span>
          </div>

          <div className="space-y-3">
            {violations.map((vio) => (
              <div
                key={vio.id}
                className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                  vio.status === 'active'
                    ? 'bg-amber-50/50 border-amber-200'
                    : vio.status === 'whitelisted'
                    ? 'bg-slate-50 border-border opacity-85'
                    : 'bg-emerald-50/50 border-emerald-200 opacity-85'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        vio.severity === 'high'
                          ? 'bg-danger text-white'
                          : vio.severity === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {vio.severity.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-text-muted">
                      {vio.missionCode}
                    </span>
                    <span className="font-bold text-text text-xs">{vio.missionTitle}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      vio.status === 'active'
                        ? 'bg-amber-100 text-amber-800'
                        : vio.status === 'whitelisted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {vio.status}
                  </span>
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed">
                  {vio.description}
                </p>

                {vio.reason && (
                  <div className="p-2 rounded bg-surface border border-border text-[11px] text-text-muted flex items-start gap-1.5">
                    <History size={13} className="shrink-0 mt-0.5 text-text-muted" />
                    <span>
                      <strong>{vio.mitigatedBy}:</strong> "{vio.reason}"
                    </span>
                  </div>
                )}

                {/* Quick actions on violation */}
                {vio.status === 'active' && (
                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => onMitigateViolation(vio.id)}
                      className="px-3 py-1 rounded-lg border border-border bg-surface text-text hover:bg-surface-subtle font-semibold text-[11px] transition-all"
                    >
                      Hạ Về Trần An Toàn (Mitigate)
                    </button>
                    <button
                      type="button"
                      onClick={() => onWhitelistViolation(vio.id)}
                      className="px-3 py-1 rounded-lg bg-snapy hover:bg-snapy-hover text-white font-bold text-[11px] transition-all shadow-xs"
                    >
                      Duyệt Ngoại Lệ (Super Admin Whitelist)
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
