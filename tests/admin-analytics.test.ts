import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fixtureAnalytics } from '../src/domains/admin-analytics/fixtures';
import { fixtureList } from '../src/domains/admin-learners/fixtures';
import {
  cardBreakdown, coinVerdict, cohortWeek, funnelSteps, isSmallSample, itemPerformance, rootAccuracy, streakDrop, sum, toCsv, topicAccuracy,
} from '../src/domains/admin-analytics/mappers';
import type { AdminShopItemDTO } from '../src/domains/shop/types';
import { analyticsKeys } from '../src/domains/admin-analytics/queries';
import { adminShopKeys, CATALOG_PARAMS } from '../src/domains/shop/queries';
import { missionKeys } from '../src/domains/admin-missions/queries';
import { AnalyticsPage } from '../src/features/analytics/AnalyticsPage';

const NOW = new Date('2026-10-19T02:30:00Z');
const T0 = '2026-10-01T00:00:00Z';
const item = (id: number, code: string, extra: Partial<AdminShopItemDTO> = {}) => ({
  id, version: 1, code, type: 'AVATAR_FRAME', behavior: 'EQUIP', name: `Khung ${id}`, status: 'PUBLISHED', purchasable: true,
  price: 500, availableFrom: null, availableUntil: null, publishedAt: T0, createdAt: T0, updatedAt: T0, ...extra,
}) as AdminShopItemDTO;

test('A1. fixtures add up: series follow the period, totals match their breakdowns and the Learners fixtures', async () => {
  const { data: learners } = await fixtureList({ size: 100 });
  const activated = learners.filter((l) => l.status !== 'PENDING');
  for (const days of [7, 30, 90] as const) {
    const a = await fixtureAnalytics(days);
    for (const s of [a.learning.daily, a.economy.daily, a.scan.daily]) assert.equal(s.length, days);
    assert.equal(a.retention.activated, activated.length);
    assert.equal(cardBreakdown(a.learning.cards).total, sum(activated.map((l) => l.wordsSaved)));
    assert.equal(sum(a.economy.daily.map((d) => d.coinOut)), sum(a.economy.sales.map((s) => s.coin)), 'Coin out = purchases');
    assert.equal(sum(a.economy.daily.map((d) => d.coinIn)), sum(a.economy.inByMission.map((m) => m.coin)), 'Coin in = mission rewards');
    assert.equal(a.economy.circulation, sum(activated.map((l) => l.coin)));
    const f = a.scan.funnel;
    assert.ok(f.submitted >= f.done && f.done >= f.withLabels && f.withLabels >= f.withWord && f.withWord >= f.saved, 'funnel never grows');
    assert.equal(sum(a.scan.errors.map((e) => e.count)), f.submitted - f.done);
    assert.ok(sum(a.retention.cohorts.map((c) => c.size)) <= activated.length);
    for (const c of a.retention.cohorts) assert.ok(c.active.every((x) => x <= c.size));
    assert.ok(a.retention.longestReached.every((x, i, xs) => i === 0 || x <= xs[i - 1]), 'longest streak curve never rises');
  }
});

test('A2. funnel: conversions from start and from the previous step; worst step = lowest step conversion', () => {
  const { steps, worst } = funnelSteps({ submitted: 100, done: 95, withLabels: 90, withWord: 45, saved: 40 });
  assert.deepEqual(steps.map((s) => s.count), [100, 90, 45, 40]);
  assert.equal(steps[2].fromPrev, 0.5);
  assert.equal(steps[2].lost, 45);
  assert.equal(steps[3].fromStart, 0.4);
  assert.equal(steps[worst].key, 'withWord');
});

test('A3. Coin verdict bands', () => {
  assert.equal(coinVerdict(1000, 300).state, 'surplus');
  assert.equal(coinVerdict(1000, 700).state, 'balanced');
  assert.equal(coinVerdict(1000, 950).state, 'short');
  assert.equal(coinVerdict(0, 0).ratio, 0);
});

test('A4. item performance: on-sale or sold items only, biggest sink first, unsold flagged, shares over all purchases', () => {
  const shop = [
    item(1, 'A'), item(2, 'B'), item(3, 'UNSOLD'),
    item(4, 'DRAFT_SOLD', { status: 'DRAFT' }), item(5, 'OLD', { status: 'ARCHIVED' }),
  ];
  const sales = [
    { code: 'A', purchases: 2, coin: 1000, prevPurchases: 4 },
    { code: 'B', purchases: 6, coin: 3000, prevPurchases: 2 },
    { code: 'DRAFT_SOLD', purchases: 1, coin: 500, prevPurchases: 0 },
    { code: 'GONE', purchases: 1, coin: 500, prevPurchases: 1 },
  ];
  const p = itemPerformance(shop, sales, NOW);
  assert.deepEqual(p.rows.map((r) => r.item.code), ['B', 'A', 'DRAFT_SOLD', 'UNSOLD']);
  assert.equal(p.totalCoin, 5000);
  assert.equal(p.rows[0].share, 0.6);
  assert.deepEqual(p.rows.map((r) => r.trend), ['up', 'down', 'new', 'none']);
  assert.deepEqual(p.unsold.map((i) => i.code), ['UNSOLD']);
  assert.equal(p.byType.AVATAR_FRAME, 4500);
});

test('A5. topics: hardest first, small samples last and never "khó"; roots aggregate their children', () => {
  const t = (topicId: number, rootId: number, answers: number, correct: number) => ({ collectionId: 1, rootId, rootName: `R${rootId}`, topicId, name: `T${topicId}`, answers, correct, learners: 3 });
  const rows = topicAccuracy([t(1, 10, 100, 80), t(2, 10, 100, 50), t(3, 20, 5, 0), t(4, 20, 40, 30)]);
  assert.deepEqual(rows.map((r) => r.topicId), [2, 4, 1, 3]);
  assert.deepEqual(rows.map((r) => r.hard), [true, false, false, false]);
  assert.equal(rows[3].small, true);
  assert.equal(rows[0].path, '/topics/1/10/2');
  const roots = rootAccuracy([t(1, 10, 100, 80), t(2, 10, 100, 50), t(4, 20, 40, 30)]);
  assert.deepEqual(roots.map((r) => [r.rootId, r.accuracy, r.hard]), [[10, 0.65, 1], [20, 0.75, 0]]);
});

test('A6. retention helpers: small-sample gate, week-N totals over old-enough cohorts, biggest streak drop', () => {
  assert.equal(isSmallSample(44), true);
  assert.equal(isSmallSample(200), false);
  const cohorts = [{ weekStart: '2026-09-01', size: 10, active: [9, 6, 4] }, { weekStart: '2026-09-08', size: 5, active: [5, 2] }, { weekStart: '2026-09-15', size: 4, active: [3] }];
  assert.deepEqual(cohortWeek(cohorts, 1), { active: 8, size: 15 });
  assert.deepEqual(cohortWeek(cohorts, 2), { active: 4, size: 10 });
  assert.deepEqual(streakDrop([40, 35, 20, 18, 18]), { from: 2, lost: 15 });
});

test('A7. CSV quotes every cell, doubles quotes, starts with a BOM', () => {
  assert.equal(toCsv([['a', 'b "c"'], [1, 'x,y']]), '﻿"a","b ""c"""\r\n"1","x,y"');
});

test('A8. every tab renders from cached data: findings sit in the data, rows link out, no advice boxes, no raw codes, no out-of-scope concepts', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(analyticsKeys.byDays(30), await fixtureAnalytics(30));
  client.setQueryData(adminShopKeys.list(CATALOG_PARAMS), { data: [item(1, 'XP_BOOSTER_X2_30M', { type: 'XP_BOOSTER', name: 'Booster x2' }), item(2, 'FRAME_LEGENDARY', { name: 'Khung Huyền Thoại' })], meta: { page: 0, size: 100, total: 2, pages: 1 } });
  client.setQueryData(missionKeys.list, []);
  const render = (sub: string) => renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AnalyticsPage, { sub })));
  const expect: Record<string, string[]> = {
    // Hard words open the Dictionary from the word itself; topics open from their rows.
    learning: ['Trạng thái thẻ', 'Độ chính xác quiz theo nhóm chủ đề', 'Chủ đề khó', 'Từ hay sai và hay quên', 'Phrasal Verb', 'href="/dictionary/', 'href="/topics/'],
    // The biggest streak drop is a computed finding: it must still be on the page.
    retention: ['Mẫu nhỏ', 'Cohort theo tuần đăng ký', 'Chuỗi học đi được bao xa', 'Rơi nhiều nhất', 'Nhóm cần chú ý'],
    // ADMIN_ADJUSTMENT stays reachable for support, as a tooltip only.
    economy: ['Cân bằng Coin', 'Nguồn Coin vào', 'Coin tiêu theo loại vật phẩm', 'Hiệu quả vật phẩm', 'Chưa ai mua', 'Ngày tiêu nhiều nhất', 'title="ADMIN_ADJUSTMENT'],
    // The worst funnel step is marked in the funnel; AI Scan is a plain link (label mapping is not built).
    scan: ['Phễu scan → từ học', 'mất nhiều nhất', 'Độ tin cậy nhãn', 'Thời gian xử lý và lỗi', 'Nhãn chưa có từ', 'Hàng đợi đầy', 'href="/ai-scan"'],
  };
  for (const [tab, strings] of Object.entries(expect)) {
    const html = render(tab);
    for (const s of [...strings, 'Học tập', 'Giữ chân', 'Kinh tế', 'Scan']) assert.ok(html.includes(s), `${tab}: ${s}`);
    for (const s of ['CEFR', 'Leitner', 'Gems', 'Streak Freeze', 'League', 'Doanh thu', 'Gemini', 'GPU', 'R2']) assert.ok(!html.includes(s), `${tab}: ${s}`);
    // design.md §3.7: no appended advice boxes, no fake "map label" action, no enum shown as visible text.
    for (const s of ['Nên làm', 'Chẩn đoán', 'Gán nhãn → từ', 'Gán từ', '>AI_QUEUE_FULL<', '>ADMIN_ADJUSTMENT<', '>MISSION_REWARD<', 'NEW ·']) assert.ok(!html.includes(s), `${tab}: ${s}`);
  }
});
