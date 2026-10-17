import React, { useState } from 'react';
import { Smartphone, Sparkles, Image as ImageIcon, Zap } from 'lucide-react';
import { ShopItemForm, ShopItemType } from '../../../domains/shop/types';
import { formatShopItemTypeLabel, formatThemeKeyLabel } from '../../../domains/shop/mappers';

type Mode = 'light' | 'dark';
type Surfaces = { background: string; surface: string; surfaceMuted: string; border: string; headerBg: string };

/**
 * Surfaces of the mobile Shop theme registry (SnapVocab/src/features/shop/theme/theme-context.tsx), both modes.
 * ponytail: hand-mirrored; move to a shared package if the registry grows past a few themes.
 */
const THEME_SURFACES: Record<string, Record<Mode, Surfaces>> = {
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
/** Text is fixed per mode on mobile (shop.md §6.2); themes only change surfaces. */
const TEXT: Record<Mode, { text: string; muted: string }> = {
  light: { text: '#1E2A44', muted: '#565879' },
  dark: { text: '#FFFFFF', muted: '#9597AD' },
};
const ARTWORK_BG: Record<ShopItemType, string> = { THEME: '#F4F0FF', AVATAR_FRAME: '#FFF8EF', XP_BOOSTER: '#ECFDF5' };
/** The button an owned item shows in Kho đồ (mobile inventory card). */
const INVENTORY_ACTION: Record<ShopItemType, string> = { THEME: 'Áp dụng', AVATAR_FRAME: 'Trang bị', XP_BOOSTER: 'Kích hoạt' };

/** Learner avatar stand-in with the frame overlaid at the mobile ratio (avatar = 58% of the frame). */
const FramedAvatar: React.FC<{ frameUrl?: string | null; size: number }> = ({ frameUrl, size }) => (
  <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
    <div
      className="rounded-full bg-slate-700 text-white font-bold flex items-center justify-center"
      style={{ width: size * (frameUrl ? 0.58 : 0.88), height: size * (frameUrl ? 0.58 : 0.88), fontSize: size * 0.18 }}
    >
      SV
    </div>
    {frameUrl && <img src={frameUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
  </div>
);

const Label: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="text-xs font-semibold text-text-muted flex items-center gap-1">{icon}{children}</div>
);

interface ShopItemPreviewProps {
  form: ShopItemForm;
  iconUrl?: string | null;
  frameUrl?: string | null;
}

/** What the learner sees on mobile: the item card where it actually appears, plus a type-specific close-up. */
export const ShopItemPreview: React.FC<ShopItemPreviewProps> = ({ form, iconUrl, frameUrl }) => {
  const [mode, setMode] = useState<Mode>('light');
  const type = form.type ?? 'THEME';
  const sold = Boolean(form.purchasable);
  const palette = form.themeKey ? THEME_SURFACES[form.themeKey]?.[mode] : undefined;
  const ink = TEXT[mode];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-1.5 text-[13px] font-bold text-text">
        <Smartphone size={15} className="text-primary-dark" />
        <span>Xem trước trên ứng dụng</span>
      </div>

      {/* The card, in the place it really shows up: the Shop catalog if sold, otherwise only Kho đồ. */}
      <div className="space-y-1.5">
        <Label>{sold ? 'Card trong Cửa hàng' : 'Card trong Kho đồ'}</Label>
        <div className="flex justify-center rounded-lg py-4" style={{ background: '#F7F8FA' }}>
          <div className="w-[170px] overflow-hidden rounded-[22px] border border-b-[3px] bg-white" style={{ borderColor: '#E2E8F0' }}>
            <div className="h-[100px] flex items-center justify-center" style={{ background: ARTWORK_BG[type] }}>
              {type === 'AVATAR_FRAME' ? (
                <FramedAvatar frameUrl={frameUrl} size={88} />
              ) : iconUrl ? (
                <img src={iconUrl} alt="" className="w-[76px] h-[76px] object-contain" />
              ) : (
                <span style={{ color: TEXT.light.muted }}>{type === 'THEME' ? <Sparkles size={36} /> : <Zap size={36} />}</span>
              )}
            </div>
            {/* Same line limits as the app: name and description clamp to 2 lines. */}
            <div className="p-2.5 pt-2 space-y-2.5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide truncate" style={{ color: TEXT.light.muted }}>
                  {formatShopItemTypeLabel(type)}
                </div>
                <div className="text-[15px] leading-tight font-extrabold line-clamp-2 min-h-[38px]" style={{ color: TEXT.light.text }}>
                  {form.name || 'Tên vật phẩm'}
                </div>
                {form.description && (
                  <div className="mt-1 text-xs leading-snug line-clamp-2" style={{ color: TEXT.light.muted }}>{form.description}</div>
                )}
              </div>
              <div className="h-10 rounded-xl border-b-[3px] border-primary-solid-hover bg-primary-solid flex items-center justify-center text-[13px] font-extrabold text-white">
                {sold ? `Mua · ${(form.price ?? 0).toLocaleString('vi-VN')}` : INVENTORY_ACTION[type]}
              </div>
            </div>
          </div>
        </div>
        {!sold && (
          <p className="text-xs text-text-muted">Không có trong danh mục bán; người học thấy card này trong Kho đồ khi được tặng.</p>
        )}
      </div>

      {type === 'AVATAR_FRAME' && (
        <div className="space-y-1.5">
          <Label icon={<ImageIcon size={12} />}>Trên hồ sơ người học</Label>
          <div className="flex justify-center rounded-lg py-4" style={{ background: '#F7F8FA' }}>
            {frameUrl ? <FramedAvatar frameUrl={frameUrl} size={160} /> : <p className="text-xs text-text-muted py-10">Tải ảnh khung để xem trước.</p>}
          </div>
        </div>
      )}

      {type === 'THEME' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>{form.themeKey ? `Màn Cửa hàng mẫu · ${formatThemeKeyLabel(form.themeKey)}` : 'Màn Cửa hàng mẫu'}</Label>
            {/* Mobile respects the learner's light/dark choice; the theme defines both. */}
            {form.themeKey && (
            <div role="radiogroup" aria-label="Chế độ xem trước" className="flex rounded-md border border-border p-0.5 text-xs font-semibold">
              {(['light', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info ${mode === m ? 'bg-text text-white' : 'text-text-muted hover:text-text'}`}
                >
                  {m === 'light' ? 'Sáng' : 'Tối'}
                </button>
              ))}
            </div>
            )}
          </div>
          {palette ? (
            <div className="overflow-hidden rounded-2xl border" style={{ background: palette.background, borderColor: palette.border }}>
              <div className="px-3 py-2 border-b text-[13px] font-extrabold" style={{ background: palette.headerBg, borderColor: palette.border, color: ink.text }}>
                Cửa hàng
              </div>
              <div className="p-3 space-y-2">
                <div className="rounded-xl border p-2.5 space-y-0.5" style={{ background: palette.surface, borderColor: palette.border }}>
                  <div className="text-[13px] font-extrabold" style={{ color: ink.text }}>Thẻ ×2 Kinh nghiệm</div>
                  <div className="text-xs" style={{ color: ink.muted }}>Nhân đôi XP trong 30 phút</div>
                </div>
                <div className="rounded-xl px-2.5 py-2 flex justify-between text-xs font-semibold" style={{ background: palette.surfaceMuted, color: ink.text }}>
                  <span>Phần thưởng nhiệm vụ</span>
                  <span className="text-primary-solid">+40</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-text-muted">
              Chọn bộ giao diện để xem trước.
            </div>
          )}
          <p className="text-xs text-text-muted">Áp dụng cho Cửa hàng, Kho đồ và Ví Coin.</p>
        </div>
      )}

      {type === 'XP_BOOSTER' && (
        <div className="p-3 rounded-lg bg-surface-subtle text-[13px] text-text space-y-1">
          <div className="font-semibold">Khi kích hoạt, người học thấy:</div>
          <div className="text-text-muted">"Dùng 1 thẻ: ×2 XP trong {form.boostDurationMinutes ?? 30} phút, bắt đầu ngay."</div>
          <div className="text-text-muted">Giữ tối đa {form.maxQuantity ?? 5} thẻ trong Kho đồ.</div>
        </div>
      )}
    </div>
  );
};
