import type { ShopItemType } from '../../../domains/shop/types';

/**
 * Card frame contract (plan/shop-item/card_frame_plan.md §3): 3:4, one content window for every frame.
 * Mirrors AdminShopService.CARD_FRAME_CONTRACT and SnapVocab card-frame.ts; change all three together.
 */
export const CARD_FRAME_WINDOW = { x: 0.09, y: 0.09, width: 0.82, height: 0.82, radius: 36 / 1080 };

/** Artwork tint behind each item type on the mobile Shop card. */
export const ARTWORK_BG: Record<ShopItemType, string> = { AVATAR_FRAME: '#FFF8EF', CARD_FRAME: '#FFF1F2', XP_BOOSTER: '#ECFDF5', STREAK_FREEZE: '#F0F9FF' };
