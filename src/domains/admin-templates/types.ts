import type { SchemaAttributeGroupDTO } from '../admin-content/types';

/**
 * Real reads (NOW): GET /api/schemas (ROLE_ADMIN gets every schema, learner forks included) and GET /api/schemas/{id},
 * built by SchemaMapper.toDto. TemplateMapper leaves out `hidden` FIELD elements (server-only Quiz bindings).
 * Writes have no endpoint yet; PUT /api/admin/templates/{id} and POST …/default are proposed (templates_ui.md §8) and
 * run on an in-memory draft behind VITE_ADMIN_TEMPLATES_FIXTURES until built (config.ts).
 * Never call PUT /api/schemas/{id} from the admin: it rebuilds attribute groups (orphanRemoval) and can drop item values.
 */
export type SemanticRole = 'TARGET_WORD' | 'EXAMPLE_SENTENCE' | 'NATIVE_TRANSLATION' | 'DEFINITION' | 'AUDIO' | 'IMAGE';
export type CardSide = 'FRONT' | 'BACK';
export type ElementType = 'FIELD' | 'COLUMN_BREAK' | 'SECTION_BREAK';
export type Alignment = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
export type QuizMode = 'MCQ' | 'MATCHING' | 'FILL_BLANK';

export interface TemplateFieldDTO {
  id?: number | null;
  schemaAttributeId: number;
  attributeName?: string | null;
  semanticRole: SemanticRole | null;
  fieldLabel: string | null;
  hideIfEmpty: boolean;
  audioAction: boolean;
  fontSize: number | null;
  alignment: Alignment | null;
  color: string | null;
}

export interface TemplateElementDTO {
  id?: number | null;
  position: number;
  type: ElementType;
  side: CardSide;
  sectionLabel: string | null;
  /** Set on SECTION_BREAK only. */
  repeatable: boolean | null;
  field: TemplateFieldDTO | null;
}

export interface TemplateDTO {
  id: number;
  schemaId: number;
  code: string | null;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  elements: TemplateElementDTO[];
  /** Comes with the write API (templates.version); null on today's GET, so the UI never shows a made-up version. */
  version: number | null;
}

export interface SchemaDTO {
  id: number;
  code: string | null;
  isSystem: boolean;
  userId: number | null;
  name: string;
  description: string | null;
  groups: SchemaAttributeGroupDTO[];
  templates: TemplateDTO[];
}

/** Proposed PUT /api/admin/templates/{id} body: the whole element list, positions 0…n with FRONT first. */
export interface TemplateUpdate {
  version: number | null;
  name: string;
  elements: TemplateElementDTO[];
}

/** Editor draft: one ordered list per side; `key` is stable while rows move. */
export interface DraftElement extends TemplateElementDTO { key: string }
export interface TemplateDraft { name: string; front: DraftElement[]; back: DraftElement[] }

/** Strip filter of the library. */
export type LibraryFilter = 'ALL' | 'DEFAULT' | 'QUIZ' | 'UNUSED' | 'ISSUES';
