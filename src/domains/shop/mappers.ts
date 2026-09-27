import { FieldSpec, ShopItemStatus, ShopItemType } from './types';
import { ApiClientError } from '../../lib/api-client';

/**
 * Checks if a given field is editable in the current item status,
 * based on the backend FieldSpec metadata.
 * If no spec or no editableIn rule is provided, defaults to editable only in DRAFT.
 */
export function isFieldEditable(
  fieldSpec: FieldSpec | undefined,
  status: ShopItemStatus
): boolean {
  if (!fieldSpec || !fieldSpec.editableIn) {
    return status === 'DRAFT';
  }
  return fieldSpec.editableIn.includes(status);
}

/**
 * Derived availability text for human display based on availableFrom and availableUntil.
 * This is ONLY a UI-derived UX helper, NOT a lifecycle status.
 */
export type AvailabilityState =
  | 'UNLIMITED'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'EXPIRED';

export interface DerivedAvailability {
  state: AvailabilityState;
  label: string;
  badgeClass: string;
}

export function deriveAvailability(
  availableFrom?: string | null,
  availableUntil?: string | null,
  now: Date = new Date()
): DerivedAvailability {
  const from = availableFrom ? new Date(availableFrom) : null;
  const until = availableUntil ? new Date(availableUntil) : null;

  if (!from && !until) {
    return {
      state: 'UNLIMITED',
      label: 'Không giới hạn',
      badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    };
  }

  if (from && now < from) {
    return {
      state: 'UPCOMING',
      label: 'Chưa mở bán',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }

  if (until && now > until) {
    return {
      state: 'EXPIRED',
      label: 'Đã kết thúc',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  }

  return {
    state: 'ACTIVE',
    label: 'Đang bán',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
}

/**
 * Map backend error into a key-value record of field-specific error messages.
 */
export function mapBackendErrorsToFields(
  error: unknown
): {
  fieldErrors: Record<string, string>;
  generalError?: string;
  isVersionConflict?: boolean;
  serverVersion?: number;
  lockedFields?: string[];
} {
  const fieldErrors: Record<string, string> = {};
  let generalError: string | undefined;
  let isVersionConflict = false;
  let serverVersion: number | undefined;
  let lockedFields: string[] | undefined;

  if (error instanceof ApiClientError) {
    // 1. Check version conflict
    if (error.code === 'VERSION_CONFLICT' || error.statusCode === 409) {
      if (error.details && typeof error.details.currentVersion === 'number') {
        isVersionConflict = true;
        serverVersion = error.details.currentVersion as number;
        generalError = `Vật phẩm này đã được chỉnh sửa ở phiên khác. Phiên bản hiện tại trên máy chủ là v${serverVersion}.`;
      }
    }

    // 2. Check field locked
    if (error.code === 'FIELD_LOCKED') {
      if (error.details && Array.isArray(error.details.fields)) {
        lockedFields = error.details.fields as string[];
        for (const field of lockedFields) {
          fieldErrors[field] = 'Trường này đã bị khóa ở trạng thái hiện tại.';
        }
      }
      generalError = 'Một số trường không thể thay đổi ở trạng thái hiện tại.';
    }

    // 3. Map specific shop error codes
    switch (error.code) {
      case 'SHOP_ITEM_CODE_EXISTS':
        fieldErrors.code = 'Mã code này đã tồn tại trong hệ thống. Vui lòng chọn mã khác.';
        break;
      case 'INVALID_THEME_KEY':
        fieldErrors.themeKey = 'Theme Key không hợp lệ hoặc không thuộc danh sách cho phép.';
        break;
      case 'INVALID_PRICE':
        fieldErrors.price = 'Giá vật phẩm không hợp lệ (phải từ 1 đến 100,000 Coin khi mở bán).';
        break;
      case 'INVALID_AVAILABILITY_WINDOW':
        fieldErrors.availableFrom = 'Khoảng thời gian mở bán không hợp lệ (Thời điểm bắt đầu phải trước thời điểm kết thúc).';
        fieldErrors.availableUntil = 'Thời điểm kết thúc phải sau thời điểm bắt đầu.';
        break;
      default:
        break;
    }

    // 4. Map structured field errors from error.fieldErrors
    if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
      for (const [f, msg] of Object.entries(error.fieldErrors)) {
        fieldErrors[f] = msg;
      }
    }

    if (!generalError && !Object.keys(fieldErrors).length) {
      generalError = error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu.';
    }
  } else if (error instanceof Error) {
    generalError = error.message;
  } else {
    generalError = 'Lỗi không xác định.';
  }

  return {
    fieldErrors,
    generalError,
    isVersionConflict,
    serverVersion,
    lockedFields,
  };
}

/**
 * Format type labels in Vietnamese
 */
export function formatShopItemTypeLabel(type?: ShopItemType | string | null): string {
  switch (type) {
    case 'THEME':
      return 'Chủ đề';
    case 'AVATAR_FRAME':
      return 'Khung Avatar';
    case 'XP_BOOSTER':
      return 'XP Booster';
    default:
      return type || '—';
  }
}

/**
 * Format theme key labels for friendly UI display
 */
export function formatThemeKeyLabel(themeKey?: string | null): string {
  switch (themeKey) {
    case 'MIDNIGHT_NEON':
      return 'Midnight Neon';
    case 'SUNSET_AMBER':
      return 'Sunset Amber';
    case 'FOREST_MINT':
      return 'Forest Mint';
    case 'DEFAULT':
      return 'Mặc định (Default)';
    default:
      return themeKey || '—';
  }
}

/**
 * Client-side validation for file uploads (MIME and size).
 * Icon max: 200 KB (204,800 bytes)
 * Frame max: 300 KB (307,200 bytes)
 */
export function validateAssetFile(
  file: File,
  type: 'icon' | 'frame'
): { valid: boolean; error?: string } {
  const allowedMime = ['image/png', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    return {
      valid: false,
      error: 'Định dạng file không hợp lệ. Chỉ chấp nhận định dạng PNG hoặc WebP.',
    };
  }

  const maxBytes = type === 'icon' ? 200 * 1024 : 300 * 1024;
  if (file.size > maxBytes) {
    const maxKb = type === 'icon' ? 200 : 300;
    return {
      valid: false,
      error: `Dung lượng file vượt quá giới hạn cho phép (${(file.size / 1024).toFixed(1)} KB > ${maxKb} KB).`,
    };
  }

  return { valid: true };
}
