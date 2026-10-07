import type {
  AdminShopItemDTO,
  PaginationResponse,
  ShopItemForm,
  ShopItemListParams,
  ShopItemTypeMetadataDTO,
  ShopItemUpdatePayload,
} from './types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveShopItem,
  createShopItem,
  deleteShopItem,
  getAdminShopItem,
  getAdminShopItems,
  getShopItemTypes,
  publishShopItem,
  updateShopItem,
} from './api';

export const adminShopKeys = {
  all: ['adminShop'] as const,
  itemTypes: () => ['adminShop', 'itemTypes'] as const,
  list: (params: ShopItemListParams = {}) => ['adminShop', 'list', params] as const,
  detail: (id: number | string) => ['adminShop', 'detail', String(id)] as const,
};

/**
 * Hook to fetch dynamic form metadata
 */
export function useShopItemTypes() {
  return useQuery<ShopItemTypeMetadataDTO>({
    queryKey: adminShopKeys.itemTypes(),
    queryFn: () => getShopItemTypes(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch paginated ShopItem list
 */
export function useAdminShopItems(params: ShopItemListParams = {}) {
  return useQuery<PaginationResponse<AdminShopItemDTO>>({
    queryKey: adminShopKeys.list(params),
    queryFn: () => getAdminShopItems(params),
  });
}

/**
 * Hook to fetch single item detail
 */
export function useAdminShopItem(id: number | string | null | undefined) {
  return useQuery<AdminShopItemDTO>({
    queryKey: adminShopKeys.detail(id || 0),
    queryFn: () => getAdminShopItem(id!),
    enabled: Boolean(id),
  });
}

/**
 * Mutation to create a DRAFT item
 */
export function useCreateShopItem() {
  const queryClient = useQueryClient();

  return useMutation<AdminShopItemDTO, Error, ShopItemForm>({
    mutationFn: payload => createShopItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminShopKeys.all });
    },
  });
}

/**
 * Mutation to update an existing item
 */
export function useUpdateShopItem() {
  const queryClient = useQueryClient();

  return useMutation<
    AdminShopItemDTO,
    Error,
    { id: number | string; payload: ShopItemUpdatePayload }
  >({
    mutationFn: ({ id, payload }) => updateShopItem(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminShopKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['adminShop', 'list'] });
      // A draft's type/themeKey change frees or takes a theme.
      queryClient.invalidateQueries({ queryKey: adminShopKeys.itemTypes() });
    },
  });
}

/**
 * Mutation to publish a DRAFT item
 */
export function usePublishShopItem() {
  const queryClient = useQueryClient();

  return useMutation<AdminShopItemDTO, Error, number | string>({
    mutationFn: id => publishShopItem(id),
    onSuccess: (data) => {
      queryClient.setQueryData(adminShopKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['adminShop', 'list'] });
    },
  });
}

/**
 * Mutation to archive a PUBLISHED item
 */
export function useArchiveShopItem() {
  const queryClient = useQueryClient();

  return useMutation<AdminShopItemDTO, Error, number | string>({
    mutationFn: id => archiveShopItem(id),
    onSuccess: (data) => {
      queryClient.setQueryData(adminShopKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['adminShop', 'list'] });
    },
  });
}

/**
 * Mutation to hard delete a DRAFT item
 */
export function useDeleteShopItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number | string>({
    mutationFn: id => deleteShopItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminShopKeys.all });
    },
  });
}
