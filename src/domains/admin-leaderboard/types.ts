/**
 * Admin weekly XP leaderboard: docs/sa/leaderboard_backend.md §7 and Phụ lục B (rev 1.1 adds `rankChange`).
 * NOT implemented on the backend yet: dev/demo builds run on labelled fixtures (config.ts).
 *
 *   GET /api/admin/leaderboards?week=CURRENT|PREVIOUS  → AdminLeaderboard
 *
 * Read-only (LB-12): the whole board of ONE snapshot, the same one learners see. Search and filters run here (KT-07).
 */
export type LeaderboardWeek = 'CURRENT' | 'PREVIOUS';
export type XpSourceType = 'FLASHCARD_REVIEW' | 'QUIZ' | 'SAVE_WORD' | 'MISSION_REWARD' | 'ADMIN_ADJUSTMENT';

export interface AdminLeaderboard {
  /** 'yyyy-MM-dd', Monday and Sunday of the week shown. */
  weekStart: string;
  weekEnd: string;
  timezone: string;
  /** 00:00 Monday after: when the week closes. */
  endsAt: string;
  /** PREVIOUS once it is settled (2 minutes after the close); CURRENT is never final. */
  isFinal: boolean;
  /** When the snapshot was computed; every number below comes from it. */
  asOf: string;
  countedSources: XpSourceType[];
  /** Activated, non-admin accounts (the participation denominator). */
  eligibleLearners: number;
  participants: number;
  totalXp: number;
  /** Everyone on the board, in LB-04 order (score desc, reachedAt asc, userId asc). */
  entries: AdminLeaderboardRow[];
}

export interface AdminLeaderboardRow {
  /** Shared rank: 120, 90, 90, 40 → 1, 2, 2, 4. */
  rank: number;
  tied: boolean;
  userId: number;
  displayName: string;
  email: string | null;
  score: number;
  /** When the learner reached the current score (last counted XP row). */
  reachedAt: string;
  reviewXp: number;
  quizXp: number;
  /** XP Booster's share of the score. */
  bonusXp: number;
  /** Counted XP rows. */
  events: number;
  /** Vietnam days with counted XP. */
  activeDays: number;
  /** Most XP within one clock hour. */
  peakHourXp: number;
  /** Rank at 00:00 today − rank now (> 0 = up). Null for PREVIOUS, on Mondays and for newcomers today (LB-08). */
  rankChange: number | null;
}
