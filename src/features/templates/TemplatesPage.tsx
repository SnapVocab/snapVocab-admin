import React, { useState, useMemo } from 'react';
import {
  CardTemplate,
  TemplatesTab,
  DeckTemplateMapping,
} from '../../domains/templates/types';
import {
  INITIAL_SYSTEM_TEMPLATES,
  INITIAL_CUSTOM_TEMPLATES,
  INITIAL_DECK_MAPPINGS,
} from '../../domains/templates/mock-data';
import { computeTemplateMetrics } from '../../domains/templates/selectors';
import { TemplateMetricsRibbon } from './components/TemplateMetricsRibbon';
import { SystemTemplatesView } from './components/SystemTemplatesView';
import { CustomTemplatesAuditView } from './components/CustomTemplatesAuditView';
import { TemplateBuilderStudio } from './components/TemplateBuilderStudio';
import { TemplateMobileSimulator } from './components/TemplateMobileSimulator';
import { TemplateInspectorDrawer } from './components/TemplateInspectorDrawer';
import { AssignTemplateDeckModal } from './components/AssignTemplateDeckModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  TableProperties,
} from 'lucide-react';

interface TemplatesPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({
  onNavigate: _onNavigate,
  onWordChange,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TemplatesTab>('system');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Vừa cập nhật');
  const [showSimulator, setShowSimulator] = useState(true);

  // Domain Data States
  const [systemTemplates, setSystemTemplates] = useState<CardTemplate[]>(INITIAL_SYSTEM_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<CardTemplate[]>(INITIAL_CUSTOM_TEMPLATES);
  const [deckMappings, setDeckMappings] = useState<DeckTemplateMapping[]>(INITIAL_DECK_MAPPINGS);

  // Selection for Simulator & Modals
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>(INITIAL_SYSTEM_TEMPLATES[0]);
  const [inspectingTemplate, setInspectingTemplate] = useState<CardTemplate | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState<CardTemplate | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingTemplateForBuilder, setEditingTemplateForBuilder] = useState<CardTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<CardTemplate | null>(null);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Combined templates for metrics
  const allTemplates = useMemo(
    () => [...systemTemplates, ...customTemplates],
    [systemTemplates, customTemplates]
  );

  const metrics = useMemo(
    () => computeTemplateMetrics(allTemplates, deckMappings.length),
    [allTemplates, deckMappings]
  );

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      showToast('Đã làm mới dữ liệu cấu hình templates');
    }, 400);
  };

  // Actions
  const handleInspect = (tpl: CardTemplate) => {
    setInspectingTemplate(tpl);
    setIsInspectorOpen(true);
  };

  const handleOpenAssign = (tpl: CardTemplate) => {
    setAssigningTemplate(tpl);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = (templateId: string, deckIds: string[]) => {
    const targetTpl = allTemplates.find((t) => t.id === templateId);
    if (!targetTpl) return;

    setDeckMappings((prev) =>
      prev.map((d) => {
        if (deckIds.includes(d.deckId)) {
          return {
            ...d,
            currentTemplateId: targetTpl.id,
            currentTemplateName: targetTpl.name,
            lastStudied: 'Vừa cập nhật template',
          };
        }
        return d;
      })
    );

    // Update deckCount in templates
    setSystemTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, deckCount: t.deckCount + deckIds.length } : t))
    );

    showToast(`Đã gán mẫu ${targetTpl.name} cho ${deckIds.length} bộ bài thành công!`);
  };

  const handleCloneToBuilder = (tpl: CardTemplate) => {
    setEditingTemplateForBuilder({
      ...tpl,
      id: `tpl-custom-${Date.now()}`,
      code: `${tpl.code}_COPY`,
      name: `${tpl.name} (Bản sao)`,
      nameVi: `${tpl.nameVi} (Tùy chỉnh)`,
      isSystem: false,
      isDefault: false,
      authorName: 'Admin Operator',
      authorRole: 'admin',
      deckCount: 0,
      activeLearners: 0,
    });
    setActiveTab('builder');
  };

  const handleSaveFromBuilder = (newTpl: CardTemplate) => {
    const existingIndex = customTemplates.findIndex((t) => t.id === newTpl.id);
    if (existingIndex >= 0) {
      setCustomTemplates((prev) => prev.map((t) => (t.id === newTpl.id ? newTpl : t)));
      showToast(`Đã cập nhật mẫu ${newTpl.name}!`);
    } else {
      setCustomTemplates((prev) => [newTpl, ...prev]);
      showToast(`Đã lưu mẫu ${newTpl.name} vào hệ thống!`);
    }
    setSelectedTemplate(newTpl);
    setActiveTab('custom-audit');
    setEditingTemplateForBuilder(null);
  };

  const handlePromoteToSystem = (tpl: CardTemplate) => {
    const promoted: CardTemplate = {
      ...tpl,
      isSystem: true,
      authorRole: 'system',
      authorName: 'SnapVocab Core Team',
    };
    setCustomTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    setSystemTemplates((prev) => [...prev, promoted]);
    showToast(`Đã nâng cấp ${tpl.name} thành Mẫu Hệ Thống dùng chung!`);
  };

  const handleToggleFlag = (tpl: CardTemplate) => {
    const newStatus = tpl.status === 'flagged' ? 'active' : 'flagged';
    setCustomTemplates((prev) =>
      prev.map((t) => (t.id === tpl.id ? { ...t, status: newStatus } : t))
    );
    showToast(
      newStatus === 'flagged'
        ? `Đã gắn cờ cảnh báo cho mẫu ${tpl.name}`
        : `Đã gỡ cờ và duyệt hoạt động mẫu ${tpl.name}`
    );
  };

  const handleDeleteCustomTemplate = (tpl: CardTemplate) => {
    setTemplateToDelete(tpl);
  };

  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    const tpl = templateToDelete;
    // Fallback affected decks to CLASSIC
    setDeckMappings((prev) =>
      prev.map((d) =>
        d.currentTemplateId === tpl.id
          ? { ...d, currentTemplateId: 'tpl-sys-classic', currentTemplateName: 'Classic Flip' }
          : d
      )
    );
    setCustomTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    showToast(`Đã xóa mềm mẫu ${tpl.name}. Các bộ bài liên kết đã chuyển về CLASSIC an toàn.`);
    setTemplateToDelete(null);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden select-none">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-modal animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 size={15} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="p-4 sm:px-6 border-b border-border bg-surface shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-light text-primary">
              <Layers size={18} />
            </span>
            <h1 className="text-lg font-extrabold text-text tracking-tight">
              Card Templates Studio & Management
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
              M3 Learning Engine
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Quản trị 6 mẫu hệ thống cốt lõi, kiểm duyệt mẫu tùy chỉnh học viên, trình thiết kế Wizard 4 bước và ma trận gán Deck.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-subtle border border-border text-xs font-semibold text-text flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin text-primary' : 'text-text-muted'} />
            <span className="hidden sm:inline">{lastUpdated}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              showSimulator
                ? 'bg-primary-light text-primary border-primary/20'
                : 'bg-surface text-text-muted border-border hover:text-text'
            }`}
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">{showSimulator ? 'Ẩn Simulator' : 'Hiện Simulator'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTemplateForBuilder(null);
              setActiveTab('builder');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus size={15} />
            <span>Thiết Kế Mẫu Mới</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col min-w-0">
        {/* KPI Metrics Ribbon */}
        <TemplateMetricsRibbon metrics={metrics} />

        {/* Tab Navigation Switcher */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'system'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
            >
              <Layers size={14} />
              <span>Mẫu Hệ Thống ({systemTemplates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom-audit')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'custom-audit'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Kiểm Duyệt Custom ({customTemplates.length})</span>
              {customTemplates.some((t) => t.status === 'flagged') && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTemplateForBuilder(null);
                setActiveTab('builder');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'builder'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
            >
              <Sparkles size={14} />
              <span>Trình Thiết Kế Thẻ (Studio)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deck-matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'deck-matrix'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
            >
              <TableProperties size={14} />
              <span>Ma Trận Phân Bổ Deck ({deckMappings.length})</span>
            </button>
          </div>

          <span className="text-xs text-text-muted hidden md:inline">
            Đang mô phỏng mẫu:{' '}
            <strong className="text-primary font-bold">{selectedTemplate.name}</strong> ({selectedTemplate.code})
          </span>
        </div>

        {/* Master-Detail Content Layout */}
        <div className="flex-1 flex gap-5 min-h-0 items-start">
          {/* Main Left Workspace */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeTab === 'system' && (
              <SystemTemplatesView
                templates={systemTemplates}
                selectedTemplateId={selectedTemplate.id}
                onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
                onInspectTemplate={handleInspect}
                onCloneTemplate={handleCloneToBuilder}
                onAssignToDeck={handleOpenAssign}
              />
            )}

            {activeTab === 'custom-audit' && (
              <CustomTemplatesAuditView
                templates={customTemplates}
                selectedTemplateId={selectedTemplate.id}
                onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
                onPromoteToSystem={handlePromoteToSystem}
                onToggleFlagStatus={handleToggleFlag}
                onDeleteTemplate={handleDeleteCustomTemplate}
              />
            )}

            {activeTab === 'builder' && (
              <TemplateBuilderStudio
                initialTemplate={editingTemplateForBuilder}
                onSaveTemplate={handleSaveFromBuilder}
                onCancel={() => setActiveTab('system')}
                onPreviewInSimulator={(tpl) => setSelectedTemplate(tpl)}
              />
            )}

            {activeTab === 'deck-matrix' && (
              <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border bg-background flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-text">
                      Ma Trận Gán Template & Thống Kê Học Tập Theo Deck
                    </h3>
                    <p className="text-xs text-text-muted">
                      Theo dõi mẫu thẻ đang áp dụng cho từng bộ bài, tỷ lệ hoàn thành bài học và 1-click gán mẫu mới.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Bảo toàn FSRS 100%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-background text-text-muted font-bold uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Bộ Bài (Deck)</th>
                        <th className="py-3 px-4">Trình Độ</th>
                        <th className="py-3 px-4">Số Thẻ</th>
                        <th className="py-3 px-4">Template Hiện Tại</th>
                        <th className="py-3 px-4">Học Viên Active</th>
                        <th className="py-3 px-4">Hoàn Thành</th>
                        <th className="py-3 px-4 text-right">Đổi Mẫu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deckMappings.map((deck) => {
                        const currentTpl = allTemplates.find((t) => t.id === deck.currentTemplateId);
                        return (
                          <tr key={deck.deckId} className="hover:bg-surface-subtle transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{deck.deckIcon}</span>
                                <div>
                                  <div className="font-bold text-text">{deck.deckTitle}</div>
                                  <div className="text-[11px] text-text-muted">{deck.deckTitleVi}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-subtle border border-border">
                                {deck.targetCefr}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-text">
                              {deck.noteCount.toLocaleString()} thẻ
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-lg bg-primary-light text-primary font-bold text-[11px] border border-primary/20">
                                  {deck.currentTemplateName}
                                </span>
                                {currentTpl?.isDefault && (
                                  <span className="text-[9px] text-[#9A7000] font-bold bg-reward-light px-1 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-text-muted">
                              {deck.activeLearners.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${deck.completionRate}%` }}
                                  />
                                </div>
                                <span className="font-bold text-[11px] text-text">{deck.completionRate}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentTpl) {
                                    handleOpenAssign(currentTpl);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-subtle border border-border text-[11px] font-bold text-primary hover:text-primary-hover shadow-2xs"
                              >
                                Đổi Template
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Sticky Mobile Simulator */}
          {showSimulator && (
            <div className="w-[360px] sticky top-0 shrink-0 hidden xl:block self-start">
              <TemplateMobileSimulator
                template={selectedTemplate}
                onSelectWord={(word) => {
                  if (onWordChange) onWordChange(word);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <TemplateInspectorDrawer
        template={inspectingTemplate}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onAssignToDeck={(tpl) => {
          setIsInspectorOpen(false);
          handleOpenAssign(tpl);
        }}
      />

      <AssignTemplateDeckModal
        template={assigningTemplate}
        decks={deckMappings}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onConfirmAssign={handleConfirmAssign}
      />

      {/* Delete Template Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(templateToDelete)}
        tone="danger"
        title={`Xóa mềm mẫu "${templateToDelete?.name}"?`}
        description="Mẫu này sẽ được xóa khỏi danh mục tùy chỉnh. Toàn bộ thẻ từ vựng và tiến độ SRS của học viên được bảo toàn nguyên vẹn."
        confirmLabel="Xác nhận xóa mềm"
        cancelLabel="Hủy"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteTemplate}
        onClose={() => setTemplateToDelete(null)}
      >
        <div className="rounded-xl border border-warning/30 bg-warning-light/70 p-3 text-xs text-warning-dark leading-relaxed">
          <p className="font-semibold mb-0.5">Cảnh báo an toàn:</p>
          <p>
            {templateToDelete && deckMappings.filter((d) => d.currentTemplateId === templateToDelete.id).length > 0
              ? `${deckMappings.filter((d) => d.currentTemplateId === templateToDelete.id).length} bộ bài đang dùng mẫu này sẽ tự động chuyển về mẫu CLASSIC.`
              : 'Không có bộ bài nào đang liên kết với mẫu này.'}
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
};
