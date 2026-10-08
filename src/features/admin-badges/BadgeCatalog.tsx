import React, { useMemo, useState } from 'react';
import { Award, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../components/ui';
import { ActiveBadge } from '../admin-missions/components';
import { conditionLabel, filterGroups, formatCount, groupCatalog, statusReason } from '../../domains/admin-badges/catalog';
import type { AdminBadge, StatusFilter } from '../../domains/admin-badges/types';
import { BadgeArtifact } from './BadgeArtifact';

const inputClass = 'rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

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
        <header>
          <p className="mb-1 text-xs text-text-muted">Huy hiệu</p>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><Award size={20} className="text-primary" />Huy hiệu</h1>
          <p className="mt-1 max-w-3xl text-xs text-text-muted">Người học nhận huy hiệu khi đạt cột mốc học tập. Huy hiệu được ghi nhận khi ứng dụng đồng bộ, mỗi người nhận một lần và không bị thu hồi. Thứ tự theo cùng quy tắc với app, tính trên toàn bộ huy hiệu.</p>
          <p className="mt-1 text-xs tabular-nums text-text-muted">
            <strong className="text-text">{all.length}</strong> huy hiệu · <strong className="text-text">{all.filter(b => b.isActive).length}</strong> đang bật · <strong className="text-text">{groups.length}</strong> chuỗi
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input type="search" aria-label="Tìm huy hiệu theo tên hoặc mã" className={`${inputClass} w-full pl-9 sm:w-64`}
              placeholder="Tìm tên hoặc mã…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <select aria-label="Lọc trạng thái" className={inputClass} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ON">Đang bật</option>
            <option value="OFF">Đang tắt</option>
          </select>
          <Button size="sm" className="ml-auto" disabled={refreshing} onClick={onRefresh}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />Làm mới
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          {all.length === 0 ? (
            <p className="p-12 text-center text-sm text-text-muted">Chưa có huy hiệu nào. Chọn Làm mới để kiểm tra lại.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-text-muted">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">Huy hiệu</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">Điều kiện</th>
                  <th scope="col" className="hidden whitespace-nowrap px-4 py-3 font-semibold xl:table-cell">Mô tả hiển thị</th>
                  {showEarners && <th scope="col" className="hidden whitespace-nowrap px-4 py-3 text-right font-semibold xl:table-cell">Đã đạt</th>}
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              {visible.map(g => (
                <tbody key={g.metric} className="border-t border-border">
                  <tr className="bg-surface-subtle/50">
                    <th scope="rowgroup" colSpan={columns} className="px-4 py-2.5 text-left font-normal">
                      <span className="text-[13px] font-bold text-text">{g.info?.title ?? 'Chỉ số chưa hỗ trợ'}</span>
                      <span className="ml-2 font-mono text-[11px] text-text-muted">{g.metric}</span>
                      <span className="ml-2 text-[11px] text-text-muted">{g.total} mốc · {g.activeCount} đang bật</span>
                      <p className="mt-0.5 text-[11px] text-text-muted">{g.info?.rule ?? 'Admin chưa có tên chuỗi, đơn vị và cách đếm cho chỉ số này; chỉ xem.'}</p>
                    </th>
                  </tr>
                  {g.items.map(b => {
                    const reason = statusReason(b);
                    return (
                      <tr key={b.id} className="border-t border-border hover:bg-surface-subtle/60">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <BadgeArtifact metric={b.metric} iconKey={b.iconKey} size={32} />
                            <div className="min-w-0">
                              <button type="button" className="text-left text-[13px] font-bold hover:text-primary-hover" onClick={e => onOpen(b.id, e.currentTarget)}>{b.name}</button>
                              <p className="font-mono text-[11px] text-text-muted">{b.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold tabular-nums">{conditionLabel(b)}</td>
                        <td className="hidden max-w-xs px-4 py-2.5 text-text-muted xl:table-cell"><p className="truncate" title={b.description}>{b.description}</p></td>
                        {showEarners && <td className="hidden px-4 py-2.5 text-right tabular-nums xl:table-cell">{b.earnerCount === null ? '—' : formatCount(b.earnerCount)}</td>}
                        <td className="px-4 py-2.5">
                          <ActiveBadge active={b.isActive} />
                          {reason && <p className="mt-1 text-[11px] text-text-muted">{reason}</p>}
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
