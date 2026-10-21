import type { SchemaAttributeDTO, TopicDTO } from '../admin-content/types';
import { cardSections, drawsAudioButton, fieldView, findAttribute, sectionInstances, type CardField } from './render';
import type {
  CardSide, DraftElement, LibraryFilter, QuizMode, SchemaDTO, SemanticRole, TemplateDTO, TemplateDraft, TemplateElementDTO, TemplateUpdate,
} from './types';

type Raw = Record<string, unknown>;
const bool = (r: Raw, a: string, b: string) => Boolean(r[a] ?? r[b]);

/** Lombok `isX` booleans reach JSON as both "isX" and "x" (TemplateDTO.isDefault, SchemaDTO.isSystem). */
export function normalizeSchema(raw: Raw): SchemaDTO {
  const templates = ((raw.templates as Raw[] | undefined) ?? []).map((t): TemplateDTO => ({
    id: t.id as number,
    schemaId: (t.schemaId as number) ?? (raw.id as number),
    code: (t.code as string | null) ?? null,
    name: t.name as string,
    isDefault: bool(t, 'isDefault', 'default'),
    createdAt: t.createdAt as string,
    updatedAt: t.updatedAt as string,
    elements: (t.elements as TemplateElementDTO[] | undefined) ?? [],
    version: (t.version as number | null | undefined) ?? null,
  }));
  return {
    id: raw.id as number,
    code: (raw.code as string | null) ?? null,
    isSystem: bool(raw, 'isSystem', 'system'),
    userId: (raw.userId as number | null) ?? null,
    name: raw.name as string,
    description: (raw.description as string | null) ?? null,
    groups: (raw.groups as SchemaDTO['groups']) ?? [],
    templates,
  };
}

// ---- Labels (G5: operator words; codes stay in tooltips) -------------------------------------------------------------

/** The app's own role names (template-builder DEFAULT_SEMANTIC_ROLES). */
export const ROLE_LABEL: Record<SemanticRole, string> = {
  TARGET_WORD: 'Từ vựng chính', DEFINITION: 'Giải nghĩa', NATIVE_TRANSLATION: 'Bản dịch / Nghĩa',
  EXAMPLE_SENTENCE: 'Câu ví dụ', AUDIO: 'Âm thanh', IMAGE: 'Hình ảnh',
};
export const ROLES = Object.keys(ROLE_LABEL) as SemanticRole[];

/** QuizContentResolver.requiredRoles, in enum order; labels from the app's quiz screen (vi.json). */
export const QUIZ_MODES: { mode: QuizMode; label: string; roles: SemanticRole[] }[] = [
  { mode: 'MCQ', label: 'Trắc nghiệm phản xạ', roles: ['TARGET_WORD', 'NATIVE_TRANSLATION'] },
  { mode: 'MATCHING', label: 'Ghép đôi từ vựng', roles: ['TARGET_WORD', 'NATIVE_TRANSLATION'] },
  { mode: 'FILL_BLANK', label: 'Điền từ vào chỗ trống', roles: ['TARGET_WORD', 'EXAMPLE_SENTENCE'] },
];
const SINGLETON: SemanticRole[] = ['TARGET_WORD', 'NATIVE_TRANSLATION', 'DEFINITION'];
export const QUIZ_ROLES: SemanticRole[] = ['TARGET_WORD', 'NATIVE_TRANSLATION', 'EXAMPLE_SENTENCE'];

export const SIDE_LABEL: Record<CardSide, string> = { FRONT: 'Mặt trước', BACK: 'Mặt sau' };
export const ALIGN_LABEL = { LEFT: 'trái', CENTER: 'giữa', RIGHT: 'phải', JUSTIFY: 'đều' } as const;
/** Swatches of the app's builder (template-builder COLOR_PALETTE). */
export const COLOR_PALETTE = ['#111827', '#16A34A', '#EA580C', '#0284C7', '#EAB308', '#DC2626', '#9333EA', '#6B7280'];

const fmt = (n: number) => n.toLocaleString('vi-VN');

// ---- Quiz bindings (mirror of QuizContentResolver.bindings) -----------------------------------------------------------

export interface ModeCheck {
  mode: QuizMode;
  label: string;
  ok: boolean;
  problem?: { role: SemanticRole; kind: 'missing' | 'ambiguous'; count: number; code: 'SEMANTIC_ROLE_NOT_BOUND' | 'SEMANTIC_ROLE_AMBIGUOUS' };
}

/** Attributes bound to each role, over both sides (hidden bindings count too when the GET returns them). */
export function roleBindings(elements: TemplateElementDTO[]): Map<SemanticRole, Set<number>> {
  const out = new Map<SemanticRole, Set<number>>();
  for (const el of elements) {
    const role = el.type === 'FIELD' ? el.field?.semanticRole : null;
    if (role) out.set(role, (out.get(role) ?? new Set()).add(el.field!.schemaAttributeId));
  }
  return out;
}

export function quizChecks(elements: TemplateElementDTO[]): ModeCheck[] {
  const bound = roleBindings(elements);
  return QUIZ_MODES.map(({ mode, label, roles }) => {
    for (const role of roles) {
      const ids = bound.get(role);
      if (!ids?.size) return { mode, label, ok: false, problem: { role, kind: 'missing', count: 0, code: 'SEMANTIC_ROLE_NOT_BOUND' } };
      if (SINGLETON.includes(role) && ids.size > 1) return { mode, label, ok: false, problem: { role, kind: 'ambiguous', count: ids.size, code: 'SEMANTIC_ROLE_AMBIGUOUS' } };
    }
    return { mode, label, ok: true };
  });
}

export function modeProblem(c: ModeCheck): string {
  if (!c.problem) return '';
  const role = ROLE_LABEL[c.problem.role];
  return c.problem.kind === 'missing'
    ? `Chưa trường nào mang vai trò “${role}”.`
    : `“${role}” gán cho ${c.problem.count} thuộc tính, Quiz không biết lấy cái nào.`;
}

// ---- What the app draws (render checks) -------------------------------------------------------------------------------

const attrPath = (schema: Pick<SchemaDTO, 'groups'>, id: number) => {
  const { attribute, groupName } = findAttribute(schema, id);
  return attribute ? `${groupName}.${attribute.name}` : `#${id}`;
};

/**
 * Structural problems a learner would see on every card. Data-dependent ones (empty values) come from fieldCoverage.
 * Wording ends with the consequence, so the line is enough to act on.
 */
export function renderIssues(elements: TemplateElementDTO[], schema: Pick<SchemaDTO, 'groups'>): string[] {
  const { front, back } = cardSections(elements, schema);
  const out: string[] = [];
  const frontFields = front.flatMap((s) => s.fields);
  const backFields = back.flatMap((s) => s.fields);
  if (!frontFields.length) out.push('Mặt trước chưa có trường nào: thẻ trống.');
  if (!backFields.length) out.push('Mặt sau chưa có trường nào: lật thẻ ra trang trống.');

  const answer = backFields.find((f) => f.role === 'TARGET_WORD');
  const leaked = answer && frontFields.find((f) => f.attributeId === answer.attributeId && !drawsAudioButton(f) && f.dataType !== 'IMAGE');
  for (const f of [...frontFields, ...backFields]) {
    if (f.role === 'AUDIO' && !drawsAudioButton(f)) {
      out.push(`“${f.label}” mang vai trò Âm thanh nhưng gắn vào ${attrPath(schema, f.attributeId)}, nên ứng dụng in chữ thay cho nút nghe${f === leaked ? ': mặt trước lộ luôn đáp án' : ''}.`);
    }
  }
  if (leaked && leaked.role !== 'AUDIO') out.push(`Mặt trước hiện “${leaked.label}”, cũng là đáp án ở mặt sau.`);

  for (const s of [...front, ...back]) {
    const multi = s.fields.find((f) => f.groupMultiple);
    if (!multi) continue;
    for (const f of s.fields.filter((x) => !x.groupMultiple)) {
      out.push(`“${f.label}” nằm trong phần lặp “${s.name || 'không tên'}”, nên lặp lại theo từng dòng ${findAttribute(schema, multi.attributeId).groupLabel ?? multi.groupName}.`);
    }
  }
  return out;
}

// ---- Data coverage on real items --------------------------------------------------------------------------------------

export interface FieldCoverage {
  key: string;
  label: string;
  side: CardSide;
  path: string;
  total: number;
  /** Items whose card shows a value for this field (any row, for a repeated group). */
  shown: number;
  /** Items where the app prints "—" (empty and not hidden). */
  dash: number;
  /** Items where the field disappears (empty and hidden). */
  hidden: number;
  /** Items whose value the app found outside the field's own group (data off the schema, TD-ADS-17). */
  misplaced: number;
}

type Item = Record<string, unknown>;
const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

function ownValue(item: Item, f: CardField, row: number): boolean {
  const g = f.groupName ? item[f.groupName] : undefined;
  const target = Array.isArray(g) ? g[row] : g;
  return !!target && typeof target === 'object' && filled((target as Item)[f.attributeName]);
}

/** Per FIELD element, what each item's card would show: the same resolver the preview uses. */
export function fieldCoverage(elements: TemplateElementDTO[], schema: Pick<SchemaDTO, 'groups'>, items: Item[]): FieldCoverage[] {
  const { front, back } = cardSections(elements, schema);
  const out: FieldCoverage[] = [];
  for (const s of [...front, ...back]) {
    for (const f of s.fields) {
      const c: FieldCoverage = { key: f.key, label: f.label, side: s.side, path: attrPath(schema, f.attributeId), total: items.length, shown: 0, dash: 0, hidden: 0, misplaced: 0 };
      for (const item of items) {
        const rows = Array.from({ length: sectionInstances(s, item) }, (_, i) => i);
        const views = rows.map((i) => fieldView(f, item, i, s.repeatable));
        const value = views.some((v) => v.kind === 'image' || v.kind === 'audio' || (v.kind === 'text' && v.text !== '—' && v.text !== ''));
        if (value) {
          c.shown++;
          if (!rows.some((i) => ownValue(item, f, i)) && !drawsAudioButton(f)) c.misplaced++;
        } else if (views.some((v) => v.kind === 'text' && v.text === '—')) c.dash++;
        else c.hidden++;
      }
      out.push(c);
    }
  }
  return out;
}

/** One line per field that does not look the way the template intends on this topic. */
export function coverageNotes(cov: FieldCoverage[]): string[] {
  const notes: string[] = [];
  for (const c of cov) {
    if (!c.total) continue;
    if (c.dash) notes.push(`${c.label}: ${fmt(c.dash)}/${fmt(c.total)} thẻ hiện “—” vì mục từ không có dữ liệu.`);
    if (c.hidden === c.total) notes.push(`${c.label}: không mục nào có dữ liệu, trường không hiện trên thẻ nào.`);
    else if (c.hidden) notes.push(`${c.label}: ẩn trên ${fmt(c.hidden)}/${fmt(c.total)} thẻ vì trống.`);
    if (c.misplaced) notes.push(`${c.label}: ${fmt(c.misplaced)} mục có dữ liệu nằm ngoài ${c.path}; ứng dụng vẫn hiện nhờ dò nhóm khác.`);
  }
  return notes;
}

// ---- Library ----------------------------------------------------------------------------------------------------------

/** Topics whose Quiz uses each template (`activeTemplateId`). The app's flashcards ignore it (see `drawsCards`). */
export function topicsByTemplate(topics: TopicDTO[]): Map<number, TopicDTO[]> {
  const out = new Map<number, TopicDTO[]>();
  for (const t of topics) if (t.activeTemplateId !== null) out.set(t.activeTemplateId, [...(out.get(t.activeTemplateId) ?? []), t]);
  return out;
}

/**
 * The app draws flashcards with the schema's DEFAULT template, whatever the topic chose
 * (SnapVocab use-collection-detail.ts, study-session-screen.tsx: `templates.find(t => t.isDefault)`).
 */
export const drawsCards = (t: TemplateDTO) => t.isDefault;

export interface TemplateSummary {
  template: TemplateDTO;
  quiz: ModeCheck[];
  issues: string[];
  topics: TopicDTO[];
  /** Field labels per side in card order; repeated sections listed apart ("lặp theo dòng"). */
  faces: Record<CardSide, { once: string[]; repeated: string[] }>;
}

export function summarize(schema: SchemaDTO, byTemplate: Map<number, TopicDTO[]>): TemplateSummary[] {
  return [...schema.templates].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id).map((t) => {
    const { front, back } = cardSections(t.elements, schema);
    const quiz = quizChecks(t.elements);
    const face = (sections: typeof front) => ({
      once: sections.filter((s) => !s.repeatable).flatMap((s) => s.fields.map((f) => f.label)),
      repeated: sections.filter((s) => s.repeatable).flatMap((s) => s.fields.map((f) => f.label)),
    });
    return {
      template: t,
      quiz,
      issues: [...quiz.filter((q) => !q.ok).map((q) => `${q.label} báo lỗi: ${modeProblem(q)}`), ...renderIssues(t.elements, schema)],
      topics: byTemplate.get(t.id) ?? [],
      faces: { FRONT: face(front), BACK: face(back) },
    };
  });
}

export function matchesFilter(s: TemplateSummary, f: LibraryFilter): boolean {
  if (f === 'DEFAULT') return s.template.isDefault;
  if (f === 'QUIZ') return s.topics.length > 0;
  if (f === 'UNUSED') return !s.template.isDefault && s.topics.length === 0;
  if (f === 'ISSUES') return s.issues.length > 0;
  return true;
}

/** Where one schema attribute appears in a template: side, label and role of each FIELD bound to it. */
export interface Placement { side: CardSide; label: string; role: SemanticRole | null; conflict: boolean }

export function placements(template: TemplateDTO, attributeId: number): Placement[] {
  const bound = roleBindings(template.elements);
  return [...template.elements].sort((a, b) => a.position - b.position)
    .filter((e) => e.type === 'FIELD' && e.field?.schemaAttributeId === attributeId)
    .map((e) => {
      const role = e.field!.semanticRole;
      return { side: e.side, label: e.field!.fieldLabel ?? '', role, conflict: !!role && SINGLETON.includes(role) && (bound.get(role)?.size ?? 0) > 1 };
    });
}

/** Items with a value for the attribute in its own group: what the schema promises, before any resolver fallback. */
export function attributeFill(items: Item[], groupName: string, multiple: boolean, attr: SchemaAttributeDTO | { name: string }): number {
  return items.filter((item) => {
    const g = item[groupName];
    const rows = multiple ? (Array.isArray(g) ? g : []) : [g];
    return rows.some((r) => r && typeof r === 'object' && filled((r as Item)[attr.name]));
  }).length;
}

// ---- Editor draft -----------------------------------------------------------------------------------------------------

let seq = 0;
const newKey = () => `n${++seq}`;

export function toDraft(t: TemplateDTO): TemplateDraft {
  const sorted = [...t.elements].sort((a, b) => a.position - b.position);
  const withKey = (e: TemplateElementDTO, i: number): DraftElement => ({ ...e, field: e.field ? { ...e.field } : null, key: e.id ? `e${e.id}` : `i${i}` });
  return { name: t.name, front: sorted.filter((e) => e.side === 'FRONT').map(withKey), back: sorted.filter((e) => e.side === 'BACK').map(withKey) };
}

/** Elements in saved order, positions renumbered 0…n with FRONT first (unique key template_id + position). */
export const draftElements = (d: TemplateDraft): DraftElement[] => [...d.front, ...d.back].map((e, position) => ({ ...e, position }));

/** Body of the proposed PUT. */
export function toUpdate(d: TemplateDraft, version: number | null): TemplateUpdate {
  return { version, name: d.name.trim(), elements: draftElements(d).map(({ key: _key, ...e }) => e) };
}

const sideKey = (side: CardSide): 'front' | 'back' => (side === 'FRONT' ? 'front' : 'back');

export function moveElement(d: TemplateDraft, side: CardSide, key: string, by: -1 | 1): TemplateDraft {
  const list = [...d[sideKey(side)]];
  const i = list.findIndex((e) => e.key === key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return d;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...d, [sideKey(side)]: list };
}

export function removeElement(d: TemplateDraft, side: CardSide, key: string): TemplateDraft {
  return { ...d, [sideKey(side)]: d[sideKey(side)].filter((e) => e.key !== key) };
}

export function updateElement(d: TemplateDraft, side: CardSide, key: string, patch: Partial<TemplateElementDTO>): TemplateDraft {
  return { ...d, [sideKey(side)]: d[sideKey(side)].map((e) => (e.key === key ? { ...e, ...patch } : e)) };
}

/** New rows go to the end of the side; defaults follow the app builder (label from the schema, M, hidden when empty). */
export function addElement(d: TemplateDraft, side: CardSide, kind: 'FIELD' | 'SECTION_BREAK' | 'COLUMN_BREAK', attribute?: SchemaAttributeDTO): { draft: TemplateDraft; key: string } {
  const key = newKey();
  const base = { key, id: null, position: 0, side, sectionLabel: null, repeatable: null, field: null };
  const el: DraftElement = kind === 'FIELD' && attribute
    ? { ...base, type: 'FIELD', field: { id: null, schemaAttributeId: attribute.attributeId, attributeName: attribute.name, semanticRole: null, fieldLabel: attribute.label ?? attribute.name, hideIfEmpty: true, audioAction: false, fontSize: 16, alignment: 'LEFT', color: '#111827' } }
    : kind === 'SECTION_BREAK' ? { ...base, type: 'SECTION_BREAK', sectionLabel: 'Phần mới', repeatable: false } : { ...base, type: 'COLUMN_BREAK' };
  return { draft: { ...d, [sideKey(side)]: [...d[sideKey(side)], el] }, key };
}

/**
 * Rules the proposed PUT would enforce (templates_ui.md §8.2); the UI mirrors them so a save never surprises.
 * Column sizes: templates.name 255, template_elements.section_label 100, template_fields.field_label 255.
 */
export function validateDraft(d: TemplateDraft): { errors: string[]; fields: Record<string, string> } {
  const errors: string[] = [];
  const fields: Record<string, string> = {};
  if (!d.name.trim()) fields.name = 'Bắt buộc.';
  else if (d.name.trim().length > 255) fields.name = 'Tối đa 255 ký tự.';
  for (const side of ['FRONT', 'BACK'] as const) {
    const list = d[sideKey(side)];
    if (!list.some((e) => e.type === 'FIELD')) errors.push(`${SIDE_LABEL[side]} cần ít nhất một trường.`);
    for (const e of list) {
      if (e.type === 'SECTION_BREAK' && (e.sectionLabel ?? '').length > 100) fields[e.key] = 'Tên phần tối đa 100 ký tự.';
      if (e.type === 'FIELD' && (e.field?.fieldLabel ?? '').length > 255) fields[e.key] = 'Nhãn tối đa 255 ký tự.';
    }
  }
  for (const q of quizChecks(draftElements(d))) if (!q.ok) errors.push(`${q.label}: ${modeProblem(q)}`);
  if (Object.keys(fields).length) errors.push('Kiểm tra các ô được đánh dấu.');
  return { errors, fields };
}

export const sameDraft = (a: TemplateDraft, b: TemplateDraft) => JSON.stringify(toUpdate(a, null)) === JSON.stringify(toUpdate(b, null));
