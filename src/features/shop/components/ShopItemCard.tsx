import React from 'react';
import { AdminShopItemDTO } from '../../../domains/shop/types';
import { DerivedSaleState, formatFullDays, formatThemeKeyLabel } from '../../../domains/shop/mappers';
import { Badge } from '../../../components/ui';
import { BoosterIcon, CoinIcon, FreezeIcon, ThemeIcon } from '../../../components/brand/BrandIcons';
import { cn } from '../../../lib/utils';
import { FramedAvatar } from './ShopItemPreview';
import { ARTWORK_BG, THEME_SURFACES } from './artwork';

/**
 * Resolves frame asset URL: uses uploaded frameAssetUrl if present,
 * or maps standard catalog frame codes to /frames/ assets.
 */
function resolveFrameAsset(item: AdminShopItemDTO): string | null {
  if (item.frameAssetUrl) return item.frameAssetUrl;
  const c = item.code.toLowerCase();
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
  return null;
}

/** The item as the learner sees its artwork: frame on an avatar, otherwise the uploaded icon. */
const Artwork: React.FC<{ item: AdminShopItemDTO }> = ({ item }) => {
  if (item.type === 'AVATAR_FRAME') {
    const frameUrl = resolveFrameAsset(item);
    return <FramedAvatar frameUrl={frameUrl} size={104} />;
  }
  if (item.iconUrl) {
    return <img src={item.iconUrl} alt="" className="h-24 w-24 object-contain drop-shadow-md transition-transform group-hover:scale-105" />;
  }
  // No uploaded artwork yet: a plain placeholder, so a missing asset is visible instead of dressed up.
  return (
    <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong bg-surface/70 text-text-light">
      {item.type === 'THEME' ? <ThemeIcon size={32} /> : item.type === 'STREAK_FREEZE' ? <FreezeIcon size={32} /> : <BoosterIcon size={32} />}
      <span className="text-2xs">Chưa có ảnh</span>
    </div>
  );
};

/** Light and dark surfaces of the theme, so operators tell themes apart without opening them. */
const ThemeSwatch: React.FC<{ themeKey: string | null }> = ({ themeKey }) => {
  const t = themeKey ? THEME_SURFACES[themeKey] : undefined;
  if (!t) return null;
  return (
    <span className="flex -space-x-1 p-1 bg-surface/85 backdrop-blur-xs rounded-full border border-border/80 shadow-xs" title={`Bộ ${formatThemeKeyLabel(themeKey)}`}>
      {[t.light.border, t.dark.border, t.dark.background].map((c) => (
        <span key={c} className="h-3 w-3 rounded-full border-2 border-white shadow-xs" style={{ background: c }} />
      ))}
    </span>
  );
};

/** What sets this item apart from others of its type; the shelf already names the type. */
function specLine(item: AdminShopItemDTO): string | null {
  if (item.type === 'XP_BOOSTER') return `×2 XP trong ${item.boostDurationMinutes ?? 30} phút, giữ tối đa ${item.maxQuantity ?? 5}`;
  if (item.type === 'STREAK_FREEZE') return `Tự giữ chuỗi khi lỡ một ngày học, giữ tối đa ${item.maxQuantity ?? 2}`;
  if (item.type === 'THEME') return `Bộ ${formatThemeKeyLabel(item.themeKey)}`;
  return null;
}

interface ShopItemCardProps {
  item: AdminShopItemDTO;
  sale: DerivedSaleState;
  onOpen: (id: number) => void;
}

/**
 * Storefront tile: artwork first, then what an operator checks (price in Coin and mission-days).
 * Only a sale state other than "on sale" gets a badge, so drafts, ended and gift-only items stand out on the shelf.
 */
export const ShopItemCard: React.FC<ShopItemCardProps> = ({ item, sale, onOpen }) => {
  const spec = specLine(item);
  const priced = item.purchasable && item.price != null;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      title={sale.state === 'ON_SALE' ? `${sale.label}: ${sale.detail}` : undefined}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-surface text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info',
        item.status === 'DRAFT' ? 'border-dashed border-border-strong' : 'border-border',
      )}
    >
      <div className="relative flex h-36 w-full items-center justify-center overflow-hidden border-b border-border/60" style={{ background: ARTWORK_BG[item.type] }}>
        {sale.state !== 'ON_SALE' && (
          <span className="absolute left-2.5 top-2.5 z-10" title={sale.detail}>
            <Badge tone={sale.tone}>{sale.label}</Badge>
          </span>
        )}
        <span className="absolute right-2.5 top-2 z-10 text-2xs tabular-nums text-text-muted" title="Thứ tự hiển thị trong Cửa hàng">#{item.sortOrder}</span>
        <div className={cn(item.status === 'ARCHIVED' && 'opacity-50 grayscale')}>
          <Artwork item={item} />
        </div>
        {item.type === 'THEME' && (
          <span className="absolute bottom-2 right-2 z-10">
            <ThemeSwatch themeKey={item.themeKey} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-body font-semibold text-text group-hover:underline" title={item.name}>{item.name}</div>
          <div className="truncate font-mono text-2xs text-text-light">{item.code}</div>
        </div>
        <div className="border-t border-border/60 pt-2 text-xs">
          {priced ? (
            <div className="flex items-baseline justify-between gap-1">
              <span className="flex items-center gap-1"><CoinIcon size={14} /><span className="text-sm font-semibold tabular-nums text-text">{item.price!.toLocaleString('vi-VN')}</span></span>
              <span className="text-text-muted" title="Số ngày làm đủ 5 nhiệm vụ (tối đa 85 Coin/ngày)">{formatFullDays(item.price!)}</span>
            </div>
          ) : (
            <span className="font-medium text-reward-dark">Chỉ dùng làm quà</span>
          )}
          {spec && <div className="mt-1 truncate text-text-muted" title={spec}>{spec}</div>}
        </div>
      </div>
    </button>
  );
};
