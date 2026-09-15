export type DashboardTimeRange = 'today' | '7d' | '30d';

export type StatusTheme = 'primary' | 'snapy' | 'reward' | 'info' | 'danger';

export interface MetricRibbonCard {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  changeText: string;
  changePositive: boolean;
  statusTheme: StatusTheme;
  sparkline: number[];
  deepLinkNav?: string;
  deepLinkTip?: string;
}

export interface CefrLevelMetric {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  count: number;
  ttsPercent: number;
  mediaPercent: number;
  color: string;
}

export interface ContentPipelineProjection {
  totalWords: number;
  byStatus: {
    draft: number;
    review: number;
    published: number;
    archived: number;
  };
  byCefr: CefrLevelMetric[];
  bySource: {
    label: string;
    value: number;
    color: string;
  }[];
}

export interface AIScanProjection {
  todayScans: number;
  avgLatencyMs: number;
  confidenceRate: number;
  pendingQueueCount: number;
  urgentReportCount: number;
  hourlyPoints: { label: string; value: number }[];
}

export interface LearnerActivityProjection {
  currentDau: number;
  currentMau: number;
  retention7dRate: number;
  flashcardsReviewedToday: number;
  trendSeries: {
    label: string;
    value: number;
    subValue?: string;
  }[];
}

export interface LiveOpsProjection {
  coins: {
    faucet: number;
    sink: number;
    netCirculation: number;
    faucetSinkRatio: number;
    absorptionRate: number;
  };
  streak: {
    avgDays: number;
    over7Days: number;
    over30Days: number;
    recoveryPending: number;
  };
  guardrails: {
    status: 'healthy' | 'warning' | 'breached';
    violations: number;
  };
}

export interface AuditEventProjection {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  target: string;
  reason: string;
  type: 'status_change' | 'ai_correction' | 'import' | 'guardrail';
}

export interface InfraServiceHealth {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  detail: string;
}

export interface OperationalActionItem {
  id: string;
  priority?: 'P1' | 'P2';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  oldestItemAt?: string;
  slaDeadlineAt?: string;
  slaState: 'within' | 'at-risk' | 'breached';
  targetNav: string;
  actionLabel: string;
}

export interface InfraHealthSummary {
  overallStatus: 'healthy' | 'degraded' | 'outage';
  onlineCount: number;
  degradedCount: number;
  offlineCount: number;
  detailText: string;
}

export interface DashboardViewModel {
  timeRange: DashboardTimeRange;
  lastUpdated: string;
  actionItems: OperationalActionItem[];
  infraHealthSummary: InfraHealthSummary;
  metrics: MetricRibbonCard[];
  contentPipeline: ContentPipelineProjection;
  aiScan: AIScanProjection;
  learnerActivity: LearnerActivityProjection;
  liveops: LiveOpsProjection;
  auditTrail: AuditEventProjection[];
  infraServices: InfraServiceHealth[];
  r2Storage: {
    usedGb: number;
    quotaGb: number;
  };
}
