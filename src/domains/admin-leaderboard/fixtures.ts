/**
 * Labelled sample boards while GET /api/admin/leaderboards is not built (MOCK, config.ts).
 * Learners are the Learners screen's fixtures (same ids, names, emails, statuses), so "Mở hồ sơ" opens their profile.
 * XP follows the real producers (leaderboard_backend.md §3.1): a card's first review of the day pays 2, a quiz pays
 * 10 per correct answer (5/10/20 questions), XP Booster doubles both for 30 minutes. Ranking follows LB-04.
 * Two accounts carry the patterns "Cần xem" looks for; two others tie on purpose.
 * ponytail: fixture-only; delete with the flag once the endpoint ships.
 */
import { FIXTURE_NOW, fixtureLearnerRows, rng } from '../admin-learners/fixtures';
import type { AdminLearnerRow } from '../admin-learners/types';
import type { AdminLeaderboard, AdminLeaderboardRow, LeaderboardWeek } from './types';

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
/** Wednesday 14:20 in Vietnam: mid-week, so the trend (against 00:00 today) and the time left both mean something. */
export const LB_FIXTURE_NOW = new Date('2026-10-21T14:20:12.418+07:00');
const MONDAY = Date.parse('2026-10-19T00:00:00+07:00');
const TODAY = Date.parse('2026-10-21T00:00:00+07:00');

interface Xp { at: number; source: 'FLASHCARD_REVIEW' | 'QUIZ'; amount: number; bonus: number }

/** Builds one learner's XP rows in time order; the Booster window doubles whatever lands inside it. */
function session(start: number, boostMinutes = 0) {
  const rows: Xp[] = [];
  let t = start;
  const boostEnd = start + boostMinutes * MINUTE;
  const add = (source: Xp['source'], base: number) => rows.push({ at: t, source, amount: t < boostEnd ? base * 2 : base, bonus: t < boostEnd ? base : 0 });
  return {
    rows,
    reviews(count: number, r: () => number) { for (let k = 0; k < count; k++) { add('FLASHCARD_REVIEW', 2); t += (6 + Math.floor(r() * 20)) * SECOND; } },
    /** A finished quiz pays 10 XP per correct answer; `gap` minutes after the previous row. */
    quiz(correct: number, gap: number) { t += gap * MINUTE; add('QUIZ', 10 * correct); },
  };
}

const at = (day: number, hour: number, minute = 0) => MONDAY + day * DAY + hour * HOUR + minute * MINUTE;
const recentDays = (row: AdminLearnerRow) => (row.lastStudiedAt ? (FIXTURE_NOW.getTime() - Date.parse(row.lastStudiedAt)) / DAY : Infinity);

/** An ordinary week: most study days are one session of reviews and a quiz or two. */
function ordinaryWeek(row: AdminLearnerRow, monday: number): Xp[] {
  const r = rng(row.id * 7919 + monday / DAY);
  const ago = recentDays(row);
  const chance = row.streakDays > 0 ? 0.8 : ago <= 7 ? 0.45 : ago <= 30 ? 0.12 : row.lastStudiedAt ? 0.04 : 0;
  const boosts = r() < 0.3;
  const rows: Xp[] = [];
  for (let d = 0; d < 7; d++) {
    if (r() >= chance) continue;
    const s = session(monday + d * DAY + (7 + Math.floor(r() * 15)) * HOUR + Math.floor(r() * 60) * MINUTE, boosts && r() < 0.4 ? 30 : 0);
    s.reviews(5 + Math.floor(r() * 40), r);
    for (let q = Math.floor(r() * 3); q > 0; q--) {
      const size = [5, 10, 20][Math.floor(r() * 3)];
      s.quiz(Math.round(size * (0.5 + r() * 0.5)), 2 + Math.floor(r() * 5));
    }
    rows.push(...s.rows);
  }
  return rows;
}

/** This week's special accounts (ids from the Learners fixtures); everyone else gets an ordinary week. */
const SPECIAL: Record<number, (r: () => number) => Xp[]> = {
  // Eleven 20-question quizzes in under an hour on Tuesday night, the first half-hour under Booster.
  126: (r) => {
    const monday = session(at(0, 20, 10)); monday.reviews(24, r); monday.quiz(8, 3);
    const night = session(at(1, 22, 5), 30);
    for (let k = 0; k < 11; k++) night.quiz(18 + (k % 3), k ? 4 : 0); // 20 questions, 18–20 right
    const today = session(at(2, 8, 40)); today.reviews(12, r);
    return [...monday.rows, ...night.rows, ...today.rows];
  },
  // Hundreds of first reviews a day for two days, nothing else.
  143: (r) => {
    const monday = session(at(0, 19, 0)); monday.reviews(650, r);
    const tuesday = session(at(1, 18, 30)); tuesday.reviews(720, r);
    return [...monday.rows, ...tuesday.rows];
  },
  // Same XP as 130, reached earlier: same rank, 117 listed first (LB-04).
  117: () => { const a = session(at(0, 7, 30)); a.reviews(30, () => 0.5); a.quiz(10, 3); a.quiz(10, 4); const b = session(at(1, 12, 0)); b.quiz(15, 2); return [...a.rows, ...b.rows]; },
  130: () => { const a = session(at(0, 9, 0)); a.reviews(30, () => 0.5); a.quiz(10, 3); a.quiz(10, 4); const b = session(at(1, 21, 15)); b.quiz(15, 2); return [...a.rows, ...b.rows]; },
};

type Unranked = Omit<AdminLeaderboardRow, 'rank' | 'tied' | 'rankChange'>;

function aggregate(row: AdminLearnerRow, xp: Xp[]): Unranked | null {
  if (!xp.length) return null;
  const hours = new Map<number, number>();
  const days = new Set<number>();
  let score = 0, reviewXp = 0, quizXp = 0, bonusXp = 0, last = 0;
  for (const e of xp) {
    score += e.amount;
    if (e.source === 'QUIZ') quizXp += e.amount; else reviewXp += e.amount;
    bonusXp += e.bonus;
    last = Math.max(last, e.at);
    // Clock hours in UTC: Vietnam is a whole-hour offset, so they are Vietnam hours too (§3.5).
    hours.set(Math.floor(e.at / HOUR), (hours.get(Math.floor(e.at / HOUR)) ?? 0) + e.amount);
    days.add(Math.floor((e.at + 7 * HOUR) / DAY));
  }
  return {
    userId: row.id, displayName: row.displayName, email: row.email, score, reachedAt: new Date(last).toISOString(),
    reviewXp, quizXp, bonusXp, events: xp.length, activeDays: days.size, peakHourXp: Math.max(...hours.values()),
  };
}

/** LB-04: score desc, then who reached it first, then userId; equal scores share the rank (1, 2, 2, 4). */
function rank(rows: Unranked[]): (Unranked & { rank: number; tied: boolean })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.reachedAt.localeCompare(b.reachedAt) || a.userId - b.userId);
  return sorted.map((r) => ({
    ...r,
    rank: sorted.findIndex((x) => x.score === r.score) + 1,
    tied: sorted.filter((x) => x.score === r.score).length > 1,
  }));
}

const ymd = (ms: number) => new Date(ms + 7 * HOUR).toISOString().slice(0, 10);

function build(week: LeaderboardWeek): AdminLeaderboard {
  // LB-03 and OQ-LB-07: activated, not an admin, not locked.
  const eligible = fixtureLearnerRows().filter((r) => r.status === 'ACTIVE');
  const current = week === 'CURRENT';
  const monday = current ? MONDAY : MONDAY - 7 * DAY;
  const until = current ? LB_FIXTURE_NOW.getTime() : MONDAY;
  const xp = new Map(eligible.map((row) => {
    const special = current ? SPECIAL[row.id] : undefined;
    return [row.id, special ? special(rng(row.id)) : ordinaryWeek(row, monday)] as const;
  }));
  const board = (cutoff: number) => rank(eligible.flatMap((row) => aggregate(row, xp.get(row.id)!.filter((e) => e.at < cutoff)) ?? []));
  // Trend: rank on the board as of 00:00 today (LB-08); none for the previous week.
  const baseline = current ? new Map(board(TODAY).map((r) => [r.userId, r.rank])) : null;
  const entries = board(until).map((r) => ({ ...r, rankChange: baseline?.has(r.userId) ? baseline.get(r.userId)! - r.rank : null }));
  return {
    weekStart: ymd(monday),
    weekEnd: ymd(monday + 6 * DAY),
    timezone: 'Asia/Ho_Chi_Minh',
    endsAt: new Date(monday + 7 * DAY).toISOString(),
    isFinal: !current,
    // The previous week is settled once, two minutes after it closes (LB-09).
    asOf: current ? LB_FIXTURE_NOW.toISOString() : new Date(MONDAY + 2 * MINUTE + 3_120).toISOString(),
    countedSources: ['FLASHCARD_REVIEW', 'QUIZ'],
    eligibleLearners: eligible.length,
    participants: entries.length,
    totalXp: entries.reduce((s, r) => s + r.score, 0),
    entries,
  };
}

const boards = new Map<LeaderboardWeek, AdminLeaderboard>();
export function fixtureBoard(week: LeaderboardWeek): AdminLeaderboard {
  if (!boards.has(week)) boards.set(week, build(week));
  return boards.get(week)!;
}

export const fixtureLeaderboard = (week: LeaderboardWeek): Promise<AdminLeaderboard> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(fixtureBoard(week))), 180));
