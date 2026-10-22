import React, { useState } from 'react';
import {
  Smartphone,
  Signal,
  Wifi,
  Battery,
  ShoppingBag,
  Package,
  User,
  Check,
} from 'lucide-react';
import { ShopItemForm, ShopItemType } from '../../../domains/shop/types';
import { formatShopItemTypeLabel } from '../../../domains/shop/mappers';
import { ARTWORK_BG, type Mode, THEME_SURFACES } from './artwork';
import {
  CoinIcon,
  BoosterIcon,
  FreezeIcon,
  ThemeIcon,
  StreakFlameIcon,
  RewardGiftIcon,
} from '../../../components/brand/BrandIcons';
import { cn } from '../../../lib/utils';

/** Text is fixed per mode on mobile (shop.md §6.2); themes only change surfaces. */
const TEXT: Record<Mode, { text: string; muted: string }> = {
  light: { text: '#1E2A44', muted: '#565879' },
  dark: { text: '#FFFFFF', muted: '#9597AD' },
};

/** The button an owned item shows in Kho đồ (mobile inventory card). */
const INVENTORY_ACTION: Record<ShopItemType, string> = {
  THEME: 'Áp dụng',
  AVATAR_FRAME: 'Trang bị',
  XP_BOOSTER: 'Kích hoạt',
  // Passive: the app shows a status, there is nothing to press (streak_freeze.md §7).
  STREAK_FREEZE: 'Sẵn sàng',
};

/** Helper to resolve a sample frame asset when none is uploaded yet */
function resolveFrameAsset(form: ShopItemForm, frameUrl?: string | null): string | null {
  if (frameUrl) return frameUrl;
  const c = (form.code || form.name || '').toLowerCase();
  if (c.includes('fire') || c.includes('streak')) return '/frames/frame_fire_streak.png';
  if (c.includes('golden') || c.includes('wordsmith')) return '/frames/frame_golden_wordsmith.png';
  if (c.includes('cherry') || c.includes('blossom')) return '/frames/frame_cherry_blossom.png';
  if (c.includes('legendary') || c.includes('legend')) return '/frames/frame_legendary.png';
  if (c.includes('bronze')) return '/frames/frame_bronze_learner.png';
  if (c.includes('silver')) return '/frames/frame_silver_scholar.png';
  if (c.includes('nature')) return '/frames/frame_nature_explorer.png';
  if (c.includes('ocean')) return '/frames/frame_ocean_voyager.png';
  if (c.includes('space')) return '/frames/frame_space_dreamer.png';
  if (c.includes('owl')) return '/frames/frame_night_owl.png';
  // Fallback sample frame if frame type selected but no asset yet
  if (form.type === 'AVATAR_FRAME') return '/frames/frame_fire_streak.png';
  return null;
}

/** Learner avatar stand-in with the frame overlaid at the mobile ratio (avatar = 58% of the frame). */
export const FramedAvatar: React.FC<{ frameUrl?: string | null; size: number }> = ({ frameUrl, size }) => (
  <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
    <div
      className="rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black flex items-center justify-center shadow-inner select-none"
      style={{ width: size * (frameUrl ? 0.58 : 0.88), height: size * (frameUrl ? 0.58 : 0.88), fontSize: size * 0.18 }}
    >
      SV
    </div>
    {frameUrl && (
      <img
        src={frameUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md"
      />
    )}
  </div>
);

export type SimulatorTab = 'shop' | 'inventory' | 'profile';

interface ShopItemPreviewProps {
  form: ShopItemForm;
  iconUrl?: string | null;
  frameUrl?: string | null;
  className?: string;
}

/**
 * ShopMobileSimulator: High-fidelity mobile simulator for previewing shop items
 * across Shop Storefront, Learner Inventory, and Learner Profile.
 */
export const ShopMobileSimulator: React.FC<ShopItemPreviewProps> = ({
  form,
  iconUrl,
  frameUrl,
  className,
}) => {
  const type = form.type ?? 'THEME';
  const [selectedTab, setSelectedTab] = useState<SimulatorTab | null>(null);
  const activeTab = selectedTab ?? (type === 'AVATAR_FRAME' ? 'profile' : 'shop');
  const setActiveTab = setSelectedTab;
  const [mode, setMode] = useState<Mode>('light');

  const sold = Boolean(form.purchasable);
  const palette = form.themeKey ? THEME_SURFACES[form.themeKey]?.[mode] : undefined;
  const ink = TEXT[mode];
  const effectiveFrameUrl = resolveFrameAsset(form, frameUrl);

  return (
    <div className={cn('bg-surface border border-border rounded-2xl p-4 space-y-3.5 shadow-xs select-none', className)}>
      {/* Simulator Control Bar */}
      <div className="flex flex-col gap-2.5 pb-2 border-b border-border/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
            <Smartphone size={15} className="text-text-muted" />
            <span>Xem trước trên ứng dụng</span>
          </div>
        </div>

        {/* View Switcher: Shop / Inventory / Profile */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border text-xs w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all',
                activeTab === 'shop'
                  ? 'bg-surface text-text shadow-xs font-bold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <ShoppingBag size={12} />
              <span>Cửa hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all',
                activeTab === 'inventory'
                  ? 'bg-surface text-text shadow-xs font-bold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <Package size={12} />
              <span>Kho đồ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all',
                activeTab === 'profile'
                  ? 'bg-surface text-text shadow-xs font-bold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <User size={12} />
              <span>Hồ sơ</span>
            </button>
          </div>

          {/* Theme Light/Dark switcher if Theme type */}
          {type === 'THEME' && form.themeKey && (
            <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border text-[11px] font-semibold">
              {(['light', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'px-2 py-0.5 rounded transition-all',
                    mode === m ? 'bg-text text-white font-bold' : 'text-text-muted hover:text-text'
                  )}
                >
                  {m === 'light' ? 'Sáng' : 'Tối'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phone Chassis */}
      <div className="w-full flex justify-center py-1">
        <div className="w-[306px] h-[585px] bg-slate-950 rounded-[44px] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] border-4 border-slate-800 relative flex flex-col">
          {/* Inner Screen */}
          <div
            className="w-full h-full rounded-[34px] overflow-hidden flex flex-col relative border border-slate-900 transition-colors duration-300"
            style={{
              background: palette ? palette.background : '#F8F9F7',
              color: ink.text,
            }}
          >
            {/* Phone Status Bar */}
            <div className="w-full h-7 pt-1 px-5 flex items-center justify-between text-[10px] font-bold select-none z-30" style={{ color: ink.text }}>
              <span>09:41</span>
              {/* Dynamic Island Notch */}
              <div className="w-18 h-3.5 bg-black rounded-full mx-auto" />
              <div className="flex items-center gap-1">
                <Signal size={10} />
                <Wifi size={10} />
                <Battery size={12} />
              </div>
            </div>

            {/* Mobile App Header */}
            <div
              className="px-3.5 py-2 flex items-center justify-between border-b transition-colors z-20"
              style={{
                background: palette ? palette.headerBg : '#FFFFFF',
                borderColor: palette ? palette.border : '#E5E7EB',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🦊</span>
                <span className="font-black text-xs tracking-tight" style={{ color: ink.text }}>
                  SnapVocab
                </span>
              </div>

              {/* Currency indicators */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                  <CoinIcon size={12} />
                  <span>4.280</span>
                </div>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-bold">
                  <StreakFlameIcon size={12} />
                  <span>14</span>
                </div>
              </div>
            </div>

            {/* SCREEN VIEWPORT BY TAB */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
              {/* TAB 1: CỬA HÀNG (SHOP STOREFRONT) */}
              {activeTab === 'shop' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-primary-solid text-white shrink-0 shadow-2xs">
                      Tất cả
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-surface border border-border/80 text-text-muted shrink-0">
                      Khung avatar
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-surface border border-border/80 text-text-muted shrink-0">
                      Boosters
                    </span>
                  </div>

                  {/* Focus Item Card (What is currently being made) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-primary-dark">
                      <span>Vật phẩm đang biên tập</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-solid animate-ping" />
                    </div>

                    <div
                      className="overflow-hidden rounded-[22px] border border-b-[3px] bg-white shadow-xs transition-all"
                      style={{
                        borderColor: palette ? palette.border : '#E2E8F0',
                        background: palette ? palette.surface : '#FFFFFF',
                      }}
                    >
                      <div className="h-[96px] flex items-center justify-center relative overflow-hidden" style={{ background: ARTWORK_BG[type] }}>
                        {type === 'AVATAR_FRAME' ? (
                          <FramedAvatar frameUrl={effectiveFrameUrl} size={88} />
                        ) : iconUrl ? (
                          <img src={iconUrl} alt="" className="w-[72px] h-[72px] object-contain drop-shadow-sm" />
                        ) : (
                          <span style={{ color: TEXT.light.muted }}>
                            {type === 'THEME' ? <ThemeIcon size={36} /> : type === 'STREAK_FREEZE' ? <FreezeIcon size={36} /> : <BoosterIcon size={36} />}
                          </span>
                        )}
                        <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-white/80 font-bold border border-border/60">
                          #{form.sortOrder ?? 0}
                        </span>
                      </div>

                      <div className="p-2.5 space-y-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: ink.muted }}>
                            {formatShopItemTypeLabel(type)}
                          </div>
                          <div className="text-[14px] leading-tight font-extrabold line-clamp-2 min-h-[34px]" style={{ color: ink.text }}>
                            {form.name || 'Tên vật phẩm'}
                          </div>
                          {form.description && (
                            <div className="mt-0.5 text-[11px] leading-snug line-clamp-2" style={{ color: ink.muted }}>
                              {form.description}
                            </div>
                          )}
                        </div>

                        {/* Duolingo style 3D purchase button */}
                        <div className="h-9 rounded-xl border-b-[3px] border-primary-solid-hover bg-primary-solid flex items-center justify-center text-xs font-black text-white shadow-xs">
                          {sold ? (
                            <span className="flex items-center gap-1.5">
                              <span>Mua</span>
                              <span>·</span>
                              <CoinIcon size={13} />
                              <span>{(form.price ?? 0).toLocaleString('vi-VN')}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <RewardGiftIcon size={12} />
                              <span>Chỉ dùng làm quà</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: KHO ĐỒ (LEARNER INVENTORY) */}
              {activeTab === 'inventory' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: ink.text }}>
                      Túi đồ của bạn
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary-dark font-bold font-mono">
                      12 vật phẩm
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border bg-white shadow-xs space-y-2.5" style={{ borderColor: palette?.border ?? '#E5E7EB' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: ARTWORK_BG[type] }}>
                        {type === 'AVATAR_FRAME' ? (
                          <FramedAvatar frameUrl={effectiveFrameUrl} size={50} />
                        ) : iconUrl ? (
                          <img src={iconUrl} alt="" className="w-10 h-10 object-contain" />
                        ) : (
                          <span style={{ color: TEXT.light.muted }}>
                            {type === 'THEME' ? <ThemeIcon size={24} /> : type === 'STREAK_FREEZE' ? <FreezeIcon size={24} /> : <BoosterIcon size={24} />}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase text-primary-dark tracking-wide">
                          {formatShopItemTypeLabel(type)}
                        </div>
                        <div className="font-extrabold text-xs text-text truncate">
                          {form.name || 'Tên vật phẩm'}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {type === 'XP_BOOSTER'
                            ? `Sở hữu: 2 thẻ · Tối đa ${form.maxQuantity ?? 5}`
                            : type === 'STREAK_FREEZE'
                              ? `Tự dùng khi bạn lỡ một ngày học · Tối đa ${form.maxQuantity ?? 2}`
                              : 'Đã sẵn sàng trong túi đồ'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full h-8 rounded-lg bg-primary-solid text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-transform"
                    >
                      <Check size={13} />
                      <span>{INVENTORY_ACTION[type]}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: HỒ SƠ NGƯỜI HỌC (LEARNER PROFILE) */}
              {activeTab === 'profile' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  {/* Profile Header Card */}
                  <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
                    {/* Hero Gradient Banner */}
                    <div className="h-14 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative" />

                    {/* Avatar centered over banner */}
                    <div className="px-3 pb-3 pt-0 flex flex-col items-center text-center -mt-8">
                      <FramedAvatar frameUrl={effectiveFrameUrl} size={96} />

                      <div className="mt-1.5">
                        <div className="font-black text-sm text-text">Người học mẫu</div>
                      </div>

                      {/* Micro stats bar */}
                      <div className="w-full grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-border/60 text-center">
                        <div>
                          <div className="text-[11px] font-black text-orange-600 font-mono">27</div>
                          <div className="text-[9px] text-text-muted">Ngày streak</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-primary-dark font-mono">1.284</div>
                          <div className="text-[9px] text-text-muted">Từ đã học</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-amber-600 font-mono">4.280</div>
                          <div className="text-[9px] text-text-muted">Coin</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Equipment Box */}
                  <div className="p-2.5 rounded-xl border border-border bg-white space-y-1 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Trang bị hiển thị trên hồ sơ
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Khung đại diện:</span>
                      <strong className="text-primary-dark font-extrabold truncate max-w-[150px]">
                        {form.name || 'Khung Avatar mới'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Home Bar */}
            <div className="w-full h-4 flex items-center justify-center pb-0.5">
              <div className="w-24 h-1 bg-slate-400/50 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* design.md §6: the sample context around the item says it is sample. */}
      <p className="w-full border-t border-border/70 pt-2 text-center text-xs text-text-muted">
        Cập nhật theo nội dung đang nhập. Người học, ví Coin và streak trong khung là số mẫu.
      </p>
    </div>
  );
};

// Aliased export to preserve exact backward compatibility
export const ShopItemPreview = ShopMobileSimulator;
export default ShopMobileSimulator;
