import React, { useId } from 'react';
import {
  AdminShopItemDTO,
  ShopItemType,
} from '../../../domains/shop/types';
import { formatShopItemTypeLabel, formatThemeKeyLabel, deriveSaleState } from '../../../domains/shop/mappers';
import { SaleStateBadge } from './ShopItemStatusBadge';
import { Button, useDialogFocus } from '../../../components/ui';
import {
  AlertTriangle,
  Globe,
  Archive,
  Trash2,
  RefreshCw,
  X,
  Coins,
} from 'lucide-react';

/* =========================================================================
   1. PUBLISH CONFIRMATION MODAL
   ========================================================================= */
interface PublishConfirmationModalProps {
  isOpen: boolean;
  item: AdminShopItemDTO;
  isPublishing: boolean;
  /** Failure stays in the modal the operator is looking at. */
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  item,
  isPublishing,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useDialogFocus(isOpen, isPublishing ? () => {} : onClose);
  const titleId = useId();
  if (!isOpen) return null;

  // Publishing makes the item live; whether learners can BUY it is a separate outcome.
  const afterPublish = deriveSaleState({ ...item, status: 'PUBLISHED' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-surface border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={20} />
            <h3 id={titleId} className="text-sm font-bold text-text">Phát hành vật phẩm</h3>
          </div>
          <Button variant="ghost" size="sm" icon={<X />} label="Đóng" onClick={onClose} disabled={isPublishing} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 border border-border rounded-xl space-y-1.5">
            <p className="text-[13px] font-semibold text-text">Sau khi phát hành, vật phẩm sẽ:</p>
            <SaleStateBadge sale={afterPublish} />
            <p className="text-xs text-text-muted">
              Phát hành khác mở bán: vật phẩm dùng được làm phần thưởng ngay; người học chỉ mua được khi bật "Cho phép mua" và đang trong thời gian bán.
            </p>
          </div>

          <div className="p-3 bg-reward-light border border-reward/40 rounded-xl flex items-start gap-2.5 text-[13px] text-reward-dark">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>
              Mã, loại và cấu hình theo loại sẽ bị khóa vĩnh viễn vì phần thưởng và vật phẩm đã bán tham chiếu tới chúng.
            </p>
          </div>

          <div className="border border-border rounded-xl divide-y divide-border text-xs">
            <div className="px-4 py-2.5 flex justify-between">
              <span className="text-text-muted font-medium">Tên vật phẩm:</span>
              <span className="font-bold text-text">{item.name}</span>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <span className="text-text-muted font-medium">Mã code:</span>
              <span className="font-mono font-semibold text-text">{item.code}</span>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <span className="text-text-muted font-medium">Loại vật phẩm:</span>
              <span className="font-semibold text-text">{formatShopItemTypeLabel(item.type)}</span>
            </div>
            <div className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-text-muted font-medium">Giá bán:</span>
              <span className="font-bold text-reward flex items-center gap-1">
                <Coins size={13} className="text-amber-500" />
                {item.purchasable ? `${(item.price ?? 0).toLocaleString('vi-VN')} Coin` : 'Không bán'}
              </span>
            </div>

            {/* Type-specific details */}
            {item.type === 'THEME' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Bộ giao diện:</span>
                <span className="font-semibold text-text">{item.themeKey ? formatThemeKeyLabel(item.themeKey) : 'Chưa thiết lập'}</span>
              </div>
            )}
            {item.type === 'AVATAR_FRAME' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Ảnh khung:</span>
                <span className="font-medium text-text">{item.frameAssetKey ? 'Đã tải lên' : 'Chưa tải lên'}</span>
              </div>
            )}
            {item.type === 'XP_BOOSTER' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Thời lượng hiệu ứng:</span>
                <span className="font-semibold text-text">{item.boostDurationMinutes} phút (x2 XP)</span>
              </div>
            )}
          </div>
          {errorMessage && (
            <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-start gap-2 text-[13px] text-danger-dark">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <Button data-autofocus onClick={onClose} disabled={isPublishing}>Hủy</Button>
          <Button variant="primary" icon={<Globe />} loading={isPublishing} loadingText="Đang phát hành…" onClick={onConfirm}>
            Xác nhận phát hành
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. ARCHIVE CONFIRMATION MODAL
   ========================================================================= */
interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  isArchiving: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ArchiveConfirmationModal: React.FC<ArchiveConfirmationModalProps> = ({
  isOpen,
  itemName,
  isArchiving,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useDialogFocus(isOpen, isArchiving ? () => {} : onClose);
  const titleId = useId();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-danger">
            <Archive size={20} />
            <h3 id={titleId} className="text-sm font-bold text-text">Ngừng bán vĩnh viễn</h3>
          </div>
          <Button variant="ghost" size="sm" icon={<X />} label="Đóng" onClick={onClose} disabled={isArchiving} />
        </div>

        <div className="p-6 space-y-3">
          <p className="text-[13px] text-text leading-relaxed">
            Ngừng bán vĩnh viễn <strong className="font-bold">{itemName}</strong> (lưu trữ)? <strong className="text-danger-dark">Không thể hoàn tác</strong>: không phát hành hay mở bán lại được.
          </p>
          <ul className="p-3 bg-danger-light border border-danger/30 rounded-xl list-disc list-inside space-y-1 text-[13px] text-danger-dark">
            <li>Ngừng bán trong Cửa hàng ngay lập tức.</li>
            <li>Người đã sở hữu vẫn giữ và dùng bình thường.</li>
            <li>Không chọn được làm phần thưởng mới; phần thưởng đã cấu hình trước đó giữ nguyên.</li>
          </ul>
          {errorMessage && (
            <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-start gap-2 text-[13px] text-danger-dark">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <Button data-autofocus onClick={onClose} disabled={isArchiving}>Hủy</Button>
          <Button variant="danger" icon={<Archive />} loading={isArchiving} loadingText="Đang ngừng bán…" onClick={onConfirm}>
            Ngừng bán vĩnh viễn
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. DELETE DRAFT CONFIRMATION MODAL
   ========================================================================= */
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  itemName,
  isDeleting,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useDialogFocus(isOpen, isDeleting ? () => {} : onClose);
  const titleId = useId();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-danger">
            <Trash2 size={20} />
            <h3 id={titleId} className="text-sm font-bold text-text">Xóa bản nháp</h3>
          </div>
          <Button variant="ghost" size="sm" icon={<X />} label="Đóng" onClick={onClose} disabled={isDeleting} />
        </div>

        <div className="p-6 space-y-3">
          <p className="text-[13px] text-text leading-relaxed">
            Xóa bản nháp <strong className="font-bold">{itemName}</strong>?
          </p>
          <p className="text-[13px] text-text-muted">Vật phẩm sẽ bị xóa vĩnh viễn. Không thể hoàn tác.</p>
          {errorMessage && (
            <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-start gap-2 text-[13px] text-danger-dark">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <Button data-autofocus onClick={onClose} disabled={isDeleting}>Hủy</Button>
          <Button variant="danger" icon={<Trash2 />} loading={isDeleting} loadingText="Đang xóa…" onClick={onConfirm}>
            Xóa bản nháp
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. TYPE CHANGE CONFIRMATION MODAL
   ========================================================================= */
interface TypeChangeConfirmationModalProps {
  isOpen: boolean;
  newType: ShopItemType;
  onClose: () => void;
  onConfirm: () => void;
}

export const TypeChangeConfirmationModal: React.FC<TypeChangeConfirmationModalProps> = ({
  isOpen,
  newType,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useDialogFocus(isOpen, onClose);
  const titleId = useId();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 id={titleId} className="text-sm font-bold text-text">Thay Đổi Loại Vật Phẩm</h3>
          </div>
          <Button variant="ghost" size="sm" icon={<X />} label="Đóng" onClick={onClose} />
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-text leading-relaxed">
            Bạn đang chuyển sang loại <strong className="text-text font-bold">{formatShopItemTypeLabel(newType)}</strong>.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <p className="font-semibold">Cấu hình riêng của loại hiện tại sẽ bị xóa.</p>
            <p className="mt-0.5 text-amber-800">
              Các thông tin đặc thù của loại cũ sẽ bị đặt lại về giá trị mặc định của loại mới.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <Button data-autofocus onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={onConfirm}>Đồng ý thay đổi</Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   5. OPTIMISTIC LOCKING / VERSION CONFLICT BANNER
   ========================================================================= */
interface VersionConflictBannerProps {
  serverVersion?: number;
  localVersion?: number;
  onReload: () => void;
  isReloading?: boolean;
}

export const VersionConflictBanner: React.FC<VersionConflictBannerProps> = ({
  serverVersion,
  localVersion,
  onReload,
  isReloading = false,
}) => {
  return (
    <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-rose-900">
            Xung đột phiên bản
          </h4>
          <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
            Vật phẩm này đã được chỉnh sửa ở phiên khác. Phiên bản hiện tại trên máy chủ là{' '}
            <strong>v{serverVersion ?? '?'}</strong>, phiên bản cục bộ đang giữ là{' '}
            <strong>v{localVersion ?? '?'}</strong>.
          </p>
          <p className="text-[11px] text-rose-700 mt-1 italic">
            Phần bạn đang nhập được giữ lại: sau khi tải, bạn có thể áp dụng lại hoặc bỏ thay đổi.
          </p>
        </div>
      </div>

      <Button variant="primary" size="sm" icon={<RefreshCw />} loading={isReloading} loadingText="Đang tải…" onClick={onReload}>
        Tải phiên bản mới
      </Button>
    </div>
  );
};
