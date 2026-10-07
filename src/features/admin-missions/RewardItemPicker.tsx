import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminShopKeys, useAdminShopItems } from '../../domains/shop/queries';
import { getAdminShopItems } from '../../domains/shop/api';
import { formatShopItemTypeLabel } from '../../domains/shop/mappers';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from './components';
import { errorMessage, inputClass } from './ui';

// Resolve a reward code by exact match, independent of picker search/pagination.
// ponytail: one Shop search per distinct code at the backend max page size (100, newest first); add a bulk lookup
// endpoint if more than 100 items ever contain the same code substring.
function useRewardItem(code: string | null) {
  const params = { status: 'ALL', q: code ?? '', page: 0, size: 100 };
  const query = useQuery({ queryKey: adminShopKeys.list(params), queryFn: () => getAdminShopItems(params), enabled: !!code, staleTime: 60_000 });
  return { query, item: code ? query.data?.data.find(i => i.code === code) : undefined };
}
export function RewardItemLabel({ code }: { code: string }) {
  const { item } = useRewardItem(code);
  return <span className="inline-flex min-w-0 items-center gap-1.5">{item?.iconUrl && <img alt="" src={item.iconUrl} className="h-5 w-5 shrink-0 rounded object-cover" />}<span className="break-all">+ 1 × {item?.name ?? code}{item && <span className="font-normal text-text-muted"> · {code}</span>}</span></span>;
}
/** `savedCode` is the reward stored on the server: backend lets it stay non-PUBLISHED until the reward pair or activation changes. */
export function RewardItemPicker({ value, savedCode, onChange, disabled }: { value: string | null; savedCode?: string | null; onChange: (code: string | null) => void; disabled?: boolean }) {
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [page, setPage] = useState(0);
  useEffect(() => { const t = window.setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => window.clearTimeout(t); }, [search]);
  const result = useAdminShopItems({ status: 'PUBLISHED', q: query, page, size: 20 });
  const { query: selected, item: chosen } = useRewardItem(value);
  return <div className="space-y-3 rounded-xl border border-border p-3">
    <p className="text-xs font-bold">Vật phẩm thưởng · 1 đơn vị</p>
    {value && <div className="flex items-center justify-between gap-2 rounded-lg bg-reward-light p-2 text-xs"><div><strong>{chosen?.name ?? value}</strong><p className="text-text-muted">{value}</p></div><Button size="sm" disabled={disabled} onClick={() => onChange(null)}>Bỏ item</Button></div>}
    {value && selected.isError && <ErrorBanner message="Chưa xác minh được item đang chọn. Mã được giữ nguyên."><Button size="sm" onClick={() => void selected.refetch()}>Thử lại</Button></ErrorBanner>}
    {value && selected.isSuccess && !chosen && <p role="alert" className="text-xs text-danger-dark">Không tìm thấy mã này trong Shop. Kiểm tra lại trước khi lưu; backend xác nhận tính hợp lệ.</p>}
    {chosen && chosen.status !== 'PUBLISHED' && <p role="alert" className="text-xs text-danger-dark">{value === savedCode
      ? `Item đã lưu đang ở trạng thái ${chosen.status}. Vẫn giữ được khi lưu các trường khác; đổi Coin dự phòng, chọn lại item hoặc bật template thì cần item PUBLISHED.`
      : 'Item này không ở trạng thái PUBLISHED. Chọn item PUBLISHED khác.'}</p>}
    <input aria-label="Tìm vật phẩm thưởng" className={inputClass} value={search} disabled={disabled} placeholder="Tìm tên hoặc mã item…" onChange={e => setSearch(e.target.value)} />
    {result.isPending && <p role="status" className="text-xs text-text-muted">Đang tải item…</p>}
    {result.isError && <ErrorBanner message={errorMessage(result.error)}><Button size="sm" onClick={() => void result.refetch()}>Thử lại</Button></ErrorBanner>}
    {result.data && <><div className="max-h-48 space-y-1 overflow-auto">{result.data.data.map(i => <button type="button" key={i.id} disabled={disabled} aria-pressed={value === i.code} onClick={() => onChange(i.code)} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs hover:bg-primary-light ${value === i.code ? 'border-primary-solid bg-primary-light' : 'border-border'}`}>
      {i.iconUrl && <img alt="" src={i.iconUrl} className="h-8 w-8 rounded-lg object-cover" />}<span className="min-w-0"><span className="block font-bold">{i.name}</span><span className="block text-text-muted">{i.code} · {formatShopItemTypeLabel(i.type)}</span></span>
    </button>)}{!result.data.data.length && <p className="py-2 text-xs text-text-muted">Không có item phù hợp.</p>}</div>
    <div className="flex items-center justify-between text-xs text-text-muted"><Button size="sm" disabled={disabled || page === 0 || result.isFetching} onClick={() => setPage(p => p - 1)}>Trước</Button><span>Trang {page + 1} / {Math.max(1, result.data.meta.pages)}</span><Button size="sm" disabled={disabled || page + 1 >= result.data.meta.pages || result.isFetching} onClick={() => setPage(p => p + 1)}>Sau</Button></div></>}
    <p className="text-[11px] text-text-muted">Chọn item PUBLISHED. Item không cần đang bán hoặc có thể mua để dùng làm thưởng.</p>
  </div>;
}
