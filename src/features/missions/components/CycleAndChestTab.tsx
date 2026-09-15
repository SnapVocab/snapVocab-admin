import React, { useState } from 'react';
import {
  DailyCycleConfig,
  WeeklyMilestoneConfig,
  WeeklyStampMilestone,
  Mission,
  MissionGuardrailConfig,
} from '../../../domains/missions/types';
import { calculateWorstCaseDailyOutput } from '../../../domains/missions/selectors';
import {
  CalendarClock,
  Clock,
  Gift,
  Coins,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCw,
  AlertCircle,
  Trophy,
  Award,
  Layers,
} from 'lucide-react';

interface CycleAndChestTabProps {
  dailyConfig: DailyCycleConfig;
  weeklyConfig: WeeklyMilestoneConfig;
  countdownText: string;
  missions?: Mission[];
  guardrailConfig?: MissionGuardrailConfig;
  onUpdateDailyConfig: (newConfig: DailyCycleConfig) => void;
  onUpdateWeeklyConfig: (newConfig: WeeklyMilestoneConfig) => void;
}

export const CycleAndChestTab: React.FC<CycleAndChestTabProps> = ({
  dailyConfig,
  weeklyConfig,
  countdownText,
  missions = [],
  guardrailConfig,
  onUpdateDailyConfig,
  onUpdateWeeklyConfig,
}) => {
  const [dailyForm, setDailyForm] = useState<DailyCycleConfig>(dailyConfig);
  const [weeklyForm, setWeeklyForm] = useState<WeeklyMilestoneConfig>(weeklyConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const worstCase = calculateWorstCaseDailyOutput(
    missions,
    dailyForm.dailyChestReward.coins,
    guardrailConfig?.maxDailyPoolCoinsOutput || 2500
  );

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDailyConfig(dailyForm);
    onUpdateWeeklyConfig(weeklyForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdateMilestone = (
    index: number,
    field: 'coins' | 'xp' | 'exclusiveItem',
    val: string | number
  ) => {
    const updatedMilestones = [...weeklyForm.milestones];
    const target = { ...updatedMilestones[index] };
    if (field === 'exclusiveItem') {
      target.reward = { ...target.reward, exclusiveItem: val as string };
    } else {
      target.reward = { ...target.reward, [field]: Number(val) };
    }
    updatedMilestones[index] = target;
    setWeeklyForm({ ...weeklyForm, milestones: updatedMilestones });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner Alert */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check size={16} className="text-emerald-600" />
          <span>Đã lưu thành công các thông số Chu Kỳ Reset, Rương Ngày & Tuần!</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-2xl p-4 shadow-card">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <span>Chu Kỳ Nhiệm Vụ & Cơ Chế Mở Rương Thưởng (Chests)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
              Timezone: Asia/Ho_Chi_Minh
            </span>
          </h2>
          <p className="text-xs text-text-muted">
            Quản lý giờ chốt sổ Daily Chest và các mốc tích lũy tem Activity Stamps theo tuần (BF-12E, BF-12F)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-text-muted block">Thời gian tới reset:</span>
            <span className="font-mono text-sm font-extrabold text-primary">
              {countdownText}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Check size={14} />
            <span>Lưu & Cập Nhật Chu Kỳ</span>
          </button>
        </div>
      </div>

      {/* WORST-CASE DAILY POOL SIMULATION PANEL (BF-15A) */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-amber-500" />
            <h3 className="text-xs font-bold text-text">
              Mô Phỏng Trần Phát Thưởng Daily Pool (Worst-Case Output Simulation - BF-15A)
            </h3>
          </div>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
            worstCase.isExceeded
              ? 'bg-danger-light text-danger border-danger/30'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {worstCase.isExceeded ? '⚠️ VƯỢT TRẦN HỆ THỐNG' : '✓ AN TOÀN TRONG HẠN MỨC'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-surface-subtle border border-border rounded-xl">
            <span className="text-[10px] text-text-muted block font-semibold">5 Slot Bắt Buộc (Max)</span>
            <span className="text-sm font-bold font-mono text-text">
              {worstCase.mandatoryCoinsMax.toLocaleString()} 🪙
            </span>
          </div>

          <div className="p-3 bg-surface-subtle border border-border rounded-xl">
            <span className="text-[10px] text-text-muted block font-semibold">1 Slot Bonus (Max)</span>
            <span className="text-sm font-bold font-mono text-text">
              +{worstCase.bonusCoinsMax.toLocaleString()} 🪙
            </span>
          </div>

          <div className="p-3 bg-surface-subtle border border-border rounded-xl">
            <span className="text-[10px] text-text-muted block font-semibold">Daily Chest Thưởng</span>
            <span className="text-sm font-bold font-mono text-text">
              +{worstCase.chestCoins.toLocaleString()} 🪙
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${
            worstCase.isExceeded
              ? 'bg-danger-light/30 border-danger/40 text-danger'
              : 'bg-primary-light/40 border-primary/30 text-primary'
          }`}>
            <span className="text-[10px] text-text-muted block font-semibold">Tổng Kịch Bản Xấu Nhất / Cap</span>
            <span className="text-sm font-bold font-mono">
              {worstCase.totalWorstCaseCoins.toLocaleString()} / {worstCase.capLimit.toLocaleString()} 🪙
            </span>
          </div>
        </div>

        <p className="text-[10px] text-text-muted">
          Công thức quy chuẩn BF-15A: Tự động cộng phần thưởng cao nhất trong từng nhóm slot đang active nhằm đảm bảo kể cả khi thuật toán weighted-random chọn toàn bộ nhiệm vụ nhiều Coin nhất, tổng phát ra mỗi học viên/ngày không vượt quá hạn mức Guardrail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KHỐI 1: CẤU HÌNH DAILY CYCLE & THUẬT TOÁN POOL */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <CalendarClock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Chu Kỳ Reset Hàng Ngày</h3>
                <p className="text-[11px] text-text-muted">
                  Quy tắc BF-12A: Cố định 5 nhiệm vụ bắt buộc + tối đa 1 bonus
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              00:00 GMT+7
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* KHÓA CỨNG 5 NHIỆM VỤ */}
              <div className="p-3 bg-surface-subtle border border-border rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-text text-xs">
                    Số Nhiệm Vụ Bắt Buộc
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Cố Định
                  </span>
                </div>
                <div className="text-lg font-mono font-extrabold text-primary">
                  5 nhiệm vụ
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Quy chuẩn BF-12A: Đúng 5 slot danh mục
                </span>
              </div>

              {/* KHÓA CỨNG TỐI ĐA 1 BONUS */}
              <div className="p-3 bg-surface-subtle border border-border rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-text text-xs">
                    Nhiệm Vụ Thưởng Thêm
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Cố Định
                  </span>
                </div>
                <div className="text-lg font-mono font-extrabold text-primary">
                  Tối đa 1 bonus
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Tùy chọn, không tính mở Daily Chest
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-text mb-1">
                Seed Thuật Toán Xoay Tua Pool (Weighted Random)
              </label>
              <input
                type="text"
                value={dailyForm.weightedRandomSeed}
                onChange={(e) =>
                  setDailyForm({
                    ...dailyForm,
                    weightedRandomSeed: e.target.value,
                  })
                }
                className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono text-xs focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Dựa trên phân bổ trọng số (Weight) kết hợp phân khúc người học
              </span>
            </div>

            {/* Note alert */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy chuẩn nghiêm ngặt (BF-12G):</strong> Sau mốc 00:00 GMT+7,
                mọi tiến độ nhiệm vụ ngày chưa hoàn thành hoặc đã hoàn thành nhưng chưa
                claim sẽ lập tức chuyển sang trạng thái <code>EXPIRED</code>. Hệ thống
                tuyệt đối không cộng dồn hoặc cấp bù Activity Stamp hồi tố.
              </div>
            </div>
          </div>

          {/* CẤU HÌNH DAILY CHEST */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-[#9A7000]" />
                <span className="font-bold text-text">
                  Phần Thưởng Rương Ngày (Daily Chest)
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-reward-light px-2 py-0.5 rounded border border-reward/30">
                Đạt 5/5 Nhiệm Vụ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-text mb-1">Coins</label>
                <input
                  type="number"
                  min="0"
                  value={dailyForm.dailyChestReward.coins}
                  onChange={(e) =>
                    setDailyForm({
                      ...dailyForm,
                      dailyChestReward: {
                        ...dailyForm.dailyChestReward,
                        coins: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">XP</label>
                <input
                  type="number"
                  min="0"
                  value={dailyForm.dailyChestReward.xp}
                  onChange={(e) =>
                    setDailyForm({
                      ...dailyForm,
                      dailyChestReward: {
                        ...dailyForm.dailyChestReward,
                        xp: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-border bg-surface text-text font-mono font-bold focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2: CẤU HÌNH 3 MỐC RƯƠNG TUẦN & ACTIVITY STAMPS */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-snapy-light text-snapy flex items-center justify-center">
                <Trophy size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">
                  3 Mốc Rương Tuần (Activity Stamps)
                </h3>
                <p className="text-[11px] text-text-muted">
                  Chu kỳ Thứ 2 → Chủ Nhật (F-GAME-04, MH-GAME-02)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-snapy-light text-snapy font-bold">
              7 Stamps Max
            </span>
          </div>

          <p className="text-text-muted text-[11px] leading-relaxed">
            Mỗi ngày học viên hoàn thành trọn vẹn 5/5 nhiệm vụ hàng ngày sẽ được cấp{' '}
            <strong>1 Activity Stamp</strong>. Khi tích lũy đủ 3, 5, hoặc 7 stamps trong tuần,
            học viên sẽ mở khóa các mốc rương tương ứng:
          </p>

          <div className="space-y-3">
            {weeklyForm.milestones.map((ms, index) => (
              <div
                key={ms.tier}
                className="p-3.5 bg-surface-subtle/70 border border-border rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ms.icon}</span>
                    <div>
                      <div className="font-bold text-text">{ms.chestName}</div>
                      <div className="text-[10px] text-text-muted">
                        Yêu cầu: <strong>{ms.stampsRequired} Stamps</strong> trong tuần
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      ms.tier === 'gold'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : ms.tier === 'silver'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {ms.tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-text mb-0.5">
                      Coins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ms.reward.coins}
                      onChange={(e) =>
                        handleUpdateMilestone(index, 'coins', e.target.value)
                      }
                      className="w-full p-1.5 rounded-md border border-border bg-surface text-text font-mono font-bold text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text mb-0.5">
                      XP
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ms.reward.xp}
                      onChange={(e) =>
                        handleUpdateMilestone(index, 'xp', e.target.value)
                      }
                      className="w-full p-1.5 rounded-md border border-border bg-surface text-text font-mono font-bold text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {ms.tier !== 'bronze' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-text mb-0.5">
                      Vật Phẩm / Danh Hiệu Kèm Theo
                    </label>
                    <input
                      type="text"
                      value={ms.reward.exclusiveItem || ''}
                      onChange={(e) =>
                        handleUpdateMilestone(index, 'exclusiveItem', e.target.value)
                      }
                      placeholder="VD: Khung Avatar Hoàng Gia / Booster x2 XP..."
                      className="w-full p-1.5 rounded-md border border-border bg-surface text-text text-[11px] focus:ring-1 focus:ring-primary"
                    />
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
