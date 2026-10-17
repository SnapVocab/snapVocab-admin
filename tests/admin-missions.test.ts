import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { catalogSummary, createPayload, emptyForm, matchPreset, poolShortage, presets, savePayload, supportedPreset, toForm, validateForm } from '../src/domains/admin-missions/mappers';
import { createMissionTemplate, getMissionTemplates, patchTemplate, setTemplateActive } from '../src/domains/admin-missions/api';
import type { MissionTemplate, SaveMission } from '../src/domains/admin-missions/types';
import { missionKeys } from '../src/domains/admin-missions/queries';
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
test('Seven MVP presets pin category, trigger and eligibility; booster is activation', () => {
  assert.equal(presets.length, 7);
  assert.equal(presets.find(p => p.key === 'KEEP_DAILY_STREAK')?.triggerEvent, 'LEARNING_ACTIVITY_RECORDED');
  assert.equal(presets.find(p => p.key === 'USE_XP_BOOSTER')?.triggerEvent, 'BOOSTER_USED');
  assert.equal(presets.some(p => p.category === ('SRS' as string)), false);
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
  assert.ok(html.includes('Invariant catalog')); assert.ok(html.includes('Không đạt'));
  assert.ok(!html.includes('Mọi người')); assert.ok(!html.includes('Chest'));
  client.setQueryData(missionKeys.list, [{ ...item, isActive: false }]);
  const empty = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(AdminMissionsPage, { onDirtyChange: () => {} })));
  assert.ok(empty.includes('Chưa kích hoạt')); assert.ok(!empty.includes('Không đạt'));
  client.clear();
});
test('Create editor renders Shop-style form and explicit inactive state', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.ok(html.includes('Tạo mới luôn ở trạng thái Tắt')); assert.ok(html.includes('XEM TRƯỚC NỘI DUNG'));
  assert.ok(html.includes('Phần thưởng')); assert.ok(html.includes('Không có điều kiện cấp'));
  assert.ok(html.includes('Điều kiện cấp ảnh hưởng việc nhiệm vụ được chọn')); assert.ok(!html.includes('Sao chép mã'));
  client.clear();
});
test('Edit editor shows locked code with copy action and reward item label', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rewarded = { ...item, rewardItemCode: 'FRAME', rewardItemFallbackCoin: 5 };
  client.setQueryData(missionKeys.detail(1), rewarded);
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(MissionEditor, { id: 1, onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {} })));
  assert.ok(html.includes('Sao chép mã')); assert.ok(html.includes('Phiên bản 4')); assert.ok(html.includes('+ 1 × FRAME'));
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
