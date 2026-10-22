import React, { useState, useEffect, useMemo } from 'react';
import {
  AIScanTab,
  AIScanQueueItem,
  GPUWorkerNode,
  OperationalConfig,
  AIScanEngineHealth,
  AIScanRequest,
  FineTuneSample,
} from '../../domains/ai-scan/types';
import {
  MOCK_AI_SCAN_HEALTH,
  DEFAULT_OPERATIONAL_CONFIG,
  MOCK_GPU_WORKERS,
  MOCK_AI_SCAN_QUEUE,
  MOCK_SCAN_REQUESTS,
  MOCK_FINE_TUNE_SAMPLES,
  MOCK_CONFUSION_PAIRS,
} from '../../domains/ai-scan/mock-data';
import { computeAIScanRibbonMetrics } from '../../domains/ai-scan/selectors';
import { AIScanMetricsRibbon } from './components/AIScanMetricsRibbon';
import { AIScanTabNav } from './components/AIScanTabNav';
import { LiveEngineMonitorTab } from './components/LiveEngineMonitorTab';
import { ReviewQueueTab } from './components/ReviewQueueTab';
import { ScanRequestsExplorerTab } from './components/ScanRequestsExplorerTab';
import { FineTuningDatasetTab } from './components/FineTuningDatasetTab';
import { CEFRLevel } from '../../domains/flashcard/types';
import { RotateCw } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface AIScanMonitorPageProps {
  activeNav?: string;
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const AIScanMonitorPage: React.FC<AIScanMonitorPageProps> = ({
  activeNav,
  onNavigate,
  onWordChange,
}) => {
  // Active Tab: sync with activeNav if entered from Sidebar
  const [activeTab, setActiveTab] = useState<AIScanTab>(() => {
    return activeNav === 'ai-queue' ? 'review-queue' : 'live-monitor';
  });

  // Sync if activeNav changes externally
  useEffect(() => {
    if (activeNav === 'ai-queue') {
      setActiveTab('review-queue');
    } else if (activeNav === 'ai-monitor') {
      setActiveTab('live-monitor');
    }
  }, [activeNav]);

  // Domain States
  const [health] = useState<AIScanEngineHealth>(MOCK_AI_SCAN_HEALTH);
  const [config, setConfig] = useState<OperationalConfig>(DEFAULT_OPERATIONAL_CONFIG);
  const [workers, setWorkers] = useState<GPUWorkerNode[]>(MOCK_GPU_WORKERS);
  const [queueItems, setQueueItems] = useState<AIScanQueueItem[]>(MOCK_AI_SCAN_QUEUE);
  const [requests] = useState<AIScanRequest[]>(MOCK_SCAN_REQUESTS);
  const [samples, setSamples] = useState<FineTuneSample[]>(MOCK_FINE_TUNE_SAMPLES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Vừa cập nhật');

  const { show: showToast, node: toastNode } = useToast();

  // Aggregated Ribbon Metrics
  const ribbonMetrics = useMemo(
    () => computeAIScanRibbonMetrics(health, queueItems),
    [health, queueItems]
  );

  const pendingP1 = queueItems.filter((q) => q.status === 'pending' && q.priority === 'P1').length;
  const pendingQueueCount = queueItems.filter((q) => q.status === 'pending').length;

  // Handlers
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      // Simulate minor VRAM / temperature fluctuations
      setWorkers((prev) =>
        prev.map((w, idx) => ({
          ...w,
          temperatureC: idx === 0 ? 66 + Math.floor(Math.random() * 4) : 51 + Math.floor(Math.random() * 3),
          vramUsedMb: idx === 0 ? 13200 + Math.floor(Math.random() * 400) : 9100 + Math.floor(Math.random() * 200),
        }))
      );
      showToast('Đã làm mới telemetry cụm GPU worker và hàng đợi');
    }, 450);
  };

  const handleApproveItem = (itemId: string) => {
    const target = queueItems.find((q) => q.id === itemId);
    if (!target) return;

    setQueueItems((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: 'reviewed',
              reviewedAt: new Date().toISOString(),
              assignedOperator: 'Admin Lead',
            }
          : q
      )
    );
    showToast(`Đã xác nhận nhãn AI "${target.predictedLabel}" là chính xác`);
  };

  const handleRejectItem = (itemId: string) => {
    setQueueItems((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              assignedOperator: 'Admin Lead',
            }
          : q
      )
    );
    showToast('Đã loại bỏ ảnh lỗi khỏi hàng đợi kiểm duyệt');
  };

  const handleApplyCorrection = (
    itemId: string,
    correctedWord: string,
    cefr: CEFRLevel,
    meaningVi: string,
    reason: string
  ) => {
    const target = queueItems.find((q) => q.id === itemId);
    if (!target) return;

    setQueueItems((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: 'corrected',
              correctedWord,
              correctedCefr: cefr,
              correctedMeaningVi: meaningVi,
              correctionReason: reason,
              reviewedAt: new Date().toISOString(),
              assignedOperator: 'Admin Lead',
            }
          : q
      )
    );

    // Add new Fine-Tune sample
    const newSample: FineTuneSample = {
      id: `ft-sample-${Date.now()}`,
      scanRequestId: target.requestId || target.id,
      imageUrl: target.thumbnailUrl,
      originalLabel: target.predictedLabel,
      verifiedLabel: correctedWord,
      cefr,
      boundingBox: target.boundingBox || [200, 200, 800, 800],
      operator: 'Admin Lead',
      verifiedAt: new Date().toISOString(),
      status: 'ready',
    };
    setSamples((prev) => [newSample, ...prev]);

    if (onWordChange) {
      onWordChange(correctedWord);
    }

    showToast(
      `Đã sửa thành "${correctedWord}" [${cefr}] và đưa vào tập dữ liệu Fine-Tuning`
    );
  };

  const handleConfigChange = (newConfig: OperationalConfig) => {
    setConfig(newConfig);
    if (newConfig.fastModeEnabled !== config.fastModeEnabled) {
      showToast(
        newConfig.fastModeEnabled
          ? 'Đã kích hoạt Fast Mode (Bỏ qua SAM/Tiled OD, độ trễ < 10s)'
          : 'Đã chuyển về Full Pipeline (Florence-2 + SAM Mask + Tiled OD)'
      );
    } else {
      showToast('Đã cập nhật cấu hình tham số vận hành AI service');
    }
  };

  const handleExportDataset = () => {
    const cocoExport = {
      info: {
        description: 'SnapVocab Active Learning Florence-2 Fine-Tuning Dataset',
        version: '1.0',
        year: 2026,
        contributor: 'SnapVocab Admin Operators',
        date_created: new Date().toISOString(),
      },
      categories: samples.map((s, idx) => ({
        id: idx + 1,
        name: s.verifiedLabel,
        cefr: s.cefr,
      })),
      annotations: samples.map((s, idx) => ({
        id: idx + 101,
        image_id: idx + 1,
        category_id: idx + 1,
        bbox: s.boundingBox,
        operator: s.operator,
        verified_at: s.verifiedAt,
      })),
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cocoExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `florence2_active_learning_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);

    // Mark ready samples as exported
    setSamples((prev) =>
      prev.map((s) => (s.status === 'ready' ? { ...s, status: 'exported' } : s))
    );
    showToast(`Đã xuất thành công file COCO dataset gồm ${samples.length} mẫu`);
  };

  const handleNavigateToContentStudio = (wordName: string) => {
    if (onWordChange) {
      onWordChange(wordName);
    }
    if (onNavigate) {
      onNavigate('content-studio');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background p-4 space-y-4 select-none">
      {/* Toast Notification */}
      {toastNode}

      {/* Top Action & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-text tracking-tight flex items-center gap-1.5">
              <span>AI Scan Monitor &amp; Review Queue</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-snapy-light text-snapy text-[10px] font-bold border border-snapy/20 font-mono">
              Florence-2 · SAM · CLIP
            </span>
            {config.fastModeEnabled && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 font-mono animate-pulse">
                ⚡ Fast Mode: ON
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Giám sát cụm GPU worker, luồng hàng đợi thời gian thực và trạm kiểm duyệt lỗi nhận diện camera
          </p>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text-muted shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium font-mono">{lastUpdated}</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text transition-all shadow-xs ${
              isRefreshing ? 'animate-spin text-primary' : ''
            }`}
            title="Làm mới toàn bộ số liệu AI Scan"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Layer 1: High-Density Metric Ribbon */}
      <section>
        <AIScanMetricsRibbon
          metrics={ribbonMetrics}
          onSelectMetricCard={(cardId) => {
            if (cardId === 'pending-review') {
              setActiveTab('review-queue');
            } else if (cardId === 'gpu-cluster' || cardId === 'latency-p95') {
              setActiveTab('live-monitor');
            } else if (cardId === 'scans-today') {
              setActiveTab('requests-history');
            }
          }}
        />
      </section>

      {/* Layer 2: Operational Tab Navigation */}
      <section className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
        <AIScanTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingQueueCount={pendingQueueCount}
          urgentReportCount={pendingP1}
        />

        {/* Layer 3: Active Tab Content Workspaces */}
        <div className="p-4 bg-background">
          {activeTab === 'live-monitor' && (
            <LiveEngineMonitorTab
              workers={workers}
              config={config}
              health={health}
              activeRequests={requests.filter((r) => r.status === 'PROCESSING')}
              onConfigChange={handleConfigChange}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'review-queue' && (
            <ReviewQueueTab
              queueItems={queueItems}
              onApproveItem={handleApproveItem}
              onRejectItem={handleRejectItem}
              onApplyCorrection={handleApplyCorrection}
              onNavigateToContentStudio={handleNavigateToContentStudio}
            />
          )}

          {activeTab === 'requests-history' && (
            <ScanRequestsExplorerTab requests={requests} />
          )}

          {activeTab === 'dataset-tuning' && (
            <FineTuningDatasetTab
              samples={samples}
              confusionPairs={MOCK_CONFUSION_PAIRS}
              onExportDataset={handleExportDataset}
            />
          )}
        </div>
      </section>
    </div>
  );
};
