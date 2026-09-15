// ====================================================
// SNAPVOCAB MISSIONS & QUESTS DOMAIN CONTRACTS
// Source of Truth: docs/spec/buss_mainflow.md (§BF-12, §BF-15A)
// ====================================================

export type MissionType = 'daily' | 'achievement' | 'special_event';

// 5 Slot Categories bắt buộc cho Daily Pool chuẩn (BF-12A)
export type MissionCategory =
  | 'SCAN_CAPTURE'             // Slot 1: Scan & Capture (AI Camera)
  | 'VOCAB_BUILDING'           // Slot 2: Vocabulary Building (Topics, Decks)
  | 'FLASHCARD_SRS'            // Slot 3: Flashcard & SRS Review
  | 'QUIZ_ACCURACY'            // Slot 4: Quiz & Accuracy Testing
  | 'RETENTION_GAMIFICATION';  // Slot 5: Streak, XP, Shop, Personal Gamification

export type MissionActionType =
  | 'SCAN_OBJECT'       // Quét đồ vật bằng AI Camera (kèm điều kiện lưu từ - F-GAME-11)
  | 'REVIEW_SRS'         // Ôn tập flashcard đến hạn SRS
  | 'LEARN_NEW_WORDS'    // Học từ mới trong Deck/Topic
  | 'QUIZ_PERFECT'       // Hoàn thành Quiz đạt điểm hoặc chuỗi đúng
  | 'MAINTAIN_STREAK'    // Duy trì chuỗi Streak
  | 'EXPLORE_TOPIC'      // Hoàn thành 1 chủ đề từ vựng
  | 'LISTEN_AUDIO';      // Nghe phát âm từ vựng qua TTS/Audio

export type MissionTriggerEvent =
  | 'WORD_SCANNED_AND_SAVED'   // Producer từ AI Scan (BF-06)
  | 'FLASHCARD_REVIEWED'       // Producer từ Flashcard study (BF-08)
  | 'SRS_REVIEW_COMPLETED'     // Producer từ SRS commit (BF-10)
  | 'QUIZ_COMPLETED'           // Producer từ Quiz submit (BF-09)
  | 'STREAK_MAINTAINED'        // Producer từ daily study action (BF-11)
  | 'TOPIC_COMPLETED'          // Producer từ Topic item mastery (BF-07)
  | 'AUDIO_LISTENED';          // Producer từ Audio TTS player (BF-05)

export type MissionAggregationType =
  | 'COUNT'         // Đếm số lần phát sinh event
  | 'SUM'           // Cộng tổng giá trị payload (ví dụ XP, số từ)
  | 'MAX'           // Lấy giá trị lớn nhất đạt được
  | 'STREAK'        // Chuỗi đạt liên tiếp (ví dụ 5 câu trả lời đúng liên tục)
  | 'UNIQUE_COUNT'  // Đếm các phần tử không trùng (ví dụ từ vựng khác nhau)
  | 'PERCENTAGE';   // Đạt tỷ lệ phần trăm (ví dụ accuracy >= 80%)

export type MissionStatus = 'active' | 'draft' | 'scheduled' | 'archived';

export type MissionDifficulty = 'easy' | 'medium' | 'hard';

export type MissionTargetAudience =
  | 'all'
  | 'new_users'
  | 'intermediate'
  | 'advanced'
  | 'at_risk_streak';

export interface MissionReward {
  xp: number;
  coins: number;
  badgeId?: string;
}

export interface CompletionRule {
  minAccuracyPercent?: number;          // Tối thiểu % chính xác (Quiz)
  requireConsecutiveStreak?: number;    // Chuỗi đúng liên tiếp
  requireSavedWord?: boolean;           // Bắt buộc lưu từ hợp lệ (F-GAME-11 cho Scan)
  clearSnapshotOnly?: boolean;          // Chỉ tính item thuộc SRS Snapshot đầu ngày (BF-12A step 10)
  uniqueWordOnly?: boolean;             // Chỉ tính từ vựng không trùng
  requiredTopicId?: string;             // Giới hạn trong chủ đề cụ thể
  customFilterJson?: string;            // Cấu hình mở rộng dạng JSON
}

export interface EligibilityRule {
  minLevel?: number;
  requireDueSrs?: boolean;              // Bắt buộc Review Queue > 0 lúc cấp
  requireFeatureUnlocked?: string;      // Tính năng yêu cầu mở khóa (Shop, Booster...)
  excludeIfCompletedYesterday?: boolean;// Không cấp template trùng ngày hôm trước (AF-12A.5)
}

export interface NavigationParams {
  targetScreen:
    | 'CAMERA_SCAN'
    | 'SRS_REVIEW'
    | 'FLASHCARD_STUDY'
    | 'QUIZ_SETUP'
    | 'TOPIC_EXPLORE'
    | 'STREAK_DETAIL'
    | 'HOME_HUB';
  routeParams?: Record<string, string | number | boolean>;
  fallbackScreen?: string;
  ctaLabel?: string;
}

export interface MissionVersionSnapshot {
  version: number;
  updatedAt: string;
  updatedBy: string;
  auditReason: string;
  changesSummary: string;
}

export interface Mission {
  id: string;
  code: string;                  // e.g. "MS-D-01"
  title: string;
  description: string;
  type: MissionType;
  category: MissionCategory;     // 1 trong 5 slot nhóm hoặc Slot bonus
  actionType: MissionActionType;
  triggerEvent: MissionTriggerEvent;
  aggregationType: MissionAggregationType;
  completionRule: CompletionRule;
  eligibilityRule?: EligibilityRule;
  navigationParams: NavigationParams;
  minimumSupportedClientVersion?: string; // e.g. "v1.0.0"
  targetCount: number;           // Số lượng mục tiêu
  unit: string;                  // "từ", "lượt scan", "thẻ SRS", "ngày", "điểm"
  difficulty: MissionDifficulty;
  reward: MissionReward;
  weight: number;                // 1 - 100 (trọng số xuất hiện trong pool)
  status: MissionStatus;
  targetAudience: MissionTargetAudience;
  isBonus?: boolean;             // Nhiệm vụ thưởng thêm (+1 bonus ngoài 5 mandatory)
  validFrom?: string;
  validTo?: string;
  version: number;               // Template versioning (BF-15A)
  auditNotes?: string;
  changeHistory?: MissionVersionSnapshot[];
  completionRate: number;        // Tỷ lệ hoàn thành (%)
  claimRate: number;             // Tỷ lệ nhận thưởng (%)
  totalCompletedCount: number;
  totalClaimedCount: number;
  lastUpdated: string;
  updatedBy: string;
}

// ----------------------------------------------------
// DAILY CYCLE & CHEST CONFIGURATION CONTRACTS
// ----------------------------------------------------

export interface DailyCycleConfig {
  resetTime: string;             // "00:00"
  timeZone: string;              // "Asia/Ho_Chi_Minh (GMT+7)"
  requiredDailyCount: 5;         // Khóa cứng: Đúng 5 nhiệm vụ bắt buộc (BF-12A)
  maxBonusCount: 1;              // Khóa cứng: Tối đa 1 nhiệm vụ thưởng
  dailyChestReward: {
    coins: number;
    xp: number;
    chestName: string;
  };
  weightedRandomSeed: string;
  autoRefreshPool: boolean;
}

export interface WeeklyStampMilestone {
  stampsRequired: number;        // 3, 5, 7 stamps
  tier: 'bronze' | 'silver' | 'gold';
  chestName: string;
  reward: {
    coins: number;
    xp: number;
    exclusiveItem?: string;      // Tên avatar frame, title, hoặc booster
  };
  icon: string;
}

export interface WeeklyMilestoneConfig {
  cycleName: string;             // "Thứ 2 → Chủ Nhật (GMT+7)"
  totalStampsMax: number;        // 7
  milestones: WeeklyStampMilestone[];
}

// ----------------------------------------------------
// LIVEOPS GUARDRAILS & ANTI-CHEAT CONTRACTS
// ----------------------------------------------------

export interface MissionGuardrailConfig {
  maxCoinsCapPerQuest: number;   // Mặc định 1000 Coins
  maxDailyPoolCoinsOutput: number;// Mặc định 2500 Coins/ngày/học viên
  requireSuperAdminForOverride: boolean; // Bắt buộc Super Admin duyệt ngoại lệ
  antiSpamScanRule: boolean;     // F-GAME-11: Yêu cầu "≥ 1 từ lưu thành công"
  strictIdempotencyKey: boolean; // Chống spam claim kép khi retry
  notifyLearnerBeforeResetHours: number; // Thông báo nhắc claim trước giờ reset (e.g. 2 giờ)
}

export type ViolationSeverity = 'low' | 'medium' | 'high';

export type MissionViolationType =
  | 'COIN_CAP_EXCEEDED'
  | 'DAILY_OUTPUT_SPIKE'
  | 'ANTI_CHEAT_SUSPICION'
  | 'UNCLAIMED_EXPIRY_SPIKE';

export interface MissionViolation {
  id: string;
  missionId: string;
  missionCode: string;
  missionTitle: string;
  severity: ViolationSeverity;
  violationType: MissionViolationType;
  description: string;
  timestamp: string;
  status: 'active' | 'mitigated' | 'whitelisted';
  mitigatedBy?: string;
  reason?: string;
}

// ----------------------------------------------------
// LEARNER SAMPLE & AUDIT PROGRESS CONTRACTS
// ----------------------------------------------------

export interface LearnerMissionProgressSample {
  learnerId: string;
  learnerName: string;
  avatar: string;
  email: string;
  currentStreakDays: number;
  dailyCompleted: number;        // e.g. 5/5
  dailyTotal: number;
  dailyChestClaimed: boolean;
  weeklyStamps: number;          // 0 - 7
  unclaimedCoinsAtRisk: number;  // Số coin đã hoàn thành nhưng chưa claim
  lastActiveTime: string;
  status: 'in_progress' | 'claimed_all' | 'unclaimed_risk' | 'flagged';
  recentEventKey?: string;
}

// ----------------------------------------------------
// UI STATE & NAVIGATION CONTRACTS
// ----------------------------------------------------

export type MissionsTabNavId =
  | 'mission-pool'
  | 'cycle-chests'
  | 'guardrails'
  | 'learner-progress';

export interface MissionFilterState {
  searchQuery: string;
  type: 'ALL' | MissionType;
  category: 'ALL' | MissionCategory | 'BONUS';
  actionType: 'ALL' | MissionActionType;
  status: 'ALL' | MissionStatus;
  difficulty: 'ALL' | MissionDifficulty;
  targetAudience: 'ALL' | MissionTargetAudience;
  sortBy: 'weight' | 'completion' | 'reward' | 'newest';
}

export interface MissionsRibbonMetrics {
  totalPoolCount: number;
  activeDailyPoolCount: number;
  weeklyMilestonesCount: number; // 3 mốc (3/5/7 stamps)
  slotCoverageCount: number;     // Số nhóm slot (1-5) đã có ít nhất 1 active mission
  avgCompletionRate: number;
  avgClaimRate: number;
  unclaimedRiskRate: number;
  faucetCoins24h: number;
  guardrailStatus: 'healthy' | 'warning' | 'breached';
  activeViolationsCount: number;
}

