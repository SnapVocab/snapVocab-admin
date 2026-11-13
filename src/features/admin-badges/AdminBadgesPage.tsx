import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui';
import { badgesEditable } from '../../domains/admin-badges/config';
import { useAdminBadge, useAdminBadges } from '../../domains/admin-badges/queries';
import type { AdminBadge } from '../../domains/admin-badges/types';
import { ApiClientError } from '../../lib/api-client';
import { navigate } from '../../lib/router';
import { ErrorBanner } from '../admin-missions/components';
import { BadgeCatalog } from './BadgeCatalog';
import { BadgeEditor } from './BadgeEditor';
import { ToggleBadgeDialog } from './ToggleBadgeDialog';
import { badgeErrorMessage } from './ui';
import { useToast } from '../../components/ui/Toast';

function Loading({ detail = false }: { detail?: boolean }) {
  return <div role="status" aria-label={detail ? 'Đang tải chi tiết huy hiệu' : 'Đang tải catalog huy hiệu'}
    className="space-y-3 rounded-lg border border-border bg-surface p-4">
    {Array.from({ length: detail ? 3 : 6 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-subtle motion-reduce:animate-none" />)}
  </div>;
}

/**
 * `/badges` = catalog, `/badges/:id` = one badge (deep link, F5 reopens it). The catalog stays mounted under the editor
 * so search, filter and scroll survive. Data comes from the Admin APIs or, in dev/demo, the MOCK catalog (config.ts);
 * an API error never falls back to sample data.
 */
export function AdminBadgesPage({ sub, onDirtyChange = () => {} }: { sub?: string; onDirtyChange?: (dirty: boolean) => void }) {
  const openId = sub && /^\d+$/.test(sub) ? Number(sub) : null;
  const catalog = useAdminBadges();
  const { refetch: refetchCatalog } = catalog;
  const detail = useAdminBadge(openId ?? undefined);
  const [notice, setNotice] = useState('');
  const { show: setToast, node: toastNode } = useToast();
  const [toggling, setToggling] = useState<AdminBadge | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = openId === null ? listScroll.current : 0;
    if (openId === null && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  }, [openId]);

  const close = useCallback((message?: string) => {
    navigate('/badges');
    if (message) setNotice(message);
  }, []);
  useEffect(() => {
    if (openId !== null && detail.error instanceof ApiClientError && detail.error.code === 'BADGE_NOT_FOUND') {
      // Reconcile the page with an asynchronous server response; announce why it was closed.
      // eslint-disable-next-line react/set-state-in-effect
      close('Không tìm thấy huy hiệu này. Danh sách đang được làm mới.');
      void refetchCatalog();
    }
  }, [openId, detail.error, close, refetchCatalog]);

  // The detail GET may be newer than the catalog; its current fields drive the shelf preview.
  const previewItems = useMemo(() => {
    const items = catalog.data ?? [];
    if (!detail.data || openId === null) return items;
    return items.some((b) => b.id === detail.data!.id) ? items.map((b) => (b.id === detail.data!.id ? detail.data! : b)) : [...items, detail.data];
  }, [catalog.data, detail.data, openId]);

  const open = (id: number, button: HTMLElement) => {
    listScroll.current = scroller.current?.scrollTop ?? 0;
    opener.current = button;
    setNotice('');
    navigate(`/badges/${id}`);
  };
  const refreshBoth = () => { void catalog.refetch(); void detail.refetch(); };

  return <div ref={scroller} className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
    {toastNode}
    {notice && <p role="status" className="rounded-lg bg-info-light p-3 text-xs text-info-dark">{notice}</p>}

    <div hidden={openId !== null} className="space-y-4">
      {catalog.isError && <ErrorBanner message={`${catalog.data ? 'Đang hiển thị dữ liệu đã tải trước đó. ' : 'Không tải được danh sách huy hiệu. '}${badgeErrorMessage(catalog.error)}`}>
        <Button size="sm" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>Thử lại</Button>
      </ErrorBanner>}
      {catalog.isPending ? <Loading /> : catalog.data !== undefined && <BadgeCatalog all={catalog.data} updatedAt={catalog.dataUpdatedAt}
        onOpen={open} onToggle={setToggling} onRefresh={() => void catalog.refetch()} refreshing={catalog.isFetching} />}
    </div>

    {openId !== null && <div className="space-y-4">
      {!detail.data && <Button icon={<ArrowLeft />} onClick={() => close()}>Quay lại danh sách</Button>}
      {catalog.isError && <ErrorBanner message={`Kệ xem trước có thể dùng catalog đã tải trước đó. ${badgeErrorMessage(catalog.error)}`} />}
      {detail.isError && <ErrorBanner message={`${detail.data ? 'Đang hiển thị dữ liệu đã tải trước đó. ' : ''}${badgeErrorMessage(detail.error)}`}>
        <Button size="sm" disabled={detail.isFetching} onClick={() => void detail.refetch()}>Thử lại</Button>
      </ErrorBanner>}
      {detail.isPending ? <Loading detail /> : detail.data && <BadgeEditor key={detail.data.id} badge={detail.data} all={previewItems} editable={badgesEditable}
        refreshing={catalog.isFetching || detail.isFetching} onRefresh={refreshBoth} onBack={close} onToggle={setToggling} onDirtyChange={onDirtyChange}
        onSaved={() => setToast('Đã lưu huy hiệu.')} />}
    </div>}

    {toggling && <ToggleBadgeDialog badge={toggling} onClose={() => setToggling(null)}
      onDone={(b) => { setToggling(null); setToast(b.isActive ? 'Đã bật huy hiệu.' : 'Đã tắt huy hiệu.'); }} />}
  </div>;
}
