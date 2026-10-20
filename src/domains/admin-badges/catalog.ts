import type { AdminBadge, BadgeMetric, StatusFilter } from './types';

/** Emblems the app can draw (SnapVocab achievement-artifact.tsx EMBLEMS); any other key renders as `award`. */
export const EMBLEM_LABELS: Record<string, string> = {
  flame: 'Ngọn lửa',
  'clipboard-check': 'Bảng kiểm',
  target: 'Hồng tâm',
  'book-open': 'Sách mở',
  award: 'Huy chương',
};
export const isKnownEmblem = (key: string) => key in EMBLEM_LABELS;

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
    rule: 'Theo chuỗi dài nhất từng đạt; một ngày học là ngày có ít nhất 1 quiz hoàn thành.',
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

export function filterGroups(groups: BadgeGroup[], query: string, status: StatusFilter): BadgeGroup[] {
  const q = normalize(query.trim());
  return groups
    .map(g => ({
      ...g,
      items: g.items.filter(b => (status === 'ALL' || b.isActive === (status === 'ON'))
        && (!q || normalize(`${b.name} ${b.code}`).includes(q))),
    }))
    .filter(g => g.items.length > 0);
}

/** Second line under the status chip; null while the badge is active (rev 2 §3.5). */
export function statusReason(b: AdminBadge): string | null {
  if (b.isActive) return null;
  if (b.earnerCount === null) return 'Người đã đạt vẫn thấy; người chưa đạt không thấy';
  return b.earnerCount > 0
    ? `Ngừng cấp · ${formatCount(b.earnerCount)} người đã đạt vẫn thấy`
    : 'Người học không thấy huy hiệu này';
}

/** Shelf a learner would see once this badge is on: active badges of the series plus this one, in app order. */
export const previewShelf = (all: AdminBadge[], badge: AdminBadge) =>
  all.filter(b => b.metric === badge.metric && (b.isActive || b.id === badge.id)).sort(byItemOrder);
