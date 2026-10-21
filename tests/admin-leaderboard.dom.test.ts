import './dom-setup';
import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { LeaderboardPage } from '../src/features/admin-leaderboard/LeaderboardPage';
import { fixtureBoard } from '../src/domains/admin-leaderboard/fixtures';
import type { AdminLeaderboard } from '../src/domains/admin-leaderboard/types';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const requests: string[] = [];
let root: Root | undefined;
let client: QueryClient | undefined;

/** Answers GET /api/admin/leaderboards?week=… from `boards`; anything else fails the test. */
function serve(boards: Partial<Record<string, () => Response>>) {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(url)}`;
    requests.push(key);
    const week = new URL(String(url), 'http://localhost').searchParams.get('week') ?? '';
    const handler = key.startsWith('GET /api/admin/leaderboards?') ? boards[week] : undefined;
    assert.ok(handler, `unexpected request ${key}`);
    return handler();
  }) as typeof fetch;
}
const ok = (board: AdminLeaderboard) => () => json(200, { statusCode: 200, data: board, error: null });

afterEach(() => { act(() => root?.unmount()); client?.clear(); root = undefined; client = undefined; document.body.innerHTML = ''; requests.length = 0; });
after(() => GlobalRegistrator.unregister());

async function render() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client }, React.createElement(LeaderboardPage))));
}
async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 60; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out: ${label}`);
}
const text = () => document.body.textContent ?? '';
const buttons = () => [...document.querySelectorAll('button')];
const byName = (name: string) => buttons().find(b => b.textContent === name || b.getAttribute('aria-label') === name)!;
const strip = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(b => b.textContent?.endsWith(label))!;
const rows = () => [...document.querySelectorAll('tbody tr')].filter(tr => tr.querySelector('button'));
async function click(el: HTMLElement) { await act(async () => { el.click(); }); }

test('D1: the real endpoint fills the strip, the band and the board; nothing claims to be sample data', async () => {
  const board = fixtureBoard('CURRENT');
  serve({ CURRENT: ok(board) });
  await render();
  await waitFor(() => rows().length, 'board');
  assert.deepEqual(requests, ['GET /api/admin/leaderboards?week=CURRENT']);
  assert.equal(rows().length, board.participants);
  assert.equal(strip('Người có mặt').textContent, `${board.participants}Người có mặt`);
  assert.equal(strip('Cần xem').textContent, '2Cần xem');
  assert.match(text(), /81%34\/42 người học/);
  assert.match(text(), /Phân bố XP tuần/);
  assert.match(text(), /Cập nhật 14:20/);
  assert.doesNotMatch(text(), /Dữ liệu mẫu/);
  assert.doesNotMatch(text(), /\b(LB|OQ|PD|KT)-\d/, 'no spec codes on screen');
  assert.equal(rows().filter(tr => tr.textContent?.includes('Cần xem')).length, 2);
});

test('D2: "Cần xem" filters the board; the drawer shows the week, the reasons and what the learner sees', async () => {
  serve({ CURRENT: ok(fixtureBoard('CURRENT')) });
  await render();
  await waitFor(() => rows().length, 'board');
  await click(strip('Cần xem'));
  assert.equal(rows().length, 2);
  assert.match(text(), /2\/34 người, hạng vẫn tính trên cả bảng/);
  await click(byName('Lý Ngọc Mai'));
  const dialog = document.querySelector('[role="dialog"]')!;
  assert.match(dialog.textContent!, /Ôn thẻ dồn dập/);
  assert.match(dialog.textContent!, /Cần thêm 1\.003 XP để vượt hạng 1/);
  assert.equal(dialog.querySelector('a')!.getAttribute('href'), '/learners/143');
  assert.ok(dialog.textContent!.includes('Võ Khánh Mai'), 'the top of the board is in the phone preview');
});

test('D3: the previous week is a separate snapshot: settled, no trend, no time left', async () => {
  serve({ CURRENT: ok(fixtureBoard('CURRENT')), PREVIOUS: ok(fixtureBoard('PREVIOUS')) });
  await render();
  await waitFor(() => rows().length, 'current');
  await click(byName('Tuần trước'));
  await waitFor(() => text().includes('Chốt 00:02 19/10'), 'previous');
  assert.ok(requests.includes('GET /api/admin/leaderboards?week=PREVIOUS'));
  assert.match(text(), /Tuần 12\/10 – 18\/10Đã chốt/);
  assert.equal(document.querySelectorAll('tbody [title*="00:00 hôm nay"]').length, 0, 'no trend column content');
});

test('D4: an API that is not there yet is named in the error; an empty Monday board explains itself', async () => {
  serve({ CURRENT: () => json(404, { statusCode: 404, error: 'NOT_FOUND', data: null }) });
  await render();
  await waitFor(() => document.querySelector('[role="alert"]'), 'error');
  assert.match(text(), /Không tải được bảng xếp hạng\. Máy chủ này chưa có API bảng xếp hạng\./);
  serve({ CURRENT: ok({ ...fixtureBoard('CURRENT'), participants: 0, totalXp: 0, entries: [] }) });
  await click(byName('Thử lại'));
  await waitFor(() => text().includes('Chưa ai có XP trong tuần này'), 'empty board');
  assert.equal(document.querySelector('[aria-label="Phân bố trong tuần"]'), null);
});
