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
  BookOpen,
  ChevronLeft,
  Volume2,
  RotateCcw,
} from 'lucide-react';
import { ShopItemForm, ShopItemType } from '../../../domains/shop/types';
import { formatShopItemTypeLabel } from '../../../domains/shop/mappers';
import { ARTWORK_BG, CARD_FRAME_WINDOW } from './artwork';
import {
  CoinIcon,
  BoosterIcon,
  FreezeIcon,
  StreakFlameIcon,
  RewardGiftIcon,
} from '../../../components/brand/BrandIcons';
import { cn } from '../../../lib/utils';

/** Mobile light-mode text colors. */
const INK = { text: '#1E2A44', muted: '#565879' };

/** The button an owned item shows in Kho đồ (mobile inventory card). */
const INVENTORY_ACTION: Record<ShopItemType, string> = {
  AVATAR_FRAME: 'Trang bị',
  CARD_FRAME: 'Trang bị',
  XP_BOOSTER: 'Kích hoạt',
  // Passive: the app shows a status, there is nothing to press (streak_freeze.md §7).
  STREAK_FREEZE: 'Sẵn sàng',
};

/** Shop category tabs, same order as the app (mobile shop-category-tabs.tsx). */
const SHOP_CATEGORIES: ShopItemType[] = ['XP_BOOSTER', 'AVATAR_FRAME', 'CARD_FRAME', 'STREAK_FREEZE'];

/** Learner avatar stand-in with the frame overlaid at the mobile ratio (avatar = 58% of the frame). */
export const FramedAvatar: React.FC<{ frameUrl?: string | null; size: number }> = ({ frameUrl, size }) => (
  <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
    <div
      className="rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black flex items-center justify-center shadow-inner select-none"
      style={{ width: size * (frameUrl ? 0.58 : 0.88), height: size * (frameUrl ? 0.58 : 0.88), fontSize: size * 0.18 }}
    >
      <img src="/brand/snapy.png" alt="?nh ??i di?n m?u" className="h-full w-full rounded-full object-cover" />
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

/** A sample flashcard wearing the card frame, laid out like the app's study card (content inside the window only). */
export const FramedCard: React.FC<{ frameUrl?: string | null; height: number; word?: string; meaning?: string }> = ({ frameUrl, height, word, meaning }) => {
  const width = (height * 3) / 4;
  const w = CARD_FRAME_WINDOW;
  return (
    <div className="relative shrink-0" style={{ width, height }}>
      <div
        className="absolute flex flex-col items-center justify-center gap-1 border border-slate-200 bg-white text-center"
        style={{ left: width * w.x, top: height * w.y, width: width * w.width, height: height * w.height, borderRadius: width * w.radius }}
      >
        <span className="font-black text-slate-800" style={{ fontSize: Math.max(10, height * 0.09) }}>{word ?? 'Aa'}</span>
        {meaning && <span className="text-slate-500" style={{ fontSize: Math.max(9, height * 0.045) }}>{meaning}</span>}
      </div>
      {frameUrl && <img src={frameUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />}
    </div>
  );
};

export type SimulatorTab = 'shop' | 'inventory' | 'profile' | 'study';

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
  const type = form.type ?? 'AVATAR_FRAME';
  const [selectedTab, setSelectedTab] = useState<SimulatorTab | null>(null);
  const defaultTab: SimulatorTab = type === 'AVATAR_FRAME' ? 'profile' : type === 'CARD_FRAME' ? 'study' : 'shop';
  // Hồ sơ / Học only exist for their frame type; a tab picked under another type falls back.
  const stale = (selectedTab === 'profile' && type !== 'AVATAR_FRAME') || (selectedTab === 'study' && type !== 'CARD_FRAME');
  const activeTab = !selectedTab || stale ? defaultTab : selectedTab;
  const setActiveTab = setSelectedTab;

  const [flipped, setFlipped] = useState(false);
  const sold = Boolean(form.purchasable);
  const screenTitle = { shop: 'C?a h?ng', inventory: 'Kho ??', profile: 'H? s?', study: '?n t?p t? v?ng' }[activeTab];
  const effectiveFrameUrl = frameUrl;

  return (
    <div className={cn('bg-surface border border-border rounded-2xl p-4 space-y-4 shadow-xs select-none', className)}>
      {/* Simulator Control Bar */}
      <div className="flex flex-col gap-2.5 pb-2 border-b border-border/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
            <Smartphone size={15} className="text-text-muted" />
            <span>Xem trước trên ứng dụng</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-text-muted">Th? v?t ph?m trong giao di?n ng??i h?c.</p>

        {/* View Switcher: Shop / Inventory / Profile */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border text-xs max-w-full flex-wrap">
            <button
              type="button"
              aria-pressed={activeTab === 'shop'} onClick={() => setActiveTab('shop')}
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
              aria-pressed={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}
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

            {type === 'AVATAR_FRAME' && (
            <button
              type="button"
              aria-pressed={activeTab === 'profile'} onClick={() => setActiveTab('profile')}
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
            )}

            {type === 'CARD_FRAME' && (
              <button
                type="button"
                aria-pressed={activeTab === 'study'} onClick={() => setActiveTab('study')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all',
                  activeTab === 'study'
                    ? 'bg-surface text-text shadow-xs font-bold'
                    : 'text-text-muted hover:text-text'
                )}
              >
                <BookOpen size={12} />
                <span>Học</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phone Chassis */}
      <div className="relative w-full flex justify-center rounded-2xl bg-[radial-gradient(ellipse_at_top,_#e2e8f0,_#f1f5f9_65%)] px-2 py-6">
        <div className="w-full max-w-[320px] h-[636px] bg-[#17191e] rounded-[46px] p-[7px] shadow-[0_24px_45px_-12px_rgba(15,23,42,0.5),inset_0_0_0_2px_#71717a] border-[3px] border-[#34363d] relative flex flex-col">
          <div className="absolute -left-[5px] top-24 h-7 w-[3px] rounded-l bg-zinc-500" />
          <div className="absolute -left-[5px] top-36 h-12 w-[3px] rounded-l bg-zinc-500" />
          <div className="absolute -right-[5px] top-32 h-16 w-[3px] rounded-r bg-zinc-500" />
          {/* Inner Screen */}
          <div
            className="w-full h-full rounded-[35px] overflow-hidden flex flex-col relative border border-slate-900 transition-colors duration-300"
            style={{
              background: '#F8F9F7',
              color: INK.text,
            }}
          >
            {/* Phone Status Bar */}
            <div className="relative w-full h-11 shrink-0 pt-1 px-5 flex items-center justify-between text-[10px] font-bold select-none z-30" style={{ color: INK.text }}>
              <span>09:41</span>
              {/* Dynamic Island Notch */}
              <div className="absolute left-1/2 top-2 -translate-x-1/2 w-[82px] h-[22px] bg-[#121316] rounded-full" />
              <div className="flex items-center gap-1">
                <Signal size={10} />
                <Wifi size={10} />
                <Battery size={12} />
              </div>
            </div>

            {/* Mobile App Header */}
            <div
              className="px-3.5 py-3 shrink-0 flex items-center justify-between border-b transition-colors z-20"
              style={{
                background: '#FFFFFF',
                borderColor: '#E5E7EB',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🦊</span>
                <span className="font-black text-xs tracking-tight" style={{ color: INK.text }}>
                  {screenTitle}
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
            <div className="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-none">
              {/* TAB 1: CỬA HÀNG (SHOP STOREFRONT) */}
              {activeTab === 'shop' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  <div className="rounded-2xl bg-[#eaf5de] p-3 flex items-center gap-3">
                    <img src="/brand/snapy-full.png" alt="" className="h-16 w-14 object-contain" />
                    <div><p className="text-[15px] font-black text-[#24451b]">G?c nh?, ch?t ri?ng</p><p className="mt-1 text-[11px] leading-relaxed text-[#4b6942]">??i Coin l?y v?t ph?m y?u th?ch<br />v? ti?p th?m ??ng l?c h?c!</p></div>
                  </div>
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] text-[#565879] shrink-0">
                      Tất cả
                    </span>
                    {SHOP_CATEGORIES.map((c) => (
                      <span
                        key={c}
                        className={cn(
                          'px-2.5 py-1 rounded-full shrink-0',
                          c === type ? 'bg-[#58CC02] text-[#17330B] shadow-2xs' : 'bg-white border border-[#E2E8F0] text-[#565879]'
                        )}
                      >
                        {formatShopItemTypeLabel(c)}
                      </span>
                    ))}
                  </div>

                  {/* Not purchasable = not listed: the shop only shows PUBLISHED ∧ purchasable (shop.md §3.1). */}
                  {!sold ? (
                    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-[#e5e7eb] bg-white p-4 text-center text-[11px]" style={{ color: INK.muted }}>
                      <RewardGiftIcon size={18} />
                      <span>Không hiện trong Cửa hàng. Người học chỉ nhận vật phẩm này qua phần thưởng.</span>
                    </div>
                  ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#3c8c00]">
                      <span>Vật phẩm đang biên tập</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#58CC02]" />
                    </div>

                    <div
                      className="w-[calc(50%-5px)] min-w-[120px] overflow-hidden rounded-[16px] border border-b-[3px] bg-white shadow-xs transition-all"
                      style={{
                        borderColor: '#E2E8F0',
                        background: '#FFFFFF',
                      }}
                    >
                      <div className="h-[96px] flex items-center justify-center relative overflow-hidden" style={{ background: ARTWORK_BG[type] }}>
                        {type === 'CARD_FRAME' ? (
                          <FramedCard frameUrl={frameUrl} height={88} />
                        ) : type === 'AVATAR_FRAME' ? (
                          <FramedAvatar frameUrl={effectiveFrameUrl} size={88} />
                        ) : iconUrl ? (
                          <img src={iconUrl} alt="" className="w-[72px] h-[72px] object-contain drop-shadow-sm" />
                        ) : (
                          <span style={{ color: INK.muted }}>
                            {type === 'STREAK_FREEZE' ? <FreezeIcon size={36} /> : <BoosterIcon size={36} />}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 space-y-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: INK.muted }}>
                            {formatShopItemTypeLabel(type)}
                          </div>
                          <div className="text-[13px] leading-tight font-extrabold line-clamp-2 min-h-[34px]" style={{ color: INK.text }}>
                            {form.name || 'Tên vật phẩm'}
                          </div>
                          {type === 'XP_BOOSTER' && <p className="mt-1 text-[11px] font-semibold text-[#565879]">?2 XP ? {form.boostDurationMinutes ?? 30} ph?t</p>}

                        </div>

                        {/* Duolingo style 3D purchase button */}
                        <div className="h-9 rounded-xl border-b-[3px] border-[#46a302] bg-[#58CC02] flex items-center justify-center text-xs font-black text-[#17330B] shadow-xs">
                          <span className="flex items-center gap-1.5">
                            <span>Mua</span>
                            <span>·</span>
                            <CoinIcon size={13} />
                            <span>{(form.price ?? 0).toLocaleString('vi-VN')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                </div>
              )}

              {/* TAB 2: KHO ĐỒ (LEARNER INVENTORY) */}
              {activeTab === 'inventory' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: INK.text }}>
                      Túi đồ của bạn
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef8e6] text-[#3c8c00] font-bold font-mono">
                      12 vật phẩm
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border bg-white shadow-xs space-y-2.5" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: ARTWORK_BG[type] }}>
                        {type === 'CARD_FRAME' ? (
                          <FramedCard frameUrl={frameUrl} height={52} />
                        ) : type === 'AVATAR_FRAME' ? (
                          <FramedAvatar frameUrl={effectiveFrameUrl} size={50} />
                        ) : iconUrl ? (
                          <img src={iconUrl} alt="" className="w-10 h-10 object-contain" />
                        ) : (
                          <span style={{ color: INK.muted }}>
                            {type === 'STREAK_FREEZE' ? <FreezeIcon size={24} /> : <BoosterIcon size={24} />}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase text-[#3c8c00] tracking-wide">
                          {formatShopItemTypeLabel(type)}
                        </div>
                        <div className="font-extrabold text-xs text-[#1E2A44] truncate">
                          {form.name || 'Tên vật phẩm'}
                        </div>
                        <div className="text-[10px] text-[#565879] mt-0.5">
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
                      disabled aria-label="Thao t?c minh h?a"
                      className="w-full h-8 rounded-lg bg-[#58CC02] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-transform"
                    >
                      <Check size={13} />
                      <span>{INVENTORY_ACTION[type]}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: HỌC (card frame around the study flashcard, card_frame_plan.md PD-CF-01) */}
              {activeTab === 'study' && (
                <div className="flex flex-col items-center gap-3 animate-in fade-in-50 duration-150">
                  <div className="w-full flex items-center justify-between text-[11px] font-bold" style={{ color: INK.muted }}>
                    <span>Ôn tập</span>
                    <span>3/10</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                    <div className="h-full w-[30%] rounded-full bg-emerald-500" />
                  </div>
                  <FramedCard frameUrl={frameUrl} height={330} word="apple" meaning="Chạm để lật thẻ" />
                  {!frameUrl && (
                    <span className="text-[10px] text-center" style={{ color: INK.muted }}>Chưa tải ảnh khung thẻ: đang hiện thẻ không khung.</span>
                  )}
                  <div className="w-full rounded-2xl border-2 border-b-4 border-emerald-200 border-b-emerald-400 bg-emerald-50 py-2.5 text-center text-xs font-black text-emerald-800">
                    Hiện đáp án
                  </div>
                </div>
              )}

              {/* TAB 3: HỒ SƠ NGƯỜI HỌC (LEARNER PROFILE) */}
              {activeTab === 'profile' && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  {/* Profile Header Card */}
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden shadow-xs">
                    {/* Hero Gradient Banner */}
                    <div className="h-14 bg-gradient-to-br from-[#d9edbf] via-[#eaf5de] to-[#f5f9ed] relative" />

                    {/* Avatar centered over banner */}
                    <div className="px-3 pb-3 pt-0 flex flex-col items-center text-center -mt-8">
                      <FramedAvatar frameUrl={effectiveFrameUrl} size={96} />

                      <div className="mt-1.5">
                        <div className="font-black text-sm text-[#1E2A44]">Người học mẫu</div>
                      </div>

                      {/* Micro stats bar */}
                      <div className="w-full grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-[#e5e7eb] text-center">
                        <div>
                          <div className="text-[11px] font-black text-orange-600 font-mono">14</div>
                          <div className="text-[9px] text-[#565879]">Ngày streak</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-[#3c8c00] font-mono">1.284</div>
                          <div className="text-[9px] text-[#565879]">Từ đã học</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-amber-600 font-mono">4.280</div>
                          <div className="text-[9px] text-[#565879]">Coin</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Equipment Box */}
                  <div className="p-2.5 rounded-xl border border-[#e5e7eb] bg-white space-y-1 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#565879]">
                      Trang bị hiển thị trên hồ sơ
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#565879]">Khung đại diện:</span>
                      <strong className="text-[#3c8c00] font-extrabold truncate max-w-[150px]">
                        {form.name || 'Khung Avatar mới'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <nav aria-label="?i?u h??ng b?n xem tr??c" className="grid grid-cols-3 shrink-0 border-t border-[#e5e7eb] bg-white px-2 pt-2 pb-1">
              {([{ tab: 'study', label: 'H?c t?p', icon: BookOpen }, { tab: 'shop', label: 'C?a h?ng', icon: ShoppingBag }, { tab: 'inventory', label: 'Kho ??', icon: Package }] as const).map(({ tab, label, icon: Icon }) => (
                <button key={tab} type="button" disabled={tab === 'study' && type !== 'CARD_FRAME'} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={cn('flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-bold disabled:opacity-40', activeTab === tab ? 'bg-[#f0f9e8] text-[#3c8c00]' : 'text-[#7b8191]')}>
                  <Icon size={18} strokeWidth={activeTab === tab ? 2.5 : 1.8} />{label}
                </button>
              ))}
            </nav>
            {/* Bottom Home Bar */}
            <div className="w-full h-4 flex items-center justify-center pb-0.5">
              <div className="w-24 h-1 bg-slate-900 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-muted"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Xem tr??c tr?c ti?p</span><button type="button" onClick={() => { setSelectedTab(null); setFlipped(false); }} className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-surface-subtle"><RotateCcw size={11} />??t l?i</button></div>
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
