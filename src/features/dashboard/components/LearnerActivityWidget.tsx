import React from 'react';
import { LearnerActivityProjection, DashboardTimeRange } from '../../../domains/dashboard/types';
import { AreaChart } from '../../../components/charts';
import { Users, TrendingUp, Zap } from 'lucide-react';

interface LearnerActivityWidgetProps {
  activity: LearnerActivityProjection;
  timeRange: DashboardTimeRange;
  onTimeRangeChange: (range: DashboardTimeRange) => void;
  onNavigate?: (navId: string) => void;
}

export const LearnerActivityWidget: React.FC<LearnerActivityWidgetProps> = ({
  activity,
  timeRange,
  onTimeRangeChange,
  onNavigate,
}) => {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      {/* Header & Filter Controls */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-light text-primary flex items-center justify-center select-none">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Hoạt động Người học & Học tập SRS</h3>
              <p className="text-xs text-text-muted">
                Lượng người dùng hoạt động (DAU/MAU) và lượt ôn tập Flashcard
              </p>
            </div>
          </div>

          {/* Time Range Selector with Explicit Scope Label */}
          <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-lg p-1 text-xs select-none">
            <span className="text-text-muted text-[11px] font-medium px-1 hidden sm:inline">
              Biểu đồ:
            </span>
            <button
              type="button"
              onClick={() => onTimeRangeChange('today')}
              aria-label="Xem biểu đồ SRS hôm nay"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                timeRange === 'today'
                  ? 'bg-surface text-text shadow-xs border border-border/80'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeChange('7d')}
              aria-label="Xem biểu đồ SRS 7 ngày gần nhất"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                timeRange === '7d'
                  ? 'bg-surface text-text shadow-xs border border-border/80'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeChange('30d')}
              aria-label="Xem biểu đồ SRS 30 ngày gần nhất"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                timeRange === '30d'
                  ? 'bg-surface text-text shadow-xs border border-border/80'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              30 ngày
            </button>
          </div>
        </div>

        {/* 4 Compact Stat Pills: Responsive 2-col on mobile, 4-col on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
          <div className="bg-surface-subtle/70 border border-border/80 rounded-lg p-2.5">
            <div className="text-xs text-text-muted select-none">DAU hiện tại</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 select-text">
              {activity.currentDau.toLocaleString('vi-VN')}
            </div>
          </div>

          <div className="bg-surface-subtle/70 border border-border/80 rounded-lg p-2.5">
            <div className="text-xs text-text-muted select-none">MAU tháng này</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 select-text">
              {(activity.currentMau / 1000).toFixed(1)}k
            </div>
          </div>

          <div className="bg-surface-subtle/70 border border-border/80 rounded-lg p-2.5">
            <div className="text-xs text-text-muted select-none">Retention 7-Day</div>
            <div className="text-base font-bold font-mono text-primary mt-0.5 flex items-center gap-1 select-text">
              <TrendingUp size={13} className="select-none" />
              {activity.retention7dRate}%
            </div>
          </div>

          <div className="bg-surface-subtle/70 border border-border/80 rounded-lg p-2.5">
            <div className="text-xs text-text-muted select-none">Flashcard SRS</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 flex items-center gap-1 select-text">
              <Zap size={13} className="text-amber-500 select-none" />
              {(activity.flashcardsReviewedToday / 1000).toFixed(1)}k
            </div>
          </div>
        </div>

        {/* Abstracted Area Chart */}
        <div className="mt-1">
          <AreaChart
            data={activity.trendSeries}
            height={160}
            color="#58CC02"
            fillOpacity={0.12}
            showGrid={true}
            showDots={true}
          />
        </div>
      </div>

      {/* Footer Deep Link */}
      <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1.5 select-none">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Thời gian học cao điểm: 20:00 - 22:30 hàng ngày</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('learners')}
          aria-label="Xem danh sách quản lý người học"
          className="text-xs font-bold text-primary hover:text-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1 py-0.5"
        >
          Quản lý người học →
        </button>
      </div>
    </div>
  );
};

