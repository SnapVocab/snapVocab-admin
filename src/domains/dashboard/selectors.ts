import { CardViewModel } from '../flashcard/types';
import { AIScanEngineHealth } from '../ai-scan/types';
import { LiveOpsEconomyState } from '../economy/types';
import {
  DashboardViewModel,
  DashboardTimeRange,
  MetricRibbonCard,
  ContentPipelineProjection,
  AIScanProjection,
  LearnerActivityProjection,
  LiveOpsProjection,
  AuditEventProjection,
  InfraServiceHealth,
  OperationalActionItem,
  InfraHealthSummary,
} from './types';

export const DEFAULT_INFRA_SERVICES: InfraServiceHealth[] = [
  {
    name: 'Spring Boot Backend (SS-17)',
    status: 'online',
    latencyMs: 38,
    detail: 'API Gateway & DB Postgres Pool Healthy',
  },
  {
    name: 'Gemini Vision AI Engine',
    status: 'online',
    latencyMs: 420,
    detail: 'Camera Object Recognition v2.4 (Active Feedback Loop)',
  },
  {
    name: 'Cloudflare R2 Asset Storage',
    status: 'online',
    latencyMs: 62,
    detail: '42.6 GB / 100 GB (Audio Cache & Media)',
  },
  {
    name: 'Web Speech TTS Synthesizer',
    status: 'online',
    latencyMs: 15,
    detail: 'en-US & en-GB Native Engine Ready',
  },
];

export interface ProjectDashboardParams {
  timeRange: DashboardTimeRange;
  refreshedAt: string;
  vocabularyList?: CardViewModel[];
  aiHealth?: AIScanEngineHealth;
  economyState?: LiveOpsEconomyState;
  infraServices?: InfraServiceHealth[];
}

/**
 * Pure projection selector: converts raw domain entities into a data-dense Dashboard ViewModel.
 * Does NOT generate random data or impure timestamps (new Date()) inside.
 */
export function projectDashboardViewModel(
  paramsOrTimeRange: ProjectDashboardParams | DashboardTimeRange,
  legacyVocab?: CardViewModel[],
  legacyAiHealth?: AIScanEngineHealth,
  legacyEconomyState?: LiveOpsEconomyState,
  legacyRefreshedAt?: string,
  legacyInfraServices?: InfraServiceHealth[]
): DashboardViewModel {
  const isObjectParam = typeof paramsOrTimeRange === 'object' && paramsOrTimeRange !== null;
  const timeRange: DashboardTimeRange = isObjectParam
    ? paramsOrTimeRange.timeRange
    : (paramsOrTimeRange as DashboardTimeRange);
  const refreshedAt = isObjectParam
    ? paramsOrTimeRange.refreshedAt
    : legacyRefreshedAt || '10:35 AM';
  const vocabularyList = isObjectParam ? paramsOrTimeRange.vocabularyList : legacyVocab;
  const aiHealth = isObjectParam
    ? paramsOrTimeRange.aiHealth || { todayScansCount: 12450, avgLatencyMs: 420, confidenceRate: 94.2, pendingQueueCount: 18, urgentReportCount: 3 }
    : legacyAiHealth || { todayScansCount: 12450, avgLatencyMs: 420, confidenceRate: 94.2, pendingQueueCount: 18, urgentReportCount: 3 };
  const economyState = isObjectParam
    ? paramsOrTimeRange.economyState || {
        coins: { faucet: 1280000, sink: 892000 },
        streakMetrics: { avgStreakDays: 14.2, streaksOver7Days: 8420, streaksOver30Days: 1920, pendingRecoveryRequests: 12 },
        guardrails: { status: 'healthy' as const, violationsDetected: 0 },
      }
    : legacyEconomyState || {
        coins: { faucet: 1280000, sink: 892000 },
        streakMetrics: { avgStreakDays: 14.2, streaksOver7Days: 8420, streaksOver30Days: 1920, pendingRecoveryRequests: 12 },
        guardrails: { status: 'healthy' as const, violationsDetected: 0 },
      };
  const infraServices = isObjectParam
    ? paramsOrTimeRange.infraServices || DEFAULT_INFRA_SERVICES
    : legacyInfraServices || DEFAULT_INFRA_SERVICES;

  // 1. Metric Ribbon Calculations
  const totalCatalogWords = vocabularyList && vocabularyList.length > 0 ? vocabularyList.length : 3420;
  const publishedCount = 2840;
  const inReviewCount = 380;
  const draftCount = 160;
  const archivedCount = 40;

  const ribbonCards: MetricRibbonCard[] = [
    {
      id: 'metric-learners',
      title: 'LEARNERS (DAU / MAU)',
      value: '14,820',
      subValue: 'MAU: 86.4k',
      changeText: '+12.4% tuần này',
      changePositive: true,
      statusTheme: 'primary',
      sparkline: [12100, 12800, 13400, 13100, 14200, 14500, 14820],
      deepLinkNav: 'learners',
      deepLinkTip: 'Xem danh sách 86.4k người học',
    },
    {
      id: 'metric-content',
      title: 'CONTENT POOL',
      value: `${totalCatalogWords.toLocaleString('vi-VN')} từ`,
      subValue: `${inReviewCount} chờ duyệt`,
      changeText: '+48 từ mới hôm nay',
      changePositive: true,
      statusTheme: 'info',
      sparkline: [3280, 3310, 3340, 3370, 3390, 3410, 3420],
      deepLinkNav: 'content-studio',
      deepLinkTip: 'Mở Content Studio duyệt 380 từ',
    },
    {
      id: 'metric-ai-scan',
      title: 'AI SCAN ENGINE',
      value: `${(aiHealth.todayScansCount / 1000).toFixed(1)}k scan`,
      subValue: `Queue: ${aiHealth.pendingQueueCount} | P1: ${aiHealth.urgentReportCount}`,
      changeText: `${aiHealth.confidenceRate}% tin cậy cao`,
      changePositive: true,
      statusTheme: 'snapy',
      sparkline: [8900, 9400, 10200, 11100, 11800, 12100, 12450],
      deepLinkNav: 'ai-queue',
      deepLinkTip: 'Xử lý 18 ảnh chờ duyệt trong Review Queue',
    },
    {
      id: 'metric-economy',
      title: 'LIVEOPS COINS',
      value: '+1.28M / -892k',
      subValue: 'Lưu thông ròng: +388k',
      changeText: 'Tỷ lệ F/S: 1.43x (Cân bằng)',
      changePositive: true,
      statusTheme: 'reward',
      sparkline: [1.1, 1.15, 1.2, 1.18, 1.24, 1.26, 1.28],
      deepLinkNav: 'shop',
      deepLinkTip: 'Kiểm tra cân đối kinh tế Coins & Shop',
    },
    {
      id: 'metric-storage',
      title: 'R2 / S3 STORAGE',
      value: '42.6 GB',
      subValue: 'Hạn mức: 100 GB',
      changeText: '42.6% sử dụng',
      changePositive: true,
      statusTheme: 'primary',
      sparkline: [36.2, 37.8, 39.1, 40.4, 41.2, 42.0, 42.6],
      deepLinkNav: 'settings',
      deepLinkTip: 'Xem chi tiết lưu trữ Cloudflare R2',
    },
  ];

  // 2. Content Pipeline Projection
  const cefrLevels: ContentPipelineProjection['byCefr'] = [
    { level: 'A1', count: 980, ttsPercent: 100, mediaPercent: 96, color: '#047857' },
    { level: 'A2', count: 820, ttsPercent: 98, mediaPercent: 92, color: '#0F766E' },
    { level: 'B1', count: 710, ttsPercent: 95, mediaPercent: 88, color: '#B45309' },
    { level: 'B2', count: 490, ttsPercent: 92, mediaPercent: 80, color: '#C2410C' },
    { level: 'C1', count: 280, ttsPercent: 88, mediaPercent: 74, color: '#6D28D9' },
    { level: 'C2', count: 140, ttsPercent: 82, mediaPercent: 65, color: '#BE123C' },
  ];

  const contentPipeline: ContentPipelineProjection = {
    totalWords: totalCatalogWords,
    byStatus: {
      draft: draftCount,
      review: inReviewCount,
      published: publishedCount,
      archived: archivedCount,
    },
    byCefr: cefrLevels,
    bySource: [
      { label: 'Từ điển Oxford (DICT)', value: 2120, color: '#58CC02' },
      { label: 'Camera Scan (SCAN)', value: 820, color: '#FF8A00' },
      { label: 'AI Generated (AI)', value: 480, color: '#1CB0F6' },
    ],
  };

  // 3. AI Scan Projection
  const aiScan: AIScanProjection = {
    todayScans: aiHealth.todayScansCount,
    avgLatencyMs: aiHealth.avgLatencyMs,
    confidenceRate: aiHealth.confidenceRate,
    pendingQueueCount: aiHealth.pendingQueueCount,
    urgentReportCount: aiHealth.urgentReportCount,
    hourlyPoints: [
      { label: '06:00', value: 340 },
      { label: '08:00', value: 1250 },
      { label: '10:00', value: 1890 },
      { label: '12:00', value: 2100 },
      { label: '14:00', value: 1740 },
      { label: '16:00', value: 1980 },
      { label: '18:00', value: 2450 },
      { label: '20:00', value: 2890 },
    ],
  };

  // 4. Learner Activity Projection (Time range sensitive)
  const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
  const trendSeries =
    timeRange === 'today'
      ? [
          { label: '00h', value: 420 },
          { label: '04h', value: 180 },
          { label: '08h', value: 2450, subValue: 'Cao điểm buổi sáng' },
          { label: '12h', value: 3820, subValue: 'Giờ nghỉ trưa' },
          { label: '16h', value: 2900 },
          { label: '20h', value: 5200, subValue: 'Đỉnh học tối' },
          { label: '23h', value: 1850 },
        ]
      : timeRange === '7d'
      ? [
          { label: 'T2 (04/09)', value: 12800, subValue: 'Flashcards: 84k' },
          { label: 'T3 (05/09)', value: 13200, subValue: 'Flashcards: 89k' },
          { label: 'T4 (06/09)', value: 13650, subValue: 'Flashcards: 92k' },
          { label: 'T5 (07/09)', value: 13100, subValue: 'Flashcards: 88k' },
          { label: 'T6 (08/09)', value: 14100, subValue: 'Flashcards: 96k' },
          { label: 'T7 (09/09)', value: 14500, subValue: 'Flashcards: 104k' },
          { label: 'CN (10/09)', value: 14820, subValue: 'Flashcards: 112k' },
        ]
      : Array.from({ length: 15 }, (_, i) => ({
          label: `${i * 2 + 1}/08`,
          value: Math.round(9500 + i * 360 + Math.sin(i) * 600),
          subValue: `Active: ${(9.5 + i * 0.36).toFixed(1)}k`,
        }));

  const learnerActivity: LearnerActivityProjection = {
    currentDau: 14820,
    currentMau: 86400,
    retention7dRate: 68.4,
    flashcardsReviewedToday: 112450,
    trendSeries,
  };

  // 5. LiveOps Projection (Coins-only Economy)
  const faucetVal = economyState.coins?.faucet || 1280000;
  const sinkVal = economyState.coins?.sink || 892000;
  const netCirculation = faucetVal - sinkVal;
  const faucetSinkRatio = Number((faucetVal / (sinkVal || 1)).toFixed(2));
  const absorptionRate = Number(((sinkVal / (faucetVal || 1)) * 100).toFixed(1));

  const liveops: LiveOpsProjection = {
    coins: {
      faucet: faucetVal,
      sink: sinkVal,
      netCirculation,
      faucetSinkRatio,
      absorptionRate,
    },
    streak: {
      avgDays: economyState.streakMetrics.avgStreakDays,
      over7Days: economyState.streakMetrics.streaksOver7Days,
      over30Days: economyState.streakMetrics.streaksOver30Days,
      recoveryPending: economyState.streakMetrics.pendingRecoveryRequests,
    },
    guardrails: {
      status: economyState.guardrails.status,
      violations: economyState.guardrails.violationsDetected,
    },
  };

  // 6. Recent Audit Trail
  const auditTrail: AuditEventProjection[] = [
    {
      id: 'aud-live-01',
      timestamp: '10:24:12',
      operator: 'Admin Lead',
      action: 'PUBLISH_WORD',
      target: 'resilient (C1)',
      reason: 'Phê duyệt từ vựng sau khi kiểm tra phiên âm IPA và audio TTS',
      type: 'status_change',
    },
    {
      id: 'aud-live-02',
      timestamp: '09:58:40',
      operator: 'Operator Trang',
      action: 'AI_LABEL_CORRECTION',
      target: 'thermos (B1)',
      reason: 'Sửa nhãn scan từ coffee cup sang thermos theo báo cáo P1',
      type: 'ai_correction',
    },
    {
      id: 'aud-live-03',
      timestamp: '09:15:00',
      operator: 'System (Batch)',
      action: 'CSV_IMPORT_TOPIC',
      target: 'Kitchen & Daily Life (+45 từ)',
      reason: 'Nhập bộ từ vựng chủ đề đồ dùng nhà bếp chuẩn CEFR A2',
      type: 'import',
    },
    {
      id: 'aud-live-04',
      timestamp: '08:42:18',
      operator: 'Admin Lead',
      action: 'REVISE_MEANING',
      target: 'curious (A2)',
      reason: 'Bổ sung ví dụ ngữ cảnh song ngữ Anh - Việt theo feedback',
      type: 'status_change',
    },
  ];

  // 7. Structured Infrastructure Health Calculation
  const onlineCount = infraServices.filter((s) => s.status === 'online').length;
  const degradedCount = infraServices.filter((s) => s.status === 'degraded').length;
  const offlineCount = infraServices.filter((s) => s.status === 'offline').length;

  let overallStatus: 'healthy' | 'degraded' | 'outage' = 'healthy';
  if (offlineCount > 0) {
    overallStatus = 'outage';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  }

  const detailText =
    overallStatus === 'healthy'
      ? `${onlineCount}/${infraServices.length} dịch vụ trực tuyến ổn định`
      : overallStatus === 'degraded'
      ? `${onlineCount} trực tuyến · ${degradedCount} chậm (degraded)`
      : `${offlineCount} dịch vụ gặp sự cố gián đoạn (outage)`;

  const infraHealthSummary: InfraHealthSummary = {
    overallStatus,
    onlineCount,
    degradedCount,
    offlineCount,
    detailText,
  };

  // 8. Structured Operational Action Items (Sorted by Severity & SLA)
  const actionItems: OperationalActionItem[] = [];

  // P1: Urgent AI Scan False Detection Reports
  if (aiHealth.urgentReportCount > 0) {
    actionItems.push({
      id: 'act-p1-scan',
      priority: 'P1',
      severity: 'critical',
      title: `${aiHealth.urgentReportCount} Báo cáo Lỗi Scan (P1)`,
      description: 'Người học báo cáo sai nhãn camera scan vật thể, cần kiểm tra và cập nhật nhãn',
      count: aiHealth.urgentReportCount,
      oldestItemAt: '10:15',
      slaDeadlineAt: '12:00 (SLA < 2h)',
      slaState: 'breached',
      targetNav: 'reports',
      actionLabel: 'Xử lý báo cáo',
    });
  }

  // P2: Pending AI Scan Review Queue (Low confidence)
  if (aiHealth.pendingQueueCount > 0) {
    actionItems.push({
      id: 'act-queue-review',
      priority: 'P2',
      severity: 'warning',
      title: `${aiHealth.pendingQueueCount} Ảnh Chờ Duyệt (Review Queue)`,
      description: 'Ảnh camera nhận diện dưới ngưỡng tự động (< 85%) cần operator xác nhận nhãn',
      count: aiHealth.pendingQueueCount,
      oldestItemAt: '09:30',
      slaDeadlineAt: '14:00 (SLA < 4h)',
      slaState: 'at-risk',
      targetNav: 'ai-queue',
      actionLabel: 'Kiểm tra hàng đợi',
    });
  }

  // Content Review Backlog
  if (inReviewCount > 0) {
    actionItems.push({
      id: 'act-content-review',
      severity: 'info',
      title: `${inReviewCount} Từ Vựng Chờ Xuất Bản`,
      description: 'Từ vựng mới từ Content Studio chờ kiểm tra phiên âm IPA và audio TTS',
      count: inReviewCount,
      slaState: 'within',
      targetNav: 'content-studio',
      actionLabel: 'Duyệt từ vựng',
    });
  }

  // Economy Guardrail Alerts (if any)
  if (economyState.guardrails.violationsDetected > 0 || economyState.guardrails.status !== 'healthy') {
    actionItems.push({
      id: 'act-guardrail-alert',
      severity: economyState.guardrails.status === 'breached' ? 'critical' : 'warning',
      title: `${economyState.guardrails.violationsDetected} Vi Phạm Guardrail Kinh Tế`,
      description: 'Dòng lưu thông Coins hoặc yêu cầu khôi phục Streak vượt ngưỡng an toàn',
      count: economyState.guardrails.violationsDetected,
      slaState: economyState.guardrails.status === 'breached' ? 'breached' : 'at-risk',
      targetNav: 'shop',
      actionLabel: 'Kiểm tra kinh tế',
    });
  }

  // Infra outage / degraded alert
  if (overallStatus !== 'healthy') {
    actionItems.push({
      id: 'act-infra-status',
      severity: overallStatus === 'outage' ? 'critical' : 'warning',
      title: overallStatus === 'outage' ? 'Sự Cố Dịch Vụ Hạ Tầng (Outage)' : 'Cảnh Báo Hạ Tầng Chậm (Degraded)',
      description: detailText,
      count: offlineCount || degradedCount,
      slaState: overallStatus === 'outage' ? 'breached' : 'at-risk',
      targetNav: 'activity-log',
      actionLabel: 'Xem nhật ký hạ tầng',
    });
  }

  // Priority sorting: critical > warning > info, breached > at-risk > within
  const severityRank: Record<OperationalActionItem['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const slaRank: Record<OperationalActionItem['slaState'], number> = {
    breached: 0,
    'at-risk': 1,
    within: 2,
  };

  actionItems.sort((a, b) => {
    const sevDiff = severityRank[a.severity] - severityRank[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return slaRank[a.slaState] - slaRank[b.slaState];
  });

  return {
    timeRange,
    lastUpdated: refreshedAt,
    actionItems,
    infraHealthSummary,
    metrics: ribbonCards,
    contentPipeline,
    aiScan,
    learnerActivity,
    liveops,
    auditTrail,
    infraServices,
    r2Storage: {
      usedGb: 42.6,
      quotaGb: 100,
    },
  };
}
