import React from 'react';
import { TextLink } from '../../components/ui';
import { ACTION_LABEL, actorLabel, changeLines, historyPath } from '../../domains/admin-audit/mappers';
import { useTargetHistory } from '../../domains/admin-audit/queries';
import type { AuditTargetType } from '../../domains/admin-audit/types';
import { formatVnDateTime } from '../../domains/shop/mappers';

/**
 * The object's 5 latest writes from the activity log (90 days), for the editors' "Vòng đời" panel (FE-AUD-03).
 * Who changed what lives here; the panel above keeps the object's own timestamps.
 */
export function TargetHistory({ target }: { target: { type: AuditTargetType; id: string } }) {
  const history = useTargetHistory(target);
  const rows = history.data?.data ?? [];
  return (
    <div className="space-y-1.5 border-t border-border pt-2.5 text-xs">
      <p className="font-semibold text-text">Nhật ký gần đây</p>
      {history.data ? (rows.length ? (
        <ol className="space-y-1.5">
          {rows.map((h) => {
            const first = changeLines(h)[0];
            return (
              <li key={h.id} className="leading-snug">
                <span className="tabular-nums text-text-muted">{formatVnDateTime(h.at)}</span>{' · '}
                <span className="font-medium text-text">{ACTION_LABEL[h.action]}</span>{' · '}
                <span className="text-text-muted">{actorLabel(h.actor)}</span>
                {first && <span className="block truncate text-text-muted" title={h.reason ?? undefined}>
                  {first.label}: {first.before === null ? '' : `${first.before} → `}{first.after}
                </span>}
              </li>
            );
          })}
        </ol>
      ) : <p className="text-text-muted">Chưa có thay đổi nào trong 90 ngày.</p>)
        : history.isError ? <p className="text-text-muted">Không tải được nhật ký.</p>
          : <div role="status" aria-label="Đang tải nhật ký" className="h-10 animate-pulse rounded bg-surface-subtle" />}
      {rows.length > 0 && <TextLink to={historyPath(target)}>
        {history.data!.meta.total > rows.length ? `Xem cả ${history.data!.meta.total} thay đổi` : 'Xem cả lịch sử'}
      </TextLink>}
    </div>
  );
}
