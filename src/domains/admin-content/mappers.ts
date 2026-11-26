import type { AttrValues, CreateTopicItem, LookupResultDTO, SchemaAttributeGroupDTO, TopicItemData, UpdateWord } from './types';
import { ApiClientError } from '../../lib/api-client';

/**
 * Field names of the system schema DEFAULT_ENGLISH (main / meaning / examples). Other schemas still render
 * generically; only the summary columns and coverage read these names.
 */
const asGroup = (v: unknown): AttrValues => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AttrValues) : {});
const asRows = (v: unknown): AttrValues[] => (Array.isArray(v) ? (v as AttrValues[]) : []);
const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

export interface ItemSummary {
  id: number;
  word: string;
  phonetic: string | null;
  translation: string | null;
  meaning: string | null;
  level: string | null;
  examples: number;
  createdAt: string;
}

export function itemSummary(item: TopicItemData): ItemSummary {
  const main = asGroup(item.main);
  const meaning = asGroup(item.meaning);
  return {
    id: item.topicItemId,
    word: main.word ?? '—',
    phonetic: main.phonetic ?? null,
    translation: main.translation ?? null,
    // Real system items keep the definition in main.meaning, an attribute outside DEFAULT_ENGLISH (see offSchemaFields).
    meaning: meaning.meaning ?? main.meaning ?? null,
    level: main.level ?? null,
    examples: asRows(item.examples).filter((r) => filled(r.content)).length,
    createdAt: item.createdAt,
  };
}

/** What a learner's card would be missing: the definition (required), Vietnamese translation, IPA, an example. */
export type Gap = 'meaning' | 'translation' | 'phonetic' | 'example';
export const GAP_LABEL: Record<Gap, string> = { meaning: 'Thiếu giải nghĩa', translation: 'Thiếu bản dịch', phonetic: 'Thiếu phiên âm', example: 'Thiếu ví dụ' };

export function itemGaps(s: ItemSummary): Gap[] {
  const gaps: Gap[] = [];
  if (!filled(s.meaning)) gaps.push('meaning');
  if (!filled(s.translation)) gaps.push('translation');
  if (!filled(s.phonetic)) gaps.push('phonetic');
  if (s.examples === 0) gaps.push('example');
  return gaps;
}

export function coverage(items: ItemSummary[]) {
  const by: Record<Gap, number> = { meaning: 0, translation: 0, phonetic: 0, example: 0 };
  let complete = 0;
  for (const s of items) {
    const g = itemGaps(s);
    g.forEach((k) => by[k]++);
    if (!g.length) complete++;
  }
  return { total: items.length, complete, by };
}

/** Lower-cased words that appear more than once in the topic: each copy becomes a separate card for learners. */
export function duplicateWords(items: ItemSummary[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const s of items) {
    const w = s.word.trim().toLowerCase();
    if (seen.has(w)) dup.add(w);
    seen.add(w);
  }
  return dup;
}

/**
 * Values stored against attributes the topic schema does not define ("group.attr"). The API returns them, but
 * schema-driven screens and validation never see them: a data problem for a backend migration, not for editing here.
 */
export function offSchemaFields(item: TopicItemData, groups: SchemaAttributeGroupDTO[]): string[] {
  const out: string[] = [];
  for (const g of groups) {
    const known = new Set(g.attributes.map((a) => a.name));
    const rows = Array.isArray(item[g.name]) ? asRows(item[g.name]) : [asGroup(item[g.name])];
    const extra = new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !known.has(k) && filled(r[k]))));
    extra.forEach((k) => out.push(`${g.name}.${k}`));
  }
  return out;
}

/** Same word already in the topic (trimmed, case-insensitive): adding it again would duplicate the learner's card. */
export function duplicateOf(items: ItemSummary[], word: string): ItemSummary | undefined {
  const w = word.trim().toLowerCase();
  return w ? items.find((s) => s.word.trim().toLowerCase() === w) : undefined;
}

// ---- Add-item form, generated from the topic schema --------------------------------------------------------------

/** Single groups hold one row, multiple groups any number of rows; every value is form text. */
export type ItemDraft = Record<string, AttrValues[]>;

export function emptyDraft(groups: SchemaAttributeGroupDTO[]): ItemDraft {
  return Object.fromEntries(groups.map((g) => [g.name, g.multiple ? [] : [Object.fromEntries(g.attributes.map((a) => [a.name, '']))]]));
}

const isBlankRow = (row: AttrValues) => Object.values(row).every((v) => !filled(v));

/** Required fields and data types, as TopicService.buildAndValidateValues checks them. Keys: "group.row.attr". */
export function validateDraft(groups: SchemaAttributeGroupDTO[], draft: ItemDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const g of groups) {
    (draft[g.name] ?? []).forEach((row, i) => {
      if (g.multiple && isBlankRow(row)) return;
      for (const a of g.attributes) {
        const v = (row[a.name] ?? '').trim();
        const key = `${g.name}.${i}.${a.name}`;
        if (a.required && !v) errors[key] = 'Bắt buộc.';
        else if (v && a.dataType === 'NUMBER' && Number.isNaN(Number(v))) errors[key] = 'Phải là số.';
        else if (v && a.dataType === 'BOOLEAN' && !['true', 'false'].includes(v.toLowerCase())) errors[key] = 'Nhập true hoặc false.';
        else if (v && a.dataType === 'DATE' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[key] = 'Định dạng YYYY-MM-DD.';
      }
    });
  }
  return errors;
}

/** Request body: trimmed values, blank fields and blank repeated rows dropped, empty groups omitted. */
export function toCreatePayload(groups: SchemaAttributeGroupDTO[], draft: ItemDraft): CreateTopicItem {
  const body: CreateTopicItem = {};
  for (const g of groups) {
    const rows = (draft[g.name] ?? [])
      .map((row) => Object.fromEntries(Object.entries(row).filter(([, v]) => filled(v)).map(([k, v]) => [k, (v as string).trim()])))
      .filter((row) => Object.keys(row).length > 0);
    if (!rows.length) continue;
    body[g.name] = g.multiple ? rows : rows[0];
  }
  return body;
}

/**
 * Edit form for an existing item: every value the API returned, placed in its schema group. A value the API returned
 * under the wrong group (15,663 system items keep meaning.meaning inside the main group, so it reads as main.meaning)
 * is moved to the one group that defines that attribute, because PUT rebuilds groups from the schema and would drop it.
 * `moved` lists those moves; `dropped` lists values no schema group can hold (the operator is warned before saving).
 */
export function draftFromItem(groups: SchemaAttributeGroupDTO[], item: TopicItemData): { draft: ItemDraft; moved: string[]; dropped: string[] } {
  const draft = emptyDraft(groups);
  const moved: string[] = [];
  const dropped: string[] = [];
  const home = (attr: string) => groups.filter((g) => !g.multiple && g.attributes.some((a) => a.name === attr));
  const rowsOf = (g: SchemaAttributeGroupDTO) => (g.multiple ? asRows(item[g.name]) : [asGroup(item[g.name])]);
  // Pass 1: values already in their own group. Pass 2 then moves strays only into a still-empty field.
  for (const g of groups) {
    const rows = rowsOf(g);
    if (g.multiple) draft[g.name] = rows.map((r) => Object.fromEntries(g.attributes.map((a) => [a.name, r[a.name] ?? ''])));
    else g.attributes.forEach((a) => { if (filled(rows[0][a.name])) draft[g.name][0][a.name] = rows[0][a.name] as string; });
  }
  for (const g of groups) {
    const known = new Set(g.attributes.map((a) => a.name));
    const rows = rowsOf(g);
    for (const r of rows) {
      for (const [k, v] of Object.entries(r)) {
        if (known.has(k) || !filled(v)) continue;
        const target = home(k);
        if (target.length === 1 && !g.multiple && !filled(draft[target[0].name][0][k])) {
          draft[target[0].name][0][k] = v as string;
          moved.push(`${g.name}.${k} → ${target[0].name}.${k}`);
        } else {
          dropped.push(`${g.name}.${k}`);
        }
      }
    }
  }
  return { draft, moved, dropped };
}

/**
 * Prefill empty fields of DEFAULT_ENGLISH from a dictionary lookup; never overwrites what the operator typed.
 * Returns the new draft and the labels of the fields it filled.
 */
export function fillFromLookup(draft: ItemDraft, r: LookupResultDTO): { draft: ItemDraft; filledFields: string[] } {
  const next: ItemDraft = structuredClone(draft);
  const done: string[] = [];
  const vi = viGloss(r).slice(0, 3).join(', ');
  const ipa = (r.pronunciations.find((p) => p.region?.toLowerCase().includes('us')) ?? r.pronunciations[0])?.ipa;
  const en = r.meanings.find((m) => m.definitionLang === 'en');
  const viDef = r.meanings.find((m) => m.definitionLang === 'vi');
  const set = (group: string, attr: string, value: string | undefined | null, label: string) => {
    const row = next[group]?.[0];
    if (!row || !(attr in row) || filled(row[attr]) || !filled(value)) return;
    row[attr] = value as string;
    done.push(label);
  };
  // Real items keep IPA as "/ˈsətʃ/", the Vietnamese gloss in main.translation and the English definition in meaning.meaning.
  set('main', 'phonetic', ipa ? `/${ipa.replace(/^[/[]|[/\]]$/g, '')}/` : null, 'Phiên âm');
  set('main', 'translation', vi, 'Bản dịch');
  set('meaning', 'meaning', en?.definition, 'Giải nghĩa');
  set('main', 'definition_translation', viDef?.definition, 'Dịch định nghĩa');
  if (next.examples && next.examples.length === 0) {
    const ex = r.meanings.map((m) => m.example).filter(filled).slice(0, 2) as string[];
    if (ex.length) {
      next.examples = ex.map((content) => ({ content, translation: '' }));
      done.push(`${ex.length} ví dụ`);
    }
  }
  return { draft: next, filledFields: done };
}

// ---- Dictionary --------------------------------------------------------------------------------------------------

/**
 * Gaps that make a dictionary entry weak as a source for cards. The source dictionary is English–Vietnamese:
 * most definitions are Vietnamese (definitionLang "vi"); `translations` holds mostly other languages.
 */
export type WordGap = 'vi' | 'ipa' | 'meaning' | 'example';
export const WORD_GAP_LABEL: Record<WordGap, string> = { vi: 'Thiếu nghĩa Việt', ipa: 'Thiếu IPA', meaning: 'Thiếu định nghĩa', example: 'Thiếu ví dụ' };

/** Vietnamese meaning: vi translations first, else Vietnamese definitions (distinct, in order). */
export function viGloss(r: LookupResultDTO): string[] {
  const fromTranslations = r.translations.filter((t) => t.langCode === 'vi').map((t) => t.translation);
  const source = fromTranslations.length ? fromTranslations : r.meanings.filter((m) => m.definitionLang === 'vi').map((m) => m.definition);
  return [...new Set(source)];
}

export function wordGaps(r: LookupResultDTO): WordGap[] {
  const gaps: WordGap[] = [];
  if (!viGloss(r).length) gaps.push('vi');
  if (!r.pronunciations.length) gaps.push('ipa');
  if (!r.meanings.length) gaps.push('meaning');
  else if (!r.meanings.some((m) => filled(m.example))) gaps.push('example');
  return gaps;
}

/** Meanings grouped by part of speech, in first-seen order. */
export function meaningsByPos(r: LookupResultDTO) {
  const out = new Map<string, LookupResultDTO['meanings']>();
  for (const m of r.meanings) {
    const key = m.pos ?? 'khác';
    out.set(key, [...(out.get(key) ?? []), m]);
  }
  return [...out.entries()];
}

/** Collection and topic names: 2–100 characters (CreateCollectionDTO / CreateTopicDTO). */
export function nameError(name: string): string | null {
  const n = name.trim().length;
  if (n < 2) return 'Tối thiểu 2 ký tự.';
  if (n > 100) return 'Tối đa 100 ký tự.';
  return null;
}

// ---- Dictionary edit form ----------------------------------------------------------------------------------------

/** Part-of-speech codes stored in definitions.pos and their labels (backend PosLabel); the lookup returns labels. */
export const POS_OPTIONS: { code: string; label: string }[] = [
  { code: 'N', label: 'Danh từ' }, { code: 'V', label: 'Động từ' }, { code: 'A', label: 'Tính từ' }, { code: 'D', label: 'Phó từ' },
  { code: 'R', label: 'Trạng từ' }, { code: 'P', label: 'Đại từ' }, { code: 'E', label: 'Giới từ' }, { code: 'C', label: 'Liên từ' },
  { code: 'I', label: 'Tình thái từ' }, { code: 'M', label: 'Lượng từ' }, { code: 'O', label: 'Thán từ' }, { code: 'S', label: 'Từ đặc biệt' },
  { code: 'X', label: 'Từ phụ trợ / khác' }, { code: 'Z', label: 'Hậu tố' },
];

/** Label (or a code the backend could not label) back to the stored code; unknown text gives null. */
export function posCode(posOrLabel: string | null | undefined): string | null {
  if (!filled(posOrLabel)) return null;
  const v = (posOrLabel as string).trim();
  return POS_OPTIONS.find((p) => p.label === v || p.code === v)?.code ?? null;
}

export interface WordDraft {
  ipa: { ipa: string; region: string }[];
  vi: string[];
  meanings: { id: number | null; pos: string; lang: 'vi' | 'en'; definition: string; example: string }[];
}

export function toWordDraft(r: LookupResultDTO): WordDraft {
  return {
    ipa: r.pronunciations.map((p) => ({ ipa: p.ipa, region: p.region ?? '' })),
    vi: r.translations.filter((t) => t.langCode === 'vi').map((t) => t.translation),
    meanings: r.meanings.map((m) => ({ id: m.id ?? null, pos: posCode(m.pos) ?? '', lang: m.definitionLang === 'en' ? 'en' : 'vi', definition: m.definition, example: m.example ?? '' })),
  };
}

/** Field errors keyed "ipa.i" / "vi.i" / "meanings.i"; the same rules the server enforces (AdminWordService, DTO limits). */
export function wordDraftErrors(d: WordDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  d.ipa.forEach((p, i) => {
    if (!filled(p.ipa)) return;
    const key = `${p.ipa.trim()}|${p.region.trim()}`;
    if (seen.has(key)) errors[`ipa.${i}`] = 'Trùng phát âm (cùng IPA và vùng).';
    else if (p.ipa.trim().length > 512) errors[`ipa.${i}`] = 'Tối đa 512 ký tự.';
    seen.add(key);
  });
  d.vi.forEach((v, i) => { if (v.trim().length > 1024) errors[`vi.${i}`] = 'Tối đa 1024 ký tự.'; });
  d.meanings.forEach((m, i) => {
    if (!filled(m.definition)) errors[`meanings.${i}`] = 'Nhập định nghĩa hoặc xóa dòng này.';
    else if (m.definition.trim().length > 4000 || m.example.trim().length > 4000) errors[`meanings.${i}`] = 'Tối đa 4000 ký tự.';
  });
  return errors;
}

/** Blank IPA and translation rows are dropped; a meaning row always needs its definition (wordDraftErrors). */
export function toUpdateWord(d: WordDraft, version: number): UpdateWord {
  return {
    version,
    pronunciations: d.ipa.filter((p) => filled(p.ipa)).map((p) => ({ ipa: p.ipa.trim(), region: p.region.trim() || null })),
    translations: d.vi.filter(filled).map((v) => v.trim()),
    meanings: d.meanings.map((m) => ({ id: m.id, pos: m.pos || null, definitionLang: m.lang, definition: m.definition.trim(), example: m.example.trim() || null })),
  };
}

/**
 * Vietnamese text for the content API errors; anything else falls back to the client's own message. `what` names the
 * object in the version-conflict sentence ("Từ này", "Mẫu này").
 */
export function contentErrorText(e: unknown, what = 'Dữ liệu này'): string {
  if (!(e instanceof ApiClientError)) return e instanceof Error ? e.message : 'Thao tác thất bại.';
  const d = (e.details ?? {}) as Record<string, unknown>;
  switch (e.code) {
    case 'VERSION_CONFLICT': return `${what} vừa được sửa ở phiên khác. Tải lại để xem bản mới rồi sửa tiếp.`;
    case 'WORD_DELETED': return 'Từ đang ở trạng thái đã xóa mềm. Khôi phục trước khi sửa.';
    case 'WORD_NOT_DELETED': return 'Từ không ở trạng thái đã xóa.';
    case 'TOPIC_HAS_CHILDREN': return `Chủ đề còn ${d.children ?? 'một số'} chủ đề con. Xóa các chủ đề con trước.`;
    case 'TOPIC_ALREADY_HIDDEN': return 'Chủ đề đã được ẩn ở phiên khác.';
    case 'TOPIC_NOT_HIDDEN': return 'Chủ đề đang hiện, không cần khôi phục.';
    case 'TOPIC_PARENT_HIDDEN': return 'Chủ đề cha đang bị ẩn. Khôi phục chủ đề cha, chủ đề con sẽ hiện lại cùng nó.';
    case 'TOPIC_HAS_LEARNING_DATA': return `${d.learners ?? 'Một số'} người học đã học chủ đề này (thẻ ôn, Quiz hoặc truyện AI). Không xóa để giữ lịch sử học của họ.`;
    case 'TOPIC_ITEM_HAS_LEARNING_DATA': return `${d.learners ?? 'Một số'} người học đã học mục từ này. Không xóa để giữ lịch sử học của họ; vẫn sửa được nội dung.`;
    case 'TEMPLATE_BINDING_INVALID': return `Quiz không đọc được mẫu (${d.mode ?? '?'}: ${d.kind === 'AMBIGUOUS' ? 'vai trò bị gán trùng' : 'thiếu vai trò'} ${d.role ?? ''}).`;
    case 'VALIDATION_ERROR': return d.field ? `Dữ liệu không hợp lệ ở ${String(d.field)}.` : e.message;
    default:
      if (e.statusCode === 403) return 'Tài khoản không có quyền quản trị (ROLE_ADMIN).';
      if (e.statusCode === 404) return 'Không tìm thấy (có thể đã bị xóa ở phiên khác).';
      return e.message;
  }
}
