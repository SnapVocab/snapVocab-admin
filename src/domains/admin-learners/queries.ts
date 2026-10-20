import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { banLearner, getLearner, listLearners, sendPasswordReset, unbanLearner } from './api';
import type { AdminLearnerDetail, LearnerListParams } from './types';

export const learnerKeys = {
  all: ['adminLearners'] as const,
  list: (params: LearnerListParams) => ['adminLearners', 'list', params] as const,
  detail: (id: number) => ['adminLearners', 'detail', id] as const,
};

/** Server-paged list; the previous page stays on screen while the next one loads. */
export const useLearners = (params: LearnerListParams) =>
  useQuery({ queryKey: learnerKeys.list(params), queryFn: () => listLearners(params), placeholderData: keepPreviousData });

export const useLearner = (id: number) => useQuery({ queryKey: learnerKeys.detail(id), queryFn: () => getLearner(id) });

/** Ban/unban returns the fresh detail; lists are refetched because status and summary counts change. */
export function useSetBan(id: number) {
  const client = useQueryClient();
  return useMutation<AdminLearnerDetail, Error, { banned: boolean; reason: string }>({
    mutationFn: ({ banned, reason }) => (banned ? banLearner(id, reason) : unbanLearner(id, reason)),
    onSuccess: (detail) => {
      client.setQueryData(learnerKeys.detail(id), detail);
      void client.invalidateQueries({ queryKey: ['adminLearners', 'list'] });
    },
  });
}

export const usePasswordReset = (id: number) => useMutation<void, Error, void>({ mutationFn: () => sendPasswordReset(id) });
