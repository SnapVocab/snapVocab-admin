/**
 * Canonical Shop Admin Domain Contracts matching backend shop DTOs.
 */

export type ShopItemType = 'THEME' | 'AVATAR_FRAME' | 'XP_BOOSTER' | 'STREAK_FREEZE';

export type ShopItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ThemeKey = 'DEFAULT' | 'MIDNIGHT_NEON' | 'SUNSET_AMBER' | 'FOREST_MINT';

export type InputType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'SELECT'
  | 'IMAGE';

export interface FieldSpec {
  name: string;
  inputType: InputType;
  required: boolean;
  requiredToPublish: boolean;
  editableIn: ShopItemStatus[];
  min?: number | null;
  max?: number | null;
  defaultValue?: unknown;
  pattern?: string | null;
  options?: string[] | null;
  formats?: string[] | null;
  maxBytes?: number | null;
  dimensions?: string | null;
}

export interface TypeSpec {
  type: ShopItemType;
  behavior: 'EQUIP' | 'ACTIVATE' | 'PASSIVE';
  stackable: boolean;
  fixed: Record<string, unknown>;
  fields: FieldSpec[];
}

export interface ShopItemTypeMetadataDTO {
  commonFields: FieldSpec[];
  types: TypeSpec[];
}

export interface AdminShopItemDTO {
  id: number;
  version: number;
  code: string;
  type: ShopItemType;
  behavior: 'EQUIP' | 'ACTIVATE' | 'PASSIVE';
  name: string;
  description: string | null;
  iconKey: string | null;
  iconUrl: string | null;
  status: ShopItemStatus;
  purchasable: boolean;
  price: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  sortOrder: number;
  themeKey: string | null;
  frameAssetKey: string | null;
  frameAssetUrl: string | null;
  boostDurationMinutes: number | null;
  maxQuantity: number | null;
  multiplier: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopItemForm {
  code?: string;
  type?: ShopItemType;
  name?: string;
  description?: string;
  iconKey?: string | null;
  purchasable?: boolean;
  price?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  sortOrder?: number;
  themeKey?: string | null;
  frameAssetKey?: string | null;
  boostDurationMinutes?: number | null;
  maxQuantity?: number | null;
}

export interface ShopItemUpdatePayload extends ShopItemForm {
  version: number;
}

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  pages: number;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  objectName: string;
  contentType: string;
  expiredAt: number;
}

export interface UploadUrlRequest {
  fileName: string;
}

export interface ShopItemListParams {
  status?: ShopItemStatus | 'ALL' | string;
  type?: ShopItemType | 'ALL' | string;
  q?: string;
  page?: number;
  size?: number;
}
