import { useQueries, useQuery } from '@tanstack/react-query';
import { getTopics } from '../admin-content/api';
import { contentKeys, useSystemCollections } from '../admin-content/queries';
import type { CollectionDTO, TopicDTO } from '../admin-content/types';
import { getSchemas } from './api';

export const templateKeys = { schemas: ['adminTemplates', 'schemas'] as const };

export const useTemplateSchemas = () => useQuery({ queryKey: templateKeys.schemas, queryFn: getSchemas, retry: false });

export interface TopicBranch { collection: CollectionDTO; root: TopicDTO; children: TopicDTO[] }

/**
 * Every system topic: the roots of each system collection, then the children of each root (1 + roots requests on the
 * Topics screen's cache keys, so switching a topic's template there refreshes these counts).
 * ponytail: one page of 100 per level, enough today (14 roots, at most 27 children); an admin count API replaces this.
 */
export function useSystemTopics() {
  const collections = useSystemCollections();
  const list = collections.data ?? [];
  const roots = useQueries({ queries: list.map((c) => ({ queryKey: contentKeys.topics(c.id, null), queryFn: () => getTopics(c.id, null) })) });
  const parents = list.flatMap((c, i) => (roots[i]?.data?.data ?? []).filter((t) => t.hasChildren).map((t) => ({ c, t })));
  const children = useQueries({ queries: parents.map(({ c, t }) => ({ queryKey: contentKeys.topics(c.id, t.id), queryFn: () => getTopics(c.id, t.id) })) });

  const branches: TopicBranch[] = list.flatMap((collection, i) => (roots[i]?.data?.data ?? []).map((root) => {
    const at = parents.findIndex((p) => p.t.id === root.id);
    return { collection, root, children: at < 0 ? [] : children[at]?.data?.data ?? [] };
  }));
  const queries = [...roots, ...children];
  return {
    branches,
    topics: branches.flatMap((b) => [b.root, ...b.children]),
    isPending: collections.isPending || queries.some((q) => q.isPending),
    isError: collections.isError || queries.some((q) => q.isError),
    refetch: () => { void collections.refetch(); queries.forEach((q) => void q.refetch()); },
  };
}
