import React, { useState, useEffect } from 'react';
import {
  AdminShopItemDTO,
  ShopItemStatus,
  ShopItemType,
} from '../../../domains/shop/types';
import {
  useAdminShopItems,
  usePublishShopItem,
  useArchiveShopItem,
  useDeleteShopItem,
} from '../../../domains/shop/queries';
import {
  deriveSaleState,
  formatShopItemTypeLabel,
  mapBackendErrorsToFields,
} from '../../../domains/shop/mappers';
import { SaleStateBadge } from '../components/ShopItemStatusBadge';
import { Button, toolbarControl } from '../../../components/ui';
import {
  PublishConfirmationModal,
  ArchiveConfirmationModal,
  DeleteConfirmationModal,
} from '../components/ShopModals';
import {
  Search,
  Plus,
  RotateCw,
  Coins,
  ChevronLeft,
  ChevronRight,
  PackageX,
  AlertCircle,
  Layers,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

interface ShopItemListPageProps {
  onCreateItem: () => void;
  onEditItem: (id: number) => void;
  onToast?: (message: string) => void;
}

export const ShopItemListPage: React.FC<ShopItemListPageProps> = ({
  onCreateItem,
  onEditItem,
  onToast,
}) => {
  // Query parameters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  // Search debounce: 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  // TanStack Query list fetch
  const {
    data: listResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminShopItems({
    q: debouncedQuery || undefined,
    type: typeFilter !== 'ALL' ? (typeFilter as ShopItemType) : undefined,
    status: statusFilter !== 'ALL' ? (statusFilter as ShopItemStatus) : undefined,
    page,
    size: pageSize,
  });

  const items = listResponse?.data || [];
  const meta = listResponse?.meta;
  const totalPages = meta?.pages ?? Math.ceil((meta?.total || 0) / pageSize) ?? 1;

  // Deleting/archiving the last row of the last page leaves an empty page: step back to the real last one.
  useEffect(() => {
    if (meta && items.length === 0 && page > 0) setPage(Math.max(0, meta.pages - 1));
  }, [meta, items.length, page]);

  // Action Modals State
  const [publishingItem, setPublishingItem] = useState<AdminShopItemDTO | null>(null);
  const [archivingItem, setArchivingItem] = useState<AdminShopItemDTO | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminShopItemDTO | null>(null);

  // Mutations
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

  return (
    <div className="space-y-4">
      {/* TOOLBAR — flat row, no card boxing */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="search"
              aria-label="Tìm vật phẩm theo mã hoặc tên"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã code, tên vật phẩm..."
              className={`${toolbarControl} w-full pl-9`}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            aria-label="Loại vật phẩm"
            className={`${toolbarControl} cursor-pointer`}
          >
            <option value="ALL">Mọi loại vật phẩm</option>
            <option value="THEME">Giao diện cửa hàng</option>
            <option value="AVATAR_FRAME">Khung avatar</option>
            <option value="XP_BOOSTER">XP Booster</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Trạng thái phát hành (vòng đời)"
            className={`${toolbarControl} cursor-pointer`}
          >
            <option value="ALL">Mọi trạng thái phát hành</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã phát hành</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>

          {/* Refresh button */}
          <Button icon={<RotateCw />} loading={isFetching} onClick={() => refetch()}>Làm mới</Button>
        </div>

        {/* Right: Create */}
        <Button variant="primary" icon={<Plus />} onClick={onCreateItem}>Tạo vật phẩm mới</Button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div role="alert" className="p-4 bg-danger-light border border-danger/30 rounded-xl flex items-center justify-between text-[13px] text-danger-dark">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {error instanceof Error ? error.message : 'Không thể tải danh sách Shop Items.'}
            </span>
          </div>
          <Button size="sm" onClick={() => refetch()}>Thử lại</Button>
        </div>
      )}

      {/* TABLE / LIST VIEW */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[280px]">Vật phẩm</th>
                <th className="py-2.5 px-3">Loại</th>
                <th className="py-2.5 px-3">Giá</th>
                <th className="py-2.5 px-3 min-w-[200px]">Trạng thái bán</th>
                <th className="py-2.5 px-3">Cập nhật</th>
                <th className="py-2.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                // SKELETON LOADING
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-200 rounded-lg shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 bg-neutral-200 rounded w-28" />
                          <div className="h-2.5 bg-neutral-100 rounded w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><div className="h-5 bg-neutral-200 rounded-full w-20" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-14" /></td>
                    <td className="py-3 px-3"><div className="h-5 bg-neutral-200 rounded-full w-24" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-20" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-6 bg-neutral-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 && error ? null : items.length === 0 ? (
                // EMPTY STATE
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageX size={36} className="text-text-muted/60" />
                      <p className="font-semibold text-sm text-text">Không tìm thấy vật phẩm nào</p>
                      <p className="text-xs text-text-muted max-w-sm">
                        {debouncedQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                          : 'Chưa có vật phẩm nào trong catalog. Hãy tạo vật phẩm đầu tiên.'}
                      </p>
                      {debouncedQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSearchQuery('');
                            setDebouncedQuery('');
                            setTypeFilter('ALL');
                            setStatusFilter('ALL');
                            setPage(0);
                          }}
                        >
                          Xóa bộ lọc
                        </Button>
                      ) : (
                        <Button size="sm" className="mt-2" icon={<Plus />} onClick={onCreateItem}>Tạo vật phẩm đầu tiên</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // DATA ROWS
                items.map((item) => {
                  const sale = deriveSaleState(item);
                  const updatedDateStr = item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                      onClick={() => onEditItem(item.id)}
                    >
                      {/* Item: icon + name */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-border bg-neutral-900/5 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.iconUrl ? (
                              <img
                                src={item.iconUrl}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-text-muted">
                                {item.type === 'THEME' ? (
                                  <Sparkles size={16} />
                                ) : item.type === 'AVATAR_FRAME' ? (
                                  <ImageIcon size={16} />
                                ) : (
                                  <Layers size={16} />
                                )}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text line-clamp-2 max-w-[280px]" title={item.name}>
                              {item.name}
                            </div>
                            <span
                              className="font-mono text-[11px] font-bold text-text-muted select-all cursor-text"
                              title="Bấm để chọn mã"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-text text-[11px]">
                          {formatShopItemTypeLabel(item.type)}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3">
                        {item.purchasable ? (
                          <span className="font-semibold text-text tabular-nums flex items-center gap-1">
                            <Coins size={12} className="text-reward shrink-0" />
                            <span>{(item.price ?? 0).toLocaleString('vi-VN')}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Sale state: the conclusion, with its reason */}
                      <td className="py-2.5 px-3">
                        <SaleStateBadge sale={sale} />
                      </td>

                      {/* Updated */}
                      <td className="py-2.5 px-3 text-xs text-text-muted tabular-nums whitespace-nowrap">
                        {updatedDateStr}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'DRAFT' && <Button size="sm" onClick={() => setPublishingItem(item)}>Phát hành</Button>}
                          {item.status === 'DRAFT' && <Button size="sm" variant="danger-outline" onClick={() => setDeletingItem(item)}>Xóa</Button>}
                          {item.status === 'PUBLISHED' && <Button size="sm" variant="danger-outline" title="Ngừng bán vĩnh viễn" onClick={() => setArchivingItem(item)}>Ngừng bán</Button>}
                          {/* Edit last: right-aligned, so it lines up on every row whatever else is shown */}
                          <Button size="sm" onClick={() => onEditItem(item.id)}>Sửa</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER — only visible when there are items */}
        {meta && items.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <div>
              Hiển thị <strong className="text-text">{items.length}</strong> / <strong className="text-text">{meta.total}</strong> vật phẩm
            </div>

            <div className="flex items-center gap-1.5">
              <Button size="sm" icon={<ChevronLeft />} disabled={page <= 0 || isLoading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Trước</Button>

              <span className="px-2 font-mono text-xs text-text font-bold">
                {page + 1} / {Math.max(1, totalPages)}
              </span>

              <Button size="sm" disabled={page + 1 >= totalPages || isLoading} onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}>
                Sau
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

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
