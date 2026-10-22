import './dom-setup';
import test, { after, afterEach } from 'node:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fixtureAuditLog } from '../src/domains/admin-audit/fixtures';
import { exportAuditLog } from '../src/domains/admin-audit/api';
import type { AuditLogParams } from '../src/domains/admin-audit/types';
import { ActivityLogPage } from '../src/features/activity-log/ActivityLogPage';

/**
 * Wire-level: under tsx the fixture flag is off, so the page calls the PROPOSED endpoint; this fake server answers it
 * from the fixture. Checks the query the page sends as much as what it renders.
 */
let calls: URLSearchParams[] = [];
/** Simulates a server page cap smaller than the client asks for (export must still walk every page). */
let maxPageSize = Infinity;
globalThis.fetch = (async (input: string | URL) => {
  const url = new URL(String(input), 'http://localhost');
  if (url.pathname !== '/api/admin/audit-log') throw new Error(`unexpected ${url.pathname}`);
  const q = url.searchParams;
  calls.push(q);
  const actor = q.get('actor');
  const type = q.get('targetType');
  const p: AuditLogParams = {
    days: Number(q.get('days')) as AuditLogParams['days'], day: q.get('day'), q: q.get('q') ?? '',
    area: (q.get('area') ?? 'ALL') as AuditLogParams['area'], kind: (q.get('kind') ?? 'ALL') as AuditLogParams['kind'],
    actor: actor === null ? 'ALL' : actor === 'SYSTEM' ? 'SYSTEM' : Number(actor),
    target: type ? { type: type as never, id: q.get('targetId')! } : null,
    page: Number(q.get('page') ?? 0), size: Math.min(maxPageSize, Number(q.get('size') ?? 50)),
  };
  return new Response(JSON.stringify({ statusCode: 200, data: await fixtureAuditLog(p) }), { headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

let root: Root | undefined; let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); root = undefined; calls = []; document.body.innerHTML = ''; });
after(() => GlobalRegistrator.unregister());
async function render(el: React.ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client: client! }, el)));
}
async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 100; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out: ${label}`);
}
const text = () => document.body.textContent ?? '';
const dialog = () => document.querySelector('[role="dialog"]');
const buttonWith = (s: string, scope: ParentNode = document) => [...scope.querySelectorAll('button')].find((b) => b.textContent?.includes(s)) as HTMLButtonElement;
const click = (el: Element) => act(async () => { (el as HTMLElement).click(); });

test('D1. log explorer: default query, strip filter, drawer with diff, reason, history and newer/older', async () => {
  await render(React.createElement(ActivityLogPage, { rest: [] }));
  await waitFor(() => text().includes('Thay đổi trong 30 ngày'), 'strip');
  assert.deepEqual(Object.fromEntries(calls[0]), { days: '30', page: '0', size: '50' }, 'no empty filters on the wire');
  for (const s of ['Giá và phần thưởng', 'Vòng đời', 'Tài khoản người học', 'Vượt mức gợi ý', 'Theo ngày', 'Hệ thống', 'admin@snapvocab.com']) assert.ok(text().includes(s), s);
  // design.md §3.7 G5 and review §3.14: no enum codes, no removed concepts (hash chain, IP, compliance, rollback).
  for (const s of ['SHOP_ITEM_UPDATED', 'AVATAR_FRAME', 'PUBLISHED', 'SHA', 'Block', 'Ticket', 'Địa chỉ IP', 'Tuân thủ', 'Hoàn tác', 'Rollback', 'SUPER_ADMIN']) assert.ok(!text().includes(s), s);

  await click(buttonWith('Vượt mức gợi ý'));
  await waitFor(() => calls.at(-1)?.get('kind') === 'GUARDRAIL' && document.querySelectorAll('tbody tr td').length > 0 && !text().includes('Bậc Thầy Hoàng Kim'), 'guardrail filter');
  const rows = [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelector('td'));
  assert.equal(rows.length, 2);
  assert.ok(text().includes('Góp Nhặt Từ Mới') && text().includes('Hoa Anh Đào Mùa Xuân'));

  await click(buttonWith('Góp Nhặt Từ Mới', rows[0]));
  await waitFor(() => dialog()?.textContent?.includes('Lịch sử của mẫu nhiệm vụ này') && dialog()!.textContent!.includes('Tạo mẫu'), 'drawer + history');
  const d = dialog()!.textContent!;
  for (const s of ['Sửa: Góp Nhặt Từ Mới', 'Lưu khi vượt mức gợi ý.', '15 Coin', '40 Coin', 'Thử thưởng cao hơn cho tuần ra mắt.', 'Phiên bản', 'Mở mẫu nhiệm vụ']) assert.ok(d.includes(s), s);
  const history = calls.at(-1)!;
  assert.deepEqual([history.get('targetType'), history.get('targetId'), history.get('days'), history.get('size')], ['MISSION_TEMPLATE', '1', '90', '5']);
  assert.equal(dialog()!.querySelector('a[href="/missions/1"]')?.textContent, 'Mở mẫu nhiệm vụ');

  assert.ok(buttonWith('Mới hơn', dialog()!).disabled, 'first row has nothing newer');
  await click(buttonWith('Cũ hơn', dialog()!));
  await waitFor(() => dialog()?.textContent?.includes('Sửa: Hoa Anh Đào Mùa Xuân'), 'older entry');
  assert.ok(dialog()!.textContent!.includes('2.400 Coin'));
});

test('D3. band rows filter by area and by who (the system included); "Xóa bộ lọc" resets', async () => {
  await render(React.createElement(ActivityLogPage, { rest: [] }));
  await waitFor(() => text().includes('Theo khu vực'), 'band');
  const band = document.querySelector('[aria-label="Phân bố thay đổi"]')!;
  assert.ok(band.textContent!.includes('Cửa hàng') && band.textContent!.includes('Hệ thống'));

  await click(buttonWith('Thông báo', band));
  await waitFor(() => calls.at(-1)?.get('area') === 'NOTIFICATIONS' && text().includes('Khung avatar mới đã lên kệ') && !text().includes('Bậc Thầy Hoàng Kim'), 'area filter');
  assert.equal(buttonWith('Thông báo', band).getAttribute('aria-pressed'), 'true');

  await click(buttonWith('Hệ thống', band));
  await waitFor(() => calls.at(-1)?.get('actor') === 'SYSTEM', 'actor filter');
  await waitFor(() => text().includes('Không có thay đổi phù hợp'), 'no system writes to notifications');

  await click(buttonWith('Xóa bộ lọc'));
  await waitFor(() => !calls.at(-1)?.has('area') && !calls.at(-1)?.has('actor') && text().includes('Bậc Thầy Hoàng Kim'), 'reset');
});

test('D4. CSV export walks every page of the list endpoint (no export endpoint), one line per entry', async () => {
  maxPageSize = 40;
  try {
    const csv = await exportAuditLog({ days: 90, kind: 'ALL', area: 'ALL', actor: 'ALL' });
    const total = (await fixtureAuditLog({ days: 90 })).meta.total;
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 1 + total);
    assert.equal(new Set(lines).size, lines.length, 'no duplicated rows');
    assert.deepEqual(calls.map((c) => c.get('page')), Array.from({ length: Math.ceil(total / 40) }, (_, i) => String(i)));
    assert.ok(calls.every((c) => c.get('size') === '100' && c.get('days') === '90'));
  } finally {
    maxPageSize = Infinity;
  }
});

test('D5. editors\' "Vòng đời" panel lists the object\'s 5 latest writes and links to its full history (FE-AUD-03)', async () => {
  const { TargetHistory } = await import('../src/features/activity-log/TargetHistory');
  await render(React.createElement(TargetHistory, { target: { type: 'SHOP_ITEM', id: '11' } }));
  await waitFor(() => document.querySelectorAll('li').length > 0, 'history rows');
  assert.deepEqual([calls[0].get('targetType'), calls[0].get('targetId'), calls[0].get('days'), calls[0].get('size')], ['SHOP_ITEM', '11', '90', '5']);
  assert.equal(document.querySelectorAll('li').length, 5);
  assert.ok(text().includes('Nhật ký gần đây'));
  assert.ok(document.querySelector('a[href="/activity-log/vat-pham/11"]'), 'link to the object history');
});

test('D2. one object\'s history (linked from the editors\' "Vòng đời"): 90 days, name and link to the object', async () => {
  await render(React.createElement(ActivityLogPage, { rest: ['vat-pham', '11'] }));
  await waitFor(() => text().includes('Lịch sử của vật phẩm Bậc Thầy Hoàng Kim'), 'history bar');
  assert.deepEqual([calls[0].get('targetType'), calls[0].get('targetId'), calls[0].get('days')], ['SHOP_ITEM', '11', '90']);
  assert.equal(document.querySelector('a[href="/shop/11"]')?.textContent, 'Mở vật phẩm');
  assert.ok(text().includes('Hiển thị 1–5 / 5 thay đổi'));
});
