import './dom-setup';
import test, { after, afterEach } from 'node:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createPayload, emptyForm } from '../src/domains/admin-missions/mappers';
import { missionKeys } from '../src/domains/admin-missions/queries';
import type { MissionTemplate } from '../src/domains/admin-missions/types';
import { AdminMissionsPage } from '../src/features/admin-missions/AdminMissionsPage';
import { MissionEditor } from '../src/features/admin-missions/MissionEditor';

const item: MissionTemplate = { ...createPayload({ ...emptyForm(), code: 'ADD', name: 'Thêm từ', description: 'Thêm từ có nghĩa', rewardCoin: '15' }), id: 1, version: 4, isActive: true, createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => json(200, { statusCode: 200, error: null, message: 'OK', data });
const fail = (status: number, error: string) => json(status, { statusCode: status, error, message: error, data: null });
const networkDown = () => { throw new TypeError('Failed to fetch'); };

/** Routes by "METHOD /path"; Shop lookups always answer an empty page. */
function route(map: Record<string, () => Response>) {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(url).replace(/^https?:\/\/[^/]+/, '').replace(/\?.*/, '')}`;
    if (key.includes('/shop/')) return ok({ data: [], meta: { page: 0, size: 20, pages: 0, total: 0 } });
    const handler = map[key];
    if (!handler) throw new Error(`unexpected request ${key}`);
    return handler();
  }) as typeof fetch;
}

let root: Root | undefined; let current: QueryClient | undefined;
// Unmount and drop query caches: their gc timers would otherwise keep the test process alive.
afterEach(() => { act(() => root?.unmount()); current?.clear(); root = undefined; current = undefined; document.body.innerHTML = ''; });
after(() => GlobalRegistrator.unregister());
async function render(element: React.ReactElement, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  current = client;
  const host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client }, element)));
  return client;
}
async function waitFor(check: () => unknown, label = 'condition') {
  for (let i = 0; i < 50; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out waiting for ${label}`);
}
const text = () => document.body.textContent ?? '';
const button = (name: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(name) || b.getAttribute('aria-label') === name)!;
function field(label: string) {
  const l = [...document.querySelectorAll('label')].find(x => x.textContent?.replace(' *', '') === label)!;
  return document.getElementById(l.htmlFor) as HTMLInputElement | HTMLSelectElement;
}
async function click(el: HTMLElement) { await act(async () => { el.click(); }); }
async function input(el: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
const editor = (props: Partial<React.ComponentProps<typeof MissionEditor>> = {}) =>
  React.createElement(MissionEditor, { onBack: () => {}, onSaved: () => {}, onActivate: () => {}, onDirtyChange: () => {}, ...props });
async function editExisting(props: Partial<React.ComponentProps<typeof MissionEditor>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(missionKeys.detail(1), item);
  await render(editor({ id: 1, ...props }), client);
  return client;
}

test('Failed validation marks required fields and focuses the first invalid one', async () => {
  route({});
  await render(editor());
  assert.ok(document.querySelector('label')?.textContent?.endsWith(' *'));
  assert.equal(field('Mã nhiệm vụ').required, true);
  await click(button('Tạo nhiệm vụ'));
  await waitFor(() => document.activeElement === field('Mã nhiệm vụ'), 'focus on code');
  assert.equal(field('Mã nhiệm vụ').getAttribute('aria-invalid'), 'true');
  assert.match(field('Mã nhiệm vụ').getAttribute('aria-describedby') ?? '', /error/);
});

test('Changing the action preset says which values were reset', async () => {
  route({});
  await render(editor());
  await input(field('Mẫu hành động'), 'QUIZ_SCORE_80');
  assert.ok(text().includes('Đã đặt lại theo mẫu: mục tiêu 5 → 1, độ chính xác tối thiểu.'));
});

test('Lost save response blocks resubmit until the server check; a matching server copy counts as saved', async () => {
  let saved: MissionTemplate | undefined;
  route({ 'PATCH /api/admin/mission-templates/1': networkDown });
  await editExisting({ onSaved: i => { saved = i; } });
  await input(field('Tên hiển thị'), 'Tên mới');
  await click(button('Lưu thay đổi'));
  await waitFor(() => text().includes('Chưa xác định được kết quả lưu'), 'uncertain banner');
  assert.equal(button('Lưu thay đổi').disabled, true);
  route({ 'GET /api/admin/mission-templates/1': () => ok({ ...item, name: 'Tên mới', version: 5 }) });
  await click(button('Kiểm tra kết quả trên server'));
  await waitFor(() => saved, 'onSaved');
  assert.equal(saved!.version, 5);
});

test('Version conflict compares draft with the server copy before discarding it', async () => {
  route({ 'PATCH /api/admin/mission-templates/1': () => fail(409, 'VERSION_CONFLICT'),
    'GET /api/admin/mission-templates/1': () => ok({ ...item, description: 'Mô tả server', version: 6 }) });
  await editExisting();
  await input(field('Tên hiển thị'), 'Tên mới');
  await click(button('Lưu thay đổi'));
  await waitFor(() => button('So sánh với bản mới'), 'compare button');
  assert.equal((field('Tên hiển thị') as HTMLInputElement).value, 'Tên mới', 'draft kept');
  await click(button('So sánh với bản mới'));
  await waitFor(() => document.querySelector('[role="dialog"] table'), 'diff table');
  const rows = [...document.querySelectorAll('[role="dialog"] tbody tr')].map(r => [...r.children].map(c => c.textContent));
  assert.deepEqual(rows, [['Tên hiển thị', 'Tên mới', 'Thêm từ'], ['Mô tả', 'Thêm từ có nghĩa', 'Mô tả server']]);
  await click(button('Dùng bản server'));
  assert.equal((field('Tên hiển thị') as HTMLInputElement).value, 'Thêm từ');
  assert.ok(text().includes('Phiên bản 6'));
});

test('A newer cached version is adopted when clean and flagged when dirty', async () => {
  route({});
  const client = await editExisting();
  await act(async () => { client.setQueryData(missionKeys.detail(1), { ...item, name: 'Đổi từ nơi khác', version: 5 }); });
  await waitFor(() => (field('Tên hiển thị') as HTMLInputElement).value === 'Đổi từ nơi khác', 'clean form adopts v5');
  await input(field('Tên hiển thị'), 'Bản nháp');
  await act(async () => { client.setQueryData(missionKeys.detail(1), { ...item, version: 7 }); });
  await waitFor(() => text().includes('Server đã có phiên bản 7; bản đang sửa là 5.'), 'stale banner');
  assert.equal((field('Tên hiển thị') as HTMLInputElement).value, 'Bản nháp');
});

test('Lost activation response is never retried blindly; the server state closes the dialog', async () => {
  route({ 'GET /api/admin/mission-templates': () => ok([item]), 'PATCH /api/admin/mission-templates/1': networkDown });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(missionKeys.list, [item]);
  await render(React.createElement(AdminMissionsPage, { onDirtyChange: () => {} }), client);
  await click(button('Tắt'));
  await click(button('Xác nhận tắt'));
  await waitFor(() => button('Kiểm tra trạng thái server'), 'server check button');
  assert.equal(button('Xác nhận tắt').disabled, true);
  route({ 'GET /api/admin/mission-templates': () => ok([{ ...item, isActive: false, version: 5 }]),
    'GET /api/admin/mission-templates/1': () => ok({ ...item, isActive: false, version: 5 }) });
  await click(button('Kiểm tra trạng thái server'));
  await waitFor(() => text().includes('Trạng thái server: Đang tắt'), 'toast');
  assert.equal(document.querySelector('[role="dialog"]'), null);
});
