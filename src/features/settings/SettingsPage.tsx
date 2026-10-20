import React, { useState, useMemo } from 'react';
import {
  SystemSettingsSnapshot,
  SettingsTabNavId,
  AIPipelineConfig,
  SRSLearningConfig,
  EconomyGuardrailsConfig,
  SecurityAccessConfig,
  SystemMaintenanceConfig,
} from '../../domains/settings/types';
import { DEFAULT_SETTINGS } from '../../domains/settings/mock-data';
import {
  computeSettingsDiff,
  checkGuardrailWarnings,
  countDiffsPerTab,
} from '../../domains/settings/selectors';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsTabNav } from './components/SettingsTabNav';
import { AiPipelineTab } from './components/AiPipelineTab';
import { SrsLearningTab } from './components/SrsLearningTab';
import { EconomyGuardrailsTab } from './components/EconomyGuardrailsTab';
import { SecurityAccessTab } from './components/SecurityAccessTab';
import { SystemMaintenanceTab } from './components/SystemMaintenanceTab';
import { SettingsAuditDiffModal } from './components/SettingsAuditDiffModal';
import { SettingsUnsavedBar } from './components/SettingsUnsavedBar';
import { CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface SettingsPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onNavigate,
  onWordChange,
}) => {
  // 1. Navigation & Modal States
  const [activeTab, setActiveTab] = useState<SettingsTabNavId>('ai-pipeline');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Data Snapshots (Committed vs Working State)
  const [committedSettings, setCommittedSettings] = useState<SystemSettingsSnapshot>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<SystemSettingsSnapshot>(DEFAULT_SETTINGS);

  // Helper Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 3. Selectors & Memoized Diff Tracking
  const diffs = useMemo(
    () => computeSettingsDiff(committedSettings, settings),
    [committedSettings, settings]
  );
  const dirtyCount = diffs.length;
  const diffCountsPerTab = useMemo(() => countDiffsPerTab(diffs), [diffs]);

  // Guardrails Checker
  const guardrailWarnings = useMemo(
    () => checkGuardrailWarnings(settings),
    [settings]
  );
  const hasGuardrailViolation = diffs.some((d) => d.isGuardrailViolation);

  // Đếm cảnh báo guardrail theo tab
  const guardrailTabWarnings = useMemo(() => {
    const tabCounts: Record<SettingsTabNavId, number> = {
      'ai-pipeline': 0,
      'srs-learning': 0,
      'economy-guardrails': 0,
      'security-access': 0,
      'system-maintenance': 0,
    };
    guardrailWarnings.forEach((w) => {
      if (w.fieldKey.startsWith('economyGuardrails')) {
        tabCounts['economy-guardrails']++;
      } else if (w.fieldKey.startsWith('aiPipeline')) {
        tabCounts['ai-pipeline']++;
      } else if (w.fieldKey.startsWith('srsLearning')) {
        tabCounts['srs-learning']++;
      }
    });
    return tabCounts;
  }, [guardrailWarnings]);

  // Handlers for partial updates
  const handleUpdateAiPipeline = (updated: Partial<AIPipelineConfig>) => {
    setSettings((prev) => ({
      ...prev,
      aiPipeline: { ...prev.aiPipeline, ...updated },
    }));
  };

  const handleUpdateSrs = (updated: Partial<SRSLearningConfig>) => {
    setSettings((prev) => ({
      ...prev,
      srsLearning: { ...prev.srsLearning, ...updated },
    }));
  };

  const handleUpdateEconomy = (updated: Partial<EconomyGuardrailsConfig>) => {
    setSettings((prev) => ({
      ...prev,
      economyGuardrails: { ...prev.economyGuardrails, ...updated },
    }));
  };

  const handleUpdateSecurity = (updated: Partial<SecurityAccessConfig>) => {
    setSettings((prev) => ({
      ...prev,
      securityAccess: { ...prev.securityAccess, ...updated },
    }));
  };

  const handleUpdateMaintenance = (updated: Partial<SystemMaintenanceConfig>) => {
    setSettings((prev) => ({
      ...prev,
      systemMaintenance: { ...prev.systemMaintenance, ...updated },
    }));
  };

  // Discard changes
  const handleDiscard = () => {
    setSettings(committedSettings);
    showToast('Đã hủy bỏ toàn bộ thay đổi chưa lưu.');
  };

  // Reset to Factory Default
  const handleResetToDefault = () => {
    setShowResetConfirm(true);
  };

  // Import JSON snapshot
  const handleImportJson = (imported: SystemSettingsSnapshot) => {
    setSettings(imported);
    showToast(`Đã nạp thành công cấu hình snapshot v${imported.version}!`);
  };

  // Confirm Save & Commit to Audit Log
  const handleConfirmSave = (reason: string, ticketId: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newVersion = committedSettings.version + 1;

    const savedSnapshot: SystemSettingsSnapshot = {
      ...settings,
      version: newVersion,
      updatedAt: nowStr,
      updatedBy: 'Đinh Lê Phát (Super Admin)',
    };

    setCommittedSettings(savedSnapshot);
    setSettings(savedSnapshot);
    setIsAuditModalOpen(false);

    showToast(
      `Đã áp dụng cấu hình v${newVersion} và ghi nhận vào Sổ cái Kiểm toán với lý do: "${reason.slice(0, 30)}..."`
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-canvas overflow-y-auto pb-24">
      {/* Header */}
      <SettingsHeader
        settings={settings}
        dirtyCount={dirtyCount}
        warningsCount={guardrailWarnings.length}
        onResetToDefault={handleResetToDefault}
        onImportJson={handleImportJson}
        showToast={showToast}
      />

      {/* Tab Navigation */}
      <SettingsTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        diffCounts={diffCountsPerTab}
        guardrailTabWarnings={guardrailTabWarnings}
      />

      {/* Main Tab Content Canvas */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
        {activeTab === 'ai-pipeline' && (
          <AiPipelineTab
            config={settings.aiPipeline}
            onChange={handleUpdateAiPipeline}
          />
        )}

        {activeTab === 'srs-learning' && (
          <SrsLearningTab
            config={settings.srsLearning}
            onChange={handleUpdateSrs}
          />
        )}

        {activeTab === 'economy-guardrails' && (
          <EconomyGuardrailsTab
            config={settings.economyGuardrails}
            onChange={handleUpdateEconomy}
          />
        )}

        {activeTab === 'security-access' && (
          <SecurityAccessTab
            config={settings.securityAccess}
            onChange={handleUpdateSecurity}
            showToast={showToast}
          />
        )}

        {activeTab === 'system-maintenance' && (
          <SystemMaintenanceTab
            config={settings.systemMaintenance}
            onChange={handleUpdateMaintenance}
            showToast={showToast}
          />
        )}
      </main>

      {/* Floating Unsaved Bar */}
      <SettingsUnsavedBar
        dirtyCount={dirtyCount}
        hasGuardrailViolation={hasGuardrailViolation}
        onDiscard={handleDiscard}
        onOpenSaveModal={() => setIsAuditModalOpen(true)}
      />

      {/* Audit Diff Confirmation Modal */}
      <SettingsAuditDiffModal
        isOpen={isAuditModalOpen}
        diffs={diffs}
        onClose={() => setIsAuditModalOpen(false)}
        onConfirm={handleConfirmSave}
      />

      {/* Factory Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        tone="danger"
        title="Khôi phục mặc định xuất xưởng?"
        description="Toàn bộ các tham số cấu hình hệ thống (AI Pipeline, SRS, Economy Guardrails, Security) sẽ được khôi phục về giá trị mặc định ban đầu. Thao tác này không thể hoàn tác."
        confirmLabel="Khôi phục mặc định"
        cancelLabel="Hủy bỏ"
        confirmVariant="danger"
        onConfirm={() => {
          setSettings(DEFAULT_SETTINGS);
          setShowResetConfirm(false);
          showToast('Đã khôi phục các giá trị tham số về mặc định ban đầu.');
        }}
        onClose={() => setShowResetConfirm(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-neutral-700 text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={15} className="text-primary shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
