import { apiClient } from '../../lib/api-client';
import type {
  CollectionDTO, CreateCollection, CreateTopic, CreateTopicItem, LookupResultDTO, Page, SchemaDTO,
  TopicDTO, TopicItemData, TopicSchemaDTO, UpdateCollection, WordSuggestDTO,
} from './types';

/** Real endpoints only (see types.ts). Admin rights come from ROLE_ADMIN on the shared learner endpoints. */

export const getSystemCollections = () => apiClient<CollectionDTO[]>('/api/collections/system');
export const createCollection = (body: CreateCollection) => apiClient<CollectionDTO>('/api/collections', { method: 'POST', body });
export const updateCollection = (id: number, body: UpdateCollection) => apiClient<CollectionDTO>(`/api/collections/${id}`, { method: 'PUT', body });
export const deleteCollection = (id: number) => apiClient<void>(`/api/collections/${id}`, { method: 'DELETE' });

/** Root topics when parentId is null, otherwise the children of parentId. */
export const getTopics = (collectionId: number, parentId: number | null, page = 0, size = 100) =>
  apiClient<Page<TopicDTO>>(`/api/collections/${collectionId}/topics`, {
    params: { page, size, ...(parentId === null ? {} : { parentId }) },
  });
export const createTopic = (collectionId: number, body: CreateTopic) =>
  apiClient<TopicDTO>(`/api/collections/${collectionId}/topics`, { method: 'POST', body });

/** ponytail: one page of up to 500 items covers every topic today (max 500, avg 83); add paging past that. */
export const ITEMS_PAGE_SIZE = 500;
export const getTopicItems = (topicId: number) =>
  apiClient<Page<TopicItemData>>(`/api/topics/${topicId}`, { params: { page: 0, size: ITEMS_PAGE_SIZE } });
export const addTopicItem = (topicId: number, body: CreateTopicItem) =>
  apiClient<TopicItemData>(`/api/topics/${topicId}/items`, { method: 'POST', body });

export const getTopicSchema = (topicId: number) => apiClient<TopicSchemaDTO>(`/api/topics/${topicId}/schema`);
export const getSchema = (schemaId: number) => apiClient<SchemaDTO>(`/api/schemas/${schemaId}`);
export const setActiveTemplate = (topicId: number, templateId: number) =>
  apiClient<TopicDTO>(`/api/topics/${topicId}/active-template/${templateId}`, { method: 'PUT' });

/** Prefix search, alphabetical, server-paged (WordRepository.findWordSuggestByLangCodeEn). */
export const suggestWords = (q: string, page: number, size: number) =>
  apiClient<Page<WordSuggestDTO>>('/api/words/suggest', { params: { q, page, size } });
/** Up to 100 words per call; unknown words come back with exists = false. */
export const lookupWords = (words: string[]) =>
  apiClient<LookupResultDTO[]>('/api/words/lookup', { method: 'POST', body: { words } });
export const lookupWord = (q: string) => apiClient<LookupResultDTO>('/api/words/lookup', { params: { q } });
