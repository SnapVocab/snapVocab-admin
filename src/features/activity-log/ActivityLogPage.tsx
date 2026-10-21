import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, History, RotateCw, Search, X } from 'lucide-react';
import { Badge, Bar, Button, PageHeader, SampleDataNotice, SourceError, StripCell, SummaryStrip, TextLink, toolbarControl } from '../../components/ui';
import { auditUsesFixtures, exportAuditLog } from '../../domains/admin-audit/api';
import { FIXTURE_NOW } from '../../domains/admin-audit/fixtures';
import {
  ACTION_LABEL, actorLabel, AREA_LABEL, changeLines, dayHeading, groupByDay, KIND_LABEL, KINDS, parseHistoryPath,
  shortDay, TARGET_LABEL, targetPath, vnDateTimeSeconds, vnTime, type ChangeLine,
} from '../../domains/admin-audit/mappers';
import { useAuditLog } from '../../domains/admin-audit/queries';
import type { AuditArea, AuditEntry, AuditKind, AuditLogParams, AuditLogResponse, AuditPeriod } from '../../domains/admin-audit/types';
import { cn, downloadCsv } from '../../lib/utils';
import { EntryDrawer } from './EntryDrawer';

const PERIODS: AuditPeriod[] = [7, 30, 90];
const PAGE_SIZE = 50;
type ActorFilter = NonNullable<AuditLogParams['actor']>;

/**
 * Nhật ký hoạt động (design.md §8, activity_log_ui.md): who changed what, when and why.
 * Strip = the questions operators ask; band = when, where and who; table = what; drawer = the full diff.
 * Strip cells and band rows are the filters. `rest` = one object's history (/activity-log/vat-pham/11),
 * linked from the editors' "Vòng đời" panels.
 */
export function ActivityLogPage({ rest }: { rest: string[] }) {
  const target = parseHistoryPath(rest);
  const [days, setDays] = useState<AuditPeriod>(target ? 90 : 30);
  const [day, setDay] = useState<string | null>(null);
  const [kind, setKind] = useState<AuditKind | 'ALL'>('ALL');
  const [area, setArea] = useState<AuditArea | 'ALL'>('ALL');
  const [actor, setActor] = useState<ActorFilter>('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => { setQ(search); setPage(0); }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const params: AuditLogParams = { days, day, kind, area, actor, target, q, page, size: PAGE_SIZE };
  const log = useAuditLog(params);
  const data = log.data;
  const list = data?.data ?? [];
  // Fixtures run on the Learners fixture clock, so "Hôm nay" and the bans line up with the sample data.
  const now = auditUsesFixtures ? FIXTURE_NOW : new Date();
  const filtered = kind !== 'ALL' || area !== 'ALL' || actor !== 'ALL' || day !== null || q.trim() !== '';
  const clear = () => { setKind('ALL'); setArea('ALL'); setActor('ALL'); setDay(null); setSearch(''); setQ(''); setPage(0); };
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };
  const at = open ? list.findIndex((e) => e.id === open.id) : -1;
  const perDay = new Map(data?.summary.daily.map((d) => [d.day, d.count]));
  // Name, code and topic ancestry of a history target come from its own entries.
  const known = list[0]?.target;
  const noun = target && TARGET_LABEL[target.type].toLowerCase();
  const targetLink = target && known ? targetPath(known) : null;

  const exportCsv = async () => {
    setExporting(true);
    setExportFailed(false);
    try {
      const csv = await exportAuditLog({ ...params, page: undefined, size: undefined });
      downloadCsv(`snapvocab-nhat-ky-${day ?? `${days}-ngay`}.csv`, csv);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      <PageHeader
        title="Nhật ký hoạt động"
        actions={<>
          <div role="radiogroup" aria-label="Khoảng thời gian" className="inline-flex rounded-md border border-border bg-surface p-0.5">
            {PERIODS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={days === p} onClick={() => { setDays(p); setDay(null); setPage(0); }}
                className={cn('h-7 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', days === p ? 'bg-text text-white' : 'text-text-muted hover:text-text')}>
                {p} ngày
              </button>
            ))}
          </div>
          {log.dataUpdatedAt > 0 && <span className="hidden text-xs tabular-nums text-text-muted sm:inline">Cập nhật {new Date(log.dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
          <Button icon={<RotateCw />} label="Làm mới" loading={log.isFetching && !log.isPending} onClick={() => void log.refetch()} />
          <Button icon={<Download />} loading={exporting} disabled={!data?.meta.total} onClick={() => void exportCsv()}>Xuất CSV</Button>
        </>}
      />
      {auditUsesFixtures && (
        <SampleDataNotice>
          Màn này chờ <code className="font-mono">GET /api/admin/audit-log</code> (bảng <code className="font-mono">admin_audit_logs</code>). Mọi dòng là mẫu nhưng trỏ tới đối tượng có thật.
          Với Cửa hàng và Nhiệm vụ, thời điểm, phiên bản và giá trị cuối khớp dữ liệu hiện tại; người làm, giá trị cũ và lý do là mẫu.
        </SampleDataNotice>
      )}

      {target && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-body">
          <span className="min-w-0">
            Lịch sử của {noun} <strong className="font-semibold">{known?.name ?? target.id}</strong>
            {known?.code && <span className="ml-1.5 font-mono text-2xs text-text-light">{known.code}</span>}
          </span>
          <span className="flex items-center gap-4">
            {targetLink && <TextLink to={targetLink}>Mở {noun}</TextLink>}
            <TextLink to="/activity-log" arrow={false}>Xem toàn bộ nhật ký</TextLink>
          </span>
        </div>
      )}

      {data && (
        <SummaryStrip label="Tóm tắt nhật ký">
          <StripCell value={data.summary.total} label={`Thay đổi trong ${days} ngày`} active={kind === 'ALL'} onClick={() => pick(setKind)('ALL')} />
          {KINDS.map((k) => (
            <StripCell key={k} value={data.summary.byKind[k]} label={KIND_LABEL[k]} dot={k === 'GUARDRAIL' ? 'bg-warning' : undefined}
              active={kind === k} onClick={() => pick(setKind)(kind === k ? 'ALL' : k)} />
          ))}
        </SummaryStrip>
      )}

      {data && (
        <section aria-label="Phân bố thay đổi" className={cn('grid divide-y divide-border rounded-lg border border-border bg-surface lg:divide-x lg:divide-y-0',
          target ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]')}>
          <DayChart daily={data.summary.daily} day={day} now={now} onSelect={pick(setDay)} />
          {/* One object lives in one area: the area column would say nothing. */}
          {!target && <Facet title="Theo khu vực" rows={data.summary.areas.map((a) => ({ key: a.area, label: AREA_LABEL[a.area], count: a.count }))} active={area} onSelect={pick(setArea)} />}
          <Facet<number | 'SYSTEM'> title="Người làm" rows={data.summary.actors.map((a) => ({ key: a.actor?.id ?? 'SYSTEM', label: actorLabel(a.actor), count: a.count }))} active={actor} onSelect={pick(setActor)} />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-3 text-text-muted" />
          <input type="search" aria-label="Tìm trong nhật ký" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo đối tượng, mã, người làm hoặc lý do" className={`${toolbarControl} w-full pl-9`} />
        </div>
        {filtered && <Button variant="ghost" icon={<X />} onClick={clear}>Xóa bộ lọc</Button>}
      </div>

      {log.isError && <SourceError what="nhật ký" stale={!!data} onRetry={() => void log.refetch()} />}
      {exportFailed && <SourceError what="file CSV" onRetry={() => void exportCsv()} />}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[760px] table-fixed text-left text-xs">
          <thead className="border-b border-border bg-surface-subtle/60 text-text-muted">
            <tr>
              <th className="w-16 px-4 py-2 font-medium">Giờ</th>
              <th className="w-44 px-3 py-2 font-medium">Người làm</th>
              <th className="hidden w-[88px] px-3 py-2 font-medium lg:table-cell">Khu vực</th>
              <th className="w-32 px-3 py-2 font-medium">Hành động</th>
              <th className="w-48 px-3 py-2 font-medium">Đối tượng</th>
              <th className="px-3 py-2 font-medium">Thay đổi</th>
              <th className="hidden w-56 px-4 py-2 font-medium xl:table-cell">Lý do</th>
            </tr>
          </thead>
          {log.isPending ? (
            <tbody>
              {Array.from({ length: 8 }, (_, i) => <tr key={i}><td colSpan={7} className="px-4 py-2.5"><div className="h-7 animate-pulse rounded bg-surface-subtle" /></td></tr>)}
            </tbody>
          ) : groupByDay(list).map((g) => (
            <tbody key={g.day} className={cn('divide-y divide-border border-t border-border first-of-type:border-t-0', log.isPlaceholderData && 'opacity-60')}>
              <tr>
                <th colSpan={7} scope="colgroup" className="bg-surface-subtle/40 px-4 py-1.5 text-left font-medium text-text">
                  {dayHeading(g.day, now)}
                  {/* The day's total is only true of the whole log; with a filter on, the rows say it. */}
                  {!filtered && <span className="ml-2 font-normal text-text-muted">{perDay.get(g.day) ?? g.entries.length} thay đổi</span>}
                </th>
              </tr>
              {g.entries.map((e) => <EntryRow key={e.id} e={e} active={open?.id === e.id} onOpen={() => setOpen(e)} />)}
            </tbody>
          ))}
        </table>

        {data && !list.length && (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-text-muted">
            <History size={32} className="text-text-muted/60" />
            <p className="font-semibold text-text">
              {filtered ? 'Không có thay đổi phù hợp' : target ? `Chưa có thay đổi nào của ${noun} này trong ${days} ngày` : `Chưa có thay đổi nào trong ${days} ngày`}
            </p>
            {filtered ? <Button size="sm" onClick={clear}>Xóa bộ lọc</Button> : days < 90 && <Button size="sm" onClick={() => setDays(90)}>Xem 90 ngày</Button>}
          </div>
        )}

        {data && list.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-xs text-text-muted sm:flex-row">
            <span>
              Hiển thị <strong className="text-text">{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + list.length}</strong> / <strong className="text-text">{data.meta.total}</strong> thay đổi
            </span>
            {data.meta.pages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" icon={<ChevronLeft />} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Mới hơn</Button>
                <span className="px-2 font-medium tabular-nums text-text">{page + 1} / {data.meta.pages}</span>
                <Button size="sm" disabled={page + 1 >= data.meta.pages} onClick={() => setPage((p) => p + 1)}>Cũ hơn <ChevronRight size={14} /></Button>
              </div>
            )}
          </div>
        )}
      </div>

      {open && <EntryDrawer key={open.id} entry={open} onClose={() => setOpen(null)} onOpen={setOpen} newer={at > 0 ? list[at - 1] : undefined} older={at >= 0 ? list[at + 1] : undefined} />}
    </div>
  );
}

/** Writes per day over the period; a column filters the table to that day. Bars fill the band's height. */
function DayChart({ daily, day, now, onSelect }: { daily: AuditLogResponse['summary']['daily']; day: string | null; now: Date; onSelect: (day: string | null) => void }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  const peak = daily.reduce((p, d) => (d.count > p.count ? d : p), daily[0]);
  const busyDays = daily.filter((d) => d.count).length;
  return (
    <div className="flex min-w-0 flex-col px-4 pb-2.5 pt-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">
          Theo ngày
          <span className="ml-2 text-xs font-normal text-text-muted">{busyDays} ngày có thay đổi{peak.count > 0 && `, nhiều nhất ${shortDay(peak.day)}: ${peak.count}`}</span>
        </h2>
        {day && (
          <button type="button" onClick={() => onSelect(null)} className="inline-flex items-center gap-1 rounded text-xs text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
            Đang xem {shortDay(day)}<X size={12} aria-hidden /><span className="sr-only">, bỏ chọn ngày</span>
          </button>
        )}
      </header>
      <div className={cn('mt-2 flex min-h-16 flex-1 items-end', daily.length > 31 ? 'gap-px' : daily.length > 7 ? 'gap-1' : 'gap-3')}>
        {daily.map((d) => {
          const on = day === d.day;
          const text = `${dayHeading(d.day, now)}: ${d.count} thay đổi`;
          return (
            <button key={d.day} type="button" disabled={!d.count} aria-pressed={on} aria-label={text} title={text} onClick={() => onSelect(on ? null : d.day)}
              className="group flex h-full min-w-0 flex-1 items-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info disabled:cursor-default">
              <span className={cn('w-full rounded-[2px]', !d.count ? 'bg-border' : on ? 'bg-text' : day ? 'bg-border-strong group-hover:bg-text-muted' : 'bg-text-light group-hover:bg-text-muted')}
                style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : '1px' }} />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-2xs tabular-nums text-text-light">
        <span>{shortDay(daily[0].day)}</span>
        <span>{shortDay(daily[Math.floor(daily.length / 2)].day)}</span>
        <span>Hôm nay</span>
      </div>
    </div>
  );
}

/** Counts of one dimension over the period; a row filters the table (pressed = on, again = off). */
function Facet<K extends string | number>({ title, rows, active, onSelect }: {
  title: string;
  rows: { key: K; label: string; count: number }[];
  active: K | 'ALL';
  onSelect: (key: K | 'ALL') => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="min-w-0 px-4 pb-3 pt-3">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <ul className="mt-2 space-y-0.5">
        {rows.map((r) => {
          const on = active === r.key;
          return (
            <li key={String(r.key)}>
              <button type="button" aria-pressed={on} onClick={() => onSelect(on ? 'ALL' : r.key)} title={`${r.label}: ${r.count} thay đổi`}
                className={cn('flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', on && 'bg-surface-subtle')}>
                <span className={cn('w-36 shrink-0 truncate', on ? 'font-medium text-text' : 'text-text')}>{r.label}</span>
                <span className="min-w-0 flex-1"><Bar value={r.count} max={max} tone={on ? 'bg-text-muted' : 'bg-text-light'} /></span>
                <span className="w-8 shrink-0 text-right tabular-nums text-text-muted">{r.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EntryRow({ e, active, onOpen }: { e: AuditEntry; active: boolean; onOpen: () => void }) {
  const lines = changeLines(e);
  return (
    <tr onClick={onOpen} className={cn('cursor-pointer align-top hover:bg-surface-subtle/60', active && 'bg-surface-subtle')}>
      <td className="px-4 py-2 tabular-nums text-text-muted" title={vnDateTimeSeconds(e.at)}>{vnTime(e.at)}</td>
      <td className={cn('truncate px-3 py-2', !e.actor && 'text-text-muted')} title={actorLabel(e.actor)}>{actorLabel(e.actor)}</td>
      <td className="hidden px-3 py-2 text-text-muted lg:table-cell">{AREA_LABEL[e.area]}</td>
      <td className="px-3 py-2">{ACTION_LABEL[e.action]}</td>
      <td className="px-3 py-2">
        <button type="button" onClick={(ev) => { ev.stopPropagation(); onOpen(); }} title={`Xem chi tiết: ${ACTION_LABEL[e.action]} ${e.target.name}`}
          className="block max-w-full truncate rounded text-left font-medium text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
          {e.target.name}
        </button>
        {(e.target.code || e.target.type === 'LEARNER') && <span className="block truncate font-mono text-2xs text-text-light">{e.target.code ?? `#${e.target.id}`}</span>}
      </td>
      <td className="px-3 py-2">
        {lines.slice(0, 2).map((c) => <ChangeText key={c.field} c={c} />)}
        {lines.length > 2 && <span className="text-text-light">+{lines.length - 2} trường khác</span>}
        {!lines.length && <span className="text-text-light">—</span>}
        {e.guardrail && <Badge tone="warning" className="mt-1">Vượt mức gợi ý</Badge>}
      </td>
      <td className="hidden px-4 py-2 text-text-muted xl:table-cell"><span className="line-clamp-2">{e.reason}</span></td>
    </tr>
  );
}

const ChangeText = ({ c }: { c: ChangeLine }) => (
  <div className="truncate" title={`${c.label}: ${c.before === null ? '' : `${c.before} → `}${c.after}`}>
    <span className="text-text-muted">{c.label}:</span>{' '}
    {c.before !== null && <><span className="text-text-muted">{c.before}</span><span className="text-text-light"> → </span></>}
    <span className="font-medium text-text">{c.after}</span>
  </div>
);
