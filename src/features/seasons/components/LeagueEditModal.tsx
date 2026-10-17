import React, { useState } from 'react';
import { LeagueConfig } from '../../../domains/seasons/types';
import { Shield, X, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

interface LeagueEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  league: LeagueConfig | null;
  onSave: (updatedLeague: LeagueConfig) => void;
}

export const LeagueEditModal: React.FC<LeagueEditModalProps> = ({
  isOpen,
  onClose,
  league,
  onSave,
}) => {
  if (!isOpen || !league) return null;

  return <LeagueEditModalContent onClose={onClose} league={league} onSave={onSave} />;
};

interface LeagueEditModalContentProps {
  onClose: () => void;
  league: LeagueConfig;
  onSave: (updatedLeague: LeagueConfig) => void;
}

const LeagueEditModalContent: React.FC<LeagueEditModalContentProps> = ({
  onClose,
  league,
  onSave,
}) => {
  const [promotionRankMax, setPromotionRankMax] = useState(
    league.promotionRule.promotionRankMax
  );
  const [safeRankMax, setSafeRankMax] = useState(
    league.promotionRule.safeRankMax
  );
  const [demotionRankMin, setDemotionRankMin] = useState(
    league.promotionRule.demotionRankMin
  );
  const [minXpToPromote, setMinXpToPromote] = useState(
    league.promotionRule.minXpToPromote
  );
  const [cohortSize, setCohortSize] = useState(league.cohortSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...league,
      cohortSize,
      promotionRule: {
        promotionRankMax: Number(promotionRankMax),
        safeRankMax: Number(safeRankMax),
        demotionRankMin: Number(demotionRankMin),
        minXpToPromote: Number(minXpToPromote),
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-canvas flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-xs"
              style={{
                backgroundColor: `${league.accentColor}20`,
                borderColor: `${league.accentColor}40`,
              }}
            >
              {league.icon}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-text tracking-tight">
                Cấu Hình Hạng Đấu: {league.name}
              </h3>
              <p className="text-[11px] text-text-muted">
                Điều chỉnh hạn ngạch thăng/hạ hạng và điều kiện điểm tối thiểu
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
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Cohort Size */}
          <div>
            <label className="block font-bold text-text mb-1">
              Quy Mô Phòng Đấu (Cohort Size)
            </label>
            <input
              type="number"
              min={10}
              max={50}
              value={cohortSize}
              onChange={(e) => setCohortSize(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Chuẩn hóa hệ thống: 30 học viên / cohort.
            </span>
          </div>

          {/* Promotion Rank Max */}
          <div>
            <label className="block font-bold text-text mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-primary">
                <ArrowUpRight size={13} /> Vùng Thăng Hạng (Top 1 đến N)
              </span>
              <span className="font-mono text-[11px]">Top 1 – {promotionRankMax}</span>
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={promotionRankMax}
              onChange={(e) => setPromotionRankMax(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Min XP to promote */}
          <div>
            <label className="block font-bold text-text mb-1">
              Ngưỡng XP Tối Thiểu Để Thăng Hạng (Anti-AFK)
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={minXpToPromote}
              onChange={(e) => setMinXpToPromote(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Học viên đứng trong Top {promotionRankMax} nhưng dưới {minXpToPromote} XP sẽ không được thăng hạng.
            </span>
          </div>

          {/* Safe & Demotion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-text mb-1 flex items-center gap-1">
                <Minus size={13} className="text-text-muted" /> Hạng An Toàn Đến
              </label>
              <input
                type="number"
                min={promotionRankMax + 1}
                max={cohortSize}
                value={safeRankMax}
                onChange={(e) => setSafeRankMax(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-bold text-text mb-1 flex items-center gap-1">
                <ArrowDownRight size={13} className="text-danger" /> Bắt Đầu Rớt Hạng
              </label>
              <input
                type="number"
                min={safeRankMax + 1}
                max={cohortSize + 1}
                disabled={!league.canDemote}
                value={league.canDemote ? demotionRankMin : cohortSize + 1}
                onChange={(e) => setDemotionRankMin(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas font-mono font-bold text-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>

          {/* Live Preview Summary */}
          <div className="p-2.5 rounded-lg bg-canvas border border-border/60 text-[11px] space-y-1">
            <span className="font-bold text-text block">Tóm Tắt Phân Vùng:</span>
            <div className="flex items-center justify-between text-primary">
              <span>Thăng hạng:</span>
              <span className="font-mono font-bold">Top 1 – #{promotionRankMax} (≥{minXpToPromote} XP)</span>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>An toàn:</span>
              <span className="font-mono font-bold">#{Number(promotionRankMax) + 1} – #{safeRankMax}</span>
            </div>
            <div className="flex items-center justify-between text-danger">
              <span>Rớt hạng:</span>
              <span className="font-mono font-bold">
                {league.canDemote ? `#{demotionRankMin} – #${cohortSize}` : 'Không áp dụng'}
              </span>
            </div>
          </div>

          {/* Buttons */}
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
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-xs"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
