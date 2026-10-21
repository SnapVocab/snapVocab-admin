import { ApiClientError } from '../../lib/api-client';
import { foldVi } from '../../lib/utils';
import type { AdminLeaderboard, AdminLeaderboardRow, XpSourceType } from './types';

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
export const n = (x: number) => x.toLocaleString('vi-VN');

/**
 * "Cần xem" thresholds (OQ-LB-06: the admin client owns them; leaderboard_ui.md §4). A flag asks an operator to look;
 * it never removes anyone (LB-12). The ceilings follow how XP is earned: a quiz pays 10 XP per correct answer
 * (≤ 200 for 20 questions, ×2 under Booster), a card's first review of the day pays 2.
 */
export const ANOMALY = {
  /** ≈ 8 perfect 20-question quizzes in one clock hour (4 under Booster). */
  peakHourXp: 1_500,
  /** ≈ 500 first reviews per study day (250 under Booster). */
  reviewXpPerDay: 1_000,
} as const;

export type FlagKey = 'PEAK_HOUR' | 'REVIEW_BURST';
export interface Flag { key: FlagKey; label: string; detail: string }

export function flagsOf(r: AdminLeaderboardRow): Flag[] {
  const flags: Flag[] = [];
  if (r.peakHourXp >= ANOMALY.peakHourXp) {
    flags.push({ key: 'PEAK_HOUR', label: 'Nhiều XP trong một giờ', detail: `${n(r.peakHourXp)} XP trong một giờ (ngưỡng ${n(ANOMALY.peakHourXp)})` });
  }
  const perDay = r.activeDays ? Math.round(r.reviewXp / r.activeDays) : 0;
  if (perDay >= ANOMALY.reviewXpPerDay) {
    flags.push({ key: 'REVIEW_BURST', label: 'Ôn thẻ dồn dập', detail: `${n(perDay)} XP ôn thẻ mỗi ngày học (ngưỡng ${n(ANOMALY.reviewXpPerDay)})` });
  }
  return flags;
}

/**
 * XP needed to pass the nearest higher score group, and that group's rank (LB-07); null at rank 1.
 * `rows` is the whole board in LB-04 order: the lowest row of the group above sits at index rank − 2 (§3.3).
 */
export function gapAbove(rows: AdminLeaderboardRow[], row: AdminLeaderboardRow): { xp: number; rank: number } | null {
  if (row.rank === 1) return null;
  const above = rows[row.rank - 2];
  return { xp: above.score - row.score + 1, rank: above.rank };
}

export type RowFilter = 'ALL' | 'FLAGGED' | 'TIED' | 'BOOSTER';
export const matchesFilter = (r: AdminLeaderboardRow, f: RowFilter) =>
  f === 'ALL' || (f === 'FLAGGED' ? flagsOf(r).length > 0 : f === 'TIED' ? r.tied : r.bonusXp > 0);

/** Name and email ignore case and accents; a number (with or without #) matches the id exactly. */
export function matchesQuery(r: AdminLeaderboardRow, q: string): boolean {
  const needle = foldVi(q.trim());
  if (!needle) return true;
  if (/^#?\d+$/.test(needle)) return String(r.userId) === needle.replace('#', '');
  return foldVi(r.displayName).includes(needle) || (r.email ?? '').toLowerCase().includes(needle);
}

/** Whole-board counts for the strip; filters never change them. */
export function summarize(b: AdminLeaderboard) {
  const e = b.entries;
  return {
    flagged: e.filter((r) => flagsOf(r).length > 0).length,
    tied: e.filter((r) => r.tied).length,
    booster: e.filter((r) => r.bonusXp > 0).length,
    reviewXp: e.reduce((s, r) => s + r.reviewXp, 0),
    quizXp: e.reduce((s, r) => s + r.quizXp, 0),
    bonusXp: e.reduce((s, r) => s + r.bonusXp, 0),
    top: e[0]?.score ?? 0,
  };
}

function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
}

/** Participants per XP band of a round width; the long tail, where flags usually sit, stays visible as its own columns. */
export function xpBands(rows: AdminLeaderboardRow[], target = 8): { from: number; to: number; count: number; flagged: number }[] {
  const max = rows[0]?.score ?? 0;
  if (!max) return [];
  const step = Math.max(1, niceStep(max / target));
  const bands = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => ({ from: i * step, to: (i + 1) * step, count: 0, flagged: 0 }));
  for (const r of rows) {
    const band = bands[Math.floor(r.score / step)];
    band.count++;
    if (flagsOf(r).length) band.flagged++;
  }
  return bands;
}

/** Days of the week the board covers so far: Monday = 1; a closed week = 7. */
export function daysCovered(b: AdminLeaderboard): number {
  const start = Date.parse(`${b.weekStart}T00:00:00+07:00`);
  return Math.min(7, Math.max(1, Math.floor((Date.parse(b.asOf) - start) / DAY) + 1));
}

/** How many participants studied on exactly 1, 2, … `days` days. */
export const activeDayCounts = (rows: AdminLeaderboardRow[], days: number) =>
  Array.from({ length: days }, (_, i) => rows.filter((r) => r.activeDays === i + 1).length);

/** "Còn 4 ngày 9 giờ" until the week closes. */
export function timeLeft(endsAt: string, now: number): string {
  const ms = Date.parse(endsAt) - now;
  if (ms <= 0) return 'Đang chốt';
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MINUTE);
  return d ? `Còn ${d} ngày ${h} giờ` : h ? `Còn ${h} giờ ${m} phút` : `Còn ${Math.max(1, m)} phút`;
}

/** Clock parts in Vietnam (UTC+7, no DST), built by hand so every browser prints "19/10", not its locale's "19-10". */
function vnParts(iso: string) {
  const d = new Date(Date.parse(iso) + 7 * HOUR);
  const p = (x: number) => String(x).padStart(2, '0');
  return { hm: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`, dm: `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}`, ymd: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
}
export const vnTime = (iso: string) => vnParts(iso).hm;
export const vnDayTime = (iso: string) => `${vnParts(iso).hm} ${vnParts(iso).dm}`;
const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
export const weekRange = (b: Pick<AdminLeaderboard, 'weekStart' | 'weekEnd'>) => `${ddmm(b.weekStart)} – ${ddmm(b.weekEnd)}`;

const WEEKDAY = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
/** When a learner reached their score: "Hôm nay 08:42" on the snapshot's day, "Thứ 3 21:17" earlier in the week. */
export function reachedLabel(iso: string, asOf: string): string {
  const at = vnParts(iso);
  return at.ymd === vnParts(asOf).ymd ? `Hôm nay ${at.hm}` : `${WEEKDAY[at.weekday]} ${at.hm}`;
}

const SOURCE_WORD: Record<XpSourceType, string> = {
  FLASHCARD_REVIEW: 'ôn thẻ', QUIZ: 'quiz', MISSION_REWARD: 'nhiệm vụ', SAVE_WORD: 'lưu từ', ADMIN_ADJUSTMENT: 'điều chỉnh của admin',
};

/** The scoring rule in operator words, from the sources the backend actually counts (LB-01, OQ-LB-01). */
export function scoringRule(counted: XpSourceType[]): string {
  const words = counted.map((s) => SOURCE_WORD[s]);
  const list = words.length > 1 ? `${words.slice(0, -1).join(', ')} và ${words[words.length - 1]}` : words[0] ?? '';
  return `XP tuần là XP ${list}, gồm cả phần Booster${counted.includes('MISSION_REWARD') ? '' : '; không tính XP nhiệm vụ'}. Tuần tính từ 00:00 Thứ Hai, giờ Việt Nam.`;
}

export type LearnerViewLine = { row: AdminLeaderboardRow; me: boolean } | 'gap';

/**
 * What one learner sees on the app (MH-GAME-01, §6.3), condensed: the top three, then the row above theirs and their
 * own row (sticky on the app) when they are lower down.
 */
export function learnerView(rows: AdminLeaderboardRow[], userId: number): LearnerViewLine[] {
  const i = rows.findIndex((r) => r.userId === userId);
  const shown = i < 5 ? rows.slice(0, Math.max(3, i + 1)) : [...rows.slice(0, 3), null, rows[i - 1], rows[i]];
  return shown.map((row) => (row ? { row, me: row.userId === userId } : 'gap'));
}

export function leaderboardErrorDetail(e: unknown): string | undefined {
  if (!(e instanceof ApiClientError)) return undefined;
  if (e.statusCode === 404) return 'Máy chủ này chưa có API bảng xếp hạng.';
  if (e.statusCode === 403) return 'Tài khoản không có quyền xem bảng xếp hạng.';
  if (e.statusCode === 0) return 'Không kết nối được máy chủ.';
  return undefined;
}
