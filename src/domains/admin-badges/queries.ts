import { useQuery } from '@tanstack/react-query';
import { getAdminBadge, getAdminBadges, getRefillEstimate } from './api';

export const badgeKeys = {
  list: ['adminBadges', 'list'] as const,
  detail: (id: number) => ['adminBadges', 'detail', id] as const,
  estimate: (id: number) => ['adminBadges', 'estimate', id] as const,
};

export function useAdminBadges() {
  return useQuery({ queryKey: badgeKeys.list, queryFn: getAdminBadges, retry: false });
}

export function useAdminBadge(id?: number) {
  return useQuery({
    queryKey: badgeKeys.detail(id ?? 0),
    queryFn: () => getAdminBadge(id!),
    enabled: id !== undefined,
    staleTime: 0,
    retry: false,
  });
}

/** Counted when the Bật dialog opens (PD-BDG-13d); a failure shows "Chưa có ước tính" and never blocks Bật. */
export function useRefillEstimate(id: number, enabled: boolean) {
  return useQuery({ queryKey: badgeKeys.estimate(id), queryFn: () => getRefillEstimate(id), enabled, staleTime: 0, gcTime: 0, retry: false });
}
