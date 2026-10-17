import React, { useState, useMemo } from 'react';
import {
  AuditLogEntry,
  AuditTabNavId,
  AuditFilterState,
} from '../../domains/audit/types';
import { INITIAL_AUDIT_LOGS } from '../../domains/audit/mock-data';
import {
  computeAuditMetrics,
  filterAuditLogs,
} from '../../domains/audit/selectors';
import { AuditMetricsRibbon } from './components/AuditMetricsRibbon';
import { AuditTabNav } from './components/AuditTabNav';
import { AuditFilterToolbar } from './components/AuditFilterToolbar';
import { MasterAuditStreamTab } from './components/MasterAuditStreamTab';
import { ContentAiAuditTab } from './components/ContentAiAuditTab';
import { LiveOpsGuardrailsTab } from './components/LiveOpsGuardrailsTab';
import { SecurityAccessTab } from './components/SecurityAccessTab';
import { ComplianceExportTab } from './components/ComplianceExportTab';
import { AuditInspectorDrawer } from './components/AuditInspectorDrawer';
import { AuditExportModal } from './components/AuditExportModal';
import {
  RotateCw,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface AuditActivityLogPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

const DEFAULT_FILTERS: AuditFilterState = {
  searchQuery: '',
  domain: 'ALL',
  severity: 'ALL',
  operatorId: 'ALL',
  hasTicketOnly: false,
  guardrailOnly: false,
  dateRange: 'all',
  sortBy: 'timestamp',
  sortDirection: 'desc',
};

export const AuditActivityLogPage: React.FC<AuditActivityLogPageProps> = ({
  onNavigate,
  onWordChange,
}) => {
  // 1. Navigation & UI States
  const [activeTab, setActiveTab] = useState<AuditTabNavId>('master-stream');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Data States
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [filterState, setFilterState] = useState<AuditFilterState>(DEFAULT_FILTERS);

  // 3. Modals & Drawer States
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    INITIAL_AUDIT_LOGS[0] || null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Memoized Metrics & Filtered logs
  const metrics = useMemo(() => computeAuditMetrics(logs), [logs]);
  const filteredLogs = useMemo(
    () => filterAuditLogs(logs, filterState),
    [logs, filterState]
  );

  // Handlers
  const handleSelectEntry = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Đã làm mới luồng dữ liệu sổ cái kiểm toán hệ thống!');
    }, 500);
  };

  const handleResetFilters = () => {
    setFilterState(DEFAULT_FILTERS);
    showToast('Đã đặt lại toàn bộ tiêu chí lọc về mặc định.');
  };

  // Cross-domain navigation
  const handleNavigateEntity = (navDeepLink?: string, entityTitle?: string) => {
    if (!navDeepLink) return;

    if (navDeepLink === 'content-studio' && entityTitle) {
      const cleanWord = entityTitle.split(' ')[0].toLowerCase();
      onWordChange?.(cleanWord);
      onNavigate?.('content-studio');
      return;
    }

    onNavigate?.(navDeepLink);
  };

  // Rollback simulation
  const handleRollback = (entry: AuditLogEntry) => {
    showToast(`Đã ghi nhận yêu cầu hoàn tác cho sự kiện "${entry.actionLabel}"!`);
    setIsDrawerOpen(false);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background p-4 space-y-4 select-none">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-text tracking-tight">
              Audit Activity Log — Sổ Cái Kiểm Toán & Quan Sát Vận Hành
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-bold border border-primary/20">
              System Observability
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Trung tâm kiểm toán bất biến (Immutable Ledger) cho Content Studio, AI Scan, LiveOps và Kỷ luật Tài khoản
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Live stream indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold font-mono text-emerald-600">
              LIVE STREAM ACTIVE
            </span>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text transition-all shadow-xs ${
              isRefreshing ? 'animate-spin text-primary' : ''
            }`}
            title="Làm mới sổ cái kiểm toán"
          >
            <RotateCw size={14} />
          </button>

          {/* Quick Export CTA */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download size={13} />
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Layer 1: Metrics Ribbon */}
      <section>
        <AuditMetricsRibbon
          metrics={metrics}
          onFilterGuardrails={() =>
            setFilterState((prev) => ({ ...prev, guardrailOnly: true }))
          }
          onFilterToday={() =>
            setFilterState((prev) => ({ ...prev, dateRange: 'today' }))
          }
        />
      </section>

      {/* Layer 2: Tabs Navigation */}
      <section>
        <AuditTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          logs={logs}
        />
      </section>

      {/* Layer 3: Multi-Criteria Filter Toolbar */}
      <section>
        <AuditFilterToolbar
          filterState={filterState}
          onFilterChange={setFilterState}
          onResetFilters={handleResetFilters}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          totalFilteredCount={filteredLogs.length}
          totalCount={logs.length}
        />
      </section>

      {/* Layer 4: Main Active Tab Content */}
      <section>
        {activeTab === 'master-stream' && (
          <MasterAuditStreamTab
            logs={filteredLogs}
            onSelectEntry={handleSelectEntry}
            onNavigateEntity={handleNavigateEntity}
          />
        )}

        {activeTab === 'content-ai' && (
          <ContentAiAuditTab
            logs={filteredLogs}
            onSelectEntry={handleSelectEntry}
            onNavigateToContentStudio={(word) => {
              onWordChange?.(word);
              onNavigate?.('content-studio');
            }}
            onNavigateToAiScan={() => onNavigate?.('ai-queue')}
          />
        )}

        {activeTab === 'liveops-guardrails' && (
          <LiveOpsGuardrailsTab
            logs={filteredLogs}
            onSelectEntry={handleSelectEntry}
            onNavigateToLearner={() => onNavigate?.('learners')}
            onNavigateToShop={() => onNavigate?.('shop')}
          />
        )}

        {activeTab === 'security-access' && (
          <SecurityAccessTab
            logs={filteredLogs}
            onSelectEntry={handleSelectEntry}
            onNavigateToLearner={() => onNavigate?.('learners')}
          />
        )}

        {activeTab === 'compliance-export' && (
          <ComplianceExportTab
            logs={filteredLogs}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}
      </section>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-text text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Audit Inspector Drawer */}
      <AuditInspectorDrawer
        entry={selectedEntry}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigateEntity={handleNavigateEntity}
        onRollback={handleRollback}
      />

      {/* Export Dialog Modal */}
      <AuditExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredLogs={filteredLogs}
        allLogs={logs}
        onSuccessToast={showToast}
      />
    </div>
  );
};

export default AuditActivityLogPage;
