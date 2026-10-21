/** AdminBadgeDTO (docs/decisions/badges.md §8.4). P1 reads it; P2 (PATCH, refill estimate) is MOCK until built (config.ts). */
export type BadgeMetric = 'LONGEST_STREAK_DAYS' | 'QUIZ_COMPLETED' | 'PERFECT_QUIZ' | 'DISTINCT_WORDS_ADDED';

export interface AdminBadge {
  id: number;
  code: string;
  name: string;
  description: string;
  /** A metric the admin does not map yet must still render, so this is not narrowed to BadgeMetric. */
  metric: string;
  threshold: number;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  /** Null until the P2 version migration; never display a made-up version. */
  version: number | null;
  /** Null when unsupported; an actual count of zero is distinct from missing data. */
  earnerCount: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Strip filter: all, on, off, or the rows a client-side check flags (catalog.ts `reviewIssues`). */
export type StatusFilter = 'ALL' | 'ON' | 'OFF' | 'ISSUES';

/** P2 PATCH bodies (badges.md §8.4): content and on/off go separately; code, metric and threshold never. */
export interface BadgeContentPatch { version: number; name?: string; description?: string; iconKey?: string; sortOrder?: number }
export interface BadgeActivePatch { version: number; isActive: boolean }

/** PD-BDG-13d: activated accounts at or past the threshold that do not hold the badge yet, when it was counted. */
export interface BadgeRefillEstimate { eligibleCount: number; calculatedAt: string; version: number }

/** Editor draft; sortOrder stays text until it validates. */
export interface BadgeForm { name: string; description: string; iconKey: string; sortOrder: string }
