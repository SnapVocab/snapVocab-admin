import type { DataType, SchemaAttributeDTO } from '../admin-content/types';
import type { Alignment, CardSide, SchemaDTO, SemanticRole, TemplateElementDTO } from './types';

/**
 * The app's card renderer, ported so the preview and every check read a template exactly as SnapVocab draws it
 * (design.md §6, P4). Behaviour is kept from:
 *  - SnapVocab/src/features/template-builder/mappers/backend-to-client.ts + helpers.ts (elements → sections)
 *  - SnapVocab/src/features/card-renderer/utils/data-resolver.ts (value lookup with alias and group fallbacks)
 *  - SnapVocab/src/features/card-renderer/components/card-field-renderer.tsx (what one field draws)
 * ponytail: hand-mirrored like TD-ADS-08/09; a shared test vector would catch drift (TD-TPL-01).
 */

export type FontKey = 'S' | 'M' | 'L' | 'XL';
export const FONT_PX: Record<FontKey, number> = { S: 13, M: 16, L: 20, XL: 26 };
const REVERSE_FONT: Record<number, FontKey> = { 13: 'S', 14: 'S', 15: 'M', 16: 'M', 18: 'M', 20: 'L', 22: 'L', 24: 'XL', 26: 'XL', 28: 'XL', 32: 'XL' };

export function fontKey(size?: number | null): FontKey {
  if (!size) return 'M';
  return REVERSE_FONT[size] ?? (size >= 24 ? 'XL' : size >= 20 ? 'L' : size <= 14 ? 'S' : 'M');
}

export interface CardField {
  key: string;
  attributeId: number;
  attributeName: string;
  groupName?: string;
  groupMultiple: boolean;
  label: string;
  role: SemanticRole | null;
  hideIfEmpty: boolean;
  audioAction: boolean;
  font: FontKey;
  align: Alignment;
  color: string;
  dataType: DataType;
  column: 1 | 2;
}

export interface CardSection {
  key: string;
  name: string;
  side: CardSide;
  columns: 1 | 2;
  repeatable: boolean;
  groupName?: string;
  fields: CardField[];
}

export function findAttribute(schema: Pick<SchemaDTO, 'groups'> | undefined, attributeId: number) {
  for (const g of schema?.groups ?? []) {
    const attribute = g.attributes.find((a) => a.attributeId === attributeId);
    if (attribute) return { attribute, groupName: g.name, groupLabel: g.label ?? undefined, repeatable: g.multiple };
  }
  return {} as { attribute?: SchemaAttributeDTO; groupName?: string; groupLabel?: string; repeatable?: boolean };
}

const DEFAULT_NAME: Record<CardSide, string> = { FRONT: 'Thông tin chung', BACK: 'Nghĩa & Ví dụ' };
const keyOf = (el: TemplateElementDTO & { key?: string }, i: number) => el.key ?? (el.id ? `e${el.id}` : `i${i}`);

/** parseElementsToSections: SECTION_BREAK opens a section, COLUMN_BREAK moves later fields to column 2. */
function parseSide(elements: (TemplateElementDTO & { key?: string })[], schema: Pick<SchemaDTO, 'groups'> | undefined, side: CardSide): CardSection[] {
  const defaultName = DEFAULT_NAME[side];
  const sections: CardSection[] = [];
  let current: CardSection | null = null;
  let column: 1 | 2 = 1;
  elements.forEach((el, i) => {
    if (el.type === 'SECTION_BREAK') {
      if (current && current.fields.length > 0) sections.push(current);
      current = { key: keyOf(el, i), name: el.sectionLabel || '', side, columns: 1, repeatable: el.repeatable ?? false, fields: [] };
      column = 1;
      return;
    }
    if (el.type === 'COLUMN_BREAK') {
      column = 2;
      if (current) current.columns = 2;
      return;
    }
    if (el.type !== 'FIELD' || !el.field) return;
    if (!current) current = { key: `${side}-default`, name: defaultName, side, columns: 1, repeatable: false, fields: [] };
    const sec: CardSection = current;
    const f = el.field;
    const { attribute, groupName, groupLabel, repeatable } = findAttribute(schema, f.schemaAttributeId);
    if (repeatable && !sec.repeatable) sec.repeatable = true;
    if (groupName && !sec.groupName) sec.groupName = groupName;
    if (groupLabel && sec.fields.length === 0 && sec.name === defaultName) sec.name = groupLabel;
    sec.fields.push({
      key: keyOf(el, i),
      attributeId: f.schemaAttributeId,
      attributeName: attribute?.name ?? 'custom_field',
      groupName,
      groupMultiple: repeatable ?? false,
      label: f.fieldLabel || attribute?.label || 'Trường dữ liệu',
      role: f.semanticRole ?? null,
      hideIfEmpty: f.hideIfEmpty ?? false,
      audioAction: f.audioAction ?? false,
      font: fontKey(f.fontSize),
      align: f.alignment || 'LEFT',
      color: f.color || '#111827',
      dataType: attribute?.dataType ?? 'TEXT',
      column,
    });
  });
  const last = current as CardSection | null;
  if (last && (last.fields.length > 0 || sections.length === 0)) sections.push(last);
  return sections;
}

/**
 * templateDTOToBuilderSections. Sides come from `side` (NOT NULL in the DB, so the app's position fallback never runs).
 * ponytail: a template with no elements gets empty faces here; the app would build schema-derived fallback sections.
 */
export function cardSections(elements: (TemplateElementDTO & { key?: string })[], schema: Pick<SchemaDTO, 'groups'> | undefined) {
  const sorted = [...elements].sort((a, b) => a.position - b.position);
  const front = parseSide(sorted.filter((e) => e.side === 'FRONT'), schema, 'FRONT');
  const back = parseSide(sorted.filter((e) => e.side === 'BACK'), schema, 'BACK');
  return {
    front: front.length ? front : [{ key: 'FRONT-empty', name: DEFAULT_NAME.FRONT, side: 'FRONT' as const, columns: 2 as const, repeatable: false, fields: [] }],
    back: back.length ? back : [{ key: 'BACK-empty', name: DEFAULT_NAME.BACK, side: 'BACK' as const, columns: 1 as const, repeatable: false, fields: [] }],
  };
}

// ---- data-resolver.ts ---------------------------------------------------------------------------------------------

type Data = Record<string, unknown>;

const ALIASES: Record<string, string[]> = {
  word: ['word', 'target_word', 'targetWord', 'term', 'front', 'vocab', 'title', 'name', 'text'],
  target_word: ['word', 'target_word', 'targetWord', 'term', 'front', 'vocab'],
  phonetic: ['phonetic', 'ipa', 'pronunciation', 'phien_am', 'phienAm'],
  ipa: ['phonetic', 'ipa', 'pronunciation', 'phien_am', 'phienAm'],
  partofspeech: ['partOfSpeech', 'part_of_speech', 'pos', 'tag', 'type', 'word_class', 'wordClass', 'loai_tu', 'loaiTu'],
  pos: ['partOfSpeech', 'part_of_speech', 'pos', 'tag', 'type', 'loai_tu', 'loaiTu'],
  translation: ['translation', 'native_translation', 'nativeTranslation', 'vietnamese', 'dich', 'nghia'],
  meaning: ['meaning', 'definition', 'explain', 'explanation', 'giai_nghia', 'giaiNghia'],
  definition: ['definition', 'dinh_nghia', 'dinhNghia', 'explain', 'explanation', 'meaning'],
  definition_translation: ['definition_translation', 'definitionTranslation', 'dich_dinh_nghia', 'dichDinhNghia', 'definition_trans'],
  content: ['content', 'sentence', 'example', 'example_sentence', 'exampleSentence', 'text', 'cau_vi_du', 'cauViDu'],
  example: ['content', 'sentence', 'example', 'example_sentence', 'exampleSentence', 'text', 'cau_vi_du', 'cauViDu'],
  sentence: ['content', 'sentence', 'example', 'example_sentence', 'exampleSentence', 'text', 'cau_vi_du', 'cauViDu'],
  example_translation: ['example_translation', 'exampleTranslation', 'sentenceTranslation', 'sentence_translation', 'dich_vi_du', 'dichViDu', 'translation'],
  audio: ['audio', 'audioUrl', 'audio_url', 'sound', 'voice'],
  image: ['image', 'imageUrl', 'image_url', 'picture', 'photo', 'illustration'],
  level: ['level', 'cefr', 'cap_do', 'capDo'],
  synonyms: ['synonyms', 'synonym', 'dong_nghia', 'dongNghia'],
  antonyms: ['antonyms', 'antonym', 'trai_nghia', 'traiNghia'],
};

const isObj = (v: unknown): v is Data => !!v && typeof v === 'object' && !Array.isArray(v);
const present = (v: unknown) => v !== undefined && v !== null;

function exactOrCase(obj: Data, key: string): unknown {
  if (present(obj[key])) return obj[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(obj)) if (k.toLowerCase() === lower && present(v)) return v;
  return undefined;
}

export function getValueFromObject(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Data;
  const direct = exactOrCase(o, key);
  if (direct !== undefined) return direct;
  for (const alias of ALIASES[key.toLowerCase()] ?? []) {
    const found = exactOrCase(o, alias);
    if (found !== undefined) return found;
  }
  return undefined;
}

function extractGroups(data: Data): Data {
  return isObj(data.groups) ? { ...data, ...data.groups } : data;
}

export function resolveTargetWord(data: Data | null | undefined): string {
  if (!data) return '';
  for (const g of Object.values(extractGroups(data))) {
    if (isObj(g)) {
      const found = getValueFromObject(g, 'word') || getValueFromObject(g, 'target_word');
      if (found) return String(found).trim();
    }
  }
  const direct = getValueFromObject(data, 'word') || data.target_word;
  return direct ? String(direct).trim() : '';
}

/** What the app's builder preview prints when there is no item (mock-data-generator.ts). */
export function sampleValue(field: Pick<CardField, 'role' | 'attributeName' | 'label'>): string {
  const role = field.role;
  const name = field.attributeName.toLowerCase();
  const label = field.label.toLowerCase();
  if (role === 'TARGET_WORD') return 'perseverance';
  if (role === 'DEFINITION') return 'Persistence in doing something despite difficulty or delay in achieving success.';
  if (role === 'NATIVE_TRANSLATION') return 'sự kiên trì, bền bỉ';
  if (role === 'EXAMPLE_SENTENCE') return 'Through hard work and perseverance, she reached her goal.';
  if (role === 'AUDIO') return 'https://ssl.gstatic.com/dictionary/static/sounds/20200429/perseverance--_gb_1.mp3';
  if (role === 'IMAGE') return 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500';
  if (name.includes('ipa') || name.includes('phonetic') || label.includes('phiên âm')) return '/ˌpɜː.sɪˈvɪə.rəns/';
  if (name.includes('pos') || name.includes('part') || label.includes('loại từ')) return 'noun';
  if (name.includes('trans') || name.includes('nghĩa') || label.includes('nghĩa')) return 'sự kiên trì, nhẫn nại';
  if (name.includes('exam') || name.includes('ví dụ') || label.includes('ví dụ')) return 'Medicine is a field requiring great perseverance.';
  if (name.includes('synonym') || label.includes('đồng nghĩa')) return 'persistence, dedication, tenacity';
  if (name.includes('antonym') || label.includes('trái nghĩa')) return 'laziness, apathy, weakness';
  return field.label || field.attributeName || 'Sample text';
}

/** resolveFieldValue: own group first, then any group of the same kind, the root, and finally the semantic role. */
export function resolveFieldValue(field: CardField, data: Data | null | undefined, instanceIndex = 0, repeatable = false): string {
  if (!data) return sampleValue(field).trim();
  const groups = extractGroups(data);
  const attr = field.attributeName;
  let value: unknown;

  if (field.groupName && groups[field.groupName] !== undefined) {
    const target = groups[field.groupName];
    if (Array.isArray(target)) {
      const row = target[instanceIndex];
      if (row && typeof row === 'object') value = getValueFromObject(row, attr);
    } else if (isObj(target)) value = getValueFromObject(target, attr);
  }
  if (value === undefined) {
    for (const g of Object.values(groups)) {
      if (repeatable || field.groupMultiple) {
        if (!Array.isArray(g)) continue;
        const row = g[instanceIndex];
        if (row && typeof row === 'object') value = getValueFromObject(row, attr);
      } else if (isObj(g)) value = getValueFromObject(g, attr);
      if (value !== undefined) break;
    }
  }
  if (value === undefined) {
    const direct = data[attr];
    if (direct !== undefined && (repeatable || !Array.isArray(direct))) value = direct;
  }
  if (value === undefined && field.role) {
    const role = field.role;
    for (const g of Object.values(groups)) {
      if (repeatable || field.groupMultiple) {
        if (!Array.isArray(g)) continue;
        const row = g[instanceIndex];
        if (!row || typeof row !== 'object') continue;
        if (role === 'EXAMPLE_SENTENCE') value = getValueFromObject(row, 'content') || getValueFromObject(row, 'sentence') || getValueFromObject(row, 'example');
        else if (role === 'NATIVE_TRANSLATION') value = getValueFromObject(row, 'translation') || getValueFromObject(row, 'meaning');
      } else {
        if (!isObj(g)) continue;
        if (role === 'TARGET_WORD') value = getValueFromObject(g, 'word') || getValueFromObject(g, 'target_word');
        else if (role === 'NATIVE_TRANSLATION') value = getValueFromObject(g, 'translation');
        else if (role === 'DEFINITION') value = getValueFromObject(g, 'definition') || getValueFromObject(g, 'meaning');
        else if (role === 'AUDIO') value = getValueFromObject(g, 'audio') || '';
        else if (role === 'IMAGE') value = getValueFromObject(g, 'image');
      }
      if (value !== undefined) break;
    }
  }
  return present(value) ? String(value).trim() : '';
}

/** getSectionInstanceCount: one per row of the section's repeated group. */
export function sectionInstances(section: CardSection, data: Data | null | undefined): number {
  if (!section.repeatable || !data) return 1;
  const groups = extractGroups(data);
  if (section.groupName && Array.isArray(groups[section.groupName])) return (groups[section.groupName] as unknown[]).length;
  for (const f of section.fields) if (f.groupName && Array.isArray(groups[f.groupName])) return (groups[f.groupName] as unknown[]).length;
  for (const g of Object.values(groups)) {
    if (Array.isArray(g) && g.length > 0 && section.fields.some((f) => g.some((row) => row && typeof row === 'object' && getValueFromObject(row, f.attributeName) !== undefined))) return g.length;
  }
  return 1;
}

// ---- card-field-renderer.tsx ----------------------------------------------------------------------------------------

const isTargetWordField = (f: Pick<CardField, 'role' | 'attributeName'>) => {
  const a = f.attributeName.toLowerCase();
  return f.role === 'TARGET_WORD' || a === 'word' || a === 'target_word';
};
const isPhoneticField = (f: Pick<CardField, 'attributeName' | 'label'>) => {
  const a = f.attributeName.toLowerCase();
  const l = f.label.toLowerCase();
  return a.includes('phonetic') || a.includes('ipa') || l.includes('phiên âm') || l.includes('phonetic');
};

/**
 * The app draws a dedicated "Nghe phát âm" button only for an audio field that is neither the word nor the phonetic
 * attribute; an AUDIO role on `word` therefore prints the word itself.
 */
export function drawsAudioButton(f: Pick<CardField, 'role' | 'dataType' | 'attributeName' | 'label'>): boolean {
  return (f.dataType === 'AUDIO' || f.role === 'AUDIO') && !isTargetWordField(f) && !isPhoneticField(f);
}

function cleanPhonetic(raw: string): string {
  let s = raw.trim();
  const edge = ['/', '\\', '[', ']', '"', "'"];
  while (s && edge.includes(s[0])) s = s.slice(1).trim();
  while (s && edge.includes(s[s.length - 1])) s = s.slice(0, -1).trim();
  return !s || s === 'null' || s === 'undefined' ? '' : s;
}

export type FieldView =
  | { kind: 'hidden' }
  | { kind: 'image'; label: string; src: string }
  | { kind: 'audio'; label: string; speak: string }
  | { kind: 'text'; label: string; text: string; targetWord: boolean; phonetic: boolean; px: number; audioButton: boolean; speak: string };

/** One field as the app draws it for one item (and one row of a repeated group). */
export function fieldView(field: CardField, data: Data | null | undefined, instanceIndex = 0, repeatable = false): FieldView {
  const text = resolveFieldValue(field, data, instanceIndex, repeatable);
  const target = resolveTargetWord(data);
  const word = isTargetWordField(field);
  const phonetic = isPhoneticField(field);
  const speak = (word ? text : target) || text;
  const audio = drawsAudioButton(field);
  const isImage = field.dataType === 'IMAGE' || field.role === 'IMAGE';
  const clean = phonetic ? cleanPhonetic(text) : text;
  const empty = !text || (phonetic && !clean);

  if (empty && field.hideIfEmpty && !audio) return { kind: 'hidden' };
  if (isImage && text) return { kind: 'image', label: field.label, src: text };
  if (audio) return { kind: 'audio', label: field.label || 'Nghe phát âm', speak };
  let shown = text || (field.hideIfEmpty ? '' : '—');
  if (phonetic) shown = clean ? `/${clean}/` : field.hideIfEmpty ? '' : '—';
  return { kind: 'text', label: field.label, text: shown, targetWord: word, phonetic, px: FONT_PX[field.font] || 16, audioButton: field.audioAction && !!(shown || target), speak };
}

/** The URL mobile `lib/hooks/use-tts.tsx` plays (Google Translate TTS, English). */
export const ttsUrl = (text: string) => `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.trim())}&tl=en&client=tw-ob`;
