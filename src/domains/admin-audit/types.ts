/**
 * Proposed admin audit contract (design.md §8, PD-ADS-10; admin_product_review_2026-10-19 §3.14).
 * Backend implementation spec: docs/sa/admin_audit_log_backend.md (enum values here must match it exactly).
 * Implemented by the backend (module vn.ptit.snapvocab.audit); fixtures only with VITE_ADMIN_AUDIT_FIXTURES=true (config.ts).
 *
 *   GET /api/admin/audit-log?days=&day=&area=&actor=&kind=&targetType=&targetId=&q=&page=&size=  → AuditLogResponse
 * CSV export is built by the client from these pages (api.ts), so there is no export endpoint.
 *
 * One row per admin write, inserted in the same transaction as the write (a failed audit fails the write).
 * Rows are never edited or deleted; newest first.
 */

/** Where the write happened; one value per admin screen that writes. */
export type AuditArea = 'SHOP' | 'MISSIONS' | 'BADGES' | 'DICTIONARY' | 'TOPICS' | 'AI_SCAN' | 'LEARNERS' | 'NOTIFICATIONS';

export type AuditAction =
  | 'SHOP_ITEM_CREATED' | 'SHOP_ITEM_UPDATED' | 'SHOP_ITEM_PUBLISHED' | 'SHOP_ITEM_ARCHIVED' | 'SHOP_ITEM_DELETED'
  | 'MISSION_TEMPLATE_CREATED' | 'MISSION_TEMPLATE_UPDATED' | 'MISSION_TEMPLATE_ENABLED' | 'MISSION_TEMPLATE_DISABLED'
  | 'BADGE_UPDATED' | 'BADGE_ENABLED' | 'BADGE_DISABLED'
  | 'WORD_UPDATED'
  | 'COLLECTION_CREATED' | 'COLLECTION_UPDATED' | 'COLLECTION_DELETED'
  | 'TOPIC_CREATED' | 'TOPIC_ITEM_ADDED' | 'TOPIC_TEMPLATE_CHANGED' | 'TOPIC_SCHEMA_CHANGED'
  | 'SCAN_LABEL_MAPPED'
  | 'LEARNER_BANNED' | 'LEARNER_UNBANNED' | 'LEARNER_PASSWORD_RESET_SENT'
  | 'SYSTEM_NOTIFICATION_SENT';

export type AuditTargetType = 'SHOP_ITEM' | 'MISSION_TEMPLATE' | 'BADGE' | 'WORD' | 'COLLECTION' | 'TOPIC' | 'SCAN_LABEL' | 'LEARNER' | 'NOTIFICATION';

export interface AuditTarget {
  type: AuditTargetType;
  /** Id in its own table; a dictionary word and a scan label are their own text. */
  id: string;
  /** Name at the time of the write. */
  name: string;
  /** Business code (shop item, mission template). */
  code: string | null;
  /** Topic ancestry for the link: [collectionId] or [collectionId, rootTopicId]. */
  parents?: number[];
}

/** One changed field. Values are stored as written (numbers, ISO instants, booleans, enum codes); the UI formats them. */
export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AuditEntry {
  id: number;
  at: string;
  /** The admin who wrote it; null = the system (seed, migration). */
  actor: { id: number; email: string } | null;
  area: AuditArea;
  action: AuditAction;
  target: AuditTarget;
  changes: AuditChange[];
  /** Mandatory for the sensitive writes of design.md §8.3 (ban, permanent stop of sale, a save past a guardrail). */
  reason: string | null;
  /** The write went past a UI guardrail (design.md §7); the backend recomputes it at write time. */
  guardrail: string | null;
  /** Object version after the write (optimistic lock), when the object has one. */
  version: number | null;
}

/**
 * Write bodies may carry the admin's "why" (FE-AUD-01): required past a guardrail (the server answers
 * AUDIT_REASON_REQUIRED with { rule, guardrail }) and on archive; 10–500 characters.
 */
export interface AuditReasonInput {
  reason?: string;
}

/** Questions the summary strip answers; an entry can match several. */
export type AuditKind = 'PRICE_REWARD' | 'LIFECYCLE' | 'LEARNER_ACCOUNT' | 'GUARDRAIL';
export type AuditPeriod = 7 | 30 | 90;

export interface AuditLogParams {
  days?: AuditPeriod;
  /** One day of the period, 'YYYY-MM-DD' in UTC+7. */
  day?: string | null;
  area?: AuditArea | 'ALL';
  /** An admin id, or SYSTEM for writes without an admin. */
  actor?: number | 'SYSTEM' | 'ALL';
  kind?: AuditKind | 'ALL';
  target?: { type: AuditTargetType; id: string } | null;
  q?: string;
  page?: number;
  size?: number;
}

export interface AuditLogResponse {
  data: AuditEntry[];
  meta: { page: number; size: number; total: number; pages: number };
  /** Over the whole period (and the target, if any), ignoring the other filters: strip, chart and actor list. */
  summary: {
    total: number;
    byKind: Record<AuditKind, number>;
    /** Every day of the period in UTC+7, oldest first. */
    daily: { day: string; count: number }[];
    /** Areas with at least one write, most active first. */
    areas: { area: AuditArea; count: number }[];
    /** Most active first; actor null = the system. */
    actors: { actor: AuditEntry['actor']; count: number }[];
  };
}
