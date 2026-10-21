import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Drawer, SectionLabel, TextLink } from '../../components/ui';
import {
  ACTION_LABEL, actorLabel, AREA_LABEL, changeLines, fieldLabel, formatValue, historyPath, TARGET_LABEL, targetPath, vnDateTimeSeconds,
} from '../../domains/admin-audit/mappers';
import { useTargetHistory } from '../../domains/admin-audit/queries';
import type { AuditEntry } from '../../domains/admin-audit/types';
import { formatVnDateTime } from '../../domains/shop/mappers';
import { cn } from '../../lib/utils';

/**
 * One write in full: every changed field (before → after), why, the object with a link to it, and the object's recent
 * history from the same log. Newer/older walk the table without closing.
 */
export function EntryDrawer({ entry, onClose, onOpen, newer, older }: {
  entry: AuditEntry;
  onClose: () => void;
  onOpen: (e: AuditEntry) => void;
  newer?: AuditEntry;
  older?: AuditEntry;
}) {
  const history = useTargetHistory(entry.target);
  const t = entry.target;
  const noun = TARGET_LABEL[t.type].toLowerCase();
  const deleted = entry.action.endsWith('_DELETED');
  const link = deleted ? null : targetPath(t);

  return (
    <Drawer
      title={`${ACTION_LABEL[entry.action]}: ${t.name}`}
      subtitle={`${vnDateTimeSeconds(entry.at)}, ${actorLabel(entry.actor)}`}
      onClose={onClose}
      footer={<>
        <Button size="sm" icon={<ChevronUp />} disabled={!newer} onClick={() => newer && onOpen(newer)}>Mới hơn</Button>
        <Button size="sm" icon={<ChevronDown />} disabled={!older} onClick={() => older && onOpen(older)}>Cũ hơn</Button>
      </>}
    >
      {entry.guardrail && (
        <p role="note" className="flex gap-2 rounded-lg border border-warning/40 bg-warning-light px-3 py-2 text-xs text-warning-dark">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span><strong className="font-semibold">Lưu khi vượt mức gợi ý.</strong> {entry.guardrail}</span>
        </p>
      )}

      <section className="space-y-2">
        <SectionLabel>Thay đổi</SectionLabel>
        {entry.changes.length ? (
          <table className="w-full table-fixed text-left text-xs">
            <thead className="text-text-muted">
              <tr><th className="w-[28%] py-1.5 pr-3 font-medium">Trường</th><th className="py-1.5 pr-3 font-medium">Trước</th><th className="py-1.5 font-medium">Sau</th></tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {entry.changes.map((c) => (
                <tr key={c.field} className="align-top">
                  <td className="py-2 pr-3 text-text-muted">{fieldLabel(c.field)}</td>
                  <td className="break-words py-2 pr-3 text-text-muted">{formatValue(c.field, c.before)}</td>
                  <td className="break-words py-2 font-medium text-text">{formatValue(c.field, c.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-text-muted">Thao tác không đổi trường dữ liệu nào.</p>}
      </section>

      {entry.reason && (
        <section className="space-y-2">
          <SectionLabel>Lý do</SectionLabel>
          <p className="text-body text-text">{entry.reason}</p>
        </section>
      )}

      <section className="space-y-2">
        <SectionLabel>Đối tượng</SectionLabel>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-text-muted">Khu vực</dt><dd>{AREA_LABEL[entry.area]}</dd>
          <dt className="text-text-muted">Loại</dt><dd>{TARGET_LABEL[t.type]}</dd>
          <dt className="text-text-muted">Tên</dt><dd className="break-words">{t.name}</dd>
          {t.code && <><dt className="text-text-muted">Mã</dt><dd className="font-mono text-2xs">{t.code}</dd></>}
          <dt className="text-text-muted">ID</dt><dd className="tabular-nums">{t.id}</dd>
          {entry.version !== null && <><dt className="text-text-muted">Phiên bản</dt><dd className="tabular-nums">{entry.version} sau thao tác này</dd></>}
        </dl>
        {link && <TextLink to={link}>Mở {noun}</TextLink>}
        {deleted && <p className="text-xs text-text-muted">Đối tượng đã bị xóa.</p>}
      </section>

      <section className="space-y-2">
        <SectionLabel>{`Lịch sử của ${noun} này`}</SectionLabel>
        {history.data ? (
          <>
            <ol className="space-y-0.5">
              {history.data.data.map((h) => {
                const first = changeLines(h)[0];
                const current = h.id === entry.id;
                return (
                  <li key={h.id}>
                    <button type="button" disabled={current} aria-current={current || undefined} onClick={() => onOpen(h)} title={actorLabel(h.actor)}
                      className={cn('flex w-full items-baseline gap-3 rounded px-2 py-1.5 text-left text-xs', current ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/60')}>
                      <span className="shrink-0 whitespace-nowrap tabular-nums text-text-muted">{formatVnDateTime(h.at)}</span>
                      <span className="shrink-0 font-medium text-text">{ACTION_LABEL[h.action]}</span>
                      <span className="min-w-0 flex-1 truncate text-text-muted">{first ? `${first.label}: ${first.before === null ? '' : `${first.before} → `}${first.after}` : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {history.data.meta.total > history.data.data.length && <TextLink to={historyPath(t)}>Xem cả {history.data.meta.total} thay đổi trong 90 ngày</TextLink>}
          </>
        ) : history.isError
          ? <p className="text-xs text-text-muted">Không tải được lịch sử của {noun} này.</p>
          : <div role="status" aria-label="Đang tải" className="h-16 animate-pulse rounded bg-surface-subtle" />}
      </section>

      <details className="text-xs text-text-muted">
        <summary className="cursor-pointer select-none hover:text-text">Mã kỹ thuật</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-2xs">
          <dt>Bản ghi</dt><dd>{entry.id}</dd>
          <dt>Hành động</dt><dd>{entry.action}</dd>
          <dt>Đối tượng</dt><dd>{t.type} {t.id}</dd>
        </dl>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface-subtle p-2 font-mono text-2xs text-text">{JSON.stringify(entry.changes, null, 2)}</pre>
      </details>
    </Drawer>
  );
}
