import { Button } from '../../../components/ui';
import React, { useId, useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadShopAsset } from '../../../domains/shop/api';
import { checkAssetHeader, readImageHeader, validateAssetFile } from '../../../domains/shop/mappers';

interface AssetUploadFieldProps {
  label: string;
  helperText?: string;
  type: 'icon' | 'frame';
  valueKey?: string | null;
  previewUrl?: string | null;
  disabled?: boolean;
  error?: string;
  onChange: (objectName: string | null, previewUrl: string | null) => void;
  /** Lets the editor hold Save/Publish until the upload has finished. */
  onUploadingChange?: (uploading: boolean) => void;
}

export const AssetUploadField: React.FC<AssetUploadFieldProps> = ({
  label,
  helperText,
  type,
  valueKey,
  previewUrl: displayPreview,
  disabled = false,
  error,
  onChange,
  onUploadingChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const maxKb = type === 'icon' ? 200 : 300;
  const pickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      setIsUploading(true);
      onUploadingChange?.(true);

      // 1. Client-side validation: MIME + size, then pixel size/alpha from the header (shop.md §2.3)
      const validation = validateAssetFile(file, type);
      const invalid = !validation.valid
        ? validation.error || 'File không hợp lệ'
        : checkAssetHeader(readImageHeader(new Uint8Array(await file.arrayBuffer())), file.type, type);
      if (invalid) {
        setUploadError(invalid);
        return;
      }

      // 2. Upload flow: Presigned URL -> PUT binary; the parent owns key + preview from here on.
      // ponytail: blob preview URLs are never revoked; a few hundred KB per upload until the tab closes.
      const { objectName, previewUrl } = await uploadShopAsset(file);
      onChange(objectName, previewUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải lên asset thất bại.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isUploading) return;
    setUploadError(null);
    onChange(null, null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-body font-semibold text-text">{label}</span>
      </div>

      <div
        className={`relative border border-dashed rounded-lg transition-all ${
          disabled
            ? 'border-border bg-surface-subtle/50 opacity-70 cursor-not-allowed'
            : error || uploadError
            ? 'border-danger/40 bg-danger-light/30 hover:border-danger/60'
            : 'border-border hover:border-primary/50 bg-surface hover:bg-surface-subtle/30'
        }`}
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
                  alt={label}
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
                <div className="text-xs text-text-muted truncate max-w-[200px] sm:max-w-xs" title={valueKey ?? undefined}>
                  {valueKey ? 'Đã tải lên' : 'Đã chọn ảnh'}
                </div>
              </div>
            </div>

            {!disabled && !isUploading && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" icon={<RefreshCw />} onClick={pickFile}>Thay ảnh</Button>
                <Button variant="ghost" size="sm" icon={<X />} label="Xóa ảnh này" onClick={handleRemove} />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled || isUploading}
            aria-label={`${label}: chọn ảnh để tải lên`}
            aria-describedby={uploadError || error ? errorId : undefined}
            className="py-3 px-3 w-full flex items-center justify-center gap-3 text-center rounded-lg cursor-pointer disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isUploading ? (
              <div className="flex items-center gap-2 text-primary py-1">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-xs font-semibold">Đang tải lên…</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-muted shrink-0">
                  {type === 'icon' ? <ImageIcon size={16} /> : <Upload size={16} />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-text">
                    {disabled ? 'Chưa có ảnh' : 'Chọn ảnh để tải lên'}
                  </div>
                  <div className="text-xs text-text-muted">
                    PNG / WebP · tối đa {maxKb} KB
                  </div>
                </div>
              </div>
            )}
          </button>
        )}
      </div>

      {helperText && !uploadError && !error && (
        <p className="text-xs text-text-muted">{helperText}</p>
      )}

      {(uploadError || error) && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-dark flex items-center gap-1 mt-1">
          <AlertCircle size={12} className="shrink-0" />
          <span>{uploadError || error}</span>
        </p>
      )}
    </div>
  );
};
