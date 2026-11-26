/**
 * Contracts of the endpoints the content screens use:
 *   GET/POST /api/collections · GET/PUT/DELETE /api/collections/{id} · GET/POST /api/collections/{id}/topics?parentId=
 *   GET /api/topics/{id}?page=&size= (items) · POST/PUT/DELETE /api/topics/{id}/items[/{itemId}] · GET /api/topics/{id}/schema
 *   PUT /api/topics/{id}/active-template/{templateId} · GET /api/schemas/{id}
 *   GET /api/words/suggest?q=&page=&size= · POST /api/words/lookup { words } · GET /api/words/lookup?q= · GET /api/words/{id}
 *   Admin content v1 (ROLE_ADMIN): PUT/DELETE /api/admin/words/{id} · POST /api/admin/words/{id}/restore ·
 *   GET /api/admin/words/deleted · PUT/DELETE /api/admin/topics/{id} · POST /api/admin/topics/{id}/hide|restore ·
 *   GET /api/admin/topics/hidden?collectionId=
 * Still missing on the backend: draft/publish (OQ-ADS-08).
 */

export interface Page<T> {
  data: T[];
  meta: { page: number; size: number; total: number; pages: number };
}

export interface CollectionDTO {
  id: number;
  name: string;
  translation: string | null;
  type: 'SYSTEM' | 'USER';
  ownerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopicDTO {
  id: number;
  name: string;
  translation: string | null;
  description: string | null;
  descriptionTranslation: string | null;
  parentId: number | null;
  activeTemplateId: number | null;
  activeTemplateName: string | null;
  activeTemplateCode: string | null;
  hasChildren: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors backend DataType (validated in TopicService.validateDataType). */
export type DataType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'NUMBER' | 'BOOLEAN' | 'DATE';

export interface SchemaAttributeDTO {
  attributeId: number;
  name: string;
  label: string | null;
  dataType: DataType;
  required: boolean;
  position: number;
}

export interface SchemaAttributeGroupDTO {
  groupId: number;
  name: string;
  label: string | null;
  multiple: boolean;
  position: number;
  attributes: SchemaAttributeDTO[];
}

export interface TopicSchemaDTO {
  schemaId: number | null;
  topicId: number;
  schemaName: string | null;
  shared: boolean;
  usageCount: number;
  groups: SchemaAttributeGroupDTO[];
}

export interface TemplateDTO {
  id: number;
  schemaId: number;
  code: string | null;
  name: string;
  /** Lombok `isDefault` serializes as "default". */
  default?: boolean;
}

export interface SchemaDTO {
  id: number;
  code: string | null;
  name: string;
  templates: TemplateDTO[];
}

export type AttrValues = Record<string, string | null>;
/** EAV item: single groups are objects, multiple groups are arrays of objects (TopicService.buildTopicItemDataList). */
export type TopicItemData = { topicItemId: number; createdAt: string } & Record<string, unknown>;
/** POST /api/topics/{id}/items body: the same group shape, keyed by group name. */
export type CreateTopicItem = Record<string, AttrValues | AttrValues[]>;

export interface CreateCollection { name: string; translation: string | null; type: 'SYSTEM' }
export interface UpdateCollection { name: string; translation: string | null }
export interface CreateTopic { name: string; translation: string | null; description: string | null; descriptionTranslation: string | null; parentId: number | null }

export interface WordSuggestDTO { id: number; word: string }
export interface LookupResultDTO {
  wordId?: number;
  /** Set when an admin soft-deleted the word: suggest/lookup/scan skip it, GET /api/words/{id} still opens it. */
  deletedAt?: string | null;
  /** Optimistic lock sent back with PUT /api/admin/words/{id}. */
  version?: number;
  exists: boolean;
  word: string;
  langCode: string;
  pronunciations: { ipa: string; region: string | null }[];
  /** `id` = word_definitions.id (the editor keeps it); `pos` is the label ("Danh từ"), POS_OPTIONS maps codes. */
  meanings: { id?: number; definition: string; definitionLang: string | null; example: string | null; pos: string | null; subPos: string | null; links: string[] | null }[];
  translations: { langCode: string; translation: string }[];
  relations: { relatedWord: string; relationType: string }[];
}

/** PUT /api/admin/words/{id}: the whole editable part; meanings with `id` are kept, without are new, absent are removed. */
export interface UpdateWord {
  version: number;
  pronunciations: { ipa: string; region: string | null }[];
  translations: string[];
  meanings: { id: number | null; pos: string | null; definitionLang: 'vi' | 'en'; definition: string; example: string | null }[];
}
export interface DeletedWordDTO { id: number; word: string; deletedAt: string }
export interface UpdateTopic { name: string; translation: string | null; description: string | null; descriptionTranslation: string | null }
/** A hidden system topic (OQ-CNT-01); `learners` counts the topic and its subtopics, `subtopics` those hidden with it. */
export interface HiddenTopicDTO {
  id: number; name: string; translation: string | null; parentId: number | null; parentName: string | null;
  hiddenAt: string; hiddenBy: string | null; reason: string | null; subtopics: number; learners: number;
}
