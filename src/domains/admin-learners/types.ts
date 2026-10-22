/**
 * Proposed admin contract for learners (F-ADM-01…03, admin_product_review_2026-10-19 §3.12, §4.2).
 * NOT implemented on the backend yet: the UI runs on fixtures until it is (see config.ts).
 *
 *   GET  /api/admin/users?q=&status=&activity=&sort=&page=&size=  → LearnerListResponse
 *   GET  /api/admin/users/{id}                                     → AdminLearnerDetail
 *   POST /api/admin/users/{id}/ban            { reason }            → AdminLearnerDetail
 *   POST /api/admin/users/{id}/unban          { reason? }           → AdminLearnerDetail
 *   POST /api/admin/users/{id}/password-reset                       → 204 (reset email, F-AUTH-05 flow)
 */

/** Account state. ACTIVE = activated; PENDING = never verified its email; BANNED = locked by an admin. */
export type LearnerStatus = 'ACTIVE' | 'PENDING' | 'BANNED';
/** Activity filter, from `users.last_studied_at`. */
export type LearnerActivity = 'ALL' | 'ACTIVE_7D' | 'DORMANT_30D' | 'NEVER';
export type LearnerSort = 'lastStudied' | 'createdAt' | 'streak' | 'words';

export interface AdminLearnerRow {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: LearnerStatus;
  createdAt: string;
  lastStudiedAt: string | null;
  streakDays: number;
  longestStreakDays: number;
  /** Distinct TopicItems in the learner's own collections. */
  wordsSaved: number;
  coin: number;
  exp: number;
}

export type CoinSource = 'MISSION_REWARD' | 'SHOP_PURCHASE' | 'ADMIN_ADJUSTMENT';
/** Mirrors backend ScanErrorCode. */
export type ScanErrorCode = 'INVALID_IMAGE' | 'QUOTA_EXCEEDED' | 'AI_QUEUE_FULL' | 'AI_UNAVAILABLE' | 'AI_TIMEOUT' | 'AI_ERROR' | 'INTERRUPTED';
export type TimelineKind = 'STUDY' | 'QUIZ' | 'SCAN' | 'MISSION' | 'PURCHASE' | 'BADGE' | 'ACCOUNT';

export interface AdminLearnerDetail extends AdminLearnerRow {
  nativeLanguage: string | null;
  learningLanguage: string | null;
  ban: { reason: string; at: string; by: string } | null;
  /** Learning-state taxonomy derived from FSRS (F-VOCAB-05); read-only — admins never edit progress. */
  progress: { newCount: number; learning: number; reviewing: number; mastered: number; dueToday: number; quizzesCompleted: number; quizAccuracy: number | null };
  /** Learning events per day for the last 30 days, oldest first. */
  activity30d: number[];
  missions7d: { assigned: number; completed: number; claimed: number };
  badges: { code: string; name: string; earnedAt: string }[];
  wallet: { recent: { at: string; amount: number; source: CoinSource; note: string }[] };
  items: { code: string; name: string; type: 'THEME' | 'AVATAR_FRAME' | 'XP_BOOSTER' | 'STREAK_FREEZE'; equipped: boolean; quantity: number }[];
  scans: {
    today: number;
    dailyLimit: number;
    last30d: number;
    failed30d: number;
    recent: { at: string; status: 'DONE' | 'FAILED'; errorCode: ScanErrorCode | null; labels: string[]; savedWords: number }[];
  };
  timeline: { at: string; kind: TimelineKind; text: string }[];
}

export interface LearnerListParams {
  q?: string;
  status?: LearnerStatus | 'ALL';
  activity?: LearnerActivity;
  sort?: LearnerSort;
  page?: number;
  size?: number;
}

export interface LearnerListResponse {
  data: AdminLearnerRow[];
  meta: { page: number; size: number; total: number; pages: number };
  /** Counts over the whole population (ignoring filters), for the summary strip. */
  summary: { total: number; active7d: number; dormant30d: number; never: number; pending: number; banned: number };
}
