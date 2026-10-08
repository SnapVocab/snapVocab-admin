/** AdminBadgeDTO (docs/decisions/badges.md §8.4). P1 is read-only. */
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

export type StatusFilter = 'ALL' | 'ON' | 'OFF';
