import './dom-setup';
import test, { after, afterEach } from 'node:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopicsPage } from '../src/features/admin-topics/TopicsPage';
import { DictionaryPage } from '../src/features/admin-dictionary/DictionaryPage';

/** Wire-level checks against the REAL endpoints (no backend here): method, path, query and body. */
type Call = { method: string; path: string; query: URLSearchParams; body: unknown };
let calls: Call[] = [];
const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ statusCode: status, error: null, message: 'OK', data }), { status, headers: { 'content-type': 'application/json' } });
function serve(handler: (c: Call) => Response | undefined) {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const call = { method: init?.method ?? 'GET', path: url.pathname, query: url.searchParams, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const res = handler(call);
    if (!res) throw new Error(`unexpected ${call.method} ${call.path}?${call.query}`);
    return res;
  }) as typeof fetch;
}

const page = <T,>(data: T[]) => ({ data, meta: { page: 0, size: 100, total: data.length, pages: 1 } });
const topic = (id: number, name: string, extra: object = {}) => ({ id, name, translation: null, description: null, descriptionTranslation: null, parentId: null, activeTemplateId: 5, activeTemplateName: 'Classic', activeTemplateCode: 'STANDARD', hasChildren: false, createdAt: '', updatedAt: '', ...extra });
const COLLECTIONS = [{ id: 1, name: 'Vocabulary', translation: 'Từ vựng', type: 'SYSTEM', ownerId: null, createdAt: '', updatedAt: '' }];
const ROOT = topic(70, 'Adverb', { translation: 'trạng từ', hasChildren: true });
const CHILD = topic(71, 'Degree', { parentId: 70 });
const SCHEMA = {
  schemaId: 278, topicId: 71, schemaName: 'DEFAULT_ENGLISH', shared: true, usageCount: 201,
  groups: [
    { groupId: 394, name: 'main', label: 'Thông tin chính', multiple: false, position: 1, attributes: ['word', 'phonetic', 'translation', 'level'].map((name, i) => ({ attributeId: i + 1, name, label: name, dataType: 'TEXT', required: name === 'word', position: i })) },
    { groupId: 395, name: 'meaning', label: 'Ý nghĩa', multiple: false, position: 2, attributes: [{ attributeId: 10, name: 'meaning', label: 'Giải nghĩa', dataType: 'TEXT', required: true, position: 0 }] },
    { groupId: 396, name: 'examples', label: 'Ví dụ câu', multiple: true, position: 3, attributes: [{ attributeId: 11, name: 'content', label: 'Nội dung ví dụ', dataType: 'TEXT', required: true, position: 0 }, { attributeId: 12, name: 'translation', label: 'Dịch câu ví dụ', dataType: 'TEXT', required: false, position: 1 }] },
  ],
};
const ITEMS = page([
  { topicItemId: 1, createdAt: '2026-09-10T00:00:00Z', main: { word: 'very', phonetic: '/ˈveri/', translation: 'rất', level: 'A1' }, meaning: { meaning: 'to a great degree' }, examples: [{ content: 'Very good.' }] },
  { topicItemId: 2, createdAt: '2026-09-10T00:00:00Z', main: { word: 'quite', level: 'B1' }, meaning: { meaning: 'fairly' } },
]);
const APPLE = { exists: true, word: 'apple', langCode: 'en', pronunciations: [{ ipa: '/ˈæpəl/', region: 'US' }], meanings: [{ definition: 'A round fruit.', definitionLang: 'en', example: 'An apple a day.', pos: 'noun', subPos: null, links: null }], translations: [{ langCode: 'vi', translation: 'quả táo' }], relations: [] };

const contentApi = (extra: (c: Call) => Response | undefined = () => undefined) => (c: Call) => {
  if (c.path === '/api/collections/system') return ok(COLLECTIONS);
  if (c.method === 'GET' && c.path === '/api/collections/1/topics') return ok(page(c.query.get('parentId') === '70' ? [CHILD] : [ROOT]));
  if (c.path === '/api/topics/71' && c.method === 'GET') return ok(ITEMS);
  if (c.path === '/api/topics/70' && c.method === 'GET') return ok(page([]));
  if (c.path.endsWith('/schema')) return ok(SCHEMA);
  return extra(c);
};

let root: Root | undefined; let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); root = undefined; document.body.innerHTML = ''; });
after(() => GlobalRegistrator.unregister());
async function render(el: React.ReactElement) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => root!.render(React.createElement(QueryClientProvider, { client: client! }, el)));
}
async function waitFor(check: () => unknown, label: string) {
  for (let i = 0; i < 60; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    if (check()) return;
  }
  assert.fail(`timed out: ${label}`);
}
const text = () => document.body.textContent ?? '';
const button = (name: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name) as HTMLButtonElement;
const inputLabelled = (label: string) => {
  const l = [...document.querySelectorAll('label')].find((x) => x.textContent?.replace(' *', '').trim() === label)!;
  return document.getElementById(l.htmlFor) as HTMLInputElement;
};
async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const click = (el: HTMLElement) => act(async () => { el.click(); });

test('T1. deep link /topics/1/70/71 loads the real tree, items and schema; coverage and level come from the items', async () => {
  serve(contentApi());
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('quite'), 'items');
  assert.ok(calls.some((c) => c.path === '/api/collections/1/topics' && c.query.get('parentId') === '70'), 'children of the root');
  assert.equal(calls.find((c) => c.path === '/api/topics/71')?.query.get('size'), '500');
  assert.ok(text().includes('Vocabulary') && text().includes('Adverb') && text().includes('Mẫu thẻ: Classic'));
  assert.ok(text().includes('Đủ dữ liệu'));
  assert.match(text(), /Cấp độ: A1 1B1 1/);
  assert.equal(button('Sửa').disabled, true, 'topic edit needs an API');
});

test('T2. add item: dictionary prefill, then POST /api/topics/71/items with the schema-shaped body', async () => {
  serve(contentApi((c) => {
    if (c.path === '/api/words/lookup' && c.query.get('q') === 'apple') return ok(APPLE);
    if (c.method === 'POST' && c.path === '/api/topics/71/items') return ok({ topicItemId: 9, createdAt: '', ...(c.body as object) }, 201);
    return undefined;
  }));
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('quite'), 'items');
  await click(button('Thêm mục từ'));
  await type(inputLabelled('word'), 'apple');
  await click(button('Điền từ từ điển'));
  await waitFor(() => text().includes('Đã điền'), 'prefill note');
  await click(button('Thêm vào chủ đề'));
  await waitFor(() => calls.some((c) => c.method === 'POST'), 'POST');
  assert.deepEqual(calls.find((c) => c.method === 'POST')!.body, {
    main: { word: 'apple', phonetic: '/ˈæpəl/', translation: 'quả táo' },
    meaning: { meaning: 'A round fruit.' },
    examples: [{ content: 'An apple a day.' }],
  });
  await waitFor(() => calls.filter((c) => c.path === '/api/topics/71' && c.method === 'GET').length >= 2, 'items refetched');
});

test('T3. a duplicate word is flagged and required fields block the request', async () => {
  serve(contentApi());
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('quite'), 'items');
  await click(button('Thêm mục từ'));
  await type(inputLabelled('word'), 'Very');
  assert.ok(text().includes('Chủ đề đã có "very"'));
  await click(button('Thêm vào chủ đề'));
  assert.ok(text().includes('Bắt buộc.'));
  assert.equal(calls.some((c) => c.method === 'POST'), false);
});

test('T4. create root topic POSTs to the collection; deleting a non-empty collection is blocked', async () => {
  serve(contentApi((c) => (c.method === 'POST' && c.path === '/api/collections/1/topics' ? ok(topic(300, 'Animals')) : undefined)));
  await render(React.createElement(TopicsPage, { rest: ['1'] }));
  await waitFor(() => text().includes('Adverb'), 'tree');
  await click(button('Thêm chủ đề gốc'));
  await type(inputLabelled('Tên (tiếng Anh)'), 'Animals');
  await type(inputLabelled('Tên tiếng Việt'), 'Động vật');
  await click(button('Tạo chủ đề'));
  await waitFor(() => calls.some((c) => c.method === 'POST'), 'POST topic');
  assert.deepEqual(calls.find((c) => c.method === 'POST')!.body, { name: 'Animals', translation: 'Động vật', description: null, descriptionTranslation: null, parentId: null });
  await click(button('Xóa'));
  assert.ok(text().includes('xóa cứng'));
  assert.equal(button('Xóa vĩnh viễn').disabled, true);
});

test('D1. dictionary browses by letter: suggest for the prefix, one batch lookup per page', async () => {
  serve((c) => {
    if (c.path === '/api/words/suggest') return ok({ data: [{ id: 1, word: `${c.query.get('q')}pple` }], meta: { page: 0, size: 30, total: 1, pages: 1 } });
    if (c.method === 'POST' && c.path === '/api/words/lookup') return ok([{ ...APPLE, word: (c.body as { words: string[] }).words[0], pronunciations: [] }]);
    return undefined;
  });
  await render(React.createElement(DictionaryPage, { rest: [] }));
  await waitFor(() => text().includes('apple'), 'rows');
  assert.equal(calls[0].query.get('q'), 'a');
  assert.deepEqual(calls[1].body, { words: ['apple'] });
  assert.ok(text().includes('Thiếu IPA'));
  await click(button('b'));
  await waitFor(() => text().includes('bpple'), 'letter b');
  assert.ok(calls.some((c) => c.path === '/api/words/suggest' && c.query.get('q') === 'b'));
});
