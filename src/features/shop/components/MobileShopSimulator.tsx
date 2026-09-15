import React, { useState } from 'react';
import { ShopItem, SimulatorViewMode, ShopItemCategory } from '../../../domains/economy/types';
import { AvatarFrame } from '../../../components/AvatarFrame';
import {
  Smartphone,
  Sparkles,
  ShoppingBag,
  Coins,
  Gem,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  X,
} from 'lucide-react';

interface MobileShopSimulatorProps {
  items: ShopItem[];
  selectedItem?: ShopItem | null;
  onSelectItem?: (item: ShopItem) => void;
}

export const MobileShopSimulator: React.FC<MobileShopSimulatorProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  const [viewMode, setViewMode] = useState<SimulatorViewMode>('shop-screen');
  const [mobileCategory, setMobileCategory] = useState<string>('all');
  
  // Simulator interactive state
  const [simCoins, setSimCoins] = useState<number>(1450);
  const [simGems, setSimGems] = useState<number>(95);
  const [equippedFrame, setEquippedFrame] = useState<string>('frame_golden_wordsmith');
  const [equippedTheme, setEquippedTheme] = useState<string>('theme_palette_synthwave');
  const [hasBoosterActive, setHasBoosterActive] = useState<boolean>(true);
  const [freezeShieldCount, setFreezeShieldCount] = useState<number>(1);

  // Purchasing modal state
  const [purchaseModalItem, setPurchaseModalItem] = useState<ShopItem | null>(null);
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState<string | null>(null);

  // Filter items for simulator
  const activeItems = items.filter((i) => i.status === 'active' || i.status === 'flash_sale');
  const filteredItems =
    mobileCategory === 'all'
      ? activeItems
      : activeItems.filter((i) => i.category === mobileCategory);

  const handleBuyClick = (item: ShopItem) => {
    setPurchaseModalItem(item);
  };

  const handleConfirmPurchase = () => {
    if (!purchaseModalItem) return;
    const price = purchaseModalItem.discountPrice ?? purchaseModalItem.originalPrice;
    
    if (purchaseModalItem.currency === 'coins') {
      if (simCoins < price) {
        alert('Không đủ Coins trong số dư giả lập!');
        return;
      }
      setSimCoins((prev) => prev - price);
    } else {
      if (simGems < price) {
        alert('Không đủ Gems trong số dư giả lập!');
        return;
      }
      setSimGems((prev) => prev - price);
    }

    if (purchaseModalItem.category === 'streak_saver') {
      setFreezeShieldCount((prev) => Math.min(prev + 1, 2));
    }
    if (purchaseModalItem.category === 'avatar_frame') {
      setEquippedFrame(purchaseModalItem.previewAsset || 'frame_cyberpunk_neon');
    }
    if (purchaseModalItem.category === 'theme') {
      setEquippedTheme(purchaseModalItem.previewAsset || 'theme_palette_synthwave');
    }

    const boughtName = purchaseModalItem.name;
    setPurchaseModalItem(null);
    setPurchaseSuccessMsg(`Đã đổi thành công: ${boughtName}!`);
    setTimeout(() => setPurchaseSuccessMsg(null), 3000);
  };

  return (
    <div className="w-[380px] bg-surface border border-border rounded-xl p-3 shadow-card flex flex-col select-none shrink-0 sticky top-4">
      {/* Simulator Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text">
          <Smartphone size={15} className="text-primary" />
          <span>Mobile App Live Simulator</span>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('shop-screen')}
            className={`px-2 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'shop-screen'
                ? 'bg-surface text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Shop (MH-02)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('inventory-screen')}
            className={`px-2 py-1 rounded-md font-semibold transition-all ${
              viewMode === 'inventory-screen'
                ? 'bg-surface text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Inventory (MH-03)
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {purchaseSuccessMsg && (
        <div className="mb-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>{purchaseSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPurchaseSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* iPhone Device Frame */}
      <div className="relative mx-auto w-[340px] h-[580px] bg-neutral-900 rounded-[38px] p-3 shadow-2xl border-4 border-neutral-700 overflow-hidden flex flex-col justify-between">
        {/* Dynamic Island & Camera */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 ml-8" />
        </div>

        {/* Screen Canvas */}
        <div className="w-full h-full bg-[#F8F9F7] rounded-[30px] overflow-hidden flex flex-col relative">
          {/* iOS Status Bar */}
          <div className="pt-2 px-5 pb-1 flex items-center justify-between text-[11px] font-semibold text-text tracking-tight z-20">
            <span>09:41</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="font-bold">5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* MODE 1: SHOP SCREEN (MH-ECONOMY-02) */}
          {viewMode === 'shop-screen' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile App Header with Wallet Balances */}
              <div className="px-3 py-2 bg-surface border-b border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-snapy-light flex items-center justify-center text-snapy text-xs font-bold border border-snapy/20">
                    🦊
                  </div>
                  <span className="text-xs font-bold text-text">SnapShop</span>
                </div>

                {/* Wallet Balance Badges */}
                <div className="flex items-center gap-1.5">
                  {/* Coins */}
                  <div className="px-2 py-0.5 rounded-full bg-reward-light border border-reward/40 text-[#9A7000] text-[10px] font-bold font-mono flex items-center gap-1">
                    <span>🟡</span>
                    <span>{simCoins.toLocaleString('vi-VN')}</span>
                  </div>
                  {/* Gems */}
                  <div className="px-2 py-0.5 rounded-full bg-info-light border border-info/30 text-info text-[10px] font-bold font-mono flex items-center gap-1">
                    <span>💎</span>
                    <span>{simGems}</span>
                  </div>
                </div>
              </div>

              {/* Category Pills Scroller */}
              <div className="px-2.5 py-1.5 bg-surface-subtle/60 border-b border-border flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'streak_saver', label: 'Lá chắn' },
                  { id: 'booster', label: 'Booster' },
                  { id: 'avatar_frame', label: 'Khung' },
                  { id: 'theme', label: 'Theme' },
                  { id: 'deck', label: 'Decks' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMobileCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all ${
                      mobileCategory === cat.id
                        ? 'bg-text text-white font-bold'
                        : 'bg-surface text-text-muted hover:text-text border border-border/80'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Items Grid (Scrollable) */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
                {/* Banner Promotion if flash sale active */}
                <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    <span className="flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Weekend Streak Rescue</span>
                    </span>
                    <span className="bg-white/20 px-1 rounded">-20%</span>
                  </div>
                  <p className="text-[10px] text-amber-50">
                    Bảo vệ chuỗi 7 ngày với Lá chắn Streak Freeze siêu rẻ!
                  </p>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {filteredItems.map((item) => {
                    const price = item.discountPrice ?? item.originalPrice;
                    const hasDiscount = Boolean(item.discountPrice);
                    const isSelected = selectedItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem?.(item)}
                        className={`bg-surface rounded-xl p-2 border flex flex-col justify-between transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'border-border hover:border-border-strong shadow-card'
                        }`}
                      >
                        {/* Badge if exists */}
                        {item.badge && (
                          <span
                            className={`absolute top-1.5 left-1.5 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                              item.badge === 'HOT'
                                ? 'bg-danger text-white'
                                : item.badge === 'LIMITED'
                                ? 'bg-purple-600 text-white'
                                : 'bg-primary text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Item Icon */}
                        <div
                          className={`w-full h-16 rounded-xl ${
                            item.bgColorClass || 'bg-surface-subtle'
                          } flex items-center justify-center p-1.5 mb-1 mt-1 overflow-hidden transition-transform group-hover:scale-105`}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 object-contain drop-shadow-xs"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-3xl">{item.icon}</span>
                          )}
                        </div>

                        {/* Item Info */}
                        <div>
                          <div className="text-[11px] font-bold text-text truncate leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-text-muted line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        </div>

                        {/* Price & Buy Button */}
                        <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-0.5 text-[11px] font-mono font-bold">
                            <span>{item.currency === 'coins' ? '🟡' : '💎'}</span>
                            <span className={item.currency === 'coins' ? 'text-[#9A7000]' : 'text-info'}>
                              {price}
                            </span>
                            {hasDiscount && (
                              <span className="text-[9px] text-text-light line-through ml-0.5 font-normal">
                                {item.originalPrice}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuyClick(item);
                            }}
                            className="px-2 py-0.5 rounded-md bg-reward-light hover:bg-reward/30 text-[#9A7000] border border-reward/40 font-bold text-[10px] transition-all"
                          >
                            Mua
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: INVENTORY & EQUIP SCREEN (MH-ECONOMY-03) */}
          {viewMode === 'inventory-screen' && (
            /* User Inventory Tab Inside Mobile Simulator */
            <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3">
              {/* Learner Profile Card with Equipped Avatar Frame */}
              <div
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  equippedTheme === 'theme_palette_synthwave'
                    ? 'bg-slate-900 text-white border-purple-500/40'
                    : 'bg-surface text-text border-border shadow-card'
                }`}
              >
                <div className="relative inline-block mx-auto mb-2">
                  {/* Avatar Frame Simulation */}
                  <div className="relative mx-auto flex items-center justify-center">
                    <AvatarFrame
                      frameId={equippedFrame}
                      size={76}
                      animated={true}
                      initials="🦊"
                    />
                  </div>
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white z-20" />
                </div>

                <div className="text-xs font-bold">Học Viên Trọng Nghĩa</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Trình độ: <span className="font-bold text-primary">B2 Advanced</span> · Khung Hoàng Kim
                </div>

                {/* Streak Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-snapy-light border border-snapy/20 text-snapy text-[10px] font-bold mt-2 font-mono">
                  <Flame size={12} className="fill-snapy" />
                  <span>Chuỗi 18 Ngày Học Liên Tục</span>
                </div>
              </div>

              {/* Streak Freeze Shields Owned */}
              <div className="p-2.5 rounded-xl bg-surface border border-border shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-text">
                    <img
                      src="/images/shop/icon5_clean.png"
                      alt="Streak Freeze"
                      className="w-5 h-5 object-contain"
                    />
                    <span>Lá Chắn Streak Freeze</span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded-full border border-cyan-200 font-mono">
                    {freezeShieldCount}/2 Sẵn Sàng
                  </span>
                </div>
                <p className="text-[10px] text-text-muted">
                  Tự động kích hoạt khi bạn bỏ lỡ ngày học để bảo vệ chuỗi ngày.
                </p>
              </div>

              {/* Active XP Booster */}
              <div className="p-2.5 rounded-xl bg-surface border border-border shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-text">
                    <img
                      src="/images/shop/icon1_clean.png"
                      alt="XP Booster"
                      className="w-5 h-5 object-contain"
                    />
                    <span>Thẻ X2 XP Booster</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                    {hasBoosterActive ? 'Đang Chạy' : 'Hết Hạn'}
                  </span>
                </div>
                {hasBoosterActive ? (
                  <div>
                    <div className="text-[10px] text-emerald-600 font-mono font-bold">
                      Còn lại: 00:24:15
                    </div>
                    <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden mt-1">
                      <div className="bg-amber-500 h-full w-2/3" />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted">Chưa kích hoạt thẻ nhân đôi kinh nghiệm.</p>
                )}
              </div>

              {/* Equipped Theme Toggle */}
              <div className="p-2.5 rounded-xl bg-surface border border-border shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-text">
                    <Layers size={13} className="text-purple-600" />
                    <span>Theme Ứng Dụng</span>
                  </div>
                  <span className="text-[10px] font-semibold text-text-muted">
                    {equippedTheme === 'theme_palette_synthwave' ? 'Dark Synthwave' : 'Default'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEquippedTheme((prev) =>
                      prev === 'theme_palette_synthwave' ? 'default' : 'theme_palette_synthwave'
                    )
                  }
                  className="w-full mt-1 py-1 rounded-md bg-surface-subtle hover:bg-surface border border-border text-[10px] font-bold text-text transition-all"
                >
                  Đổi sang {equippedTheme === 'theme_palette_synthwave' ? 'Giao Diện Sáng' : 'Theme Tối Synthwave'}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Purchase Modal Overlay inside Simulator */}
          {purchaseModalItem && (
            <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full bg-surface rounded-2xl p-4 shadow-xl border border-border text-center">
                <div
                  className={`w-16 h-16 mx-auto rounded-2xl ${
                    purchaseModalItem.bgColorClass || 'bg-surface-subtle'
                  } flex items-center justify-center p-2 mb-2 shadow-xs`}
                >
                  {purchaseModalItem.imageUrl ? (
                    <img
                      src={purchaseModalItem.imageUrl}
                      alt={purchaseModalItem.name}
                      className="w-12 h-12 object-contain drop-shadow-sm"
                    />
                  ) : (
                    <span className="text-3xl">{purchaseModalItem.icon}</span>
                  )}
                </div>
                <div className="text-xs font-bold text-text mb-1">
                  Mua {purchaseModalItem.name}?
                </div>
                <p className="text-[10px] text-text-muted mb-3 leading-relaxed">
                  {purchaseModalItem.description}
                </p>

                <div className="p-2 rounded-lg bg-surface-subtle border border-border mb-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted">Giá thanh toán:</span>
                  <strong
                    className={
                      purchaseModalItem.currency === 'coins' ? 'text-[#9A7000]' : 'text-info'
                    }
                  >
                    {purchaseModalItem.currency === 'coins' ? '🟡 ' : '💎 '}
                    {purchaseModalItem.discountPrice ?? purchaseModalItem.originalPrice}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurchaseModalItem(null)}
                    className="py-1.5 rounded-lg border border-border bg-surface text-text font-bold text-xs hover:bg-surface-subtle transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPurchase}
                    className="py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-xs"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Footer Hint */}
      <div className="mt-2 text-center text-[10px] text-text-muted">
        <span>Đồng bộ 1:1 theo chuẩn CardViewModel & MH-ECONOMY-02</span>
      </div>
    </div>
  );
};
