import type {
  AdminShopItemDTO,
  PaginationResponse,
  PresignedUploadResponse,
  ShopItemForm,
  ShopItemListParams,
  ShopItemTypeMetadataDTO,
  ShopItemUpdatePayload,
} from './types';
import { apiClient, uploadBinaryToPresignedUrl } from '../../lib/api-client';

const BASE_URL = '/api/admin/shop';

/**
 * 1. GET /api/admin/shop/item-types
 * Returns dynamic form metadata: fields, limits, defaults, free themeKeys, lock rules.
 */
export async function getShopItemTypes(): Promise<ShopItemTypeMetadataDTO> {
  return apiClient<ShopItemTypeMetadataDTO>(`${BASE_URL}/item-types`);
}

/**
 * 2. GET /api/admin/shop/items?status=&type=&q=&page=0&size=20
 * Returns paginated list of ShopItems sorted by newest update first.
 */
export async function getAdminShopItems(
  params: ShopItemListParams = {},
): Promise<PaginationResponse<AdminShopItemDTO>> {
  const queryParams: Record<string, string | number | undefined> = {};

  if (params.status && params.status !== 'ALL') {
    queryParams.status = params.status;
  }
  if (params.type && params.type !== 'ALL') {
    queryParams.type = params.type;
  }
  if (params.q && params.q.trim()) {
    queryParams.q = params.q.trim();
  }
  queryParams.page = params.page ?? 0;
  queryParams.size = params.size ?? 20;

  return apiClient<PaginationResponse<AdminShopItemDTO>>(`${BASE_URL}/items`, {
    params: queryParams,
  });
}

/**
 * 3. GET /api/admin/shop/items/{id}
 * Returns item detail for the editor.
 */
export async function getAdminShopItem(id: number | string): Promise<AdminShopItemDTO> {
  return apiClient<AdminShopItemDTO>(`${BASE_URL}/items/${id}`);
}

/**
 * 4. POST /api/admin/shop/items
 * Creates a new DRAFT item.
 */
export async function createShopItem(payload: ShopItemForm): Promise<AdminShopItemDTO> {
  return apiClient<AdminShopItemDTO>(`${BASE_URL}/items`, {
    method: 'POST',
    body: payload,
  });
}

/**
 * 5. PATCH /api/admin/shop/items/{id}
 * Partial update: any ShopItemForm fields + required current version.
 */
export async function updateShopItem(
  id: number | string,
  payload: ShopItemUpdatePayload,
): Promise<AdminShopItemDTO> {
  return apiClient<AdminShopItemDTO>(`${BASE_URL}/items/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

/**
 * 6. POST /api/admin/shop/items/{id}/publish
 * Moves DRAFT -> PUBLISHED after full server-side revalidation.
 */
export async function publishShopItem(id: number | string): Promise<AdminShopItemDTO> {
  return apiClient<AdminShopItemDTO>(`${BASE_URL}/items/${id}/publish`, {
    method: 'POST',
  });
}

/**
 * 7. POST /api/admin/shop/items/{id}/archive
 * Moves PUBLISHED -> ARCHIVED (terminal state, ceases sales).
 */
export async function archiveShopItem(id: number | string): Promise<AdminShopItemDTO> {
  return apiClient<AdminShopItemDTO>(`${BASE_URL}/items/${id}/archive`, {
    method: 'POST',
  });
}

/**
 * 8. DELETE /api/admin/shop/items/{id}
 * Hard deletes a DRAFT item (204 No Content).
 */
export async function deleteShopItem(id: number | string): Promise<void> {
  return apiClient<void>(`${BASE_URL}/items/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 9. POST /api/admin/shop/assets/upload-url
 * Obtains presigned S3/MinIO PUT URL for a PNG/WebP asset.
 */
export async function createShopAssetUploadUrl(fileName: string): Promise<PresignedUploadResponse> {
  return apiClient<PresignedUploadResponse>(`${BASE_URL}/assets/upload-url`, {
    method: 'POST',
    body: { fileName },
  });
}

/**
 * End-to-end asset upload flow:
 * 1. Obtains upload URL with filename
 * 2. PUTs binary directly to storage
 * 3. Returns the objectName key to be stored in the item form.
 */
export async function uploadShopAsset(
  file: File,
): Promise<{ objectName: string; previewUrl: string }> {
  const presigned = await createShopAssetUploadUrl(file.name);
  const contentType = file.type || presigned.contentType || 'image/png';
  await uploadBinaryToPresignedUrl(presigned.uploadUrl, file, contentType);

  // Use local object URL for instant preview, objectName for identity
  const previewUrl = URL.createObjectURL(file);
  return {
    objectName: presigned.objectName,
    previewUrl,
  };
}
