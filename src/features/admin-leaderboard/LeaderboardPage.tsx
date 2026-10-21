import React, { useState } from 'react';
import { RotateCw, Search, X } from 'lucide-react';
import {
  Badge, Bar, Button, Drawer, Mini, MiniStrip, PageHeader, SampleDataNotice, SectionLabel, SourceError, StripCell, StripNote,
  SummaryStrip, TextLink, toolbarControl,
} from '../../components/ui';
import { leaderboardUsesFixtures } from '../../domains/admin-leaderboard/api';
import {
  activeDayCounts, daysCovered, flagsOf, gapAbove, leaderboardErrorDetail, learnerView, matchesFilter, matchesQuery, n,
  reachedLabel, scoringRule, summarize, timeLeft, vnDayTime, vnTime, weekRange, xpBands, type RowFilter,
} from '../../domains/admin-leaderboard/mappers';
import { useAdminLeaderboard } from '../../domains/admin-leaderboard/queries';
import type { AdminLeaderboard, AdminLeaderboardRow, LeaderboardWeek } from '../../domains/admin-leaderboard/types';
import { initials } from '../../domains/admin-learners/mappers';
import { cn } from '../../lib/utils';

const WEEKS: { key: LeaderboardWeek; label: string }[] = [{ key: 'CURRENT', label: 'Tuần này' }, { key: 'PREVIOUS', label: 'Tuần trước' }];
/** The API returns the whole board (up to ~5.000 people, leaderboard_backend.md §10.3); the table grows in steps. */
const STEP = 100;
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

/**
 * Bảng xếp hạng (leaderboard_ui.md): the weekly XP board learners see, read-only (LB-12).
 * Strip = whole-board counts that filter the table; band = how XP spreads, where it comes from and how many days people
 * study; table = the board in the learners' order; drawer = one learner's week and what they see on the app.
 */
export function LeaderboardPage() {
  const [week, setWeek] = useState<LeaderboardWeek>('CURRENT');
  const [filter, setFilter] = useState<RowFilter>('ALL');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(STEP);
  const [openId, setOpenId] = useState<number | null>(null);
  const board = useAdminLeaderboard(week);
  const b = board.data;
  const s = b && summarize(b);
  const current = week === 'CURRENT';
  const covered = b ? daysCovered(b) : 7;
  const rows = b ? b.entries.filter((r) => matchesFilter(r, filter) && matchesQuery(r, search)) : [];
  const filtered = filter !== 'ALL' || search.trim() !== '';
  const open = b?.entries.find((r) => r.userId === openId);
  const pick = (f: RowFilter) => { setFilter(filter === f ? 'ALL' : f); setShown(STEP); };
  const clear = () => { setFilter('ALL'); setSearch(''); setShown(STEP); };
  const stamp = b && (b.isFinal ? `Chốt ${vnDayTime(b.asOf)}` : current ? `Cập nhật ${vnTime(b.asOf)}` : 'Đang chốt');

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      <PageHeader
        title="Bảng xếp hạng"
        description={scoringRule(b?.countedSources ?? ['FLASHCARD_REVIEW', 'QUIZ'])}
        actions={<>
          <div role="radiogroup" aria-label="Tuần" className="inline-flex rounded-md border border-border bg-surface p-0.5">
            {WEEKS.map((w) => (
              <button key={w.key} type="button" role="radio" aria-checked={week === w.key} onClick={() => { setWeek(w.key); setOpenId(null); setShown(STEP); }}
                className={cn('h-7 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', week === w.key ? 'bg-text text-white' : 'text-text-muted hover:text-text')}>
                {w.label}
              </button>
            ))}
          </div>
          {stamp && <span className="hidden text-xs tabular-nums text-text-muted sm:inline" title="Mọi số trên trang lấy từ cùng một ảnh chụp bảng, ảnh mà người học đang thấy. Máy chủ chụp lại mỗi phút.">{stamp}</span>}
          <Button icon={<RotateCw />} label="Làm mới" loading={board.isFetching && !board.isPending} onClick={() => void board.refetch()} />
        </>}
      />
      {leaderboardUsesFixtures && (
        <SampleDataNotice>
          Màn này chờ <code className="font-mono">GET /api/admin/leaderboards</code>. Người học là người học mẫu của màn Người học; XP sinh theo đúng
          luật cộng XP của ứng dụng (ôn thẻ, quiz, Booster) và tính tới 14:20 Thứ Tư 21/10.
        </SampleDataNotice>
      )}
      {board.isError && <SourceError what="bảng xếp hạng" stale={!!b} detail={leaderboardErrorDetail(board.error)} onRetry={() => void board.refetch()} />}

      {b && s && (
        <SummaryStrip label="Tóm tắt bảng">
          <StripCell value={b.participants} label="Người có mặt" active={filter === 'ALL'} onClick={() => pick('ALL')} />
          <StripCell value={s.flagged} label="Cần xem" dot="bg-warning" active={filter === 'FLAGGED'} onClick={() => pick('FLAGGED')} />
          <StripCell value={s.tied} label="Đồng hạng" active={filter === 'TIED'} onClick={() => pick('TIED')} />
          <StripCell value={s.booster} label="Có XP Booster" active={filter === 'BOOSTER'} onClick={() => pick('BOOSTER')} />
          <StripNote title="Người có mặt trên số tài khoản đã kích hoạt, không tính admin">
            <span>Tham gia</span>
            <span className="text-sm font-semibold tabular-nums text-text">{pct(b.participants, b.eligibleLearners)}<span className="ml-1.5 font-normal text-text-muted">{b.participants}/{b.eligibleLearners} người học</span></span>
          </StripNote>
          <StripNote>
            <span>Tổng XP tuần</span>
            <span className="text-sm font-semibold tabular-nums text-text">{n(b.totalXp)} XP</span>
          </StripNote>
          <StripNote push title={`Tuần đóng lúc ${vnDayTime(b.endsAt)}, giờ Việt Nam`}>
            <span>Tuần {weekRange(b)}</span>
            <span className="text-sm font-semibold text-text">{b.isFinal ? 'Đã chốt' : current ? timeLeft(b.endsAt, Date.parse(b.asOf)) : 'Đang chốt'}</span>
          </StripNote>
        </SummaryStrip>
      )}

      {b && s && b.participants > 0 && (
        <section aria-label="Phân bố trong tuần" className="grid divide-y divide-border rounded-lg border border-border bg-surface lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
          <XpSpread rows={b.entries} top={s.top} />
          <Sources s={s} total={b.totalXp} board={b} />
          <StudyDays rows={b.entries} covered={covered} />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-3 text-text-muted" />
          <input type="search" aria-label="Tìm trên bảng" value={search} onChange={(e) => { setSearch(e.target.value); setShown(STEP); }}
            placeholder="Tìm theo tên, email hoặc ID" className={`${toolbarControl} w-full pl-9`} />
        </div>
        {filtered && <Button variant="ghost" icon={<X />} onClick={clear}>Xóa bộ lọc</Button>}
        {b && filtered && <span className="text-xs text-text-muted">{rows.length}/{b.participants} người, hạng vẫn tính trên cả bảng</span>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="whitespace-nowrap border-b border-border bg-surface-subtle/60 text-text-muted">
            <tr>
              <th className="w-24 px-4 py-2 font-medium">Hạng</th>
              <th className="px-3 py-2 font-medium">Người học</th>
              <th className="w-36 px-3 py-2 text-right font-medium">XP tuần</th>
              <th className="px-3 py-2 text-right font-medium" title="XP cần thêm để vượt nhóm điểm liền trên">Để vượt hạng trên</th>
              <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Ôn thẻ</th>
              <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Quiz</th>
              <th className="hidden px-3 py-2 text-right font-medium xl:table-cell" title="Phần XP do XP Booster nhân đôi, đã nằm trong XP tuần">Booster</th>
              <th className="px-3 py-2 text-right font-medium" title="Số ngày có XP được tính, trên số ngày đã qua của tuần">Ngày học</th>
              <th className="px-3 py-2 text-right font-medium" title="XP nhiều nhất trong một giờ đồng hồ">Cao nhất 1 giờ</th>
              <th className="hidden px-4 py-2 font-medium 2xl:table-cell" title="Lúc người học đạt số XP hiện tại; bằng điểm thì ai đạt trước đứng trên">Đạt mức lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {board.isPending && Array.from({ length: 8 }, (_, i) => <tr key={i}><td colSpan={10} className="px-4 py-2.5"><div className="h-8 animate-pulse rounded bg-surface-subtle" /></td></tr>)}
            {b && s && rows.slice(0, shown).map((r) => (
              <BoardRow key={r.userId} r={r} all={b.entries} top={s.top} covered={covered} current={current} asOf={b.asOf} active={openId === r.userId} onOpen={() => setOpenId(r.userId)} />
            ))}
          </tbody>
        </table>

        {b && !rows.length && (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-text-muted">
            <p className="font-semibold text-text">{filtered ? 'Không có người học phù hợp' : current ? 'Chưa ai có XP trong tuần này' : 'Tuần trước không ai có XP'}</p>
            {filtered ? <Button size="sm" onClick={clear}>Xóa bộ lọc</Button>
              : current && <p>Sáng Thứ Hai thường như vậy. Bảng cập nhật mỗi phút: người vừa học xong có tên ở lần cập nhật kế tiếp.</p>}
          </div>
        )}
        {rows.length > shown && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-xs text-text-muted">
            <span>Hiển thị <strong className="text-text">{shown}</strong>/<strong className="text-text">{rows.length}</strong> người</span>
            <Button size="sm" onClick={() => setShown((x) => x + STEP)}>Hiện thêm {Math.min(STEP, rows.length - shown)}</Button>
          </div>
        )}
      </div>

      {b && open && <LearnerWeek b={b} r={open} covered={covered} current={current} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** Up, down or unchanged against the board at 00:00 today, drawn as the app draws it (▲ green, ▼ grey). */
function Trend({ change }: { change: number | null }) {
  if (!change) return <span className="text-text-light" title={change === null ? 'Không có hạng lúc 00:00 hôm nay để so' : 'Giữ hạng so với 00:00 hôm nay'}>—</span>;
  const up = change > 0;
  return (
    <span className={cn('text-2xs tabular-nums', up ? 'font-medium text-primary-dark' : 'text-text-muted')} title={`${up ? 'Lên' : 'Xuống'} ${Math.abs(change)} hạng so với 00:00 hôm nay`}>
      <span aria-hidden>{up ? '▲' : '▼'}</span><span className="sr-only">{up ? 'lên' : 'xuống'} </span>{Math.abs(change)}
    </span>
  );
}

function BoardRow({ r, all, top, covered, current, asOf, active, onOpen }: {
  r: AdminLeaderboardRow; all: AdminLeaderboardRow[]; top: number; covered: number; current: boolean; asOf: string; active: boolean; onOpen: () => void;
}) {
  const flags = flagsOf(r);
  const gap = gapAbove(all, r);
  const peak = flags.some((f) => f.key === 'PEAK_HOUR');
  const burst = flags.some((f) => f.key === 'REVIEW_BURST');
  return (
    <tr onClick={onOpen} className={cn('cursor-pointer hover:bg-surface-subtle/60', active && 'bg-surface-subtle')}>
      <td className="px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="w-6 text-right text-body font-semibold tabular-nums">{r.rank}</span>
          {current && <Trend change={r.rankChange} />}
        </div>
        {r.tied && <span className="block whitespace-nowrap text-2xs text-text-muted">đồng hạng</span>}
      </td>
      <td className="w-full max-w-0 px-3 py-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="truncate rounded text-left text-body font-medium text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
            {r.displayName}
          </button>
          {flags.length > 0 && <Badge tone="warning" title={flags.map((f) => f.detail).join('; ')}>Cần xem</Badge>}
        </div>
        <div className="flex min-w-0 gap-2 text-text-muted"><span className="truncate">{r.email ?? '—'}</span><span className="font-mono text-2xs text-text-light">#{r.userId}</span></div>
      </td>
      <td className="px-3 py-2">
        <div className="text-right text-body font-semibold tabular-nums">{n(r.score)}</div>
        <div className="ml-auto mt-1 w-24"><Bar value={r.score} max={top} tone={flags.length ? 'bg-warning' : 'bg-text-light'} /></div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{gap ? `+${n(gap.xp)}` : <span className="text-text-light" title="Đang ở nhóm điểm cao nhất">—</span>}</td>
      <td className={cn('hidden px-3 py-2 text-right tabular-nums xl:table-cell', burst && 'font-medium text-warning-dark')}>{n(r.reviewXp)}</td>
      <td className="hidden px-3 py-2 text-right tabular-nums xl:table-cell">{n(r.quizXp)}</td>
      <td className="hidden px-3 py-2 text-right tabular-nums xl:table-cell">{r.bonusXp ? n(r.bonusXp) : <span className="text-text-light">—</span>}</td>
      <td className="px-3 py-2 text-right tabular-nums">{r.activeDays}<span className="text-text-light">/{covered}</span></td>
      <td className={cn('px-3 py-2 text-right tabular-nums', peak && 'font-medium text-warning-dark')}>{n(r.peakHourXp)}</td>
      <td className="hidden whitespace-nowrap px-4 py-2 text-text-muted 2xl:table-cell" title={vnDayTime(r.reachedAt)}>{reachedLabel(r.reachedAt, asOf)}</td>
    </tr>
  );
}

/** Participants per XP band. Bands holding someone "Cần xem" are drawn in the warning tone: the outliers show at a glance. */
function XpSpread({ rows, top }: { rows: AdminLeaderboardRow[]; top: number }) {
  const bands = xpBands(rows);
  const max = Math.max(1, ...bands.map((x) => x.count));
  const flagged = bands.some((x) => x.flagged);
  return (
    <div className="flex min-w-0 flex-col px-4 pb-2.5 pt-3">
      <h2 className="text-sm font-semibold text-text">
        Phân bố XP tuần
        <span className="ml-2 text-xs font-normal text-text-muted">mỗi cột {n(bands[0].to)} XP, cao nhất {n(top)}</span>
      </h2>
      <div className="mt-2 flex min-h-28 flex-1 items-end gap-1">
        {bands.map((x) => {
          const text = `${n(x.from)}–${n(x.to - 1)} XP: ${x.count} người${x.flagged ? `, ${x.flagged} cần xem` : ''}`;
          return (
            <div key={x.from} role="img" aria-label={text} title={text} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              {x.count > 0 && <span className="text-center text-2xs tabular-nums text-text-muted">{x.count}</span>}
              <span className={cn('w-full rounded-[2px]', !x.count ? 'bg-border' : x.flagged ? 'bg-warning' : 'bg-text-light')}
                style={{ height: x.count ? `${Math.max(3, (x.count / max) * 82)}%` : '1px' }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-2xs tabular-nums text-text-light">
        <span>0</span>
        {flagged && <span className="text-warning-dark">Cột vàng: có người cần xem</span>}
        <span>{n(bands[bands.length - 1].to)} XP</span>
      </div>
    </div>
  );
}

function Sources({ s, total, board }: { s: ReturnType<typeof summarize>; total: number; board: AdminLeaderboard }) {
  const line = (label: string, value: number, sub = false) => (
    <li className="flex items-center gap-2">
      <span className={cn('w-20 shrink-0', sub ? 'pl-3 text-text-muted' : 'text-text')}>{label}</span>
      <span className="min-w-0 flex-1"><Bar value={value} max={total} tone={sub ? 'bg-border-strong' : 'bg-text-light'} /></span>
      <span className="w-24 shrink-0 text-right tabular-nums">{n(value)}<span className="ml-1 text-text-muted">{pct(value, total)}</span></span>
    </li>
  );
  return (
    <div className="min-w-0 px-4 pb-3 pt-3">
      <h2 className="text-sm font-semibold text-text">Nguồn XP</h2>
      <ul className="mt-2 space-y-1.5 text-xs">
        {line('Ôn thẻ', s.reviewXp)}
        {line('Quiz', s.quizXp)}
        {line('Booster', s.bonusXp, true)}
      </ul>
      <p className="mt-2 text-xs text-text-muted">
        Booster là phần nhân đôi đã nằm trong hai dòng trên.{!board.countedSources.includes('MISSION_REWARD') && ' XP nhiệm vụ không tính vào bảng.'}
      </p>
    </div>
  );
}

function StudyDays({ rows, covered }: { rows: AdminLeaderboardRow[]; covered: number }) {
  const counts = activeDayCounts(rows, covered);
  const max = Math.max(1, ...counts);
  return (
    <div className="min-w-0 px-4 pb-3 pt-3">
      <h2 className="text-sm font-semibold text-text">
        Số ngày học
        <span className="ml-2 text-xs font-normal text-text-muted">{covered < 7 ? `trong ${covered} ngày đã qua` : 'cả tuần'}</span>
      </h2>
      <ul className="mt-2 space-y-1 text-xs">
        {counts.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-text">{i + 1} ngày</span>
            <span className="min-w-0 flex-1"><Bar value={c} max={max} /></span>
            <span className="w-14 shrink-0 text-right tabular-nums text-text-muted">{c} người</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LearnerWeek({ b, r, covered, current, onClose }: { b: AdminLeaderboard; r: AdminLeaderboardRow; covered: number; current: boolean; onClose: () => void }) {
  const flags = flagsOf(r);
  const gap = gapAbove(b.entries, r);
  const trend = r.rankChange ? `${r.rankChange > 0 ? 'Lên' : 'Xuống'} ${Math.abs(r.rankChange)}` : r.rankChange === 0 ? 'Giữ hạng' : '—';
  return (
    <Drawer title={r.displayName} subtitle={<span className="flex flex-wrap gap-x-3"><span>{r.email}</span><span className="font-mono">#{r.userId}</span></span>}
      onClose={onClose} footer={<TextLink to={`/learners/${r.userId}`}>Mở hồ sơ người học</TextLink>}>
      {flags.length > 0 && (
        <div role="note" className="space-y-1.5 rounded-lg border border-warning/40 bg-warning-light px-3 py-2.5 text-xs text-warning-dark">
          {flags.map((f) => <p key={f.key}><strong className="font-semibold">{f.label}:</strong> {f.detail}.</p>)}
          <p>Bảng không tự loại ai hay trừ điểm. Nếu xác minh là gian lận, khóa tài khoản trong hồ sơ người học: người bị khóa rời bảng ở lần cập nhật kế tiếp.</p>
        </div>
      )}
      <section className="space-y-2">
        <SectionLabel>Tuần {weekRange(b)}</SectionLabel>
        <MiniStrip cols="grid-cols-2 sm:grid-cols-4">
          <Mini value={r.tied ? `${r.rank} (đồng)` : r.rank} label="Hạng" />
          <Mini value={n(r.score)} label="XP tuần" />
          <Mini value={gap ? `+${n(gap.xp)}` : '—'} label={gap ? `Để vượt hạng ${gap.rank}` : 'Đang dẫn đầu'} />
          <Mini value={current ? trend : '—'} label="So với 00:00" hint="Hạng lúc 00:00 hôm nay so với hạng hiện tại" />
        </MiniStrip>
        <MiniStrip cols="grid-cols-2 sm:grid-cols-4">
          <Mini value={n(r.reviewXp)} label="XP ôn thẻ" bad={flags.some((f) => f.key === 'REVIEW_BURST')} />
          <Mini value={n(r.quizXp)} label="XP quiz" />
          <Mini value={n(r.bonusXp)} label="Phần Booster" />
          <Mini value={n(r.events)} label="Lượt cộng XP" />
        </MiniStrip>
        <MiniStrip cols="grid-cols-3">
          <Mini value={`${r.activeDays}/${covered}`} label="Ngày học" />
          <Mini value={n(r.peakHourXp)} label="Cao nhất 1 giờ" bad={flags.some((f) => f.key === 'PEAK_HOUR')} />
          <Mini value={reachedLabel(r.reachedAt, b.asOf)} label="Đạt mức lúc" hint={vnDayTime(r.reachedAt)} />
        </MiniStrip>
      </section>
      <section className="space-y-2">
        <SectionLabel>Người học thấy trên ứng dụng</SectionLabel>
        <PhoneBoard b={b} me={r} />
        <p className="text-xs text-text-muted">
          Mô phỏng theo thiết kế mobile, dùng chữ cái đầu thay ảnh đại diện; ứng dụng chưa có màn bảng xếp hạng. Người học khác chỉ thấy tên, ảnh
          đại diện, khung, XP tuần và xu hướng, không thấy email hay các số phía trên.
        </p>
      </section>
    </Drawer>
  );
}

/** The app's rows (mobile design.md §10.4, avatar §6.11), condensed to the top three and this learner's own row. */
function PhoneBoard({ b, me }: { b: AdminLeaderboard; me: AdminLeaderboardRow }) {
  const gap = gapAbove(b.entries, me);
  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-border bg-white">
      <div className="px-4 pb-2 pt-3">
        <p className="text-sm font-bold text-text">Bảng xếp hạng tuần</p>
        <p className="text-2xs text-text-muted">{b.isFinal ? `Kết quả tuần ${weekRange(b)}` : `Tuần ${weekRange(b)}`}</p>
      </div>
      <ul>
        {learnerView(b.entries, me.userId).map((line, i) => line === 'gap'
          ? <li key={`gap${i}`} aria-hidden className="border-t border-border py-0.5 text-center text-text-light">⋯</li>
          : (
            <li key={line.row.userId} className={cn('flex h-12 items-center gap-3 border-t border-border px-4', line.me && 'border-l-[3px] border-l-primary bg-primary-light pl-[13px]')}>
              <span className={cn('w-6 text-center text-base font-bold tabular-nums', line.row.rank <= 3 ? 'text-reward' : 'text-text-muted')}>{line.row.rank}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-2xs font-semibold text-primary-dark ring-2 ring-primary ring-offset-2">{initials(line.row.displayName)}</span>
              <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{line.row.displayName}</span>
              <span className="text-body font-bold tabular-nums text-reward-dark">{n(line.row.score)}</span>
              <span className={cn('w-4 text-center text-xs', (line.row.rankChange ?? 0) > 0 ? 'text-primary' : (line.row.rankChange ?? 0) < 0 ? 'text-neutral-400' : 'text-neutral-300')}>
                {(line.row.rankChange ?? 0) > 0 ? '▲' : (line.row.rankChange ?? 0) < 0 ? '▼' : '—'}
              </span>
            </li>
          ))}
      </ul>
      {gap && <p className="border-t border-border px-4 py-2 text-xs text-text-muted">Cần thêm <strong className="font-semibold text-text">{n(gap.xp)} XP</strong> để vượt hạng {gap.rank}</p>}
    </div>
  );
}
