import React from 'react';
import { Check } from 'lucide-react';
import { Bar, Button, Mini, MiniStrip, Panel, SourceError, TextLink } from '../../components/ui';
import { AreaChart, LineChart } from '../../components/charts';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { formatAgo } from '../../domains/admin-learners/mappers';
import { deriveSaleState, formatVnDateTime, MAX_COIN_PER_DAY, type SaleState } from '../../domains/shop/mappers';
import type { AdminShopItemDTO } from '../../domains/shop/types';
import type { MissionTemplate } from '../../domains/admin-missions/types';
import { catalogSummary, categoryLabels, dailyOutlook } from '../../domains/admin-missions/mappers';
import { openIssues, pct, seconds, THRESHOLDS, type ChangeEvent, type Check as Rule, type CheckArea, type Severity } from '../../domains/admin-overview/mappers';
import type { AdminOverview } from '../../domains/admin-overview/types';
import { COIN_BAND, coinVerdict } from '../../domains/admin-analytics/mappers';
import { RELIABILITY_LABEL, scanErrorLabel } from '../../domains/scan/labels';

const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const n = (x: number) => x.toLocaleString('vi-VN');

/** Sub-heading of a column inside a band: same weight as running text, no rule. */
const ColumnTitle: React.FC<{ children: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode }> = ({ children, meta, action }) => (
  <div className="flex items-baseline justify-between gap-3">
    <h3 className="text-body font-semibold text-text">{children}{meta && <span className="ml-2 text-xs font-normal text-text-muted">{meta}</span>}</h3>
    {action}
  </div>
);

/* ── Cần xử lý ─────────────────────────────────────────────────────────────── */

const SEVERITY: Record<Severity, { label: string; dot: string; text: string }> = {
  danger: { label: 'Nghiêm trọng', dot: 'bg-danger', text: 'text-danger-dark' },
  warning: { label: 'Cảnh báo', dot: 'bg-warning', text: 'text-warning-dark' },
  info: { label: 'Lưu ý', dot: 'bg-info', text: 'text-info-dark' },
};
const AREA: Record<CheckArea, string> = { MISSIONS: 'Nhiệm vụ', SHOP: 'Cửa hàng', SCAN: 'AI Scan' };

/**
 * The page starts with work, not numbers: every broken rule as one row, worst first, each with the screen that fixes it.
 * Rows computed from sample data say so inline: acting on them is the one place a sample number could mislead.
 */
export const ActionCenter: React.FC<{ checks: Rule[]; pending: string[]; failed: { what: string; retry: () => void }[] }> = ({ checks, pending, failed }) => {
  const issues = openIssues(checks);
  const count = (s: Severity) => issues.filter((i) => i.issue.severity === s).length;
  const passed = checks.length - issues.length;
  return (
    <section aria-labelledby="todo-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] lg:divide-x lg:divide-border">
        <div className="min-w-0">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-2 pt-3.5">
            <h2 id="todo-title" className="text-sm font-semibold text-text">Cần xử lý</h2>
            <span className="text-xs text-text-muted">
              {issues.length ? `${issues.length} việc` : 'Không có việc nào'}
              {(['danger', 'warning', 'info'] as const).map((s) => count(s) > 0 && (
                <span key={s} className={cn('ml-2 font-medium', SEVERITY[s].text)}>{count(s)} {SEVERITY[s].label.toLowerCase()}</span>
              ))}
            </span>
          </header>
          {failed.length > 0 && <div className="space-y-2 px-4 pb-3">{failed.map((f) => <SourceError key={f.what} what={f.what} onRetry={f.retry} />)}</div>}
          {issues.length > 0 ? (
            <ol className="divide-y divide-border border-t border-border">
              {issues.map(({ id, area, scope, issue }) => {
                const sev = SEVERITY[issue.severity];
                return (
                  <li key={id} className="flex items-start gap-3 px-4 py-3">
                    <span aria-hidden className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-sm', sev.dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className={cn('font-medium', sev.text)}>{sev.label}</span>
                        <span className="text-text-muted"> · {AREA[area]}</span>
                        {scope === 'MOCK' && <span className="text-text-light" title="Quy tắc này đọc số liệu mẫu, chưa phải số liệu thật"> · dữ liệu mẫu</span>}
                      </p>
                      <p className="text-body font-semibold text-text">{issue.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{issue.detail}</p>
                    </div>
                    <Button size="sm" className="mt-0.5" onClick={() => navigate(issue.path)}>{issue.cta}</Button>
                  </li>
                );
              })}
            </ol>
          ) : pending.length === 0 && failed.length === 0 && (
            <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-body text-text-muted"><Check size={16} className="text-primary-dark" />Đã kiểm {checks.length} quy tắc, tất cả đạt.</p>
          )}
          {pending.length > 0 && <p role="status" className="px-4 pb-3 text-xs text-text-muted">Đang tải {pending.join(', ')}…</p>}
        </div>

        <aside aria-label="Quy tắc đã kiểm" className="border-t border-border bg-background/60 px-4 py-3.5 lg:border-t-0">
          <h3 className="text-xs font-semibold text-text">Quy tắc đã kiểm <span className="font-normal text-text-muted">{checks.length} quy tắc · {passed} đạt</span></h3>
          {(Object.keys(AREA) as CheckArea[]).map((area) => {
            const rows = checks.filter((c) => c.area === area);
            if (!rows.length) return null;
            return (
              <div key={area} className="mt-3">
                <p className="text-xs font-medium text-text-muted">{AREA[area]}</p>
                <ul className="mt-1 space-y-1">
                  {rows.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-xs">
                      {c.issue
                        ? <span aria-label={SEVERITY[c.issue.severity].label} className={cn('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-sm', SEVERITY[c.issue.severity].dot)} />
                        : <Check size={12} aria-label="Đạt" className="mt-0.5 shrink-0 text-text-light" />}
                      <span className={c.issue ? 'text-text' : 'text-text-muted'}>{c.rule}{c.scope === 'MOCK' && <span className="text-text-light"> (mẫu)</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="mt-3 text-xs text-text-light">Ngưỡng là gợi ý vận hành, không chặn thao tác.</p>
        </aside>
      </div>
    </section>
  );
};

/* ── Vận hành scan ─────────────────────────────────────────────────────────── */

export const ScanBand: React.FC<{ o: AdminOverview }> = ({ o }) => {
  const { today, config, daily, errors7d } = o.scan;
  const rate = today.total ? today.failed / today.total : 0;
  const maxErr = Math.max(...errors7d.map((e) => e.count), 1);
  const errSum = errors7d.reduce((s, e) => s + e.count, 0);
  const maxLabel = Math.max(...o.unmappedLabels.map((l) => l.scans7d), 1);
  return (
    <Panel title="Vận hành scan" meta="hôm nay và 14 ngày" action={<TextLink to="/ai-scan">AI Scan</TextLink>} bodyClassName="p-0 pt-0 gap-0">
      <div className="grid xl:grid-cols-12 xl:divide-x xl:divide-border">
        <div className="min-w-0 space-y-4 p-4 pt-3 xl:col-span-8">
          <MiniStrip cols="grid-cols-3 sm:grid-cols-6">
            <Mini value={n(today.total)} label="Lượt hôm nay" />
            <Mini value={pct(1 - rate)} label="Thành công" bad={rate > THRESHOLDS.scanErrorRate} hint={`${today.failed} lượt lỗi · ngưỡng lỗi ${pct(THRESHOLDS.scanErrorRate)}`} />
            <Mini value={seconds(today.p50Ms)} label="Thời gian p50" />
            <Mini value={seconds(today.p95Ms)} label="Thời gian p95" bad={today.p95Ms > THRESHOLDS.scanP95Ms} hint={`Ngưỡng ${seconds(THRESHOLDS.scanP95Ms)}`} />
            <Mini value={`${today.queueFull} lần`} label="Hàng đợi đầy" bad={today.queueFull > 0} />
            <Mini value={`${today.quotaHit} người`} label="Hết lượt" hint={`Quota ${config.quotaPerDay} lượt/người/ngày`} />
          </MiniStrip>
          <LineChart height={150} labels={daily.map((d) => ddmm(d.date))} series={[
            { name: 'Hoàn tất', color: '#6B7280', data: daily.map((d) => d.done) },
            { name: 'Lỗi', color: '#DC2626', data: daily.map((d) => d.failed) },
          ]} />
          <div>
            <ColumnTitle meta={`7 ngày · ${errSum} lượt`}>Lỗi scan</ColumnTitle>
            <table className="mt-1.5 w-full text-left text-xs">
              <tbody className="divide-y divide-border">
                {errors7d.map((e) => (
                  <tr key={e.code} title={e.code}>
                    <td className="py-1.5 pr-3 text-text">{scanErrorLabel(e.code)}</td>
                    <td className="w-40 py-1.5 pr-3"><Bar value={e.count} max={maxErr} tone="bg-danger/60" /></td>
                    <td className="w-10 py-1.5 text-right font-medium tabular-nums">{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted">Máy chủ: {config.workers} worker, hàng đợi {config.queueCapacity} chỗ, quota {config.quotaPerDay} lượt/người/ngày, hiện nhãn từ độ tin cậy {RELIABILITY_LABEL[config.minReliability].toLowerCase()}. Lượt lỗi không trừ quota.</p>
        </div>

        <div className="min-w-0 space-y-2 border-t border-border p-4 pt-3 xl:col-span-4 xl:border-t-0">
          <ColumnTitle meta={`7 ngày · đậm khi từ ${THRESHOLDS.unmappedScans7d} lượt`}>Nhãn chưa có từ</ColumnTitle>
          <p className="text-xs text-text-muted">AI nhận ra vật nhưng từ điển không có từ khớp, nên người học không lưu được.</p>
          <table className="w-full text-left text-xs">
            <thead className="text-text-muted">
              <tr className="border-b border-border"><th className="py-1.5 font-medium">Nhãn AI</th><th className="py-1.5 font-medium">Lượt scan</th><th className="py-1.5 text-right font-medium">Người học</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {o.unmappedLabels.map((l) => {
                const hot = l.scans7d >= THRESHOLDS.unmappedScans7d;
                return (
                  <tr key={l.label}>
                    <td className={cn('py-1.5 pr-3 font-mono', hot ? 'font-semibold text-text' : 'text-text-muted')}>{l.label}</td>
                    <td className="py-1.5 pr-3"><div className="flex items-center gap-2"><Bar value={l.scans7d} max={maxLabel} tone={hot ? 'bg-snapy' : 'bg-border-strong'} /><span className="w-6 text-right font-medium tabular-nums">{l.scans7d}</span></div></td>
                    <td className="py-1.5 text-right tabular-nums text-text-muted">{l.learners}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
};

/* ── Nhịp học + nhiệm vụ ───────────────────────────────────────────────────── */

const range = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}–${b}`);

export const LearningBand: React.FC<{ o?: AdminOverview; missions?: MissionTemplate[]; missionsPending: boolean }> = ({ o, missions, missionsPending }) => {
  const l = o?.learners;
  return (
    <Panel title="Nhịp học" meta={l ? `mẫu số ${l.activated} tài khoản đã kích hoạt` : undefined} action={<TextLink to="/learners">Người học</TextLink>} bodyClassName="p-0 pt-0 gap-0">
      <div className="grid xl:grid-cols-12 xl:divide-x xl:divide-border">
        {l && (
          <div className="min-w-0 space-y-3 p-4 pt-3 xl:col-span-7">
            <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span><span className="text-figure tabular-nums">{l.activeToday}</span><span className="text-body text-text-muted"> / {l.activated} học hôm nay</span></span>
              <span><span className="text-base font-semibold tabular-nums">{l.active7d}</span><span className="text-body text-text-muted"> / {l.activated} trong 7 ngày ({pct(l.active7d / Math.max(1, l.activated))})</span></span>
            </p>
            <AreaChart height={140} name="Người học" color="#58CC02" data={l.daily.map((d) => ({ label: ddmm(d.date), value: d.active, subValue: `${d.active}/${l.activated} người học` }))} />
            <div>
              <ColumnTitle meta="tính đến hiện tại">Hôm nay</ColumnTitle>
              <MiniStrip cols="mt-1.5 grid-cols-2 sm:grid-cols-5">
                <Mini value={n(l.today.newWords)} label="Từ mới lưu" />
                <Mini value={n(l.today.reviews)} label="Lượt ôn thẻ" />
                <Mini value={n(l.today.quizzes)} label="Bài quiz" />
                <Mini value={n(l.today.missionsCompleted)} label="Nhiệm vụ xong" />
                <Mini value={<>{l.today.fullSets}<span className="text-xs font-normal text-text-muted"> / {l.activeToday}</span></>} label="Xong đủ 5/5" hint="Người hoàn thành đủ 5 nhiệm vụ / người học hôm nay" />
              </MiniStrip>
            </div>
          </div>
        )}
        <div className={cn('min-w-0 space-y-3 p-4 pt-3', l ? 'border-t border-border xl:col-span-5 xl:border-t-0' : 'xl:col-span-12')}>
          {missions ? <MissionsColumn missions={missions} o={o} /> : missionsPending && <div role="status" className="h-40 animate-pulse rounded bg-surface-subtle" />}
        </div>
      </div>
    </Panel>
  );
};

const MissionsColumn: React.FC<{ missions: MissionTemplate[]; o?: AdminOverview }> = ({ missions, o }) => {
  const s = catalogSummary(missions);
  const outlook = dailyOutlook(missions);
  const active = missions.filter((m) => m.isActive);
  const stat = (code: string) => o?.missions.find((m) => m.code === code);
  const catalog = s.inactive ? { text: 'Chưa kích hoạt', tone: 'text-text-muted' } : s.valid ? { text: 'Đủ cấp 5 nhiệm vụ/ngày', tone: 'text-primary-dark' } : { text: 'Không đủ cấp 5 nhiệm vụ/ngày', tone: 'text-danger-dark' };
  return (
    <>
      <ColumnTitle meta={<span className={catalog.tone}>{catalog.text}</span>} action={<TextLink to="/missions">Nhiệm vụ</TextLink>}>Nhiệm vụ hằng ngày</ColumnTitle>
      <MiniStrip cols="grid-cols-3">
        <Mini value={`${active.length} / ${missions.length}`} label="Mẫu đang bật" />
        <Mini value={outlook.coin ? range(outlook.coin) : '—'} label="Coin mỗi người/ngày" bad={!!outlook.coin && outlook.coin[1] > MAX_COIN_PER_DAY} hint={`Trần đã duyệt ${MAX_COIN_PER_DAY} Coin/ngày`} />
        <Mini value={outlook.xp ? range(outlook.xp) : '—'} label="XP mỗi người/ngày" />
      </MiniStrip>
      <div>
        <p className="text-xs font-medium text-text-muted">Tỉ lệ hoàn thành 7 ngày{o && <span className="font-normal text-text-light"> · dữ liệu mẫu</span>}</p>
        <table className="mt-1 w-full text-left text-xs">
          <tbody className="divide-y divide-border">
            {active.map((m) => {
              const st = stat(m.code);
              const rate = st && st.assigned7d ? st.completed7d / st.assigned7d : null;
              const low = rate !== null && st!.assigned7d >= THRESHOLDS.missionMinAssigned && rate < THRESHOLDS.missionMinRate;
              return (
                <tr key={m.id} onClick={() => navigate(`/missions/${m.id}`)} className="cursor-pointer hover:bg-surface-subtle/60">
                  <td className="py-1.5 pr-3">
                    <span className={cn('block truncate font-medium', low ? 'text-danger-dark' : 'text-text')}>{m.name}</span>
                    <span className="text-text-muted">{categoryLabels[m.category]}</span>
                  </td>
                  <td className="w-24 py-1.5 pr-3">{rate !== null && <Bar value={rate} max={1} tone={low ? 'bg-danger/60' : 'bg-primary'} />}</td>
                  <td className="w-20 py-1.5 text-right tabular-nums">
                    {rate !== null ? <><span className="font-medium">{pct(rate)}</span><span className="block text-text-muted">{st!.completed7d}/{st!.assigned7d}</span></> : <span className="text-text-light">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!active.length && <p className="py-3 text-xs text-text-muted">Chưa có mẫu nào đang bật.</p>}
      </div>
    </>
  );
};

/* ── Kinh tế: Coin + Cửa hàng ──────────────────────────────────────────────── */

const SALE_ORDER: { state: SaleState; label: string; color: string }[] = [
  { state: 'ON_SALE', label: 'Đang bán', color: 'bg-primary' },
  { state: 'UPCOMING', label: 'Chờ mở bán', color: 'bg-info' },
  { state: 'REWARD_ONLY', label: 'Chỉ làm quà', color: 'bg-reward' },
  { state: 'DRAFT', label: 'Nháp', color: 'bg-neutral-400' },
  { state: 'ENDED', label: 'Hết hạn', color: 'bg-neutral-300' },
  { state: 'ARCHIVED', label: 'Lưu trữ', color: 'bg-neutral-200' },
];

export const EconomyBand: React.FC<{ o?: AdminOverview; shop?: AdminShopItemDTO[]; shopPending: boolean; now: Date }> = ({ o, shop, shopPending, now }) => (
  <Panel title="Kinh tế Coin" meta={o ? '14 ngày' : undefined} action={<TextLink to="/analytics/economy">Phân tích kinh tế</TextLink>} bodyClassName="p-0 pt-0 gap-0">
    <div className="grid xl:grid-cols-12 xl:divide-x xl:divide-border">
      {o && <div className="min-w-0 space-y-3 p-4 pt-3 xl:col-span-7"><CoinColumn o={o} /></div>}
      <div className={cn('min-w-0 space-y-3 p-4 pt-3', o ? 'border-t border-border xl:col-span-5 xl:border-t-0' : 'xl:col-span-12')}>
        {shop ? <ShopColumn shop={shop} o={o} now={now} /> : shopPending && <div role="status" className="h-40 animate-pulse rounded bg-surface-subtle" />}
      </div>
    </div>
  </Panel>
);

const CoinColumn: React.FC<{ o: AdminOverview }> = ({ o }) => {
  const d = o.economy.daily;
  const last7 = d.slice(-7);
  const coinIn = last7.reduce((s, x) => s + x.coinIn, 0);
  const coinOut = last7.reduce((s, x) => s + x.coinOut, 0);
  const verdict = coinVerdict(coinIn, coinOut);
  return (
    <>
      <MiniStrip cols="grid-cols-2 sm:grid-cols-4">
        <Mini value={`+${n(coinIn)}`} label="Phát · 7 ngày" hint="Thưởng nhiệm vụ" />
        <Mini value={`−${n(coinOut)}`} label="Tiêu · 7 ngày" hint="Mua vật phẩm" />
        <Mini value={pct(verdict.ratio)} label="Tiêu / phát" />
        <Mini value={n(o.economy.avgBalance)} label="Số dư TB/người" />
      </MiniStrip>
      <LineChart height={150} labels={d.map((x) => ddmm(x.date))} series={[
        { name: 'Phát (thưởng nhiệm vụ)', color: '#E0AB26', data: d.map((x) => x.coinIn) },
        { name: 'Tiêu (mua vật phẩm)', color: '#8A6100', data: d.map((x) => x.coinOut) },
      ]} />
      <p className="text-xs text-text-muted">
        <span className={cn('font-semibold', verdict.state === 'balanced' ? 'text-primary-dark' : 'text-warning-dark')}>{verdict.label}.</span>{' '}
        Người học tiêu {pct(verdict.ratio)} số Coin nhận được trong 7 ngày; vùng tham chiếu {pct(COIN_BAND.low)}–{pct(COIN_BAND.high)}.
      </p>
    </>
  );
};

const ShopColumn: React.FC<{ shop: AdminShopItemDTO[]; o?: AdminOverview; now: Date }> = ({ shop, o, now }) => {
  const states = shop.map((i) => ({ i, s: deriveSaleState(i, now).state }));
  const total = Math.max(1, shop.length);
  const byCode = new Map(shop.map((i) => [i.code, i]));
  const sold = (o?.shopSales30d ?? []).map((x) => ({ ...x, item: byCode.get(x.code) })).filter((x) => x.item).sort((a, b) => b.purchases - a.purchases);
  const maxSold = Math.max(...sold.map((x) => x.purchases), 1);
  const unsold = o ? states.filter((x) => x.s === 'ON_SALE' && !o.shopSales30d.some((s) => s.code === x.i.code && s.purchases > 0)).map((x) => x.i) : [];
  return (
    <>
      <ColumnTitle meta={`${shop.length} vật phẩm`} action={<TextLink to="/shop">Cửa hàng</TextLink>}>Cửa hàng</ColumnTitle>
      <div>
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-subtle" role="img" aria-label={SALE_ORDER.map((x) => `${x.label} ${states.filter((s) => s.s === x.state).length}`).join(', ')}>
          {SALE_ORDER.map((x) => <span key={x.state} className={x.color} style={{ width: `${(states.filter((s) => s.s === x.state).length / total) * 100}%` }} />)}
        </div>
        <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
          {SALE_ORDER.map((x) => {
            const c = states.filter((s) => s.s === x.state).length;
            return <li key={x.state} className={cn('flex items-center gap-1.5', c ? 'text-text' : 'text-text-light')}><span className={cn('h-1.5 w-1.5 rounded-full', x.color)} />{x.label}<span className="ml-auto font-medium tabular-nums">{c}</span></li>;
          })}
        </ul>
      </div>
      {o && (
        <div>
          <p className="text-xs font-medium text-text-muted">Bán chạy 30 ngày <span className="font-normal text-text-light">· dữ liệu mẫu</span></p>
          <ul className="mt-1.5 space-y-1">
            {sold.map((x) => (
              <li key={x.code}>
                <button type="button" onClick={() => navigate(`/shop/${x.item!.id}`)} className="flex w-full items-center gap-2 rounded text-left text-xs hover:bg-surface-subtle/60">
                  <span className="min-w-0 flex-1 truncate text-text">{x.item!.name}</span>
                  <span className="w-24 shrink-0"><Bar value={x.purchases} max={maxSold} tone="bg-reward" /></span><span className="w-8 text-right font-medium tabular-nums">{x.purchases}</span>
                </button>
              </li>
            ))}
            {!sold.length && <li className="text-xs text-text-muted">Chưa có lượt mua nào khớp catalog hiện tại.</li>}
          </ul>
          {unsold.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              <span className="font-medium text-warning-dark">Đang bán nhưng chưa ai mua:</span>{' '}
              {unsold.map((i, k) => <React.Fragment key={i.id}>{k > 0 && ', '}<a href={`/shop/${i.id}`} onClick={(e) => { e.preventDefault(); navigate(`/shop/${i.id}`); }} className="text-text underline-offset-2 hover:underline">{i.name}</a></React.Fragment>)}
            </p>
          )}
        </div>
      )}
    </>
  );
};

/* ── Thay đổi gần đây ──────────────────────────────────────────────────────── */

export const RecentChangesPanel: React.FC<{ events: ChangeEvent[]; now: Date }> = ({ events, now }) => (
  <Panel title="Thay đổi gần đây" meta="mốc thời gian thật · chưa ghi được ai sửa" action={<TextLink to="/activity-log">Nhật ký hoạt động</TextLink>}>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-text-muted">
          <tr><th className="py-2 pr-3 font-medium">Thời điểm</th><th className="py-2 pr-3 font-medium">Khu vực</th><th className="py-2 pr-3 font-medium">Đối tượng</th><th className="py-2 pr-3 font-medium">Sự kiện</th><th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Phiên bản</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((e) => (
            <tr key={`${e.path}-${e.event}`} onClick={() => navigate(e.path)} className="cursor-pointer hover:bg-surface-subtle/60">
              <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-text-muted" title={formatVnDateTime(e.at)}>{formatAgo(e.at, now)}</td>
              <td className="whitespace-nowrap py-2 pr-3 text-text-muted">{e.area === 'SHOP' ? 'Cửa hàng' : 'Nhiệm vụ'}</td>
              <td className="py-2 pr-3"><span className="font-medium text-text">{e.name}</span> <span className="ml-1 font-mono text-2xs text-text-light">{e.code}</span></td>
              <td className="whitespace-nowrap py-2 pr-3">{e.event}</td>
              <td className="hidden py-2 pr-3 text-right tabular-nums text-text-muted sm:table-cell">v{e.version}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && <p className="py-4 text-center text-xs text-text-muted">Chưa có thay đổi nào.</p>}
    </div>
  </Panel>
);
