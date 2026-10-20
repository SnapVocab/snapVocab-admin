import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTopicItem, createCollection, createTopic, deleteCollection, getSchema, getSystemCollections, getTopicItems,
  getTopics, getTopicSchema, lookupWord, lookupWords, setActiveTemplate, suggestWords, updateCollection,
} from './api';
import type { CreateCollection, CreateTopic, CreateTopicItem, LookupResultDTO, UpdateCollection, WordSuggestDTO } from './types';

export const contentKeys = {
  collections: ['adminContent', 'collections'] as const,
  topics: (collectionId: number, parentId: number | null) => ['adminContent', 'topics', collectionId, parentId] as const,
  allTopics: (collectionId: number) => ['adminContent', 'topics', collectionId] as const,
  items: (topicId: number) => ['adminContent', 'items', topicId] as const,
  topicSchema: (topicId: number) => ['adminContent', 'topicSchema', topicId] as const,
  schema: (schemaId: number) => ['adminContent', 'schema', schemaId] as const,
  words: (q: string, page: number, size: number) => ['adminContent', 'words', q, page, size] as const,
  word: (word: string) => ['adminContent', 'word', word] as const,
};

export const useSystemCollections = () => useQuery({ queryKey: contentKeys.collections, queryFn: getSystemCollections });

export const useTopics = (collectionId: number | null, parentId: number | null, enabled = true) =>
  useQuery({
    queryKey: contentKeys.topics(collectionId ?? 0, parentId),
    queryFn: () => getTopics(collectionId!, parentId),
    enabled: enabled && collectionId !== null,
  });

export const useTopicItems = (topicId: number | null) =>
  useQuery({ queryKey: contentKeys.items(topicId ?? 0), queryFn: () => getTopicItems(topicId!), enabled: topicId !== null });

export const useTopicSchema = (topicId: number | null) =>
  useQuery({ queryKey: contentKeys.topicSchema(topicId ?? 0), queryFn: () => getTopicSchema(topicId!), enabled: topicId !== null, staleTime: 10 * 60_000 });

export const useSchema = (schemaId: number | null | undefined) =>
  useQuery({ queryKey: contentKeys.schema(schemaId ?? 0), queryFn: () => getSchema(schemaId!), enabled: !!schemaId, staleTime: 10 * 60_000 });

export function useCreateCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCollection) => createCollection(body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.collections }),
  });
}

export function useUpdateCollection(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCollection) => updateCollection(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.collections }),
  });
}

export function useDeleteCollection(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCollection(id),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.collections }),
  });
}

/** A new topic changes its parent's list (and the parent's hasChildren flag one level up). */
export function useCreateTopic(collectionId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTopic) => createTopic(collectionId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.allTopics(collectionId) }),
  });
}

export function useAddItem(topicId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTopicItem) => addTopicItem(topicId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.items(topicId) }),
  });
}

export function useSetTemplate(topicId: number, collectionId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (templateId: number) => setActiveTemplate(topicId, templateId),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.allTopics(collectionId) }),
  });
}

export interface WordRow { id: number; word: string; lookup: LookupResultDTO | null }

/** One dictionary page: alphabetical prefix search, then one batch lookup for the page's details. */
export const useWordPage = (q: string, page: number, size: number) =>
  useQuery({
    queryKey: contentKeys.words(q, page, size),
    queryFn: async () => {
      const result = await suggestWords(q, page, size);
      const details = result.data.length ? await lookupWords(result.data.map((w: WordSuggestDTO) => w.word)) : [];
      const byWord = new Map(details.map((d) => [d.word.toLowerCase(), d]));
      return { meta: result.meta, rows: result.data.map((w): WordRow => ({ ...w, lookup: byWord.get(w.word.toLowerCase()) ?? null })) };
    },
    placeholderData: keepPreviousData,
  });

export const useWordLookup = (word: string | null) =>
  useQuery({ queryKey: contentKeys.word(word ?? ''), queryFn: () => lookupWord(word!), enabled: !!word });
