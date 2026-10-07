import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AdminShopItemDTO,
  ShopItemForm,
  ShopItemStatus,
  ShopItemType,
  FieldSpec,
} from '../../../domains/shop/types';
import {
  useAdminShopItem,
  useShopItemTypes,
  useCreateShopItem,
  useUpdateShopItem,
  usePublishShopItem,
  useArchiveShopItem,
  useDeleteShopItem,
} from '../../../domains/shop/queries';
import {
  isFieldEditable,
  deriveSaleState,
  formatThemeKeyLabel,
  mapBackendErrorsToFields,
  SHOP_TZ_LABEL,
  vnInputToIso,
  configForType,
  itemToForm as toForm,
  formToPayload as toPayload,
  changedFields,
  buildUpdatePayload,
  SHOP_FIELD_LABELS as FIELD_LABELS,
} from '../../../domains/shop/mappers';
import { ApiClientError } from '../../../lib/api-client';
import { SaleStateBadge, ShopItemStatusBadge } from '../components/ShopItemStatusBadge';
import { ShopItemPreview } from '../components/ShopItemPreview';
import { Badge, Button } from '../../../components/ui';
import { AssetUploadField } from '../components/AssetUploadField';
import {
  PublishConfirmationModal,
  ArchiveConfirmationModal,
  DeleteConfirmationModal,
  TypeChangeConfirmationModal,
  VersionConflictBanner,
} from '../components/ShopModals';
import {
  ArrowLeft,
  Save,
  Globe,
  Archive,
  Trash2,
  Lock,
  Coins,
  Sparkles,
  Zap,
  AlertCircle,
  Calendar,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface ShopItemEditorPageProps {
  mode: 'create' | 'edit';
  itemId?: number;
  onBack: () => void;
  onSaved?: (item: AdminShopItemDTO) => void;
  onToast?: (message: string) => void;
  /** Unsaved edits or a write/upload in flight; the shell asks before navigating away. */
  onDirtyChange?: (dirty: boolean) => void;
}

const DEFAULT_FORM_DATA: ShopItemForm = {
  code: '',
  name: '',
  description: '',
  type: 'THEME',
  iconKey: null,
  purchasable: false,
  price: null,
  availableFrom: null,
  availableUntil: null,
  sortOrder: 0,
  ...configForType('THEME'),
};

const TYPE_OPTIONS: {
  type: ShopItemType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'THEME',
    label: 'Giao diện cửa hàng',
    desc: 'Đổi giao diện Cửa hàng, Kho đồ và Ví Coin',
    icon: <Sparkles size={16} />,
  },
  {
    type: 'AVATAR_FRAME',
    label: 'Khung avatar',
    desc: 'Trang trí hồ sơ người học',
    icon: <ImageIcon size={16} />,
  },
  {
    type: 'XP_BOOSTER',
    label: 'XP Booster',
    desc: 'Nhân đôi XP trong thời gian giới hạn',
    icon: <Zap size={16} />,
  },
];

/** "Khóa" with the reason on hover, so operators know why a field cannot change. */
const LockTag: React.FC<{ archived: boolean }> = ({ archived }) => (
  <Badge
    icon={<Lock />}
    className="cursor-help"
    title={archived
      ? 'Vật phẩm đã lưu trữ: chỉ còn sửa được tên, mô tả, icon và thứ tự hiển thị.'
      : 'Khóa sau phát hành: phần thưởng và vật phẩm người học đã mua tham chiếu tới trường này.'}
  >
    {archived ? 'Đã lưu trữ' : 'Khóa sau phát hành'}
  </Badge>
);

export const ShopItemEditorPage: React.FC<ShopItemEditorPageProps> = ({
  mode,
  itemId,
  onBack,
  onSaved,
  onToast,
  onDirtyChange,
}) => {
  // 1. Fetch metadata & existing item
  const { data: metadata, isError: isMetadataError, refetch: refetchMetadata } = useShopItemTypes();
  const {
    data: existingItem,
    isLoading: isItemLoading,
    error: itemError,
    refetch: refetchItem,
    isFetching: isItemFetching,
  } = useAdminShopItem(itemId);

  // 2. Form state
  const [formData, setFormData] = useState<ShopItemForm>(DEFAULT_FORM_DATA);
  const [initialData, setInitialData] = useState<ShopItemForm>(DEFAULT_FORM_DATA);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [itemStatus, setItemStatus] = useState<ShopItemStatus>('DRAFT');
  const [availabilityMode, setAvailabilityMode] = useState<'UNLIMITED' | 'SCHEDULED'>('UNLIMITED');
  const [previewUrls, setPreviewUrls] = useState<{
    iconUrl?: string | null;
    frameAssetUrl?: string | null;
  }>({});

  // 3. UI states: errors, conflicts, modals
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState<{
    isConflict: boolean;
    serverVersion?: number;
  }>({ isConflict: false });

  const [pendingTypeChange, setPendingTypeChange] = useState<ShopItemType | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // Lifecycle errors stay inside the open modal; closing it clears them.
  const [modalError, setModalError] = useState<string | null>(null);
  // Edits kept aside while reloading after a version conflict, so they can be re-applied.
  const [stashedEdits, setStashedEdits] = useState<Partial<ShopItemForm> | null>(null);
  // Asset uploads in flight; the key in the form is stale until they finish.
  const [uploadingCount, setUploadingCount] = useState(0);
  const handleUploadingChange = useCallback(
    (uploading: boolean) => setUploadingCount((n) => n + (uploading ? 1 : -1)),
    []
  );

  // Mutations
  const createMutation = useCreateShopItem();
  const updateMutation = useUpdateShopItem();
  const publishMutation = usePublishShopItem();
  const archiveMutation = useArchiveShopItem();
  const deleteMutation = useDeleteShopItem();

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  // Read by the load effect without re-running it on every keystroke. Declared first so it syncs first.
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  });
  // True while this editor's own save/publish/archive is in flight: their handlers apply the result.
  const ownWriteRef = useRef(false);

  const loadItem = useCallback((item: AdminShopItemDTO) => {
    const populated = toForm(item);
    setFormData(populated);
    setInitialData(populated);
    setCurrentVersion(item.version);
    setItemStatus(item.status);
    setAvailabilityMode(item.availableFrom || item.availableUntil ? 'SCHEDULED' : 'UNLIMITED');
    setPreviewUrls({ iconUrl: item.iconUrl, frameAssetUrl: item.frameAssetUrl });
    setVersionConflict({ isConflict: false });
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  // Sync the form from the server only when nothing is unsaved. A newer server version arriving while
  // the operator has edits (background refetch, another admin) becomes a conflict, never a silent overwrite.
  useEffect(() => {
    if (!existingItem || mode !== 'edit' || ownWriteRef.current) return;
    if (!dirtyRef.current) {
      loadItem(existingItem);
    } else if (currentVersion !== null && existingItem.version !== currentVersion) {
      setVersionConflict({ isConflict: true, serverVersion: existingItem.version });
    }
  }, [existingItem, mode, currentVersion, loadItem]);


  // Derived metadata map for quick field checking
  const currentTypeMetadata = useMemo(() => {
    return metadata?.types.find((t) => t.type === formData.type);
  }, [metadata, formData.type]);

  // Backend lists only themes not yet sold by another item; none left means nothing can be chosen here.
  const themeOptionsEmpty = Boolean(metadata) && formData.type === 'THEME'
    && !initialData.themeKey
    && (currentTypeMetadata?.fields.find((f) => f.name === 'themeKey')?.options?.length ?? 0) === 0;

  const getFieldSpec = (fieldName: string): FieldSpec | undefined => {
    const common = metadata?.commonFields.find((f) => f.name === fieldName);
    if (common) return common;
    return currentTypeMetadata?.fields.find((f) => f.name === fieldName);
  };

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời màn này và bỏ các thay đổi?')) return;
    onBack();
  };

  const isEditable = (fieldName: string, status: ShopItemStatus = itemStatus): boolean => {
    if (mode === 'create') return true;
    return isFieldEditable(getFieldSpec(fieldName), status);
  };

  // Label/error wiring for assistive technology.
  const a11y = (field: string) => ({
    id: `shop-${field}`,
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `shop-${field}-error` : undefined,
  });

  // Change handler with error clearing
  const handleFieldChange = <K extends keyof ShopItemForm>(
    field: K,
    value: ShopItemForm[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) setGeneralError(null);
  };

  // Toggle purchasable with sensible default price
  const handleTogglePurchasable = (checked: boolean) => {
    handleFieldChange('purchasable', checked);
    if (checked && (formData.price == null || formData.price === 0)) {
      handleFieldChange('price', 100);
    }
  };

  // Toggle availability mode (unlimited vs scheduled)
  const handleSelectAvailabilityMode = (newMode: 'UNLIMITED' | 'SCHEDULED') => {
    setAvailabilityMode(newMode);
    if (newMode === 'UNLIMITED') {
      handleFieldChange('availableFrom', null);
      handleFieldChange('availableUntil', null);
    }
  };

  // Handle Type Change with confirmation
  const handleTypeSelect = (newType: ShopItemType) => {
    if (newType === formData.type) return;

    if (mode === 'create' || itemStatus === 'DRAFT') {
      setPendingTypeChange(newType);
    }
  };

  const handleConfirmTypeChange = () => {
    if (!pendingTypeChange) return;

    const newType = pendingTypeChange;

    setFormData((prev) => ({ ...prev, type: newType, ...configForType(newType) }));
    setPreviewUrls((prev) => ({ ...prev, frameAssetUrl: null }));
    setPendingTypeChange(null);
  };

  // Client validation
  const validateFormClient = (): boolean => {
    const errors: Record<string, string> = {};

    const code = formData.code?.trim() || '';
    if (!code) {
      errors.code = 'Mã vật phẩm không được để trống.';
    } else if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(code)) {
      errors.code = 'Mã vật phẩm phải viết HOA, bắt đầu bằng chữ cái, từ 3-64 ký tự (A-Z, 0-9, _).';
    }

    const name = formData.name?.trim() || '';
    if (!name) {
      errors.name = 'Tên vật phẩm không được để trống.';
    } else if (formData.name!.length > 100) {
      errors.name = 'Tên vật phẩm tối đa 100 ký tự.';
    }

    if ((formData.description?.length ?? 0) > 500) {
      errors.description = 'Mô tả tối đa 500 ký tự.';
    }

    if (!Number.isInteger(formData.sortOrder) || formData.sortOrder! < 0) {
      errors.sortOrder = 'Thứ tự hiển thị phải là số nguyên ≥ 0.';
    }

    if (formData.purchasable) {
      if (formData.price == null || formData.price < 1 || formData.price > 100000) {
        errors.price = 'Giá bán phải từ 1 đến 100,000 Coin khi mở bán.';
      }
    }

    if (formData.availableFrom && formData.availableUntil) {
      if (new Date(formData.availableFrom) >= new Date(formData.availableUntil)) {
        errors.availableUntil = 'Thời điểm kết thúc phải sau thời điểm bắt đầu.';
      }
    }

    if (formData.type === 'THEME' && !formData.themeKey) {
      errors.themeKey = 'Vui lòng chọn bộ giao diện.';
    }

    if (formData.type === 'XP_BOOSTER') {
      if (
        formData.boostDurationMinutes == null ||
        formData.boostDurationMinutes < 5 ||
        formData.boostDurationMinutes > 180
      ) {
        errors.boostDurationMinutes = 'Thời lượng hiệu lực phải từ 5 đến 180 phút.';
      }
      if (
        formData.maxQuantity == null ||
        formData.maxQuantity < 1 ||
        formData.maxQuantity > 10
      ) {
        errors.maxQuantity = 'Số lượng tối đa người dùng có thể giữ phải từ 1 đến 10.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('Vui lòng kiểm tra lại các trường có lỗi bên dưới.');
      return false;
    }

    return true;
  };

  // SAVE HANDLER
  /** Returns the saved item, or null when validation/save failed (errors are shown). */
  const handleSave = async (): Promise<AdminShopItemDTO | null> => {
    if (!validateFormClient()) return null;

    setGeneralError(null);
    setFieldErrors({});

    ownWriteRef.current = true;
    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(toPayload(formData));
        setInitialData(formData);
        onToast?.(`Đã lưu bản nháp "${created.name}".`);
        onSaved?.(created);
        return created;
      } else if (mode === 'edit' && itemId) {
        if (currentVersion === null) {
          throw new Error('Thiếu thông tin phiên bản để cập nhật.');
        }

        const updated = await updateMutation.mutateAsync({
          id: itemId,
          payload: buildUpdatePayload(formData, initialData, currentVersion),
        });

        loadItem(updated);
        onToast?.(`Đã lưu "${updated.name}" (v${updated.version}).`);
        onSaved?.(updated);
        return updated;
      }
      return null;
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setFieldErrors(mapped.fieldErrors);
      // A conflict has its own banner with the way out.
      setGeneralError(mapped.isVersionConflict ? null : `Lưu thất bại. ${mapped.generalError ?? ''}`.trim());

      if (mapped.isVersionConflict) {
        setVersionConflict({
          isConflict: true,
          serverVersion: mapped.serverVersion,
        });
      }
      return null;
    } finally {
      ownWriteRef.current = false;
    }
  };

  /** Publish always acts on what is on screen: unsaved edits are saved first. */
  const handlePublishClick = async () => {
    if (isDirty && !(await handleSave())) return;
    setModalError(null);
    setIsPublishModalOpen(true);
  };

  // PUBLISH HANDLER
  const handleConfirmPublish = async () => {
    if (!itemId) return;
    ownWriteRef.current = true;
    try {
      const published = await publishMutation.mutateAsync(itemId);
      loadItem(published);
      setIsPublishModalOpen(false);
      onToast?.(`Vật phẩm "${published.name}" đã được phát hành thành công.`);
      onSaved?.(published);
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setFieldErrors(mapped.fieldErrors);
      setModalError(mapped.generalError || 'Phát hành thất bại. Kiểm tra các trường được đánh dấu.');
    } finally {
      ownWriteRef.current = false;
    }
  };

  /** Archive acts on saved data too: unsaved edits are saved first, then the server result replaces the form. */
  const handleArchiveClick = async () => {
    if (isDirty && !(await handleSave())) return;
    setModalError(null);
    setIsArchiveModalOpen(true);
  };

  // ARCHIVE HANDLER
  const handleConfirmArchive = async () => {
    if (!itemId) return;
    ownWriteRef.current = true;
    try {
      const archived = await archiveMutation.mutateAsync(itemId);
      loadItem(archived);
      setIsArchiveModalOpen(false);
      onToast?.(`Vật phẩm "${archived.name}" đã được lưu trữ.`);
      onSaved?.(archived);
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setModalError(mapped.generalError || 'Lưu trữ thất bại.');
    } finally {
      ownWriteRef.current = false;
    }
  };

  // DELETE DRAFT HANDLER
  const handleConfirmDelete = async () => {
    if (!itemId) return;
    try {
      await deleteMutation.mutateAsync(itemId);
      setIsDeleteModalOpen(false);
      onToast?.(`Đã xóa bản nháp thành công.`);
      onBack();
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setModalError(mapped.generalError || 'Xóa bản nháp thất bại.');
    }
  };

  // RELOAD ITEM FROM SERVER (Version Conflict CTA)
  const handleReloadItem = async () => {
    const edits = changedFields(formData, initialData);
    const res = await refetchItem();
    // On failure TanStack still hands back the cached item: that is not the server's latest.
    if (res.isError || !res.data) {
      setGeneralError('Không tải được bản mới nhất. Thay đổi của bạn vẫn được giữ; thử lại sau.');
      return;
    }
    const fresh = res.data;
    // Edits to fields the new status locks cannot be re-applied (the server would refuse them).
    const keep = Object.fromEntries(Object.entries(edits).filter(([k]) => isEditable(k, fresh.status)));
    const dropped = Object.keys(edits).filter((k) => !(k in keep)).map((k) => FIELD_LABELS[k] ?? k);
    loadItem(fresh);
    setStashedEdits(Object.keys(keep).length > 0 ? keep : null);
    onToast?.(`Đã nạp phiên bản v${fresh.version} từ máy chủ.`
      + (dropped.length ? ` Bỏ thay đổi ở trường đã khóa: ${dropped.join(', ')}.` : ''));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  // Anything that would act on a half-uploaded asset or race the current write waits.
  const isBusy = isSaving || uploadingCount > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty || isBusy);
  }, [isDirty, isBusy, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  // Live conclusion of the form as it stands; drafts show what publishing would lead to.
  const saleOutcome = deriveSaleState({
    status: itemStatus === 'DRAFT' ? 'PUBLISHED' : itemStatus,
    purchasable: formData.purchasable,
    availableFrom: vnInputToIso(formData.availableFrom),
    availableUntil: vnInputToIso(formData.availableUntil),
  });


  if (mode === 'edit' && !existingItem && itemError) {
    const notFound = itemError instanceof ApiClientError && itemError.code === 'SHOP_ITEM_NOT_FOUND';
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle size={28} className="text-danger" />
        <span className="text-[13px] font-semibold text-text">
          {notFound ? 'Vật phẩm không còn tồn tại.' : 'Không tải được thông tin vật phẩm.'}
        </span>
        <div className="flex gap-2">
          <Button icon={<ArrowLeft />} onClick={onBack}>Quay lại danh sách</Button>
          {!notFound && (
            <Button variant="primary" loading={isItemFetching} onClick={() => void refetchItem()}>Thử lại</Button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'edit' && (isItemLoading || !existingItem)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin text-primary" />
        <span className="text-[13px] font-semibold text-text-muted">Đang tải thông tin vật phẩm...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <button
          type="button"
          onClick={handleBack}
          className="hover:text-text hover:underline cursor-pointer transition-colors"
        >
          Cửa hàng
        </button>
        <span>/</span>
        <span className="text-text font-medium">
          {mode === 'create' ? 'Tạo vật phẩm mới' : (formData.name || 'Chỉnh sửa vật phẩm')}
        </span>
      </div>

      {/* EDITOR HEADER */}
      <div className="sticky -top-4 sm:-top-6 z-20 bg-background pt-4 sm:pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button icon={<ArrowLeft />} label="Quay lại danh sách" onClick={handleBack} />

          <div>
            <h2 className="text-lg font-extrabold text-text tracking-tight flex items-center gap-2.5">
              <span>
                {mode === 'create'
                  ? 'Tạo vật phẩm mới'
                  : (formData.name || formData.code || `#${itemId}`)}
              </span>
              <ShopItemStatusBadge status={itemStatus} />
              {currentVersion !== null && <Badge className="font-mono">v{currentVersion}</Badge>}
            </h2>
            <p className="text-[13px] mt-0.5" aria-live="polite">
              {isDirty ? (
                <Badge tone="warning">Có thay đổi chưa lưu</Badge>
              ) : mode === 'edit' ? (
                <span className="text-text-muted">Đã lưu</span>
              ) : (
                <span className="text-text-muted">Lưu bản nháp trước, sau đó có thể phát hành.</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions: one primary (Save). Publish sits beside it as secondary; danger-outline only opens a confirmation. */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {mode === 'edit' && itemStatus === 'DRAFT' && (
            <Button
              variant="danger-outline"
              icon={<Trash2 />}
              label="Xóa bản nháp"
              disabled={isBusy}
              onClick={() => { setModalError(null); setIsDeleteModalOpen(true); }}
            />
          )}

          {mode === 'edit' && itemStatus === 'PUBLISHED' && (
            <Button
              variant="danger-outline"
              icon={<Archive />}
              disabled={isBusy}
              onClick={() => void handleArchiveClick()}
            >
              Ngừng bán vĩnh viễn
            </Button>
          )}

          {mode === 'edit' && itemStatus === 'DRAFT' && (
            <Button icon={<Globe />} disabled={isBusy} onClick={() => void handlePublishClick()}>
              {isDirty ? 'Lưu và phát hành' : 'Phát hành'}
            </Button>
          )}

          <Button
            variant="primary"
            icon={<Save />}
            loading={isSaving}
            loadingText="Đang lưu…"
            disabled={uploadingCount > 0 || (mode === 'edit' && !isDirty)}
            onClick={() => void handleSave()}
          >
            {mode === 'create' ? 'Lưu bản nháp' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      {/* VERSION CONFLICT BANNER */}
      {versionConflict.isConflict && (
        <VersionConflictBanner
          serverVersion={versionConflict.serverVersion}
          localVersion={currentVersion ?? undefined}
          onReload={handleReloadItem}
          isReloading={isItemFetching}
        />
      )}

      {/* EDITS KEPT ACROSS A VERSION-CONFLICT RELOAD */}
      {stashedEdits && (
        <div className="p-3 bg-info-light border border-info/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] text-info-dark">
          <span>
            Đã tải bản mới nhất. Bạn còn thay đổi chưa lưu ở:{' '}
            <strong>{Object.keys(stashedEdits).map((k) => FIELD_LABELS[k] ?? k).join(', ')}</strong>.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button variant="primary" size="sm" onClick={() => { setFormData((prev) => ({ ...prev, ...stashedEdits })); setStashedEdits(null); }}>
              Áp dụng lại thay đổi của tôi
            </Button>
            <Button size="sm" onClick={() => setStashedEdits(null)}>Bỏ</Button>
          </div>
        </div>
      )}

      {isMetadataError && !metadata && (
        <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-center justify-between gap-2 text-[13px] text-danger-dark">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            Không tải được cấu hình biểu mẫu (bộ giao diện còn trống, trường được phép sửa).
          </span>
          <Button size="sm" onClick={() => void refetchMetadata()}>Thử lại</Button>
        </div>
      )}

      {/* GENERAL ERROR BANNER */}
      {generalError && (
        <div role="alert" className="p-3 bg-danger-light border border-danger/30 rounded-xl flex items-center gap-2 text-[13px] text-danger-dark">
          <AlertCircle size={16} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      {/* FORM BODY — 3 CONSOLIDATED SECTIONS */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">

        {/* SECTION 1: THÔNG TIN VẬT PHẨM (Code, Name, Description, Type & Type-specific Config) */}
        <div className="px-5 py-4 space-y-4">
          <h3 className="text-sm font-bold text-text">
            1. Thông tin vật phẩm
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã vật phẩm (Code) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-code" className="text-[13px] font-semibold text-text">
                  Mã vật phẩm <span className="text-danger">*</span>
                </label>
                {!isEditable('code') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              </div>
              <input
                {...a11y('code')}
                type="text"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                disabled={!isEditable('code') || isSaving}
                placeholder="VD: THEME_NEON_NIGHT"
                className={`w-full px-3 py-2 text-[13px] font-mono rounded-lg border bg-surface text-text ${
                  fieldErrors.code
                    ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                    : !isEditable('code')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.code ? (
                <p id="shop-code-error" className="text-xs text-danger-dark">{fieldErrors.code}</p>
              ) : (
                <p className="text-xs text-text-muted">
                  Dùng để tham chiếu trong hệ thống và phần thưởng. Không thể thay đổi sau khi phát hành.
                </p>
              )}
            </div>

            {/* Tên vật phẩm (Name) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-name" className="text-[13px] font-semibold text-text">
                  Tên vật phẩm <span className="text-danger">*</span>
                </label>
                {!isEditable('name') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              </div>
              <input
                {...a11y('name')}
                type="text"
                maxLength={100}
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                disabled={!isEditable('name') || isSaving}
                placeholder="VD: Giao diện Neon Dạ Quang"
                className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                  fieldErrors.name
                    ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                    : !isEditable('name')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.name && (
                <p id="shop-name-error" className="text-xs text-danger-dark">{fieldErrors.name}</p>
              )}
            </div>

            {/* Mô tả (Description) */}
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="shop-description" className="text-[13px] font-semibold text-text">Mô tả</label>
              <textarea
                {...a11y('description')}
                maxLength={500}
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={!isEditable('description') || isSaving}
                rows={2}
                placeholder="Mô tả công dụng hoặc đặc điểm nổi bật của vật phẩm..."
                className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text resize-none ${
                  fieldErrors.description
                    ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                    : !isEditable('description')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.description && (
                <p id="shop-description-error" className="text-xs text-danger-dark">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Chọn Loại Vật Phẩm */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-text">
                Loại vật phẩm
              </label>
              {!isEditable('type') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = formData.type === opt.type;
                const canChange = isEditable('type');

                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={!canChange || isBusy}
                    aria-pressed={isSelected}
                    onClick={() => handleTypeSelect(opt.type)}
                    className={`px-3 py-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-solid bg-primary-light ring-1 ring-primary-solid'
                        : 'border-border bg-surface hover:bg-surface-subtle'
                    } ${!canChange ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-primary-dark' : 'text-text-muted'}`}>
                      {opt.icon}
                    </span>
                    <div className="min-w-0">
                      <div className={`font-semibold text-[13px] ${isSelected ? 'text-primary-dark' : 'text-text'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cấu hình đặc thù theo loại */}
          {/* TYPE: THEME */}
          {formData.type === 'THEME' && (
            <div className="space-y-1.5 max-w-md pt-3 border-t border-border/70">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-themeKey" className="text-[13px] font-semibold text-text">
                  Bộ giao diện <span className="text-danger">*</span>
                </label>
                {!isEditable('themeKey') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              </div>
              {(() => {
                const free = currentTypeMetadata?.fields.find((f) => f.name === 'themeKey')?.options ?? [];
                const own = initialData.type === 'THEME' && initialData.themeKey ? [initialData.themeKey] : [];
                const options = [...new Set([...own, ...free])];

                return (
                  <select
                    {...a11y('themeKey')}
                    value={formData.themeKey || ''}
                    onChange={(e) => handleFieldChange('themeKey', e.target.value)}
                    disabled={!isEditable('themeKey') || isSaving}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text cursor-pointer ${
                      fieldErrors.themeKey
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('themeKey')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  >
                    <option value="" disabled>-- Chọn bộ giao diện --</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatThemeKeyLabel(opt)}
                      </option>
                    ))}
                  </select>
                );
              })()}
              {fieldErrors.themeKey ? (
                <p id="shop-themeKey-error" className="text-xs text-danger-dark">{fieldErrors.themeKey}</p>
              ) : themeOptionsEmpty ? (
                <p className="text-xs text-warning-dark">
                  Cả 3 bộ giao diện đã có vật phẩm (mỗi bộ chỉ bán bằng một vật phẩm). Hãy sửa vật phẩm giao diện sẵn có.
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  Áp dụng cho Cửa hàng, Kho đồ và Ví Coin của người học (không đổi toàn ứng dụng).
                </p>
              )}
            </div>
          )}

          {/* TYPE: AVATAR_FRAME */}
          {formData.type === 'AVATAR_FRAME' && (
            <div className="pt-3 border-t border-border/70">
              <AssetUploadField
                label="Ảnh khung avatar"
                helperText="Ảnh vuông 512×512, nền trong suốt; vòng avatar chiếm khoảng 58% ở giữa."
                type="frame"
                valueKey={formData.frameAssetKey}
                previewUrl={previewUrls.frameAssetUrl}
                disabled={!isEditable('frameAssetKey') || isSaving}
                error={fieldErrors.frameAssetKey}
                onUploadingChange={handleUploadingChange}
                onChange={(objectName, localUrl) => {
                  handleFieldChange('frameAssetKey', objectName);
                  setPreviewUrls((prev) => ({ ...prev, frameAssetUrl: localUrl }));
                }}
              />
            </div>
          )}

          {/* TYPE: XP_BOOSTER */}
          {formData.type === 'XP_BOOSTER' && (
            <div className="space-y-4 pt-3 border-t border-border/70">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                <Zap size={14} className="text-amber-600" />
                <span>Hiệu ứng cố định: ×2 XP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* boostDurationMinutes */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="shop-boostDurationMinutes" className="text-[13px] font-semibold text-text">
                      Thời lượng hiệu lực (phút) <span className="text-danger">*</span>
                    </label>
                    {!isEditable('boostDurationMinutes') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
                  </div>
                  <input
                    {...a11y('boostDurationMinutes')}
                    type="number"
                    min={5}
                    max={180}
                    value={formData.boostDurationMinutes ?? 30}
                    onChange={(e) => handleFieldChange('boostDurationMinutes', parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('boostDurationMinutes') || isSaving}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                      fieldErrors.boostDurationMinutes
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('boostDurationMinutes')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.boostDurationMinutes ? (
                    <p id="shop-boostDurationMinutes-error" className="text-xs text-danger-dark">{fieldErrors.boostDurationMinutes}</p>
                  ) : (
                    <p className="text-xs text-text-muted">5 đến 180 phút (mặc định: 30 phút).</p>
                  )}
                </div>

                {/* maxQuantity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="shop-maxQuantity" className="text-[13px] font-semibold text-text">
                      Số lượng tối đa trong túi đồ <span className="text-danger">*</span>
                    </label>
                    {!isEditable('maxQuantity') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
                  </div>
                  <input
                    {...a11y('maxQuantity')}
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxQuantity ?? 5}
                    onChange={(e) => handleFieldChange('maxQuantity', parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('maxQuantity') || isSaving}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                      fieldErrors.maxQuantity
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('maxQuantity')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.maxQuantity ? (
                    <p id="shop-maxQuantity-error" className="text-xs text-danger-dark">{fieldErrors.maxQuantity}</p>
                  ) : (
                    <p className="text-xs text-text-muted">1 đến 10 vật phẩm (mặc định: 5).</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: BÁN TRONG CỬA HÀNG (Purchasable, Price, Sort Order & Availability Window) */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">
              2. Bán trong cửa hàng
            </h3>
          </div>

          {/* Live conclusion: status + purchasable + window, so the operator never has to combine them. */}
          <div className="flex flex-wrap items-start gap-2 p-3 rounded-lg bg-surface-subtle">
            <span className="text-[13px] font-semibold text-text pt-0.5">
              {itemStatus === 'DRAFT' ? 'Sau khi phát hành:' : 'Trạng thái bán:'}
            </span>
            <SaleStateBadge sale={saleOutcome} />
          </div>

          {/* Cho phép mua trong cửa hàng setting row with switch */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div id="shop-purchasable-label" className="text-[13px] font-semibold text-text">
                Cho phép mua trong cửa hàng
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Người học có thể mua vật phẩm này bằng Coin.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isEditable('purchasable') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              <button
                type="button"
                role="switch"
                aria-labelledby="shop-purchasable-label"
                aria-checked={Boolean(formData.purchasable)}
                disabled={!isEditable('purchasable') || isSaving}
                onClick={() => handleTogglePurchasable(!formData.purchasable)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.purchasable ? 'bg-primary-solid' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    formData.purchasable ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Giá bán & Thứ tự hiển thị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Giá bán */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-price" className="text-[13px] font-semibold text-text">
                  Giá bán (Coin) {formData.purchasable && <span className="text-danger">*</span>}
                </label>
                {!isEditable('price') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              </div>

              <div className="relative">
                <Coins
                  size={14}
                  className={`absolute left-3 top-2.5 ${formData.purchasable ? 'text-amber-500' : 'text-text-muted/40'}`}
                />
                {formData.purchasable ? (
                  <input
                    {...a11y('price')}
                    type="number"
                    min={1}
                    max={100000}
                    value={formData.price ?? ''}
                    onChange={(e) => handleFieldChange('price', e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('price') || isSaving}
                    placeholder="100"
                    className={`w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                      fieldErrors.price
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('price')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value=""
                    placeholder="Bật “Cho phép mua” để đặt giá"
                    className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-border bg-surface-subtle text-text-muted cursor-not-allowed italic"
                  />
                )}
              </div>

              {fieldErrors.price ? (
                <p id="shop-price-error" className="text-xs text-danger-dark">{fieldErrors.price}</p>
              ) : (
                <p className="text-xs text-text-muted">
                  {formData.purchasable ? '1 đến 100,000 Coin.' : 'Chỉ áp dụng khi vật phẩm được mở bán.'}
                </p>
              )}
            </div>

            {/* Thứ tự hiển thị (Sort Order) - secondary operational field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="shop-sortOrder" className="text-[13px] font-semibold text-text">
                  Thứ tự hiển thị
                </label>
                {!isEditable('sortOrder') && <LockTag archived={itemStatus === 'ARCHIVED'} />}
              </div>
              <input
                {...a11y('sortOrder')}
                type="number"
                min={0}
                step={1}
                value={formData.sortOrder}
                onChange={(e) => handleFieldChange('sortOrder', e.target.value === '' ? 0 : Number(e.target.value))}
                disabled={!isEditable('sortOrder') || isSaving}
                className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                  fieldErrors.sortOrder
                    ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                    : !isEditable('sortOrder')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.sortOrder ? (
                <p id="shop-sortOrder-error" className="text-xs text-danger-dark">{fieldErrors.sortOrder}</p>
              ) : (
                <p className="text-xs text-text-muted">Số nhỏ hơn sẽ hiển thị trước trong Shop.</p>
              )}
            </div>
          </div>

          {/* Thời gian bán */}
          <div className="space-y-3 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-text">
                Thời gian bán
              </label>
            </div>

            {/* Radio mode selection */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                <input
                  type="radio"
                  name="availabilityMode"
                  checked={availabilityMode === 'UNLIMITED'}
                  onChange={() => handleSelectAvailabilityMode('UNLIMITED')}
                  disabled={(!isEditable('availableFrom') && !isEditable('availableUntil')) || isSaving}
                  className="w-3.5 h-3.5 accent-primary-solid cursor-pointer"
                />
                <span>Không giới hạn</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                <input
                  type="radio"
                  name="availabilityMode"
                  checked={availabilityMode === 'SCHEDULED'}
                  onChange={() => handleSelectAvailabilityMode('SCHEDULED')}
                  disabled={(!isEditable('availableFrom') && !isEditable('availableUntil')) || isSaving}
                  className="w-3.5 h-3.5 accent-primary-solid cursor-pointer"
                />
                <span>Theo thời gian</span>
              </label>
            </div>

            {/* Scheduled date range inputs */}
            {availabilityMode === 'SCHEDULED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <label htmlFor="shop-availableFrom" className="text-[13px] font-semibold text-text flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-muted" />
                    Bắt đầu bán từ ({SHOP_TZ_LABEL})
                  </label>
                  <input
                    {...a11y('availableFrom')}
                    type="datetime-local"
                    value={formData.availableFrom || ''}
                    onChange={(e) => handleFieldChange('availableFrom', e.target.value || null)}
                    disabled={!isEditable('availableFrom') || isSaving}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                      fieldErrors.availableFrom
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('availableFrom')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.availableFrom && (
                    <p id="shop-availableFrom-error" className="text-xs text-danger-dark">{fieldErrors.availableFrom}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="shop-availableUntil" className="text-[13px] font-semibold text-text flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-muted" />
                    Kết thúc bán lúc ({SHOP_TZ_LABEL})
                  </label>
                  <input
                    {...a11y('availableUntil')}
                    type="datetime-local"
                    value={formData.availableUntil || ''}
                    onChange={(e) => handleFieldChange('availableUntil', e.target.value || null)}
                    disabled={!isEditable('availableUntil') || isSaving}
                    className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-surface text-text ${
                      fieldErrors.availableUntil
                        ? 'border-danger bg-danger-light/30 ring-1 ring-danger'
                        : !isEditable('availableUntil')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.availableUntil && (
                    <p id="shop-availableUntil-error" className="text-xs text-danger-dark">{fieldErrors.availableUntil}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: HÌNH ẢNH (Icon) */}
        <div className="px-5 py-4 space-y-3">
          <h3 className="text-sm font-bold text-text">
            3. Hình ảnh
          </h3>

          <AssetUploadField
            label="Icon vật phẩm"
            helperText="Hiển thị trên card trong Cửa hàng và Kho đồ."
            type="icon"
            valueKey={formData.iconKey}
            previewUrl={previewUrls.iconUrl}
            disabled={!isEditable('iconKey') || isSaving}
            error={fieldErrors.iconKey}
            onUploadingChange={handleUploadingChange}
            onChange={(objectName, localUrl) => {
              handleFieldChange('iconKey', objectName);
              setPreviewUrls((prev) => ({ ...prev, iconUrl: localUrl }));
            }}
          />
        </div>
      </div>

        <div className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
          <ShopItemPreview form={formData} iconUrl={previewUrls.iconUrl} frameUrl={previewUrls.frameAssetUrl} />
        </div>
      </div>

      {/* METADATA FOOTER — compact */}
      {mode === 'edit' && existingItem && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-text-muted px-1">
          <span>ID: <span className="font-mono text-text">#{existingItem.id}</span></span>
          <span>Tạo: <span className="font-mono text-text">{new Date(existingItem.createdAt).toLocaleDateString('vi-VN')}</span></span>
          <span>Cập nhật: <span className="font-mono text-text">{new Date(existingItem.updatedAt).toLocaleDateString('vi-VN')}</span></span>
          {existingItem.publishedAt && (
            <span>Phát hành: <span className="font-mono text-emerald-700">{new Date(existingItem.publishedAt).toLocaleDateString('vi-VN')}</span></span>
          )}
        </div>
      )}

      {/* CONFIRMATION MODALS */}
      {existingItem && (
        <>
          <PublishConfirmationModal
            isOpen={isPublishModalOpen}
            item={existingItem}
            isPublishing={publishMutation.isPending}
            errorMessage={modalError}
            onClose={() => { setIsPublishModalOpen(false); setModalError(null); }}
            onConfirm={handleConfirmPublish}
          />

          <ArchiveConfirmationModal
            isOpen={isArchiveModalOpen}
            itemName={existingItem.name}
            isArchiving={archiveMutation.isPending}
            errorMessage={modalError}
            onClose={() => { setIsArchiveModalOpen(false); setModalError(null); }}
            onConfirm={handleConfirmArchive}
          />

          <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            itemName={existingItem.name}
            isDeleting={deleteMutation.isPending}
            errorMessage={modalError}
            onClose={() => { setIsDeleteModalOpen(false); setModalError(null); }}
            onConfirm={handleConfirmDelete}
          />
        </>
      )}

      {pendingTypeChange && (
        <TypeChangeConfirmationModal
          isOpen={true}
          newType={pendingTypeChange}
          onClose={() => setPendingTypeChange(null)}
          onConfirm={handleConfirmTypeChange}
        />
      )}
    </div>
  );
};
