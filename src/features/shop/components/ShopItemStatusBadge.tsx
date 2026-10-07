import React from 'react';
import { ShopItemStatus } from '../../../domains/shop/types';
import { DerivedSaleState } from '../../../domains/shop/mappers';
import { Badge, BadgeTone } from '../../../components/ui';
import { FileEdit, Globe, Archive } from 'lucide-react';

/** Shop's mapping of lifecycle status to a Badge tone. ARCHIVED has ended: neutral, not red. */
const STATUS: Record<ShopItemStatus, { label: string; tone: BadgeTone; icon: React.ReactElement<{ size?: number }> }> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral', icon: <FileEdit /> },
  PUBLISHED: { label: 'Đã phát hành', tone: 'success', icon: <Globe /> },
  ARCHIVED: { label: 'Đã lưu trữ', tone: 'neutral', icon: <Archive /> },
};

/** Lifecycle only (editor header). Lists use SaleStateBadge, which answers "is it on sale". */
export const ShopItemStatusBadge: React.FC<{ status: ShopItemStatus }> = ({ status }) => {
  const s = STATUS[status];
  return s ? <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge> : <Badge>{status}</Badge>;
};

/** Sale conclusion (tone chosen in deriveSaleState) plus its one-line reason. */
export const SaleStateBadge: React.FC<{ sale: DerivedSaleState }> = ({ sale }) => (
  <div className="space-y-0.5">
    <Badge tone={sale.tone}>{sale.label}</Badge>
    <div className="text-xs text-text-muted">{sale.detail}</div>
  </div>
);
