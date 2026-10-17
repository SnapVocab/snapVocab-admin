// ====================================================
// SNAPVOCAB SETTINGS INITIAL MOCK DATA
// Source of Truth: docs/design/design.md & docs/spec/specs.md
// ====================================================

import {
  SystemSettingsSnapshot,
  AdminOperatorUser,
  RolePermissionRule,
} from './types';

export const INITIAL_ROLE_PERMISSIONS: RolePermissionRule[] = [
  {
    role: 'SUPER_ADMIN',
    roleNameVi: 'Super Administrator',
    description: 'Toàn quyền điều hành hạ tầng, vượt trần guardrails, quản lý bảo mật và phân quyền vai trò.',
    canPublishVocab: true,
    canReviewAiLabels: true,
    canModifyEconomy: true,
    canBanLearners: true,
    canChangeSystemConfig: true,
    canPurgeCache: true,
  },
  {
    role: 'CONTENT_LEAD',
    roleNameVi: 'Trưởng nhóm Nội dung',
    description: 'Chịu trách nhiệm biên tập từ vựng, phê duyệt phát hành thẻ FSM, kiểm định IPA & audio TTS.',
    canPublishVocab: true,
    canReviewAiLabels: true,
    canModifyEconomy: false,
    canBanLearners: false,
    canChangeSystemConfig: false,
    canPurgeCache: false,
  },
  {
    role: 'AI_OPERATOR',
    roleNameVi: 'Chuyên viên AI Vision',
    description: 'Giám sát hàng đợi AI scan camera, sửa nhãn Active Learning dataset và tối ưu ngưỡng nhận diện.',
    canPublishVocab: false,
    canReviewAiLabels: true,
    canModifyEconomy: false,
    canBanLearners: false,
    canChangeSystemConfig: false,
    canPurgeCache: true,
  },
  {
    role: 'LIVEOPS_MANAGER',
    roleNameVi: 'Quản trị viên LiveOps & Kinh tế',
    description: 'Quản lý cửa hàng Shop, trao huy hiệu Badges và giám sát mùa giải Leaderboard.',
    canPublishVocab: false,
    canReviewAiLabels: false,
    canModifyEconomy: true,
    canBanLearners: false,
    canChangeSystemConfig: false,
    canPurgeCache: false,
  },
  {
    role: 'SUPPORT_MODERATOR',
    roleNameVi: 'Hỗ trợ Học viên & CSKH',
    description: 'Tiếp nhận báo cáo sự cố Issue Reports, hỗ trợ khôi phục chuỗi Streak và kiểm duyệt cộng đồng.',
    canPublishVocab: false,
    canReviewAiLabels: false,
    canModifyEconomy: false,
    canBanLearners: true,
    canChangeSystemConfig: false,
    canPurgeCache: false,
  },
];

export const INITIAL_OPERATORS: AdminOperatorUser[] = [
  {
    id: 'OP-01',
    name: 'Đinh Lê Phát (Lead)',
    email: 'phat.dinh@snapvocab.internal',
    role: 'SUPER_ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    twoFactorEnabled: true,
    lastActive: 'Vừa xong',
    ipAddress: '113.161.72.45 (VN)',
    status: 'ACTIVE',
  },
  {
    id: 'OP-02',
    name: 'Sarah Chen (Content Lead)',
    email: 'sarah.chen@snapvocab.internal',
    role: 'CONTENT_LEAD',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    twoFactorEnabled: true,
    lastActive: '12 phút trước',
    ipAddress: '14.162.180.12 (VN)',
    status: 'ACTIVE',
  },
  {
    id: 'OP-03',
    name: 'Minh Quang (AI Vision)',
    email: 'quang.minh@snapvocab.internal',
    role: 'AI_OPERATOR',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    twoFactorEnabled: true,
    lastActive: '45 phút trước',
    ipAddress: '118.69.135.20 (VN)',
    status: 'ACTIVE',
  },
  {
    id: 'OP-04',
    name: 'Elena Rostova (LiveOps)',
    email: 'elena.rostova@snapvocab.internal',
    role: 'LIVEOPS_MANAGER',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    twoFactorEnabled: true,
    lastActive: '2 giờ trước',
    ipAddress: '171.244.14.89 (VN)',
    status: 'ACTIVE',
  },
  {
    id: 'OP-05',
    name: 'Nguyễn Tấn Tài (Support Lead)',
    email: 'tai.nguyen@snapvocab.internal',
    role: 'SUPPORT_MODERATOR',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    twoFactorEnabled: false,
    lastActive: 'Hôm qua',
    ipAddress: '113.161.34.19 (VN)',
    status: 'ACTIVE',
  },
];

export const DEFAULT_SETTINGS: SystemSettingsSnapshot = {
  version: 12,
  updatedAt: '2026-09-10 14:30:00',
  updatedBy: 'Đinh Lê Phát (Super Admin)',

  // 1. AI Vision Pipeline
  aiPipeline: {
    modelName: 'Florence-2-large (F2-v13 Product Mode) + SAM (ViT-H) + CLIP (ViT-B/32)',
    internalEndpoint: 'http://fastapi-ai.snapvocab.internal:8000/api/v1/scan',
    workerConcurrency: 1, // 1 worker/GPU
    workerTimeoutSeconds: 60, // 60s
    confidenceFloor: 0.65, // 0.65 min
    clipScoreFloor: 0.28, // 0.28 min
    tiledOverlapIou: 0.45,
    dailyScanQuotaFree: 20, // 20 scans/ngày
    dailyScanQuotaPremium: 100, // 100 scans/ngày
    maxQueueDepth: 50,
    maxScanImageSizeMb: 10,
    maxAvatarSizeMb: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    autoRetryFailedJobs: true,
    saveToFineTuningDataset: true,
  },

  // 2. SRS & Learning Parameters
  srsLearning: {
    algorithm: 'FSRS-4.5',
    matureIntervalDays: 21, // >= 21 ngày (specs.md L329)
    maxIntervalDays: 365,
    requestedRetention: 0.90, // 90%
    maxNewCardsPerDay: 20,
    maxReviewsPerDay: 100,
    pushReminderStartHour: 19, // 19h00
    pushReminderEndHour: 21, // 21h00
    pushReminderMaxPerDay: 1,
    ttsDefaultVoice: 'en-US',
    ttsDefaultSpeed: 1.0,
    ttsDefaultPitch: 1.0,
    ttsCloudFallbackUrl: 'https://tts.snapvocab.app/v1/synthesize',
    allowLearnerCustomTemplates: true,
  },

  // 3. LiveOps Guardrails & Economy
  economyGuardrails: {
    maxMissionCoinRewardCap: 1000, // 1,000 Coins (design.md 7.3)
    maxMissionGemRewardCap: 100, // 100 Gems
    superAdminOverrideRequired: true,
    streakFreezeCostCoins: 200,
    maxMonthlyStreakRepairs: 3,
    requireSupportTicketForStreakRecovery: true,
    leaderboardStartDay: '00:00 Thứ Hai',
    leaderboardEndDay: '23:59 Chủ Nhật',
    serverTimezone: 'Asia/Ho_Chi_Minh (UTC+7)',
    diamondTierRewardTop1Coins: 500,
    diamondTierRewardTop1Gems: 50,
    diamondTierRewardTop2Coins: 300,
    diamondTierRewardTop2Gems: 30,
    diamondTierRewardTop3Coins: 150,
    diamondTierRewardTop3Gems: 15,
  },

  // 4. Security & RBAC
  securityAccess: {
    sessionIdleTimeoutMinutes: 60,
    require2FAForAdmin: true,
    requireAuditReasonForFsmChanges: true,
    auditRetentionDays: 365,
    maxFailedLoginAttempts: 5,
    operators: INITIAL_OPERATORS,
    rolePermissions: INITIAL_ROLE_PERMISSIONS,
  },

  // 5. System Maintenance & Storage
  systemMaintenance: {
    minSupportedAppVersion: '1.2.0',
    latestAppVersion: '1.4.2',
    appStoreUrl: 'https://apps.apple.com/app/snapvocab/id6471234567',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=app.snapvocab.learning',
    maintenanceModeActive: false,
    maintenanceMessageVi: 'Hệ thống đang bảo trì định kỳ cụm máy chủ AI. Xin vui lòng quay lại sau 15 phút.',
    storageBucketName: 'snapvocab-media-prod',
    storageCdnDomain: 'https://media.snapvocab.app',
    storageUsedGb: 142.6,
    storageMaxGb: 500,
    lastDictionaryPurgeTime: '2026-09-10 03:00:00 (Hệ thống tự động)',
    lastAiQueuePurgeTime: '2026-09-09 22:15:00',
    lastLeaderboardPurgeTime: '2026-09-08 00:05:00 (Mùa giải tuần 36)',
  },
};
