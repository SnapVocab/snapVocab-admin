/**
 * Contracts of the EXISTING learner/admin endpoints the content screens use (NOW scope):
 *   GET/POST /api/collections · GET/PUT/DELETE /api/collections/{id} · GET/POST /api/collections/{id}/topics?parentId=
 *   GET /api/topics/{id}?page=&size= (items) · POST /api/topics/{id}/items · GET /api/topics/{id}/schema
 *   PUT /api/topics/{id}/active-template/{templateId} · GET /api/schemas/{id}
 *   GET /api/words/suggest?q=&page=&size= · POST /api/words/lookup { words } · GET /api/words/lookup?q=
 * Missing on the backend (shown as "cần API" in the UI): topic update/delete, item update/delete,
 * dictionary writes, soft delete, draft/publish (OQ-ADS-08).
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
  exists: boolean;
  word: string;
  langCode: string;
  pronunciations: { ipa: string; region: string | null }[];
  meanings: { definition: string; definitionLang: string | null; example: string | null; pos: string | null; subPos: string | null; links: string[] | null }[];
  translations: { langCode: string; translation: string }[];
  relations: { relatedWord: string; relationType: string }[];
}
