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
  deriveAvailability,
  formatShopItemTypeLabel,
} from '../../../domains/shop/mappers';
import { ShopItemStatusBadge } from '../components/ShopItemStatusBadge';
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
  CheckCircle2,
  XCircle,
  Edit2,
  Globe,
  Archive,
  Trash2,
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

  // Action Modals State
  const [publishingItem, setPublishingItem] = useState<AdminShopItemDTO | null>(null);
  const [archivingItem, setArchivingItem] = useState<AdminShopItemDTO | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminShopItemDTO | null>(null);

  // Mutations
  const publishMutation = usePublishShopItem();
  const archiveMutation = useArchiveShopItem();
  const deleteMutation = useDeleteShopItem();

  const handleConfirmPublish = async () => {
    if (!publishingItem) return;
    try {
      await publishMutation.mutateAsync(publishingItem.id);
      onToast?.(`Đã phát hành vật phẩm "${publishingItem.name}" thành công.`);
      setPublishingItem(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Phát hành thất bại.';
      alert(msg);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archivingItem) return;
    try {
      await archiveMutation.mutateAsync(archivingItem.id);
      onToast?.(`Đã lưu trữ vật phẩm "${archivingItem.name}".`);
      setArchivingItem(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lưu trữ thất bại.';
      alert(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      onToast?.(`Đã xóa bản nháp "${deletingItem.name}".`);
      setDeletingItem(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xóa thất bại.';
      alert(msg);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* TOOLBAR — flat row, no card boxing */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã code, tên vật phẩm..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary text-text font-medium"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-medium cursor-pointer"
          >
            <option value="ALL">Tất cả loại</option>
            <option value="THEME">Chủ đề</option>
            <option value="AVATAR_FRAME">Khung Avatar</option>
            <option value="XP_BOOSTER">XP Booster</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-medium cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã phát hành</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RotateCw size={14} className={isFetching ? 'animate-spin text-primary' : ''} />
          </button>
        </div>

        {/* Right: Create */}
        <button
          type="button"
          onClick={onCreateItem}
          className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          <span>Tạo Vật Phẩm Mới</span>
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>
              {error instanceof Error ? error.message : 'Không thể tải danh sách Shop Items.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* TABLE / LIST VIEW */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[220px]">Vật phẩm</th>
                <th className="py-2.5 px-3 min-w-[130px]">Mã</th>
                <th className="py-2.5 px-3 min-w-[120px]">Loại</th>
                <th className="py-2.5 px-3 min-w-[110px]">Giá</th>
                <th className="py-2.5 px-3 min-w-[140px]">Trạng thái</th>
                <th className="py-2.5 px-3 min-w-[120px]">Cho phép mua</th>
                <th className="py-2.5 px-3 min-w-[150px]">Thời gian bán</th>
                <th className="py-2.5 px-3 min-w-[120px]">Cập nhật</th>
                <th className="py-2.5 px-4 min-w-[100px] text-right">Thao tác</th>
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
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-16" /></td>
                    <td className="py-3 px-3"><div className="h-5 bg-neutral-200 rounded-full w-20" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-14" /></td>
                    <td className="py-3 px-3"><div className="h-5 bg-neutral-200 rounded-full w-24" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-10" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-24" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-neutral-200 rounded w-20" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-6 bg-neutral-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                // EMPTY STATE
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageX size={36} className="text-text-muted/60" />
                      <p className="font-semibold text-sm text-text">Không tìm thấy vật phẩm nào</p>
                      <p className="text-xs text-text-muted max-w-sm">
                        {debouncedQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                          : 'Chưa có vật phẩm nào trong catalog. Hãy tạo vật phẩm đầu tiên.'}
                      </p>
                      {debouncedQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setDebouncedQuery('');
                            setTypeFilter('ALL');
                            setStatusFilter('ALL');
                            setPage(0);
                          }}
                          className="mt-2 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                        >
                          Xóa bộ lọc
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onCreateItem}
                          className="mt-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Tạo vật phẩm đầu tiên</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // DATA ROWS
                items.map((item) => {
                  const availability = deriveAvailability(item.availableFrom, item.availableUntil);
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
                            <div className="font-semibold text-text truncate max-w-[200px]" title={item.name}>
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-text-muted truncate max-w-[220px]" title={item.description}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] font-bold text-text bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
                          {item.code}
                        </span>
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
                          <span className="font-bold text-reward flex items-center gap-1">
                            <Coins size={12} className="text-amber-500 shrink-0" />
                            <span>{(item.price ?? 0).toLocaleString('vi-VN')}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <ShopItemStatusBadge status={item.status} />
                      </td>

                      {/* Purchasable */}
                      <td className="py-2.5 px-3">
                        {item.purchasable ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px]">
                            <CheckCircle2 size={13} />
                            <span>Bật</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-text-muted text-[11px]">
                            <XCircle size={13} />
                            <span>Tắt</span>
                          </span>
                        )}
                      </td>

                      {/* Availability */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${availability.badgeClass}`}
                        >
                          {availability.label}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="py-2.5 px-3 text-[11px] text-text-muted font-mono whitespace-nowrap">
                        {updatedDateStr}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onEditItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-muted hover:text-text transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Publish (DRAFT only) */}
                          {item.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setPublishingItem(item)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                              title="Phát hành"
                            >
                              <Globe size={13} />
                            </button>
                          )}

                          {/* Archive (PUBLISHED only) */}
                          {item.status === 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => setArchivingItem(item)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors"
                              title="Lưu trữ"
                            >
                              <Archive size={13} />
                            </button>
                          )}

                          {/* Delete (DRAFT only) */}
                          {item.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors"
                              title="Xóa bản nháp"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page <= 0 || isLoading}
                className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <span className="px-2 font-mono text-xs text-text font-bold">
                {page + 1} / {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages || isLoading}
                className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
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
          onClose={() => setPublishingItem(null)}
          onConfirm={handleConfirmPublish}
        />
      )}

      {archivingItem && (
        <ArchiveConfirmationModal
          isOpen={true}
          itemName={archivingItem.name}
          isArchiving={archiveMutation.isPending}
          onClose={() => setArchivingItem(null)}
          onConfirm={handleConfirmArchive}
        />
      )}

      {deletingItem && (
        <DeleteConfirmationModal
          isOpen={true}
          itemName={deletingItem.name}
          isDeleting={deleteMutation.isPending}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
