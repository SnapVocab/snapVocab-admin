import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { Badge, Bar, Button, PageHeader, Panel, SampleDataNotice, StripCell, StripNote, SummaryStrip, toolbarControl } from '../../components/ui';
import { appShelves, conditionLabel, filterGroups, formatCount, groupCatalog, matchesStatus, reviewIssues, statusReason } from '../../domains/admin-badges/catalog';
import { badgesEditable, badgesUseFixtures } from '../../domains/admin-badges/config';
import type { AdminBadge, StatusFilter } from '../../domains/admin-badges/types';
import { BadgeArtifact } from './BadgeArtifact';

const time = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/**
 * Huy hiệu (admin_badges_ui.md): strip = whole-catalog counts that filter the table; shelves = what a learner with no
 * badge sees on Thành tựu; table = one row group per series (metric), milestones by threshold, earners drawn as a
 * funnel. Stays mounted while the editor is open, so search and filter survive the round trip.
 */
export function BadgeCatalog({ all, updatedAt, onOpen, onToggle, onRefresh, refreshing = false }: {
  all: AdminBadge[];
  updatedAt?: number;
  onOpen: (id: number, opener: HTMLElement) => void;
  onToggle: (badge: AdminBadge) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const groups = useMemo(() => groupCatalog(all), [all]);
  const shelves = useMemo(() => appShelves(all), [all]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const visible = filterGroups(groups, query, status);
  const showEarners = all.some((b) => b.earnerCount !== null);
  const columns = showEarners ? 7 : 6;
  const filtered = query.trim() !== '' || status !== 'ALL';
  const count = (s: StatusFilter) => all.filter((b) => matchesStatus(b, s)).length;
  const pick = (s: StatusFilter) => setStatus(status === s ? 'ALL' : s);
  const off = all.filter((b) => !b.isActive);
  const clear = () => { setQuery(''); setStatus('ALL'); };

  return (
    <div className="space-y-4">
      <PageHeader title="Huy hiệu"
        description="Người học nhận huy hiệu khi đạt mốc, ghi nhận lúc ứng dụng đồng bộ; mỗi người nhận một lần, không bị thu hồi và không kèm Coin hay XP."
        actions={<>
          {updatedAt ? <span className="hidden text-xs tabular-nums text-text-muted sm:inline">Cập nhật {time(updatedAt)}</span> : null}
          <Button icon={<RefreshCw />} label="Làm mới" loading={refreshing} onClick={onRefresh} />
        </>} />
      {badgesUseFixtures && (
        <SampleDataNotice>
          Sửa nội dung, Bật/Tắt và ước tính cấp bù chờ <code className="font-mono">PATCH /api/admin/badges/{'{id}'}</code> và API ước tính; danh sách và chi tiết đã có API thật.
          Danh mục là 12 huy hiệu đang chạy cộng một mốc mẫu đang tắt (Hai Mươi Lăm Bài Quiz). Số người đạt đếm từ người học mẫu của màn Người học. Thay đổi mất khi tải lại trang.
        </SampleDataNotice>
      )}

      {all.length > 0 && (
        <SummaryStrip label="Tóm tắt huy hiệu">
          <StripCell value={all.length} label="Huy hiệu" active={status === 'ALL'} onClick={() => setStatus('ALL')} />
          <StripCell value={count('ON')} label="Đang bật" dot="bg-primary" active={status === 'ON'} onClick={() => pick('ON')} />
          <StripCell value={count('OFF')} label="Đang tắt" dot="bg-neutral-300" active={status === 'OFF'} onClick={() => pick('OFF')} />
          <StripCell value={count('ISSUES')} label="Cần rà" dot="bg-warning" active={status === 'ISSUES'} onClick={() => pick('ISSUES')} />
          {showEarners && (
            <StripNote title="Tổng số lần đã cấp; mỗi người nhận mỗi huy hiệu một lần">
              <span>Lượt đã cấp</span>
              <span className="text-sm font-semibold tabular-nums text-text">{formatCount(all.reduce((s, b) => s + (b.earnerCount ?? 0), 0))}</span>
            </StripNote>
          )}
          <StripNote push title="Màn Thành tựu của người học chưa đạt huy hiệu nào chỉ có huy hiệu đang bật">
            <span>Người học mới thấy</span>
            <span className="text-sm font-semibold text-text">{shelves.reduce((s, g) => s + g.items.length, 0)} huy hiệu, {shelves.length} kệ</span>
          </StripNote>
        </SummaryStrip>
      )}

      {shelves.length > 0 && (
        <Panel title="Bộ sưu tập trên ứng dụng" meta="người học chưa đạt mốc nào, đúng thứ tự kệ">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
            {shelves.map((g) => (
              <div key={g.metric} className="min-w-0">
                <p className="text-xs font-medium text-text">{g.info?.title ?? 'Thành tựu khác'}<span className="ml-1.5 font-normal text-text-muted">{g.items.length} mốc</span></p>
                <div className="mt-1.5 flex items-start gap-2 overflow-x-auto rounded-md bg-surface-subtle px-2 pb-2 pt-2.5">
                  {g.items.map((b) => (
                    <button key={b.id} type="button" onClick={(e) => onOpen(b.id, e.currentTarget)} title={`${b.name}: ${conditionLabel(b)}`}
                      className="grid w-[76px] shrink-0 justify-items-center gap-1 rounded-md pb-0.5 text-center hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
                      <BadgeArtifact metric={b.metric} iconKey={b.iconKey} state="locked" size={52} />
                      <span className="line-clamp-2 text-2xs text-text">{b.name}</span>
                      <span className="text-2xs tabular-nums text-text-muted">{conditionLabel(b)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {off.length > 0 && <p className="text-xs text-text-muted">Đang tắt nên người chưa đạt không thấy: {off.map((b) => b.name).join(', ')}.</p>}
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-3 text-text-muted" />
          <input type="search" aria-label="Tìm huy hiệu theo tên hoặc mã" className={`${toolbarControl} w-full pl-9`}
            placeholder="Tìm tên hoặc mã…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {filtered && <Button variant="ghost" icon={<X />} onClick={clear}>Xóa bộ lọc</Button>}
        <span className="text-xs tabular-nums text-text-muted">{groups.length} chuỗi, {all.length} mốc</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        {all.length === 0 ? (
          <p className="p-12 text-center text-sm text-text-muted">Chưa có huy hiệu nào. Chọn Làm mới để kiểm tra lại.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="whitespace-nowrap border-b border-border bg-surface-subtle/60 text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Huy hiệu</th>
                <th scope="col" className="px-3 py-2 font-medium">Điều kiện</th>
                <th scope="col" className="hidden px-3 py-2 font-medium xl:table-cell">Mô tả người học đọc</th>
                {showEarners && <th scope="col" className="px-3 py-2 text-right font-medium" title="Số người đã nhận; vạch so với mốc nhiều người đạt nhất của chuỗi">Đã đạt</th>}
                <th scope="col" className="hidden px-3 py-2 text-right font-medium xl:table-cell" title="Số nhỏ nhất của chuỗi quyết định vị trí kệ; còn là thứ tự phụ trên Hồ sơ">Thứ tự</th>
                <th scope="col" className="px-3 py-2 font-medium">Trạng thái</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            {visible.map((g) => {
              // Whole series, not the filtered rows: the funnel keeps its scale while searching.
              const top = Math.max(1, ...groups.find((x) => x.metric === g.metric)!.items.map((b) => b.earnerCount ?? 0));
              return (
                <tbody key={g.metric} className="divide-y divide-border border-t border-border first-of-type:border-t-0">
                  <tr className="bg-surface-subtle/40">
                    <th scope="rowgroup" colSpan={columns} className="px-4 py-2 text-left font-normal">
                      <span className="text-body font-semibold text-text">{g.info?.title ?? 'Chỉ số chưa hỗ trợ'}</span>
                      <span className="ml-2 text-xs text-text-muted">{g.total} mốc, {g.activeCount} đang bật</span>
                      <span className="ml-2 font-mono text-2xs text-text-light">{g.metric}</span>
                      <span className="mt-0.5 block text-xs text-text-muted">{g.info?.rule ?? 'Admin chưa có tên chuỗi, đơn vị và cách đếm cho chỉ số này; chỉ xem.'}</span>
                    </th>
                  </tr>
                  {g.items.map((b) => {
                    const reason = statusReason(b);
                    const issues = reviewIssues(b);
                    return (
                      <tr key={b.id} className="hover:bg-surface-subtle/60">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <BadgeArtifact metric={b.metric} iconKey={b.iconKey} size={36} />
                            <div className="min-w-0">
                              <button type="button" className="text-left text-body font-medium text-text hover:underline" onClick={(e) => onOpen(b.id, e.currentTarget)}>{b.name}</button>
                              <p className="font-mono text-2xs text-text-light">{b.code}</p>
                              {issues.map((t) => <p key={t} className="mt-0.5 text-xs text-warning-dark">{t}</p>)}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">{conditionLabel(b)}</td>
                        <td className="hidden max-w-xs px-3 py-2 text-text-muted xl:table-cell"><p className="line-clamp-2" title={b.description}>{b.description}</p></td>
                        {showEarners && (
                          <td className="w-32 px-3 py-2">
                            {b.earnerCount === null ? <span className="block text-right text-text-light">—</span> : <>
                              <span className="block text-right tabular-nums">{formatCount(b.earnerCount)}</span>
                              <span className="ml-auto mt-1 block w-24"><Bar value={b.earnerCount} max={top} /></span>
                            </>}
                          </td>
                        )}
                        <td className="hidden px-3 py-2 text-right tabular-nums text-text-muted xl:table-cell">{b.sortOrder}</td>
                        <td className="px-3 py-2">
                          {b.isActive ? <span className="text-text-muted">Đang bật</span> : <Badge tone="neutral">Đang tắt</Badge>}
                          {reason && <p className="mt-1 text-xs text-text-muted">{reason}</p>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            {badgesEditable && <Button size="sm" aria-label={`${b.isActive ? 'Tắt' : 'Bật'} ${b.name}`} onClick={() => onToggle(b)}>{b.isActive ? 'Tắt' : 'Bật'}</Button>}
                            <Button size="sm" aria-label={`${badgesEditable ? 'Sửa' : 'Xem'} huy hiệu ${b.name}`} onClick={(e) => onOpen(b.id, e.currentTarget)}>{badgesEditable ? 'Sửa' : 'Xem'}</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        )}
        {all.length > 0 && visible.length === 0 && (
          <div className="space-y-3 p-12 text-center text-sm text-text-muted">
            <p>{query.trim() ? `Không có huy hiệu khớp “${query.trim()}”.` : 'Không có huy hiệu ở trạng thái này.'}</p>
            {filtered && <Button size="sm" onClick={clear}>Xóa bộ lọc</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
