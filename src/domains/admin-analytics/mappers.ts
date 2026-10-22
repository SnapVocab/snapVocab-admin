/**
 * Analytics: pure derivations behind each chart's conclusion and action (admin_product_review_2026-10-19 §3.2).
 * Tested in tests/admin-analytics.test.ts.
 */
import type { AdminShopItemDTO, ShopItemType } from '../shop/types';
import { deriveSaleState, type DerivedSaleState } from '../shop/mappers';
import type { MissionTemplate } from '../admin-missions/types';
import type { AdminAnalytics } from './types';

/**
 * Reading aids, not product rules (design.md P7).
 * ponytail: fixed numbers; the PO sets the real ones (analytics_ui.md OQ-ANL-01) and they move to the API.
 */
export const ANALYTICS_THRESHOLDS = {
  /** "≥ vài trăm người học" before retention percentages mean anything (review §3.2). */
  minRetentionN: 200,
  /** A topic is "khó" below this quiz accuracy… */
  hardTopicRate: 0.6,
  /** …once it has at least this many answers; fewer answers are shown as "mẫu nhỏ". */
  minAnswers: 20,
};

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const ratio = (a: number, b: number) => (b ? a / b : 0);

/* ── Học tập ─────────────────────────────────────────────────────────────── */

/**
 * FSRS states in the order a card moves through them; SUSPENDED is reported apart. Colors run gray → green with
 * progress; only "Học lại" (forgotten) stands out. `code` is the fsrs_records.state the row counts, for tooltips.
 */
export const CARD_STATES = [
  { key: 'new', label: 'Mới', rule: 'Chưa ôn lần nào', code: 'NEW', color: '#D1D5DB' },
  { key: 'learning', label: 'Đang học', rule: 'Đang qua các bước học đầu', code: 'LEARNING', color: '#C2EE96' },
  { key: 'relearning', label: 'Học lại', rule: 'Vừa quên, đang học lại', code: 'RELEARNING', color: '#F59E0B' },
  { key: 'review', label: 'Ôn tập', rule: 'Đang ôn, độ ổn định dưới 21 ngày', code: 'REVIEW', color: '#7DD634' },
  { key: 'mastered', label: 'Thành thạo', rule: 'Đang ôn, độ ổn định từ 21 ngày', code: 'REVIEW', color: '#3C8C00' },
] as const;

export function cardBreakdown(cards: AdminAnalytics['learning']['cards']) {
  const total = sum(CARD_STATES.map((s) => cards[s.key])) + cards.suspended;
  return { total, rows: CARD_STATES.map((s) => ({ ...s, count: cards[s.key], share: ratio(cards[s.key], total) })) };
}

type TopicStat = AdminAnalytics['learning']['topics'][number];
export interface TopicRow extends TopicStat { accuracy: number; small: boolean; hard: boolean; path: string }

/** Child topics, hardest first. Small samples sort last: their accuracy is noise. */
export function topicAccuracy(topics: TopicStat[]): TopicRow[] {
  return topics
    .map((t) => {
      const accuracy = ratio(t.correct, t.answers);
      const small = t.answers < ANALYTICS_THRESHOLDS.minAnswers;
      return { ...t, accuracy, small, hard: !small && accuracy < ANALYTICS_THRESHOLDS.hardTopicRate, path: `/topics/${t.collectionId}/${t.rootId}/${t.topicId}` };
    })
    .sort((a, b) => Number(a.small) - Number(b.small) || a.accuracy - b.accuracy);
}

/** Root topics (the "Vocabulary" collection groups by part of speech), hardest first. */
export function rootAccuracy(topics: TopicStat[]) {
  const rows = topicAccuracy(topics);
  const roots = new Map<number, { rootId: number; rootName: string; collectionId: number; answers: number; correct: number; topics: number; hard: number }>();
  for (const t of rows) {
    const r = roots.get(t.rootId) ?? { rootId: t.rootId, rootName: t.rootName, collectionId: t.collectionId, answers: 0, correct: 0, topics: 0, hard: 0 };
    r.answers += t.answers; r.correct += t.correct; r.topics++; if (t.hard) r.hard++;
    roots.set(t.rootId, r);
  }
  return [...roots.values()]
    .map((r) => ({ ...r, accuracy: ratio(r.correct, r.answers), path: `/topics/${r.collectionId}/${r.rootId}` }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/* ── Giữ chân ────────────────────────────────────────────────────────────── */

export const isSmallSample = (activated: number) => activated < ANALYTICS_THRESHOLDS.minRetentionN;

/** Learners still studying w weeks after sign-up, summed over the cohorts old enough to have week w. */
export function cohortWeek(cohorts: AdminAnalytics['retention']['cohorts'], w: number) {
  const old = cohorts.filter((c) => c.active.length > w);
  return { active: sum(old.map((c) => c.active[w])), size: sum(old.map((c) => c.size)) };
}

/** Biggest loss between streak day d and d + 1 (longestReached[d - 1] → longestReached[d]). */
export function streakDrop(longestReached: number[]) {
  let best = { from: 1, lost: 0 };
  for (let d = 1; d < longestReached.length; d++) {
    const lost = longestReached[d - 1] - longestReached[d];
    if (lost > best.lost) best = { from: d, lost };
  }
  return best;
}

/* ── Kinh tế ─────────────────────────────────────────────────────────────── */

/** Reading band of spent / earned Coin. ponytail: 50% / 90% are a reading aid, not a PO rule (OQ-ANL-01). */
export const COIN_BAND = { low: 0.5, high: 0.9 };

/** Share of earned Coin that learners spend, and where it sits against COIN_BAND. States the fact, gives no advice. */
export function coinVerdict(coinIn: number, coinOut: number) {
  const r = ratio(coinOut, coinIn);
  const p = `${(r * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
  if (r < COIN_BAND.low) return { ratio: r, state: 'surplus' as const, label: 'Dư Coin', text: `Coin đang dư: người học chỉ tiêu ${p} số Coin nhận được.` };
  if (r > COIN_BAND.high) return { ratio: r, state: 'short' as const, label: 'Thiếu Coin', text: `Coin đang thiếu: người học tiêu ${p} số Coin nhận được.` };
  return { ratio: r, state: 'balanced' as const, label: 'Cân bằng', text: `Vào/ra cân bằng: người học tiêu ${p} số Coin nhận được.` };
}

export function missionIncome(templates: MissionTemplate[] | undefined, inByMission: AdminAnalytics['economy']['inByMission']) {
  const total = sum(inByMission.map((m) => m.coin));
  return inByMission
    .map((m) => {
      const t = templates?.find((x) => x.code === m.code);
      return { code: m.code, name: t?.name ?? m.code, id: t?.id, coin: m.coin, share: ratio(m.coin, total) };
    })
    .sort((a, b) => b.coin - a.coin);
}

/** Purchases vs the previous window of the same length; 'none' = no purchase in either. */
export type Trend = 'up' | 'down' | 'flat' | 'new' | 'none';
export interface ItemRow { item: AdminShopItemDTO; sale: DerivedSaleState; purchases: number; coin: number; share: number; trend: Trend; unsold: boolean }

/**
 * Every item that is on sale or sold something in the window, biggest Coin sink first.
 * Shares use all purchase Coin, so a sold item missing from the catalog still counts in the total.
 */
export function itemPerformance(items: AdminShopItemDTO[], sales: AdminAnalytics['economy']['sales'], now: Date) {
  const totalCoin = sum(sales.map((s) => s.coin));
  const byCode = new Map(sales.map((s) => [s.code, s]));
  const rows: ItemRow[] = items
    .map((item) => {
      const s = byCode.get(item.code);
      const sale = deriveSaleState(item, now);
      const purchases = s?.purchases ?? 0;
      const prev = s?.prevPurchases ?? 0;
      const trend: Trend = !prev ? (purchases ? 'new' : 'none') : purchases > prev * 1.15 ? 'up' : purchases < prev * 0.85 ? 'down' : 'flat';
      return { item, sale, purchases, coin: s?.coin ?? 0, share: ratio(s?.coin ?? 0, totalCoin), trend, unsold: sale.state === 'ON_SALE' && !purchases };
    })
    .filter((r) => r.sale.state === 'ON_SALE' || byCode.has(r.item.code))
    .sort((a, b) => b.coin - a.coin || a.item.name.localeCompare(b.item.name, 'vi'));
  const byType: Record<ShopItemType, number> = { XP_BOOSTER: 0, STREAK_FREEZE: 0, AVATAR_FRAME: 0, THEME: 0 };
  for (const r of rows) byType[r.item.type] += r.coin;
  return { rows, totalCoin, byType, unsold: rows.filter((r) => r.unsold).map((r) => r.item) };
}

/* ── Scan ────────────────────────────────────────────────────────────────── */

const FUNNEL = [
  { key: 'submitted', label: 'Gửi scan', hint: 'Mọi lượt gửi ảnh' },
  { key: 'withLabels', label: 'Có nhãn', hint: 'Xử lý xong và AI tìm thấy ít nhất một vật' },
  { key: 'withWord', label: 'Có từ', hint: 'Ít nhất một nhãn khớp từ trong từ điển' },
  { key: 'saved', label: 'Lưu thành từ học', hint: 'Người học lưu ít nhất một từ từ lượt scan' },
] as const;

/**
 * scan → có nhãn → có từ → lưu (review §3.2). `worst` = step with the lowest conversion from the previous one.
 * A step the server cannot measure yet (null, e.g. "saved") is left out rather than drawn as 0.
 */
export function funnelSteps(f: AdminAnalytics['scan']['funnel']) {
  const known = FUNNEL.filter((s) => f[s.key] !== null);
  const steps = known.map((s, i) => {
    const count = f[s.key] ?? 0;
    const prev = i ? f[known[i - 1].key] ?? 0 : count;
    return { ...s, count, fromStart: ratio(count, f.submitted), fromPrev: ratio(count, prev), lost: prev - count };
  });
  const worst = steps.slice(1).reduce((w, s, i) => (s.fromPrev < steps[w].fromPrev ? i + 1 : w), 1);
  return { steps, worst };
}

/* ── Xuất CSV ────────────────────────────────────────────────────────────── */

/** Shared with Nhật ký hoạt động; lives in lib/utils. */
export { toCsv } from '../../lib/utils';
