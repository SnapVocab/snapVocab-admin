import React, { useState } from 'react';
import { Download, RotateCw } from 'lucide-react';
import { Button, PageHeader, PanelSkeleton, SampleDataNotice, SourceError } from '../../components/ui';
import { navigate } from '../../lib/router';
import { cn, downloadCsv } from '../../lib/utils';
import { useAnalytics } from '../../domains/admin-analytics/queries';
import { analyticsUsesFixtures } from '../../domains/admin-analytics/api';
import { ANALYTICS_THRESHOLDS, cohortWeek, funnelSteps, isSmallSample, itemPerformance, toCsv, topicAccuracy } from '../../domains/admin-analytics/mappers';
import type { AdminAnalytics, AnalyticsDays } from '../../domains/admin-analytics/types';
import type { AdminShopItemDTO } from '../../domains/shop/types';
import { useShopCatalog } from '../../domains/shop/queries';
import { useMissionTemplates } from '../../domains/admin-missions/queries';
import { EconomyTab, LearningTab, RetentionTab, ScanTab } from './tabs';

type TabId = 'learning' | 'retention' | 'economy' | 'scan';
const TABS: { id: TabId; label: string; question: string }[] = [
  { id: 'learning', label: 'Học tập', question: 'Người học có nhớ từ không, chủ đề nào khó?' },
  { id: 'retention', label: 'Giữ chân', question: 'Người học có quay lại không?' },
  { id: 'economy', label: 'Kinh tế', question: 'Coin có cân, vật phẩm nào bán được?' },
  { id: 'scan', label: 'Scan', question: 'Scan có ra từ học được không?' },
];
const PERIODS: AnalyticsDays[] = [7, 30, 90];

/** One CSV per tab: the table an operator would paste into a weekly report. */
function csvFor(tab: TabId, a: AdminAnalytics, shop: AdminShopItemDTO[] | undefined, now: Date) {
  if (tab === 'learning') return [['Nhóm', 'Chủ đề', 'Câu trả lời', 'Đúng', 'Tỉ lệ đúng'], ...topicAccuracy(a.learning.topics).map((t) => [t.rootName, t.name, t.answers, t.correct, t.accuracy.toFixed(3)])];
  if (tab === 'retention') return [['Tuần đăng ký', 'Người', ...Array.from({ length: 8 }, (_, w) => `Tuần ${w}`)], ...a.retention.cohorts.map((c) => [c.weekStart, c.size, ...c.active])];
  if (tab === 'economy') {
    const rows = shop ? itemPerformance(shop, a.economy.sales, now).rows.map((r) => [r.item.code, r.item.name, r.item.price ?? '', r.purchases, r.coin, r.share.toFixed(3)]) : a.economy.sales.map((s) => [s.code, '', '', s.purchases, s.coin, '']);
    return [['Mã', 'Vật phẩm', 'Giá', 'Lượt mua', 'Coin tiêu', 'Tỉ trọng'], ...rows];
  }
  return [['Bước', 'Số lượt', 'Từ đầu phễu'], ...funnelSteps(a.scan.funnel).steps.map((s) => [s.label, s.count, s.fromStart.toFixed(3)]), [], ['Nhãn chưa có từ', 'Lượt scan', 'Người học'], ...a.scan.unmappedLabels.map((l) => [l.label, l.scans, l.learners])];
}

/**
 * Phân tích (design.md §4.1, analytics_ui.md): "Sản phẩm có đi đúng hướng không?", read weekly/monthly.
 * Four tabs; findings are drawn into the data (sorted rows, highlighted steps, chart marks), not appended as advice.
 * The tab lives in the URL (/analytics/:tab).
 */
export function AnalyticsPage({ sub }: { sub?: string }) {
  const tab = TABS.find((t) => t.id === sub)?.id ?? 'learning';
  const [days, setDays] = useState<AnalyticsDays>(30);
  const q = useAnalytics(days);
  const shop = useShopCatalog();
  const missions = useMissionTemplates();
  const a = q.data;
  const items = shop.data?.data;
  const now = new Date();
  const refresh = () => { void q.refetch(); void shop.refetch(); void missions.refetch(); };

  /** What each tab is hiding, said in plain text next to its name; coloured only when it is a problem. */
  const flag: Record<TabId, { text: string; tone: string } | null> = a ? {
    learning: (() => { const k = topicAccuracy(a.learning.topics).filter((t) => t.hard).length; return k ? { text: `${k} chủ đề khó`, tone: 'text-danger-dark' } : null; })(),
    retention: isSmallSample(a.retention.activated) ? { text: 'mẫu nhỏ', tone: 'text-text-light' } : { text: `tuần 1: ${cohortWeek(a.retention.cohorts, 1).active}`, tone: 'text-text-muted' },
    economy: (() => { const u = items ? itemPerformance(items, a.economy.sales, now).unsold.length : 0; return u ? { text: `${u} chưa ai mua`, tone: 'text-warning-dark' } : null; })(),
    scan: a.scan.unmappedLabels.length ? { text: `${a.scan.unmappedLabels.length} nhãn thiếu từ`, tone: 'text-warning-dark' } : null,
  } : { learning: null, retention: null, economy: null, scan: null };

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      <PageHeader
        title="Phân tích"
        actions={<>
          {q.dataUpdatedAt > 0 && <span className="text-xs tabular-nums text-text-muted">Cập nhật {new Date(q.dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
          <Button icon={<RotateCw />} label="Làm mới" loading={q.isFetching || shop.isFetching || missions.isFetching} onClick={refresh} />
        </>}
      />
      {analyticsUsesFixtures && (
        <SampleDataNotice>
          Số liệu đang chờ <code className="font-mono">GET /api/admin/analytics?days=</code>. Tên chủ đề, vật phẩm, giá, trạng thái bán và mẫu nhiệm vụ là dữ liệu thật.
          Tỉ lệ giữ chân theo % chỉ hiện khi có từ {ANALYTICS_THRESHOLDS.minRetentionN} người học đã kích hoạt.
        </SampleDataNotice>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <div role="tablist" aria-label="Nhóm phân tích" className="flex items-end gap-5 overflow-x-auto">
          {TABS.map((t) => {
            const on = tab === t.id;
            const f = flag[t.id];
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} title={t.question} onClick={() => navigate(`/analytics/${t.id}`, { replace: true })}
                className={cn('-mb-px flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2 pt-1 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info',
                  on ? 'border-text font-semibold text-text' : 'border-transparent text-text-muted hover:text-text')}>
                {t.label}
                {f && <span className={cn('text-xs font-normal', f.tone)}>{f.text}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {tab === 'retention'
            ? <span className="text-xs text-text-muted">Không theo kỳ: 8 tuần đăng ký gần nhất</span>
            : (
              <div role="radiogroup" aria-label="Khoảng thời gian" className="inline-flex rounded-md border border-border bg-surface p-0.5">
                {PERIODS.map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={days === p} onClick={() => setDays(p)}
                    className={cn('h-7 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', days === p ? 'bg-text text-white' : 'text-text-muted hover:text-text')}>
                    {p} ngày
                  </button>
                ))}
              </div>
            )}
          {q.isPlaceholderData && <span role="status" className="text-xs text-text-muted">Đang tải kỳ {days} ngày…</span>}
          <Button size="sm" icon={<Download />} disabled={!a} onClick={() => a && downloadCsv(`snapvocab-phan-tich-${tab}-${days}d.csv`, toCsv(csvFor(tab, a, items, now)))}>Xuất CSV</Button>
        </div>
      </div>

      {q.isError && <SourceError what="số liệu phân tích" stale={!!a} onRetry={() => void q.refetch()} />}
      {shop.isError && !items && (tab === 'economy') && <SourceError what="catalog Cửa hàng" onRetry={() => void shop.refetch()} />}

      {a ? (
        <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label} className={cn(q.isPlaceholderData && 'opacity-60 transition-opacity')}>
          {tab === 'learning' && <LearningTab a={a} />}
          {tab === 'retention' && <RetentionTab a={a} />}
          {tab === 'economy' && <EconomyTab a={a} shop={items} shopPending={shop.isPending} missions={missions.data} now={now} />}
          {tab === 'scan' && <ScanTab a={a} now={now} />}
        </div>
      ) : q.isPending && (
        <div className="space-y-4">
          <PanelSkeleton rows={1} />
          <div className="grid gap-4 xl:grid-cols-2"><PanelSkeleton rows={5} /><PanelSkeleton rows={5} /></div>
        </div>
      )}
    </div>
  );
}
