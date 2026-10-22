/**
 * Nhật ký hoạt động: labels, links and formatting (pure; tests/admin-audit.test.ts).
 * Enum codes never reach the screen (design.md §3.7 G5): every code goes through a label here.
 */
import { foldVi } from '../../lib/utils';
import { formatShopItemStatusLabel, formatShopItemTypeLabel, formatThemeKeyLabel, formatVnDateTime } from '../shop/mappers';
import { categoryLabels, eligibilityLabels } from '../admin-missions/mappers';
import { banReasonError, STATUS_META } from '../admin-learners/mappers';
import { EMBLEM_LABELS } from '../admin-badges/catalog';
import type { LearnerStatus } from '../admin-learners/types';
import type { AuditAction, AuditArea, AuditEntry, AuditKind, AuditTarget, AuditTargetType } from './types';

/** Every reason the backend asks for (ban, permanent stop of sale, a save past a guardrail): 10–500 characters, trimmed. */
export const auditReasonError = banReasonError;

export const AREAS: AuditArea[] = ['SHOP', 'MISSIONS', 'BADGES', 'DICTIONARY', 'TOPICS', 'AI_SCAN', 'LEARNERS', 'NOTIFICATIONS'];
export const AREA_LABEL: Record<AuditArea, string> = {
  SHOP: 'Cửa hàng', MISSIONS: 'Nhiệm vụ', BADGES: 'Huy hiệu', DICTIONARY: 'Từ điển', TOPICS: 'Chủ đề', AI_SCAN: 'AI Scan', LEARNERS: 'Người học', NOTIFICATIONS: 'Thông báo',
};

/** The verb; the object has its own column. */
export const ACTION_LABEL: Record<AuditAction, string> = {
  SHOP_ITEM_CREATED: 'Tạo bản nháp', SHOP_ITEM_UPDATED: 'Sửa', SHOP_ITEM_PUBLISHED: 'Phát hành', SHOP_ITEM_ARCHIVED: 'Ngừng bán vĩnh viễn', SHOP_ITEM_DELETED: 'Xóa bản nháp',
  MISSION_TEMPLATE_CREATED: 'Tạo mẫu', MISSION_TEMPLATE_UPDATED: 'Sửa', MISSION_TEMPLATE_ENABLED: 'Bật', MISSION_TEMPLATE_DISABLED: 'Tắt',
  BADGE_UPDATED: 'Sửa', BADGE_ENABLED: 'Bật', BADGE_DISABLED: 'Tắt',
  WORD_UPDATED: 'Sửa',
  COLLECTION_CREATED: 'Tạo collection', COLLECTION_UPDATED: 'Sửa collection', COLLECTION_DELETED: 'Xóa collection',
  TOPIC_CREATED: 'Tạo chủ đề', TOPIC_ITEM_ADDED: 'Thêm mục từ', TOPIC_TEMPLATE_CHANGED: 'Đổi mẫu thẻ', TOPIC_SCHEMA_CHANGED: 'Đổi schema',
  SCAN_LABEL_MAPPED: 'Gán từ cho nhãn',
  LEARNER_BANNED: 'Khóa tài khoản', LEARNER_UNBANNED: 'Mở khóa tài khoản', LEARNER_PASSWORD_RESET_SENT: 'Gửi link đặt lại mật khẩu',
  SYSTEM_NOTIFICATION_SENT: 'Gửi thông báo hệ thống',
};

export const TARGET_LABEL: Record<AuditTargetType, string> = {
  SHOP_ITEM: 'Vật phẩm', MISSION_TEMPLATE: 'Mẫu nhiệm vụ', BADGE: 'Huy hiệu', WORD: 'Từ', COLLECTION: 'Collection', TOPIC: 'Chủ đề',
  SCAN_LABEL: 'Nhãn scan', LEARNER: 'Người học', NOTIFICATION: 'Thông báo',
};

export const KINDS: AuditKind[] = ['PRICE_REWARD', 'LIFECYCLE', 'LEARNER_ACCOUNT', 'GUARDRAIL'];
export const KIND_LABEL: Record<AuditKind, string> = {
  PRICE_REWARD: 'Giá và phần thưởng', LIFECYCLE: 'Vòng đời', LEARNER_ACCOUNT: 'Tài khoản người học', GUARDRAIL: 'Vượt mức gợi ý',
};

const ECONOMY_FIELDS = new Set(['price', 'purchasable', 'rewardCoin', 'rewardXp', 'rewardItemCode', 'rewardItemFallbackCoin']);
const LIFECYCLE_ACTIONS = new Set<AuditAction>([
  'SHOP_ITEM_CREATED', 'SHOP_ITEM_PUBLISHED', 'SHOP_ITEM_ARCHIVED', 'SHOP_ITEM_DELETED',
  'MISSION_TEMPLATE_CREATED', 'MISSION_TEMPLATE_ENABLED', 'MISSION_TEMPLATE_DISABLED',
  'BADGE_ENABLED', 'BADGE_DISABLED',
  'COLLECTION_CREATED', 'COLLECTION_DELETED', 'TOPIC_CREATED',
]);

/** Which strip question an entry answers. The backend applies the same rules to `kind=` (admin_audit_log_backend.md §5.3). */
export function hasKind(e: AuditEntry, kind: AuditKind): boolean {
  if (kind === 'PRICE_REWARD') return !/_(CREATED|DELETED)$/.test(e.action) && e.changes.some((c) => ECONOMY_FIELDS.has(c.field));
  if (kind === 'LIFECYCLE') return LIFECYCLE_ACTIONS.has(e.action);
  if (kind === 'LEARNER_ACCOUNT') return e.area === 'LEARNERS';
  return e.guardrail !== null;
}

/** null actor = written by the system (seed, migration), not by an admin. */
export const actorLabel = (actor: AuditEntry['actor']) => actor?.email ?? 'Hệ thống';

/** Same columns as the backend's search_text (admin_audit_log_backend.md §5.4): no labels, the server has none. */
export function matchesAuditQuery(e: AuditEntry, q: string): boolean {
  const needle = foldVi(q.trim());
  if (!needle) return true;
  return [e.target.name, e.target.code ?? '', e.target.id, e.actor?.email ?? '', e.reason ?? ''].some((s) => foldVi(s).includes(needle));
}

/* ── Links ─────────────────────────────────────────────────────────────────── */

/** The object on its own screen; null when no screen shows it. */
export function targetPath(t: AuditTarget): string | null {
  switch (t.type) {
    case 'SHOP_ITEM': return `/shop/${t.id}`;
    case 'MISSION_TEMPLATE': return `/missions/${t.id}`;
    case 'BADGE': return `/badges/${t.id}`;
    case 'WORD': return `/dictionary/${encodeURIComponent(t.id)}`;
    case 'COLLECTION': return `/topics/${t.id}`;
    case 'TOPIC': return `/topics/${[...(t.parents ?? []), t.id].join('/')}`;
    case 'LEARNER': return `/learners/${t.id}`;
    case 'SCAN_LABEL': return '/ai-scan';
    default: return null;
  }
}

const SEGMENT: Record<AuditTargetType, string> = {
  SHOP_ITEM: 'vat-pham', MISSION_TEMPLATE: 'nhiem-vu', BADGE: 'huy-hieu', WORD: 'tu', COLLECTION: 'collection', TOPIC: 'chu-de',
  SCAN_LABEL: 'nhan-scan', LEARNER: 'nguoi-hoc', NOTIFICATION: 'thong-bao',
};

/** One object's history: /activity-log/vat-pham/11 (editors' "Vòng đời" panels link here). */
export const historyPath = (t: { type: AuditTargetType; id: string }) => `/activity-log/${SEGMENT[t.type]}/${encodeURIComponent(t.id)}`;

export function parseHistoryPath(rest: string[]): { type: AuditTargetType; id: string } | null {
  const type = (Object.keys(SEGMENT) as AuditTargetType[]).find((k) => SEGMENT[k] === rest[0]);
  return type && rest[1] ? { type, id: decodeURIComponent(rest[1]) } : null;
}

/* ── Values ────────────────────────────────────────────────────────────────── */

const num = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v));
const unit = (u: string) => (v: unknown) => `${num(v)} ${u}`;
/** "public/shop/17c12dc8-5ac5-….webp" → "17c12dc8….webp": enough to tell two uploads apart. */
const asset = (v: unknown) => String(v).replace(/^.*\//, '').replace(/^([0-9a-f]{8})[^.]*/, '$1…');

const TRIGGER_LABEL: Record<string, string> = {
  QUIZ_COMPLETED: 'Hoàn thành quiz', LEARNING_ACTIVITY_RECORDED: 'Có hoạt động học', TOPIC_ITEM_CREATED: 'Thêm từ mới',
  SHOP_ITEM_PURCHASED: 'Mua vật phẩm', BOOSTER_USED: 'Kích hoạt booster', SRS_REVIEW_COMPLETED: 'Học hoặc ôn thẻ',
  SCAN_WORD_SAVED: 'Lưu từ từ ảnh quét',
};
const label = (map: Record<string, string>) => (v: unknown) => map[String(v)] ?? String(v);

/** Every field key the backend writes (admin_audit_log_backend.md §4.4); unknown keys fall back to the raw key. */
const FIELDS: Record<string, { label: string; format?: (v: unknown) => string }> = {
  // Cửa hàng (ShopItemForm)
  code: { label: 'Mã' },
  type: { label: 'Loại', format: (v) => formatShopItemTypeLabel(String(v)) },
  name: { label: 'Tên' },
  description: { label: 'Mô tả' },
  // Shop stores an upload key; a badge stores the emblem name the app draws.
  iconKey: { label: 'Ảnh biểu tượng', format: (v) => EMBLEM_LABELS[String(v)] ?? asset(v) },
  purchasable: { label: 'Bán trong Cửa hàng' },
  price: { label: 'Giá', format: unit('Coin') },
  availableFrom: { label: 'Mở bán từ', format: (v) => formatVnDateTime(String(v)) },
  availableUntil: { label: 'Bán đến', format: (v) => formatVnDateTime(String(v)) },
  sortOrder: { label: 'Thứ tự trên kệ' },
  themeKey: { label: 'Giao diện', format: (v) => formatThemeKeyLabel(String(v)) },
  frameAssetKey: { label: 'Ảnh khung', format: asset },
  boostDurationMinutes: { label: 'Thời lượng', format: unit('phút') },
  maxQuantity: { label: 'Giữ tối đa' },
  status: { label: 'Trạng thái', format: (v) => formatShopItemStatusLabel(String(v)) },
  // Nhiệm vụ (AdminMissionTemplateService.Form)
  category: { label: 'Nhóm', format: label(categoryLabels) },
  triggerEvent: { label: 'Sự kiện tính', format: label(TRIGGER_LABEL) },
  minQuizAccuracyPercent: { label: 'Độ chính xác tối thiểu', format: (v) => `${num(v)}%` },
  quizRequestedCount: { label: 'Số câu mỗi quiz' },
  targetValue: { label: 'Mục tiêu' },
  rewardCoin: { label: 'Thưởng Coin', format: unit('Coin') },
  rewardXp: { label: 'Thưởng XP', format: unit('XP') },
  rewardItemCode: { label: 'Vật phẩm thưởng' },
  rewardItemFallbackCoin: { label: 'Coin dự phòng', format: unit('Coin') },
  weight: { label: 'Trọng số' },
  eligibilityRule: { label: 'Điều kiện cấp', format: label(eligibilityLabels) },
  isActive: { label: 'Trạng thái', format: (v) => (v ? 'Đang bật' : 'Đang tắt') },
  // Chủ đề, collection
  translation: { label: 'Bản dịch' },
  topicCount: { label: 'Số chủ đề' },
  itemCount: { label: 'Số mục từ' },
  item: { label: 'Mục từ' },
  template: { label: 'Mẫu thẻ' },
  schema: { label: 'Schema' },
  // Từ điển, AI Scan
  ipa: { label: 'Phát âm (IPA)' },
  definitionVi: { label: 'Định nghĩa tiếng Việt' },
  word: { label: 'Từ trong từ điển' },
  // Người học
  accountStatus: { label: 'Tài khoản', format: (v) => STATUS_META[v as LearnerStatus]?.label ?? String(v) },
  sentTo: { label: 'Gửi tới' },
  // Thông báo (SystemNotificationRequest, SystemNotificationResultDTO)
  title: { label: 'Tiêu đề' },
  content: { label: 'Nội dung' },
  route: { label: 'Mở màn' },
  recipientCount: { label: 'Người nhận', format: unit('người học') },
};

export const fieldLabel = (field: string) => FIELDS[field]?.label ?? field;

export function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '—';
  if (Array.isArray(v)) return v.map((x) => formatValue(field, x)).join(', ');
  if (typeof v === 'boolean' && field !== 'isActive') return v ? 'Có' : 'Không';
  const format = FIELDS[field]?.format;
  return format ? format(v) : num(v);
}

export interface ChangeLine { field: string; label: string; before: string | null; after: string }

const ASSET_FIELDS = new Set(['iconKey', 'frameAssetKey']);
const empty = (v: unknown) => v === null || v === undefined;

/**
 * Changes as text, in write order. `before` is null when the field had no value (creation): the row then reads
 * "Giá: 350 Coin" instead of "Giá: — → 350 Coin". Names are left out of creations (the object column shows them).
 * Uploads say what happened; the file ids stay in the drawer.
 */
export function changeLines(e: AuditEntry): ChangeLine[] {
  const created = e.action.endsWith('_CREATED');
  return e.changes
    .filter((c) => !(created && c.field === 'name'))
    .map((c) => ({
      field: c.field,
      label: fieldLabel(c.field),
      ...(ASSET_FIELDS.has(c.field)
        ? { before: null, after: empty(c.after) ? 'Gỡ ảnh' : empty(c.before) ? 'Tải ảnh lên' : 'Thay ảnh khác' }
        : { before: empty(c.before) ? null : formatValue(c.field, c.before), after: formatValue(c.field, c.after) }),
    }));
}

export const changesText = (e: AuditEntry) =>
  changeLines(e).map((c) => `${c.label}: ${c.before === null ? '' : `${c.before} → `}${c.after}`).join('; ');

/* ── Days (UTC+7) ──────────────────────────────────────────────────────────── */

const VN_OFFSET = 7 * 3_600_000;
const DAY = 86_400_000;
const shifted = (t: string | Date) => new Date(new Date(t).getTime() + VN_OFFSET).toISOString();

/** 'YYYY-MM-DD' of an instant in UTC+7. */
export const vnDay = (t: string | Date) => shifted(t).slice(0, 10);
export const vnTime = (t: string) => shifted(t).slice(11, 16);
/** "06/10/2026 14:33:58" in UTC+7. */
export const vnDateTimeSeconds = (t: string) => `${formatVnDateTime(t)}:${shifted(t).slice(17, 19)}`;
export const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** The `days` calendar days ending today (UTC+7), oldest first. */
export const periodDays = (days: number, now: Date) =>
  Array.from({ length: days }, (_, i) => vnDay(new Date(now.getTime() - (days - 1 - i) * DAY)));

const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function dayHeading(day: string, now: Date): string {
  const date = `${shortDay(day)}/${day.slice(0, 4)}`;
  if (day === vnDay(now)) return `Hôm nay, ${date}`;
  if (day === vnDay(new Date(now.getTime() - DAY))) return `Hôm qua, ${date}`;
  return `${WEEKDAY[new Date(`${day}T00:00:00Z`).getUTCDay()]}, ${date}`;
}

/** Consecutive entries of one day, order kept (the API returns newest first). */
export function groupByDay(entries: AuditEntry[]): { day: string; entries: AuditEntry[] }[] {
  const groups: { day: string; entries: AuditEntry[] }[] = [];
  for (const e of entries) {
    const day = vnDay(e.at);
    if (groups.at(-1)?.day === day) groups.at(-1)!.entries.push(e);
    else groups.push({ day, entries: [e] });
  }
  return groups;
}

/* ── Export ────────────────────────────────────────────────────────────────── */

/** The CSV both the fixture and the backend export produce (activity_log_ui.md §6). */
export function auditCsvRows(entries: AuditEntry[]): (string | number)[][] {
  return [
    ['Thời điểm (giờ Việt Nam)', 'Người làm', 'Khu vực', 'Hành động', 'Loại đối tượng', 'Đối tượng', 'Mã', 'ID', 'Thay đổi', 'Lý do', 'Vượt mức gợi ý', 'Phiên bản', 'Mã hành động'],
    ...entries.map((e) => [
      vnDateTimeSeconds(e.at), actorLabel(e.actor), AREA_LABEL[e.area], ACTION_LABEL[e.action], TARGET_LABEL[e.target.type],
      e.target.name, e.target.code ?? '', e.target.id, changesText(e), e.reason ?? '', e.guardrail ?? '', e.version ?? '', e.action,
    ]),
  ];
}
