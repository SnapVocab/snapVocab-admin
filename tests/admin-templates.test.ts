import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TopicDTO } from '../src/domains/admin-content/types';
import {
  addElement, attributeFill, coverageNotes, fieldCoverage, matchesFilter, moveElement, normalizeSchema, placements, quizChecks, removeElement,
  renderIssues, sameDraft, summarize, toDraft, toUpdate, topicsByTemplate, updateElement, validateDraft,
} from '../src/domains/admin-templates/mappers';
import { cardSections, fieldView } from '../src/domains/admin-templates/render';
import type { SchemaDTO, TemplateDTO } from '../src/domains/admin-templates/types';

/** Snapshot of the local DB clone, 2026-10-21: schema DEFAULT_ENGLISH (278) as GET /api/schemas returns it, and three items of topic 2. */
const json = (f: string) => JSON.parse(readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8'));
const schema: SchemaDTO = normalizeSchema(json('templates-schemas.json')[0]);
const items: Record<string, unknown>[] = json('templates-items.json');
const byCode = (code: string) => schema.templates.find((t) => t.code === code)!;
const STANDARD = byCode('STANDARD');
const LISTENING = byCode('LISTENING');
const REVERSE = byCode('REVERSE');
const such = items[0];
/** Synthetic: a word with no phonetic, no definition and no example. */
const bare = { topicItemId: 99, createdAt: '', main: { word: 'bare', translation: 'trần', level: 'A2' } };
const withRole = (t: TemplateDTO, attr: string, group: string, role: string | null) => ({
  ...t,
  elements: t.elements.map((e) => {
    const a = schema.groups.find((g) => g.name === group)!.attributes.find((x) => x.name === attr)!;
    return e.field?.schemaAttributeId === a.attributeId ? { ...e, field: { ...e.field, semanticRole: role as never } } : e;
  }),
});

test('TP1 normalizeSchema reads Lombok booleans under both names', () => {
  assert.equal(schema.isSystem, true);
  assert.deepEqual(schema.templates.map((t) => [t.code, t.isDefault]), [['STANDARD', true], ['LISTENING', false], ['REVERSE', false]]);
  assert.equal(normalizeSchema({ id: 1, name: 'x', system: false, templates: [{ id: 5, name: 'y', default: true }] }).templates[0].isDefault, true);
  assert.equal(STANDARD.version, null);
});

test('TP2 sections are parsed like the app: column break, group label, repeated examples', () => {
  const { front, back } = cardSections(STANDARD.elements, schema);
  assert.equal(front.length, 1);
  // Stored "Thông tin chung" equals the app's default section name, so the app shows the group label instead.
  assert.equal(STANDARD.elements[0].sectionLabel, 'Thông tin chung');
  assert.equal(front[0].name, 'Thông tin chính');
  assert.equal(front[0].columns, 2);
  assert.deepEqual(front[0].fields.map((f) => [f.attributeName, f.column, f.font]), [['word', 1, 'XL'], ['phonetic', 2, 'M'], ['level', 2, 'S']]);
  assert.deepEqual(back.map((s) => [s.name, s.repeatable, s.fields.length]), [['Giải nghĩa', false, 4], ['Ví dụ & Ngữ cảnh', true, 2]]);
  assert.equal(back[1].groupName, 'examples');
});

test('TP3 fieldView draws a real item as the app does (alias fallback, phonetic, hidden image, repeated rows)', () => {
  const { front, back } = cardSections(STANDARD.elements, schema);
  const word = fieldView(front[0].fields[0], such);
  assert.ok(word.kind === 'text' && word.text === 'such' && word.px === 26 && word.audioButton && word.targetWord);
  const ipa = fieldView(front[0].fields[1], such);
  assert.ok(ipa.kind === 'text' && ipa.text === '/ˈsətʃ/' && ipa.phonetic);
  // "Định nghĩa tiếng Anh" is bound to meaning.meaning; the data sits in main.meaning and the app still finds it.
  const def = fieldView(back[0].fields[1], such);
  assert.ok(def.kind === 'text' && def.text.startsWith('used to refer'));
  assert.equal(fieldView(back[0].fields[3], such).kind, 'hidden');
  const ex = fieldView(back[1].fields[0], such, 3, true);
  assert.ok(ex.kind === 'text' && ex.text.startsWith('In my opinion'));
  const missing = fieldView(back[1].fields[0], bare, 0, true);
  assert.ok(missing.kind === 'text' && missing.text === '—');
});

test('TP4 LISTENING front prints the word instead of an audio button: flagged as an answer leak', () => {
  const { front } = cardSections(LISTENING.elements, schema);
  const v = fieldView(front[0].fields[0], such);
  assert.ok(v.kind === 'text' && v.text === 'such');
  const issues = renderIssues(LISTENING.elements, schema);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /Nghe phát âm.*main\.word.*lộ luôn đáp án/);
  assert.deepEqual(renderIssues(STANDARD.elements, schema), []);
  assert.deepEqual(renderIssues(REVERSE.elements, schema), []);
});

test('TP5 Quiz bindings mirror QuizContentResolver: missing and ambiguous roles', () => {
  for (const t of [STANDARD, LISTENING, REVERSE]) assert.ok(quizChecks(t.elements).every((q) => q.ok), t.code!);
  // The remote DB tags examples.translation NATIVE_TRANSLATION too (clone-remote-db.sh untags it locally).
  const remote = quizChecks(withRole(STANDARD, 'translation', 'examples', 'NATIVE_TRANSLATION').elements);
  assert.deepEqual(remote.map((q) => [q.mode, q.ok, q.problem?.code]), [['MCQ', false, 'SEMANTIC_ROLE_AMBIGUOUS'], ['MATCHING', false, 'SEMANTIC_ROLE_AMBIGUOUS'], ['FILL_BLANK', true, undefined]]);
  assert.equal(remote[0].problem?.count, 2);
  const noWord = quizChecks(withRole(STANDARD, 'word', 'main', null).elements);
  assert.ok(noWord.every((q) => !q.ok && q.problem?.kind === 'missing' && q.problem.role === 'TARGET_WORD'));
});

test('TP6 coverage counts what each card shows, the off-schema definition and fields that never appear', () => {
  const cov = fieldCoverage(STANDARD.elements, schema, [...items, bare]);
  const of = (label: string) => cov.find((c) => c.label === label)!;
  assert.deepEqual([of('Từ vựng').shown, of('Từ vựng').total], [4, 4]);
  assert.deepEqual([of('Định nghĩa tiếng Anh').shown, of('Định nghĩa tiếng Anh').misplaced, of('Định nghĩa tiếng Anh').hidden], [3, 3, 1]);
  assert.equal(of('Hình ảnh').hidden, 4);
  assert.deepEqual([of('Câu ví dụ').shown, of('Câu ví dụ').dash], [3, 1]);
  const notes = coverageNotes(cov);
  assert.ok(notes.some((t) => t.startsWith('Hình ảnh: không mục nào')));
  assert.ok(notes.some((t) => t.startsWith('Câu ví dụ: 1/4 thẻ hiện “—”')));
  assert.ok(notes.some((t) => t.startsWith('Định nghĩa tiếng Anh: 3 mục có dữ liệu nằm ngoài meaning.meaning')));
});

test('TP7 library: Quiz usage per template, filters and the matrix placements', () => {
  const topic = (id: number, tid: number) => ({ id, activeTemplateId: tid } as TopicDTO);
  const by = topicsByTemplate([topic(1, STANDARD.id), topic(2, STANDARD.id), topic(3, REVERSE.id)]);
  const s = summarize(schema, by);
  assert.deepEqual(s.map((x) => [x.template.code, x.topics.length]), [['STANDARD', 2], ['LISTENING', 0], ['REVERSE', 1]]);
  assert.deepEqual(s.filter((x) => matchesFilter(x, 'UNUSED')).map((x) => x.template.code), ['LISTENING']);
  assert.deepEqual(s.filter((x) => matchesFilter(x, 'ISSUES')).map((x) => x.template.code), ['LISTENING']);
  assert.deepEqual(s.filter((x) => matchesFilter(x, 'DEFAULT')).map((x) => x.template.code), ['STANDARD']);
  assert.deepEqual(s[0].faces.FRONT, { once: ['Từ vựng', 'Phiên âm', 'Cấp độ'], repeated: [] });
  assert.deepEqual(s[0].faces.BACK, { once: ['Bản dịch tiếng Việt', 'Định nghĩa tiếng Anh', 'Dịch định nghĩa', 'Hình ảnh'], repeated: ['Câu ví dụ', 'Dịch câu ví dụ'] });
  const word = schema.groups[0].attributes.find((a) => a.name === 'word')!;
  assert.deepEqual(placements(LISTENING, word.attributeId).map((p) => [p.side, p.role]), [['FRONT', 'AUDIO'], ['BACK', 'TARGET_WORD']]);
  const g = (name: string) => schema.groups.find((x) => x.name === name)!;
  assert.equal(attributeFill(items, 'meaning', false, { name: 'meaning' }), 0);
  assert.equal(attributeFill(items, 'main', false, { name: 'word' }), 3);
  assert.equal(attributeFill(items, 'examples', g('examples').multiple, { name: 'content' }), 3);
});

test('TP8 draft: round trip, moves, adds and the save rules', () => {
  const d = toDraft(STANDARD);
  const body = toUpdate(d, null);
  assert.deepEqual(body.elements.map((e) => [e.id, e.position, e.side]), [...STANDARD.elements].sort((a, b) => a.position - b.position).map((e) => [e.id, e.position, e.side]));
  assert.ok(sameDraft(d, toDraft(STANDARD)));

  const moved = moveElement(d, 'FRONT', d.front[1].key, 1);
  assert.deepEqual(moved.front.map((e) => e.type), ['SECTION_BREAK', 'COLUMN_BREAK', 'FIELD', 'FIELD', 'FIELD']);
  assert.ok(!sameDraft(d, moved));
  assert.equal(moveElement(d, 'FRONT', d.front[0].key, -1), d);

  const audio = schema.groups[0].attributes.find((a) => a.name === 'audio')!;
  const added = addElement(d, 'BACK', 'FIELD', audio);
  const el = added.draft.back.at(-1)!;
  assert.equal(el.key, added.key);
  assert.deepEqual([el.field?.schemaAttributeId, el.field?.fieldLabel, el.field?.hideIfEmpty, el.field?.fontSize], [audio.attributeId, 'Phát âm', true, 16]);
  assert.deepEqual(toUpdate(added.draft, 3).elements.map((e) => e.position), Array.from({ length: 14 }, (_, i) => i));
  assert.equal(toUpdate(added.draft, 3).version, 3);

  assert.deepEqual(validateDraft(d).errors, []);
  const word = d.front.find((e) => e.field?.semanticRole === 'TARGET_WORD')!;
  const broken = validateDraft(removeElement(d, 'FRONT', word.key));
  assert.ok(broken.errors.some((e) => e.startsWith('Trắc nghiệm phản xạ: Chưa trường nào mang vai trò “Từ vựng chính”')));
  const sec = d.back[0];
  const long = validateDraft({ ...updateElement(d, 'BACK', sec.key, { sectionLabel: 'x'.repeat(101) }), name: ' ' });
  assert.equal(long.fields.name, 'Bắt buộc.');
  assert.equal(long.fields[sec.key], 'Tên phần tối đa 100 ký tự.');
  const empty = validateDraft({ ...d, front: d.front.filter((e) => e.type !== 'FIELD') });
  assert.ok(empty.errors.includes('Mặt trước cần ít nhất một trường.'));
});
