import React, { useState, useMemo } from 'react';
import {
  Mission,
  MissionFilterState,
  MissionType,
  MissionActionType,
  MissionStatus,
  MissionDifficulty,
  MissionTargetAudience,
  DailyCycleConfig,
  WeeklyMilestoneConfig,
  MissionGuardrailConfig,
} from '../../../domains/missions/types';
import { filterMissions } from '../../../domains/missions/selectors';
import { getSlotCategoryBadge } from '../../../domains/missions/capabilities';
import { MobileMissionSimulator } from './MobileMissionSimulator';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Target,
  Edit2,
  Trash2,
  Copy,
  Archive,
  Eye,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Coins,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface MissionPoolTabProps {
  missions: Mission[];
  dailyConfig: DailyCycleConfig;
  weeklyConfig: WeeklyMilestoneConfig;
  guardrailConfig: MissionGuardrailConfig;
  countdownText: string;
  onAddMission: () => void;
  onEditMission: (mission: Mission) => void;
  onInspectMission: (mission: Mission) => void;
  onToggleStatus: (mission: Mission) => void;
  onRequestActivate?: (mission: Mission) => void;
  onDuplicateMission: (mission: Mission) => void;
  onArchiveMission: (mission: Mission) => void;
}

export const MissionPoolTab: React.FC<MissionPoolTabProps> = ({
  missions,
  dailyConfig,
  weeklyConfig,
  guardrailConfig,
  countdownText,
  onAddMission,
  onEditMission,
  onInspectMission,
  onToggleStatus,
  onRequestActivate,
  onDuplicateMission,
  onArchiveMission,
}) => {
  const [filters, setFilters] = useState<MissionFilterState>({
    searchQuery: '',
    type: 'ALL',
    category: 'ALL',
    actionType: 'ALL',
    status: 'ALL',
    difficulty: 'ALL',
    targetAudience: 'ALL',
    sortBy: 'newest',
  });

  const [showSimulator, setShowSimulator] = useState(true);

  // Filtered list
  const filteredMissions = useMemo(() => {
    return filterMissions(missions, filters);
  }, [missions, filters]);

  const activeDailyCount = missions.filter(
    (m) => m.type === 'daily' && m.status === 'active' && !m.isBonus
  ).length;

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      {/* CỘT TRÁI: BẢNG DỮ LIỆU CHÍNH */}
      <div className="flex-1 space-y-4">
        {/* Thanh tìm kiếm & Bộ lọc nhanh */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search
                size={15}
                className="absolute left-2.5 top-2.5 text-text-muted"
              />
              <input
                type="text"
                placeholder="Tìm theo mã (MS-D-..), tiêu đề hoặc nội dung..."
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters({ ...filters, searchQuery: e.target.value })
                }
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, searchQuery: '' })}
                  className="absolute right-2.5 top-2.5 text-text-muted hover:text-text text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  type: e.target.value as 'ALL' | MissionType,
                })
              }
              className="text-xs p-2 rounded-lg border border-border bg-surface text-text font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="daily">Hàng ngày (Daily Pool)</option>
              <option value="achievement">Thành tựu (Lifetime)</option>
              <option value="special_event">Sự kiện đặc biệt</option>
            </select>

            {/* Slot Category Filter (BF-12A standard) */}
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  category: e.target.value as any,
                })
              }
              className="text-xs p-2 rounded-lg border border-border bg-surface text-text font-semibold focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Mọi nhóm Slot</option>
              <option value="SCAN_CAPTURE">Slot 1: Scan AI</option>
              <option value="VOCAB_BUILDING">Slot 2: Vocab Building</option>
              <option value="FLASHCARD_SRS">Slot 3: Flashcard/SRS</option>
              <option value="QUIZ_ACCURACY">Slot 4: Quiz/Accuracy</option>
              <option value="RETENTION_GAMIFICATION">Slot 5: Gamification</option>
              <option value="BONUS">Nhiệm vụ Thưởng (+Bonus)</option>
            </select>

            {/* Action Type Filter */}
            <select
              value={filters.actionType}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  actionType: e.target.value as 'ALL' | MissionActionType,
                })
              }
              className="text-xs p-2 rounded-lg border border-border bg-surface text-text font-medium focus:ring-1 focus:ring-primary hidden md:block"
            >
              <option value="ALL">Mọi hành động</option>
              <option value="SCAN_OBJECT">AI Camera Scan</option>
              <option value="REVIEW_SRS">Ôn tập SRS</option>
              <option value="LEARN_NEW_WORDS">Học từ mới</option>
              <option value="QUIZ_PERFECT">Quiz 100%</option>
              <option value="MAINTAIN_STREAK">Giữ Streak</option>
              <option value="EXPLORE_TOPIC">Khám phá chủ đề</option>
              <option value="LISTEN_AUDIO">Nghe audio</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as 'ALL' | MissionStatus,
                })
              }
              className="text-xs p-2 rounded-lg border border-border bg-surface text-text font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="active">Đang chạy (Active)</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="scheduled">Lên lịch (Scheduled)</option>
              <option value="archived">Lưu trữ (Archived)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Simulator */}
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                showSimulator
                  ? 'bg-primary-light text-primary border-primary/30'
                  : 'bg-surface text-text-muted border-border hover:text-text'
              }`}
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">
                {showSimulator ? 'Ẩn Simulator' : 'Hiện Simulator'}
              </span>
            </button>

            {/* Create Button */}
            <button
              type="button"
              onClick={onAddMission}
              className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus size={14} />
              <span>+ Tạo Nhiệm Vụ Mới</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle/80 text-text-muted font-semibold border-b border-border text-[11px] uppercase tracking-wider">
                <th className="p-3">Mã & Tiêu Đề</th>
                <th className="p-3">Slot Category & Phiên Bản</th>
                <th className="p-3">Hành Động & Event</th>
                <th className="p-3 text-center">Chỉ Tiêu</th>
                <th className="p-3 text-center">Phần Thưởng</th>
                <th className="p-3 text-center">Trọng Số Pool</th>
                <th className="p-3 text-center">Tỷ Lệ Xong</th>
                <th className="p-3 text-center">Trạng Thái</th>
                <th className="p-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredMissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Target size={28} className="text-text-muted/40" />
                      <p className="font-semibold text-xs">
                        Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMissions.map((mission) => {
                  const isOverCeiling =
                    (mission.reward.coins || 0) >
                    guardrailConfig.maxCoinsCapPerQuest;
                  const slotBadge = getSlotCategoryBadge(mission.category);

                  return (
                    <tr
                      key={mission.id}
                      className="hover:bg-surface-subtle/40 transition-colors"
                    >
                      {/* Mã & Tiêu Đề */}
                      <td className="p-3 max-w-[220px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {mission.code}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-info-light text-info border border-info/20">
                            {mission.type}
                          </span>
                        </div>
                        <div
                          className="font-bold text-text truncate hover:text-primary cursor-pointer"
                          onClick={() => onInspectMission(mission)}
                          title={mission.title}
                        >
                          {mission.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">
                          {mission.description}
                        </div>
                      </td>

                      {/* Slot Category & Version */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${slotBadge.color}`}>
                            {mission.isBonus ? '★ Bonus' : slotBadge.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-primary">
                            v{mission.version || 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted block">
                          Client: {mission.minimumSupportedClientVersion || 'v1.0.0'}
                        </span>
                      </td>

                      {/* Hành Động & Event */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text text-[11px]">
                            {mission.actionType}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-text-muted mt-0.5 truncate max-w-[150px]" title={mission.triggerEvent}>
                          {mission.triggerEvent}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded capitalize ${
                            mission.difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700'
                              : mission.difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {mission.difficulty}
                        </span>
                      </td>

                      {/* Chỉ Tiêu */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="font-mono font-bold text-text text-sm">
                          {mission.targetCount}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {mission.unit}
                        </div>
                      </td>

                      {/* Phần Thưởng */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 font-mono font-bold">
                          <span className="text-[#9A7000] bg-reward-light/70 px-1.5 py-0.5 rounded border border-reward/30">
                            +{mission.reward.coins}🪙
                          </span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            +{mission.reward.xp} XP
                          </span>
                        </div>
                        {isOverCeiling && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-amber-700 font-bold">
                            <AlertTriangle size={11} />
                            <span>Trần ngoại lệ</span>
                          </div>
                        )}
                      </td>

                      {/* Trọng Số Pool */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="font-mono font-bold text-text">
                          {mission.weight} / 100
                        </div>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${mission.weight}%` }}
                          />
                        </div>
                      </td>

                      {/* Tỷ Lệ Xong */}
                      <td className="p-3 text-center whitespace-nowrap font-mono">
                        <div className="text-text font-bold text-xs">
                          {mission.completionRate}%
                        </div>
                        <div className="text-[10px] text-text-muted">
                          Claim: {mission.claimRate}%
                        </div>
                      </td>

                      {/* Trạng Thái */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {mission.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(mission)}
                            title="Bấm để chuyển về Bản nháp (Draft)"
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all"
                          >
                            ● Đang chạy
                          </button>
                        ) : mission.status === 'draft' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onRequestActivate ? onRequestActivate(mission) : onToggleStatus(mission)
                            }
                            title="Bấm để kiểm duyệt và kích hoạt (BF-15A)"
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-all shadow-xs"
                          >
                            ▶ Kích Hoạt
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {mission.status}
                          </span>
                        )}
                      </td>

                      {/* Thao Tác */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onInspectMission(mission)}
                            title="Xem chi tiết & Analytics"
                            className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-surface-subtle"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditMission(mission)}
                            title="Chỉnh sửa nhiệm vụ"
                            className="p-1.5 text-text-muted hover:text-primary rounded-md hover:bg-surface-subtle"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateMission(mission)}
                            title="Nhân bản nhiệm vụ"
                            className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-surface-subtle"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchiveMission(mission)}
                            title="Lưu trữ / Khôi phục"
                            className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-danger-light/30"
                          >
                            <Archive size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
          <div>
            Hiển thị <strong>{filteredMissions.length}</strong> / {missions.length} nhiệm vụ
            trong hệ thống
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>5 nhiệm vụ chính được gắp tự động vào 00:00 GMT+7 hàng ngày</span>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: MOBILE SIMULATOR */}
      {showSimulator && (
        <MobileMissionSimulator
          missions={missions}
          dailyConfig={dailyConfig}
          weeklyConfig={weeklyConfig}
          countdownText={countdownText}
          onClose={() => setShowSimulator(false)}
        />
      )}
    </div>
  );
};
