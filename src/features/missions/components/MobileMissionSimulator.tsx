import React, { useState } from 'react';
import {
  Mission,
  DailyCycleConfig,
  WeeklyMilestoneConfig,
} from '../../../domains/missions/types';
import {
  Smartphone,
  Sparkles,
  Gift,
  Clock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Camera,
  BookOpen,
  RotateCw,
  Trophy,
  Layers,
  Award,
} from 'lucide-react';

interface MobileMissionSimulatorProps {
  missions: Mission[];
  dailyConfig: DailyCycleConfig;
  weeklyConfig: WeeklyMilestoneConfig;
  countdownText: string;
  onClose?: () => void;
}

export const MobileMissionSimulator: React.FC<MobileMissionSimulatorProps> = ({
  missions,
  dailyConfig,
  weeklyConfig,
  countdownText,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'hub' | 'widget'>('hub');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // Simulated state for mobile interactive claims
  const [claimedMissions, setClaimedMissions] = useState<Record<string, boolean>>({
    'ms-d-01': true,
  });
  const [dailyChestClaimed, setDailyChestClaimed] = useState(false);
  const [simulatedCoins, setSimulatedCoins] = useState(640);
  const [claimToast, setClaimToast] = useState<string | null>(null);

  // Daily missions in simulator
  const dailyMissions = missions
    .filter((m) => m.type === 'daily' && m.status === 'active')
    .slice(0, 6);

  const completedMandatoryCount = dailyMissions.filter(
    (m) => !m.isBonus && (claimedMissions[m.id] || m.id === 'ms-d-02')
  ).length;

  const handleClaim = (mission: Mission) => {
    if (claimedMissions[mission.id]) return;
    setClaimedMissions((prev) => ({ ...prev, [mission.id]: true }));
    const coinsWon = mission.reward.coins || 0;
    setSimulatedCoins((prev) => prev + coinsWon);
    setClaimToast(`+${coinsWon} Coins! Đã nhận thưởng nhiệm vụ.`);
    setTimeout(() => setClaimToast(null), 2500);
  };

  const handleClaimDailyChest = () => {
    if (dailyChestClaimed) return;
    setDailyChestClaimed(true);
    setSimulatedCoins((prev) => prev + dailyConfig.dailyChestReward.coins);
    setClaimToast(`🎉 +${dailyConfig.dailyChestReward.coins} Coins từ Rương Ngày!`);
    setTimeout(() => setClaimToast(null), 3000);
  };

  const handleResetDemo = () => {
    setClaimedMissions({ 'ms-d-01': true });
    setDailyChestClaimed(false);
    setSimulatedCoins(640);
    setClaimToast('Đã đặt lại trạng thái tương tác mô phỏng!');
    setTimeout(() => setClaimToast(null), 2000);
  };

  return (
    <div className="w-full lg:w-[380px] bg-surface border border-border rounded-2xl p-4 shadow-card flex flex-col shrink-0 select-none">
      {/* Simulator Control Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-snapy-light text-snapy flex items-center justify-center">
            <Smartphone size={14} />
          </div>
          <span className="text-xs font-bold text-text">Mobile Simulator</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switch */}
          <div className="flex bg-surface-subtle p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode('hub')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'hub'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Hub (MH-GAME-02)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('widget')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'widget'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Home Widget
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDemo}
            title="Đặt lại tương tác demo"
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* iPhone Device Frame */}
      <div className="relative mx-auto w-[320px] h-[640px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700/60 overflow-hidden flex flex-col justify-between">
        {/* Dynamic Island & Status Bar */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-1 text-[11px] font-bold text-white select-none">
          <span>09:41</span>
          {/* Dynamic Island */}
          <div className="w-20 h-4 bg-black rounded-full mx-auto" />
          <div className="flex items-center gap-1 text-[10px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Floating Toast inside Mobile */}
        {claimToast && (
          <div className="absolute top-12 left-6 right-6 z-30 bg-primary text-white text-[11px] font-bold p-2 rounded-xl text-center shadow-lg animate-in slide-in-from-top duration-150 flex items-center justify-center gap-1.5">
            <Sparkles size={14} />
            <span>{claimToast}</span>
          </div>
        )}

        {/* Mobile Viewport Screen */}
        <div className="relative z-10 flex-1 bg-[#F8F9F7] rounded-[32px] mt-2 mb-1 overflow-hidden flex flex-col border border-border/80">
          {/* Mobile App Header */}
          <div className="p-3 bg-surface border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-snapy-light flex items-center justify-center text-sm shadow-xs">
                🦊
              </div>
              <div className="leading-tight">
                <div className="text-xs font-extrabold text-text">SnapVocab</div>
                <div className="text-[9px] text-text-muted">LiveOps Quest Hub</div>
              </div>
            </div>

            {/* Wallet Pills */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-reward-light text-[#9A7000] border border-reward/30">
                <span>🪙</span>
                <span>{simulatedCoins}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-snapy-light text-snapy border border-snapy/20">
                <Flame size={12} className="fill-snapy" />
                <span>7</span>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: MISSIONS HUB (MH-GAME-02) */}
          {viewMode === 'hub' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Top Countdown & Reset Pill */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-snapy-light/70 border border-snapy/20 text-snapy text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Clock size={13} />
                  <span>Làm mới sau:</span>
                </div>
                <span className="font-mono font-bold tracking-tight">{countdownText}</span>
              </div>

              {/* Sub-tabs: Daily vs Weekly */}
              <div className="flex p-0.5 bg-surface rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('daily')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    activeTab === 'daily'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Nhiệm Vụ Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('weekly')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    activeTab === 'weekly'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Rương Tuần (Stamps)
                </button>
              </div>

              {/* TAB DAILY MISSIONS */}
              {activeTab === 'daily' && (
                <div className="space-y-2.5">
                  {/* Daily Chest Milestone Box */}
                  <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-reward/40 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🎁</span>
                        <span className="font-extrabold text-[11px] text-amber-950">
                          RƯƠNG KHO BÁU NGÀY
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[10px] text-amber-800">
                        {completedMandatoryCount}/5 Xong
                      </span>
                    </div>

                    <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-reward h-full rounded-full transition-all duration-300"
                        style={{ width: `${(completedMandatoryCount / 5) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-900/80">
                        Thưởng: +{dailyConfig.dailyChestReward.coins}🪙 · +{dailyConfig.dailyChestReward.xp} XP
                      </span>

                      <button
                        type="button"
                        onClick={handleClaimDailyChest}
                        disabled={completedMandatoryCount < 5 || dailyChestClaimed}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all shadow-xs ${
                          dailyChestClaimed
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : completedMandatoryCount >= 5
                            ? 'bg-reward text-amber-950 hover:brightness-105 animate-bounce'
                            : 'bg-amber-200/80 text-amber-800/60 cursor-not-allowed'
                        }`}
                      >
                        {dailyChestClaimed
                          ? 'Đã Mở'
                          : completedMandatoryCount >= 5
                          ? 'Mở Rương'
                          : 'Chưa Đạt'}
                      </button>
                    </div>
                  </div>

                  {/* Daily Missions List */}
                  <div className="space-y-2">
                    {dailyMissions.map((mission) => {
                      const isClaimed = claimedMissions[mission.id];
                      const isComplete = isClaimed || mission.id === 'ms-d-02';

                      return (
                        <div
                          key={mission.id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isClaimed
                              ? 'bg-surface/60 border-border opacity-75'
                              : 'bg-surface border-border shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-lg bg-surface-subtle flex items-center justify-center text-sm shrink-0 border border-border">
                                {mission.actionType === 'SCAN_OBJECT' && '📸'}
                                {mission.actionType === 'REVIEW_SRS' && '🔄'}
                                {mission.actionType === 'LEARN_NEW_WORDS' && '📖'}
                                {mission.actionType === 'QUIZ_PERFECT' && '🎯'}
                                {mission.actionType === 'MAINTAIN_STREAK' && '🔥'}
                                {mission.actionType === 'LISTEN_AUDIO' && '🎧'}
                                {mission.actionType === 'EXPLORE_TOPIC' && '🗂️'}
                              </div>
                              <div>
                                <div className="font-bold text-[11px] text-text leading-tight">
                                  {mission.title}
                                  {mission.isBonus && (
                                    <span className="ml-1 text-[9px] text-snapy font-bold">
                                      ★ Bonus
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] font-bold">
                                  <span className="text-[#9A7000]">
                                    +{mission.reward.coins}🪙
                                  </span>
                                  <span className="text-emerald-600">
                                    +{mission.reward.xp} XP
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            {isClaimed ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500">
                                Đã Nhận
                              </span>
                            ) : isComplete ? (
                              <button
                                type="button"
                                onClick={() => handleClaim(mission)}
                                className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-xs transition-all animate-pulse"
                              >
                                Nhận
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setClaimToast(`Điều hướng: ${mission.navigationParams?.targetScreen || 'HOME_HUB'}`);
                                  setTimeout(() => setClaimToast(null), 2000);
                                }}
                                title={`Route: ${mission.navigationParams?.targetScreen || 'HOME_HUB'} (BF-12B)`}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-primary/30 bg-primary-light text-primary hover:bg-primary hover:text-white transition-all"
                              >
                                {mission.navigationParams?.ctaLabel || 'Làm'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB WEEKLY STAMPS */}
              {activeTab === 'weekly' && (
                <div className="space-y-3">
                  <div className="p-3 bg-surface border border-border rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-text">
                        Activity Stamps Tuần
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Thứ 2 → CN (GMT+7)
                      </span>
                    </div>

                    {/* 7 Days Stamp Row */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => {
                        const isStamped = idx <= 4;
                        return (
                          <div
                            key={day}
                            className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 ${
                              isStamped
                                ? 'bg-snapy-light/80 border-snapy/40 text-snapy font-bold'
                                : 'bg-surface-subtle border-border text-text-muted'
                            }`}
                          >
                            <span className="text-[9px]">{day}</span>
                            <span className="text-xs">{isStamped ? '🦊' : '⚪'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3 Chest Milestones */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase">
                      3 Mốc Rương Tuần
                    </span>
                    {weeklyConfig.milestones.map((ms) => (
                      <div
                        key={ms.tier}
                        className="p-2.5 bg-surface border border-border rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ms.icon}</span>
                          <div>
                            <div className="font-bold text-[11px] text-text">
                              {ms.chestName} ({ms.stampsRequired} Stamps)
                            </div>
                            <div className="text-[10px] text-[#9A7000] font-mono font-semibold">
                              +{ms.reward.coins}🪙 · +{ms.reward.xp} XP
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                          5/{ms.stampsRequired}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: HOME SCREEN WIDGET (MH-MAIN-01) */}
          {viewMode === 'widget' && (
            <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs">
              {/* Banner Profile */}
              <div className="p-3 bg-surface border border-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">
                    👨‍🎓
                  </div>
                  <div>
                    <div className="font-extrabold text-[11px] text-text">Chào Nam!</div>
                    <div className="text-[9px] text-text-muted">Cố lên 1 bài nữa để đủ 5/5</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-snapy-light text-snapy">
                  Level 12
                </div>
              </div>

              {/* Daily Mission Home Widget */}
              <div className="p-3.5 bg-gradient-to-br from-white to-amber-50/40 border border-reward/40 rounded-2xl shadow-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎯</span>
                    <span className="font-extrabold text-xs text-text">
                      Nhiệm Vụ Hôm Nay
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('hub')}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center"
                  >
                    <span>Xem tất cả</span>
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">Tiến độ Daily Chest</span>
                    <span className="font-mono font-bold text-amber-800">4/5 Xong</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-reward h-full rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                {/* Quick Next Task */}
                <div className="p-2 bg-surface rounded-xl border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={14} className="text-snapy" />
                    <span className="text-[10px] font-semibold text-text truncate max-w-[140px]">
                      Quét 3 đồ vật quanh bạn
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('hub')}
                    className="px-2 py-0.5 text-[9px] font-bold rounded bg-primary text-white"
                  >
                    Làm ngay
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Home Bar */}
          <div className="p-2 bg-surface border-t border-border flex items-center justify-around text-text-muted text-[9px] font-semibold shrink-0">
            <div className="flex flex-col items-center gap-0.5 text-text">
              <span>🏠</span>
              <span>Home</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 text-primary font-bold">
              <span>🎯</span>
              <span>Missions</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span>🛍️</span>
              <span>Shop</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span>👤</span>
              <span>Profile</span>
            </div>
          </div>
        </div>

        {/* Home Indicator line */}
        <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mb-1" />
      </div>
    </div>
  );
};
