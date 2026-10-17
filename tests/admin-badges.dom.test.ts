import './dom-setup';
import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { AdminBadgesPage } from '../src/features/admin-badges/AdminBadgesPage';
import { DATASETS } from '../src/domains/admin-badges/fixtures';
import type { AdminBadge } from '../src/domains/admin-badges/types';

const originalFetch = globalThis.fetch;
const sample: AdminBadge = { ...DATASETS.seed.items.find(b => b.code === 'QUIZ_10')!, version: null, earnerCount: 0 };
const other = DATASETS.seed.items.find(b => b.code === 'QUIZ_50')!;
const reply = (status: number, data: unknown, error: string | null = null) => new Response(JSON.stringify({ statusCode: status, data, error }),
  { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => reply(200, data);
const fail = (status: number, error: string) => reply(status, null, error);
let root: Root | undefined;
let client: QueryClient | undefined;
let host: HTMLDivElement;
const requests: string[] = [];

function routes(map: Record<string, () => Response | Promise<Response>>) {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(url)}`;
    requests.push(key);
    assert.ok(key.startsWith('GET /api/admin/badges'), `unexpected write or learner API: ${key}`);
    const route = map[key];
    assert.ok(route, `unexpected request: ${key}`);
    return route();
  }) as typeof fetch;
}

afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  root = undefined;
  client = undefined;
  document.body.innerHTML = '';
  globalThis.fetch = originalFetch;
  requests.length = 0;
});
after(() => GlobalRegistrator.unregister());

async function render() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client }, React.createElement(AdminBadgesPage))));
}
async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 60; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out: ${label}`);
}
const button = (name: string) => [...document.querySelectorAll('button')].find(b =>
  !b.closest('[hidden]') && (b.textContent === name || b.getAttribute('aria-label') === name))!;
const text = () => document.body.textContent ?? '';
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); }
async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

test('Initial loading shows a skeleton and no fixture catalog; API data supplies real counts', async () => {
  let resolve!: (response: Response) => void;
  routes({ 'GET /api/admin/badges': () => new Promise(r => { resolve = r; }) });
  await render();
  assert.ok(document.querySelector('[aria-label="Đang tải catalog huy hiệu"]'));
  assert.equal(document.querySelector('table'), null);
  await act(async () => resolve(ok([{ ...sample, name: 'Tên từ server' }])));
  await waitFor(() => button('Tên từ server'), 'live catalog');
  assert.match(text(), /Đã đạt/);
  assert.ok(document.querySelector('td.text-right')?.textContent?.includes('0'));
  assert.doesNotMatch(text(), /Prototype dev-only|Bộ dữ liệu prototype|Một Tuần Bền Bỉ/);
});

test('Initial API error never falls back to fixtures; retry recovers the list', async () => {
  routes({ 'GET /api/admin/badges': () => fail(404, 'NOT_FOUND') });
  await render();
  await waitFor(() => document.querySelector('[role="alert"]'), 'API error');
  assert.match(text(), /API quản trị huy hiệu chưa sẵn sàng/);
  assert.equal(document.querySelector('table'), null);
  routes({ 'GET /api/admin/badges': () => ok([sample]) });
  await click(button('Thử lại'));
  await waitFor(() => button(sample.name), 'retry result');
  assert.equal(document.querySelector('[role="alert"]'), null);
});

test('403 reports permission failure and an empty successful catalog stays empty', async () => {
  routes({ 'GET /api/admin/badges': () => fail(403, 'FORBIDDEN') });
  await render();
  await waitFor(() => text().includes('không có quyền'), 'permission error');
  assert.equal(document.querySelector('table'), null);
  routes({ 'GET /api/admin/badges': () => ok([]) });
  await click(button('Thử lại'));
  await waitFor(() => text().includes('Chưa có huy hiệu nào'), 'empty catalog');
  assert.doesNotMatch(text(), /Quen Tay Quiz|Một Tuần Bền Bỉ/);
});

test('Failed refresh keeps the previous catalog and filter with a stale-data warning', async () => {
  routes({ 'GET /api/admin/badges': () => ok([sample, other]) });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  const search = document.querySelector('input[type="search"]') as HTMLInputElement;
  await change(search, 'Quen');
  routes({ 'GET /api/admin/badges': () => { throw new TypeError('offline'); } });
  await click(button('Làm mới'));
  await waitFor(() => text().includes('Đang hiển thị dữ liệu đã tải trước đó'), 'stale banner');
  assert.ok(button(sample.name));
  assert.equal(search.value, 'Quen');
  assert.equal(button(other.name), undefined);
});

test('Detail GET uses fresh fields and full-catalog preview; back restores filter, scroll and keyboard focus', async () => {
  routes({
    'GET /api/admin/badges': () => ok([sample, other]),
    [`GET /api/admin/badges/${sample.id}`]: () => ok({ ...sample, name: 'Tên mới trên server', earnerCount: 123 }),
  });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  const search = document.querySelector('input[type="search"]') as HTMLInputElement;
  const status = document.querySelector('[aria-label="Lọc trạng thái"]') as HTMLSelectElement;
  await change(search, 'Quen');
  await change(status, 'ON');
  const scroller = host.firstElementChild as HTMLDivElement;
  scroller.scrollTop = 400;
  const opener = button(sample.name);
  await click(opener);
  await waitFor(() => document.querySelector('h1[tabindex="-1"]'), 'detail');
  assert.match(document.querySelector('h1[tabindex="-1"]')!.textContent!, /Tên mới trên server/);
  assert.equal(document.activeElement, document.querySelector('h1[tabindex="-1"]'));
  assert.doesNotMatch(document.querySelector('aside')!.parentElement!.parentElement!.textContent!, /Phiên bản/);
  assert.match(document.querySelector('aside')!.textContent!, /50/);
  assert.equal(scroller.scrollTop, 0);
  assert.ok(requests.includes(`GET /api/admin/badges/${sample.id}`));
  await click(button('Quay lại danh sách'));
  assert.equal(search.value, 'Quen');
  assert.equal(status.value, 'ON');
  assert.equal(scroller.scrollTop, 400);
  assert.equal(document.activeElement, opener);
  assert.equal(button('Lưu thay đổi'), undefined);
  assert.equal(button('Bật huy hiệu'), undefined);
});

test('BADGE_NOT_FOUND returns to the catalog and refetches rather than showing the old row as detail', async () => {
  let calls = 0;
  routes({
    'GET /api/admin/badges': () => ok(++calls === 1 ? [sample] : []),
    [`GET /api/admin/badges/${sample.id}`]: () => fail(404, 'BADGE_NOT_FOUND'),
  });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  await click(button(sample.name));
  await waitFor(() => text().includes('Chưa có huy hiệu nào'), 'refreshed catalog');
  assert.match(text(), /Không tìm thấy huy hiệu này/);
  assert.equal(document.querySelector('aside'), null);
  assert.equal(calls, 2);
});

test('Detail refresh keeps its last result on error and has a working exit', async () => {
  routes({ 'GET /api/admin/badges': () => ok([sample]), [`GET /api/admin/badges/${sample.id}`]: () => ok(sample) });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  await click(button(sample.name));
  await waitFor(() => document.querySelector('aside'), 'detail');
  routes({ 'GET /api/admin/badges': () => ok([sample]), [`GET /api/admin/badges/${sample.id}`]: () => fail(500, 'INTERNAL_ERROR') });
  await click(button('Làm mới'));
  await waitFor(() => text().includes('Đang hiển thị dữ liệu đã tải trước đó'), 'detail stale banner');
  assert.ok(document.querySelector('aside'));
  await click(button('Quay lại danh sách'));
  assert.equal(document.querySelector('aside'), null);
  assert.ok(button(sample.name));
});
