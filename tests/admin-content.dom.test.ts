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
  return extra(c) ?? (c.path === '/api/admin/topics/hidden' ? ok([]) : undefined);
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
  assert.equal(button('Sửa').disabled, false, 'topic edit is live (PUT /api/admin/topics/{id})');
  assert.equal(button('Xóa').disabled, false, 'topic delete is live (DELETE /api/admin/topics/{id})');
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

test('D2. opening a dictionary word by id calls GET /api/words/{id} instead of lookup?q=', async () => {
  serve((c) => {
    if (c.path === '/api/words/suggest') return ok({ data: [{ id: 42, word: 'apple' }], meta: { page: 0, size: 30, total: 1, pages: 1 } });
    if (c.method === 'POST' && c.path === '/api/words/lookup') return ok([{ ...APPLE, wordId: 42 }]);
    if (c.method === 'GET' && c.path === '/api/words/42') return ok({ ...APPLE, wordId: 42 });
    return undefined;
  });
  await render(React.createElement(DictionaryPage, { rest: ['42'] }));
  await waitFor(() => text().includes('quả táo'), 'drawer loaded by id');
  assert.ok(calls.some((c) => c.method === 'GET' && c.path === '/api/words/42'));
  assert.equal(calls.some((c) => c.method === 'GET' && c.path === '/api/words/lookup'), false);
});

test('T5. topic edit sends PUT /api/admin/topics/71; Ẩn (soft delete) needs a 10+ char reason and POSTs /hide', async () => {
  serve(contentApi((c) => {
    if (c.method === 'PUT' && c.path === '/api/admin/topics/71') return ok({ ...CHILD, ...(c.body as object) });
    if (c.method === 'POST' && c.path === '/api/admin/topics/71/hide') {
      return ok({ id: 71, name: 'Degree', translation: null, parentId: 70, parentName: 'Adverb', hiddenAt: '2026-11-26T03:00:00Z', hiddenBy: 'a@b', reason: (c.body as { reason: string }).reason, subtopics: 0, learners: 2 });
    }
    return undefined;
  }));
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('quite'), 'items');

  await click(button('Sửa'));
  await type(inputLabelled('Tên tiếng Việt'), 'Mức độ');
  await click(button('Lưu'));
  await waitFor(() => calls.some((c) => c.method === 'PUT'), 'PUT');
  assert.deepEqual(calls.find((c) => c.method === 'PUT')!.body, { name: 'Degree', translation: 'Mức độ', description: null, descriptionTranslation: null });

  await waitFor(() => !text().includes('Sửa chủ đề Degree'), 'edit dialog closed');
  // The topic header no longer offers a hard delete: Ẩn is the delete (OQ-CNT-01); purge lives in "Đã ẩn".
  assert.equal([...document.querySelectorAll('header button')].some((b) => b.textContent?.trim() === 'Xóa'), false);
  await click(button('Ẩn'));
  assert.ok(text().includes('Thẻ người học đã học vẫn được ôn theo lịch'));
  await click(button('Ẩn chủ đề'));
  assert.equal(calls.some((c) => c.path.endsWith('/hide')), false, 'no reason, no request');
  assert.ok(text().includes('Tối thiểu 10 ký tự.'));
  await type(document.querySelector('textarea')!, 'Trùng với chủ đề Adverb khác.');
  await click(button('Ẩn chủ đề'));
  await waitFor(() => text().includes('Đã ẩn chủ đề Degree'), 'hidden toast');
  assert.deepEqual(calls.find((c) => c.path === '/api/admin/topics/71/hide')!.body, { reason: 'Trùng với chủ đề Adverb khác.' });
});

test('T8. "Đã ẩn" lists hidden topics: restore POSTs /restore; purge is offered only when nobody studied it', async () => {
  let hidden = [
    { id: 71, name: 'Degree', translation: 'Mức độ', parentId: 70, parentName: 'Adverb', hiddenAt: '2026-11-26T03:00:00Z', hiddenBy: 'qa@snapvocab.local', reason: 'Trùng với chủ đề khác.', subtopics: 0, learners: 2 },
    { id: 72, name: 'Manner', translation: null, parentId: 70, parentName: 'Adverb', hiddenAt: '2026-11-25T03:00:00Z', hiddenBy: null, reason: 'Tạo nhầm, chưa ai học.', subtopics: 0, learners: 0 },
  ];
  serve(contentApi((c) => {
    if (c.path === '/api/admin/topics/hidden') return ok(hidden);
    if (c.method === 'POST' && c.path === '/api/admin/topics/71/restore') { hidden = hidden.filter((h) => h.id !== 71); return ok(CHILD); }
    return undefined;
  }));
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => button('Đã ẩn (2)'), 'hidden count');
  await click(button('Đã ẩn (2)'));
  assert.ok(text().includes('Lý do: Trùng với chủ đề khác.') && text().includes('2 người học có dữ liệu'));
  const purges = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Xóa vĩnh viễn') as HTMLButtonElement[];
  assert.deepEqual(purges.map((b) => b.disabled), [true, false], 'studied: hide only; never studied: purge allowed');
  await click([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Khôi phục') as HTMLElement);
  await waitFor(() => calls.some((c) => c.path === '/api/admin/topics/71/restore'), 'restore');
  await waitFor(() => button('Đã ẩn (1)'), 'list refreshed');
});

test('T6. editing an item prefills it (main.meaning moved home) and PUTs the schema-shaped body', async () => {
  const items = page([{ topicItemId: 3, createdAt: '2026-09-10T00:00:00Z', main: { word: 'such', translation: 'như vậy', meaning: 'of the type mentioned' }, examples: [{ content: 'Such a day.' }] }]);
  serve((c) => {
    if (c.method === 'GET' && c.path === '/api/topics/71') return ok(items);
    if (c.method === 'PUT' && c.path === '/api/topics/71/items/3') return ok({ topicItemId: 3, createdAt: '', ...(c.body as object) });
    return contentApi()(c);
  });
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('such'), 'items');
  const row = [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('such')) as HTMLElement;
  await click(row);
  await click(button('Sửa mục'));
  assert.ok(text().includes('main.meaning → meaning.meaning'), 'the move is announced');
  await type(inputLabelled('translation'), 'như thế');
  await click(button('Lưu mục từ'));
  await waitFor(() => calls.some((c) => c.method === 'PUT'), 'PUT');
  assert.deepEqual(calls.find((c) => c.method === 'PUT')!.body, {
    main: { word: 'such', translation: 'như thế' },
    meaning: { meaning: 'of the type mentioned' },
    examples: [{ content: 'Such a day.' }],
  });
});

test('T7. deleting a studied system item shows why the server refused', async () => {
  serve(contentApi((c) => {
    if (c.method === 'DELETE' && c.path === '/api/topics/71/items/1') {
      return new Response(JSON.stringify({ statusCode: 409, error: 'TOPIC_ITEM_HAS_LEARNING_DATA', data: { learners: 1 } }), { status: 409, headers: { 'content-type': 'application/json' } });
    }
    return undefined;
  }));
  await render(React.createElement(TopicsPage, { rest: ['1', '70', '71'] }));
  await waitFor(() => text().includes('very'), 'items');
  await click([...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('very')) as HTMLElement);
  await click(button('Xóa mục'));
  const confirm = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Xóa mục').pop()!;
  await click(confirm);
  await waitFor(() => text().includes('1 người học đã học mục từ này'), '409 shown');
});

const WORD = { ...APPLE, wordId: 42, version: 2, meanings: [{ ...APPLE.meanings[0], id: 7, pos: 'Danh từ' }] };

test('D3. editing a word PUTs ids, POS codes and the version; a version conflict offers to reload', async () => {
  let conflict = false;
  serve((c) => {
    if (c.method === 'GET' && c.path === '/api/words/42') return ok(WORD);
    if (c.method === 'PUT' && c.path === '/api/admin/words/42') {
      if (conflict) return new Response(JSON.stringify({ statusCode: 409, error: 'VERSION_CONFLICT', data: { currentVersion: 3 } }), { status: 409, headers: { 'content-type': 'application/json' } });
      return ok({ ...WORD, version: 3 });
    }
    if (c.path === '/api/words/suggest') return ok({ data: [], meta: { page: 0, size: 30, total: 0, pages: 0 } });
    return undefined;
  });
  await render(React.createElement(DictionaryPage, { rest: ['42'] }));
  await waitFor(() => text().includes('quả táo'), 'drawer');
  await click(button('Sửa từ'));
  await type(document.querySelector('input[aria-label="Bản dịch tiếng Việt 1"]') as HTMLInputElement, 'trái táo');
  await click(button('Lưu'));
  await waitFor(() => calls.some((c) => c.method === 'PUT'), 'PUT');
  assert.deepEqual(calls.find((c) => c.method === 'PUT')!.body, {
    version: 2,
    pronunciations: [{ ipa: '/ˈæpəl/', region: 'US' }],
    translations: ['trái táo'],
    meanings: [{ id: 7, pos: 'N', definitionLang: 'en', definition: 'A round fruit.', example: 'An apple a day.' }],
  });

  conflict = true;
  await waitFor(() => button('Sửa từ'), 'back to view');
  await click(button('Sửa từ'));
  await click(button('Lưu'));
  await waitFor(() => text().includes('Từ này vừa được sửa ở phiên khác'), 'conflict shown');
  assert.ok(button('Tải bản mới'));
});

test('D4. soft delete sends the reason; a deleted word offers restore instead of edit', async () => {
  let deleted = false;
  serve((c) => {
    if (c.method === 'GET' && c.path === '/api/words/42') return ok({ ...WORD, deletedAt: deleted ? '2026-11-25T10:00:00Z' : null });
    if (c.method === 'DELETE' && c.path === '/api/admin/words/42') { deleted = true; return ok({ ...WORD, deletedAt: '2026-11-25T10:00:00Z' }); }
    if (c.method === 'POST' && c.path === '/api/admin/words/42/restore') { deleted = false; return ok(WORD); }
    if (c.path === '/api/words/suggest') return ok({ data: [], meta: { page: 0, size: 30, total: 0, pages: 0 } });
    return undefined;
  });
  await render(React.createElement(DictionaryPage, { rest: ['42'] }));
  await waitFor(() => text().includes('quả táo'), 'drawer');
  await click(button('Xóa mềm'));
  await type(document.querySelector('textarea') as HTMLTextAreaElement, 'Nhập trùng từ khác.');
  const confirm = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Xóa mềm').pop()!;
  await click(confirm);
  await waitFor(() => text().includes('Đã xóa mềm'), 'deleted state');
  assert.deepEqual(calls.find((c) => c.method === 'DELETE')!.body, { reason: 'Nhập trùng từ khác.' });
  assert.equal(button('Sửa từ'), undefined, 'no edit while deleted');
  await click(button('Khôi phục'));
  const restore = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Khôi phục').pop()!;
  await click(restore);
  await waitFor(() => button('Sửa từ'), 'restored');
  assert.ok(calls.some((c) => c.method === 'POST' && c.path === '/api/admin/words/42/restore'));
});
