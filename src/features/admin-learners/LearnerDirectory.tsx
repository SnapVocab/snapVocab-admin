import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RotateCw, Search, UserX } from 'lucide-react';
import { Badge, Button, PageHeader, SampleDataNotice, StripCell, SummaryStrip, toolbarControl } from '../../components/ui';
import { useLearners } from '../../domains/admin-learners/queries';
import { learnersUseFixtures } from '../../domains/admin-learners/api';
import { FIXTURE_NOW } from '../../domains/admin-learners/fixtures';
import { activityOf, formatAgo, formatDate, STATUS_META } from '../../domains/admin-learners/mappers';
import type { LearnerActivity, LearnerListResponse, LearnerSort, LearnerStatus } from '../../domains/admin-learners/types';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { LearnerAvatar } from './LearnerAvatar';

type Cell = 'ALL' | Exclude<LearnerActivity, 'ALL'> | Exclude<LearnerStatus, 'ACTIVE'>;
/** Strip cells in support order: who is learning, who drifted away, who never started, then account problems. */
const CELLS: { key: Exclude<Cell, 'ALL'>; label: string; dot: string; count: (s: LearnerListResponse['summary']) => number }[] = [
  { key: 'ACTIVE_7D', label: 'Học trong 7 ngày', dot: 'bg-primary', count: (s) => s.active7d },
  { key: 'DORMANT_30D', label: 'Ngừng học > 30 ngày', dot: 'bg-warning', count: (s) => s.dormant30d },
  { key: 'NEVER', label: 'Chưa học lần nào', dot: 'bg-neutral-300', count: (s) => s.never },
  { key: 'PENDING', label: 'Chờ kích hoạt', dot: 'bg-info', count: (s) => s.pending },
  { key: 'BANNED', label: 'Đã khóa', dot: 'bg-danger', count: (s) => s.banned },
];
const SORTS: { key: LearnerSort; label: string }[] = [
  { key: 'lastStudied', label: 'Học gần nhất' },
  { key: 'createdAt', label: 'Mới tham gia' },
  { key: 'streak', label: 'Streak dài nhất' },
  { key: 'words', label: 'Nhiều từ nhất' },
];
/** Last-studied text: only the cases that need attention get a colour. */
const ACTIVITY_TEXT = { ACTIVE_7D: 'text-text', IDLE: 'text-text', DORMANT_30D: 'font-medium text-warning-dark', NEVER: 'text-text-light' } as const;
const PAGE_SIZE = 20;
const num = (x: number) => x.toLocaleString('vi-VN');

export function LearnerDirectory() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [cell, setCell] = useState<Cell>('ALL');
  const [sort, setSort] = useState<LearnerSort>('lastStudied');
  const [page, setPage] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => { setQ(search); setPage(0); }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const status = cell === 'PENDING' || cell === 'BANNED' ? cell : 'ALL';
  const activity = cell === 'ACTIVE_7D' || cell === 'DORMANT_30D' || cell === 'NEVER' ? cell : 'ALL';
  const list = useLearners({ q, status, activity, sort, page, size: PAGE_SIZE });
  const data = list.data;
  // Fixtures run on a fixed clock so "x ngày trước" matches the sample data.
  const now = learnersUseFixtures ? FIXTURE_NOW : new Date();
  const filtered = Boolean(q.trim()) || cell !== 'ALL';
  const choose = (next: Cell) => { setCell(next); setPage(0); };
  const open = (id: number) => navigate(`/learners/${id}`);

  return (
    <div className="space-y-4">
      <PageHeader title="Người học" />
      {learnersUseFixtures && (
        <SampleDataNotice>Màn này chờ <code className="font-mono">GET /api/admin/users</code>. Khóa, mở khóa và gửi link chỉ đổi dữ liệu mẫu trong phiên này.</SampleDataNotice>
      )}

      {data && (
        <SummaryStrip label="Tóm tắt người học">
          <StripCell value={data.summary.total} label="Người học" active={cell === 'ALL'} onClick={() => choose('ALL')} />
          {CELLS.map((c) => (
            <StripCell key={c.key} value={c.count(data.summary)} label={c.label} dot={c.dot} active={cell === c.key} onClick={() => choose(cell === c.key ? 'ALL' : c.key)} />
          ))}
        </SummaryStrip>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-3 text-text-muted" />
          <input type="search" aria-label="Tìm người học theo tên hoặc email" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email (gõ không dấu cũng được)" className={`${toolbarControl} w-full pl-9`} />
        </div>
        <select aria-label="Sắp xếp" value={sort} onChange={(e) => { setSort(e.target.value as LearnerSort); setPage(0); }} className={`${toolbarControl} cursor-pointer`}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>Sắp xếp: {s.label}</option>)}
        </select>
        <Button icon={<RotateCw />} label="Làm mới" loading={list.isFetching} onClick={() => void list.refetch()} />
      </div>

      {list.isError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-body text-danger-dark">
          <span className="flex items-center gap-2"><AlertCircle size={16} />{data ? 'Không làm mới được; đang hiển thị dữ liệu đã tải trước đó.' : 'Không tải được danh sách người học.'}</span>
          <Button size="sm" onClick={() => void list.refetch()}>Thử lại</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-subtle/60 text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Người học</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">Học gần nhất</th>
              <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Streak</th>
              <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Kỷ lục</th>
              <th className="px-3 py-2 text-right font-medium">Từ đã lưu</th>
              <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Coin</th>
              <th className="hidden px-4 py-2 font-medium xl:table-cell">Tham gia</th>
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-border', list.isPlaceholderData && 'opacity-60')}>
            {list.isPending
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 animate-pulse rounded bg-surface-subtle" /></td></tr>
                ))
              : data?.data.map((l) => {
                  const act = activityOf(l.lastStudiedAt, now);
                  const meta = STATUS_META[l.status];
                  return (
                    <tr key={l.id} onClick={() => open(l.id)} className="cursor-pointer hover:bg-surface-subtle/60">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <LearnerAvatar name={l.displayName} url={l.avatarUrl} />
                          <div className="min-w-0">
                            <a href={`/learners/${l.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(l.id); }} className="block truncate text-body font-medium text-text hover:underline">
                              {l.displayName}
                            </a>
                            <span className="block truncate text-text-muted">{l.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{l.status === 'ACTIVE' ? <span className="text-text-muted">{meta.label}</span> : <Badge tone={meta.tone}>{meta.label}</Badge>}</td>
                      <td className={cn('whitespace-nowrap px-3 py-2', ACTIVITY_TEXT[act])} title={act === 'DORMANT_30D' ? 'Ngừng học hơn 30 ngày' : undefined}>{formatAgo(l.lastStudiedAt, now)}</td>
                      <td className={cn('hidden px-3 py-2 text-right font-medium tabular-nums lg:table-cell', !l.streakDays && 'font-normal text-text-light')}>{l.streakDays}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-text-muted lg:table-cell">{l.longestStreakDays}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{num(l.wordsSaved)}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">{num(l.coin)}</td>
                      <td className="hidden px-4 py-2 tabular-nums text-text-muted xl:table-cell">{formatDate(l.createdAt)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-text-muted">
            <UserX size={32} className="text-text-muted/60" />
            <p className="font-semibold text-text">Không có người học phù hợp</p>
            {filtered && <Button size="sm" onClick={() => { setSearch(''); setQ(''); choose('ALL'); }}>Xóa bộ lọc</Button>}
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-xs text-text-muted sm:flex-row">
            <span>
              Hiển thị <strong className="text-text">{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + data.data.length}</strong> / <strong className="text-text">{data.meta.total}</strong> người học
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" icon={<ChevronLeft />} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <span className="px-2 font-medium tabular-nums text-text">{page + 1} / {data.meta.pages}</span>
              <Button size="sm" disabled={page + 1 >= data.meta.pages} onClick={() => setPage((p) => p + 1)}>Sau <ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
