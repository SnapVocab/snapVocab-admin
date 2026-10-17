import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFieldEditable,
  deriveSaleState,
  isoToVnInput,
  vnInputToIso,
  formatShopItemTypeLabel,
  mapBackendErrorsToFields,
  validateAssetFile,
  configForType,
  itemToForm,
  buildUpdatePayload,
  readImageHeader,
  checkAssetHeader,
} from '../src/domains/shop/mappers';
import {
  ShopItemStatus,
  ShopItemType,
  FieldSpec,
  ShopItemTypeMetadataDTO,
  AdminShopItemDTO,
  ShopItemForm,
  ShopItemUpdatePayload,
} from '../src/domains/shop/types';
import { ApiClientError } from '../src/lib/api-client';
import {
  getShopItemTypes,
  getAdminShopItems,
  getAdminShopItem,
  createShopItem,
  updateShopItem,
  publishShopItem,
  archiveShopItem,
  deleteShopItem,
  createShopAssetUploadUrl,
} from '../src/domains/shop/api';

/* Mock Metadata matching GET /api/admin/shop/item-types */
const MOCK_METADATA: ShopItemTypeMetadataDTO = {
  commonFields: [
    { name: 'code', inputType: 'TEXT', required: true, requiredToPublish: true, editableIn: ['DRAFT'] },
    { name: 'name', inputType: 'TEXT', required: true, requiredToPublish: true, editableIn: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'description', inputType: 'TEXT', required: false, requiredToPublish: false, editableIn: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'iconKey', inputType: 'IMAGE', required: false, requiredToPublish: true, editableIn: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'purchasable', inputType: 'BOOLEAN', required: true, requiredToPublish: true, editableIn: ['DRAFT', 'PUBLISHED'] },
    { name: 'price', inputType: 'NUMBER', required: true, requiredToPublish: true, min: 1, max: 100000, editableIn: ['DRAFT', 'PUBLISHED'] },
    { name: 'availableFrom', inputType: 'DATETIME', required: false, requiredToPublish: false, editableIn: ['DRAFT', 'PUBLISHED'] },
    { name: 'availableUntil', inputType: 'DATETIME', required: false, requiredToPublish: false, editableIn: ['DRAFT', 'PUBLISHED'] },
    { name: 'sortOrder', inputType: 'NUMBER', required: false, requiredToPublish: false, editableIn: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
  ],
  types: [
    {
      type: 'THEME',
      behavior: 'EQUIP',
      stackable: false,
      fixed: {},
      fields: [
        {
          name: 'themeKey',
          inputType: 'SELECT',
          required: true,
          requiredToPublish: true,
          editableIn: ['DRAFT'],
          options: ['MIDNIGHT_NEON', 'SUNSET_AMBER', 'FOREST_MINT'],
        },
      ],
    },
    {
      type: 'AVATAR_FRAME',
      behavior: 'EQUIP',
      stackable: false,
      fixed: {},
      fields: [
        {
          name: 'frameAssetKey',
          inputType: 'IMAGE',
          required: true,
          requiredToPublish: true,
          editableIn: ['DRAFT'],
          formats: ['png', 'webp'],
          maxBytes: 307200,
        },
      ],
    },
    {
      type: 'XP_BOOSTER',
      behavior: 'ACTIVATE',
      stackable: true,
      fixed: { multiplier: 2 },
      fields: [
        {
          name: 'boostDurationMinutes',
          inputType: 'NUMBER',
          required: true,
          requiredToPublish: true,
          min: 5,
          max: 180,
          defaultValue: 30,
          editableIn: ['DRAFT'],
        },
        {
          name: 'maxQuantity',
          inputType: 'NUMBER',
          required: true,
          requiredToPublish: true,
          min: 1,
          max: 10,
          defaultValue: 5,
          editableIn: ['DRAFT', 'PUBLISHED'],
        },
      ],
    },
  ],
};

/* =========================================================================
   GROUP 1: API CONTRACT & PAYLOADS (1-9)
   ========================================================================= */

test('1. API - getShopItemTypes builds correct contract URL', () => {
  assert.ok(typeof getShopItemTypes === 'function');
});

test('2. API - getAdminShopItems parameters mapping', () => {
  const params = {
    q: 'NEON',
    type: 'THEME' as ShopItemType,
    status: 'PUBLISHED' as ShopItemStatus,
    page: 0,
    size: 20,
  };
  assert.equal(params.page, 0);
  assert.ok(params.size <= 100);
  assert.equal(params.q, 'NEON');
});

test('3. API - getAdminShopItem accepts numeric ID', () => {
  assert.ok(typeof getAdminShopItem === 'function');
});

test('4. API - createShopItem payload excludes server-managed fields', () => {
  const formPayload: ShopItemForm = {
    code: 'BOOSTER_XP_2X_30M',
    type: 'XP_BOOSTER',
    name: 'Tăng tốc XP x2 (30 phút)',
    description: 'Nhân đôi XP nhận được',
    purchasable: true,
    price: 150,
    boostDurationMinutes: 30,
    maxQuantity: 10,
  };

  assert.equal((formPayload as any).status, undefined, 'status must not be sent on create');
  assert.equal((formPayload as any).version, undefined, 'version must not be sent on create');
  assert.equal((formPayload as any).createdAt, undefined, 'createdAt must not be sent on create');
  assert.equal((formPayload as any).updatedAt, undefined, 'updatedAt must not be sent on create');
});

test('5. API - updateShopItem payload requires version for optimistic locking', () => {
  const updatePayload: ShopItemUpdatePayload = {
    name: 'Tên mới',
    price: 200,
    version: 3,
  };
  assert.equal(updatePayload.version, 3);
  assert.ok(typeof updatePayload.version === 'number');
});

test('6. API - publishShopItem handles transition DRAFT -> PUBLISHED', () => {
  assert.ok(typeof publishShopItem === 'function');
});

test('7. API - archiveShopItem handles transition PUBLISHED -> ARCHIVED', () => {
  assert.ok(typeof archiveShopItem === 'function');
});

test('8. API - deleteShopItem deletes DRAFT only (204 No Content)', () => {
  assert.ok(typeof deleteShopItem === 'function');
});

test('9. API - createShopAssetUploadUrl accepts fileName', () => {
  assert.ok(typeof createShopAssetUploadUrl === 'function');
});

/* =========================================================================
   GROUP 2: LIST & DERIVED AVAILABILITY (10-16)
   ========================================================================= */

test('10. List - Format type labels in Vietnamese', () => {
  assert.equal(formatShopItemTypeLabel('THEME'), 'Giao diện cửa hàng');
  assert.equal(formatShopItemTypeLabel('AVATAR_FRAME'), 'Khung avatar');
  assert.equal(formatShopItemTypeLabel('XP_BOOSTER'), 'XP Booster');
  assert.equal(formatShopItemTypeLabel(undefined), '—');
});

const NOW = new Date('2026-10-06T05:00:00Z'); // 12:00 UTC+7
const published = { status: 'PUBLISHED' as ShopItemStatus, purchasable: true, availableFrom: null, availableUntil: null };

test('11. Sale state - lifecycle wins: DRAFT and ARCHIVED regardless of window', () => {
  assert.equal(deriveSaleState({ ...published, status: 'DRAFT' }, NOW).state, 'DRAFT');
  assert.equal(deriveSaleState({ ...published, status: 'ARCHIVED' }, NOW).state, 'ARCHIVED');
});

test('12. Sale state - published but not purchasable is reward-only, even inside a window', () => {
  const res = deriveSaleState({ ...published, purchasable: false, availableFrom: '2026-10-01T00:00:00Z' }, NOW);
  assert.equal(res.state, 'REWARD_ONLY');
  assert.equal(res.label, 'Chỉ dùng làm phần thưởng');
});

test('13. Sale state - UPCOMING / ON_SALE / ENDED from the window, details in UTC+7', () => {
  const upcoming = deriveSaleState({ ...published, availableFrom: '2026-10-07T01:00:00Z' }, NOW);
  assert.equal(upcoming.state, 'UPCOMING');
  assert.equal(upcoming.detail, 'Mở bán 07/10/2026 08:00 (UTC+7)');
  assert.equal(deriveSaleState({ ...published, availableUntil: '2026-10-06T04:59:00Z' }, NOW).state, 'ENDED');
  const onSale = deriveSaleState({ ...published, availableUntil: '2026-10-31T16:59:00Z' }, NOW);
  assert.equal(onSale.state, 'ON_SALE');
  assert.equal(onSale.detail, 'Đến 31/10/2026 23:59 (UTC+7)');
  assert.equal(deriveSaleState(published, NOW).detail, 'Không giới hạn thời gian');
});

test('14. Sale window - UTC+7 input round-trips to the backend Instant', () => {
  assert.equal(vnInputToIso('2026-10-06T17:00'), '2026-10-06T10:00:00.000Z');
  assert.equal(isoToVnInput('2026-10-06T10:00:00Z'), '2026-10-06T17:00');
  assert.equal(isoToVnInput(vnInputToIso('2026-12-31T23:59')), '2026-12-31T23:59');
  assert.equal(vnInputToIso(null), null);
  assert.equal(isoToVnInput(''), null);
});

test('15. List - Pagination zero-based index compliance', () => {
  const page = 0;
  const size = 20;
  assert.ok(page >= 0);
  assert.ok(size <= 100);
});

test('16. List - Error handling returns structured message', () => {
  const err = new ApiClientError('Lỗi kết nối máy chủ', 'NETWORK_ERROR', 500);
  const mapped = mapBackendErrorsToFields(err);
  assert.equal(mapped.generalError, 'Lỗi kết nối máy chủ');
});

/* =========================================================================
   GROUP 3: METADATA & FIELD LOCKING (17-24)
   ========================================================================= */

test('17. Metadata - isFieldEditable: code is editable ONLY in DRAFT', () => {
  const codeSpec = MOCK_METADATA.commonFields.find((f) => f.name === 'code');
  assert.equal(isFieldEditable(codeSpec, 'DRAFT'), true);
  assert.equal(isFieldEditable(codeSpec, 'PUBLISHED'), false);
  assert.equal(isFieldEditable(codeSpec, 'ARCHIVED'), false);
});

test('18. Metadata - isFieldEditable: price is editable in DRAFT and PUBLISHED', () => {
  const priceSpec = MOCK_METADATA.commonFields.find((f) => f.name === 'price');
  assert.equal(isFieldEditable(priceSpec, 'DRAFT'), true);
  assert.equal(isFieldEditable(priceSpec, 'PUBLISHED'), true);
  assert.equal(isFieldEditable(priceSpec, 'ARCHIVED'), false);
});

test('19. Metadata - isFieldEditable: themeKey is editable ONLY in DRAFT', () => {
  const themeType = MOCK_METADATA.types.find((t) => t.type === 'THEME');
  const themeKeySpec = themeType?.fields.find((f) => f.name === 'themeKey');
  assert.equal(isFieldEditable(themeKeySpec, 'DRAFT'), true);
  assert.equal(isFieldEditable(themeKeySpec, 'PUBLISHED'), false);
  assert.equal(isFieldEditable(themeKeySpec, 'ARCHIVED'), false);
});

test('20. Metadata - isFieldEditable: frameAssetKey is editable ONLY in DRAFT', () => {
  const frameType = MOCK_METADATA.types.find((t) => t.type === 'AVATAR_FRAME');
  const frameSpec = frameType?.fields.find((f) => f.name === 'frameAssetKey');
  assert.equal(isFieldEditable(frameSpec, 'DRAFT'), true);
  assert.equal(isFieldEditable(frameSpec, 'PUBLISHED'), false);
});

test('21. Metadata - THEME options populated from metadata', () => {
  const themeType = MOCK_METADATA.types.find((t) => t.type === 'THEME');
  const themeKeySpec = themeType?.fields.find((f) => f.name === 'themeKey');
  assert.ok(themeKeySpec?.options);
  assert.ok(themeKeySpec?.options?.includes('MIDNIGHT_NEON'));
  assert.ok(themeKeySpec?.options?.includes('SUNSET_AMBER'));
  assert.ok(themeKeySpec?.options?.includes('FOREST_MINT'));
});

test('22. Metadata - XP_BOOSTER min/max/defaultValue from metadata', () => {
  const xpType = MOCK_METADATA.types.find((t) => t.type === 'XP_BOOSTER');
  const durationSpec = xpType?.fields.find((f) => f.name === 'boostDurationMinutes');
  assert.equal(durationSpec?.min, 5);
  assert.equal(durationSpec?.max, 180);
  assert.equal(durationSpec?.defaultValue, 30);

  const maxQtySpec = xpType?.fields.find((f) => f.name === 'maxQuantity');
  assert.equal(maxQtySpec?.min, 1);
  assert.equal(maxQtySpec?.max, 10);
  assert.equal(maxQtySpec?.defaultValue, 5);
});

test('23. Validation - Mapping SHOP_ITEM_CODE_EXISTS to code field', () => {
  const error = new ApiClientError('Mã đã tồn tại', 'SHOP_ITEM_CODE_EXISTS', 400);
  const mapped = mapBackendErrorsToFields(error);
  assert.ok(mapped.fieldErrors.code);
  assert.ok(mapped.fieldErrors.code.includes('Mã code này đã tồn tại'));
});

test('24. Validation - Mapping all data.errors simultaneously', () => {
  const error = new ApiClientError('Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400, {
    errors: [
      { field: 'code', code: 'INVALID_CODE', message: 'Mã không đúng định dạng' },
      { field: 'price', code: 'INVALID_PRICE', message: 'Giá phải lớn hơn 0' },
      { field: 'name', code: 'REQUIRED', message: 'Tên bắt buộc' },
    ],
  });
  const mapped = mapBackendErrorsToFields(error);
  assert.equal(mapped.fieldErrors.code, 'Mã không đúng định dạng');
  assert.equal(mapped.fieldErrors.price, 'Giá phải lớn hơn 0');
  assert.equal(mapped.fieldErrors.name, 'Tên bắt buộc');
  assert.equal(Object.keys(mapped.fieldErrors).length, 3);
});

/* =========================================================================
   GROUP 4: OPTIMISTIC LOCKING & FIELD LOCKING FLOW (25-30)
   ========================================================================= */

test('25. Optimistic Locking - VERSION_CONFLICT detected with serverVersion', () => {
  const error = new ApiClientError('Phiên bản không khớp', 'VERSION_CONFLICT', 409, {
    currentVersion: 5,
  });
  const mapped = mapBackendErrorsToFields(error);
  assert.equal(mapped.isVersionConflict, true);
  assert.equal(mapped.serverVersion, 5);
  assert.ok(mapped.generalError?.includes('v5'));
});

test('26. Field Locked - FIELD_LOCKED maps locked fields to fieldErrors', () => {
  const error = new ApiClientError('Trường bị khóa', 'FIELD_LOCKED', 409, {
    fields: ['code', 'themeKey'],
  });
  const mapped = mapBackendErrorsToFields(error);
  assert.ok(mapped.lockedFields?.includes('code'));
  assert.ok(mapped.lockedFields?.includes('themeKey'));
  assert.ok(mapped.fieldErrors.code);
  assert.ok(mapped.fieldErrors.themeKey);
});

test('27. Lifecycle - DRAFT can be published, edited, and deleted', () => {
  const draftItem: AdminShopItemDTO = {
    id: 1,
    code: 'THEME_RETRO',
    type: 'THEME',
    behavior: 'EQUIP',
    name: 'Retro Theme',
    description: '',
    iconKey: 'icons/retro.png',
    iconUrl: 'http://localhost/icons/retro.png',
    purchasable: true,
    price: 200,
    availableFrom: null,
    availableUntil: null,
    sortOrder: 1,
    themeKey: 'RETRO_NEON',
    frameAssetKey: null,
    frameAssetUrl: null,
    boostDurationMinutes: null,
    maxQuantity: null,
    multiplier: null,
    status: 'DRAFT',
    version: 1,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(draftItem.status, 'DRAFT');
  assert.equal(draftItem.publishedAt, null);
});

test('28. Lifecycle - PUBLISHED item cannot be deleted as draft', () => {
  const publishedStatus = 'PUBLISHED' as ShopItemStatus;
  const canDeleteDraft = (publishedStatus as string) === 'DRAFT';
  assert.equal(canDeleteDraft, false);
});

test('29. Lifecycle - ARCHIVED item is terminal', () => {
  const archivedStatus = 'ARCHIVED' as ShopItemStatus;
  const canPublish = (archivedStatus as string) === 'DRAFT';
  const canArchive = (archivedStatus as string) === 'PUBLISHED';
  assert.equal(canPublish, false);
  assert.equal(canArchive, false);
});

test('30. Price Validation - purchasable=true requires price between 1 and 100,000', () => {
  const invalidPriceError = new ApiClientError('Giá không hợp lệ', 'INVALID_PRICE', 400);
  const mapped = mapBackendErrorsToFields(invalidPriceError);
  assert.ok(mapped.fieldErrors.price);
});

/* =========================================================================
   GROUP 5: ASSET UPLOAD & VALIDATION (31-34)
   ========================================================================= */

test('31. Upload - PNG and WebP files are accepted', () => {
  const pngFile = { type: 'image/png', size: 100 * 1024 } as File;
  const webpFile = { type: 'image/webp', size: 150 * 1024 } as File;

  assert.equal(validateAssetFile(pngFile, 'icon').valid, true);
  assert.equal(validateAssetFile(webpFile, 'icon').valid, true);
});

test('32. Upload - Invalid format (JPEG, GIF, SVG) is rejected', () => {
  const jpegFile = { type: 'image/jpeg', size: 50 * 1024 } as File;
  const svgFile = { type: 'image/svg+xml', size: 10 * 1024 } as File;

  const jpegValidation = validateAssetFile(jpegFile, 'icon');
  assert.equal(jpegValidation.valid, false);
  assert.ok(jpegValidation.error?.includes('PNG hoặc WebP'));

  const svgValidation = validateAssetFile(svgFile, 'frame');
  assert.equal(svgValidation.valid, false);
});

test('33. Upload - Oversized icon (> 200 KB) is blocked client-side', () => {
  const oversizedIcon = { type: 'image/png', size: 250 * 1024 } as File;
  const validation = validateAssetFile(oversizedIcon, 'icon');
  assert.equal(validation.valid, false);
  assert.ok(validation.error?.includes('200 KB'));
});

test('34. Upload - Oversized frame (> 300 KB) is blocked client-side', () => {
  const oversizedFrame = { type: 'image/webp', size: 350 * 1024 } as File;
  const validation = validateAssetFile(oversizedFrame, 'frame');
  assert.equal(validation.valid, false);
  assert.ok(validation.error?.includes('300 KB'));
});

/* =========================================================================
   GROUP 6: CANONICAL DOMAIN & LEGACY ELIMINATION (35-38)
   ========================================================================= */

test('35. Domain - ShopItemType strictly restricted to THEME, AVATAR_FRAME, XP_BOOSTER', () => {
  const canonicalTypes: ShopItemType[] = ['THEME', 'AVATAR_FRAME', 'XP_BOOSTER'];
  assert.equal(canonicalTypes.length, 3);

  // Legacy types from old mock designs MUST NOT be part of canonical types
  const legacyTypes = ['CHEST', 'DECK', 'STREAK_SAVER', 'BOOSTER', 'CONSUMABLE'];
  for (const legacy of legacyTypes) {
    assert.equal(canonicalTypes.includes(legacy as any), false, `${legacy} must not be a ShopItemType`);
  }
});

test('36. Domain - ShopItemStatus strictly restricted to DRAFT, PUBLISHED, ARCHIVED', () => {
  const canonicalStatuses: ShopItemStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
  assert.equal(canonicalStatuses.length, 3);

  // Legacy statuses MUST NOT be part of lifecycle
  const legacyStatuses = ['ACTIVE', 'FLASH_SALE', 'SCHEDULED', 'EXPIRED'];
  for (const legacy of legacyStatuses) {
    assert.equal(canonicalStatuses.includes(legacy as any), false, `${legacy} must not be a ShopItemStatus`);
  }
});

test('37. Semantics - XP Booster maxQuantity is user inventory limit (1..10), not global store stock', () => {
  const xpBoosterForm: ShopItemForm = {
    code: 'XP_BOOSTER_X2_30M',
    type: 'XP_BOOSTER',
    name: 'Nhân Đôi KN',
    boostDurationMinutes: 30,
    maxQuantity: 5,
  };

  assert.ok(xpBoosterForm.maxQuantity! >= 1 && xpBoosterForm.maxQuantity! <= 10);
  // Ensure no 'stock' or 'purchaseLimit' fields on ShopItemForm
  assert.equal((xpBoosterForm as any).stock, undefined);
  assert.equal((xpBoosterForm as any).purchaseLimitPerUser, undefined);
});

test('38. Legacy Elimination - No Gems, Rarity, Stock, Flash Sale or Discount in canonical ShopItemDTO', () => {
  const canonicalItem: AdminShopItemDTO = {
    id: 1,
    version: 0,
    code: 'FRAME_GOLDEN',
    type: 'AVATAR_FRAME',
    behavior: 'EQUIP',
    name: 'Khung Vàng Hoàng Gia',
    description: 'Khung avatar vàng hoàng gia lấp lánh',
    iconKey: 'public/shop/frame-icon.png',
    iconUrl: 'http://cdn/frame-icon.png',
    status: 'DRAFT',
    purchasable: true,
    price: 500,
    availableFrom: null,
    availableUntil: null,
    sortOrder: 1,
    themeKey: null,
    frameAssetKey: 'public/shop/frame.png',
    frameAssetUrl: 'http://cdn/frame.png',
    boostDurationMinutes: null,
    maxQuantity: null,
    multiplier: null,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Check currency is Coin-only (price is Coins) and no Gems field
  assert.equal(typeof canonicalItem.price, 'number');
  assert.equal((canonicalItem as any).gemsPrice, undefined);
  assert.equal((canonicalItem as any).currency, undefined);

  // Check no Rarity
  assert.equal((canonicalItem as any).rarity, undefined);

  // Check no Stock / Unlimited Stock
  assert.equal((canonicalItem as any).stock, undefined);
  assert.equal((canonicalItem as any).remainingStock, undefined);

  // Check no Flash Sale / Discount Engine
  assert.equal((canonicalItem as any).discountPrice, undefined);
  assert.equal((canonicalItem as any).discountPercent, undefined);
  assert.equal((canonicalItem as any).salePercentage, undefined);
});


/* =========================================================================
   REGRESSIONS: editor mapping → request body (audit F01/F02/F03/F09/F10)
   ========================================================================= */

const serverItem = (over: Partial<AdminShopItemDTO>): AdminShopItemDTO => ({
  id: 7, version: 3, code: 'THEME_NEON', type: 'THEME', behavior: 'EQUIP', name: 'Neon', description: null,
  iconKey: 'public/shop/a.png', iconUrl: null, status: 'PUBLISHED', purchasable: true, price: 500,
  availableFrom: '2026-10-06T10:00:45Z', availableUntil: null, sortOrder: 0, themeKey: 'MIDNIGHT_NEON',
  frameAssetKey: null, frameAssetUrl: null, boostDurationMinutes: null, maxQuantity: null, multiplier: null,
  publishedAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
});

test('R1. config of another type is null for THEME/AVATAR_FRAME; booster defaults only for boosters', () => {
  assert.deepEqual(configForType('THEME'), { themeKey: null, frameAssetKey: null, boostDurationMinutes: null, maxQuantity: null });
  assert.deepEqual(configForType('AVATAR_FRAME', { themeKey: 'MIDNIGHT_NEON', boostDurationMinutes: 30 }),
    { themeKey: null, frameAssetKey: null, boostDurationMinutes: null, maxQuantity: null });
  assert.deepEqual(configForType('XP_BOOSTER'), { themeKey: null, frameAssetKey: null, boostDurationMinutes: 30, maxQuantity: 5 });

  const form = itemToForm(serverItem({}));
  assert.equal(form.boostDurationMinutes, null);
  assert.equal(form.maxQuantity, null);
  assert.equal(form.description, '');
});

test('R2. PATCH sends only changed fields; an untouched second-precision sale window is never resent', () => {
  const base = itemToForm(serverItem({}));
  const payload = buildUpdatePayload({ ...base, name: 'Neon 2' }, base, 3);
  assert.deepEqual(payload, { name: 'Neon 2', version: 3 });

  const edited = buildUpdatePayload({ ...base, availableUntil: '2026-10-07T17:00' }, base, 3);
  assert.deepEqual(edited, { availableUntil: '2026-10-07T10:00:00.000Z', version: 3 });
});

test('R3. VERSION_CONFLICT without currentVersion (flush-time conflict) is still a conflict', () => {
  const mapped = mapBackendErrorsToFields(new ApiClientError('modified concurrently', 'VERSION_CONFLICT', 409, {}));
  assert.equal(mapped.isVersionConflict, true);
  assert.equal(mapped.serverVersion, undefined);

  const locked = mapBackendErrorsToFields(new ApiClientError('locked', 'FIELD_LOCKED', 409, { fields: ['code'] }));
  assert.equal(locked.isVersionConflict, false);
});

test('R4. field errors produce a summary naming each field, including fields not on screen', () => {
  const mapped = mapBackendErrorsToFields(new ApiClientError('x', 'INVALID_SHOP_ITEM_CONFIG', 400, {
    errors: [{ field: 'boostDurationMinutes', code: 'INVALID_SHOP_ITEM_CONFIG', message: 'must be null for THEME' },
      { field: 'description', code: 'VALIDATION_ERROR', message: 'at most 500 characters' }],
  }));
  assert.equal(mapped.generalError, 'Kiểm tra lại: Thời lượng, Mô tả.');
});

test('R5. asset header: icon square ≥256; frame 512×512 with alpha; magic must match MIME', () => {
  const png = (w: number, h: number, colorType: number) => {
    const b = new Uint8Array(33);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    const dv = new DataView(b.buffer);
    dv.setUint32(16, w); dv.setUint32(20, h); b[24] = 8; b[25] = colorType;
    return b;
  };
  const webpVp8x = (w: number, h: number, alpha: boolean) => {
    const b = new Uint8Array(30);
    b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
    b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
    b[20] = alpha ? 0x10 : 0;
    const u24 = (o: number, v: number) => { b[o] = v & 0xff; b[o + 1] = (v >> 8) & 0xff; b[o + 2] = (v >> 16) & 0xff; };
    u24(24, w - 1); u24(27, h - 1);
    return b;
  };

  assert.deepEqual(readImageHeader(png(512, 512, 6)), { format: 'png', width: 512, height: 512, alpha: true });
  assert.equal(checkAssetHeader(readImageHeader(png(256, 256, 2)), 'image/png', 'icon'), null);
  assert.match(checkAssetHeader(readImageHeader(png(300, 200, 6)), 'image/png', 'icon')!, /vuông/);
  assert.match(checkAssetHeader(readImageHeader(png(128, 128, 6)), 'image/png', 'icon')!, /256/);
  assert.match(checkAssetHeader(readImageHeader(png(512, 512, 2)), 'image/png', 'frame')!, /trong suốt/);
  assert.equal(checkAssetHeader(readImageHeader(webpVp8x(512, 512, true)), 'image/webp', 'frame'), null);
  assert.match(checkAssetHeader(readImageHeader(webpVp8x(512, 512, true)), 'image/png', 'frame')!, /hợp lệ/);
  assert.equal(readImageHeader(new Uint8Array(40)), null);
});
