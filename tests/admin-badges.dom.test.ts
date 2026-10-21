import './dom-setup';
import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { AdminBadgesPage } from '../src/features/admin-badges/AdminBadgesPage';
import { BadgeEditor } from '../src/features/admin-badges/BadgeEditor';
import { ToggleBadgeDialog } from '../src/features/admin-badges/ToggleBadgeDialog';
import { DATASETS } from '../src/domains/admin-badges/fixtures';
import type { AdminBadge } from '../src/domains/admin-badges/types';
import { navigate, usePathname } from '../src/lib/router';

const originalFetch = globalThis.fetch;
const sample: AdminBadge = { ...DATASETS.seed.items.find(b => b.code === 'QUIZ_10')!, version: null, earnerCount: 0 };
const other = DATASETS.seed.items.find(b => b.code === 'QUIZ_50')!;
const reply = (status: number, data: unknown, error: string | null = null) => new Response(JSON.stringify({ statusCode: status, data, error }),
  { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => reply(200, data);
/** Error details travel in `data`, as FormatRestResponse sends them (api-client.ts). */
const fail = (status: number, error: string, details: unknown = null) => reply(status, details, error);
let root: Root | undefined;
let client: QueryClient | undefined;
let host: HTMLDivElement;
const requests: string[] = [];

/** Routes by "METHOD /path"; the body of each write is kept for assertions. */
const bodies: unknown[] = [];
function routes(map: Record<string, () => Response | Promise<Response>>, { writes = false } = {}) {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(url)}`;
    requests.push(key);
    if (!writes) assert.ok(key.startsWith('GET /api/admin/badges'), `unexpected write or learner API: ${key}`);
    if (init?.body) bodies.push(JSON.parse(String(init.body)));
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
  bodies.length = 0;
});
after(() => GlobalRegistrator.unregister());

/** The page as App mounts it: /badges/:id comes from the URL. */
function Routed() {
  const sub = usePathname().split('/')[2];
  return React.createElement(AdminBadgesPage, { sub });
}
async function mount(element: React.ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client }, element)));
}
async function render() {
  act(() => navigate('/badges'));
  await mount(React.createElement(Routed));
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
const strip = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(b => b.textContent?.endsWith(label))!;
const text = () => document.body.textContent ?? '';
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); }
async function change(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
/** The "Đã đạt" cell of a badge row, found through the header so hidden columns do not shift it. */
function earnersOf(name: string) {
  const col = [...document.querySelectorAll('thead th')].findIndex(th => th.textContent === 'Đã đạt');
  const row = [...document.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes(name))!;
  return row.children[col]?.textContent;
}

test('Initial loading shows a skeleton and no fixture catalog; API data supplies real counts', async () => {
  let resolve!: (response: Response) => void;
  routes({ 'GET /api/admin/badges': () => new Promise(r => { resolve = r; }) });
  await render();
  assert.ok(document.querySelector('[aria-label="Đang tải catalog huy hiệu"]'));
  assert.equal(document.querySelector('table'), null);
  await act(async () => resolve(ok([{ ...sample, name: 'Tên từ server' }])));
  await waitFor(() => button('Tên từ server'), 'live catalog');
  assert.equal(earnersOf('Tên từ server'), '0', 'a real zero is shown, not hidden');
  assert.doesNotMatch(text(), /Dữ liệu mẫu|Một Tuần Bền Bỉ/);
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

test('Strip cells filter the table and count the whole catalog', async () => {
  routes({ 'GET /api/admin/badges': () => ok([sample, { ...other, isActive: false }]) });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  assert.equal(strip('Đang tắt').textContent, '1Đang tắt');
  await click(strip('Đang tắt'));
  assert.equal(strip('Đang tắt').getAttribute('aria-pressed'), 'true');
  assert.equal(button(sample.name), undefined);
  assert.ok(button(other.name));
  assert.equal(strip('Cần rà').disabled, true, 'zero issues: the cell cannot be pressed');
});

test('/badges/:id reads the detail; back restores filter, scroll and keyboard focus', async () => {
  routes({
    'GET /api/admin/badges': () => ok([sample, other]),
    [`GET /api/admin/badges/${sample.id}`]: () => ok({ ...sample, name: 'Tên mới trên server', earnerCount: 123 }),
  });
  await render();
  await waitFor(() => button(sample.name), 'catalog');
  const search = document.querySelector('input[type="search"]') as HTMLInputElement;
  await change(search, 'Quen');
  await click(strip('Đang bật'));
  const scroller = host.firstElementChild as HTMLDivElement;
  scroller.scrollTop = 400;
  const opener = button(sample.name);
  await click(opener);
  assert.equal(window.location.pathname, `/badges/${sample.id}`);
  await waitFor(() => document.querySelector('h1[tabindex="-1"]'), 'detail');
  assert.match(document.querySelector('h1[tabindex="-1"]')!.textContent!, /Tên mới trên server/);
  assert.equal(document.activeElement, document.querySelector('h1[tabindex="-1"]'));
  assert.doesNotMatch(text(), /Phiên bản/);
  assert.match(document.querySelector('aside')!.textContent!, /50/);
  assert.match(document.querySelector('aside')!.textContent!, /123 người/);
  assert.equal(scroller.scrollTop, 0);
  assert.ok(requests.includes(`GET /api/admin/badges/${sample.id}`));
  await click(button('Quay lại danh sách'));
  assert.equal(window.location.pathname, '/badges');
  assert.equal(search.value, 'Quen');
  assert.equal(strip('Đang bật').getAttribute('aria-pressed'), 'true');
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
  assert.equal(window.location.pathname, '/badges');
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

// ── P2 (PATCH + estimate), through the real transport: the components take `editable` from the page ────────────────

const editable: AdminBadge = { ...sample, version: 3, earnerCount: 14 };
const saved: AdminBadge[] = [];
async function mountEditor(badge = editable) {
  saved.length = 0;
  await mount(React.createElement(BadgeEditor, {
    badge, all: [badge, other], editable: true, refreshing: false, onRefresh: () => {}, onBack: () => {},
    onSaved: (b: AdminBadge) => saved.push(b), onToggle: () => {}, onDirtyChange: () => {},
  }));
}
const field = (label: string) => {
  const l = [...document.querySelectorAll('label')].find(x => x.textContent?.replace(' *', '') === label)!;
  return document.getElementById(l.htmlFor) as HTMLInputElement | HTMLTextAreaElement;
};

test('P2 save sends only the changed fields with the version read, then the form is clean again', async () => {
  routes({ [`PATCH /api/admin/badges/${editable.id}`]: () => ok({ ...editable, name: 'Mười Bài Quiz', version: 4 }) }, { writes: true });
  await mountEditor();
  assert.equal(button('Lưu thay đổi').disabled, true, 'nothing to save yet');
  await change(field('Tên'), 'Mười Bài Quiz');
  assert.match(text(), /Có thay đổi chưa lưu/);
  assert.equal(button('Tắt huy hiệu').disabled, true, 'save before switching it off');
  await click(button('Lưu thay đổi'));
  await waitFor(() => saved.length, 'saved');
  assert.deepEqual(bodies, [{ version: 3, name: 'Mười Bài Quiz' }]);
  assert.doesNotMatch(text(), /Có thay đổi chưa lưu/);
  assert.match(text(), /Phiên bản 4/);
});

test('P2 version conflict keeps the draft and compares it field by field before replacing it', async () => {
  routes({
    [`PATCH /api/admin/badges/${editable.id}`]: () => fail(409, 'VERSION_CONFLICT', { currentVersion: 4 }),
    [`GET /api/admin/badges/${editable.id}`]: () => ok({ ...editable, description: 'Hoàn thành 10 quiz bất kỳ', version: 4 }),
  }, { writes: true });
  await mountEditor();
  await change(field('Tên'), 'Bản của tôi');
  await click(button('Lưu thay đổi'));
  await waitFor(() => text().includes('máy chủ đang ở phiên bản 4'), 'conflict');
  assert.equal(field('Tên').value, 'Bản của tôi');
  await click(button('So sánh với bản mới'));
  await waitFor(() => document.querySelector('[role="dialog"]'), 'compare dialog');
  const dialog = document.querySelector('[role="dialog"]')!.textContent!;
  assert.match(dialog, /Bản của tôi/);
  assert.match(dialog, /Hoàn thành 10 quiz bất kỳ/);
  await click(button('Dùng bản máy chủ, bỏ nội dung đang nhập'));
  assert.equal(field('Tên').value, editable.name);
  assert.equal(field('Mô tả, câu điều kiện người học đọc').value, 'Hoàn thành 10 quiz bất kỳ');
  assert.match(text(), /Phiên bản 4/);
});

test('P2 lost response: no blind resend; the server copy decides whether it was saved', async () => {
  routes({
    [`PATCH /api/admin/badges/${editable.id}`]: () => { throw new TypeError('Failed to fetch'); },
    [`GET /api/admin/badges/${editable.id}`]: () => ok({ ...editable, name: 'Đã tới máy chủ', version: 4 }),
  }, { writes: true });
  await mountEditor();
  await change(field('Tên'), 'Đã tới máy chủ');
  await click(button('Lưu thay đổi'));
  await waitFor(() => text().includes('Chưa xác định được kết quả lưu'), 'uncertain');
  assert.equal(button('Lưu thay đổi').disabled, true);
  await click(button('Kiểm tra trên máy chủ'));
  await waitFor(() => saved.length, 'reconciled');
  assert.equal(saved[0].version, 4);
  assert.equal(requests.filter(r => r.startsWith('PATCH')).length, 1);
});

test('P2 Bật shows the refill estimate; a failed estimate says so and never blocks Bật', async () => {
  const off = { ...editable, isActive: false };
  const done: AdminBadge[] = [];
  const dialog = () => mount(React.createElement(ToggleBadgeDialog, { badge: off, onClose: () => {}, onDone: (b: AdminBadge) => done.push(b) }));
  routes({ [`GET /api/admin/badges/${off.id}/refill-estimate`]: () => ok({ eligibleCount: 1234, calculatedAt: '2026-10-21T07:00:00Z', version: 3 }) }, { writes: true });
  await dialog();
  await waitFor(() => text().includes('1.234 tài khoản'), 'estimate');
  assert.match(text(), /14:00/, 'counted-at time in Vietnam');
  act(() => root!.unmount());
  client!.clear();
  document.body.innerHTML = '';

  routes({
    [`GET /api/admin/badges/${off.id}/refill-estimate`]: () => fail(500, 'INTERNAL_ERROR'),
    [`PATCH /api/admin/badges/${off.id}`]: () => ok({ ...off, isActive: true, version: 4 }),
    'GET /api/admin/badges': () => ok([]),
  }, { writes: true });
  await dialog();
  await waitFor(() => text().includes('Chưa có ước tính'), 'no estimate');
  assert.doesNotMatch(text(), /\b0 tài khoản/);
  await click(button('Bật huy hiệu'));
  await waitFor(() => done.length, 'switched on');
  assert.deepEqual(bodies, [{ version: 3, isActive: true }]);
});
