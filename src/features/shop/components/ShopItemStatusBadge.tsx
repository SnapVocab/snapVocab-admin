import React from 'react';
import { ShopItemStatus } from '../../../domains/shop/types';
import { FileEdit, Globe, Archive } from 'lucide-react';

interface ShopItemStatusBadgeProps {
  status: ShopItemStatus;
  className?: string;
}

export const ShopItemStatusBadge: React.FC<ShopItemStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'DRAFT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          <FileEdit size={12} className="text-amber-600" />
          <span>Bản nháp</span>
        </span>
      );
    case 'PUBLISHED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <Globe size={12} className="text-emerald-600" />
          <span>Đã phát hành</span>
        </span>
      );
    case 'ARCHIVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
        >
          <Archive size={12} className="text-neutral-500" />
          <span>Đã lưu trữ</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 ${className}`}
        >
          {status}
        </span>
      );
  }
};
