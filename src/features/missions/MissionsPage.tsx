import React, { useState, useMemo, useEffect } from 'react';
import {
  Mission,
  MissionsTabNavId,
  DailyCycleConfig,
  WeeklyMilestoneConfig,
  MissionGuardrailConfig,
  MissionViolation,
  LearnerMissionProgressSample,
} from '../../domains/missions/types';
import {
  INITIAL_MISSIONS,
  DEFAULT_DAILY_CYCLE_CONFIG,
  DEFAULT_WEEKLY_CONFIG,
  DEFAULT_MISSION_GUARDRAILS,
  INITIAL_MISSION_VIOLATIONS,
  INITIAL_LEARNER_SAMPLES,
} from '../../domains/missions/mock-data';
import { computeMissionRibbonMetrics } from '../../domains/missions/selectors';
import { getCapabilityByAction } from '../../domains/missions/capabilities';
import { MissionsMetricsRibbon } from './components/MissionsMetricsRibbon';
import { MissionsTabNav } from './components/MissionsTabNav';
import { MissionPoolTab } from './components/MissionPoolTab';
import { CycleAndChestTab } from './components/CycleAndChestTab';
import { MissionGuardrailsTab } from './components/MissionGuardrailsTab';
import { LearnerActivityTab } from './components/LearnerActivityTab';
import { MissionFormModal } from './components/MissionFormModal';
import { MissionInspectorDrawer } from './components/MissionInspectorDrawer';
import { MissionActivationModal } from './components/MissionActivationModal';
import { AuditReasonModal } from './components/AuditReasonModal';
import {
  Target,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
} from 'lucide-react';

interface MissionsPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const MissionsPage: React.FC<MissionsPageProps> = ({
  onNavigate,
  onWordChange,
}) => {
  // Navigation & Tab
  const [activeTab, setActiveTab] = useState<MissionsTabNavId>('mission-pool');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Vừa cập nhật');

  // Domain Data States
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [dailyConfig, setDailyConfig] = useState<DailyCycleConfig>(DEFAULT_DAILY_CYCLE_CONFIG);
  const [weeklyConfig, setWeeklyConfig] = useState<WeeklyMilestoneConfig>(DEFAULT_WEEKLY_CONFIG);
  const [guardrailConfig, setGuardrailConfig] = useState<MissionGuardrailConfig>(DEFAULT_MISSION_GUARDRAILS);
  const [violations, setViolations] = useState<MissionViolation[]>(INITIAL_MISSION_VIOLATIONS);
  const [learners, setLearners] = useState<LearnerMissionProgressSample[]>(INITIAL_LEARNER_SAMPLES);

  // Modals & Drawer state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [inspectingMission, setInspectingMission] = useState<Mission | null>(null);
  const [isInspectDrawerOpen, setIsInspectDrawerOpen] = useState(false);

  // Activation Checklist Modal state (Draft -> Active Lifecycle)
  const [activatingMission, setActivatingMission] = useState<Mission | null>(null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  // Audit Modal state
  const [auditConfig, setAuditConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isDangerous: boolean;
    actionLabel: string;
    onConfirmCallback?: (reason: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    isDangerous: false,
    actionLabel: 'Xác Nhận',
  });

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Realtime Countdown to 00:00 GMT+7
  const [countdownText, setCountdownText] = useState('08:24:15');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // UTC + 7
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const gmt7 = new Date(utc + 3600000 * 7);

      const midnight = new Date(gmt7);
      midnight.setHours(24, 0, 0, 0);

      const diff = midnight.getTime() - gmt7.getTime();
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Ribbon Metrics
  const ribbonMetrics = useMemo(() => {
    return computeMissionRibbonMetrics(missions, violations);
  }, [missions, violations]);

  // Handlers
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      showToast('Đã đồng bộ dữ liệu LiveOps Quest Engine mới nhất!');
    }, 450);
  };

  // Add / Save Mission (Draft-First Lifecycle)
  const handleSaveMission = (
    missionData: Partial<Mission>,
    isOverrideApproved?: boolean
  ) => {
    if (editingMission) {
      const nextVersion = (editingMission.version || 1) + 1;
      setMissions((prev) =>
        prev.map((m) =>
          m.id === editingMission.id
            ? ({
                ...m,
                ...missionData,
                version: nextVersion,
                lastUpdated: 'Vừa xong',
                updatedBy: 'Lead Admin Hoà',
              } as Mission)
            : m
        )
      );
      showToast(`Đã cập nhật nhiệm vụ ${editingMission.code} (v${nextVersion})!`);
    } else {
      const cap = getCapabilityByAction(missionData.actionType || 'SCAN_OBJECT');
      const newMission: Mission = {
        id: `ms-${Date.now()}`,
        code: missionData.code || `MS-D-${Math.floor(10 + Math.random() * 90)}`,
        title: missionData.title || 'Nhiệm vụ mới',
        description: missionData.description || '',
        type: missionData.type || 'daily',
        category: missionData.category || cap.category,
        actionType: missionData.actionType || 'SCAN_OBJECT',
        triggerEvent: missionData.triggerEvent || cap.defaultTriggerEvent,
        aggregationType: missionData.aggregationType || cap.defaultAggregation,
        targetCount: missionData.targetCount || cap.suggestedTargetCount,
        unit: missionData.unit || cap.defaultUnit,
        difficulty: missionData.difficulty || 'easy',
        reward: missionData.reward || { xp: 40, coins: 60 },
        weight: missionData.weight || 80,
        status: 'draft', // Luôn bắt đầu ở trạng thái Draft theo chuẩn BF-15A
        version: 1,
        targetAudience: missionData.targetAudience || 'all',
        isBonus: missionData.isBonus || false,
        minimumSupportedClientVersion:
          missionData.minimumSupportedClientVersion || cap.supportedClientVersion,
        navigationParams: missionData.navigationParams || cap.defaultNavigation,
        completionRule: missionData.completionRule || {},
        eligibilityRule: missionData.eligibilityRule,
        completionRate: 0,
        claimRate: 0,
        totalCompletedCount: 0,
        totalClaimedCount: 0,
        lastUpdated: 'Vừa tạo (Bản nháp)',
        updatedBy: 'Lead Admin Hoà',
      };
      setMissions((prev) => [newMission, ...prev]);

      // If over ceiling, create a violation record
      if (isOverrideApproved) {
        const newVio: MissionViolation = {
          id: `vio-${Date.now()}`,
          missionId: newMission.id,
          missionCode: newMission.code,
          missionTitle: newMission.title,
          severity: 'high',
          violationType: 'COIN_CAP_EXCEEDED',
          description: `Phần thưởng ${newMission.reward.coins} Coins vượt trần ${guardrailConfig.maxCoinsCapPerQuest} Coins đã được phê duyệt ngoại lệ.`,
          timestamp: new Date().toLocaleString('vi-VN'),
          status: 'whitelisted',
          mitigatedBy: 'Super Admin',
          reason: 'Đã phê duyệt ngoại lệ trong quá trình tạo nhiệm vụ',
        };
        setViolations((prev) => [newVio, ...prev]);
      }

      showToast(`Đã tạo bản nháp nhiệm vụ ${newMission.code}. Hãy kiểm tra và kích hoạt!`);
    }

    setIsFormModalOpen(false);
    setEditingMission(null);
  };

  // Activation Handlers (Draft -> Active Lifecycle)
  const handleRequestActivate = (mission: Mission) => {
    setActivatingMission(mission);
    setIsActivationModalOpen(true);
  };

  const handleConfirmActivate = (
    mission: Mission,
    auditReason: string,
    approvalCode?: string
  ) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === mission.id
          ? {
              ...m,
              status: 'active',
              auditNotes:
                (m.auditNotes ? `${m.auditNotes} | ` : '') +
                `Kích hoạt [v${m.version || 1}]: ${auditReason}${
                  approvalCode ? ` (Override code: ${approvalCode})` : ''
                }`,
              lastUpdated: 'Vừa kích hoạt',
              updatedBy: 'Lead Admin Hoà',
            }
          : m
      )
    );
    setIsActivationModalOpen(false);
    setActivatingMission(null);
    showToast(`Đã kích hoạt nhiệm vụ ${mission.code} vào LiveOps Pool thành công!`);
  };

  // Toggle Active/Draft (Tắt active -> về draft; Kích hoạt draft -> mở modal checklist)
  const handleToggleStatus = (mission: Mission) => {
    if (mission.status === 'active') {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === mission.id
            ? { ...m, status: 'draft', lastUpdated: 'Vừa hạ về Draft' }
            : m
        )
      );
      showToast(`Nhiệm vụ ${mission.code} đã chuyển về trạng thái Bản nháp.`);
    } else {
      handleRequestActivate(mission);
    }
  };

  // Duplicate Mission
  const handleDuplicateMission = (mission: Mission) => {
    const duplicated: Mission = {
      ...mission,
      id: `ms-copy-${Date.now()}`,
      code: `${mission.code}-COPY`,
      title: `${mission.title} (Bản sao)`,
      status: 'draft',
      version: 1,
      totalCompletedCount: 0,
      totalClaimedCount: 0,
      completionRate: 0,
      claimRate: 0,
      lastUpdated: 'Vừa tạo (Bản nháp)',
      updatedBy: 'Lead Admin Hoà',
    };
    setMissions((prev) => [duplicated, ...prev]);
    showToast(`Đã nhân bản nhiệm vụ ${mission.code} thành bản nháp!`);
  };

  // Archive Mission (Requires Audit reason if active)
  const handleArchiveMission = (mission: Mission) => {
    if (mission.status === 'active') {
      setAuditConfig({
        isOpen: true,
        title: `Lưu Trữ Nhiệm Vụ Đang Chạy: ${mission.code}`,
        description: `Nhiệm vụ "${mission.title}" hiện đang nằm trong Pool hoạt động. Việc lưu trữ sẽ loại bỏ nhiệm vụ này khỏi vòng quay của học viên.`,
        actionLabel: 'Xác Nhận Lưu Trữ',
        isDangerous: true,
        onConfirmCallback: (reason) => {
          setMissions((prev) =>
            prev.map((m) =>
              m.id === mission.id
                ? {
                    ...m,
                    status: 'archived',
                    auditNotes: `Lưu trữ: ${reason}`,
                    lastUpdated: 'Vừa xong',
                  }
                : m
            )
          );
          setAuditConfig((prev) => ({ ...prev, isOpen: false }));
          setIsInspectDrawerOpen(false);
          showToast(`Đã lưu trữ nhiệm vụ ${mission.code}.`);
        },
      });
    } else {
      const nextStatus = mission.status === 'archived' ? 'draft' : 'archived';
      setMissions((prev) =>
        prev.map((m) => (m.id === mission.id ? { ...m, status: nextStatus } : m))
      );
      setIsInspectDrawerOpen(false);
      showToast(`Đã chuyển trạng thái ${mission.code} sang ${nextStatus}.`);
    }
  };

  // Whitelist Violation
  const handleWhitelistViolation = (violationId: string) => {
    const target = violations.find((v) => v.id === violationId);
    if (!target) return;

    setAuditConfig({
      isOpen: true,
      title: `Duyệt Ngoại Lệ Trần Thưởng (Whitelist): ${target.missionCode}`,
      description: `Bạn đang cấp quyền ngoại lệ cho cảnh báo: "${target.description}". Thao tác này sẽ ghi nhận vào Audit Log của Super Admin.`,
      actionLabel: 'Duyệt Ngoại Lệ (Super Admin)',
      isDangerous: false,
      onConfirmCallback: (reason) => {
        setViolations((prev) =>
          prev.map((v) =>
            v.id === violationId
              ? {
                  ...v,
                  status: 'whitelisted',
                  mitigatedBy: 'Super Admin Hoàng',
                  reason,
                }
              : v
          )
        );
        setAuditConfig((prev) => ({ ...prev, isOpen: false }));
        showToast(`Đã phê duyệt ngoại lệ cho vi phạm ${target.missionCode}!`);
      },
    });
  };

  // Mitigate Violation
  const handleMitigateViolation = (violationId: string) => {
    const target = violations.find((v) => v.id === violationId);
    if (!target) return;

    // Automatically lower reward to ceiling
    setMissions((prev) =>
      prev.map((m) =>
        m.id === target.missionId
          ? {
              ...m,
              reward: {
                ...m.reward,
                coins: Math.min(m.reward.coins, guardrailConfig.maxCoinsCapPerQuest),
              },
            }
          : m
      )
    );

    setViolations((prev) =>
      prev.map((v) =>
        v.id === violationId
          ? {
              ...v,
              status: 'mitigated',
              mitigatedBy: 'Lead Admin Hoà',
              reason: 'Tự động hạ mức thưởng về trần an toàn (1,000 Coins)',
            }
          : v
      )
    );

    showToast(`Đã hạ mức thưởng nhiệm vụ ${target.missionCode} về ngưỡng an toàn!`);
  };

  // Manual Grant for Learner (Tuân thủ No-Backfill BF-12G: Cấp bồi hoàn ví, KHÔNG mở rương/stamp hồi tố)
  const handleManualGrant = (learner: LearnerMissionProgressSample) => {
    setAuditConfig({
      isOpen: true,
      title: `Ghi Nhận Sự Cố & Bồi Hoàn Ví Ops: ${learner.learnerName}`,
      description: `Học viên có ${learner.unclaimedCoinsAtRisk} Coins chưa nhận thưởng do sự cố hệ thống. Theo quy tắc BF-12G, hệ thống KHÔNG mở rương hồi tố hay cộng Activity Stamp sau reset. Vui lòng nhập mã Ticket hỗ trợ để cấp bù Coins trực tiếp vào ví bồi hoàn.`,
      actionLabel: 'Cấp Bồi Hoàn Ví (No-Backfill)',
      isDangerous: false,
      onConfirmCallback: (reason) => {
        setLearners((prev) =>
          prev.map((l) =>
            l.learnerId === learner.learnerId
              ? {
                  ...l,
                  unclaimedCoinsAtRisk: 0,
                  status: 'claimed_all',
                  recentEventKey: `OPS-INCIDENT-COMPENSATE-${Date.now()}`,
                }
              : l
          )
        );
        setAuditConfig((prev) => ({ ...prev, isOpen: false }));
        showToast(
          `Đã giải quyết sự cố và cấp bồi hoàn ví cho học viên ${learner.learnerName} (Ticket: ${reason}). Tuân thủ No-Backfill BF-12G!`
        );
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 space-y-4 select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-text text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <span>LiveOps Console</span>
            <span>/</span>
            <span className="text-text font-medium">Missions & Quests Engine</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-text tracking-tight">
              Quản Lý Nhiệm Vụ & Chuỗi Thử Thách
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-snapy-light text-snapy border border-snapy/20 font-mono">
              v2.4 LiveOps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="text-[11px] text-text-muted hidden md:block">
            {lastUpdated}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text transition-colors shadow-xs"
            title="Đồng bộ dữ liệu"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingMission(null);
              setIsFormModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={14} />
            <span>Tạo Nhiệm Vụ Mới</span>
          </button>
        </div>
      </div>

      {/* Top Ribbon Metrics */}
      <MissionsMetricsRibbon
        metrics={ribbonMetrics}
        countdownText={countdownText}
      />

      {/* Tab Navigation */}
      <MissionsTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activePoolCount={ribbonMetrics.activeDailyPoolCount}
        violationsCount={ribbonMetrics.activeViolationsCount}
      />

      {/* Main Tab Content */}
      <div className="flex-1 min-h-[480px]">
        {activeTab === 'mission-pool' && (
          <MissionPoolTab
            missions={missions}
            dailyConfig={dailyConfig}
            weeklyConfig={weeklyConfig}
            guardrailConfig={guardrailConfig}
            countdownText={countdownText}
            onAddMission={() => {
              setEditingMission(null);
              setIsFormModalOpen(true);
            }}
            onEditMission={(m) => {
              setEditingMission(m);
              setIsFormModalOpen(true);
            }}
            onInspectMission={(m) => {
              setInspectingMission(m);
              setIsInspectDrawerOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onRequestActivate={handleRequestActivate}
            onDuplicateMission={handleDuplicateMission}
            onArchiveMission={handleArchiveMission}
          />
        )}

        {activeTab === 'cycle-chests' && (
          <CycleAndChestTab
            dailyConfig={dailyConfig}
            weeklyConfig={weeklyConfig}
            countdownText={countdownText}
            missions={missions}
            guardrailConfig={guardrailConfig}
            onUpdateDailyConfig={(newCfg) => {
              setDailyConfig(newCfg);
              showToast('Đã lưu cấu hình chu kỳ reset 00:00 & Daily Chest!');
            }}
            onUpdateWeeklyConfig={(newCfg) => {
              setWeeklyConfig(newCfg);
              showToast('Đã lưu 3 mốc rương tuần Activity Stamps!');
            }}
          />
        )}

        {activeTab === 'guardrails' && (
          <MissionGuardrailsTab
            guardrailConfig={guardrailConfig}
            violations={violations}
            onUpdateConfig={(newCfg) => {
              setGuardrailConfig(newCfg);
              showToast('Đã cập nhật chính sách LiveOps Guardrails!');
            }}
            onWhitelistViolation={handleWhitelistViolation}
            onMitigateViolation={handleMitigateViolation}
          />
        )}

        {activeTab === 'learner-progress' && (
          <LearnerActivityTab
            learners={learners}
            onManualGrant={handleManualGrant}
          />
        )}
      </div>

      {/* Modals & Drawers */}
      <MissionFormModal
        isOpen={isFormModalOpen}
        editingMission={editingMission}
        guardrailConfig={guardrailConfig}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingMission(null);
        }}
        onSave={handleSaveMission}
      />

      <MissionInspectorDrawer
        mission={inspectingMission}
        isOpen={isInspectDrawerOpen}
        guardrailConfig={guardrailConfig}
        onClose={() => {
          setIsInspectDrawerOpen(false);
          setInspectingMission(null);
        }}
        onEdit={(m) => {
          setIsInspectDrawerOpen(false);
          setEditingMission(m);
          setIsFormModalOpen(true);
        }}
        onDuplicate={(m) => {
          handleDuplicateMission(m);
          setIsInspectDrawerOpen(false);
        }}
        onArchive={handleArchiveMission}
      />

      <MissionActivationModal
        isOpen={isActivationModalOpen}
        mission={activatingMission}
        allMissions={missions}
        guardrailConfig={guardrailConfig}
        onClose={() => {
          setIsActivationModalOpen(false);
          setActivatingMission(null);
        }}
        onConfirmActivate={handleConfirmActivate}
      />

      <AuditReasonModal
        isOpen={auditConfig.isOpen}
        title={auditConfig.title}
        description={auditConfig.description}
        actionLabel={auditConfig.actionLabel}
        isDangerous={auditConfig.isDangerous}
        onClose={() => setAuditConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={(reason) => {
          if (auditConfig.onConfirmCallback) {
            auditConfig.onConfirmCallback(reason);
          }
        }}
      />
    </div>
  );
};
