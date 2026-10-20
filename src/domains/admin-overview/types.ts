/**
 * Proposed contract for the Dashboard's MOCK blocks (admin_product_review_2026-10-19 §6, design.md §4.1 · Dashboard C).
 * NOT implemented on the backend yet: dev/demo builds run on fixtures (api.ts).
 *
 *   GET /api/admin/overview → AdminOverview   (every series: 14 days ending today, Asia/Ho_Chi_Minh, oldest first)
 *
 * Sources once built: users.last_studied_at, learning activity, scan_requests, coin_transactions,
 * user_daily_missions, user_items. "Cần xử lý" for Shop/Missions does not need it: it reads the real catalogs.
 */
import type { ScanErrorCode } from '../admin-learners/types';

export type { ScanErrorCode };

export interface AdminOverview {
  generatedAt: string;
  learners: {
    /** Activated accounts (status ACTIVE or BANNED): the denominator for every "x / N" on the page. */
    activated: number;
    active7d: number;
    activeToday: number;
    daily: { date: string; active: number }[];
    today: { newWords: number; reviews: number; quizzes: number; missionsCompleted: number; fullSets: number };
  };
  scan: {
    /** application.yaml `scan.*` as the server runs it. */
    config: { workers: number; queueCapacity: number; quotaPerDay: number; minReliability: 'LOW' | 'MEDIUM' | 'HIGH' };
    today: { total: number; failed: number; p50Ms: number; p95Ms: number; queueFull: number; quotaHit: number };
    daily: { date: string; done: number; failed: number }[];
    errors7d: { code: ScanErrorCode; count: number }[];
  };
  /** Scan labels with no dictionary word (F-DICT-06), most frequent first. */
  unmappedLabels: { label: string; scans7d: number; learners: number }[];
  economy: {
    /** coin_transactions: in = MISSION_REWARD, out = SHOP_PURCHASE (ADMIN_ADJUSTMENT has no API yet). */
    daily: { date: string; coinIn: number; coinOut: number }[];
    avgBalance: number;
  };
  /** Per mission template code, last 7 days of user_daily_missions. */
  missions: { code: string; assigned7d: number; completed7d: number }[];
  /** Per shop item code, purchases in the last 30 days; items not listed sold nothing. */
  shopSales30d: { code: string; purchases: number }[];
}
