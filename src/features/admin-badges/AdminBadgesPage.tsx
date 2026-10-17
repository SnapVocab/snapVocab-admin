import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAdminBadge, useAdminBadges } from '../../domains/admin-badges/queries';
import { ApiClientError } from '../../lib/api-client';
import { ErrorBanner } from '../admin-missions/components';
import { BadgeCatalog } from './BadgeCatalog';
import { BadgeDetail } from './BadgeDetail';
import { badgeErrorMessage } from './ui';

function Loading({ detail = false }: { detail?: boolean }) {
  return <div role="status" aria-label={detail ? 'Đang tải chi tiết huy hiệu' : 'Đang tải catalog huy hiệu'}
    className="space-y-3 rounded-xl border border-border bg-surface p-4">
    {Array.from({ length: detail ? 3 : 6 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-subtle motion-reduce:animate-none" />)}
  </div>;
}

/** P1 uses Admin GET APIs exclusively. Fixtures belong to tests, never to an error fallback. */
export function AdminBadgesPage() {
  const catalog = useAdminBadges();
  const { refetch: refetchCatalog } = catalog;
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = useAdminBadge(openId ?? undefined);
  const [notice, setNotice] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = openId === null ? listScroll.current : 0;
    if (openId === null && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  }, [openId]);

  const close = useCallback(() => { setOpenId(null); }, []);
  useEffect(() => {
    if (openId !== null && detail.error instanceof ApiClientError && detail.error.code === 'BADGE_NOT_FOUND') {
      // Reconcile the page with an asynchronous server response; announce why it was closed.
      // eslint-disable-next-line react/set-state-in-effect
      setNotice('Không tìm thấy huy hiệu này. Danh sách đang được làm mới.');
      close();
      void refetchCatalog();
    }
  }, [openId, detail.error, close, refetchCatalog]);

  const all = catalog.data ?? [];
  // The detail GET may be newer than the catalog; its current fields drive its preview shelf.
  const previewItems = useMemo(() => {
    if (!detail.data || openId === null) return catalog.data ?? [];
    const items = catalog.data ?? [];
    return items.some(b => b.id === detail.data!.id)
      ? items.map(b => b.id === detail.data!.id ? detail.data! : b)
      : [...items, detail.data];
  }, [catalog.data, detail.data, openId]);

  return <div ref={scroller} className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
    {notice && <p role="status" className="rounded-lg bg-info-light p-3 text-xs text-info-dark">{notice}</p>}
    <div hidden={openId !== null} className="space-y-4">
      {catalog.isError && <ErrorBanner message={`${catalog.data ? 'Đang hiển thị dữ liệu đã tải trước đó. ' : 'Không tải được danh sách huy hiệu. '}${badgeErrorMessage(catalog.error)}`}>
        <Button size="sm" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>Thử lại</Button>
      </ErrorBanner>}
      {catalog.isPending ? <Loading /> : catalog.data !== undefined && <BadgeCatalog all={all}
        onOpen={(id, button) => {
          listScroll.current = scroller.current?.scrollTop ?? 0;
          opener.current = button;
          setNotice('');
          setOpenId(id);
        }} onRefresh={() => void catalog.refetch()} refreshing={catalog.isFetching} />}
    </div>
    {openId !== null && <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {!detail.data && <Button size="sm" onClick={close}>Quay lại danh sách</Button>}
        <Button size="sm" disabled={catalog.isFetching || detail.isFetching}
          onClick={() => { void catalog.refetch(); void detail.refetch(); }}>
          <RefreshCw size={14} className={catalog.isFetching || detail.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />Làm mới
        </Button>
      </div>
      {catalog.isError && <ErrorBanner message={`Kệ xem trước có thể dùng catalog đã tải trước đó. ${badgeErrorMessage(catalog.error)}`} />}
      {detail.isError && <ErrorBanner message={`${detail.data ? 'Đang hiển thị dữ liệu đã tải trước đó. ' : ''}${badgeErrorMessage(detail.error)}`}>
        <Button size="sm" disabled={detail.isFetching} onClick={() => void detail.refetch()}>Thử lại</Button>
      </ErrorBanner>}
      {detail.isPending ? <Loading detail /> : detail.data && <BadgeDetail badge={detail.data} all={previewItems} onBack={close} />}
    </div>}
  </div>;
}
