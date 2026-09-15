import React, { useState } from 'react';
import { LearnerMissionProgressSample } from '../../../domains/missions/types';
import {
  Users,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Gift,
  Flame,
  Send,
  Sparkles,
} from 'lucide-react';

interface LearnerActivityTabProps {
  learners: LearnerMissionProgressSample[];
  onManualGrant: (learner: LearnerMissionProgressSample) => void;
}

export const LearnerActivityTab: React.FC<LearnerActivityTabProps> = ({
  learners,
  onManualGrant,
}) => {
  const [search, setSearch] = useState('');
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  const filtered = learners.filter(
    (l) =>
      l.learnerName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.learnerId.toLowerCase().includes(search.toLowerCase())
  );

  const atRiskCount = learners.filter((l) => l.status === 'unclaimed_risk').length;

  const handleBroadcastReminder = () => {
    setBroadcastToast(
      `Đã phát thông báo Push Notification tới ${atRiskCount} học viên có phần thưởng chưa claim!`
    );
    setTimeout(() => setBroadcastToast(null), 3500);
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-card space-y-4 select-none text-xs">
      {/* Header & Broadcast Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-text">
              Tiến Độ Học Viên & Nhật Ký Claim Thưởng
            </h3>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Giám sát thời gian thực tiến độ hoàn thành nhiệm vụ và ngăn ngừa mất phần thưởng do
            quên claim trước 00:00 GMT+7.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {atRiskCount > 0 && (
            <button
              type="button"
              onClick={handleBroadcastReminder}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Bell size={13} />
              <span>Nhắc Claim {atRiskCount} Học Viên</span>
            </button>
          )}
        </div>
      </div>

      {broadcastToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} />
          <span>{broadcastToast}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-2.5 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          placeholder="Tìm học viên theo tên, email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-subtle/80 text-text-muted font-semibold border-b border-border text-[11px] uppercase tracking-wider">
              <th className="p-3">Học Viên</th>
              <th className="p-3 text-center">Streak</th>
              <th className="p-3 text-center">Nhiệm Vụ Ngày</th>
              <th className="p-3 text-center">Daily Chest</th>
              <th className="p-3 text-center">Stamps Tuần</th>
              <th className="p-3 text-center">Rủi Ro Chưa Claim</th>
              <th className="p-3 text-center">Trạng Thái</th>
              <th className="p-3 text-right">Can Thiệp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {filtered.map((l) => (
              <tr key={l.learnerId} className="hover:bg-surface-subtle/40 transition-colors">
                {/* Learner */}
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                      {l.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-text">{l.learnerName}</div>
                      <div className="text-[10px] text-text-muted font-mono">{l.email}</div>
                    </div>
                  </div>
                </td>

                {/* Streak */}
                <td className="p-3 text-center whitespace-nowrap">
                  <div className="inline-flex items-center gap-1 font-bold font-mono text-snapy px-2 py-0.5 rounded-full bg-snapy-light border border-snapy/20">
                    <Flame size={12} className="fill-snapy" />
                    <span>{l.currentStreakDays}d</span>
                  </div>
                </td>

                {/* Daily Progress */}
                <td className="p-3 text-center whitespace-nowrap">
                  <div className="font-mono font-bold text-text">
                    {l.dailyCompleted}/{l.dailyTotal}
                  </div>
                  <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${(l.dailyCompleted / l.dailyTotal) * 100}%`,
                      }}
                    />
                  </div>
                </td>

                {/* Daily Chest */}
                <td className="p-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                      l.dailyChestClaimed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.dailyCompleted >= l.dailyTotal
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {l.dailyChestClaimed
                      ? 'Đã Mở Rương'
                      : l.dailyCompleted >= l.dailyTotal
                      ? 'Chưa Claim'
                      : 'Chưa Đạt 5/5'}
                  </span>
                </td>

                {/* Weekly Stamps */}
                <td className="p-3 text-center whitespace-nowrap">
                  <div className="font-mono font-bold text-text">
                    {l.weeklyStamps} / 7 Stamps
                  </div>
                </td>

                {/* Unclaimed Coins at Risk */}
                <td className="p-3 text-center whitespace-nowrap">
                  {l.unclaimedCoinsAtRisk > 0 ? (
                    <div className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                      +{l.unclaimedCoinsAtRisk} Coins
                    </div>
                  ) : (
                    <span className="text-text-muted font-mono">0</span>
                  )}
                </td>

                {/* Status */}
                <td className="p-3 text-center whitespace-nowrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      l.status === 'claimed_all'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.status === 'unclaimed_risk'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {l.status === 'claimed_all'
                      ? 'Hoàn Hảo'
                      : l.status === 'unclaimed_risk'
                      ? 'Nguy Cơ Hết Hạn'
                      : 'Đang Học'}
                  </span>
                </td>

                {/* Ops / Incident Action (Tuân thủ No-Backfill BF-12G) */}
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onManualGrant(l)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border hover:bg-surface-subtle text-text-muted hover:text-text transition-all"
                    title="Ghi nhận sự cố kỹ thuật cho Ops (Không claim bù rương hồi tố theo BF-12G)"
                  >
                    Báo Sự Cố Ops
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
