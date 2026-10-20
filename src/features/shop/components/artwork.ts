import type { ShopItemType } from '../../../domains/shop/types';

export type Mode = 'light' | 'dark';
type Surfaces = { background: string; surface: string; surfaceMuted: string; border: string; headerBg: string };

/**
 * Surfaces of the mobile Shop theme registry (SnapVocab/src/features/shop/theme/theme-context.tsx), both modes.
 * ponytail: hand-mirrored; move to a shared package if the registry grows past a few themes.
 */
export const THEME_SURFACES: Record<string, Record<Mode, Surfaces>> = {
  MIDNIGHT_NEON: {
    light: { background: '#F5F3FF', surface: '#FFFFFF', surfaceMuted: '#EDE9FE', border: '#DDD6FE', headerBg: '#FFFFFF' },
    dark: { background: '#0B0F19', surface: '#151B2B', surfaceMuted: '#1E2638', border: '#2A344A', headerBg: '#151B2B' },
  },
  SUNSET_AMBER: {
    light: { background: '#FFFBEB', surface: '#FFFFFF', surfaceMuted: '#FEF3C7', border: '#FDE68A', headerBg: '#FFFFFF' },
    dark: { background: '#1A1206', surface: '#261A0A', surfaceMuted: '#33230E', border: '#4A3214', headerBg: '#261A0A' },
  },
  FOREST_MINT: {
    light: { background: '#F0FDF4', surface: '#FFFFFF', surfaceMuted: '#DCFCE7', border: '#BBF7D0', headerBg: '#FFFFFF' },
    dark: { background: '#04170E', surface: '#0A2417', surfaceMuted: '#103221', border: '#1A4A31', headerBg: '#0A2417' },
  },
};

/** Artwork tint behind each item type on the mobile Shop card. */
export const ARTWORK_BG: Record<ShopItemType, string> = { THEME: '#F4F0FF', AVATAR_FRAME: '#FFF8EF', XP_BOOSTER: '#ECFDF5' };
