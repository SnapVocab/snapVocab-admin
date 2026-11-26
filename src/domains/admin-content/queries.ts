import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTopicItem, createCollection, createTopic, deleteCollection, deleteTopic, deleteTopicItem, deleteWord, getDeletedWords, getHiddenTopics, hideTopic, restoreTopic,
  getSchema, getSystemCollections, getTopicItems, getTopics, getTopicSchema, getWordById, lookupWord, lookupWords,
  restoreWord, setActiveTemplate, suggestWords, updateCollection, updateTopic, updateTopicItem, updateWord,
} from './api';
import type {
  CreateCollection, CreateTopic, CreateTopicItem, LookupResultDTO, UpdateCollection, UpdateTopic, UpdateWord, WordSuggestDTO,
} from './types';

export const contentKeys = {
  collections: ['adminContent', 'collections'] as const,
  topics: (collectionId: number, parentId: number | null) => ['adminContent', 'topics', collectionId, parentId] as const,
  allTopics: (collectionId: number) => ['adminContent', 'topics', collectionId] as const,
  items: (topicId: number) => ['adminContent', 'items', topicId] as const,
  topicSchema: (topicId: number) => ['adminContent', 'topicSchema', topicId] as const,
  schema: (schemaId: number) => ['adminContent', 'schema', schemaId] as const,
  words: (q: string, page: number, size: number) => ['adminContent', 'words', q, page, size] as const,
  word: (word: string) => ['adminContent', 'word', word] as const,
  wordById: (id: number) => ['adminContent', 'wordById', id] as const,
  deletedWords: (q: string, page: number) => ['adminContent', 'deletedWords', q, page] as const,
  hiddenTopics: (collectionId: number) => ['adminContent', 'hiddenTopics', collectionId] as const,
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
      const byId = new Map<number, LookupResultDTO>();
      const byWord = new Map<string, LookupResultDTO>();
      for (const d of details) {
        if (d.wordId != null) byId.set(d.wordId, d);
        byWord.set(d.word.toLowerCase(), d);
      }
      return {
        meta: result.meta,
        rows: result.data.map((w): WordRow => ({ ...w, lookup: byId.get(w.id) ?? byWord.get(w.word.toLowerCase()) ?? null })),
      };
    },
    placeholderData: keepPreviousData,
  });

export const useWordLookup = (word: string | null) =>
  useQuery({ queryKey: contentKeys.word(word ?? ''), queryFn: () => lookupWord(word!), enabled: !!word });

export const useWordById = (id: number | null) =>
  useQuery({ queryKey: contentKeys.wordById(id ?? 0), queryFn: () => getWordById(id!), enabled: id !== null });

/** Every dictionary view that can show the word: the letter pages, both detail queries and the deleted list. */
function invalidateWords(client: ReturnType<typeof useQueryClient>) {
  for (const key of ['words', 'word', 'wordById', 'deletedWords']) void client.invalidateQueries({ queryKey: ['adminContent', key] });
}

export function useUpdateWord(id: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (body: UpdateWord) => updateWord(id, body), onSuccess: () => invalidateWords(client) });
}

export function useDeleteWord(id: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (reason: string | null) => deleteWord(id, reason), onSuccess: () => invalidateWords(client) });
}

export function useRestoreWord(id: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => restoreWord(id), onSuccess: () => invalidateWords(client) });
}

export const useDeletedWords = (q: string, page: number, size: number, enabled: boolean) =>
  useQuery({ queryKey: contentKeys.deletedWords(q, page), queryFn: () => getDeletedWords(q, page, size), enabled, placeholderData: keepPreviousData });

/** A rename shows in the tree, the parent's child grid and the header, all read from the collection's topic lists. */
export function useUpdateTopic(id: number, collectionId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTopic) => updateTopic(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.allTopics(collectionId) }),
  });
}

export function useDeleteTopic(id: number, collectionId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => deleteTopic(id, reason),
    onSuccess: () => invalidateTopics(client, collectionId),
  });
}

/** The tree, child grids and the "Đã ẩn" list all change when a topic is hidden, restored or purged. */
function invalidateTopics(client: ReturnType<typeof useQueryClient>, collectionId: number) {
  void client.invalidateQueries({ queryKey: contentKeys.allTopics(collectionId) });
  void client.invalidateQueries({ queryKey: contentKeys.hiddenTopics(collectionId) });
}

export const useHiddenTopics = (collectionId: number | null) =>
  useQuery({ queryKey: contentKeys.hiddenTopics(collectionId ?? 0), queryFn: () => getHiddenTopics(collectionId!), enabled: collectionId !== null });

export function useHideTopic(id: number, collectionId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (reason: string) => hideTopic(id, reason), onSuccess: () => invalidateTopics(client, collectionId) });
}

export function useRestoreTopic(collectionId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: number) => restoreTopic(id), onSuccess: () => invalidateTopics(client, collectionId) });
}

export function useUpdateItem(topicId: number, itemId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTopicItem) => updateTopicItem(topicId, itemId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.items(topicId) }),
  });
}

export function useDeleteItem(topicId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => deleteTopicItem(topicId, itemId),
    onSuccess: () => client.invalidateQueries({ queryKey: contentKeys.items(topicId) }),
  });
}
