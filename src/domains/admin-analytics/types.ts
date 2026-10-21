/**
 * Proposed contract for the Analytics screen (admin_product_review_2026-10-19 §3.2, analytics_ui.md).
 * Backend implementation spec, with the source and formula of every field: docs/sa/admin_analytics_backend.md.
 * NOT implemented on the backend yet: dev/demo builds run on fixtures (api.ts).
 *
 *   GET /api/admin/analytics?days=7|30|90 → AdminAnalytics
 *
 * Every daily series has `days` points ending today (Asia/Ho_Chi_Minh, oldest first). Totals cover the same window,
 * except `retention`, which is fixed (8 sign-up weeks, all-time streaks) and ignores `days`.
 */
import type { ScanErrorCode } from '../admin-learners/types';

export type AnalyticsDays = 7 | 30 | 90;

export interface AdminAnalytics {
  generatedAt: string;
  days: AnalyticsDays;
  learning: {
    /**
     * fsrs_records.state of every reviewed card (any collection), now; `new` also counts own saved words never reviewed.
     * mastered = REVIEW with stability ≥ 21 (ProgressService.MASTERED_STABILITY). dueToday = due ≤ now, as the app's dueCount.
     */
    cards: { new: number; learning: number; relearning: number; review: number; mastered: number; suspended: number; dueToday: number };
    daily: { date: string; reviews: number; newWords: number; quizAnswers: number; quizCorrect: number }[];
    /** quiz_questions.outcome (CORRECT / INCORRECT) per system child topic. */
    topics: { collectionId: number; rootId: number; rootName: string; topicId: number; name: string; answers: number; correct: number; learners: number }[];
    /** Words with the most INCORRECT answers in the window; lapses = sum of fsrs_records.lapses now (all-time, not windowed). */
    hardWords: { word: string; collectionId: number; rootId: number; topicId: number; topicName: string; answers: number; wrong: number; lapses: number; learners: number }[];
  };
  retention: {
    /** Denominator for every count below: accounts with status ACTIVE or BANNED. */
    activated: number;
    /** Sign-up week (users.created_at, weeks start Monday), oldest first. active[w] = learners of the cohort who studied in week w after sign-up. */
    cohorts: { weekStart: string; size: number; active: number[] }[];
    /** longestReached[d - 1] = learners whose longest_streak_days ≥ d, d = 1…30. */
    longestReached: number[];
    /** Segments by rule (analytics_ui.md §2.2), counted now. */
    segments: { id: SegmentId; count: number }[];
  };
  economy: {
    daily: { date: string; coinIn: number; coinOut: number }[];
    /** MISSION_REWARD per mission template code, item fallback Coin included. */
    inByMission: { code: string; coin: number }[];
    /** ADMIN_ADJUSTMENT total. No API writes it yet (OQ-ADS-07, FUTURE), so it stays 0. */
    adjustments: number;
    /** SHOP_PURCHASE per item code in this window and the previous one of the same length. Items not listed sold nothing. */
    sales: { code: string; purchases: number; coin: number; prevPurchases: number }[];
    /** Sum of wallet balances of activated learners, now. */
    circulation: number;
  };
  scan: {
    config: { workers: number; queueCapacity: number; quotaPerDay: number; minReliability: 'LOW' | 'MEDIUM' | 'HIGH' };
    /** Model of the latest finished scan in the window; null when none finished. */
    modelVersion: string | null;
    daily: { date: string; done: number; failed: number }[];
    /**
     * submitted = scan_requests; done = DONE; withLabels = detection_count > 0; withWord = ≥ 1 label has a dictionary entry;
     * saved = learner saved ≥ 1 word from it, null until saved words record their source scan (OQ-ANL-02).
     */
    funnel: { submitted: number; done: number; withLabels: number; withWord: number; saved: number | null };
    /** Detections by reliability bucket (ai-service reliability_by_source). There is no confidence %. */
    reliability: { HIGH: number; MEDIUM: number; LOW: number };
    /** started_at → finished_at of DONE scans; null when none finished in the window. */
    latency: { p50Ms: number | null; p95Ms: number | null; p99Ms: number | null };
    errors: { code: ScanErrorCode; count: number }[];
    /** Learners refused at least once with QUOTA_EXCEEDED. */
    quotaHitLearners: number;
    unmappedLabels: { label: string; scans: number; learners: number; lastSeen: string }[];
  };
}

export type SegmentId = 'STREAK_AT_RISK' | 'IDLE_8_30' | 'NEVER_STUDIED' | 'PENDING_EMAIL';
