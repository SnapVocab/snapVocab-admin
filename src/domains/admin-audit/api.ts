import { apiClient } from '../../lib/api-client';
import { toCsv } from '../../lib/utils';
import { auditUsesFixtures } from './config';
import { fixtureAuditCsv, fixtureAuditLog } from './fixtures';
import { auditCsvRows } from './mappers';
import type { AuditEntry, AuditLogParams, AuditLogResponse } from './types';

export { auditUsesFixtures };

const base = '/api/admin/audit-log';
const query = (p: AuditLogParams) => ({
  days: p.days, day: p.day, q: p.q?.trim(), page: p.page, size: p.size,
  area: p.area === 'ALL' ? null : p.area,
  actor: p.actor === 'ALL' ? null : p.actor,
  kind: p.kind === 'ALL' ? null : p.kind,
  targetType: p.target?.type, targetId: p.target?.id,
});

export const getAuditLog = (p: AuditLogParams): Promise<AuditLogResponse> =>
  auditUsesFixtures ? fixtureAuditLog(p) : apiClient<AuditLogResponse>(base, { params: query(p) });

/**
 * Every page of the current filters as CSV, built here so the Vietnamese labels live in one place (mappers.ts).
 * A write landing mid-export pushes rows down a page, never skips one; duplicates are dropped by id.
 * ponytail: client-side paging, fine for a 90-day admin log (thousands of rows); a server stream if it outgrows that.
 */
export async function exportAuditLog(p: AuditLogParams): Promise<string> {
  if (auditUsesFixtures) return fixtureAuditCsv(p);
  const rows = new Map<number, AuditEntry>();
  for (let page = 0; ; page++) {
    const res = await getAuditLog({ ...p, page, size: 100 });
    res.data.forEach((e) => rows.set(e.id, e));
    if (page + 1 >= res.meta.pages) break;
  }
  return toCsv(auditCsvRows([...rows.values()]));
}
