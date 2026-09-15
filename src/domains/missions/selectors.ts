import {
  Mission,
  MissionCategory,
  MissionViolation,
  MissionsRibbonMetrics,
  MissionFilterState,
  MissionReward,
  MissionGuardrailConfig,
} from './types';
import { BACKEND_CAPABILITY_REGISTRY } from './capabilities';

export const MANDATORY_SLOT_CATEGORIES: MissionCategory[] = [
  'SCAN_CAPTURE',
  'VOCAB_BUILDING',
  'FLASHCARD_SRS',
  'QUIZ_ACCURACY',
  'RETENTION_GAMIFICATION',
];

export function computeMissionRibbonMetrics(
  missions: Mission[],
  violations: MissionViolation[]
): MissionsRibbonMetrics {
  const activeMissions = missions.filter((m) => m.status === 'active');
  const activeDaily = activeMissions.filter((m) => m.type === 'daily');

  const totalPoolCount = missions.length;
  const activeDailyPoolCount = activeDaily.length;
  const weeklyMilestonesCount = 3; // Chuẩn 3 mốc 3/5/7 stamps (Bronze, Silver, Gold)

  // Đếm số nhóm slot (trong 5 slot) có ít nhất 1 nhiệm vụ active
  const coveredCategories = new Set(
    activeDaily.filter((m) => !m.isBonus).map((m) => m.category)
  );
  const slotCoverageCount = MANDATORY_SLOT_CATEGORIES.filter((cat) =>
    coveredCategories.has(cat)
  ).length;

  const validRateMissions = activeMissions.filter((m) => m.completionRate > 0);
  const avgCompletionRate =
    validRateMissions.length > 0
      ? Number(
          (
            validRateMissions.reduce((acc, m) => acc + m.completionRate, 0) /
            validRateMissions.length
          ).toFixed(1)
        )
      : 0;

  const avgClaimRate =
    validRateMissions.length > 0
      ? Number(
          (
            validRateMissions.reduce((acc, m) => acc + m.claimRate, 0) /
            validRateMissions.length
          ).toFixed(1)
        )
      : 0;

  const unclaimedRiskRate = Math.max(0, Number((avgCompletionRate - avgClaimRate).toFixed(1)));

  // Ước tính faucet 24h dựa trên claim count
  const faucetCoins24h = activeDaily.reduce(
    (acc, m) => acc + (m.reward.coins || 0) * Math.round(m.totalClaimedCount * 0.25),
    48500
  );

  const activeViolations = violations.filter((v) => v.status === 'active');
  const activeViolationsCount = activeViolations.length;

  let guardrailStatus: 'healthy' | 'warning' | 'breached' = 'healthy';
  if (activeViolations.some((v) => v.severity === 'high')) {
    guardrailStatus = 'breached';
  } else if (activeViolationsCount > 0) {
    guardrailStatus = 'warning';
  }

  return {
    totalPoolCount,
    activeDailyPoolCount,
    weeklyMilestonesCount,
    slotCoverageCount,
    avgCompletionRate,
    avgClaimRate,
    unclaimedRiskRate,
    faucetCoins24h,
    guardrailStatus,
    activeViolationsCount,
  };
}

export function filterMissions(
  missions: Mission[],
  filters: MissionFilterState
): Mission[] {
  return missions
    .filter((m) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchTitle = m.title.toLowerCase().includes(query);
        const matchCode = m.code.toLowerCase().includes(query);
        const matchDesc = m.description.toLowerCase().includes(query);
        if (!matchTitle && !matchCode && !matchDesc) return false;
      }

      // 2. Type
      if (filters.type !== 'ALL' && m.type !== filters.type) {
        return false;
      }

      // 3. Category / Slot / Bonus Filter
      if (filters.category !== 'ALL') {
        if (filters.category === 'BONUS') {
          if (!m.isBonus) return false;
        } else if (m.category !== filters.category || m.isBonus) {
          return false;
        }
      }

      // 4. Action Type
      if (filters.actionType !== 'ALL' && m.actionType !== filters.actionType) {
        return false;
      }

      // 5. Status
      if (filters.status !== 'ALL' && m.status !== filters.status) {
        return false;
      }

      // 6. Difficulty
      if (filters.difficulty !== 'ALL' && m.difficulty !== filters.difficulty) {
        return false;
      }

      // 7. Target Audience
      if (
        filters.targetAudience !== 'ALL' &&
        m.targetAudience !== filters.targetAudience &&
        m.targetAudience !== 'all'
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'weight':
          return b.weight - a.weight;
        case 'completion':
          return b.completionRate - a.completionRate;
        case 'reward':
          return (b.reward.coins || 0) - (a.reward.coins || 0);
        case 'newest':
        default:
          return b.id.localeCompare(a.id);
      }
    });
}

export function validateMissionRewardGuardrails(
  reward: MissionReward,
  config: MissionGuardrailConfig
): {
  isValid: boolean;
  issues: string[];
  isCritical: boolean;
} {
  const issues: string[] = [];
  let isCritical = false;

  if (reward.coins > config.maxCoinsCapPerQuest) {
    issues.push(
      `Phần thưởng ${reward.coins.toLocaleString()} Coins vượt trần an toàn (${config.maxCoinsCapPerQuest.toLocaleString()} Coins).`
    );
    isCritical = true;
  }

  if (reward.coins <= 0 && (!reward.xp || reward.xp <= 0)) {
    issues.push('Nhiệm vụ cần có ít nhất phần thưởng XP hoặc Coins lớn hơn 0.');
  }

  return {
    isValid: issues.length === 0,
    issues,
    isCritical,
  };
}

// ----------------------------------------------------
// BF-15A: WORST-CASE DAILY POOL OUTPUT CALCULATION
// Max Output = Sum(Max Coins per 5 mandatory slots) + Max Bonus + Daily Chest
// ----------------------------------------------------

export interface WorstCaseOutputResult {
  mandatoryCoinsMax: number;
  bonusCoinsMax: number;
  chestCoins: number;
  totalWorstCaseCoins: number;
  capLimit: number;
  isExceeded: boolean;
  slotBreakdown: Record<MissionCategory, { highestMissionCode: string; maxCoins: number }>;
}

export function calculateWorstCaseDailyOutput(
  missions: Mission[],
  chestCoins: number,
  capLimit: number
): WorstCaseOutputResult {
  const activeDaily = missions.filter((m) => m.type === 'daily' && m.status === 'active');

  const slotBreakdown: Record<MissionCategory, { highestMissionCode: string; maxCoins: number }> = {
    SCAN_CAPTURE: { highestMissionCode: 'N/A', maxCoins: 0 },
    VOCAB_BUILDING: { highestMissionCode: 'N/A', maxCoins: 0 },
    FLASHCARD_SRS: { highestMissionCode: 'N/A', maxCoins: 0 },
    QUIZ_ACCURACY: { highestMissionCode: 'N/A', maxCoins: 0 },
    RETENTION_GAMIFICATION: { highestMissionCode: 'N/A', maxCoins: 0 },
  };

  for (const cat of MANDATORY_SLOT_CATEGORIES) {
    const slotMissions = activeDaily.filter((m) => m.category === cat && !m.isBonus);
    if (slotMissions.length > 0) {
      const top = [...slotMissions].sort((a, b) => (b.reward.coins || 0) - (a.reward.coins || 0))[0];
      slotBreakdown[cat] = {
        highestMissionCode: top.code,
        maxCoins: top.reward.coins || 0,
      };
    }
  }

  const mandatoryCoinsMax = Object.values(slotBreakdown).reduce(
    (sum, slot) => sum + slot.maxCoins,
    0
  );

  const bonusMissions = activeDaily.filter((m) => m.isBonus);
  const bonusCoinsMax =
    bonusMissions.length > 0
      ? Math.max(...bonusMissions.map((m) => m.reward.coins || 0))
      : 0;

  const totalWorstCaseCoins = mandatoryCoinsMax + bonusCoinsMax + chestCoins;

  return {
    mandatoryCoinsMax,
    bonusCoinsMax,
    chestCoins,
    totalWorstCaseCoins,
    capLimit,
    isExceeded: totalWorstCaseCoins > capLimit,
    slotBreakdown,
  };
}

// ----------------------------------------------------
// BF-15A: MISSION ACTIVATION VALIDATION PIPELINE
// ----------------------------------------------------

export interface ActivationValidationResult {
  canActivate: boolean;
  errors: string[];
  warnings: string[];
  requiresSuperAdminOverride: boolean;
  worstCaseOutput: WorstCaseOutputResult;
}

export function validateMissionActivation(
  targetMission: Mission,
  allMissions: Mission[],
  guardrailConfig: MissionGuardrailConfig,
  dailyChestCoins: number = 200
): ActivationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let requiresSuperAdminOverride = false;

  // 1. Capability Validation
  const capability = BACKEND_CAPABILITY_REGISTRY[targetMission.actionType];
  if (!capability) {
    errors.push(`Hành động "${targetMission.actionType}" chưa được đăng ký trong Backend Capability Registry.`);
  } else {
    if (!capability.allowedEvents.includes(targetMission.triggerEvent)) {
      errors.push(
        `Trigger Event "${targetMission.triggerEvent}" không tương thích với Action "${capability.name}".`
      );
    }
    if (!capability.allowedAggregations.includes(targetMission.aggregationType)) {
      errors.push(
        `Kiểu Aggregation "${targetMission.aggregationType}" không được hỗ trợ cho Action "${capability.name}".`
      );
    }
  }

  // 2. Target Count & Code Validation
  if (targetMission.targetCount <= 0) {
    errors.push('Chỉ tiêu hoàn thành phải lớn hơn 0.');
  }
  if (!targetMission.code.trim()) {
    errors.push('Mã nhiệm vụ không được để trống.');
  }

  // 3. Reward Guardrail Validation
  const rewardCheck = validateMissionRewardGuardrails(targetMission.reward, guardrailConfig);
  if (!rewardCheck.isValid) {
    if (rewardCheck.isCritical) {
      warnings.push(...rewardCheck.issues);
      requiresSuperAdminOverride = true;
    } else {
      errors.push(...rewardCheck.issues);
    }
  }

  // 4. Worst-case Daily Pool Reward Cap Simulation
  // Giả lập pool nếu kích hoạt nhiệm vụ này
  const simulatedPool = allMissions.map((m) =>
    m.id === targetMission.id ? { ...targetMission, status: 'active' as const } : m
  );
  if (!simulatedPool.some((m) => m.id === targetMission.id)) {
    simulatedPool.push({ ...targetMission, status: 'active' as const });
  }

  const worstCase = calculateWorstCaseDailyOutput(
    simulatedPool,
    dailyChestCoins,
    guardrailConfig.maxDailyPoolCoinsOutput
  );

  if (worstCase.isExceeded) {
    errors.push(
      `Tổng thưởng Daily Pool kịch bản xấu nhất (${worstCase.totalWorstCaseCoins.toLocaleString()} Coins) vượt trần quy định (${worstCase.capLimit.toLocaleString()} Coins/ngày).`
    );
  }

  // 5. Mobile Version Check
  if (targetMission.minimumSupportedClientVersion && targetMission.minimumSupportedClientVersion > 'v1.1.0') {
    warnings.push(
      `Nhiệm vụ yêu cầu phiên bản ứng dụng ${targetMission.minimumSupportedClientVersion}. Các học viên dùng app phiên bản cũ sẽ bị ẩn nút Bắt đầu.`
    );
  }

  return {
    canActivate: errors.length === 0,
    errors,
    warnings,
    requiresSuperAdminOverride,
    worstCaseOutput: worstCase,
  };
}

