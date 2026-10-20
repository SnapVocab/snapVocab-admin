import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openIssues, recentChanges, runChecks, type Check } from '../src/domains/admin-overview/mappers';
import { fixtureOverview } from '../src/domains/admin-overview/fixtures';
import { fixtureList } from '../src/domains/admin-learners/fixtures';
import type { MissionTemplate } from '../src/domains/admin-missions/types';
import type { AdminShopItemDTO } from '../src/domains/shop/types';
import { missionKeys } from '../src/domains/admin-missions/queries';
import { adminShopKeys, CATALOG_PARAMS } from '../src/domains/shop/queries';
import { overviewKeys } from '../src/domains/admin-overview/queries';
import { contentKeys } from '../src/domains/admin-content/queries';
import { DashboardPage } from '../src/features/dashboard/DashboardPage';

const NOW = new Date('2026-10-19T02:30:00Z');
const T0 = '2026-10-01T00:00:00Z';
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

const tpl = (id: number, code: string, extra: Partial<MissionTemplate> = {}): MissionTemplate => ({
  id, code, name: code, description: '', category: 'QUIZ', triggerEvent: 'QUIZ_COMPLETED', minQuizAccuracyPercent: null, quizRequestedCount: 5,
  targetValue: 1, rewardCoin: 15, rewardXp: 30, rewardItemCode: null, rewardItemFallbackCoin: null, weight: 1, eligibilityRule: 'NONE',
  isActive: true, version: 1, createdAt: T0, updatedAt: T0, ...extra,
});
/** Valid catalog shaped like MissionCatalogSeeder: 4 core + 1 slot-5 template, 70 Coin/day. */
const seed = [
  tpl(1, 'ADD_5_WORDS', { category: 'VOCABULARY', triggerEvent: 'TOPIC_ITEM_CREATED', name: 'Góp Nhặt Từ Mới' }),
  tpl(2, 'QUIZ_SCORE_80'), tpl(3, 'FINISH_2_SHORT_QUIZZES'), tpl(4, 'PERFECT_MINI_QUIZ', { name: 'Quiz Ngắn Hoàn Hảo' }),
  tpl(5, 'KEEP_DAILY_STREAK', { category: 'RETENTION', triggerEvent: 'LEARNING_ACTIVITY_RECORDED', rewardCoin: 10 }),
];
const item = (id: number, extra: Partial<AdminShopItemDTO> = {}) => ({
  id, version: 1, code: `ITEM_${id}`, type: 'AVATAR_FRAME', behavior: 'EQUIP', name: `Khung ${id}`, status: 'PUBLISHED', purchasable: true,
  price: 500 + id * 50, availableFrom: null, availableUntil: null, publishedAt: T0, createdAt: T0, updatedAt: T0, ...extra,
}) as AdminShopItemDTO;
const shop = [item(1), item(2), item(3)];
const issue = (checks: Check[], id: string) => checks.find((c) => c.id === id)!.issue;

test('O1. healthy real catalogs pass every NOW rule, and each rule is listed', () => {
  const checks = runChecks({ missions: seed, shop, now: NOW });
  assert.deepEqual(checks.map((c) => c.id), ['mission-invariant', 'mission-reward-item', 'mission-budget', 'shop-ending', 'shop-price', 'shop-stale-draft']);
  assert.ok(checks.every((c) => c.scope === 'NOW' && c.issue === null));
  // A source that has not loaded contributes no rule (no false "all clear" for it).
  assert.deepEqual(runChecks({ shop, now: NOW }).map((c) => c.area), ['SHOP', 'SHOP', 'SHOP']);
});

test('O2. mission catalog: invariant, reward item status, Coin/day budget', () => {
  assert.equal(issue(runChecks({ missions: seed.slice(1), now: NOW }), 'mission-invariant')!.severity, 'danger');
  assert.match(issue(runChecks({ missions: seed.map((t) => ({ ...t, isActive: false })), now: NOW }), 'mission-invariant')!.title, /Chưa kích hoạt/);

  const withReward = (code: string, isActive = true) => [...seed, tpl(6, 'BUY_SHOP_ITEM', { category: 'SHOP', triggerEvent: 'SHOP_ITEM_PURCHASED', eligibilityRule: 'HAS_PURCHASABLE_ITEM', rewardItemCode: code, rewardItemFallbackCoin: 20, isActive })];
  const catalog = [...shop, item(7, { status: 'DRAFT' }), item(8, { status: 'ARCHIVED' })];
  const missing = issue(runChecks({ missions: withReward('NOPE'), shop: catalog, now: NOW }), 'mission-reward-item')!;
  assert.equal(missing.severity, 'danger');
  assert.equal(missing.path, '/missions/6');
  assert.match(missing.detail, /không tồn tại/);
  assert.match(issue(runChecks({ missions: withReward('ITEM_7'), shop: catalog, now: NOW }), 'mission-reward-item')!.detail, /Coin dự phòng/);
  assert.equal(issue(runChecks({ missions: withReward('ITEM_8'), shop: catalog, now: NOW }), 'mission-reward-item')!.severity, 'info');
  assert.equal(issue(runChecks({ missions: withReward('ITEM_1'), shop: catalog, now: NOW }), 'mission-reward-item'), null);
  assert.equal(issue(runChecks({ missions: withReward('NOPE', false), shop: catalog, now: NOW }), 'mission-reward-item'), null);

  const rich = seed.map((t) => ({ ...t, rewardCoin: 40 }));
  assert.match(issue(runChecks({ missions: rich, now: NOW }), 'mission-budget')!.title, /200 Coin/);
});

test('O3. shop: ending soon, off-band price, stale drafts', () => {
  const ending = runChecks({ shop: [...shop, item(4, { availableUntil: at(1) }), item(5, { availableUntil: at(5) }), item(6, { availableUntil: at(-1) })], now: NOW });
  const e = issue(ending, 'shop-ending')!;
  assert.match(e.title, /^2 vật phẩm/); // the ended one is not "ending soon"
  assert.equal(e.severity, 'warning'); // the soonest ends within 2 days
  assert.equal(issue(runChecks({ shop: [...shop, item(5, { availableUntil: at(5) })], now: NOW }), 'shop-ending')!.path, '/shop/5');

  const price = issue(runChecks({ shop: [...shop, item(9, { price: 5000 })], now: NOW }), 'shop-price')!;
  assert.match(price.detail, /Khung 9: 5000 Coin, cao/);
  assert.equal(price.path, '/shop/9');

  const drafts = runChecks({ shop: [...shop, item(10, { status: 'DRAFT', updatedAt: at(-20) }), item(11, { status: 'DRAFT', updatedAt: at(-3) })], now: NOW });
  assert.equal(issue(drafts, 'shop-stale-draft')!.path, '/shop/10');
});

test('O4. overview fixture agrees with the Learners fixture and drives the MOCK rules', async () => {
  const o = await fixtureOverview();
  const { summary } = await fixtureList({ size: 100 });
  assert.equal(o.learners.activated, summary.total - summary.pending);
  assert.equal(o.learners.active7d, summary.active7d);
  assert.ok(o.learners.activeToday <= o.learners.active7d);
  for (const series of [o.learners.daily, o.scan.daily, o.economy.daily]) assert.equal(series.length, 14);
  assert.equal(o.scan.daily.at(-1)!.done + o.scan.daily.at(-1)!.failed, o.scan.today.total);
  assert.equal(o.scan.errors7d.reduce((s, e) => s + e.count, 0), o.scan.daily.slice(-7).reduce((s, d) => s + d.failed, 0));

  const checks = runChecks({ missions: seed, shop, overview: o, now: NOW });
  const open = openIssues(checks);
  assert.deepEqual(open.map((c) => c.id).sort(), ['mission-completion', 'scan-errors', 'scan-queue', 'scan-unmapped']);
  assert.ok(open.every((c) => c.scope === 'MOCK'));
  assert.equal(issue(checks, 'scan-p95'), null);
  const low = issue(checks, 'mission-completion')!;
  assert.match(low.detail, /Quiz Ngắn Hoàn Hảo: 18,8% \(22\/117\)/);
  assert.equal(low.path, '/missions/4');
  assert.match(issue(checks, 'scan-unmapped')!.title, /^3 nhãn/);
});

test('O5. open issues: most severe first, real before sample at the same severity', () => {
  const c = (id: string, scope: 'NOW' | 'MOCK', severity: 'danger' | 'warning' | 'info' | null): Check =>
    ({ id, area: 'SHOP', scope, rule: id, issue: severity && { severity, title: id, detail: '', cta: '', path: '/' } });
  const sorted = openIssues([c('a', 'MOCK', 'info'), c('b', 'MOCK', 'warning'), c('ok', 'NOW', null), c('d', 'NOW', 'warning'), c('e', 'NOW', 'danger')]);
  assert.deepEqual(sorted.map((x) => x.id), ['e', 'd', 'b', 'a']);
});

test('O6. recent changes: newest first; "edited" only when it is later than the last lifecycle step', () => {
  const events = recentChanges(
    [item(1, { createdAt: at(-5), publishedAt: at(-4), updatedAt: at(-4) }), item(2, { status: 'DRAFT', publishedAt: null, createdAt: at(-3), updatedAt: at(-1) })],
    [tpl(4, 'Q', { createdAt: at(-9), updatedAt: at(-2), version: 3 })],
  );
  assert.deepEqual(events.map((e) => `${e.code}:${e.event}`), ['ITEM_2:Sửa gần nhất', 'Q:Sửa gần nhất', 'ITEM_2:Tạo bản nháp', 'ITEM_1:Phát hành', 'ITEM_1:Tạo bản nháp', 'Q:Tạo mẫu']);
  assert.equal(events[1].path, '/missions/4');
  assert.equal(recentChanges(shop, seed, 3).length, 3);
});

test('O7. page renders every layer from cached data, marks sample-data alerts, shows no raw codes or out-of-scope concepts', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(missionKeys.list, seed);
  client.setQueryData(adminShopKeys.list(CATALOG_PARAMS), { data: shop, meta: { page: 0, size: 100, total: 3, pages: 1 } });
  client.setQueryData(overviewKeys.all, await fixtureOverview());
  client.setQueryData(contentKeys.collections, [{ id: 1, name: 'Oxford 3000', translation: null, type: 'SYSTEM', ownerId: null, createdAt: T0, updatedAt: T0 }]);
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(DashboardPage)));
  for (const s of ['Cần xử lý', 'Quy tắc đã kiểm', 'Vận hành scan', 'Nhãn chưa có từ', 'Nhịp học', 'Nhiệm vụ hằng ngày', 'Kinh tế Coin', 'Cửa hàng', 'Thay đổi gần đây', '1 collection']) {
    assert.ok(html.includes(s), s);
  }
  // Alerts computed from sample data say so on the row (an operator could act on them); rules list marks them too.
  assert.ok(html.includes(' · dữ liệu mẫu'), 'sample-data alert marker');
  assert.ok(html.includes('(mẫu)'), 'sample-data rule marker');
  for (const s of ['CEFR', 'SLA', 'Gems', 'League', 'Streak Freeze', 'R2', 'Snapshot']) assert.ok(!html.includes(s), s);
  // design.md §3.7: enums and spec references never show as visible text.
  for (const s of ['>AI_QUEUE_FULL<', 'AI_QUEUE_FULL)', 'invariant', 'design.md', 'MISSION_REWARD', 'ADMIN_ADJUSTMENT']) assert.ok(!html.includes(s), s);
  // Label → word mapping is not built: no button may promise it.
  assert.ok(!html.includes('Gán nhãn'), 'no fake mapping action');
});
