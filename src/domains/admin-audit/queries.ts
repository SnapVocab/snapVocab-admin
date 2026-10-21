import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAuditLog } from './api';
import type { AuditLogParams, AuditTargetType } from './types';

export const auditKeys = { list: (p: AuditLogParams) => ['adminAudit', 'list', p] as const };

/** Server-paged; the previous page stays on screen while the next one loads. */
export const useAuditLog = (p: AuditLogParams) =>
  useQuery({ queryKey: auditKeys.list(p), queryFn: () => getAuditLog(p), placeholderData: keepPreviousData });

/** Latest writes of one object (the drawer's history); no placeholder, another object's history would mislead. */
export function useTargetHistory(target: { type: AuditTargetType; id: string }) {
  const p: AuditLogParams = { days: 90, target: { type: target.type, id: target.id }, size: 5 };
  return useQuery({ queryKey: auditKeys.list(p), queryFn: () => getAuditLog(p) });
}
