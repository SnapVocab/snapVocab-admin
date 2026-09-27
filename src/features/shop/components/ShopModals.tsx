import React from 'react';
import {
  AdminShopItemDTO,
  ShopItemType,
} from '../../../domains/shop/types';
import { formatShopItemTypeLabel, deriveAvailability } from '../../../domains/shop/mappers';
import {
  AlertTriangle,
  Globe,
  Archive,
  Trash2,
  RefreshCw,
  Loader2,
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
  onClose: () => void;
  onConfirm: () => void;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  item,
  isPublishing,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const availability = deriveAvailability(item.availableFrom, item.availableUntil);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-emerald-700">
            <Globe size={20} />
            <h3 className="text-sm font-bold text-text">Phát Hành Vật Phẩm (Publish)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Lưu ý quan trọng:</p>
              <p className="mt-0.5 text-amber-800">
                Sau khi phát hành, một số trường như Mã định danh (Code) và Cấu hình loại sẽ bị khóa vĩnh viễn và không thể chỉnh sửa.
              </p>
            </div>
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
                {item.purchasable ? `${(item.price ?? 0).toLocaleString('vi-VN')} Coins` : 'Không mở bán trực tiếp'}
              </span>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <span className="text-text-muted font-medium">Trạng thái bán:</span>
              <span className="font-medium text-text">
                {item.purchasable ? 'Cho phép mua (Purchasable)' : 'Không bán (Disabled)'}
              </span>
            </div>
            <div className="px-4 py-2.5 flex justify-between">
              <span className="text-text-muted font-medium">Thời gian mở bán:</span>
              <span className="font-medium text-text">{availability.label}</span>
            </div>

            {/* Type-specific details */}
            {item.type === 'THEME' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Theme Key:</span>
                <span className="font-mono font-bold text-primary">{item.themeKey || 'Chưa thiết lập'}</span>
              </div>
            )}
            {item.type === 'AVATAR_FRAME' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Frame Asset Key:</span>
                <span className="font-mono font-medium text-text truncate max-w-[200px]">{item.frameAssetKey || 'Chưa tải lên'}</span>
              </div>
            )}
            {item.type === 'XP_BOOSTER' && (
              <div className="px-4 py-2.5 flex justify-between">
                <span className="text-text-muted font-medium">Thời lượng hiệu ứng:</span>
                <span className="font-semibold text-text">{item.boostDurationMinutes} phút (x2 XP)</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang phát hành...</span>
              </>
            ) : (
              <>
                <Globe size={14} />
                <span>Xác nhận phát hành</span>
              </>
            )}
          </button>
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
  onClose: () => void;
  onConfirm: () => void;
}

export const ArchiveConfirmationModal: React.FC<ArchiveConfirmationModalProps> = ({
  isOpen,
  itemName,
  isArchiving,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-amber-700">
            <Archive size={20} />
            <h3 className="text-sm font-bold text-text">Lưu Trữ Vật Phẩm (Archive)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isArchiving}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-text leading-relaxed">
            Bạn có chắc chắn muốn lưu trữ vật phẩm <strong className="text-text font-bold">{itemName}</strong>?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <p className="font-semibold">Quy tắc lưu trữ:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-amber-800">
              <li>Vật phẩm sẽ ngừng được bán trên Shop.</li>
              <li>Người dùng đã sở hữu vật phẩm vẫn giữ và sử dụng bình thường.</li>
              <li>Trạng thái lưu trữ là cuối cùng (terminal) và không thể hoàn tác.</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isArchiving}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isArchiving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang lưu trữ...</span>
              </>
            ) : (
              <>
                <Archive size={14} />
                <span>Xác nhận lưu trữ</span>
              </>
            )}
          </button>
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
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  itemName,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 size={20} />
            <h3 className="text-sm font-bold text-text">Xóa Bản Nháp (Delete Draft)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-text leading-relaxed">
            Bạn có chắc chắn muốn xóa bản nháp <strong className="text-text font-bold">{itemName}</strong>?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
            <p className="font-semibold">Hành động này không thể hoàn tác.</p>
            <p className="mt-0.5 text-rose-800">
              Vật phẩm bản nháp sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Xóa bản nháp</span>
              </>
            )}
          </button>
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={20} />
            <h3 className="text-sm font-bold text-text">Thay Đổi Loại Vật Phẩm</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            Đồng ý thay đổi
          </button>
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
            Xung Đột Phiên Bản (Version Conflict)
          </h4>
          <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
            Vật phẩm này đã được chỉnh sửa ở phiên khác. Phiên bản hiện tại trên máy chủ là{' '}
            <strong>v{serverVersion ?? '?'}</strong>, phiên bản cục bộ đang giữ là{' '}
            <strong>v{localVersion ?? '?'}</strong>.
          </p>
          <p className="text-[11px] text-rose-700 mt-1 italic">
            * Lưu ý: Tải phiên bản mới sẽ cập nhật lại biểu mẫu theo dữ liệu mới nhất trên máy chủ.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onReload}
        disabled={isReloading}
        className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
      >
        <RefreshCw size={13} className={isReloading ? 'animate-spin' : ''} />
        <span>{isReloading ? 'Đang tải...' : 'Tải phiên bản mới'}</span>
      </button>
    </div>
  );
};
