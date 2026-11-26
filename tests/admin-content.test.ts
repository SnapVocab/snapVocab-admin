import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contentErrorText, coverage, draftFromItem, duplicateOf, duplicateWords, emptyDraft, offSchemaFields, fillFromLookup, itemGaps, itemSummary,
  meaningsByPos, nameError, posCode, toCreatePayload, toUpdateWord, toWordDraft, validateDraft, viGloss, wordDraftErrors, wordGaps,
} from '../src/domains/admin-content/mappers';
import { ApiClientError } from '../src/lib/api-client';
import type { LookupResultDTO, SchemaAttributeGroupDTO, TopicItemData } from '../src/domains/admin-content/types';

/** DEFAULT_ENGLISH as stored in the local DB clone (schema 278). */
const attr = (name: string, required = false, dataType: 'TEXT' | 'AUDIO' | 'IMAGE' | 'NUMBER' = 'TEXT') =>
  ({ attributeId: 0, name, label: name, dataType, required, position: 0 });
const SCHEMA: SchemaAttributeGroupDTO[] = [
  { groupId: 394, name: 'main', label: 'Thông tin chính', multiple: false, position: 1,
    attributes: ['word', 'phonetic', 'audio', 'translation', 'level', 'definition_translation', 'base_word', 'head', 'definition'].map((n) => attr(n, n === 'word', n === 'audio' ? 'AUDIO' : 'TEXT')) },
  { groupId: 395, name: 'meaning', label: 'Ý nghĩa & Ví dụ', multiple: false, position: 2, attributes: [attr('meaning', true), attr('example'), attr('image', false, 'IMAGE')] },
  { groupId: 396, name: 'examples', label: 'Ví dụ câu', multiple: true, position: 3, attributes: [attr('content', true), attr('translation')] },
];

/** The first real topic item ("such"), shaped as GET /api/topics/{id} returns it. */
const SUCH: TopicItemData = {
  topicItemId: 1, createdAt: '2026-09-10T00:00:00Z',
  main: { word: 'such', phonetic: '/ˈsətʃ/', translation: 'như vậy', level: 'C2', definition_translation: 'dùng để chỉ…' },
  meaning: { meaning: 'used to refer to something or someone that you were just talking about' },
  examples: [{ content: 'Our lunch was such that we don’t really need an evening meal.', translation: 'Bữa trưa…' }, { content: 'He is an employee…' }],
};

test('C1. item summary reads DEFAULT_ENGLISH groups; gaps and coverage count what a card would miss', () => {
  const s = itemSummary(SUCH);
  assert.deepEqual([s.word, s.phonetic, s.translation, s.level, s.examples], ['such', '/ˈsətʃ/', 'như vậy', 'C2', 2]);
  assert.deepEqual(itemGaps(s), []);
  const bare = itemSummary({ topicItemId: 2, createdAt: '', main: { word: 'that' }, meaning: { meaning: 'x' } });
  assert.deepEqual(itemGaps(bare), ['translation', 'phonetic', 'example']);
  const c = coverage([s, bare]);
  assert.deepEqual(c, { total: 2, complete: 1, by: { meaning: 0, translation: 1, phonetic: 1, example: 1 } });
  assert.equal(duplicateOf([s, bare], '  SUCH ')?.id, 1);
  assert.equal(duplicateOf([s], ''), undefined);
});

test('C2. draft: required fields validated, blank repeated rows ignored, payload drops blanks', () => {
  const d = emptyDraft(SCHEMA);
  assert.deepEqual(Object.keys(d), ['main', 'meaning', 'examples']);
  assert.equal(d.examples.length, 0);
  d.examples.push({ content: '', translation: '' }, { content: '', translation: 'chỉ có dịch' });
  const errors = validateDraft(SCHEMA, d);
  assert.deepEqual(Object.keys(errors).sort(), ['examples.1.content', 'main.0.word', 'meaning.0.meaning']);
  d.main[0].word = ' apple ';
  d.meaning[0].meaning = 'a round fruit';
  d.examples[1].content = 'I ate an apple.';
  assert.deepEqual(validateDraft(SCHEMA, d), {});
  assert.deepEqual(toCreatePayload(SCHEMA, d), {
    main: { word: 'apple' },
    meaning: { meaning: 'a round fruit' },
    examples: [{ content: 'I ate an apple.', translation: 'chỉ có dịch' }],
  });
});

const APPLE: LookupResultDTO = {
  exists: true, word: 'apple', langCode: 'en',
  pronunciations: [{ ipa: '[ˈæpɫ̩]', region: null }, { ipa: '/ˈæpəl/', region: 'US' }],
  meanings: [{ definition: 'A common, round fruit.', definitionLang: 'en', example: 'An apple a day…', pos: 'noun', subPos: null, links: null },
    { definition: 'To apple-polish.', definitionLang: 'en', example: null, pos: 'verb', subPos: null, links: null }],
  translations: [{ langCode: 'fr', translation: 'pomme' }, { langCode: 'vi', translation: 'quả táo' }],
  relations: [],
};

test('C3. dictionary prefill fills only empty fields, in the shape real items use', () => {
  const d = emptyDraft(SCHEMA);
  d.main[0].word = 'apple';
  d.main[0].translation = 'trái táo';   // operator input wins
  const { draft, filledFields } = fillFromLookup(d, APPLE);
  assert.equal(draft.main[0].phonetic, '/ˈæpəl/', 'US IPA, wrapped in slashes like stored items');
  assert.equal(draft.main[0].translation, 'trái táo');
  assert.equal(draft.meaning[0].meaning, 'A common, round fruit.', 'English definition goes to meaning.meaning');
  assert.deepEqual(draft.examples, [{ content: 'An apple a day…', translation: '' }]);
  assert.deepEqual(filledFields, ['Phiên âm', 'Giải nghĩa', '1 ví dụ']);
  assert.equal(d.main[0].phonetic, '', 'input draft untouched');
});

test('C4. word gaps ignore the Vietnamese gloss; meanings group by part of speech; names are 2–100 chars', () => {
  assert.deepEqual(wordGaps(APPLE), []);
  assert.deepEqual(wordGaps({ ...APPLE, pronunciations: [], meanings: [] }), ['ipa', 'meaning']);
  assert.deepEqual(wordGaps({ ...APPLE, meanings: [{ ...APPLE.meanings[1] }] }), ['example']);
  assert.deepEqual(meaningsByPos(APPLE).map(([pos, ms]) => [pos, ms.length]), [['noun', 1], ['verb', 1]]);
  assert.equal(nameError(' a '), 'Tối thiểu 2 ký tự.');
  assert.equal(nameError('Động vật'), null);
  assert.equal(nameError('x'.repeat(101)), 'Tối đa 100 ký tự.');
});

test('C5. real system items: meaning lives in main.meaning (outside the schema); duplicates are counted per word', () => {
  // 15,663 of 15,664 items in the DB clone look like this: no meaning group, the definition under main.meaning.
  const real: TopicItemData = { topicItemId: 3, createdAt: '', main: { word: 'Intensely', phonetic: '/ɪnˈtensli/', translation: 'nghiêm túc', meaning: 'with great force' }, examples: [{ content: 'x' }] };
  const s = itemSummary(real);
  assert.equal(s.meaning, 'with great force', 'summary falls back to main.meaning');
  assert.deepEqual(itemGaps(s), []);
  assert.deepEqual(offSchemaFields(real, SCHEMA), ['main.meaning']);
  assert.deepEqual(offSchemaFields(SUCH, SCHEMA), [], 'schema-shaped item is clean');
  assert.deepEqual(itemGaps(itemSummary({ topicItemId: 4, createdAt: '', main: { word: 'x', translation: 't', phonetic: 'p' }, examples: [{ content: 'c' }] })), ['meaning']);
  const twin = itemSummary({ ...real, topicItemId: 5, main: { word: 'intensely ' } });
  assert.deepEqual([...duplicateWords([s, twin, itemSummary(SUCH)])], ['intensely']);
});

test('C6. the source dictionary is English–Vietnamese: Vietnamese definitions are the gloss; prefill puts them in definition_translation', () => {
  // Shaped like most real entries: no vi translation, a Vietnamese definition, POS label already mapped by the API.
  const ABRIDGE: LookupResultDTO = { exists: true, word: 'abridge', langCode: 'en', pronunciations: [{ ipa: '/əˈbrɪdʒ/', region: null }],
    meanings: [{ definition: 'Rút ngắn, cô gọn', definitionLang: 'vi', example: null, pos: 'Động từ', subPos: null, links: null }],
    translations: [{ langCode: 'fr', translation: 'abréger' }], relations: [] };
  assert.deepEqual(viGloss(ABRIDGE), ['Rút ngắn, cô gọn']);
  assert.deepEqual(wordGaps(ABRIDGE), ['example']);
  assert.deepEqual(wordGaps({ ...ABRIDGE, meanings: [{ ...ABRIDGE.meanings[0], definitionLang: 'en' }] }), ['vi', 'example']);
  const d = emptyDraft(SCHEMA);
  d.main[0].word = 'abridge';
  const { draft, filledFields } = fillFromLookup(d, ABRIDGE);
  assert.equal(draft.main[0].translation, 'Rút ngắn, cô gọn');
  assert.equal(draft.main[0].definition_translation, 'Rút ngắn, cô gọn');
  assert.equal(draft.meaning[0].meaning, '', 'no English definition: the English field stays empty');
  assert.deepEqual(filledFields, ['Phiên âm', 'Bản dịch', 'Dịch định nghĩa']);
});

test('C7. edit draft from a real item moves main.meaning home to meaning.meaning, so PUT does not drop it', () => {
  const real: TopicItemData = {
    topicItemId: 5, createdAt: '2026-09-10T00:00:00Z',
    main: { word: 'such', translation: 'như vậy', meaning: 'used to refer to something', level: 'C2' },
    examples: [{ content: 'Such a day.', translation: 'Một ngày như vậy.' }],
  };
  const { draft, moved, dropped } = draftFromItem(SCHEMA, real);
  assert.equal(draft.meaning[0].meaning, 'used to refer to something');
  assert.deepEqual(moved, ['main.meaning → meaning.meaning']);
  assert.deepEqual(dropped, []);
  assert.deepEqual(draft.examples, [{ content: 'Such a day.', translation: 'Một ngày như vậy.' }]);
  const body = toCreatePayload(SCHEMA, draft);
  assert.deepEqual(body.meaning, { meaning: 'used to refer to something' });
  assert.equal((body.main as Record<string, string>).meaning, undefined, 'main has no meaning attribute in the schema');
  assert.equal((body.main as Record<string, string>).word, 'such');

  // A value in its own group wins; a key no single group defines is reported, not silently kept.
  const both = draftFromItem(SCHEMA, { ...real, meaning: { meaning: 'own' }, main: { ...real.main as object, mystery: 'x' } });
  assert.equal(both.draft.meaning[0].meaning, 'own');
  assert.deepEqual(both.dropped.sort(), ['main.meaning', 'main.mystery']);
});

test('C8. word edit draft keeps meaning ids, turns POS labels into stored codes, drops blank rows', () => {
  const r: LookupResultDTO = {
    wordId: 42, version: 3, exists: true, word: 'apple', langCode: 'en',
    pronunciations: [{ ipa: '/ˈæp.əl/', region: 'US' }, { ipa: '/ˈæp.l̩/', region: null }],
    meanings: [{ id: 7, definition: 'quả táo', definitionLang: 'vi', example: null, pos: 'Danh từ', subPos: null, links: null },
      { id: 8, definition: 'to apple', definitionLang: 'en', example: 'x', pos: 'V', subPos: null, links: null }],
    translations: [{ langCode: 'vi', translation: 'táo' }, { langCode: 'fr', translation: 'pomme' }], relations: [],
  };
  const d = toWordDraft(r);
  assert.deepEqual(d.meanings.map((m) => [m.id, m.pos]), [[7, 'N'], [8, 'V']]);
  assert.deepEqual(d.vi, ['táo'], 'other languages are not edited here');
  d.ipa.push({ ipa: '  ', region: '' });
  d.vi.push('táo tây ', '');
  d.meanings.push({ id: null, pos: '', lang: 'vi', definition: ' trái táo ', example: '' });
  const body = toUpdateWord(d, r.version!);
  assert.equal(body.version, 3);
  assert.deepEqual(body.pronunciations, [{ ipa: '/ˈæp.əl/', region: 'US' }, { ipa: '/ˈæp.l̩/', region: null }]);
  assert.deepEqual(body.translations, ['táo', 'táo tây']);
  assert.deepEqual(body.meanings[2], { id: null, pos: null, definitionLang: 'vi', definition: 'trái táo', example: null });
  assert.equal(posCode('Không rõ'), null);
});

test('C9. word draft errors: same IPA + region twice, blank definition', () => {
  const errors = wordDraftErrors({
    ipa: [{ ipa: '/a/', region: 'US' }, { ipa: '/a/', region: 'US ' }, { ipa: '/a/', region: 'UK' }],
    vi: [],
    meanings: [{ id: null, pos: '', lang: 'en', definition: '  ', example: '' }],
  });
  assert.deepEqual(Object.keys(errors).sort(), ['ipa.1', 'meanings.0']);
});

test('C10. content API errors read in Vietnamese with their numbers', () => {
  const err = (code: string, status: number, details?: object) => new ApiClientError('x', code, status, details as never);
  assert.match(contentErrorText(err('TOPIC_HAS_LEARNING_DATA', 409, { learners: 3 })), /^3 người học đã học chủ đề này/);
  assert.match(contentErrorText(err('TOPIC_ITEM_HAS_LEARNING_DATA', 409, { learners: 1 })), /vẫn sửa được nội dung/);
  assert.match(contentErrorText(err('TOPIC_HAS_CHILDREN', 409, { children: 2 })), /còn 2 chủ đề con/);
  assert.match(contentErrorText(err('VERSION_CONFLICT', 409, { currentVersion: 4 }), 'Từ này'), /^Từ này vừa được sửa ở phiên khác/);
  assert.match(contentErrorText(err('WHATEVER', 403)), /ROLE_ADMIN/);
});
