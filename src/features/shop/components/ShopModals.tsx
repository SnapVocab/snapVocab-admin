import React, { useState } from 'react';
import { auditReasonError } from '../../../domains/admin-audit/mappers';
import { ReasonField } from '../../activity-log/reason';
import {
  AdminShopItemDTO,
  ShopItemType,
} from '../../../domains/shop/types';
import { formatShopItemTypeLabel, formatThemeKeyLabel, deriveSaleState } from '../../../domains/shop/mappers';
import { SaleStateBadge } from './ShopItemStatusBadge';
import { Button } from '../../../components/ui';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import {
  AlertTriangle,
  RefreshCw,
  Coins,
} from 'lucide-react';

/* Shop dialogs are content inside the shared components/ui ConfirmModal (TD-ADS-05). */

/** Failure stays in the dialog the operator is looking at. */
const ErrorAlert: React.FC<{ message?: string | null }> = ({ message }) => (message ? (
  <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-lg flex items-start gap-2 text-body text-danger-dark">
    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
    <span>{message}</span>
  </div>
) : null);

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

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="px-4 py-2.5 flex justify-between items-center gap-3">
    <span className="text-text-muted font-medium">{label}</span>
    {children}
  </div>
);

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  item,
  isPublishing,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;
  // Publishing makes the item live; whether learners can BUY it is a separate outcome.
  const afterPublish = deriveSaleState({ ...item, status: 'PUBLISHED' });

  return (
    <ConfirmModal
      title="Phát hành vật phẩm"
      tone="primary"
      maxWidth="lg"
      busy={isPublishing}
      busyLabel="Đang phát hành…"
      confirmLabel="Xác nhận phát hành"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="p-3 border border-border rounded-lg space-y-1.5">
        <p className="text-body font-semibold text-text">Sau khi phát hành, vật phẩm sẽ:</p>
        <SaleStateBadge sale={afterPublish} />
        <p className="text-xs text-text-muted">
          Phát hành khác mở bán: vật phẩm dùng được làm phần thưởng ngay; người học chỉ mua được khi bật "Cho phép mua" và đang trong thời gian bán.
        </p>
      </div>

      <div className="p-3 bg-reward-light border border-reward/40 rounded-lg flex items-start gap-2.5 text-body text-reward-dark">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p>Mã, loại và cấu hình theo loại sẽ bị khóa vĩnh viễn vì phần thưởng và vật phẩm đã bán tham chiếu tới chúng.</p>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border text-xs">
        <Row label="Tên vật phẩm:"><span className="font-bold text-text">{item.name}</span></Row>
        <Row label="Mã code:"><span className="font-mono font-semibold text-text">{item.code}</span></Row>
        <Row label="Loại vật phẩm:"><span className="font-semibold text-text">{formatShopItemTypeLabel(item.type)}</span></Row>
        <Row label="Giá bán:">
          <span className="font-bold text-reward flex items-center gap-1">
            <Coins size={13} className="text-reward-dark" />
            {item.purchasable ? `${(item.price ?? 0).toLocaleString('vi-VN')} Coin` : 'Không bán'}
          </span>
        </Row>
        {item.type === 'THEME' && (
          <Row label="Bộ giao diện:"><span className="font-semibold text-text">{item.themeKey ? formatThemeKeyLabel(item.themeKey) : 'Chưa thiết lập'}</span></Row>
        )}
        {item.type === 'AVATAR_FRAME' && (
          <Row label="Ảnh khung:"><span className="font-medium text-text">{item.frameAssetKey ? 'Đã tải lên' : 'Chưa tải lên'}</span></Row>
        )}
        {item.type === 'XP_BOOSTER' && (
          <Row label="Thời lượng hiệu ứng:"><span className="font-semibold text-text">{item.boostDurationMinutes} phút (x2 XP)</span></Row>
        )}
        {item.type === 'STREAK_FREEZE' && (
          <Row label="Giữ tối đa:"><span className="font-semibold text-text">{item.maxQuantity ?? 2} vật phẩm, tự dùng khi lỡ một ngày học</span></Row>
        )}
      </div>
      <ErrorAlert message={errorMessage} />
    </ConfirmModal>
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
  /** Trimmed reason, already 10–500 characters (the backend requires it, design.md §8.3). */
  onConfirm: (reason: string) => void;
}

// Mounted only while open, so a reopened dialog starts with an empty reason.
export const ArchiveConfirmationModal: React.FC<ArchiveConfirmationModalProps> = (props) =>
  props.isOpen ? <ArchiveDialog {...props} /> : null;

const ArchiveDialog: React.FC<ArchiveConfirmationModalProps> = ({
  itemName,
  isArchiving,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = Boolean(auditReasonError(reason));
  return (
    <ConfirmModal
      title="Ngừng bán vĩnh viễn"
      tone="danger"
      busy={isArchiving}
      busyLabel="Đang ngừng bán…"
      confirmLabel="Ngừng bán vĩnh viễn"
      confirmDisabled={touched && invalid}
      onClose={onClose}
      onConfirm={() => { setTouched(true); if (!invalid) onConfirm(reason.trim()); }}
    >
      <p className="text-body text-text leading-relaxed">
        Ngừng bán vĩnh viễn <strong className="font-bold">{itemName}</strong> (lưu trữ)? <strong className="text-danger-dark">Không thể hoàn tác</strong>: không phát hành hay mở bán lại được.
      </p>
      <ul className="p-3 bg-danger-light border border-danger/30 rounded-lg list-disc list-inside space-y-1 text-body text-danger-dark">
        <li>Ngừng bán trong Cửa hàng ngay lập tức.</li>
        <li>Người đã sở hữu vẫn giữ và dùng bình thường.</li>
        <li>Không chọn được làm phần thưởng mới; phần thưởng đã cấu hình trước đó giữ nguyên.</li>
      </ul>
      <ReasonField value={reason} onChange={setReason} touched={touched} onBlur={() => setTouched(true)}
        placeholder="VD: Hết mùa sự kiện, thay bằng khung mới." />
      <ErrorAlert message={errorMessage} />
    </ConfirmModal>
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
}) => (
  <ConfirmModal
    isOpen={isOpen}
    title="Xóa bản nháp"
    tone="danger"
    busy={isDeleting}
    busyLabel="Đang xóa…"
    confirmLabel="Xóa bản nháp"
    onClose={onClose}
    onConfirm={onConfirm}
  >
    <p className="text-body text-text leading-relaxed">
      Xóa bản nháp <strong className="font-bold">{itemName}</strong>?
    </p>
    <p className="text-body text-text-muted">Vật phẩm sẽ bị xóa vĩnh viễn. Không thể hoàn tác.</p>
    <ErrorAlert message={errorMessage} />
  </ConfirmModal>
);

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
}) => (
  <ConfirmModal
    isOpen={isOpen}
    title="Thay đổi loại vật phẩm"
    tone="warning"
    confirmVariant="primary"
    confirmLabel="Đồng ý thay đổi"
    onClose={onClose}
    onConfirm={onConfirm}
  >
    <p className="text-xs text-text leading-relaxed">
      Bạn đang chuyển sang loại <strong className="text-text font-bold">{formatShopItemTypeLabel(newType)}</strong>.
    </p>
    <div className="p-3 bg-warning-light border border-warning/40 rounded-lg text-xs text-warning-dark">
      <p className="font-semibold">Cấu hình riêng của loại hiện tại sẽ bị xóa.</p>
      <p className="mt-0.5 text-warning-dark">
        Các thông tin đặc thù của loại cũ sẽ bị đặt lại về giá trị mặc định của loại mới.
      </p>
    </div>
  </ConfirmModal>
);

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
    <div className="p-4 bg-danger-light border border-danger/40 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-danger-dark shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-danger-dark">
            Xung đột phiên bản
          </h4>
          <p className="text-xs text-danger-dark mt-0.5 leading-relaxed">
            Vật phẩm này đã được chỉnh sửa ở phiên khác. Phiên bản hiện tại trên máy chủ là{' '}
            <strong>v{serverVersion ?? '?'}</strong>, phiên bản cục bộ đang giữ là{' '}
            <strong>v{localVersion ?? '?'}</strong>.
          </p>
          <p className="text-xs text-danger-dark mt-1">
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
