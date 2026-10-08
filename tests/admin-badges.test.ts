import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { conditionLabel, filterGroups, groupCatalog, isKnownEmblem, previewShelf, ruleSentence, statusReason } from '../src/domains/admin-badges/catalog';
import { DATASETS } from '../src/domains/admin-badges/fixtures';
import { BadgeCatalog } from '../src/features/admin-badges/BadgeCatalog';
import { BadgeDetail } from '../src/features/admin-badges/BadgeDetail';
import { getAdminBadge, getAdminBadges } from '../src/domains/admin-badges/api';

const seed = DATASETS.seed.items;
const edge = DATASETS.edge.items;
const byCode = (code: string) => edge.find(b => b.code === code)!;
const order = (items = edge) => groupCatalog(items).map(g => g.metric);

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
  for (const [q, status] of [['', 'OFF'], ['', 'ON'], ['tuyet', 'ALL'], ['quiz_1', 'ALL']] as const) {
    const idx = filterGroups(groups, q, status).map(g => full.indexOf(g.metric));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${q}/${status}`);
  }
  const words = filterGroups(groups, 'THƯ', 'ALL');
  assert.deepEqual(words.map(g => g.metric), ['DISTINCT_WORDS_ADDED']);
  assert.deepEqual(words[0].items.map(b => b.code), ['WORDS_500']);
  assert.equal(words[0].total, 4);
  assert.deepEqual(filterGroups(groups, 'quiz_1', 'ALL')[0].items.map(b => b.code), ['QUIZ_1', 'QUIZ_10']);
  assert.deepEqual(filterGroups(groups, 'zzz', 'ALL'), []);
});

test('Status reason depends on earners; unknown metric and icon degrade instead of failing', () => {
  assert.equal(statusReason(byCode('QUIZ_10')), null);
  assert.equal(statusReason(byCode('WORDS_250')), 'Người học không thấy huy hiệu này');
  assert.equal(statusReason(byCode('STREAK_14')), 'Ngừng cấp · 340 người đã đạt vẫn thấy');
  assert.equal(statusReason({ ...byCode('WORDS_250'), earnerCount: null }), 'Người đã đạt vẫn thấy; người chưa đạt không thấy');
  assert.equal(conditionLabel(byCode('STREAK_100')), '≥ 100 ngày');
  assert.equal(conditionLabel(byCode('SCAN_10')), '≥ 10');
  assert.equal(ruleSentence(byCode('SCAN_10')), 'SCAN_SAVED ≥ 10');
  assert.equal(ruleSentence(byCode('QUIZ_10')), 'Hoàn thành 10 quiz');
  assert.equal(isKnownEmblem('rocket'), false);
  assert.equal(isKnownEmblem('book-open'), true);
});

test('AC-PRV-1: preview shelf = active milestones of the series + the badge itself, in app order', () => {
  assert.deepEqual(previewShelf(edge, byCode('WORDS_250')).map(b => b.threshold), [10, 100, 250, 500]);
  assert.deepEqual(previewShelf(edge, byCode('WORDS_10')).map(b => b.threshold), [10, 100, 500]);
  assert.deepEqual(previewShelf(edge, byCode('QUIZ_10')).map(b => b.threshold), [1, 10, 50]);
});

test('AC-CAT-4: the default seed set has no earner counts, so there is no "Đã đạt" column', () => {
  const page = renderToStaticMarkup(React.createElement(BadgeCatalog, { all: seed, onOpen: () => {}, onRefresh: () => {} }));
  assert.doesNotMatch(page, />Đã đạt</);
  assert.equal(page.match(/scope="rowgroup"/g)?.length, 4);
  assert.ok(page.indexOf('Chuỗi ngày học') < page.indexOf('Quiz hoàn thành'));
});

test('P1 detail hides absent version and displays a real zero version when provided', () => {
  const html = (version: number | null) => renderToStaticMarkup(React.createElement(BadgeDetail, {
    badge: { ...byCode('QUIZ_10'), version }, all: edge, onBack: () => {},
  }));
  assert.doesNotMatch(html(null), /Phiên bản/);
  assert.match(html(0), /Phiên bản 0/);
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

test('AC-PRV-2/3: detail warns about an unknown icon and an inactive badge', () => {
  const html = (code: string) => renderToStaticMarkup(React.createElement(BadgeDetail, { badge: byCode(code), all: edge, onBack: () => {} }));
  assert.match(html('PERFECT_25'), /biểu tượng mặc định vì “rocket”/);
  assert.match(html('PERFECT_25'), /app chuyển kệ sang dạng cuộn ngang/);
  assert.match(html('WORDS_250'), /Người học chưa đạt hiện không thấy huy hiệu này/);
  assert.doesNotMatch(html('QUIZ_10'), /hiện không thấy huy hiệu này/);
  assert.match(html('SCAN_10'), /Admin chưa hỗ trợ chỉ số “SCAN_SAVED”/);
});
