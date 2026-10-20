import React, { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Badge, Button, PageHeader, toolbarControl } from '../../components/ui';
import { conditionLabel, filterGroups, formatCount, groupCatalog, statusReason } from '../../domains/admin-badges/catalog';
import type { AdminBadge, StatusFilter } from '../../domains/admin-badges/types';
import { BadgeArtifact } from './BadgeArtifact';

/** Catalog stays mounted while detail is open, preserving search and status filters. */
export function BadgeCatalog({ all, onOpen, onRefresh, refreshing = false }: {
  all: AdminBadge[];
  onOpen: (id: number, opener: HTMLElement) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const groups = useMemo(() => groupCatalog(all), [all]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const visible = filterGroups(groups, query, status);
  const showEarners = all.some(b => b.earnerCount !== null);
  const columns = showEarners ? 6 : 5;
  const filtered = query.trim() !== '' || status !== 'ALL';

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <PageHeader title="Huy hiệu" description="Người học nhận huy hiệu khi đạt cột mốc học tập, ghi nhận lúc ứng dụng đồng bộ; mỗi người nhận một lần và không bị thu hồi." />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input type="search" aria-label="Tìm huy hiệu theo tên hoặc mã" className={`${toolbarControl} w-full pl-9 sm:w-64`}
              placeholder="Tìm tên hoặc mã…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <select aria-label="Lọc trạng thái" className={`${toolbarControl} cursor-pointer`} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ON">Đang bật</option>
            <option value="OFF">Đang tắt</option>
          </select>
          <span className="text-xs tabular-nums text-text-muted">{all.length} huy hiệu, {all.filter(b => b.isActive).length} đang bật, {groups.length} chuỗi</span>
          <Button size="sm" className="ml-auto" disabled={refreshing} onClick={onRefresh}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />Làm mới
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          {all.length === 0 ? (
            <p className="p-12 text-center text-sm text-text-muted">Chưa có huy hiệu nào. Chọn Làm mới để kiểm tra lại.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle/60 text-text-muted">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">Huy hiệu</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">Điều kiện</th>
                  <th scope="col" className="hidden whitespace-nowrap px-4 py-2 font-medium xl:table-cell">Mô tả hiển thị</th>
                  {showEarners && <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-right font-medium xl:table-cell">Đã đạt</th>}
                  <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">Trạng thái</th>
                  <th scope="col" className="px-4 py-2"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              {visible.map(g => (
                <tbody key={g.metric} className="border-t border-border">
                  <tr className="bg-surface-subtle/40">
                    <th scope="rowgroup" colSpan={columns} className="px-4 py-2 text-left font-normal">
                      <span className="text-body font-semibold text-text">{g.info?.title ?? 'Chỉ số chưa hỗ trợ'}</span>
                      <span className="ml-2 text-xs text-text-muted">{g.total} mốc, {g.activeCount} đang bật</span>
                      <span className="ml-2 font-mono text-2xs text-text-light">{g.metric}</span>
                      <p className="mt-0.5 text-xs text-text-muted">{g.info?.rule ?? 'Admin chưa có tên chuỗi, đơn vị và cách đếm cho chỉ số này; chỉ xem.'}</p>
                    </th>
                  </tr>
                  {g.items.map(b => {
                    const reason = statusReason(b);
                    return (
                      <tr key={b.id} className="border-t border-border hover:bg-surface-subtle/60">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <BadgeArtifact metric={b.metric} iconKey={b.iconKey} size={32} />
                            <div className="min-w-0">
                              <button type="button" className="text-left text-body font-medium text-text hover:underline" onClick={e => onOpen(b.id, e.currentTarget)}>{b.name}</button>
                              <p className="font-mono text-2xs text-text-light">{b.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-medium tabular-nums">{conditionLabel(b)}</td>
                        <td className="hidden max-w-xs px-4 py-2 text-text-muted xl:table-cell"><p className="truncate" title={b.description}>{b.description}</p></td>
                        {showEarners && <td className="hidden px-4 py-2 text-right tabular-nums xl:table-cell">{b.earnerCount === null ? '—' : formatCount(b.earnerCount)}</td>}
                        <td className="px-4 py-2">
                          {b.isActive ? <span className="text-text-muted">Đang bật</span> : <Badge tone="neutral">Đang tắt</Badge>}
                          {reason && <p className="mt-1 text-xs text-text-muted">{reason}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right"><Button size="sm" onClick={e => onOpen(b.id, e.currentTarget)} label={`Xem huy hiệu ${b.name}`}>Xem</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          )}
          {all.length > 0 && visible.length === 0 && (
            <div className="space-y-3 p-12 text-center text-sm text-text-muted">
              <p>{query.trim() ? `Không có huy hiệu khớp “${query.trim()}”.` : 'Không có huy hiệu ở trạng thái này.'}</p>
              {filtered && <Button size="sm" onClick={() => { setQuery(''); setStatus('ALL'); }}>Xóa bộ lọc</Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
