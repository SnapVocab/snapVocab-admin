import { AdminShopItemDTO, FieldSpec, ShopItemForm, ShopItemStatus, ShopItemType } from './types';
import { ApiClientError } from '../../lib/api-client';

/** Operator-facing field names, used in error summaries. */
export const SHOP_FIELD_LABELS: Record<string, string> = {
  code: 'Mã', name: 'Tên', description: 'Mô tả', type: 'Loại', iconKey: 'Icon', purchasable: 'Cho phép mua',
  price: 'Giá', availableFrom: 'Bắt đầu bán', availableUntil: 'Kết thúc bán', sortOrder: 'Thứ tự',
  themeKey: 'Bộ giao diện', frameAssetKey: 'Ảnh khung', boostDurationMinutes: 'Thời lượng', maxQuantity: 'Số lượng tối đa',
};

/**
 * Type-specific config for `type`: fields owned by another type are null (the backend rejects anything else);
 * booster defaults (shop.md §2.3) apply to boosters only.
 */
export function configForType(type: ShopItemType, from: Partial<ShopItemForm> = {}) {
  return {
    themeKey: type === 'THEME' ? from.themeKey ?? null : null,
    frameAssetKey: type === 'AVATAR_FRAME' ? from.frameAssetKey ?? null : null,
    boostDurationMinutes: type === 'XP_BOOSTER' ? from.boostDurationMinutes ?? 30 : null,
    maxQuantity: type === 'XP_BOOSTER' ? from.maxQuantity ?? 5 : null,
  };
}

/** Server item -> form; sale window shown in UTC+7 (backend stores UTC instants). */
export function itemToForm(item: AdminShopItemDTO): ShopItemForm {
  return {
    code: item.code,
    name: item.name,
    description: item.description || '',
    type: item.type,
    iconKey: item.iconKey || null,
    purchasable: item.purchasable,
    price: item.price,
    availableFrom: isoToVnInput(item.availableFrom),
    availableUntil: isoToVnInput(item.availableUntil),
    sortOrder: item.sortOrder ?? 0,
    ...configForType(item.type, item as Partial<ShopItemForm>),
  };
}

/** Form (or part of it) -> request body; sale window converted from UTC+7 input to UTC instants. */
export function formToPayload(form: Partial<ShopItemForm>): ShopItemForm {
  const out = { ...form };
  if ('availableFrom' in form) out.availableFrom = vnInputToIso(form.availableFrom);
  if ('availableUntil' in form) out.availableUntil = vnInputToIso(form.availableUntil);
  return out;
}

/** Fields the operator changed relative to the last saved/loaded state. */
export function changedFields(form: ShopItemForm, base: ShopItemForm): Partial<ShopItemForm> {
  const out: Partial<ShopItemForm> = {};
  for (const key of Object.keys(form) as (keyof ShopItemForm)[]) {
    if (form[key] !== base[key]) (out as Record<string, unknown>)[key] = form[key];
  }
  return out;
}

/**
 * PATCH body: only what the operator changed. Untouched fields are never resent, so a minute-precision
 * form cannot rewrite a sale window that the server holds to the second.
 */
export function buildUpdatePayload(form: ShopItemForm, base: ShopItemForm, version: number) {
  return { ...formToPayload(changedFields(form, base)), version };
}

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
 * Sale window times are Instants (UTC) on the backend; operators schedule in Vietnam time.
 * UTC+7 has no DST, so a fixed offset is exact.
 */
export const SHOP_TZ_LABEL = 'UTC+7';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Server ISO instant -> `datetime-local` value in UTC+7 ("2026-10-06T17:00"). */
export function isoToVnInput(iso?: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** `datetime-local` value typed in UTC+7 -> ISO instant the backend accepts ("…Z"). */
export function vnInputToIso(local?: string | null): string | null {
  if (!local) return null;
  const ms = new Date(`${local.slice(0, 16)}:00+07:00`).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** ISO instant -> "06/10/2026 17:00" in UTC+7. */
export function formatVnDateTime(iso?: string | null): string {
  const local = isoToVnInput(iso);
  if (!local) return '—';
  const [date, time] = local.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time}`;
}

/**
 * The one conclusion an operator needs: can a learner buy this right now, and if not, why.
 * Combines lifecycle status, the purchasable flag and the sale window (status/flag/window alone mislead).
 */
export type SaleState = 'DRAFT' | 'REWARD_ONLY' | 'UPCOMING' | 'ON_SALE' | 'ENDED' | 'ARCHIVED';
/** Badge tones (components/ui/Badge): an ended state is neutral, not red; red is for errors. */
export type SaleTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'reward';

export interface DerivedSaleState {
  state: SaleState;
  label: string;
  detail: string;
  tone: SaleTone;
}

export function deriveSaleState(
  item: { status: ShopItemStatus; purchasable?: boolean | null; availableFrom?: string | null; availableUntil?: string | null },
  now: Date = new Date()
): DerivedSaleState {
  if (item.status === 'DRAFT') {
    return { state: 'DRAFT', label: 'Bản nháp', detail: 'Chưa hiển thị với người học', tone: 'neutral' };
  }
  if (item.status === 'ARCHIVED') {
    return { state: 'ARCHIVED', label: 'Đã lưu trữ', detail: 'Ngừng bán; người đã sở hữu vẫn dùng được', tone: 'neutral' };
  }
  if (!item.purchasable) {
    return { state: 'REWARD_ONLY', label: 'Chỉ dùng làm phần thưởng', detail: 'Không bán trong Cửa hàng; có thể cấp làm phần thưởng.', tone: 'reward' };
  }
  const from = item.availableFrom ? new Date(item.availableFrom) : null;
  const until = item.availableUntil ? new Date(item.availableUntil) : null;
  if (from && now < from) {
    return { state: 'UPCOMING', label: 'Chờ mở bán', detail: `Mở bán ${formatVnDateTime(item.availableFrom)} (${SHOP_TZ_LABEL})`, tone: 'info' };
  }
  if (until && now >= until) {
    return { state: 'ENDED', label: 'Hết thời gian bán', detail: `Kết thúc ${formatVnDateTime(item.availableUntil)} (${SHOP_TZ_LABEL})`, tone: 'neutral' };
  }
  return {
    state: 'ON_SALE',
    label: 'Đang mở bán',
    detail: until ? `Đến ${formatVnDateTime(item.availableUntil)} (${SHOP_TZ_LABEL})` : 'Không giới hạn thời gian',
    tone: 'success',
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
    // 1. Version conflict, by code: a concurrent write caught at flush carries no currentVersion.
    if (error.code === 'VERSION_CONFLICT') {
      isVersionConflict = true;
      if (typeof error.details?.currentVersion === 'number') serverVersion = error.details.currentVersion;
      generalError = 'Vật phẩm này đã được chỉnh sửa ở phiên khác.'
        + (serverVersion !== undefined ? ` Phiên bản hiện tại trên máy chủ là v${serverVersion}.` : '');
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

    const invalid = Object.keys(fieldErrors);
    if (!generalError) {
      // Name every field, including ones not on screen (e.g. a config field of another type).
      generalError = invalid.length
        ? `Kiểm tra lại: ${invalid.map((f) => SHOP_FIELD_LABELS[f] ?? f).join(', ')}.`
        : error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu.';
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
      return 'Giao diện cửa hàng';
    case 'AVATAR_FRAME':
      return 'Khung avatar';
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

export interface ImageHeader {
  format: 'png' | 'webp';
  width: number;
  height: number;
  /** The image carries an alpha channel (PNG RGBA/GA or tRNS; WebP alpha flag). */
  alpha: boolean;
}

/** Format, pixel size and alpha from a PNG/WebP header, without decoding. Null when neither format. */
export function readImageHeader(b: Uint8Array): ImageHeader | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  if (b.length >= 26 && dv.getUint32(0) === 0x89504e47 && ascii(12, 4) === 'IHDR') {
    let alpha = b[25] === 4 || b[25] === 6;
    for (let o = 8; !alpha && o + 8 <= b.length; o += 12 + dv.getUint32(o)) {
      const chunk = ascii(o + 4, 4);
      if (chunk === 'IDAT') break;
      alpha = chunk === 'tRNS';
    }
    return { format: 'png', width: dv.getUint32(16), height: dv.getUint32(20), alpha };
  }
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') {
      const u24 = (o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
      return { format: 'webp', width: u24(24) + 1, height: u24(27) + 1, alpha: (b[20] & 0x10) !== 0 };
    }
    if (chunk === 'VP8L') {
      const bits = dv.getUint32(21, true);
      return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: ((bits >>> 28) & 1) === 1 };
    }
    if (chunk === 'VP8 ') {
      return { format: 'webp', width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff, alpha: false };
    }
  }
  return null;
}

/** Pixel rules of shop.md §2.3: icon square ≥ 256×256; frame 512×512 with alpha. Null when the header passes. */
export function checkAssetHeader(h: ImageHeader | null, mime: string, type: 'icon' | 'frame'): string | null {
  if (!h || `image/${h.format}` !== mime) return 'File không phải ảnh PNG/WebP hợp lệ.';
  if (type === 'icon' && (h.width !== h.height || h.width < 256)) {
    return `Icon phải là ảnh vuông, tối thiểu 256×256 (ảnh đang chọn ${h.width}×${h.height}).`;
  }
  if (type === 'frame' && (h.width !== 512 || h.height !== 512)) {
    return `Khung phải đúng 512×512 (ảnh đang chọn ${h.width}×${h.height}).`;
  }
  if (type === 'frame' && !h.alpha) return 'Khung phải có nền trong suốt (kênh alpha).';
  return null;
}
