import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  appShelves, conditionLabel, contentPatch, filterGroups, groupCatalog, isKnownEmblem, previewShelf, reviewIssues, ruleSentence,
  statusReason, toForm, validateBadgeForm,
} from '../src/domains/admin-badges/catalog';
import { DATASETS, fixtureBadges, fixturePatchBadge, fixtureRefillEstimate } from '../src/domains/admin-badges/fixtures';
import { fixtureBadgeHolders } from '../src/domains/admin-learners/fixtures';
import { BadgeCatalog } from '../src/features/admin-badges/BadgeCatalog';
import { BadgeEditor } from '../src/features/admin-badges/BadgeEditor';
import { getAdminBadge, getAdminBadges } from '../src/domains/admin-badges/api';
import { ApiClientError } from '../src/lib/api-client';
import type { AdminBadge } from '../src/domains/admin-badges/types';

const seed = DATASETS.seed.items;
const edge = DATASETS.edge.items;
const byCode = (code: string) => edge.find(b => b.code === code)!;
const order = (items = edge) => groupCatalog(items).map(g => g.metric);
const noop = () => {};
const editor = (badge: AdminBadge, all = edge) => renderToStaticMarkup(React.createElement(QueryClientProvider, { client: new QueryClient() },
  React.createElement(BadgeEditor, { badge, all, editable: false, refreshing: false, onRefresh: noop, onBack: noop, onSaved: noop, onToggle: noop, onDirtyChange: noop })));

test('AC-CAT-1/2: series by min(sortOrder) over the whole catalog, milestones by threshold', () => {
  assert.deepEqual(order(seed), ['LONGEST_STREAK_DAYS', 'QUIZ_COMPLETED', 'PERFECT_QUIZ', 'DISTINCT_WORDS_ADDED']);
  // Inactive QUIZ_5 has sortOrder 5, the smallest in the catalog: the admin lists the quiz series first.
  assert.deepEqual(order(), ['QUIZ_COMPLETED', 'LONGEST_STREAK_DAYS', 'PERFECT_QUIZ', 'DISTINCT_WORDS_ADDED', 'SCAN_SAVED']);
  const quiz = groupCatalog(edge)[0];
  assert.deepEqual(quiz.items.map(b => b.threshold), [1, 5, 10, 50]);
  assert.deepEqual([quiz.total, quiz.activeCount], [4, 3]);
});

test('AC-CAT-1: filtering hides groups but never reorders them, and keeps whole-series counts', () => {
  const groups = groupCatalog(edge);
  const full = groups.map(g => g.metric);
  for (const [q, status] of [['', 'OFF'], ['', 'ON'], ['', 'ISSUES'], ['tuyet', 'ALL'], ['quiz_1', 'ALL']] as const) {
    const idx = filterGroups(groups, q, status).map(g => full.indexOf(g.metric));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${q}/${status}`);
  }
  const words = filterGroups(groups, 'THƯ', 'ALL');
  assert.deepEqual(words.map(g => g.metric), ['DISTINCT_WORDS_ADDED']);
  assert.deepEqual(words[0].items.map(b => b.code), ['WORDS_500']);
  assert.equal(words[0].total, 4);
  assert.deepEqual(filterGroups(groups, 'quiz_1', 'ALL')[0].items.map(b => b.code), ['QUIZ_1', 'QUIZ_10']);
  assert.deepEqual(filterGroups(groups, 'zzz', 'ALL'), []);
  // "Cần rà" = the unknown icon (PERFECT_25) and the unmapped metric (SCAN_10).
  assert.deepEqual(filterGroups(groups, '', 'ISSUES').flatMap(g => g.items.map(b => b.code)), ['PERFECT_25', 'SCAN_10']);
});

test('Status reason depends on earners; unknown metric and icon degrade instead of failing', () => {
  assert.equal(statusReason(byCode('QUIZ_10')), null);
  assert.equal(statusReason(byCode('WORDS_250')), 'Người học không thấy huy hiệu này');
  assert.equal(statusReason(byCode('STREAK_14')), 'Ngừng cấp, 340 người đã đạt vẫn thấy');
  assert.equal(statusReason({ ...byCode('WORDS_250'), earnerCount: null }), 'Người đã đạt vẫn thấy; người chưa đạt không thấy');
  assert.equal(conditionLabel(byCode('STREAK_100')), '≥ 100 ngày');
  assert.equal(conditionLabel(byCode('SCAN_10')), '≥ 10');
  assert.equal(ruleSentence(byCode('SCAN_10')), 'SCAN_SAVED ≥ 10');
  assert.equal(ruleSentence(byCode('QUIZ_10')), 'Hoàn thành 10 quiz');
  assert.equal(isKnownEmblem('rocket'), false);
  assert.equal(isKnownEmblem('book-open'), true);
});

test('Cần rà: unknown icon, unmapped metric, and a description that does not state its threshold', () => {
  assert.deepEqual(seed.flatMap(reviewIssues), [], 'the approved seed copy states every threshold');
  assert.match(reviewIssues(byCode('PERFECT_25')).join(), /“rocket”/);
  assert.match(reviewIssues(byCode('SCAN_10')).join(), /SCAN_SAVED/);
  const quiz10 = byCode('QUIZ_10');
  assert.match(reviewIssues({ ...quiz10, description: 'Hoàn thành mười quiz' }).join(), /không nêu ngưỡng 10/);
  assert.match(reviewIssues({ ...quiz10, description: 'Hoàn thành 100 quiz' }).join(), /không nêu ngưỡng 10/, '100 is not 10');
  assert.deepEqual(reviewIssues({ ...quiz10, threshold: 1000, description: 'Hoàn thành 1.000 quiz' }), []);
});

test('Bộ sưu tập: a learner with no badge sees active badges only, in app order', () => {
  const shelves = appShelves(edge);
  assert.deepEqual(shelves.map(g => g.metric), ['LONGEST_STREAK_DAYS', 'QUIZ_COMPLETED', 'PERFECT_QUIZ', 'DISTINCT_WORDS_ADDED']);
  assert.deepEqual(shelves[1].items.map(b => b.code), ['QUIZ_1', 'QUIZ_10', 'QUIZ_50'], 'inactive QUIZ_5 is not on the shelf');
});

test('AC-PRV-1: preview shelf = active milestones of the series + the badge itself, in app order', () => {
  assert.deepEqual(previewShelf(edge, byCode('WORDS_250')).map(b => b.threshold), [10, 100, 250, 500]);
  assert.deepEqual(previewShelf(edge, byCode('WORDS_10')).map(b => b.threshold), [10, 100, 500]);
  assert.deepEqual(previewShelf(edge, byCode('QUIZ_10')).map(b => b.threshold), [1, 10, 50]);
});

test('P2 form: server rules checked first; the patch carries only changed fields and the version read', () => {
  const b = { ...byCode('QUIZ_10'), version: 3 };
  assert.equal(contentPatch(b, toForm(b)), null);
  assert.equal(contentPatch(b, { ...toForm(b), name: `  ${b.name}  ` }), null, 'whitespace alone is not a change');
  assert.deepEqual(contentPatch(b, { ...toForm(b), name: ' Mười Bài Quiz ', sortOrder: '25' }), { version: 3, name: 'Mười Bài Quiz', sortOrder: 25 });
  assert.deepEqual(Object.keys(validateBadgeForm({ name: ' ', description: 'x'.repeat(256), iconKey: 'rocket', sortOrder: '2.5' })).sort(),
    ['description', 'iconKey', 'name', 'sortOrder']);
  assert.deepEqual(validateBadgeForm(toForm(b)), {});
});

test('AC-CAT-4: a catalog without earner counts has no "Đã đạt" column and no grant total', () => {
  const page = renderToStaticMarkup(React.createElement(BadgeCatalog, { all: seed, onOpen: noop, onToggle: noop, onRefresh: noop }));
  assert.doesNotMatch(page, />Đã đạt</);
  assert.doesNotMatch(page, /Lượt đã cấp/);
  assert.equal(page.match(/scope="rowgroup"/g)?.length, 4);
  assert.ok(page.indexOf('Chuỗi ngày học') < page.indexOf('Quiz hoàn thành'));
  assert.doesNotMatch(page, /Dữ liệu mẫu/, 'outside dev the real API needs no sample-data notice');
  // P2 shipped (PATCH /api/admin/badges/{id}): every row can be edited and switched on/off.
  assert.match(page, />Sửa</);
  assert.match(page, />(Bật|Tắt)</);
});

test('P1 editor view hides absent version and displays a real zero version when provided', () => {
  assert.doesNotMatch(editor({ ...byCode('QUIZ_10'), version: null }), /Phiên bản/);
  assert.match(editor({ ...byCode('QUIZ_10'), version: 0 }), /Phiên bản 0/);
  assert.doesNotMatch(editor(byCode('QUIZ_10')), /Lưu thay đổi|Bật huy hiệu|Tắt huy hiệu/);
});

test('AC-PRV-2/3: the editor warns about an unknown icon, a four-milestone shelf, an inactive badge, an unmapped metric', () => {
  assert.match(editor(byCode('PERFECT_25')), /ứng dụng không có biểu tượng “rocket”/);
  assert.match(editor(byCode('PERFECT_25')), /ứng dụng chuyển kệ sang dạng cuộn ngang/);
  assert.match(editor(byCode('WORDS_250')), /Người học chưa đạt hiện không thấy huy hiệu này/);
  assert.doesNotMatch(editor(byCode('QUIZ_10')), /hiện không thấy huy hiệu này/);
  assert.match(editor(byCode('SCAN_10')), /Admin chưa có tên chuỗi, đơn vị và cách đếm cho chỉ số “SCAN_SAVED”/);
});

test('P1 transport reads list and detail through the real Admin envelope, without any writes', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const item = { ...byCode('WORDS_250'), version: null, earnerCount: 0 };
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    assert.equal(init?.method ?? 'GET', 'GET');
    calls.push(String(url));
    return new Response(JSON.stringify({ statusCode: 200, data: String(url).endsWith(`/${item.id}`) ? item : [item] }),
      { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    assert.deepEqual(await getAdminBadges(), [item]);
    assert.deepEqual(await getAdminBadge(item.id), item);
    assert.deepEqual(calls, ['/api/admin/badges', `/api/admin/badges/${item.id}`]);
  } finally { globalThis.fetch = original; }
});

test('MOCK catalog agrees with the Learners samples; PATCH follows the planned server rules', async () => {
  const holders = fixtureBadgeHolders();
  const catalog = await fixtureBadges();
  assert.equal(catalog.length, 13);
  for (const b of catalog) assert.equal(b.earnerCount, holders.filter(h => h.codes.includes(b.code)).length, b.code);

  const quiz25 = catalog.find(b => b.code === 'QUIZ_25')!;
  assert.equal(quiz25.isActive, false);
  const estimate = await fixtureRefillEstimate(quiz25.id);
  assert.equal(estimate.eligibleCount, holders.filter(h => h.activated && h.quizzes >= 25).length);
  assert.ok(estimate.eligibleCount > 0, 'the sample has learners waiting for this milestone');

  const stale = await fixturePatchBadge(quiz25.id, { version: 99, isActive: true }).catch(e => e);
  assert.ok(stale instanceof ApiClientError && stale.code === 'VERSION_CONFLICT' && stale.details?.currentVersion === 0);
  const invalid = await fixturePatchBadge(quiz25.id, { version: 0, iconKey: 'rocket', name: '  ' }).catch(e => e);
  assert.ok(invalid instanceof ApiClientError && invalid.code === 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(invalid.fieldErrors).sort(), ['iconKey', 'name']);
  const on = await fixturePatchBadge(quiz25.id, { version: 0, isActive: true });
  assert.deepEqual([on.isActive, on.version, on.earnerCount], [true, 1, 0], 'switching on grants nobody by itself');
  const renamed = await fixturePatchBadge(quiz25.id, { version: 1, name: '  Hai Lăm Quiz ' });
  assert.deepEqual([renamed.name, renamed.version, renamed.threshold], ['Hai Lăm Quiz', 2, 25]);
  assert.equal((await fixtureBadges()).find(b => b.id === quiz25.id)!.name, 'Hai Lăm Quiz');
});
