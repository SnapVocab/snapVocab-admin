import type { AdminBadge, BadgeContentPatch, BadgeForm, BadgeMetric, StatusFilter } from './types';

export interface MetricInfo {
  /** Series title and unit as the app shows them (achievements_ui.md §4). */
  title: string;
  unit: string;
  /** How the metric is counted (badges.md §3), shown to the admin. */
  rule: string;
  /** Note the app's detail sheet adds for this series, if any. */
  sheetNote?: string;
  sentence: (n: string) => string;
}

// ponytail: hand-mirrored from the mobile series map; move to a shared package if metrics start changing often.
export const METRICS: Record<BadgeMetric, MetricInfo> = {
  LONGEST_STREAK_DAYS: {
    title: 'Chuỗi ngày học', unit: 'ngày',
    rule: 'Theo chuỗi dài nhất từng đạt; một ngày học là ngày có ít nhất 1 quiz hoàn thành hoặc 1 thẻ được ôn.',
    sheetNote: 'Tính theo chuỗi dài nhất; mất chuỗi không làm mất tiến độ',
    sentence: n => `Chuỗi ngày học dài nhất đạt ${n} ngày`,
  },
  QUIZ_COMPLETED: {
    title: 'Quiz hoàn thành', unit: 'quiz',
    rule: 'Đếm quiz đã hoàn thành; quiz bị hủy hoặc hết hạn không tính.',
    sentence: n => `Hoàn thành ${n} quiz`,
  },
  PERFECT_QUIZ: {
    title: 'Điểm tuyệt đối', unit: 'lần',
    rule: 'Đếm quiz đúng tất cả câu (hoặc tất cả cặp); làm lại cùng chủ đề vẫn tính.',
    sheetNote: 'Quiz cùng chủ đề vẫn được tính',
    sentence: n => `Đạt điểm tuyệt đối ${n} lần`,
  },
  DISTINCT_WORDS_ADDED: {
    title: 'Vốn từ tự xây', unit: 'từ',
    rule: 'Đếm từ khác nhau người học tự thêm, có đủ từ và nghĩa; từ sao chép hay nhập hàng loạt không tính; chỉ tính từ ngày bật theo dõi.',
    sheetNote: 'Chỉ tính các từ thêm sau ngày ra mắt huy hiệu; mỗi từ tính một lần',
    sentence: n => `Tự thêm ${n} từ khác nhau`,
  },
};
export const metricInfo = (metric: string): MetricInfo | undefined => METRICS[metric as BadgeMetric];

export const formatCount = (n: number) => n.toLocaleString('vi-VN');

export function conditionLabel(b: AdminBadge) {
  const unit = metricInfo(b.metric)?.unit;
  return `≥ ${formatCount(b.threshold)}${unit ? ` ${unit}` : ''}`;
}

export function ruleSentence(b: AdminBadge) {
  const info = metricInfo(b.metric);
  return info ? info.sentence(formatCount(b.threshold)) : `${b.metric} ≥ ${formatCount(b.threshold)}`;
}

/** Item order inside a series (UI-BDG-07). */
export const byItemOrder = (a: AdminBadge, b: AdminBadge) =>
  a.threshold - b.threshold || a.sortOrder - b.sortOrder || a.id - b.id;

export interface BadgeGroup {
  metric: string;
  info?: MetricInfo;
  items: AdminBadge[];
  /** Whole-series counts, unaffected by search or status filter. */
  total: number;
  activeCount: number;
}

/**
 * Series ordered by min(sortOrder), ties by first appearance (UI-BDG-07), over the WHOLE catalog including inactive
 * badges. Filtering happens afterwards (filterGroups), so a search never moves a group.
 */
export function groupCatalog(items: AdminBadge[]): BadgeGroup[] {
  // Walking the catalog by sortOrder, a series is first met at its min(sortOrder): insertion order is the group order.
  const bySort = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const series = new Map<string, AdminBadge[]>();
  for (const b of bySort) series.set(b.metric, [...(series.get(b.metric) ?? []), b]);
  return [...series].map(([metric, list]) => ({
    metric,
    info: metricInfo(metric),
    items: list.sort(byItemOrder),
    total: list.length,
    activeCount: list.filter(b => b.isActive).length,
  }));
}

/** Case- and diacritic-insensitive: "thu" finds "Thư Viện Sống". */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const matchesStatus = (b: AdminBadge, status: StatusFilter) =>
  status === 'ALL' || (status === 'ISSUES' ? reviewIssues(b).length > 0 : b.isActive === (status === 'ON'));

export function filterGroups(groups: BadgeGroup[], query: string, status: StatusFilter): BadgeGroup[] {
  const q = normalize(query.trim());
  return groups
    .map(g => ({
      ...g,
      items: g.items.filter(b => matchesStatus(b, status) && (!q || normalize(`${b.name} ${b.code}`).includes(q))),
    }))
    .filter(g => g.items.length > 0);
}

/** The threshold written as a number in the text ("1.000" counts as 1000); a different number does not. */
const mentions = (text: string, n: number) =>
  text.replace(/(\d)[.,](?=\d{3}(\D|$))/g, '$1').match(/\d+/g)?.includes(String(n)) ?? false;

/**
 * What an operator should look at before learners do (the "Cần rà" strip cell). The description check only catches a
 * missing threshold number, never a wrong meaning (badges.md §10).
 */
export function reviewIssues(b: Pick<AdminBadge, 'metric' | 'imageKey' | 'description' | 'threshold' | 'rewardCoin' | 'rewardXp' | 'rewardItemCode' | 'rewardItem'>): string[] {
  const issues: string[] = [];
  if (!b.rewardCoin && !b.rewardXp && !b.rewardItemCode) issues.push('Chưa có phần thưởng: người học đạt huy hiệu mà không nhận Coin, XP hay vật phẩm.');
  const item = b.rewardItem;
  if (b.rewardItemCode && !item) issues.push(`Không tìm thấy vật phẩm thưởng ${b.rewardItemCode} trong Cửa hàng.`);
  // ARCHIVED still grants (ShopRewardService); only a draft is never granted.
  else if (item?.status === 'DRAFT') issues.push(`Vật phẩm thưởng “${item.name}” chưa phát hành: người đạt huy hiệu sẽ không nhận được khung.`);
  else if (item?.purchasable) issues.push(`Vật phẩm thưởng “${item.name}” đang bán ở Cửa hàng: người đã mua sẽ không nhận gì thêm.`);
  if (!metricInfo(b.metric)) issues.push(`Admin chưa hỗ trợ chỉ số ${b.metric}: chưa có tên chuỗi, đơn vị và cách đếm.`);
  if (!b.imageKey) issues.push('Chưa có ảnh huy hiệu: người học thấy ô trống.');
  if (b.description.trim() && !mentions(b.description, b.threshold)) issues.push(`Mô tả không nêu ngưỡng ${formatCount(b.threshold)}, người học có thể hiểu sai điều kiện.`);
  return issues;
}

/** Shelves a learner who has earned nothing sees: active badges only, in app order (UI-BDG-07). */
export const appShelves = (all: AdminBadge[]) => groupCatalog(all.filter(b => b.isActive));

export const toForm = (b: AdminBadge): BadgeForm => ({
  name: b.name, description: b.description, imageKey: b.imageKey, sortOrder: String(b.sortOrder),
  rewardCoin: String(b.rewardCoin), rewardXp: String(b.rewardXp), rewardItemCode: b.rewardItemCode,
});

export const REWARD_MAX = 1000;
const reward = (s: string) => (/^\d+$/.test(s.trim()) && Number(s) <= REWARD_MAX ? Number(s) : null);

/** "+20 Coin · +50 XP · Khung Lửa"; "Không có" when the badge pays nothing. */
export function rewardLabel(b: Pick<AdminBadge, 'rewardCoin' | 'rewardXp' | 'rewardItemCode' | 'rewardItem'>): string {
  const parts = [b.rewardCoin > 0 && `+${formatCount(b.rewardCoin)} Coin`, b.rewardXp > 0 && `+${formatCount(b.rewardXp)} XP`,
    b.rewardItemCode && (b.rewardItem?.name ?? b.rewardItemCode)].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Không có';
}

/** Mirrors the planned server checks (badges.md §8.4) so a draft fails here before it fails there. */
export function validateBadgeForm(f: BadgeForm): Partial<Record<keyof BadgeForm, string>> {
  const errors: Partial<Record<keyof BadgeForm, string>> = {};
  const name = f.name.trim(), description = f.description.trim();
  if (!name) errors.name = 'Nhập tên huy hiệu.'; else if (name.length > 100) errors.name = 'Tối đa 100 ký tự.';
  if (!description) errors.description = 'Nhập mô tả.'; else if (description.length > 255) errors.description = 'Tối đa 255 ký tự.';
  if (!f.imageKey) errors.imageKey = 'Tải lên ảnh huy hiệu.';
  if (!/^-?\d+$/.test(f.sortOrder.trim()) || !Number.isSafeInteger(Number(f.sortOrder))) errors.sortOrder = 'Nhập số nguyên.';
  if (reward(f.rewardCoin) === null) errors.rewardCoin = `Nhập số nguyên 0–${formatCount(REWARD_MAX)}.`;
  if (reward(f.rewardXp) === null) errors.rewardXp = `Nhập số nguyên 0–${formatCount(REWARD_MAX)}.`;
  return errors;
}

/**
 * The badge as it would read after saving; drives the preview and the shelf order while editing. `uploadedUrl` previews
 * a newly uploaded image until the save returns its presigned URL.
 */
export const applyForm = (b: AdminBadge, f: BadgeForm, uploadedUrl: string | null = null): AdminBadge => ({
  ...b, name: f.name.trim() || b.name, description: f.description.trim() || b.description,
  imageKey: f.imageKey, imageUrl: f.imageKey === b.imageKey ? b.imageUrl : uploadedUrl,
  sortOrder: /^-?\d+$/.test(f.sortOrder.trim()) ? Number(f.sortOrder) : b.sortOrder,
  rewardCoin: reward(f.rewardCoin) ?? b.rewardCoin, rewardXp: reward(f.rewardXp) ?? b.rewardXp,
  rewardItemCode: f.rewardItemCode, rewardItem: f.rewardItemCode === b.rewardItemCode ? b.rewardItem : null,
});

/** Only the fields that changed, with the version they were read at; null when nothing changed. */
export function contentPatch(b: AdminBadge, f: BadgeForm): BadgeContentPatch | null {
  const next = applyForm(b, f);
  const patch: BadgeContentPatch = { version: b.version ?? 0 };
  if (next.name !== b.name) patch.name = next.name;
  if (next.description !== b.description) patch.description = next.description;
  if (next.imageKey !== b.imageKey && next.imageKey) patch.imageKey = next.imageKey;
  if (next.sortOrder !== b.sortOrder) patch.sortOrder = next.sortOrder;
  if (next.rewardCoin !== b.rewardCoin) patch.rewardCoin = next.rewardCoin;
  if (next.rewardXp !== b.rewardXp) patch.rewardXp = next.rewardXp;
  if (next.rewardItemCode !== b.rewardItemCode) patch.rewardItemCode = next.rewardItemCode;
  return Object.keys(patch).length > 1 ? patch : null;
}

/** Second line under the status chip; null while the badge is active (rev 2 §3.5). */
export function statusReason(b: AdminBadge): string | null {
  if (b.isActive) return null;
  if (b.earnerCount === null) return 'Người đã đạt vẫn thấy; người chưa đạt không thấy';
  return b.earnerCount > 0
    ? `Ngừng cấp, ${formatCount(b.earnerCount)} người đã đạt vẫn thấy`
    : 'Người học không thấy huy hiệu này';
}

/** Shelf a learner would see once this badge is on: active badges of the series plus this one, in app order. */
export const previewShelf = (all: AdminBadge[], badge: AdminBadge) =>
  all.filter(b => b.metric === badge.metric && (b.isActive || b.id === badge.id)).sort(byItemOrder);
