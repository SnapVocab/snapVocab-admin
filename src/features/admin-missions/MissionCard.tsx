import React from 'react';
import { BookOpen, ChevronRight, Flame, ShoppingBag, Target } from 'lucide-react';
import type { MissionCategory, MissionContent, MissionTrigger } from '../../domains/admin-missions/types';
import { CoinIcon, XpIcon } from '../../components/brand/BrandIcons';
import { cn } from '../../lib/utils';
import { categoryIcons } from './ui';

/**
 * Category tiles of the mobile missions screen (SnapVocab/src/features/missions/missions-screen.tsx);
 * categories without a tile use its neutral Target fallback.
 */
const TILES: Partial<Record<MissionCategory, { Icon: typeof Target; bg: string; color: string }>> = {
  VOCABULARY: { Icon: BookOpen, bg: '#C7ECFC', color: '#0B8FCE' },
  QUIZ: { Icon: Target, bg: '#EAE2FE', color: '#8253EC' },
  RETENTION: { Icon: Flame, bg: '#FFF3E0', color: '#E57C00' },
  SHOP: { Icon: ShoppingBag, bg: '#FFEFB8', color: '#B37F00' },
};
const FALLBACK = { Icon: Target, bg: '#F3F4F6', color: '#565879' };

/** Mobile CTA per trigger (vi.json missions.action.*). */
const ACTION: Record<MissionTrigger, string> = {
  TOPIC_ITEM_CREATED: 'Thêm từ', QUIZ_COMPLETED: 'Làm quiz', LEARNING_ACTIVITY_RECORDED: 'Học ngay',
  SHOP_ITEM_PURCHASED: 'Tới cửa hàng', BOOSTER_USED: 'Kích hoạt booster',
};

/** Category tile. `mobile` uses the app's own glyph set; otherwise the admin glyph per category (same colours). */
export function MissionTile({ category, mobile, size = 'md' }: { category: MissionCategory; mobile?: boolean; size?: 'sm' | 'md' }) {
  const tile = TILES[category] ?? FALLBACK;
  const Icon = mobile ? tile.Icon : categoryIcons[category];
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', size === 'sm' ? 'h-8 w-8' : 'h-11 w-11')} style={{ background: tile.bg }}>
      <Icon size={size === 'sm' ? 16 : 22} color={tile.color} />
    </span>
  );
}

export function RewardLine({ coin, xp, size = 16 }: { coin: number | string; xp: number | string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap font-extrabold tabular-nums">
      <span className="inline-flex items-center gap-1"><CoinIcon size={size} />{coin}</span>
      <span className="inline-flex items-center gap-1"><XpIcon size={size + 2} />{xp} XP</span>
    </span>
  );
}

type CardMission = Pick<MissionContent, 'name' | 'description' | 'category' | 'triggerEvent' | 'targetValue' | 'rewardCoin' | 'rewardXp' | 'rewardItemCode'>;

/** The mission as a learner sees it on a new day: progress 0/target, reward, CTA (mobile missions screen). */
export function MissionCard({ mission, compact }: { mission: CardMission; compact?: boolean }) {
  return (
    <div className={cn('rounded-2xl border-2 border-neutral-100 bg-white', compact ? 'space-y-2.5 p-3' : 'space-y-3 p-4')}>
      <div className="flex items-center gap-3">
        <MissionTile category={mission.category} mobile size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <p className={cn('font-extrabold text-[#1E2A44]', compact ? 'truncate text-[13px]' : 'text-[15px]')} title={mission.name}>{mission.name || 'Tên nhiệm vụ'}</p>
          <p className={cn('text-neutral-500', compact ? 'line-clamp-2 text-xs' : 'text-[13px]')}>{mission.description || 'Mô tả nhiệm vụ'}</p>
          {!compact && mission.triggerEvent === 'TOPIC_ITEM_CREATED' && (
            <p className="mt-1 text-xs text-neutral-500">Thêm vào chủ đề của bạn, kèm bản dịch. Từ đã từng được tính sẽ không tính lại.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 rounded-full bg-neutral-200" />
        <span className="text-sm font-extrabold text-neutral-600">0/{mission.targetValue || '?'}</span>
      </div>
      <div className={cn('flex items-center gap-2 text-sm', compact && 'text-xs')}>
        <RewardLine coin={mission.rewardCoin} xp={mission.rewardXp} size={compact ? 14 : 18} />
        <span className="flex-1" />
        {!compact && (
          <span className="inline-flex items-center text-sm font-extrabold text-primary-dark">{ACTION[mission.triggerEvent]}<ChevronRight size={16} /></span>
        )}
      </div>
      {mission.rewardItemCode && <p className={cn('break-all text-neutral-500', compact ? 'text-xs' : 'text-sm')}>Vật phẩm: {mission.rewardItemCode}</p>}
    </div>
  );
}
