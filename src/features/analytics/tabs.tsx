import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Badge, Bar, KpiCell, Mini, MiniStrip, Panel, PanelSkeleton, SummaryStrip, TextLink } from '../../components/ui';
import { LineChart } from '../../components/charts';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { formatAgo } from '../../domains/admin-learners/mappers';
import { formatShopItemTypeLabel, MAX_COIN_PER_DAY } from '../../domains/shop/mappers';
import type { AdminShopItemDTO, ShopItemType } from '../../domains/shop/types';
import type { MissionTemplate } from '../../domains/admin-missions/types';
import { pct, seconds, THRESHOLDS } from '../../domains/admin-overview/mappers';
import type { AdminAnalytics, SegmentId } from '../../domains/admin-analytics/types';
import {
  ANALYTICS_THRESHOLDS, cardBreakdown, COIN_BAND, coinVerdict, cohortWeek, funnelSteps, isSmallSample, itemPerformance, missionIncome, rootAccuracy,
  streakDrop, sum, topicAccuracy, type Trend,
} from '../../domains/admin-analytics/mappers';
import { RELIABILITY_LABEL, scanErrorLabel } from '../../domains/scan/labels';

const n = (x: number) => x.toLocaleString('vi-VN');
const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const th = 'py-2 pr-3 font-medium';
const NEW_CARD_WARN = 0.3;

const Small: React.FC = () => <Badge tone="neutral" title={`Dưới ${ANALYTICS_THRESHOLDS.minAnswers} câu trả lời: tỉ lệ chưa đáng tin`}>mẫu nhỏ</Badge>;

/** Row that opens a screen: the whole row is the target, the name is a real link for new tabs. */
const go = (path: string) => () => navigate(path);
const RowLink: React.FC<{ to: string; className?: string; title?: string; children: React.ReactNode }> = ({ to, className, title, children }) => (
  <a href={to} title={title} className={className} onClick={(e) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  }}>{children}</a>
);

/* ── Học tập ───────────────────────────────────────────────────────────────── */

export const LearningTab: React.FC<{ a: AdminAnalytics }> = ({ a }) => {
  const { cards, daily, topics, hardWords } = a.learning;
  const cb = cardBreakdown(cards);
  const roots = rootAccuracy(topics);
  const rows = topicAccuracy(topics);
  const hard = rows.filter((t) => t.hard);
  const answers = sum(daily.map((d) => d.quizAnswers));
  const correct = sum(daily.map((d) => d.quizCorrect));
  const mastered = cb.rows[4];
  const maxAnswers = Math.max(...roots.map((r) => r.answers), 1);
  return (
    <div className="space-y-4">
      <SummaryStrip label="Chỉ số học tập">
        <KpiCell value={n(sum(daily.map((d) => d.reviews)))} label={`Lượt ôn thẻ · ${a.days} ngày`} spark={daily.map((d) => d.reviews)} />
        <KpiCell value={n(sum(daily.map((d) => d.newWords)))} label={`Từ mới lưu · ${a.days} ngày`} spark={daily.map((d) => d.newWords)} />
        <KpiCell value={n(answers)} of={`đúng ${pct(correct / Math.max(1, answers))}`} label="Câu trả lời quiz" spark={daily.map((d) => d.quizAnswers)} />
        <KpiCell value={n(cards.dueToday)} of={`/ ${n(cb.total)} thẻ`} label="Đến hạn ôn hôm nay" />
        <KpiCell value={n(mastered.count)} of={pct(mastered.share)} label="Thẻ thành thạo" />
      </SummaryStrip>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Trạng thái thẻ" meta={`${n(cb.total)} thẻ của mọi người học, tại thời điểm này`}>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-subtle" role="img" aria-label={cb.rows.map((r) => `${r.label} ${pct(r.share)}`).join(', ')}>
            {cb.rows.map((r) => <span key={r.key} style={{ width: `${r.share * 100}%`, backgroundColor: r.color }} />)}
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className={th}>Trạng thái</th><th className={cn(th, 'hidden sm:table-cell')}>Nghĩa là</th><th className={cn(th, 'text-right')}>Thẻ</th><th className="py-2 text-right font-medium">Tỉ lệ</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cb.rows.map((r) => {
                const warn = r.key === 'new' && r.share > NEW_CARD_WARN;
                return (
                  <tr key={r.key} title={`Trạng thái FSRS: ${r.code}`}>
                    <td className="py-1.5 pr-3"><span className="inline-flex items-center gap-2 font-medium text-text"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />{r.label}</span></td>
                    <td className="hidden py-1.5 pr-3 text-text-muted sm:table-cell">{r.rule}</td>
                    <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{n(r.count)}</td>
                    <td className={cn('py-1.5 text-right tabular-nums', warn ? 'font-semibold text-warning-dark' : 'text-text-muted')}>
                      {pct(r.share)}{warn && <span className="block text-2xs font-normal">trên ngưỡng {pct(NEW_CARD_WARN)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-text-muted">{n(cards.suspended)} thẻ tạm ngưng tính vào tổng nhưng không có dòng riêng.</p>
        </Panel>

        <Panel title="Độ chính xác quiz theo nhóm chủ đề" meta={`${a.days} ngày · thấp nhất trước`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-text-muted">
                <tr><th className={th}>Nhóm</th><th className={cn(th, 'text-right')}>Chủ đề con</th><th className={th}>Câu trả lời</th><th className="py-2 font-medium">Đúng</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roots.map((r) => {
                  const low = r.accuracy < ANALYTICS_THRESHOLDS.hardTopicRate;
                  return (
                    <tr key={r.rootId} onClick={go(r.path)} className="cursor-pointer hover:bg-surface-subtle/60">
                      <td className="py-2 pr-3"><RowLink to={r.path} className="font-medium text-text hover:underline">{r.rootName}</RowLink></td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{r.topics}{r.hard > 0 && <span className="ml-1.5 font-medium text-danger-dark">{r.hard} khó</span>}</td>
                      <td className="w-32 py-2 pr-3"><div className="flex items-center gap-2"><Bar value={r.answers} max={maxAnswers} tone="bg-border-strong" /><span className="w-10 text-right tabular-nums">{n(r.answers)}</span></div></td>
                      <td className="w-32 py-2"><div className="flex items-center gap-2"><Bar value={r.accuracy} max={1} tone={low ? 'bg-danger/60' : 'bg-primary'} /><span className={cn('w-12 text-right font-medium tabular-nums', low && 'text-danger-dark')}>{pct(r.accuracy)}</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted">Chữ đỏ: đúng dưới {pct(ANALYTICS_THRESHOLDS.hardTopicRate)}. Bấm một nhóm để mở trong Chủ đề.</p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Chủ đề khó" meta={hard.length ? `${hard.length} chủ đề con đúng dưới ${pct(ANALYTICS_THRESHOLDS.hardTopicRate)}` : `không có chủ đề con nào dưới ${pct(ANALYTICS_THRESHOLDS.hardTopicRate)}`}>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className={th}>Chủ đề con</th><th className={cn(th, 'text-right')}>Câu</th><th className={cn(th, 'hidden text-right sm:table-cell')}>Người học</th><th className="py-2 text-right font-medium">Đúng</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(0, 7).map((t) => (
                <tr key={t.topicId} onClick={go(t.path)} className="cursor-pointer hover:bg-surface-subtle/60">
                  <td className="min-w-[180px] py-2 pr-3">
                    <RowLink to={t.path} className={cn('block font-medium hover:underline', t.hard ? 'text-danger-dark' : 'text-text')}>{t.name}</RowLink>
                    <span className="block text-text-muted">{t.rootName}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{n(t.answers)}</td>
                  <td className="hidden py-2 pr-3 text-right tabular-nums text-text-muted sm:table-cell">{t.learners}</td>
                  <td className="w-36 py-2"><div className="flex items-center justify-end gap-2">{t.small ? <Small /> : <span className="w-16"><Bar value={t.accuracy} max={1} tone={t.hard ? 'bg-danger/60' : 'bg-primary'} /></span>}<span className="w-12 text-right font-medium tabular-nums">{pct(t.accuracy)}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-text-muted">Chỉ xét chủ đề có từ {ANALYTICS_THRESHOLDS.minAnswers} câu trả lời; ít hơn là mẫu nhỏ, xếp cuối.</p>
        </Panel>

        <Panel className="xl:col-span-7" title="Từ hay sai và hay quên" meta={`${a.days} ngày · sai nhiều nhất trước`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-border text-text-muted">
                <tr>
                  <th className={th}>Từ</th><th className={th}>Chủ đề</th><th className={cn(th, 'text-right')}>Câu</th><th className={th}>Tỉ lệ sai</th>
                  <th className={cn(th, 'text-right')} title="Số lần thẻ rớt khỏi vòng ôn từ trước tới nay, cộng trên mọi người học (FSRS lapses)">Quên</th><th className="py-2 text-right font-medium">Người học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hardWords.map((w) => {
                  const rate = w.wrong / Math.max(1, w.answers);
                  const topic = `/topics/${w.collectionId}/${w.rootId}/${w.topicId}`;
                  const word = `/dictionary/${encodeURIComponent(w.word)}`;
                  return (
                    <tr key={w.word}>
                      <td className="py-2 pr-3"><RowLink to={word} title="Mở trong Từ điển" className="font-semibold text-text underline decoration-border-strong underline-offset-2 hover:decoration-text">{w.word}</RowLink></td>
                      <td className="max-w-[180px] py-2 pr-3"><RowLink to={topic} className="block truncate text-text-muted hover:text-text hover:underline">{w.topicName}</RowLink></td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{n(w.answers)}</td>
                      <td className="w-36 py-2 pr-3"><div className="flex items-center gap-2"><Bar value={rate} max={1} tone="bg-danger/60" /><span className="w-12 text-right font-medium tabular-nums text-danger-dark">{pct(rate)}</span></div></td>
                      <td className="py-2 pr-3 text-right tabular-nums">{w.lapses}</td>
                      <td className="py-2 text-right tabular-nums text-text-muted">{w.learners}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted">Bấm vào từ để kiểm tra nghĩa và ví dụ trong Từ điển.</p>
        </Panel>
      </div>
    </div>
  );
};

/* ── Giữ chân ──────────────────────────────────────────────────────────────── */

const SEGMENTS: Record<SegmentId, { title: string; rule: string; action: string; urgent: boolean }> = {
  STREAK_AT_RISK: { title: 'Chuỗi sắp đứt', rule: 'Chuỗi từ 3 ngày, hôm nay chưa học', action: 'Nhắc ôn trước khi hết ngày', urgent: true },
  IDLE_8_30: { title: 'Ngừng học 8–30 ngày', rule: 'Lần học cuối cách đây 8–30 ngày', action: 'Mời quay lại; xem nhiệm vụ có quá khó không', urgent: true },
  NEVER_STUDIED: { title: 'Kích hoạt nhưng chưa học', rule: 'Đã kích hoạt, chưa có lần học nào', action: 'Xem lại hướng dẫn lần đầu', urgent: false },
  PENDING_EMAIL: { title: 'Chưa xác minh email', rule: 'Đã đăng ký, chưa kích hoạt tài khoản', action: 'Kiểm tra email xác minh có tới không', urgent: false },
};
const MILESTONES: { d: number; note: string }[] = [
  { d: 3, note: 'Ba ngày liền' }, { d: 7, note: 'Huy hiệu Một Tuần Bền Bỉ' }, { d: 14, note: 'Hai tuần liền' }, { d: 30, note: 'Huy hiệu Tháng Không Nghỉ' },
];

function cohortCell(active: number, size: number) {
  const r = size ? active / size : 0;
  if (!active) return 'text-text-light';
  if (r >= 0.6) return 'bg-primary/25 font-semibold text-primary-dark';
  if (r >= 0.4) return 'bg-primary/15 font-medium text-primary-dark';
  if (r >= 0.2) return 'bg-warning-light text-warning-dark';
  return 'bg-danger-light text-danger-dark';
}

export const RetentionTab: React.FC<{ a: AdminAnalytics }> = ({ a }) => {
  const { activated, cohorts, longestReached, segments } = a.retention;
  const small = isSmallSample(activated);
  const w1 = cohortWeek(cohorts, 1);
  const w4 = cohortWeek(cohorts, 4);
  const drop = streakDrop(longestReached);
  const reachable = segments.filter((s) => SEGMENTS[s.id].urgent).reduce((s, x) => s + x.count, 0);
  const week = (iso: string) => {
    const end = new Date(new Date(`${iso}T00:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
    return `${ddmm(iso)}–${ddmm(end)}`;
  };
  return (
    <div className="space-y-4">
      {small && (
        <p role="note" className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
          <strong className="font-semibold text-text">Mẫu nhỏ: {activated} người học đã kích hoạt</strong>, dưới ngưỡng {ANALYTICS_THRESHOLDS.minRetentionN} để đọc tỉ lệ giữ chân.
          Bảng cohort hiện số người; tỉ lệ % và so sánh giữa các cohort chỉ có khi đủ người.
        </p>
      )}

      <SummaryStrip label="Chỉ số giữ chân">
        <KpiCell value={activated} label="Người học đã kích hoạt" onClick={() => navigate('/learners')} />
        <KpiCell value={w1.active} of={`/ ${w1.size}`} label="Còn học ở tuần 1" />
        <KpiCell value={w4.active} of={`/ ${w4.size}`} label="Còn học ở tuần 4" />
        <KpiCell value={longestReached[6] ?? 0} of={`/ ${activated}`} label="Từng giữ chuỗi ≥ 7 ngày" />
        <KpiCell value={longestReached[29] ?? 0} of={`/ ${activated}`} label="Từng giữ chuỗi ≥ 30 ngày" />
      </SummaryStrip>

      <Panel title="Cohort theo tuần đăng ký" meta={small ? 'số người còn học ở tuần N sau đăng ký' : '% còn học ở tuần N sau đăng ký'}
        action={<span className="hidden text-xs text-text-muted sm:inline">Ô đậm hơn: còn học nhiều hơn</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-center text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className="py-2 pr-3 text-left font-medium">Tuần đăng ký</th><th className="px-2 py-2 font-medium">Người</th>{Array.from({ length: 8 }, (_, w) => <th key={w} className="px-1 py-2 font-medium">Tuần {w}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cohorts.map((c) => (
                <tr key={c.weekStart}>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-left font-medium tabular-nums text-text">{week(c.weekStart)}</td>
                  <td className="px-2 py-1.5 tabular-nums text-text-muted">{c.size}</td>
                  {Array.from({ length: 8 }, (_, w) => {
                    const v = c.active[w];
                    if (v === undefined || !c.size) return <td key={w} className="px-1 py-1.5 text-text-light">—</td>;
                    return (
                      <td key={w} className="p-0.5">
                        <span title={`${v}/${c.size} người${small ? '' : ` · ${pct(v / c.size)}`}`} className={cn('block rounded px-1 py-1 tabular-nums', cohortCell(v, c.size))}>{small ? v : pct(v / c.size)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-7" title="Chuỗi học đi được bao xa" meta={`số người từng giữ chuỗi ít nhất N ngày liền, trên ${activated} người`}>
          <LineChart height={170} showLegend={false} labels={longestReached.map((_, i) => `Ngày ${i + 1}`)}
            series={[{ name: 'Người học đã đạt', color: '#FF8A00', data: longestReached, fill: true }]}
            marks={drop.lost ? [{ index: drop.from - 1, note: `rơi ${drop.lost} người` }] : []} />
          {drop.lost > 0 && <p className="text-xs text-text-muted">Rơi nhiều nhất từ ngày {drop.from} sang ngày {drop.from + 1}: <span className="font-semibold text-text">{drop.lost} người</span> dừng chuỗi ở đó.</p>}
          <MiniStrip cols="grid-cols-2 sm:grid-cols-4">
            {MILESTONES.map((m) => <Mini key={m.d} value={<>{longestReached[m.d - 1] ?? 0}<span className="text-xs font-normal text-text-muted"> / {activated}</span></>} label={`Chuỗi ≥ ${m.d} ngày`} hint={m.note} />)}
          </MiniStrip>
        </Panel>

        <Panel className="xl:col-span-5" title="Nhóm cần chú ý" meta={`đếm tại thời điểm này · ${reachable} người kéo lại được ngay`}>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className={th}>Nhóm</th><th className={cn(th, 'text-right')}>Người</th><th className="py-2 font-medium">Gợi ý xử lý</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {segments.map((s) => {
                const m = SEGMENTS[s.id];
                return (
                  <tr key={s.id} className="align-top">
                    <td className="py-2 pr-3"><span className="block font-medium text-text">{m.title}</span><span className="text-text-muted">{m.rule}</span></td>
                    <td className={cn('py-2 pr-3 text-right text-base font-semibold tabular-nums', s.count && m.urgent ? 'text-warning-dark' : 'text-text')}>{s.count}</td>
                    <td className="py-2 text-text-muted">{m.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
};

/* ── Kinh tế ───────────────────────────────────────────────────────────────── */

const TREND: Record<Trend, React.ReactNode> = {
  up: <span className="inline-flex items-center gap-0.5 text-primary-dark"><ArrowUp size={12} />Tăng</span>,
  down: <span className="inline-flex items-center gap-0.5 text-danger-dark"><ArrowDown size={12} />Giảm</span>,
  flat: <span className="inline-flex items-center gap-0.5 text-text-muted"><Minus size={12} />Ổn định</span>,
  new: <span className="text-text">Mới có lượt mua</span>,
  none: <span className="text-text-light">—</span>,
};

/** Where the spent / earned ratio sits against the reading band: a scale, not a sentence. */
const BandScale: React.FC<{ ratio: number }> = ({ ratio }) => {
  const at = Math.min(1, Math.max(0, ratio)) * 100;
  return (
    <div aria-hidden className="pt-1">
      <div className="relative h-2 rounded-full bg-surface-subtle">
        <div className="absolute inset-y-0 rounded-full bg-primary/25" style={{ left: `${COIN_BAND.low * 100}%`, width: `${(COIN_BAND.high - COIN_BAND.low) * 100}%` }} />
        <div className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-text" style={{ left: `${at}%` }} />
      </div>
      <div className="relative mt-1 h-3 text-2xs tabular-nums text-text-light">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${COIN_BAND.low * 100}%` }}>{pct(COIN_BAND.low)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${COIN_BAND.high * 100}%` }}>{pct(COIN_BAND.high)}</span>
      </div>
    </div>
  );
};

export const EconomyTab: React.FC<{ a: AdminAnalytics; shop?: AdminShopItemDTO[]; shopPending: boolean; missions?: MissionTemplate[]; now: Date }> = ({ a, shop, shopPending, missions, now }) => {
  const d = a.economy.daily;
  const coinIn = sum(d.map((x) => x.coinIn));
  const coinOut = sum(d.map((x) => x.coinOut));
  const v = coinVerdict(coinIn, coinOut);
  const income = missionIncome(missions, a.economy.inByMission);
  const maxIncome = Math.max(...income.map((m) => m.coin), 1);
  const perf = shop ? itemPerformance(shop, a.economy.sales, now) : null;
  const peakIndex = d.reduce((m, x, i) => (x.coinOut > d[m].coinOut ? i : m), 0);
  const peak = d[peakIndex];
  const activated = a.retention.activated;
  const types = perf ? (Object.keys(perf.byType) as ShopItemType[]).map((t) => ({ t, coin: perf.byType[t] })).sort((x, y) => y.coin - x.coin) : [];
  return (
    <div className="space-y-4">
      <SummaryStrip label="Chỉ số kinh tế">
        <KpiCell value={`+${n(coinIn)}`} label={`Coin phát · ${a.days} ngày`} spark={d.map((x) => x.coinIn)} hint="Thưởng nhiệm vụ" />
        <KpiCell value={`−${n(coinOut)}`} label={`Coin tiêu · ${a.days} ngày`} spark={d.map((x) => x.coinOut)} hint="Mua vật phẩm" />
        <KpiCell value={pct(v.ratio)} label="Tiêu / phát" />
        <KpiCell value={n(a.economy.circulation)} label="Coin đang lưu hành" hint="Tổng số dư ví của người học đã kích hoạt" />
        <KpiCell value={n(Math.round(a.economy.circulation / Math.max(1, activated)))} label="Số dư TB/người" />
      </SummaryStrip>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-4" title="Cân bằng Coin" meta={`${a.days} ngày`}>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-text">{pct(v.ratio)}</span>
            <Badge tone={v.state === 'balanced' ? 'success' : 'warning'}>{v.label}</Badge>
          </div>
          <p className="text-xs text-text-muted">Phần Coin người học đã tiêu trên số Coin nhận được.</p>
          <BandScale ratio={v.ratio} />
          <p className="text-xs text-text-light">Vùng {pct(COIN_BAND.low)}–{pct(COIN_BAND.high)} là mốc đọc, không phải quy tắc.</p>
          <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
            <dt className="text-text-muted">Trần thưởng nhiệm vụ</dt><dd className="text-right tabular-nums text-text">{MAX_COIN_PER_DAY} Coin/người/ngày</dd>
            <dt className="text-text-muted">Điều chỉnh thủ công</dt><dd className="text-right text-text-light" title="ADMIN_ADJUSTMENT: được phép, kèm lý do và audit; chưa có API">Chưa hỗ trợ</dd>
          </dl>
        </Panel>

        <Panel className="xl:col-span-8" title="Coin phát và tiêu theo ngày" meta={`${a.days} ngày · phát = thưởng nhiệm vụ, tiêu = mua vật phẩm`}>
          <LineChart height={210} labels={d.map((x) => ddmm(x.date))} series={[
            { name: 'Phát', color: '#E0AB26', data: d.map((x) => x.coinIn) },
            { name: 'Tiêu', color: '#8A6100', data: d.map((x) => x.coinOut) },
          ]} marks={peak ? [{ index: peakIndex, note: 'tiêu nhiều nhất' }] : []} />
          <p className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
            <span>Phát trung bình <strong className="font-semibold tabular-nums text-text">{n(Math.round(coinIn / Math.max(1, d.length)))}</strong> Coin/ngày</span>
            {peak && <span>Ngày tiêu nhiều nhất <strong className="font-semibold tabular-nums text-text">{ddmm(peak.date)}</strong> (−{n(peak.coinOut)})</span>}
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Nguồn Coin vào" meta={`theo mẫu nhiệm vụ, ${a.days} ngày, gồm Coin dự phòng của quà vật phẩm`}>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className={th}>Mẫu nhiệm vụ</th><th className={th} /><th className={cn(th, 'text-right')}>Coin</th><th className="py-2 text-right font-medium">Tỉ trọng</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {income.map((m) => (
                <tr key={m.code} title={m.code} onClick={m.id ? go(`/missions/${m.id}`) : undefined} className={cn(m.id && 'cursor-pointer hover:bg-surface-subtle/60')}>
                  <td className="py-1.5 pr-3 font-medium text-text">{m.name}</td>
                  <td className="w-28 py-1.5 pr-3"><Bar value={m.coin} max={maxIncome} tone="bg-reward" /></td>
                  <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{n(m.coin)}</td>
                  <td className="py-1.5 text-right tabular-nums text-text-muted">{pct(m.share)}</td>
                </tr>
              ))}
              <tr title="ADMIN_ADJUSTMENT: được phép, kèm lý do và audit; chưa có API">
                <td className="py-1.5 pr-3 text-text-muted">Điều chỉnh thủ công</td>
                <td className="py-1.5 pr-3 text-text-light">chưa hỗ trợ</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-text-light">{n(a.economy.adjustments)}</td>
                <td className="py-1.5 text-right text-text-light">—</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Coin tiêu theo loại vật phẩm" meta={`${a.days} ngày`}>
          {perf ? (
            <ul className="space-y-3">
              {types.map(({ t, coin }) => (
                <li key={t} className="space-y-1 text-xs">
                  <div className="flex items-baseline gap-2"><span className="flex-1 font-medium text-text">{formatShopItemTypeLabel(t)}</span><span className="font-medium tabular-nums">{n(coin)}</span><span className="w-12 text-right tabular-nums text-text-muted">{pct(coin / Math.max(1, perf.totalCoin))}</span></div>
                  <Bar value={coin} max={Math.max(1, perf.totalCoin)} tone="bg-reward-dark" />
                </li>
              ))}
            </ul>
          ) : shopPending ? <PanelSkeleton rows={3} /> : <p className="text-xs text-text-muted">Không tải được catalog Cửa hàng.</p>}
        </Panel>
      </div>

      {perf ? (
        <Panel title="Hiệu quả vật phẩm" meta={`đang bán hoặc có lượt mua trong ${a.days} ngày · xu hướng so với ${a.days} ngày trước`} action={<TextLink to="/shop">Cửa hàng</TextLink>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-border text-text-muted">
                <tr><th className={th}>Vật phẩm</th><th className={th}>Trạng thái bán</th><th className={cn(th, 'text-right')}>Giá</th><th className={cn(th, 'text-right')}>Lượt mua</th><th className={cn(th, 'text-right')}>Coin tiêu</th><th className={th}>Tỉ trọng tiêu</th><th className="py-2 font-medium">Xu hướng</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perf.rows.map((r) => (
                  <tr key={r.item.id} title={r.item.code} onClick={go(`/shop/${r.item.id}`)} className="cursor-pointer hover:bg-surface-subtle/60">
                    <td className="py-2 pr-3"><span className="font-medium text-text">{r.item.name}</span><span className="ml-2 text-text-muted">{formatShopItemTypeLabel(r.item.type)}</span></td>
                    <td className="py-2 pr-3">{r.sale.state === 'ON_SALE' ? <span className="text-text-muted" title={r.sale.detail}>{r.sale.label}</span> : <Badge tone={r.sale.tone} title={r.sale.detail}>{r.sale.label}</Badge>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.item.price != null ? n(r.item.price) : <span className="text-text-light">—</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.unsold ? <Badge tone="warning">Chưa ai mua</Badge> : n(r.purchases)}</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums">{r.coin ? n(r.coin) : <span className="text-text-light">0</span>}</td>
                    <td className="w-32 py-2 pr-3"><div className="flex items-center gap-2"><Bar value={r.share} max={1} tone="bg-reward" /><span className="w-10 text-right tabular-nums text-text-muted">{pct(r.share)}</span></div></td>
                    <td className="py-2">{TREND[r.trend]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {perf.unsold.length > 0 && <p className="text-xs text-warning-dark">{perf.unsold.length} vật phẩm đang bán chưa ai mua trong {a.days} ngày.</p>}
        </Panel>
      ) : shopPending && <PanelSkeleton rows={6} />}
    </div>
  );
};

/* ── Scan ──────────────────────────────────────────────────────────────────── */

const RELIABILITY = [
  { key: 'HIGH', source: 'Phát hiện vật thể', codes: 'od, od_tile', color: 'bg-primary' },
  { key: 'MEDIUM', source: 'Định vị theo mô tả vùng ảnh', codes: 'self, dense', color: 'bg-info' },
  { key: 'LOW', source: 'Chú thích cả ảnh, dễ "thấy" vật không có', codes: 'base', color: 'bg-warning' },
] as const;

export const ScanTab: React.FC<{ a: AdminAnalytics; now: Date }> = ({ a, now }) => {
  const s = a.scan;
  const { steps, worst } = funnelSteps(s.funnel);
  const failed = sum(s.daily.map((x) => x.failed));
  const relTotal = Math.max(1, s.reliability.HIGH + s.reliability.MEDIUM + s.reliability.LOW);
  const maxErr = Math.max(...s.errors.map((e) => e.count), 1);
  const maxLabel = Math.max(...s.unmappedLabels.map((l) => l.scans), 1);
  const hotAt = Math.ceil((THRESHOLDS.unmappedScans7d * a.days) / 7);
  const w = steps[worst];
  const lossText: Record<string, string> = {
    withLabels: 'lượt bị lỗi hoặc AI không thấy vật nào.',
    withWord: 'lượt có nhãn nhưng từ điển không có từ khớp, nên người học không lưu được.',
    saved: 'lượt có từ nhưng người học không lưu.',
  };
  return (
    <div className="space-y-4">
      <SummaryStrip label="Chỉ số scan">
        <KpiCell value={n(s.funnel.submitted)} label={`Lượt scan · ${a.days} ngày`} spark={s.daily.map((x) => x.done + x.failed)} />
        <KpiCell value={pct(s.funnel.done / Math.max(1, s.funnel.submitted))} of={`${n(failed)} lỗi`} label="Xử lý thành công" spark={s.daily.map((x) => x.failed)} />
        <KpiCell value={seconds(s.latency.p95Ms)} label="Thời gian xử lý p95" />
        <KpiCell value={s.unmappedLabels.length} label="Nhãn chưa có từ" onClick={() => navigate('/ai-scan')} />
        <KpiCell value={s.quotaHitLearners} of={`quota ${s.config.quotaPerDay}/ngày`} label="Người từng hết lượt" />
      </SummaryStrip>

      <Panel title="Phễu scan → từ học" meta={`${a.days} ngày · hoàn tất phễu ${pct(steps[steps.length - 1].fromStart)}`}>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-text-muted">
            <tr><th className={th}>Bước</th><th className={th}>Số lượt</th><th className={cn(th, 'text-right')}>Từ bước trước</th><th className="py-2 text-right font-medium">Mất</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {steps.map((st, i) => (
              <tr key={st.key} title={st.hint} className={cn(i === worst && 'bg-warning-light/50')}>
                <td className="py-2 pr-3">
                  <span className="mr-2 tabular-nums text-text-light">{i + 1}</span><span className="font-medium text-text">{st.label}</span>
                  {i === worst && <span className="ml-2 font-medium text-warning-dark">mất nhiều nhất</span>}
                </td>
                <td className="w-[40%] py-2 pr-3"><div className="flex items-center gap-2"><Bar value={st.count} max={Math.max(1, s.funnel.submitted)} tone={i === worst ? 'bg-warning' : 'bg-snapy'} /><span className="w-14 text-right font-medium tabular-nums">{n(st.count)}</span></div></td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{i ? pct(st.fromPrev) : '—'}</td>
                <td className={cn('py-2 text-right tabular-nums', i === worst ? 'font-semibold text-warning-dark' : 'text-text-muted')}>{i && st.lost ? `−${n(st.lost)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {w && lossText[w.key] && <p className="text-xs text-text-muted">Ở bước “{w.label}”: <span className="font-semibold text-text">{n(w.lost)}</span> {lossText[w.key]}</p>}
        {s.funnel.saved === null && <p className="text-xs text-text-muted">Bước “Lưu thành từ học” chưa đo được: máy chủ chưa ghi từ nào được lưu từ lượt scan nào.</p>}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Độ tin cậy nhãn" meta="theo nguồn sinh ra nhãn">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-border">
              {RELIABILITY.map((r) => {
                const c = s.reliability[r.key];
                return (
                  <tr key={r.key} title={`Nguồn: ${r.codes}`}>
                    <td className="py-2 pr-3"><span className="flex items-center gap-2 font-medium text-text"><span className={cn('h-2 w-2 rounded-sm', r.color)} />{RELIABILITY_LABEL[r.key]}</span><span className="block text-text-muted">{r.source}</span></td>
                    <td className="w-32 py-2 pr-3"><Bar value={c} max={relTotal} tone={r.color} /></td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums">{pct(c / relTotal)}</td>
                    <td className="py-2 text-right tabular-nums text-text-muted">{n(c)} nhãn</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-text-muted">
            Người học đang thấy nhãn từ mức <span className="font-semibold text-text">{RELIABILITY_LABEL[s.config.minReliability].toLowerCase()}</span>
            {s.config.minReliability === 'LOW' ? ', tức là thấy cả nhãn độ tin cậy thấp.' : '; nhãn thấp hơn bị ẩn.'} Không có % độ tin cậy: AI chỉ xếp mức theo nguồn.
          </p>
        </Panel>

        <Panel title="Thời gian xử lý và lỗi" meta={`${a.days} ngày · từ lúc worker nhận ảnh tới khi có kết quả`}>
          <MiniStrip cols="grid-cols-3">
            <Mini value={seconds(s.latency.p50Ms)} label="p50" />
            <Mini value={seconds(s.latency.p95Ms)} label="p95" bad={s.latency.p95Ms !== null && s.latency.p95Ms > THRESHOLDS.scanP95Ms} hint={`Ngưỡng gợi ý ${seconds(THRESHOLDS.scanP95Ms)}`} />
            <Mini value={seconds(s.latency.p99Ms)} label="p99" />
          </MiniStrip>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted"><tr><th className={th}>Lỗi · {n(failed)} lượt</th><th className={th} /><th className="py-2 text-right font-medium">Lượt</th></tr></thead>
            <tbody className="divide-y divide-border">
              {s.errors.map((e) => (
                <tr key={e.code} title={e.code}>
                  <td className="py-1.5 pr-3 text-text">{scanErrorLabel(e.code)}</td>
                  <td className="w-32 py-1.5 pr-3"><Bar value={e.count} max={maxErr} tone="bg-danger/60" /></td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!s.errors.length && <p className="text-xs text-text-muted">Không có lượt lỗi.</p>}
          <p className="text-xs text-text-muted">Máy chủ: {s.config.workers} worker, hàng đợi {s.config.queueCapacity} chỗ, quota {s.config.quotaPerDay} lượt/người/ngày, mô hình <span className="font-mono">{s.modelVersion ?? '—'}</span>.</p>
        </Panel>
      </div>

      <Panel title="Nhãn chưa có từ" meta={`${a.days} ngày · đậm khi từ ${hotAt} lượt`} action={<TextLink to="/ai-scan">AI Scan</TextLink>}>
        <p className="text-xs text-text-muted">AI nhận ra vật nhưng từ điển không có từ khớp, nên người học không lưu được.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr><th className={th}>Nhãn AI</th><th className={th}>Lượt scan</th><th className={cn(th, 'text-right')}>Người học</th><th className="py-2 font-medium">Gặp lần cuối</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.unmappedLabels.map((l) => {
                const hot = l.scans >= hotAt;
                return (
                  <tr key={l.label}>
                    <td className={cn('py-2 pr-3 font-mono', hot ? 'font-semibold text-text' : 'text-text-muted')}>{l.label}</td>
                    <td className="w-56 py-2 pr-3"><div className="flex items-center gap-2"><Bar value={l.scans} max={maxLabel} tone={hot ? 'bg-snapy' : 'bg-border-strong'} /><span className="w-8 text-right font-medium tabular-nums">{l.scans}</span></div></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{l.learners}</td>
                    <td className="py-2 tabular-nums text-text-muted">{formatAgo(l.lastSeen, now)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!s.unmappedLabels.length && <p className="py-3 text-center text-xs text-text-muted">Mọi nhãn đều có từ.</p>}
        </div>
      </Panel>
    </div>
  );
};
