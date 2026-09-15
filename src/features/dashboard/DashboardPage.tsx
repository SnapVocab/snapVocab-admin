import React, { useState } from 'react';
import { DashboardTimeRange } from '../../domains/dashboard/types';
import { projectDashboardViewModel } from '../../domains/dashboard/selectors';
import { INITIAL_VOCABULARY } from '../../domains/vocabulary/mock-data';
import { MOCK_AI_SCAN_HEALTH } from '../../domains/ai-scan/mock-data';
import { MOCK_ECONOMY_STATE } from '../../domains/economy/mock-data';
import { ActionCenterWidget } from './components/ActionCenterWidget';
import { MetricRibbon } from './components/MetricRibbon';
import { ContentPipelineWidget } from './components/ContentPipelineWidget';
import { AIScanMonitorWidget } from './components/AIScanMonitorWidget';
import { LearnerActivityWidget } from './components/LearnerActivityWidget';
import { LiveOpsEconomyWidget } from './components/LiveOpsEconomyWidget';
import { AuditActivityWidget } from './components/AuditActivityWidget';
import { RotateCw, Database } from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (navId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('7d');
  const [refreshedAt, setRefreshedAt] = useState<string>('10:35 AM');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  // Pure projection ViewModel: refreshedAt is provided from outside
  const viewModel = projectDashboardViewModel({
    timeRange,
    refreshedAt,
    vocabularyList: INITIAL_VOCABULARY,
    aiHealth: MOCK_AI_SCAN_HEALTH,
    economyState: MOCK_ECONOMY_STATE,
  });

  const handleCreateSnapshot = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setRefreshedAt(timeStr);
      setRefreshCount((prev) => prev + 1);
      setIsRefreshing(false);
    }, 550);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background p-3 sm:p-4 md:p-6 space-y-4">
      {/* Top Action Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-text tracking-tight">
              Dashboard Quản Trị & Vận Hành Hệ Thống
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-subtle text-text-muted text-[11px] font-semibold border border-border flex items-center gap-1 select-none">
              <Database size={11} className="text-primary" />
              <span>Snapshot mô phỏng (Demo v1.2)</span>
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Tổng hợp dữ liệu tác nghiệp từ Content Studio, AI Scan Engine và Hệ thống Gamification
          </p>
        </div>

        {/* Snapshot Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto select-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-muted shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono text-text">Đã cập nhật: {refreshedAt}</span>
          </div>

          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isRefreshing}
            aria-label="Tạo snapshot dữ liệu mới"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-60"
          >
            <RotateCw
              size={13}
              className={`${
                isRefreshing ? 'animate-spin motion-reduce:animate-none text-primary' : 'text-text-muted'
              }`}
            />
            <span>{isRefreshing ? 'Đang cập nhật...' : 'Tạo snapshot mới'}</span>
          </button>

          {/* Screen reader live region */}
          <div className="sr-only" aria-live="polite">
            {isRefreshing
              ? 'Đang cập nhật snapshot dữ liệu...'
              : `Dữ liệu snapshot đã được cập nhật lúc ${refreshedAt}`}
          </div>
        </div>
      </header>

      {/* Layer 0: High Priority Operational Action Center */}
      <ActionCenterWidget items={viewModel.actionItems} onNavigate={onNavigate} />

      {/* Layer 1: High-Density Metric Ribbon */}
      <section aria-label="Chỉ số tổng quan hệ thống">
        <MetricRibbon cards={viewModel.metrics} onNavigate={onNavigate} />
      </section>

      {/* Layer 2: Content & AI (Left) + Learner Activity (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Content Pipeline & AI Scan */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          <ContentPipelineWidget
            pipeline={viewModel.contentPipeline}
            onNavigate={onNavigate}
          />
          <AIScanMonitorWidget
            aiScan={viewModel.aiScan}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right Column: Learning Growth & Flashcard Activity */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <LearnerActivityWidget
            activity={viewModel.learnerActivity}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            onNavigate={onNavigate}
          />
        </div>
      </section>

      {/* Layer 3: LiveOps Console & Virtual Economy (Coins / Gems / Streak) */}
      <section>
        <LiveOpsEconomyWidget
          liveops={viewModel.liveops}
          onNavigate={onNavigate}
        />
      </section>

      {/* Layer 4: Audit Trail & SS-17 Infrastructure Services */}
      <section>
        <AuditActivityWidget
          auditTrail={viewModel.auditTrail}
          infraServices={viewModel.infraServices}
          infraHealthSummary={viewModel.infraHealthSummary}
          r2Storage={viewModel.r2Storage}
          onNavigate={onNavigate}
        />
      </section>
    </div>
  );
};
