import type { AdminLearnerRow, LearnerActivity, LearnerStatus } from './types';
import { foldVi } from '../../lib/utils';

const DAY = 86_400_000;

/** Which activity bucket a learner falls into (null = never studied). */
export function activityOf(lastStudiedAt: string | null, now: Date = new Date()): Exclude<LearnerActivity, 'ALL'> | 'IDLE' {
  if (!lastStudiedAt) return 'NEVER';
  const days = (now.getTime() - new Date(lastStudiedAt).getTime()) / DAY;
  if (days <= 7) return 'ACTIVE_7D';
  if (days > 30) return 'DORMANT_30D';
  return 'IDLE';
}

/** "Vừa xong", "5 phút trước", "3 giờ trước", "Hôm qua", "6 ngày trước"; older than 30 days → dd/mm/yyyy. */
export function formatAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Chưa học';
  const ms = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(ms / DAY);
  if (d === 1) return 'Hôm qua';
  if (d <= 30) return `${d} ngày trước`;
  return formatDate(iso);
}

/** "18/10/2026" in UTC+7 (Asia/Ho_Chi_Minh has no DST). */
export function formatDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export { foldVi };

export function matchesQuery(row: Pick<AdminLearnerRow, 'displayName' | 'email'>, q: string): boolean {
  const needle = foldVi(q.trim());
  return !needle || foldVi(row.displayName).includes(needle) || row.email.toLowerCase().includes(needle);
}

export const STATUS_META: Record<LearnerStatus, { label: string; tone: 'success' | 'neutral' | 'danger' }> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  PENDING: { label: 'Chờ kích hoạt', tone: 'neutral' },
  BANNED: { label: 'Đã khóa', tone: 'danger' },
};

export const BAN_REASON_MIN = 10;
export const BAN_REASON_MAX = 500;
/** A ban must say why (it lands in the audit log and the learner's support history). Null when valid. */
export function banReasonError(reason: string): string | null {
  const n = reason.trim().length;
  if (n < BAN_REASON_MIN) return `Nhập lý do ít nhất ${BAN_REASON_MIN} ký tự (hiện ${n}).`;
  if (n > BAN_REASON_MAX) return `Tối đa ${BAN_REASON_MAX} ký tự.`;
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[parts.length - 2][0] : '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?';
}
