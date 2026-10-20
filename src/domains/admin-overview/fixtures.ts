/**
 * Labelled sample data for the Dashboard's MOCK blocks while GET /api/admin/overview does not exist.
 * Deterministic and tied to the other fixtures: learner counts and balances come from the Learners fixtures,
 * mission codes from MissionCatalogSeeder, item codes from shop_items, error codes from ScanErrorCode,
 * scan config from application.yaml.
 * ponytail: fixture-only; delete with the flag once the endpoint ships.
 */
import { FIXTURE_NOW, fixtureList } from '../admin-learners/fixtures';
import type { AdminOverview, ScanErrorCode } from './types';

const DAY = 86_400_000;
const DAYS = 14;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** yyyy-mm-dd in UTC+7 for `daysAgo` days before the fixture clock. */
function vnDate(daysAgo: number) {
  return new Date(FIXTURE_NOW.getTime() + 7 * 3_600_000 - daysAgo * DAY).toISOString().slice(0, 10);
}

/** Share of failed scans per code (QUOTA_EXCEEDED is refused before a scan exists, so it is counted apart). */
const ERROR_MIX: [ScanErrorCode, number][] = [['AI_QUEUE_FULL', 0.4], ['AI_TIMEOUT', 0.2], ['INVALID_IMAGE', 0.15], ['AI_UNAVAILABLE', 0.1], ['AI_ERROR', 0.1], ['INTERRUPTED', 0.05]];

export async function fixtureOverview(): Promise<AdminOverview> {
  const { data: rows, summary } = await fixtureList({ size: 100 });
  const r = rng(2026_10_19);
  const dayStart = new Date(`${vnDate(0)}T00:00:00+07:00`).getTime();
  const activated = rows.filter((l) => l.status !== 'PENDING');
  const activeToday = rows.filter((l) => l.lastStudiedAt && new Date(l.lastStudiedAt).getTime() >= dayStart).length;

  // Today is a partial day (09:30), so its bars sit lower than full days.
  const learnersDaily = Array.from({ length: DAYS }, (_, i) => {
    const ago = DAYS - 1 - i;
    return { date: vnDate(ago), active: ago === 0 ? activeToday : Math.round(summary.active7d * (0.5 + r() * 0.25)) };
  });
  const scanDaily = Array.from({ length: DAYS }, (_, i) => {
    const ago = DAYS - 1 - i;
    const total = ago === 0 ? 31 : Math.round(24 + r() * 22);
    const failed = ago === 0 ? 3 : Math.floor(r() * 3);
    return { date: vnDate(ago), done: total - failed, failed };
  });
  const failed7d = scanDaily.slice(-7).reduce((s, d) => s + d.failed, 0);
  let left = failed7d;
  const errors7d = ERROR_MIX.map(([code, share], i) => {
    const count = i === ERROR_MIX.length - 1 ? left : Math.min(left, Math.round(failed7d * share));
    left -= count;
    return { code, count };
  }).filter((e) => e.count > 0);

  const economyDaily = learnersDaily.map((d) => ({
    date: d.date,
    coinIn: d.active * Math.round(38 + r() * 14),
    coinOut: Math.round(r() * 3) * 100 + (r() < 0.35 ? 350 : 0),
  }));

  return {
    generatedAt: FIXTURE_NOW.toISOString(),
    learners: {
      activated: activated.length,
      active7d: summary.active7d,
      activeToday,
      daily: learnersDaily,
      today: { newWords: 64, reviews: 212, quizzes: 23, missionsCompleted: 41, fullSets: 5 },
    },
    scan: {
      config: { workers: 1, queueCapacity: 3, quotaPerDay: 20, minReliability: 'LOW' as const },
      today: { total: 31, failed: 3, p50Ms: 2_400, p95Ms: 6_800, queueFull: 2, quotaHit: 1 },
      daily: scanDaily,
      errors7d,
    },
    unmappedLabels: [
      { label: 'thermos', scans7d: 23, learners: 9 },
      { label: 'power bank', scans7d: 17, learners: 7 },
      { label: 'whiteboard marker', scans7d: 12, learners: 4 },
      { label: 'face mask', scans7d: 9, learners: 6 },
      { label: 'rice cooker', scans7d: 6, learners: 3 },
      { label: 'sticky note', scans7d: 4, learners: 2 },
    ],
    economy: {
      daily: economyDaily,
      avgBalance: Math.round(activated.reduce((s, l) => s + l.coin, 0) / Math.max(1, activated.length)),
    },
    missions: [
      { code: 'ADD_5_WORDS', assigned7d: 128, completed7d: 83 },
      { code: 'QUIZ_SCORE_80', assigned7d: 121, completed7d: 64 },
      { code: 'FINISH_2_SHORT_QUIZZES', assigned7d: 118, completed7d: 77 },
      { code: 'PERFECT_MINI_QUIZ', assigned7d: 117, completed7d: 22 },
      { code: 'KEEP_DAILY_STREAK', assigned7d: 112, completed7d: 104 },
      { code: 'USE_XP_BOOSTER', assigned7d: 9, completed7d: 5 },
      { code: 'BUY_SHOP_ITEM', assigned7d: 16, completed7d: 6 },
    ],
    shopSales30d: [
      { code: 'XP_BOOSTER_X2_30M', purchases: 41 },
      { code: 'FRAME_BRONZE_LEARNER', purchases: 12 },
      { code: 'THEME_MIDNIGHT_NEON', purchases: 7 },
    ],
  };
}
