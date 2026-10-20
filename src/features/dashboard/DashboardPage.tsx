import React from 'react';
import { RotateCw } from 'lucide-react';
import { Button, KpiCell, PageHeader, PanelSkeleton, SampleDataNotice, StripNote, SummaryStrip } from '../../components/ui';
import { useMissionTemplates } from '../../domains/admin-missions/queries';
import { useShopCatalog } from '../../domains/shop/queries';
import { useSystemCollections } from '../../domains/admin-content/queries';
import { useOverview } from '../../domains/admin-overview/queries';
import { overviewUsesFixtures } from '../../domains/admin-overview/api';
import { pct, recentChanges, runChecks } from '../../domains/admin-overview/mappers';
import { navigate } from '../../lib/router';
import { ActionCenter, EconomyBand, LearningBand, RecentChangesPanel, ScanBand } from './blocks';

const n = (x: number) => x.toLocaleString('vi-VN');
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/**
 * Dashboard · direction C "Bảng điều phối vận hành" (design.md §4.1, dashboard_ui.md).
 * Order = what an operator does each morning: fix what is broken → is scan healthy → are learners learning → is the economy balanced.
 */
export function DashboardPage() {
  const missions = useMissionTemplates();
  const shop = useShopCatalog();
  const overview = useOverview();
  const collections = useSystemCollections();
  const now = new Date();
  const o = overview.data;
  const items = shop.data?.data;

  const checks = runChecks({ missions: missions.data, shop: items, overview: o, now });
  const sources = [
    { what: 'catalog nhiệm vụ', q: missions },
    { what: 'catalog Cửa hàng', q: shop },
    { what: 'số liệu vận hành', q: overview },
  ];
  const pending = sources.filter((s) => s.q.isPending).map((s) => s.what);
  const failed = sources.filter((s) => s.q.isError && !s.q.data).map((s) => ({ what: s.what, retry: () => void s.q.refetch() }));
  const fetching = sources.some((s) => s.q.isFetching) || collections.isFetching;
  const updated = Math.max(missions.dataUpdatedAt, shop.dataUpdatedAt, overview.dataUpdatedAt);
  const refresh = () => { void missions.refetch(); void shop.refetch(); void overview.refetch(); void collections.refetch(); };

  const scanRate = o && o.scan.today.total ? o.scan.today.failed / o.scan.today.total : 0;
  const coin7 = o ? o.economy.daily.slice(-7) : [];

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      <PageHeader
        title="Dashboard"
        actions={<>
          {updated > 0 && <span className="text-xs tabular-nums text-text-muted">Cập nhật {new Date(updated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
          <Button icon={<RotateCw />} label="Làm mới" loading={fetching} onClick={refresh} />
        </>}
      />
      {overviewUsesFixtures && (
        <SampleDataNotice>
          Số liệu scan, nhịp học, Coin, tỉ lệ hoàn thành nhiệm vụ và lượt mua đang chờ <code className="font-mono">GET /api/admin/overview</code>.
          Quy tắc và trạng thái của Cửa hàng, Nhiệm vụ, collection và “Thay đổi gần đây” là dữ liệu thật.
        </SampleDataNotice>
      )}

      {/* 1 · What is broken, with every rule that was checked. */}
      <ActionCenter checks={checks} pending={pending} failed={failed} />

      {/* 2 · Today in numbers. */}
      {(o || collections.data) && (
        <SummaryStrip label="Chỉ số vận hành">
          {o && <>
            <KpiCell value={o.learners.activeToday} of={`/ ${o.learners.activated}`} label="Học hôm nay" spark={o.learners.daily.map((d) => d.active)} onClick={() => navigate('/learners')} />
            <KpiCell value={o.learners.active7d} of={`/ ${o.learners.activated} · ${pct(o.learners.active7d / Math.max(1, o.learners.activated))}`} label="Học trong 7 ngày" />
            <KpiCell value={o.scan.today.total} of={`lỗi ${pct(scanRate)}`} label="Scan hôm nay" spark={o.scan.daily.map((d) => d.done + d.failed)} onClick={() => navigate('/ai-scan')} />
            <KpiCell value={`+${n(sum(coin7.map((d) => d.coinIn)))}`} label="Coin phát · 7 ngày" spark={o.economy.daily.map((d) => d.coinIn)} hint="Thưởng nhiệm vụ" />
            <KpiCell value={`−${n(sum(coin7.map((d) => d.coinOut)))}`} label="Coin tiêu · 7 ngày" spark={o.economy.daily.map((d) => d.coinOut)} hint="Mua vật phẩm" />
          </>}
          {collections.data && (
            <StripNote push title="Collection hệ thống (Từ vựng · Chủ đề)">
              <span>Nội dung hệ thống</span>
              <button type="button" onClick={() => navigate('/topics')} className="text-left text-sm font-semibold tabular-nums text-text hover:underline">{collections.data.length} collection</button>
            </StripNote>
          )}
        </SummaryStrip>
      )}

      {/* 3 · Is scan healthy (sample data until the overview API ships). */}
      {o ? <ScanBand o={o} /> : overview.isPending && <PanelSkeleton rows={5} />}

      {/* 4 · Are learners learning; which missions get skipped. */}
      {(o || missions.data || missions.isPending) && <LearningBand o={o} missions={missions.data} missionsPending={missions.isPending} />}

      {/* 5 · Is the economy balanced; what sells. */}
      {(o || items || shop.isPending) && <EconomyBand o={o} shop={items} shopPending={shop.isPending} now={now} />}

      {/* 6 · Real lifecycle timestamps; the audit trail itself belongs to Nhật ký hoạt động. */}
      {(items || missions.data) && <RecentChangesPanel events={recentChanges(items, missions.data)} now={now} />}
    </div>
  );
}
