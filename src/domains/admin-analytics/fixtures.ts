/**
 * Labelled sample data for the Analytics screen while GET /api/admin/analytics does not exist.
 * Deterministic and tied to real data where it can be:
 * - retention, circulation and card totals derive from the Learners fixtures (same 48 learners);
 * - topic ids and names are the local clone's system collection "Vocabulary" (links open the real topic);
 * - mission codes from MissionCatalogSeeder, item codes and prices from shop_items, error codes from ScanErrorCode,
 *   scan config from application.yaml, reliability buckets from ai-service reliability_by_source.
 * ponytail: fixture-only; delete with the flag once the endpoint ships.
 */
import { FIXTURE_NOW, fixtureList } from '../admin-learners/fixtures';
import { activityOf } from '../admin-learners/mappers';
import type { ScanErrorCode } from '../admin-learners/types';
import type { AdminAnalytics, AnalyticsDays } from './types';

const DAY = 86_400_000;
const VN = 7 * 3_600_000;

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

const vnDate = (ms: number) => new Date(ms + VN).toISOString().slice(0, 10);
/** Start (UTC ms) of the VN day `daysAgo` days before the fixture clock. */
const vnDayStart = (daysAgo: number) => new Date(`${vnDate(FIXTURE_NOW.getTime() - daysAgo * DAY)}T00:00:00+07:00`).getTime();

/** Split `total` by weights into integers that add up exactly. */
function split(total: number, weights: number[]) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const out = weights.map((w) => Math.floor((total * w) / sum));
  let left = total - out.reduce((s, x) => s + x, 0);
  for (let i = 0; left > 0; i = (i + 1) % out.length, left--) out[i]++;
  return out;
}

/** System collection 1 "Vocabulary" (local clone): child topic → quiz accuracy per answer. */
const TOPICS: [rootId: number, rootName: string, topicId: number, name: string, accuracy: number, perDay: number][] = [
  [156, 'Phrasal Verb', 167, 'Relationships and Social Life', 0.49, 7],
  [156, 'Phrasal Verb', 164, 'Communication', 0.53, 6],
  [156, 'Phrasal Verb', 163, 'Work Study and Daily Tasks', 0.58, 5],
  [156, 'Phrasal Verb', 170, 'Thinking and Understanding', 0.61, 4],
  [98, 'Preposition', 111, 'Relation and Connection', 0.56, 4],
  [98, 'Preposition', 100, 'Time', 0.66, 3],
  [113, 'Verb', 122, 'Speaking and Sharing Information', 0.71, 9],
  [113, 'Verb', 125, 'Social Life and Relationships', 0.74, 8],
  [113, 'Verb', 124, 'Thinking Knowing and Learning', 0.69, 7],
  [113, 'Verb', 119, 'Giving Taking and Using', 0.77, 6],
  [51, 'Adjective', 61, 'Feelings and Emotions', 0.68, 8],
  [51, 'Adjective', 65, 'Quality and Condition', 0.79, 7],
  [51, 'Adjective', 63, 'Work Study and Daily Life', 0.82, 6],
  [70, 'Adverb', 89, 'Attitude Comment and Evaluation', 0.63, 4],
  [70, 'Adverb', 75, 'Manner', 0.75, 4],
  [18, 'Noun', 37, 'Ideas Knowledge and Information', 0.81, 12],
  [18, 'Noun', 29, 'Communication and Language', 0.84, 10],
  [18, 'Noun', 31, 'Arts Media and Entertainment', 0.88, 9],
];
const HARD_WORDS: [word: string, topicId: number, perWeek: number, wrongRate: number][] = [
  ['put up with', 167, 9, 0.67], ['fall out', 167, 8, 0.63], ['bring up', 164, 8, 0.61], ['regarding', 111, 7, 0.57],
  ['point out', 164, 7, 0.55], ['imply', 122, 8, 0.52], ['apparently', 89, 6, 0.5], ['ashamed', 61, 7, 0.48],
];

const MISSIONS: [code: string, weight: number][] = [
  ['ADD_5_WORDS', 15 * 83], ['QUIZ_SCORE_80', 20 * 64], ['FINISH_2_SHORT_QUIZZES', 15 * 77], ['PERFECT_MINI_QUIZ', 25 * 22],
  ['KEEP_DAILY_STREAK', 10 * 104], ['USE_XP_BOOSTER', 5 * 5], ['BUY_SHOP_ITEM', 5 * 6],
];
/** shop_items code → [price, purchases per 30 days]: learners spend ≈ 40% of what they earn, as on the Dashboard. ON_SALE items missing here sold nothing. */
const SALES: [code: string, price: number, per30: number][] = [
  ['XP_BOOSTER_X2_30M', 100, 24], ['XP_BOOSTER_X2_60M', 180, 7], ['FRAME_BRONZE_LEARNER', 350, 4], ['XP_BOOSTER_AUTUMN_45M', 120, 4],
  ['THEME_MIDNIGHT_NEON', 500, 2], ['THEME_SUNSET_AMBER', 400, 2], ['FRAME_NATURE_EXPLORER', 550, 1], ['FRAME_SILVER_SCHOLAR', 600, 1],
  ['FRAME_FIRE_STREAK', 850, 1],
];
const ERROR_MIX: [ScanErrorCode, number][] = [['AI_QUEUE_FULL', 0.4], ['AI_TIMEOUT', 0.2], ['INVALID_IMAGE', 0.15], ['AI_UNAVAILABLE', 0.1], ['AI_ERROR', 0.1], ['INTERRUPTED', 0.05]];
const UNMAPPED: [label: string, perWeek: number, learners: number, hoursAgo: number][] = [
  ['thermos', 23, 9, 2], ['power bank', 17, 7, 5], ['whiteboard marker', 12, 4, 20], ['face mask', 9, 6, 26], ['rice cooker', 6, 3, 50],
  ['sticky note', 4, 2, 70], ['hand sanitizer', 3, 3, 96], ['extension cord', 2, 2, 130],
];

export async function fixtureAnalytics(days: AnalyticsDays): Promise<AdminAnalytics> {
  const { data: rows } = await fixtureList({ size: 100 });
  const r = rng(2026_10_19 + days);
  const now = FIXTURE_NOW.getTime();
  const activated = rows.filter((l) => l.status !== 'PENDING');
  const scale = days / 30;
  const dates = Array.from({ length: days }, (_, i) => vnDate(now - (days - 1 - i) * DAY));
  // Today stops at the fixture clock (09:30), so its numbers sit lower than full days.
  const dayFactor = (i: number) => (i === days - 1 ? 0.35 : 1);

  /* learning */
  const totalCards = activated.reduce((s, l) => s + l.wordsSaved, 0);
  const [nw, learning, relearning, review, mastered, suspended] = split(totalCards, [34, 9, 3, 38, 15, 1]);
  const learningDaily = dates.map((date, i) => {
    const f = dayFactor(i);
    const quizAnswers = Math.round((90 + r() * 60) * f);
    return { date, reviews: Math.round((180 + r() * 80) * f), newWords: Math.round((50 + r() * 30) * f), quizAnswers, quizCorrect: Math.round(quizAnswers * (0.7 + r() * 0.08)) };
  });
  const topics = TOPICS.map(([rootId, rootName, topicId, name, acc, perDay]) => {
    const answers = Math.max(1, Math.round(perDay * days * (0.85 + r() * 0.3)));
    return { collectionId: 1, rootId, rootName, topicId, name, answers, correct: Math.round(answers * acc), learners: Math.min(activated.length, Math.round(3 + answers / 6)) };
  });
  const topicOf = new Map(TOPICS.map(([rootId, , topicId, name]) => [topicId, { rootId, name }]));
  const hardWords = HARD_WORDS.map(([word, topicId, perWeek, wrongRate]) => {
    const answers = Math.max(1, Math.round((perWeek * days) / 7));
    const t = topicOf.get(topicId)!;
    return { word, collectionId: 1, rootId: t.rootId, topicId, topicName: t.name, answers, wrong: Math.round(answers * wrongRate), lapses: Math.round(answers * wrongRate * 0.4), learners: Math.min(activated.length, Math.round(2 + answers / 3)) };
  });

  /* retention: from the learner rows, so it matches the Learners screen */
  const monday = (ms: number) => {
    const d = new Date(ms + VN);
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(`${new Date(ms + VN - back * DAY).toISOString().slice(0, 10)}T00:00:00+07:00`).getTime();
  };
  const thisWeek = monday(now);
  const rr = rng(8);
  const cohorts = Array.from({ length: 8 }, (_, k) => {
    const start = thisWeek - (7 - k) * 7 * DAY;
    const members = activated.filter((l) => { const c = new Date(l.createdAt).getTime(); return c >= start && c < start + 7 * DAY; });
    const weeks = Math.floor((now - start) / (7 * DAY)) + 1;
    const active = Array.from({ length: weeks }, (_, w) => members.filter((l) => {
      if (!l.lastStudiedAt) return false;
      if (w === 0) return true;
      return new Date(l.lastStudiedAt).getTime() >= start + w * 7 * DAY && rr() < 0.85;
    }).length);
    return { weekStart: vnDate(start), size: members.length, active };
  });
  const longestReached = Array.from({ length: 30 }, (_, d) => activated.filter((l) => l.longestStreakDays >= d + 1).length);
  const todayStart = vnDayStart(0);
  const segments = [
    { id: 'STREAK_AT_RISK' as const, count: activated.filter((l) => l.streakDays >= 3 && l.lastStudiedAt && new Date(l.lastStudiedAt).getTime() < todayStart).length },
    { id: 'IDLE_8_30' as const, count: activated.filter((l) => activityOf(l.lastStudiedAt, FIXTURE_NOW) === 'IDLE').length },
    { id: 'NEVER_STUDIED' as const, count: rows.filter((l) => l.status === 'ACTIVE' && !l.lastStudiedAt).length },
    { id: 'PENDING_EMAIL' as const, count: rows.filter((l) => l.status === 'PENDING').length },
  ];

  /* economy */
  const economyIn = dates.map((_, i) => Math.round((12 + r() * 8) * dayFactor(i)) * Math.round(38 + r() * 14));
  const sales = SALES.map(([code, price, per30]) => {
    const purchases = Math.round(per30 * scale * (0.85 + r() * 0.3));
    return { code, purchases, coin: purchases * price, prevPurchases: Math.round(per30 * scale * (0.7 + r() * 0.6)) };
  }).filter((s) => s.purchases > 0 || s.prevPurchases > 0);
  const coinOutTotal = sales.reduce((s, x) => s + x.coin, 0);
  const economyOut = split(coinOutTotal, dates.map((_, i) => (0.3 + r() * 1.4) * dayFactor(i)));
  const coinInTotal = economyIn.reduce((s, x) => s + x, 0);
  const inSplit = split(coinInTotal, MISSIONS.map(([, w]) => w));

  /* scan */
  const scanDaily = dates.map((date, i) => {
    const total = Math.round((24 + r() * 22) * dayFactor(i));
    const failed = Math.min(total, Math.floor(r() * 3.4));
    return { date, done: total - failed, failed };
  });
  const done = scanDaily.reduce((s, d) => s + d.done, 0);
  const failed = scanDaily.reduce((s, d) => s + d.failed, 0);
  const withLabels = Math.round(done * 0.93);
  const withWord = Math.round(withLabels * 0.78);
  const [high, medium, low] = split(Math.round(withLabels * 3.2), [52, 31, 17]);
  const errorCounts = split(failed, ERROR_MIX.map(([, w]) => w));

  return {
    generatedAt: FIXTURE_NOW.toISOString(),
    days,
    learning: {
      cards: { new: nw, learning, relearning, review, mastered, suspended, dueToday: Math.round(totalCards * 0.11) },
      daily: learningDaily,
      topics,
      hardWords,
    },
    retention: { activated: activated.length, cohorts, longestReached, segments },
    economy: {
      daily: dates.map((date, i) => ({ date, coinIn: economyIn[i], coinOut: economyOut[i] })),
      inByMission: MISSIONS.map(([code], i) => ({ code, coin: inSplit[i] })),
      adjustments: 0,
      sales,
      circulation: activated.reduce((s, l) => s + l.coin, 0),
    },
    scan: {
      config: { workers: 1, queueCapacity: 3, quotaPerDay: 20, minReliability: 'LOW' },
      modelVersion: 'Florence-2-base/od+self+dense+base',
      daily: scanDaily,
      funnel: { submitted: done + failed, done, withLabels, withWord, saved: Math.round(withWord * 0.61) },
      reliability: { HIGH: high, MEDIUM: medium, LOW: low },
      latency: { p50Ms: 2_400, p95Ms: 6_800, p99Ms: 11_200 },
      errors: ERROR_MIX.map(([code], i) => ({ code, count: errorCounts[i] })).filter((e) => e.count > 0),
      quotaHitLearners: Math.min(activated.length, Math.round(days * 0.3)),
      unmappedLabels: UNMAPPED.map(([label, perWeek, learners, hoursAgo]) => ({
        label, scans: Math.max(1, Math.round((perWeek * days) / 7)), learners: Math.min(activated.length, Math.round(learners * Math.max(1, Math.sqrt(days / 7)))),
        lastSeen: new Date(now - hoursAgo * 3_600_000).toISOString(),
      })),
    },
  };
}
