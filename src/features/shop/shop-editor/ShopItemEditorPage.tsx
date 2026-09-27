import React, { useState, useEffect, useMemo } from 'react';
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
  deriveAvailability,
  formatThemeKeyLabel,
  mapBackendErrorsToFields,
} from '../../../domains/shop/mappers';
import { ShopItemStatusBadge } from '../components/ShopItemStatusBadge';
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
  themeKey: 'MIDNIGHT_NEON',
  frameAssetKey: null,
  boostDurationMinutes: 30,
  maxQuantity: 5,
};

const TYPE_OPTIONS: {
  type: ShopItemType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'THEME',
    label: 'Chủ đề',
    desc: 'Thay đổi giao diện ứng dụng',
    icon: <Sparkles size={16} />,
  },
  {
    type: 'AVATAR_FRAME',
    label: 'Khung Avatar',
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

export const ShopItemEditorPage: React.FC<ShopItemEditorPageProps> = ({
  mode,
  itemId,
  onBack,
  onSaved,
  onToast,
}) => {
  // 1. Fetch metadata & existing item
  const { data: metadata } = useShopItemTypes();
  const {
    data: existingItem,
    isLoading: isItemLoading,
    refetch: refetchItem,
    isFetching: isItemFetching,
  } = useAdminShopItem(itemId);

  // 2. Form state
  const [formData, setFormData] = useState<ShopItemForm>(DEFAULT_FORM_DATA);
  const [_initialData, setInitialData] = useState<ShopItemForm>(DEFAULT_FORM_DATA);
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

  // Mutations
  const createMutation = useCreateShopItem();
  const updateMutation = useUpdateShopItem();
  const publishMutation = usePublishShopItem();
  const archiveMutation = useArchiveShopItem();
  const deleteMutation = useDeleteShopItem();

  // Populate form data when existingItem loads or changes
  useEffect(() => {
    if (existingItem && mode === 'edit') {
      const populated: ShopItemForm = {
        code: existingItem.code,
        name: existingItem.name,
        description: existingItem.description || '',
        type: existingItem.type,
        iconKey: existingItem.iconKey || null,
        purchasable: existingItem.purchasable,
        price: existingItem.price,
        availableFrom: existingItem.availableFrom
          ? existingItem.availableFrom.slice(0, 16)
          : null,
        availableUntil: existingItem.availableUntil
          ? existingItem.availableUntil.slice(0, 16)
          : null,
        sortOrder: existingItem.sortOrder ?? 0,
        themeKey: existingItem.themeKey || null,
        frameAssetKey: existingItem.frameAssetKey || null,
        boostDurationMinutes: existingItem.boostDurationMinutes ?? 30,
        maxQuantity: existingItem.maxQuantity ?? 10,
      };

      setFormData(populated);
      setInitialData(populated);
      setCurrentVersion(existingItem.version);
      setItemStatus(existingItem.status);
      setAvailabilityMode(
        existingItem.availableFrom || existingItem.availableUntil ? 'SCHEDULED' : 'UNLIMITED'
      );
      setPreviewUrls({
        iconUrl: existingItem.iconUrl,
        frameAssetUrl: existingItem.frameAssetUrl,
      });
      setVersionConflict({ isConflict: false });
      setFieldErrors({});
      setGeneralError(null);
    }
  }, [existingItem, mode]);

  // Set default themeKey from metadata if available and empty
  useEffect(() => {
    if (mode === 'create' && metadata) {
      const themeType = metadata.types.find((t) => t.type === 'THEME');
      const themeKeyField = themeType?.fields.find((f) => f.name === 'themeKey');
      if (themeKeyField?.options && themeKeyField.options.length > 0) {
        setFormData((prev) => ({
          ...prev,
          themeKey: themeKeyField.options![0],
        }));
      }
    }
  }, [metadata, mode]);

  // Derived metadata map for quick field checking
  const currentTypeMetadata = useMemo(() => {
    return metadata?.types.find((t) => t.type === formData.type);
  }, [metadata, formData.type]);

  const getFieldSpec = (fieldName: string): FieldSpec | undefined => {
    const common = metadata?.commonFields.find((f) => f.name === fieldName);
    if (common) return common;
    return currentTypeMetadata?.fields.find((f) => f.name === fieldName);
  };

  const isEditable = (fieldName: string): boolean => {
    if (mode === 'create') return true;
    const spec = getFieldSpec(fieldName);
    return isFieldEditable(spec, itemStatus);
  };

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
    const typeMeta = metadata?.types.find((t) => t.type === newType);
    const themeKeyField = typeMeta?.fields.find((f) => f.name === 'themeKey');

    setFormData((prev) => ({
      ...prev,
      type: newType,
      themeKey: themeKeyField?.options?.[0] || 'MIDNIGHT_NEON',
      frameAssetKey: null,
      boostDurationMinutes: 30,
      maxQuantity: 5,
    }));
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
      errors.themeKey = 'Vui lòng chọn chủ đề giao diện.';
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
  const handleSave = async () => {
    if (!validateFormClient()) return;

    setGeneralError(null);
    setFieldErrors({});

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(formData);
        onToast?.(`Đã tạo bản nháp "${created.name}" thành công.`);
        onSaved?.(created);
      } else if (mode === 'edit' && itemId) {
        if (currentVersion === null) {
          throw new Error('Thiếu thông tin phiên bản để cập nhật.');
        }

        const payload = {
          ...formData,
          version: currentVersion,
        };

        const updated = await updateMutation.mutateAsync({
          id: itemId,
          payload,
        });

        setCurrentVersion(updated.version);
        setItemStatus(updated.status);
        setInitialData({
          code: updated.code,
          name: updated.name,
          description: updated.description || '',
          type: updated.type,
          iconKey: updated.iconKey || null,
          purchasable: updated.purchasable,
          price: updated.price,
          availableFrom: updated.availableFrom ? updated.availableFrom.slice(0, 16) : null,
          availableUntil: updated.availableUntil ? updated.availableUntil.slice(0, 16) : null,
          sortOrder: updated.sortOrder ?? 0,
          themeKey: updated.themeKey || null,
          frameAssetKey: updated.frameAssetKey || null,
          boostDurationMinutes: updated.boostDurationMinutes ?? 30,
          maxQuantity: updated.maxQuantity ?? 10,
        });
        setPreviewUrls({
          iconUrl: updated.iconUrl,
          frameAssetUrl: updated.frameAssetUrl,
        });
        setVersionConflict({ isConflict: false });
        onToast?.(`Đã cập nhật vật phẩm "${updated.name}" thành công (v${updated.version}).`);
        onSaved?.(updated);
      }
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setFieldErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalError || 'Lưu thất bại.');

      if (mapped.isVersionConflict) {
        setVersionConflict({
          isConflict: true,
          serverVersion: mapped.serverVersion,
        });
      }
    }
  };

  // PUBLISH HANDLER
  const handleConfirmPublish = async () => {
    if (!itemId) return;
    try {
      const published = await publishMutation.mutateAsync(itemId);
      setItemStatus('PUBLISHED');
      setCurrentVersion(published.version);
      setIsPublishModalOpen(false);
      onToast?.(`Vật phẩm "${published.name}" đã được phát hành thành công.`);
      onSaved?.(published);
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setFieldErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalError || 'Phát hành thất bại.');
      setIsPublishModalOpen(false);
    }
  };

  // ARCHIVE HANDLER
  const handleConfirmArchive = async () => {
    if (!itemId) return;
    try {
      const archived = await archiveMutation.mutateAsync(itemId);
      setItemStatus('ARCHIVED');
      setCurrentVersion(archived.version);
      setIsArchiveModalOpen(false);
      onToast?.(`Vật phẩm "${archived.name}" đã được lưu trữ.`);
      onSaved?.(archived);
    } catch (err) {
      const mapped = mapBackendErrorsToFields(err);
      setGeneralError(mapped.generalError || 'Lưu trữ thất bại.');
      setIsArchiveModalOpen(false);
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
      setGeneralError(mapped.generalError || 'Xóa bản nháp thất bại.');
      setIsDeleteModalOpen(false);
    }
  };

  // RELOAD ITEM FROM SERVER (Version Conflict CTA)
  const handleReloadItem = async () => {
    const res = await refetchItem();
    if (res.data) {
      onToast?.(`Đã nạp phiên bản v${res.data.version} từ máy chủ.`);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const availability = deriveAvailability(formData.availableFrom, formData.availableUntil);

  if (mode === 'edit' && isItemLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="animate-spin text-primary" />
        <span className="text-xs font-semibold text-text-muted">Đang tải thông tin vật phẩm...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none pb-12">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-text hover:underline cursor-pointer transition-colors"
        >
          Cửa Hàng
        </button>
        <span>/</span>
        <span className="text-text font-medium">
          {mode === 'create' ? 'Tạo vật phẩm mới' : (formData.name || 'Chỉnh sửa vật phẩm')}
        </span>
      </div>

      {/* EDITOR HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg border border-border hover:bg-surface-subtle text-text-muted hover:text-text transition-colors cursor-pointer shrink-0"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={14} />
          </button>

          <div>
            <h2 className="text-lg font-extrabold text-text tracking-tight flex items-center gap-2.5">
              <span>
                {mode === 'create'
                  ? 'Tạo Vật Phẩm Mới'
                  : (formData.name || formData.code || `#${itemId}`)}
              </span>
              <ShopItemStatusBadge status={itemStatus} />
              {currentVersion !== null && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-text-muted">
                  v{currentVersion}
                </span>
              )}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {mode === 'create'
                ? 'Nhập thông tin cho vật phẩm. Bạn có thể phát hành sau khi hoàn tất.'
                : 'Chỉnh sửa thông tin vật phẩm. Một số trường sẽ bị khóa theo trạng thái phát hành.'}
            </p>
          </div>
        </div>

        {/* Actions — clear hierarchy */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Destructive: Delete Draft */}
          {mode === 'edit' && itemStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSaving}
              className="p-2 rounded-lg border border-border text-text-muted hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Xóa bản nháp"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Lifecycle: Archive */}
          {mode === 'edit' && itemStatus === 'PUBLISHED' && (
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Archive size={13} />
              <span>Lưu Trữ</span>
            </button>
          )}

          {/* Lifecycle: Publish */}
          {mode === 'edit' && itemStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Globe size={13} />
              <span>Phát Hành</span>
            </button>
          )}

          {/* Primary: Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || itemStatus === 'ARCHIVED'}
            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{mode === 'create' ? 'Lưu bản nháp' : 'Lưu thay đổi'}</span>
              </>
            )}
          </button>
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

      {/* GENERAL ERROR BANNER */}
      {generalError && !versionConflict.isConflict && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* FORM BODY — 3 CONSOLIDATED SECTIONS */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">

        {/* SECTION 1: THÔNG TIN VẬT PHẨM (Code, Name, Description, Type & Type-specific Config) */}
        <div className="px-5 py-4 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            1. Thông Tin Vật Phẩm
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã vật phẩm (Code) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Mã vật phẩm <span className="text-rose-500">*</span>
                </label>
                {!isEditable('code') && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Lock size={10} />
                    <span>Khóa</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                disabled={!isEditable('code') || isSaving}
                placeholder="VD: THEME_NEON_NIGHT"
                className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-surface text-text ${
                  fieldErrors.code
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                    : !isEditable('code')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.code ? (
                <p className="text-[11px] text-rose-600">{fieldErrors.code}</p>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Dùng để tham chiếu trong hệ thống và phần thưởng. Không thể thay đổi sau khi phát hành.
                </p>
              )}
            </div>

            {/* Tên vật phẩm (Name) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Tên vật phẩm <span className="text-rose-500">*</span>
                </label>
                {!isEditable('name') && (
                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                    <Lock size={10} />
                    <span>Khóa</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                disabled={!isEditable('name') || isSaving}
                placeholder="VD: Giao diện Neon Dạ Quang"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                  fieldErrors.name
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                    : !isEditable('name')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Mô tả (Description) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-text">Mô tả</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={!isEditable('description') || isSaving}
                rows={2}
                placeholder="Mô tả công dụng hoặc đặc điểm nổi bật của vật phẩm..."
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text resize-none ${
                  !isEditable('description')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
            </div>
          </div>

          {/* Chọn Loại Vật Phẩm */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text">
                Loại vật phẩm
              </label>
              {!isEditable('type') && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock size={10} />
                  <span>Khóa sau phát hành</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = formData.type === opt.type;
                const canChange = isEditable('type');

                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={!canChange || isSaving}
                    onClick={() => handleTypeSelect(opt.type)}
                    className={`px-3 py-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-surface hover:bg-surface-subtle'
                    } ${!canChange ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                      {opt.icon}
                    </span>
                    <div className="min-w-0">
                      <div className={`font-semibold text-xs ${isSelected ? 'text-primary' : 'text-text'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 leading-snug">
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
                <label className="text-xs font-semibold text-text">
                  Chủ đề giao diện <span className="text-rose-500">*</span>
                </label>
                {!isEditable('themeKey') && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Lock size={10} />
                    <span>Khóa</span>
                  </span>
                )}
              </div>
              {(() => {
                const themeField = currentTypeMetadata?.fields.find((f) => f.name === 'themeKey');
                const options = themeField?.options || ['MIDNIGHT_NEON', 'SUNSET_AMBER', 'FOREST_MINT'];

                return (
                  <select
                    value={formData.themeKey || ''}
                    onChange={(e) => handleFieldChange('themeKey', e.target.value)}
                    disabled={!isEditable('themeKey') || isSaving}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text cursor-pointer ${
                      fieldErrors.themeKey
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                        : !isEditable('themeKey')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  >
                    <option value="" disabled>-- Chọn chủ đề giao diện --</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatThemeKeyLabel(opt)}
                      </option>
                    ))}
                  </select>
                );
              })()}
              {fieldErrors.themeKey ? (
                <p className="text-[11px] text-rose-600">{fieldErrors.themeKey}</p>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Chủ đề đã được hỗ trợ trong ứng dụng.
                </p>
              )}
            </div>
          )}

          {/* TYPE: AVATAR_FRAME */}
          {formData.type === 'AVATAR_FRAME' && (
            <div className="pt-3 border-t border-border/70">
              <AssetUploadField
                label="Khung Avatar (Frame Asset)"
                helperText="PNG hoặc WebP trong suốt, kích thước 512×512, tối đa 300 KB."
                type="frame"
                valueKey={formData.frameAssetKey}
                previewUrl={previewUrls.frameAssetUrl}
                disabled={!isEditable('frameAssetKey') || isSaving}
                error={fieldErrors.frameAssetKey}
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
                    <label className="text-xs font-semibold text-text">
                      Thời lượng hiệu lực (phút) <span className="text-rose-500">*</span>
                    </label>
                    {!isEditable('boostDurationMinutes') && (
                      <span className="text-[10px] text-amber-700 flex items-center gap-1">
                        <Lock size={10} />
                        <span>Khóa</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={formData.boostDurationMinutes ?? 30}
                    onChange={(e) => handleFieldChange('boostDurationMinutes', parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('boostDurationMinutes') || isSaving}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                      fieldErrors.boostDurationMinutes
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                        : !isEditable('boostDurationMinutes')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.boostDurationMinutes ? (
                    <p className="text-[11px] text-rose-600">{fieldErrors.boostDurationMinutes}</p>
                  ) : (
                    <p className="text-[11px] text-text-muted">5 đến 180 phút (mặc định: 30 phút).</p>
                  )}
                </div>

                {/* maxQuantity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text">
                      Số lượng tối đa trong túi đồ <span className="text-rose-500">*</span>
                    </label>
                    {!isEditable('maxQuantity') && (
                      <span className="text-[10px] text-amber-700 flex items-center gap-1">
                        <Lock size={10} />
                        <span>Khóa</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxQuantity ?? 5}
                    onChange={(e) => handleFieldChange('maxQuantity', parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('maxQuantity') || isSaving}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                      fieldErrors.maxQuantity
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                        : !isEditable('maxQuantity')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.maxQuantity ? (
                    <p className="text-[11px] text-rose-600">{fieldErrors.maxQuantity}</p>
                  ) : (
                    <p className="text-[11px] text-text-muted">1 đến 10 vật phẩm (mặc định: 5).</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: BÁN TRONG CỬA HÀNG (Purchasable, Price, Sort Order & Availability Window) */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              2. Bán Trong Cửa Hàng
            </h3>
          </div>

          {/* Cho phép mua trong cửa hàng setting row with switch */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-xs font-semibold text-text">
                Cho phép mua trong cửa hàng
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Người học có thể mua vật phẩm này bằng Coin.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isEditable('purchasable') && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock size={10} />
                  <span>Khóa</span>
                </span>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(formData.purchasable)}
                disabled={!isEditable('purchasable') || isSaving}
                onClick={() => handleTogglePurchasable(!formData.purchasable)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.purchasable ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-700'
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
                <label className="text-xs font-semibold text-text">
                  Giá bán (Coin) {formData.purchasable && <span className="text-rose-500">*</span>}
                </label>
                {!isEditable('price') && (
                  <span className="text-[10px] text-amber-700 flex items-center gap-1">
                    <Lock size={10} />
                    <span>Khóa</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <Coins
                  size={14}
                  className={`absolute left-3 top-2.5 ${formData.purchasable ? 'text-amber-500' : 'text-text-muted/40'}`}
                />
                {formData.purchasable ? (
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={formData.price ?? ''}
                    onChange={(e) => handleFieldChange('price', e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)}
                    disabled={!isEditable('price') || isSaving}
                    placeholder="100"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                      fieldErrors.price
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
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
                    placeholder="— Chỉ thiết lập khi bật 'Cho phép mua trong cửa hàng'"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-surface-subtle text-text-muted cursor-not-allowed italic"
                  />
                )}
              </div>

              {fieldErrors.price ? (
                <p className="text-[11px] text-rose-600">{fieldErrors.price}</p>
              ) : (
                <p className="text-[11px] text-text-muted">
                  {formData.purchasable ? '1 đến 100,000 Coin.' : 'Chỉ áp dụng khi vật phẩm được mở bán.'}
                </p>
              )}
            </div>

            {/* Thứ tự hiển thị (Sort Order) - secondary operational field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Thứ tự hiển thị
                </label>
                {!isEditable('sortOrder') && (
                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                    <Lock size={10} />
                    <span>Khóa</span>
                  </span>
                )}
              </div>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => handleFieldChange('sortOrder', parseInt(e.target.value, 10) || 0)}
                disabled={!isEditable('sortOrder') || isSaving}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                  !isEditable('sortOrder')
                    ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                    : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              <p className="text-[11px] text-text-muted">Số nhỏ hơn sẽ hiển thị trước trong Shop.</p>
            </div>
          </div>

          {/* Thời gian bán */}
          <div className="space-y-3 pt-2 border-t border-border/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text">
                Thời gian bán
              </label>
              {availabilityMode === 'SCHEDULED' && (
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${availability.badgeClass}`}>
                  {availability.label}
                </span>
              )}
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
                  className="w-3.5 h-3.5 text-primary cursor-pointer"
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
                  className="w-3.5 h-3.5 text-primary cursor-pointer"
                />
                <span>Theo thời gian</span>
              </label>
            </div>

            {/* Scheduled date range inputs */}
            {availabilityMode === 'SCHEDULED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-muted" />
                    Bắt đầu bán từ
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.availableFrom || ''}
                    onChange={(e) => handleFieldChange('availableFrom', e.target.value || null)}
                    disabled={!isEditable('availableFrom') || isSaving}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                      fieldErrors.availableFrom
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                        : !isEditable('availableFrom')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.availableFrom && (
                    <p className="text-[11px] text-rose-600">{fieldErrors.availableFrom}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-muted" />
                    Kết thúc bán lúc
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.availableUntil || ''}
                    onChange={(e) => handleFieldChange('availableUntil', e.target.value || null)}
                    disabled={!isEditable('availableUntil') || isSaving}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-surface text-text ${
                      fieldErrors.availableUntil
                        ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                        : !isEditable('availableUntil')
                        ? 'border-border bg-surface-subtle text-text-muted cursor-not-allowed'
                        : 'border-border focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {fieldErrors.availableUntil && (
                    <p className="text-[11px] text-rose-600">{fieldErrors.availableUntil}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: HÌNH ẢNH (Icon) */}
        <div className="px-5 py-4 space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            3. Hình Ảnh
          </h3>

          <AssetUploadField
            label="Icon vật phẩm"
            helperText="PNG hoặc WebP, tối đa 200 KB. Hiển thị trên danh mục và chi tiết vật phẩm."
            type="icon"
            valueKey={formData.iconKey}
            previewUrl={previewUrls.iconUrl}
            disabled={!isEditable('iconKey') || isSaving}
            error={fieldErrors.iconKey}
            onChange={(objectName, localUrl) => {
              handleFieldChange('iconKey', objectName);
              setPreviewUrls((prev) => ({ ...prev, iconUrl: localUrl }));
            }}
          />
        </div>
      </div>

      {/* METADATA FOOTER — compact */}
      {mode === 'edit' && existingItem && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-text-muted px-1">
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
            onClose={() => setIsPublishModalOpen(false)}
            onConfirm={handleConfirmPublish}
          />

          <ArchiveConfirmationModal
            isOpen={isArchiveModalOpen}
            itemName={existingItem.name}
            isArchiving={archiveMutation.isPending}
            onClose={() => setIsArchiveModalOpen(false)}
            onConfirm={handleConfirmArchive}
          />

          <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            itemName={existingItem.name}
            isDeleting={deleteMutation.isPending}
            onClose={() => setIsDeleteModalOpen(false)}
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
