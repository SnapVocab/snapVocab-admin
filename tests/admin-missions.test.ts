import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { catalogSummary, CLIENTS, dailyOutlook, missionGroup, createPayload, emptyForm, matchPreset, poolShortage, presets, savePayload, supportedPreset, toForm, validateForm } from '../src/domains/admin-missions/mappers';
import { createMissionTemplate, getMissionTemplates, patchTemplate, setTemplateActive } from '../src/domains/admin-missions/api';
import type { MissionTemplate, SaveMission } from '../src/domains/admin-missions/types';
import { missionKeys } from '../src/domains/admin-missions/queries';
import { adminShopKeys } from '../src/domains/shop/queries';
import { AdminMissionsPage } from '../src/features/admin-missions/AdminMissionsPage';
import { MissionEditor } from '../src/features/admin-missions/MissionEditor';

const item: MissionTemplate = { ...createPayload({ ...emptyForm(), code: 'ADD', name: 'Thêm từ', description: 'Thêm từ có nghĩa', rewardCoin: '15' }), id: 1, version: 4, isActive: true, createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' };
test('Catalog invariant distinguishes core NONE from gated templates and unsupported producers', () => {
  const core = Array.from({ length: 4 }, (_, n) => ({ ...item, id: n + 1 }));
  assert.equal(catalogSummary(core).valid, false);
  const slot: MissionTemplate = { ...item, id: 9, category: 'RETENTION', triggerEvent: 'LEARNING_ACTIVITY_RECORDED' };
  assert.equal(catalogSummary([...core, slot]).valid, true);
  assert.equal(catalogSummary([...core, { ...slot, eligibilityRule: 'HAS_IDLE_XP_BOOSTER' }]).valid, false);
  const unsupported: MissionTemplate = { ...item, category: 'SCAN' };
  assert.equal(catalogSummary([...core, unsupported]).valid, true);
  assert.equal(supportedPreset(unsupported), undefined);
});
test('Pool shortage explains the missing NONE templates and is empty when valid', () => {
  const core = Array.from({ length: 4 }, (_, n) => ({ ...item, id: n + 1 }));
  const slot: MissionTemplate = { ...item, id: 9, category: 'RETENTION', triggerEvent: 'LEARNING_ACTIVITY_RECORDED' };
  assert.equal(poolShortage([...core, slot]), '');
  assert.equal(poolShortage(core.map(t => ({ ...t, isActive: false }))), '');
  assert.match(poolShortage(core), /slot 5/);
  assert.match(poolShortage([...core.slice(1), slot]), /thiếu 1 mẫu cốt lõi/);
  assert.match(poolShortage(core.slice(2)), /thiếu 2 mẫu cốt lõi.*slot 5/);
});
test('Blank numeric inputs are rejected; integer bounds and reward requirements hold', () => {
  const form = toForm(item);
  assert.deepEqual(validateForm(form), {});
  assert.ok(validateForm({ ...form, targetValue: '' }).targetValue);
  assert.ok(validateForm({ ...form, weight: '1.5' }).weight);
  assert.ok(validateForm({ ...form, rewardCoin: '2147483648' }).rewardCoin);
  assert.ok(validateForm({ ...form, rewardCoin: '0', rewardXp: '0' }).rewardCoin);
  assert.ok(validateForm({ ...form, rewardItemCode: 'FRAME', rewardItemFallbackCoin: '' }).rewardItemFallbackCoin);
  assert.equal(validateForm({ ...form, rewardItemCode: 'FRAME', rewardItemFallbackCoin: '0' }).rewardItemFallbackCoin, undefined);
});
test('Save removes immutable metadata and activation; nullable item pair is explicit', () => {
  const rewarded = { ...item, rewardItemCode: 'FRAME', rewardItemFallbackCoin: 5 };
  const form = { ...toForm(rewarded), code: 'CHANGED', rewardItemCode: null, rewardItemFallbackCoin: '' };
  assert.deepEqual(savePayload(form, rewarded), { version: 4, rewardItemCode: null, rewardItemFallbackCoin: null });
  assert.deepEqual(savePayload({ ...toForm(rewarded), rewardItemCode: 'OTHER' }, rewarded), { version: 4, rewardItemCode: 'OTHER', rewardItemFallbackCoin: 5 });
});
test('Changing quiz to non-quiz clears filters explicitly in PATCH', () => {
  const quiz: MissionTemplate = { ...item, category: 'QUIZ', triggerEvent: 'QUIZ_COMPLETED', minQuizAccuracyPercent: 100, quizRequestedCount: 5 };
  const form = { ...toForm(quiz), category: 'VOCABULARY' as const, triggerEvent: 'TOPIC_ITEM_CREATED' as const, minQuizAccuracyPercent: '', quizRequestedCount: '' };
  const patch = savePayload(form, quiz);
  assert.equal(patch.minQuizAccuracyPercent, null); assert.equal(patch.quizRequestedCount, null);
  assert.ok(validateForm({ ...form, quizRequestedCount: '5' }).quizRequestedCount);
});
test('Ten MVP presets pin category, trigger and eligibility; booster is activation', () => {
  assert.equal(presets.length, 10);
  assert.equal(presets.find(p => p.key === 'STUDY_10_CARDS')?.eligibilityRule, 'HAS_STUDY_CARDS_FOR_TARGET');
  assert.equal(presets.find(p => p.key === 'SCAN_SAVE_3_WORDS')?.triggerEvent, 'SCAN_WORD_SAVED');
  assert.equal(presets.find(p => p.key === 'KEEP_DAILY_STREAK')?.triggerEvent, 'LEARNING_ACTIVITY_RECORDED');
  assert.equal(presets.find(p => p.key === 'USE_XP_BOOSTER')?.triggerEvent, 'BOOSTER_USED');
  assert.equal(presets.find(p => p.key === 'STUDY_5_CARDS')?.triggerEvent, 'SRS_REVIEW_COMPLETED');
});
test('Transport unwraps real envelope and separates save from activation', async () => {
  const old = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ statusCode: 200, error: null, message: 'OK', data: String(url).endsWith('mission-templates') && !options?.method ? [item] : item }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    assert.deepEqual(await getMissionTemplates(), [item]);
    await patchTemplate(item.id, { version: 4, name: 'New', isActive: false, code: 'NO', id: 8 } as SaveMission);
    assert.deepEqual(JSON.parse(String(calls[1].options?.body)), { version: 4, name: 'New' });
    await setTemplateActive(item.id, { version: 4, isActive: false, name: 'NO' } as any);
    assert.deepEqual(JSON.parse(String(calls[2].options?.body)), { version: 4, isActive: false });
    await createMissionTemplate(createPayload(toForm(item)));
    const created = JSON.parse(String(calls[3].options?.body));
    assert.equal('isActive' in created, false); assert.equal('version' in created, false);
    assert.equal(calls[0].url, '/api/admin/mission-templates');
  } finally { globalThis.fetch = old; }
});
test('List renders real catalog, accurate NONE wording, and no prototype chest/analytics', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(missionKeys.list, [item]);
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AdminMissionsPage, { onDirtyChange: () => {} })));
  assert.ok(html.includes('Thêm từ')); assert.ok(html.includes('Không có điều kiện cấp'));
  assert.ok(html.includes('Đủ 5 nhiệm vụ mỗi ngày')); assert.ok(html.includes('Không đạt')); assert.ok(!html.includes('nvariant'));
  assert.ok(!html.includes('Mọi người')); assert.ok(!html.includes('Chest'));
  client.setQueryData(missionKeys.list, [{ ...item, isActive: false }]);
  const empty = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AdminMissionsPage, { onDirtyChange: () => {} })));
  assert.ok(empty.includes('Chưa kích hoạt')); assert.ok(!empty.includes('Không đạt'));
  client.clear();
});
test('Create editor renders Shop-style form and explicit inactive state', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.ok(html.includes('Tạo mới luôn ở trạng thái Tắt')); assert.ok(html.includes('Xem trước trên ứng dụng'));
  assert.ok(html.includes('Phần thưởng')); assert.ok(html.includes('Không có điều kiện cấp'));
  assert.ok(html.includes('Điều kiện cấp ảnh hưởng việc nhiệm vụ được chọn')); assert.ok(!html.includes('Sao chép mã'));
  client.clear();
});
test('Edit editor shows locked code with copy action and reward item label', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rewarded = { ...item, rewardItemCode: 'FRAME', rewardItemFallbackCoin: 5 };
  client.setQueryData(missionKeys.detail(1), rewarded);
  // The learner reads the item's name (daily_mission.md §8.1 reward.itemName), as resolved from the Shop list.
  client.setQueryData(adminShopKeys.list({ status: 'ALL', q: 'FRAME', page: 0, size: 100 }), { data: [{ code: 'FRAME', name: 'Khung Vàng', status: 'PUBLISHED' }] });
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { id: 1, onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.ok(html.includes('Sao chép mã')); assert.ok(html.includes('Phiên bản 4')); assert.ok(html.includes('Vật phẩm: Khung Vàng'), 'preview uses the mobile reward-item copy');
  client.clear();
});
test('Preset label follows the stored quiz filters; unmatched quiz config is custom', () => {
  const quiz = { ...emptyForm(), category: 'QUIZ' as const, triggerEvent: 'QUIZ_COMPLETED' as const };
  assert.equal(matchPreset({ ...quiz, quizRequestedCount: '5' })?.key, 'FINISH_2_SHORT_QUIZZES');
  assert.equal(matchPreset({ ...quiz, minQuizAccuracyPercent: '90' })?.key, 'QUIZ_SCORE_80');
  assert.equal(matchPreset({ ...quiz, minQuizAccuracyPercent: '100', quizRequestedCount: '5' })?.key, 'PERFECT_MINI_QUIZ');
  for (const f of [{}, { quizRequestedCount: '10' }, { minQuizAccuracyPercent: '80', quizRequestedCount: '5' }, { minQuizAccuracyPercent: '90', quizRequestedCount: '20' }]) {
    assert.equal(matchPreset({ ...quiz, ...f }), undefined, JSON.stringify(f));
  }
  assert.equal(matchPreset(emptyForm())?.key, 'ADD_5_WORDS');
});
test('Editor is a scroll container, flags custom quiz, hides invalid objective and explains word credit', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const quiz = { ...item, category: 'QUIZ' as const, triggerEvent: 'QUIZ_COMPLETED' as const, quizRequestedCount: 10 as const, targetValue: 2 };
  client.setQueryData(missionKeys.detail(1), quiz);
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { id: 1, onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.match(html, /<option value="CUSTOM" disabled="" selected="">Quiz tùy chỉnh/);
  client.setQueryData(missionKeys.list, [item]);
  const page = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AdminMissionsPage, { onDirtyChange: () => {} })));
  assert.match(page, /class="h-full min-w-0 space-y-4 overflow-y-auto/);
  const create = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.ok(create.includes('Mỗi từ chỉ tăng một nhiệm vụ thêm từ'));
  assert.ok(create.includes('Thêm từ mới: 5'));
  client.clear();
});

test('Daily outlook mirrors MissionTracker.choose: seed catalog pays 80–85 Coin / 150–160 XP, slots 1 and 3 fall back to core', () => {
  const t = (id: number, code: string, category: MissionTemplate['category'], coin: number, xp: number, eligibilityRule: MissionTemplate['eligibilityRule'] = 'NONE') =>
    ({ ...item, id, code, category, rewardCoin: coin, rewardXp: xp, eligibilityRule,
      triggerEvent: category === 'SRS' ? 'SRS_REVIEW_COMPLETED' as const : category === 'SCAN' ? 'SCAN_WORD_SAVED' as const : item.triggerEvent });
  const seed = [t(1, 'ADD_5_WORDS', 'VOCABULARY', 15, 25), t(2, 'QUIZ_SCORE_80', 'QUIZ', 20, 40), t(3, 'FINISH_2', 'QUIZ', 15, 30),
    t(4, 'PERFECT', 'QUIZ', 25, 45), t(5, 'KEEP_DAILY_STREAK', 'RETENTION', 10, 20),
    t(6, 'USE_XP_BOOSTER', 'SHOP', 5, 10, 'HAS_IDLE_XP_BOOSTER'), t(7, 'BUY_SHOP_ITEM', 'SHOP', 5, 10, 'HAS_PURCHASABLE_ITEM')];
  const o = dailyOutlook(seed);
  assert.deepEqual(o.coin, [80, 85]); assert.deepEqual(o.xp, [150, 160]); assert.equal(o.insufficient, false);
  assert.deepEqual(o.slots.map(s => s.fallback), [true, false, true, false, false]);
  // 4 core templates for 4 slots: every learner gets all of them. Own slots pick first, so ADD_5_WORDS always sits in
  // slot 2 and the empty slots 1 and 3 take the quizzes slot 4 left; slot 5 rotates over the 3 others.
  assert.deepEqual(o.slots[0].reachable.map(x => x.id).sort(), [2, 3, 4]);
  assert.deepEqual(o.slots[1].reachable.map(x => x.id), [1]);
  assert.deepEqual(o.slots[4].reachable.map(x => x.id).sort(), [5, 6, 7]);
  assert.deepEqual(o.example?.map(x => x.id), [3, 1, 4, 2, 5]);
  assert.deepEqual(seed.map(missionGroup), ['CORE', 'CORE', 'CORE', 'CORE', 'SLOT5', 'GATED', 'GATED']);
  // Three core templates cannot fill slots 1–4.
  const thin = dailyOutlook(seed.map(x => x.id === 4 ? { ...x, isActive: false } : x));
  assert.equal(thin.insufficient, true); assert.equal(thin.coin, null);
  // PD-SHX-04 trial: a 15-min booster replaces KEEP_DAILY_STREAK's 10 Coin; at max boosters it pays 10 Coin back.
  const trial = dailyOutlook(seed.map(x => x.id === 5 ? { ...x, rewardCoin: 0, rewardItemCode: 'XP_BOOSTER_X2_15M', rewardItemFallbackCoin: 10 } : x));
  assert.deepEqual(trial.coin, [75, 85]);
  // PD-DM-07: STUDY_5_CARDS fills slot 3 itself; slot 1 takes one of the 2 quizzes slot 4 left, so 2 quizzes a day and
  // the daily ceiling stays at 85 Coin / 160 XP.
  const srs = dailyOutlook([...seed, t(8, 'STUDY_5_CARDS', 'SRS', 15, 30)]);
  assert.deepEqual(srs.slots.map(s => s.fallback), [true, false, false, false, false]);
  // PD-DM-13: an older app never gets the SRS template, so for its users slot 3 still falls back to a quiz.
  assert.deepEqual(dailyOutlook([...seed, t(8, 'STUDY_5_CARDS', 'SRS', 15, 30)], [CLIENTS.current]).slots[2].reachable.map(x => x.id), [8]);
  assert.deepEqual(srs.slots[2].reachable.map(x => x.id).sort((a, b) => a - b), [2, 3, 4, 8]);
  assert.deepEqual(srs.coin, [70, 85]); assert.deepEqual(srs.xp, [135, 160]);
  // With SCAN_SAVE_3_WORDS too, every slot has its own template: one quiz a day, ceiling down to 75 Coin / 140 XP.
  const fullItems = [...seed, t(8, 'STUDY_5_CARDS', 'SRS', 15, 30), t(9, 'SCAN_SAVE_3_WORDS', 'SCAN', 10, 20)];
  const full = dailyOutlook(fullItems, [CLIENTS.current]);
  assert.deepEqual(full.slots.map(s => s.fallback), [false, false, false, false, false]);
  assert.deepEqual(full.slots[0].reachable.map(x => x.id), [9]);
  assert.deepEqual(full.coin, [60, 75]); assert.deepEqual(full.xp, [115, 140]);
  // Until older apps are gone their users keep the legacy set, which pays up to 85 Coin.
  assert.deepEqual(dailyOutlook(fullItems).coin, [60, 85]);
  // Invariant counts only legacy triggers: SCAN/SRS templates cannot stand in for two removed quizzes.
  assert.equal(catalogSummary(fullItems.filter(x => x.id !== 2 && x.id !== 3)).valid, false);
  // PD-DM-12 variants: two templates in slots 1–3 (STUDY_10_CARDS gated); Coin ceiling still 75, XP back to 160.
  const variants = dailyOutlook([...seed, t(8, 'STUDY_5_CARDS', 'SRS', 15, 30), t(9, 'SCAN_SAVE_3_WORDS', 'SCAN', 10, 20),
    t(10, 'ADD_3_WORDS', 'VOCABULARY', 10, 15), t(11, 'SCAN_SAVE_5_WORDS', 'SCAN', 10, 30),
    t(12, 'STUDY_10_CARDS', 'SRS', 15, 40, 'HAS_STUDY_CARDS_FOR_TARGET')], [CLIENTS.current]);
  assert.deepEqual(variants.slots.slice(0, 3).map(s => s.reachable.map(x => x.id).sort((a, b) => a - b)), [[9, 11], [1, 10], [8, 12]]);
  assert.deepEqual(variants.coin, [55, 75]); assert.deepEqual(variants.xp, [105, 160]);
});

// TD-ADS-09: the backend's MissionOutlookVectorsTest reads the same vectors, so dailyOutlook cannot drift from
// MissionTracker.choose unnoticed. Regenerate only together with a deliberate change on both sides.
test('Daily outlook matches the shared backend vectors', () => {
  const vectors = JSON.parse(readFileSync(new URL('../../snap-vocab-backend/src/test/resources/mission/outlook-vectors.json', import.meta.url), 'utf8')) as {
    name: string; clients: (keyof typeof CLIENTS)[]; templates: MissionTemplate[];
    expect: { coin: [number, number] | null; xp: [number, number] | null; insufficient: boolean; reachable: string[][] };
  }[];
  assert.ok(vectors.length > 0);
  for (const v of vectors) {
    const o = dailyOutlook(v.templates.map((t, i) => ({ ...t, id: i + 1 })), v.clients.map(c => CLIENTS[c]));
    assert.deepEqual({ coin: o.coin, xp: o.xp, insufficient: o.insufficient, reachable: o.slots.map(s => s.reachable.map(t => t.code).sort()) }, v.expect, v.name);
  }
});
