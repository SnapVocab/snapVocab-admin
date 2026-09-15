import React from 'react';
import { MissionsRibbonMetrics } from '../../../domains/missions/types';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Calendar,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MissionsMetricsRibbonProps {
  metrics: MissionsRibbonMetrics;
  countdownText: string;
}

export const MissionsMetricsRibbon: React.FC<MissionsMetricsRibbonProps> = ({
  metrics,
  countdownText,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 select-none">
      {/* 1. Kho Nhiệm Vụ Hoạt Động */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Pool Hoạt Động
          </span>
          <div className="w-6 h-6 rounded-md bg-primary-light text-primary flex items-center justify-center">
            <Target size={14} />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-text flex items-baseline gap-1">
            <span>{metrics.activeDailyPoolCount}</span>
            <span className="text-xs font-normal text-text-muted">
              / {metrics.totalPoolCount} Quests
            </span>
          </div>
          <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 font-mono">
            <span className="text-primary font-bold">{metrics.activeDailyPoolCount} Active</span>
            <span>·</span>
            <span className="text-emerald-700 font-bold">{metrics.slotCoverageCount}/5 Slots</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
          <Sparkles size={11} />
          <span>{metrics.weeklyMilestonesCount} mốc Weekly Milestones</span>
        </div>
      </div>

      {/* 2. Tỷ Lệ Hoàn Thành Bài */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Tỷ Lệ Hoàn Thành
          </span>
          <div className="w-6 h-6 rounded-md bg-info-light text-info flex items-center justify-center">
            <CheckCircle2 size={14} />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-info">
            {metrics.avgCompletionRate}%
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
            <span>Claim thành công:</span>
            <strong className="text-text font-mono font-semibold">
              {metrics.avgClaimRate}%
            </strong>
          </div>
        </div>
        {/* Progress Bar comparison */}
        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
          <div
            className="bg-info h-full transition-all duration-500"
            style={{ width: `${metrics.avgClaimRate}%` }}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${metrics.unclaimedRiskRate}%` }}
          />
        </div>
      </div>

      {/* 3. Nguy Cơ Bỏ Quên Trước Reset */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Nguy Cơ Hết Hạn
          </span>
          <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={14} />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-amber-600">
            {metrics.unclaimedRiskRate}%
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            <span>Học viên chưa bấm Claim</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium truncate">
          <span>Auto push: 22:00 GMT+7</span>
        </div>
      </div>

      {/* 4. Phát Hành Faucet 24h */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Phát Hành (Faucet)
          </span>
          <div className="w-6 h-6 rounded-md bg-reward-light text-[#9A7000] flex items-center justify-center">
            <Coins size={14} />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-text flex items-baseline gap-1">
            <span>{(metrics.faucetCoins24h / 1000).toFixed(1)}k</span>
            <span className="text-xs font-normal text-text-muted">Coins</span>
          </div>
          <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 font-mono">
            <span className="text-emerald-600 font-semibold">Kinh tế 100% Coins</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-text-muted">
          <span>An toàn: &lt; 2,500 Coins/người</span>
        </div>
      </div>

      {/* 5. Chu Kỳ Reset 00:00 */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Reset Kế Tiếp
          </span>
          <div className="w-6 h-6 rounded-md bg-snapy-light text-snapy flex items-center justify-center">
            <Calendar size={14} />
          </div>
        </div>
        <div>
          <div className="text-lg font-bold font-mono text-snapy tracking-tight">
            {countdownText}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            <span>00:00 (GMT+7 Hà Nội)</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-snapy font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-snapy animate-pulse" />
          <span>Tuần 37 · 7 Stamps</span>
        </div>
      </div>

      {/* 6. LiveOps Guardrails Status */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-card hover:border-border-strong transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Guardrails
          </span>
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              metrics.guardrailStatus === 'healthy'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {metrics.guardrailStatus === 'healthy' ? (
              <ShieldCheck size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-bold uppercase tracking-wider ${
                metrics.guardrailStatus === 'healthy'
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {metrics.guardrailStatus === 'healthy' ? 'Được Bảo Vệ' : 'Cảnh Báo'}
            </span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            <span>{metrics.activeViolationsCount} vi phạm cần duyệt</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-text-muted">
          <span>Trần: 1,000🪙 · 100💎</span>
        </div>
      </div>
    </div>
  );
};
