import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadShopAsset } from '../../../domains/shop/api';
import { validateAssetFile } from '../../../domains/shop/mappers';

interface AssetUploadFieldProps {
  label: string;
  helperText?: string;
  type: 'icon' | 'frame';
  valueKey?: string | null;
  previewUrl?: string | null;
  disabled?: boolean;
  error?: string;
  onChange: (objectName: string | null, previewUrl: string | null) => void;
}

export const AssetUploadField: React.FC<AssetUploadFieldProps> = ({
  label,
  helperText,
  type,
  valueKey,
  previewUrl: initialPreviewUrl,
  disabled = false,
  error,
  onChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPreview = localPreview || initialPreviewUrl;
  const maxKb = type === 'icon' ? 200 : 300;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Client-side validation: MIME + size
    const validation = validateAssetFile(file, type);
    if (!validation.valid) {
      setUploadError(validation.error || 'File không hợp lệ');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);

      // 2. Upload flow: Presigned URL -> PUT binary
      const { objectName, previewUrl } = await uploadShopAsset(file);

      // Create a local preview object URL for immediate display
      const objectUrl = previewUrl || URL.createObjectURL(file);
      setLocalPreview(objectUrl);

      // Pass objectName to parent form
      onChange(objectName, objectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải lên asset thất bại.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isUploading) return;
    setLocalPreview(null);
    setUploadError(null);
    onChange(null, null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[11px] font-normal text-text-muted">
            (PNG, WebP ≤ {maxKb} KB)
          </span>
        </label>
        {valueKey && (
          <span className="text-[10px] font-mono text-text-muted truncate max-w-[200px]" title={valueKey}>
            Key: {valueKey}
          </span>
        )}
      </div>

      <div
        className={`relative border border-dashed rounded-xl transition-all ${
          disabled
            ? 'border-border bg-surface-subtle/50 opacity-70 cursor-not-allowed'
            : error || uploadError
            ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
            : 'border-border hover:border-primary/50 bg-surface hover:bg-surface-subtle/30 cursor-pointer'
        }`}
        onClick={() => {
          if (!disabled && !isUploading && !displayPreview) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.webp,image/png,image/webp"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {displayPreview ? (
          <div className="w-full flex items-center justify-between gap-3 p-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`relative ${type === 'icon' ? 'w-12 h-12' : 'w-14 h-14'} rounded-lg overflow-hidden border border-border bg-neutral-900/5 shadow-xs flex items-center justify-center shrink-0`}>
                <img
                  src={displayPreview}
                  alt="Asset preview"
                  className="max-w-full max-h-full object-contain"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text">
                  {type === 'icon' ? 'Ảnh biểu tượng' : 'Khung avatar'}
                </div>
                <div className="text-[11px] text-text-muted truncate max-w-[200px] sm:max-w-xs font-mono">
                  {valueKey ? `Key: ${valueKey}` : 'Đã chọn ảnh'}
                </div>
              </div>
            </div>

            {!disabled && !isUploading && (
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Thay ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1.5 rounded-lg border border-border hover:bg-rose-50 text-text-muted hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                  title="Xóa ảnh này"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 px-3 w-full flex items-center justify-center gap-3 text-center">
            {isUploading ? (
              <div className="flex items-center gap-2 text-primary py-1">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs font-semibold">Đang tải lên asset...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-muted shrink-0">
                  {type === 'icon' ? <ImageIcon size={16} /> : <Upload size={16} />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-text">
                    {disabled ? 'Chưa có asset' : (type === 'icon' ? 'Chọn ảnh để tải lên' : 'Chọn khung avatar để tải lên')}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    PNG / WebP · tối đa {maxKb} KB
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {helperText && !uploadError && !error && (
        <p className="text-[11px] text-text-muted">{helperText}</p>
      )}

      {(uploadError || error) && (
        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 mt-1">
          <AlertCircle size={12} className="shrink-0" />
          <span>{uploadError || error}</span>
        </p>
      )}
    </div>
  );
};
