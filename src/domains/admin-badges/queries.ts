import { useQuery } from '@tanstack/react-query';
import { getAdminBadge, getAdminBadges } from './api';

export const badgeKeys = {
  list: ['adminBadges', 'list'] as const,
  detail: (id: number) => ['adminBadges', 'detail', id] as const,
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
