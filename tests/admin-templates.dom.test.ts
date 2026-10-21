import './dom-setup';
import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { TemplatesPage } from '../src/features/admin-templates/TemplatesPage';
import { TemplateEditor } from '../src/features/admin-templates/TemplateEditor';
import type { PreviewState } from '../src/features/admin-templates/TemplateLibrary';
import { normalizeSchema } from '../src/domains/admin-templates/mappers';
import { navigate, usePathname } from '../src/lib/router';

/** Wire-level: the real read endpoints, plus the proposed writes (templates_ui.md §8) when the editor is editable. */
const json = (f: string) => JSON.parse(readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8'));
const SCHEMAS = json('templates-schemas.json');
const ITEMS = json('templates-items.json');
const page = <T,>(data: T[], size = 100) => ({ data, meta: { page: 0, size, total: data.length, pages: 1 } });
const topic = (id: number, name: string, parentId: number | null, activeTemplateId: number, hasChildren = false) => ({
  id, name, translation: null, description: null, descriptionTranslation: null, parentId, activeTemplateId, activeTemplateName: null, activeTemplateCode: null, hasChildren, createdAt: '', updatedAt: '',
});
const ROOT = topic(1, 'Pronoun', null, 1, true);
const CHILDREN = [topic(2, 'People Things and Ideas', 1, 1), topic(3, 'Possession', 1, 3)];
const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ statusCode: status, error: null, message: 'OK', data }), { status, headers: { 'content-type': 'application/json' } });

type Call = { method: string; path: string; query: URLSearchParams; body: unknown };
let calls: Call[] = [];
const originalFetch = globalThis.fetch;
function serve(extra: (c: Call) => Response | undefined = () => undefined) {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const c = { method: init?.method ?? 'GET', path: url.pathname, query: url.searchParams, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(c);
    const res = extra(c) ?? (c.method !== 'GET' ? undefined
      : c.path === '/api/schemas' ? ok(SCHEMAS)
        : c.path === '/api/collections/system' ? ok([{ id: 1, name: 'Vocabulary', translation: 'Từ vựng', type: 'SYSTEM', ownerId: null, createdAt: '', updatedAt: '' }])
          : c.path === '/api/collections/1/topics' ? ok(page(c.query.get('parentId') === '1' ? CHILDREN : [ROOT]))
            : c.path === '/api/topics/2' ? ok(page(ITEMS, 500))
              : c.path === '/api/topics/2/schema' ? ok({ schemaId: 278, topicId: 2, schemaName: 'Tiếng Anh Tiêu Chuẩn', shared: true, usageCount: 201, groups: [] })
                : undefined);
    if (!res) throw new Error(`unexpected ${c.method} ${c.path}?${c.query}`);
    return res;
  }) as typeof fetch;
}

let root: Root | undefined;
let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); root = undefined; document.body.innerHTML = ''; globalThis.fetch = originalFetch; });
after(() => GlobalRegistrator.unregister());
async function render(el: React.ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client: client! }, el)));
}
async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 80; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out: ${label}`);
}
const text = () => document.body.textContent ?? '';
const button = (name: string) => [...document.querySelectorAll('button')].find((b) => !b.closest('[hidden]') && (b.textContent?.trim() === name || b.getAttribute('aria-label') === name))!;
async function click(el: Element) { await act(async () => { (el as HTMLElement).click(); }); }
async function type(el: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

function Routed() {
  return React.createElement(TemplatesPage, { sub: usePathname().split('/')[2] });
}

test('DT1 library: real templates drawn on a real word, Quiz usage, the LISTENING leak and the off-schema row; reads only', async () => {
  serve();
  act(() => navigate('/templates'));
  await render(React.createElement(Routed));
  await waitFor(() => text().includes('3 mục') && document.querySelectorAll('article').length === 3, 'library');
  await waitFor(() => text().includes('such'), 'preview word');
  const cards = [...document.querySelectorAll('article')];
  assert.deepEqual(cards.map((a) => a.getAttribute('aria-label')), ['Thẻ Chuẩn (Chữ -> Nghĩa)', 'Luyện Nghe (Âm thanh -> Chữ)', 'Đảo Mặt Thẻ (Nghĩa -> Đoán từ)']);
  assert.match(cards[0].textContent!, /Mặc định.*Mọi thẻ học của schema Tiếng Anh Tiêu Chuẩn.*2 chủ đề chọn mẫu này/);
  assert.match(cards[1].textContent!, /Ứng dụng chưa vẽ mẫu này.*Chưa chủ đề nào chọn.*lộ luôn đáp án/);
  assert.match(cards[2].textContent!, /1 chủ đề chọn mẫu này/);
  const cell = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) => b.textContent?.endsWith(label))!;
  assert.equal(cell('Cần rà').textContent, '1Cần rà');
  assert.equal(cell('Vẽ thẻ học').textContent, '1Vẽ thẻ học');
  await click(cell('Cần rà'));
  assert.equal(document.querySelectorAll('article').length, 1);
  assert.match(text(), /main\.meaningNgoài schema/);
  assert.ok(calls.every((c) => c.method === 'GET'), 'no writes');
  assert.ok(!calls.some((c) => c.path.startsWith('/api/admin')), 'no admin API needed to read');
});

test('DT2 deep link opens the read-only editor with checks and data counts on the preview topic', async () => {
  serve();
  act(() => navigate('/templates/2'));
  await render(React.createElement(Routed));
  const heading = () => [...document.querySelectorAll('h1')].find((h) => !h.closest('[hidden]'))?.textContent ?? '';
  await waitFor(() => heading().includes('Luyện Nghe') && text().includes('Trên “People Things and Ideas”, 3 mục'), 'editor');
  assert.match(text(), /Quiz Trắc nghiệm phản xạ.*Quiz Ghép đôi từ vựng.*Quiz Điền từ vào chỗ trống/);
  assert.match(text(), /Nghe phát âm.*lộ luôn đáp án/);
  assert.match(text(), /Định nghĩa tiếng Anh: 3 mục có dữ liệu nằm ngoài meaning\.meaning/);
  assert.ok(!button('Lưu thay đổi'), 'release build is read-only');
  assert.match(text(), /Ứng dụng đang vẽ thẻ học bằng “Thẻ Chuẩn \(Chữ -> Nghĩa\)”/);
});

function editor(id: number, onSaved: (m: string) => void) {
  const schema = normalizeSchema(SCHEMAS[0]);
  const preview: PreviewState = { branches: [], topic: CHILDREN[0], schemaId: 278, items: ITEMS, index: 0, loading: false, setTopic: () => {}, setIndex: () => {} };
  return React.createElement(TemplateEditor, {
    template: schema.templates.find((t) => t.id === id)!, schema, quizTopics: [], topicsReady: true, systemTopics: 3, forks: 0, preview,
    editable: true, refreshing: false, onRefresh: () => {}, onBack: () => {}, onSaved, onDirtyChange: () => {},
  });
}

test('DT3 editing sends the proposed PUT with the whole renumbered element list; a draft Quiz cannot read is not sent', async () => {
  let saved = '';
  serve((c) => (c.method === 'PUT' && c.path === '/api/admin/templates/1' ? ok({}) : undefined));
  await render(editor(1, (m) => { saved = m; }));
  assert.equal(button('Lưu thay đổi').disabled, true);

  await click(button('Phiên âm'));
  const labelInput = [...document.querySelectorAll<HTMLInputElement>('input')].find((i) => i.value === 'Phiên âm')!;
  await type(labelInput, 'IPA');
  const add = document.querySelector<HTMLSelectElement>('select[aria-label="Thêm trường vào mặt sau"]')!;
  await type(add, '1564');
  await click(button('Lưu thay đổi'));
  await waitFor(() => saved, 'saved');
  const put = calls.find((c) => c.method === 'PUT')!;
  const body = put.body as { version: null; name: string; elements: { position: number; side: string; field: { fieldLabel: string; schemaAttributeId: number } | null }[] };
  assert.equal(body.version, null);
  assert.equal(body.name, 'Thẻ Chuẩn (Chữ -> Nghĩa)');
  assert.deepEqual(body.elements.map((e) => e.position), Array.from({ length: 14 }, (_, i) => i));
  assert.ok(body.elements.some((e) => e.field?.fieldLabel === 'IPA'));
  assert.deepEqual([body.elements[13].side, body.elements[13].field?.schemaAttributeId], ['BACK', 1564]);
  assert.equal(saved, 'Đã lưu mẫu thẻ.');

  calls = [];
  await click(button('Xóa Từ vựng'));
  await click(button('Lưu thay đổi'));
  assert.match(text(), /Trắc nghiệm phản xạ: Chưa trường nào mang vai trò “Từ vựng chính”/);
  assert.ok(!calls.some((c) => c.method === 'PUT'), 'blocked before the request');
});

test('DT4 Đặt làm mặc định states who it reaches, warns about the leak, then posts with the version', async () => {
  let saved = '';
  serve((c) => (c.method === 'POST' && c.path === '/api/admin/templates/2/default' ? ok({}) : undefined));
  await render(editor(2, (m) => { saved = m; }));
  await click(button('Đặt làm mặc định'));
  const dialog = document.querySelector('[role="dialog"]')!;
  assert.match(dialog.textContent!, /mọi thẻ học của schema Tiếng Anh Tiêu Chuẩn bằng mẫu này: 3 chủ đề hệ thống.*“Thẻ Chuẩn \(Chữ -> Nghĩa\)” thôi là mặc định.*Quiz không đổi.*lộ luôn đáp án/);
  await click([...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Đặt làm mặc định')!);
  await waitFor(() => saved, 'default set');
  assert.deepEqual(calls.find((c) => c.method === 'POST')!.body, { version: null });
});
