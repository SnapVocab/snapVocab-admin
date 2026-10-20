import type { AttrValues, CreateTopicItem, LookupResultDTO, SchemaAttributeGroupDTO, TopicItemData } from './types';

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
