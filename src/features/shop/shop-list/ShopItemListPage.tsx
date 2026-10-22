import React, { useState } from 'react';
import { AdminShopItemDTO, ShopItemType } from '../../../domains/shop/types';
import {
  useShopCatalog,
  usePublishShopItem,
  useArchiveShopItem,
  useDeleteShopItem,
} from '../../../domains/shop/queries';
import {
  DerivedSaleState,
  SaleState,
  deriveSaleState,
  formatFullDays,
  formatFullDaysRange,
  formatShopItemTypeLabel,
  mapBackendErrorsToFields,
  priceBand,
  PriceBand,
} from '../../../domains/shop/mappers';
import { SaleStateBadge } from '../components/ShopItemStatusBadge';
import { ShopItemCard } from '../components/ShopItemCard';
import { Button, StripCell, SummaryStrip, toolbarControl } from '../../../components/ui';
import { BoosterIcon, FrameIcon, FreezeIcon, ThemeIcon } from '../../../components/brand/BrandIcons';
import { cn } from '../../../lib/utils';
import {
  PublishConfirmationModal,
  ArchiveConfirmationModal,
  DeleteConfirmationModal,
} from '../components/ShopModals';
import { Search, Plus, RotateCw, PackageX, AlertCircle, LayoutGrid, List } from 'lucide-react';

interface ShopItemListPageProps {
  onCreateItem: () => void;
  onEditItem: (id: number) => void;
  onToast?: (message: string) => void;
}

type Row = { item: AdminShopItemDTO; sale: DerivedSaleState };

/** Order matching the LiveOps Shop shelf: Frames -> Boosters -> Streak Freeze -> Themes. */
const TYPES: { type: ShopItemType; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { type: 'AVATAR_FRAME', label: 'Khung avatar', Icon: FrameIcon },
  { type: 'XP_BOOSTER', label: 'XP Booster', Icon: BoosterIcon },
  { type: 'STREAK_FREEZE', label: 'Đóng băng chuỗi', Icon: FreezeIcon },
  { type: 'THEME', label: 'Bộ màu', Icon: ThemeIcon },
];

/** Sale conclusions in scan order: what learners can buy, what is about to change, then inactive. */
const SALE_CELLS: { state: SaleState; label: string; dot: string }[] = [
  { state: 'ON_SALE', label: 'Đang mở bán', dot: 'bg-primary' },
  { state: 'UPCOMING', label: 'Chờ mở bán', dot: 'bg-info' },
  { state: 'REWARD_ONLY', label: 'Chỉ làm quà', dot: 'bg-reward' },
  { state: 'DRAFT', label: 'Bản nháp', dot: 'bg-neutral-400' },
  { state: 'ENDED', label: 'Hết hạn', dot: 'bg-neutral-300' },
  { state: 'ARCHIVED', label: 'Đã lưu trữ', dot: 'bg-neutral-300' },
];

const fmt = (n: number) => n.toLocaleString('vi-VN');
/** Storefront order: the learner's catalog is sorted by sortOrder, then id. */
const byShelf = (a: Row, b: Row) => a.item.sortOrder - b.item.sortOrder || a.item.id - b.item.id;

const BandText: React.FC<{ band: PriceBand }> = ({ band }) => (
  <span className="whitespace-nowrap">
    <strong className="font-semibold tabular-nums text-text">{fmt(band.min)}–{fmt(band.max)} Coin</strong>, trung vị {fmt(band.median)},{' '}
    <span title="Số ngày làm đủ 5 nhiệm vụ (tối đa 85 Coin/ngày)">{formatFullDaysRange(band.min, band.max)}</span>
  </span>
);

export const ShopItemListPage: React.FC<ShopItemListPageProps> = ({ onCreateItem, onEditItem, onToast }) => {
  const [q, setQ] = useState('');
  const [typeTab, setTypeTab] = useState<ShopItemType | 'ALL'>('ALL');
  const [saleFilter, setSaleFilter] = useState<SaleState | 'ALL'>('ALL');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const { data, isLoading, isFetching, error, refetch } = useShopCatalog();
  const items = data?.data ?? [];
  const now = new Date();
  const rows: Row[] = items.map((item) => ({ item, sale: deriveSaleState(item, now) }));
  const inType = typeTab === 'ALL' ? rows : rows.filter((r) => r.item.type === typeTab);
  const needle = q.trim().toLowerCase();
  const visible = inType.filter(
    (r) => (saleFilter === 'ALL' || r.sale.state === saleFilter)
      && (!needle || r.item.code.toLowerCase().includes(needle) || r.item.name.toLowerCase().includes(needle)),
  );
  const isFiltered = Boolean(needle) || saleFilter !== 'ALL' || typeTab !== 'ALL';
  const clearFilters = () => { setQ(''); setSaleFilter('ALL'); setTypeTab('ALL'); };
  const tabBand = typeTab === 'ALL' ? null : priceBand(items, typeTab, undefined, now);

  // Action Modals State
  const [publishingItem, setPublishingItem] = useState<AdminShopItemDTO | null>(null);
  const [archivingItem, setArchivingItem] = useState<AdminShopItemDTO | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminShopItemDTO | null>(null);

  const publishMutation = usePublishShopItem();
  const archiveMutation = useArchiveShopItem();
  const deleteMutation = useDeleteShopItem();

  // Errors stay inside the modal the operator is using; closing or reopening clears them.
  const [actionError, setActionError] = useState<string | null>(null);
  const closeModals = () => {
    setPublishingItem(null);
    setArchivingItem(null);
    setDeletingItem(null);
    setActionError(null);
  };
  const run = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    setActionError(null);
    try {
      await action();
      onToast?.(success);
      closeModals();
    } catch (err) {
      setActionError(mapBackendErrorsToFields(err).generalError || fallback);
    }
  };

  const handleConfirmPublish = () => publishingItem
    && run(() => publishMutation.mutateAsync(publishingItem.id), `Đã phát hành "${publishingItem.name}".`, 'Phát hành thất bại.');
  const handleConfirmArchive = () => archivingItem
    && run(() => archiveMutation.mutateAsync(archivingItem.id), `Đã lưu trữ "${archivingItem.name}".`, 'Lưu trữ thất bại.');
  const handleConfirmDelete = () => deletingItem
    && run(() => deleteMutation.mutateAsync(deletingItem.id), `Đã xóa bản nháp "${deletingItem.name}".`, 'Xóa thất bại.');

  const grid = (list: Row[]) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {[...list].sort(byShelf).map((r) => <ShopItemCard key={r.item.id} item={r.item} sale={r.sale} onOpen={onEditItem} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* SUMMARY STRIP — the numbers first; each one filters the catalog below. */}
      <SummaryStrip label="Tóm tắt danh mục">
        <StripCell value={inType.length} label="Vật phẩm" active={saleFilter === 'ALL'} onClick={() => setSaleFilter('ALL')} />
        {SALE_CELLS.map((c) => (
          <StripCell
            key={c.state}
            value={inType.filter((r) => r.sale.state === c.state).length}
            label={c.label}
            dot={c.dot}
            active={saleFilter === c.state}
            onClick={() => setSaleFilter(saleFilter === c.state ? 'ALL' : c.state)}
          />
        ))}
        <div className="ml-auto flex shrink-0 flex-col justify-center px-4 py-2.5 text-xs text-text-muted">
          {tabBand ? (
            <>
              <span>Giá đang bán · {tabBand.count} vật phẩm</span>
              <BandText band={tabBand} />
            </>
          ) : typeTab === 'ALL' ? (
            <span>Chọn một loại để xem dải giá đang bán</span>
          ) : (
            <span>Chưa có vật phẩm loại này đang bán</span>
          )}
        </div>
      </SummaryStrip>

      {/* TOOLBAR: type tabs | search, view, refresh */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Loại vật phẩm" className="inline-flex w-fit flex-wrap rounded-lg border border-border bg-surface p-0.5">
          {[{ type: 'ALL' as const, label: 'Tất cả', Icon: null }, ...TYPES].map(({ type, label, Icon }) => {
            const active = typeTab === type;
            const n = type === 'ALL' ? rows.length : rows.filter((r) => r.item.type === type).length;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeTab(type)}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info',
                  active ? 'bg-text text-white' : 'text-text-muted hover:text-text',
                )}
              >
                {Icon && <Icon size={15} />}
                {label}
                <span className={cn('text-xs tabular-nums', active ? 'text-white/70' : 'text-text-light')}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 lg:w-72 lg:flex-none">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="search"
              aria-label="Tìm vật phẩm theo mã hoặc tên"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã, tên vật phẩm..."
              className={`${toolbarControl} w-full pl-9`}
            />
          </div>
          <div role="group" aria-label="Kiểu hiển thị" className="flex rounded-lg border border-border bg-surface p-0.5">
            {([['grid', LayoutGrid, 'Dạng lưới (như Cửa hàng)'], ['table', List, 'Dạng bảng']] as const).map(([v, Icon, title]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={title}
                title={title}
                onClick={() => setView(v)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info',
                  view === v ? 'bg-surface-subtle text-text' : 'text-text-muted hover:text-text',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <Button icon={<RotateCw />} label="Làm mới" loading={isFetching} onClick={() => refetch()} />
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-body text-danger-dark">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error instanceof Error ? error.message : 'Không tải được danh mục Cửa hàng.'}</span>
          </div>
          <Button size="sm" onClick={() => refetch()}>Thử lại</Button>
        </div>
      )}

      {data && data.meta.total > items.length && (
        <div className="rounded-lg border border-warning/40 bg-warning-light p-3 text-body text-warning-dark">
          Đang hiển thị {items.length}/{data.meta.total} vật phẩm: danh mục đã vượt một trang, cần chuyển sang phân trang máy chủ.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-lg border border-border bg-surface">
              <div className="h-32 rounded-t-lg bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : error && !items.length ? null : visible.length === 0 ? (
        // EMPTY STATE
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface py-12 text-center text-text-muted">
          <PackageX size={36} className="text-text-muted/60" />
          <p className="font-semibold text-sm text-text">Không tìm thấy vật phẩm nào</p>
          <p className="text-xs text-text-muted max-w-sm">
            {isFiltered ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Chưa có vật phẩm nào trong catalog. Hãy tạo vật phẩm đầu tiên.'}
          </p>
          {isFiltered ? (
            <Button size="sm" className="mt-2" onClick={clearFilters}>Xóa bộ lọc</Button>
          ) : (
            <Button size="sm" className="mt-2" icon={<Plus />} onClick={onCreateItem}>Tạo vật phẩm đầu tiên</Button>
          )}
        </div>
      ) : view === 'table' ? (
        <ShopTable
          rows={visible}
          onEdit={onEditItem}
          onPublish={setPublishingItem}
          onArchive={setArchivingItem}
          onDelete={setDeletingItem}
        />
      ) : typeTab !== 'ALL' ? (
        grid(visible)
      ) : (
        // STOREFRONT SHELVES — one per type, in the order learners see them.
        <div className="space-y-6">
          {TYPES.map(({ type, label }) => {
            const shelf = visible.filter((r) => r.item.type === type);
            if (!shelf.length) return null;
            const band = priceBand(items, type, undefined, now);
            return (
              <section key={type} aria-label={label} className="space-y-2.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
                  <h2 className="text-sm font-semibold text-text">
                    {label}
                    <span className="ml-1.5 font-normal text-text-light">{shelf.length}</span>
                  </h2>
                  <span className="text-xs text-text-muted">
                    {band ? <>Giá đang bán: <BandText band={band} /></> : 'Chưa có vật phẩm đang bán'}
                  </span>
                </div>
                {grid(shelf)}
              </section>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {publishingItem && (
        <PublishConfirmationModal
          isOpen={true}
          item={publishingItem}
          isPublishing={publishMutation.isPending}
          errorMessage={actionError}
          onClose={closeModals}
          onConfirm={handleConfirmPublish}
        />
      )}

      {archivingItem && (
        <ArchiveConfirmationModal
          isOpen={true}
          itemName={archivingItem.name}
          isArchiving={archiveMutation.isPending}
          errorMessage={actionError}
          onClose={closeModals}
          onConfirm={handleConfirmArchive}
        />
      )}

      {deletingItem && (
        <DeleteConfirmationModal
          isOpen={true}
          itemName={deletingItem.name}
          isDeleting={deleteMutation.isPending}
          errorMessage={actionError}
          onClose={closeModals}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

/** Dense view for bulk checks: newest change first, with lifecycle actions on each row. */
const ShopTable: React.FC<{
  rows: Row[];
  onEdit: (id: number) => void;
  onPublish: (item: AdminShopItemDTO) => void;
  onArchive: (item: AdminShopItemDTO) => void;
  onDelete: (item: AdminShopItemDTO) => void;
}> = ({ rows, onEdit, onPublish, onArchive, onDelete }) => (
  <div className="overflow-x-auto rounded-lg border border-border bg-surface">
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-border bg-surface-subtle/60 text-text-muted">
          <th className="min-w-[280px] px-4 py-2 font-medium">Vật phẩm</th>
          <th className="px-3 py-2 font-medium">Loại</th>
          <th className="px-3 py-2 text-right font-medium">Thứ tự</th>
          <th className="px-3 py-2 text-right font-medium">Giá</th>
          <th className="min-w-[200px] px-3 py-2 font-medium">Trạng thái bán</th>
          <th className="px-3 py-2 font-medium">Cập nhật</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map(({ item, sale }) => (
          <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors cursor-pointer" onClick={() => onEdit(item.id)}>
            <td className="py-2.5 px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-border bg-neutral-900/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    React.createElement(TYPES.find((t) => t.type === item.type)?.Icon ?? BoosterIcon, { size: 18 })
                  )}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-2 max-w-[280px] text-body font-medium text-text" title={item.name}>{item.name}</div>
                  <span
                    className="cursor-text select-all font-mono text-2xs text-text-light"
                    title="Bấm để chọn mã"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.code}
                  </span>
                </div>
              </div>
            </td>
            <td className="px-3 py-2.5 text-text-muted">{formatShopItemTypeLabel(item.type)}</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{item.sortOrder}</td>
            <td className="px-3 py-2.5 text-right">
              {item.purchasable ? (
                <div className="space-y-0.5">
                  <div className="font-medium tabular-nums text-text">{fmt(item.price ?? 0)} Coin</div>
                  <div className="text-text-muted">{formatFullDays(item.price ?? 0)}</div>
                </div>
              ) : (
                <span className="text-text-light">—</span>
              )}
            </td>
            <td className="px-3 py-2.5">
              {sale.state === 'ON_SALE'
                ? <><div className="text-text">{sale.label}</div><div className="text-text-muted">{sale.detail}</div></>
                : <SaleStateBadge sale={sale} />}
            </td>
            <td className="py-2.5 px-3 text-xs text-text-muted tabular-nums whitespace-nowrap">
              {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
            </td>
            <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-2">
                {item.status === 'DRAFT' && <Button size="sm" onClick={() => onPublish(item)}>Phát hành</Button>}
                {item.status === 'DRAFT' && <Button size="sm" variant="danger-outline" onClick={() => onDelete(item)}>Xóa</Button>}
                {item.status === 'PUBLISHED' && <Button size="sm" variant="danger-outline" title="Ngừng bán vĩnh viễn" onClick={() => onArchive(item)}>Ngừng bán</Button>}
                {/* Edit last: right-aligned, so it lines up on every row whatever else is shown */}
                <Button size="sm" onClick={() => onEdit(item.id)}>Sửa</Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
