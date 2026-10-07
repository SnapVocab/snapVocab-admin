import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Plus, RefreshCw, Search, Target } from 'lucide-react';
import { getMissionTemplate, setTemplateActive } from '../../domains/admin-missions/api';
import { catalogSummary, categoryLabels, eligibilityLabels, invariantHint, objective, poolShortage, supportedPreset } from '../../domains/admin-missions/mappers';
import { missionKeys, useMissionTemplates } from '../../domains/admin-missions/queries';
import type { MissionTemplate } from '../../domains/admin-missions/types';
import { Button } from '../../components/ui/Button';
import { ApiClientError } from '../../lib/api-client';
import { ActiveBadge, ConfirmModal, ErrorBanner } from './components';
import { errorMessage, inputClass, isApiError } from './ui';
import { MissionEditor } from './MissionEditor';
import { RewardItemLabel } from './RewardItemPicker';

export function AdminMissionsPage({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const catalog = useMissionTemplates(); const client = useQueryClient();
  const [editor, setEditor] = useState<{ id?: number; revision?: number } | null>(null);
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('ALL'); const [status, setStatus] = useState('ALL');
  const [activation, setActivation] = useState<MissionTemplate | null>(null);
  const [activationError, setActivationError] = useState(''); const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false); const flight = useRef(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null); const listScroll = useRef(0); const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3500); return () => window.clearTimeout(t); }, [toast]);
  const editing = !!editor;
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = editing ? 0 : listScroll.current; }, [editing]);
  useEffect(() => { if (busy) onDirtyChange(true); return () => { if (busy) onDirtyChange(false); }; }, [busy, onDirtyChange]);
  const items = catalog.data ?? [];
  const summary = catalogSummary(items);
  const toggled = (target: MissionTemplate) => items.map(i => i.id === target.id ? { ...i, isActive: !target.isActive } : i);
  const after = activation && catalog.data ? catalogSummary(toggled(activation)) : undefined;
  function closeEditor(notice?: string) { setEditor(null); onDirtyChange(false); if (notice) setToast({ text: notice, error: true }); }
  function openEditor(id?: number) { listScroll.current = scroller.current?.scrollTop ?? 0; setEditor({ id }); }
  function openActivation(item: MissionTemplate) { setActivation(item); setActivationError(''); setBlocked(false); }
  async function activate() {
    if (!activation || flight.current || blocked) return;
    flight.current = true; setBusy(true); setActivationError('');
    try {
      const item = await setTemplateActive(activation.id, { version: activation.version, isActive: !activation.isActive });
      client.setQueryData(missionKeys.detail(item.id), item);
      await client.invalidateQueries({ queryKey: missionKeys.list });
      setActivation(null); setToast({ text: item.isActive ? 'Đã bật nhiệm vụ.' : 'Đã tắt nhiệm vụ.' });
      if (editor) setEditor({ id: item.id, revision: (editor.revision ?? 0) + 1 });
    } catch (e) {
      void client.invalidateQueries({ queryKey: missionKeys.list });
      if (isApiError(e, 'MISSION_TEMPLATE_NOT_FOUND')) { setActivation(null); closeEditor(errorMessage(e)); return; }
      setActivationError(`${errorMessage(e)} ${isApiError(e, 'MISSION_POOL_INSUFFICIENT') && catalog.data ? poolShortage(toggled(activation)) : ''}`.trim());
      if (!(e instanceof ApiClientError) || e.code === 'VERSION_CONFLICT' || e.statusCode >= 500 || e.statusCode === 0) setBlocked(true);
    } finally { flight.current = false; setBusy(false); }
  }
  async function refreshActivation() {
    if (!activation || flight.current) return; flight.current = true; setBusy(true);
    try {
      const current = await getMissionTemplate(activation.id);
      client.setQueryData(missionKeys.detail(current.id), current);
      // Do not retry a lost-response toggle: close and let admin review the actual state.
      setActivation(null); setBlocked(false); setToast({ text: `Trạng thái server: ${current.isActive ? 'Đang bật' : 'Đang tắt'}.` });
      void client.invalidateQueries({ queryKey: missionKeys.list });
      if (editor) setEditor({ id: current.id, revision: (editor.revision ?? 0) + 1 });
    } catch (e) {
      if (isApiError(e, 'MISSION_TEMPLATE_NOT_FOUND')) { setActivation(null); void client.invalidateQueries({ queryKey: missionKeys.list }); closeEditor(errorMessage(e)); }
      else setActivationError(errorMessage(e));
    } finally { flight.current = false; setBusy(false); }
  }
  const visible = items.filter(i => (category === 'ALL' || i.category === category) && (status === 'ALL' || i.isActive === (status === 'ON')) && `${i.name} ${i.code}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div ref={scroller} className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
    {toast && <div role="status" className={`fixed right-6 top-6 z-40 flex items-center gap-2 rounded-xl border bg-surface px-4 py-3 text-xs font-bold shadow-elevated ${toast.error ? 'border-danger/30 text-danger-dark' : 'border-primary/30 text-primary-dark'}`}>{toast.error ? <AlertCircle size={16} /> : <Check size={16} />}{toast.text}</div>}
    {editor ? <MissionEditor key={`${editor.id ?? 'new'}-${editor.revision ?? 0}`} id={editor.id} onDirtyChange={onDirtyChange} onBack={closeEditor} onSaved={item => { setEditor({ id: item.id }); onDirtyChange(false); setToast({ text: 'Đã lưu nhiệm vụ.' }); }} onActivate={openActivation} /> : <>
      <header><p className="mb-1 text-xs text-text-muted">Nhiệm vụ</p><h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><Target size={20} className="text-primary" />Nhiệm vụ hằng ngày</h1><p className="mt-1 text-xs text-text-muted">Quản lý các mẫu nhiệm vụ dùng để cấp bộ nhiệm vụ cho người học.</p></header>
      {catalog.isError && <ErrorBanner message={`${catalog.data ? 'Dữ liệu đang hiển thị là bản đã tải trước đó. ' : ''}${errorMessage(catalog.error)}`}><Button size="sm" onClick={() => void catalog.refetch()}>Thử lại</Button></ErrorBanner>}
      {catalog.data && summary.inactive && <p className="rounded-lg bg-info-light p-3 text-xs text-text-muted">Chưa có mẫu nào đang bật nên người học chưa nhận nhiệm vụ. Không thể bật từng mẫu từ trạng thái này: một mẫu đang bật đã vi phạm invariant (cần ≥ 4 mẫu cốt lõi và 1 mẫu slot 5, hoặc 5 mẫu cốt lõi, đều không có điều kiện cấp). Khởi tạo catalog bằng seed khi khởi động backend (chỉ chèn các mã mặc định còn thiếu, ở trạng thái bật) hoặc bật nhiều mẫu cùng lúc bằng script <code>migration_daily_mission_catalog_template.sql</code>.</p>}
      {catalog.data && <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg border border-border bg-surface px-3 py-2">Đang bật: <strong>{summary.active}</strong></span><span title="Mẫu nhóm Quét ảnh/Từ vựng/Flashcard/SRS/Quiz đang bật, không có điều kiện cấp. Không bảo đảm mọi người học hoàn thành được." className="rounded-lg border border-border bg-surface px-3 py-2">Mẫu cốt lõi không có điều kiện cấp: <strong>{summary.core}</strong></span><span title="Mẫu nhóm Duy trì học/Cửa hàng đang bật, không có điều kiện cấp; dùng cho slot 5." className="rounded-lg border border-border bg-surface px-3 py-2">Mẫu slot 5 không có điều kiện cấp: <strong>{summary.slotFive}</strong></span><span title={summary.inactive ? 'Chưa có mẫu nào đang bật: người học chưa nhận nhiệm vụ. Cần bật đủ mẫu theo invariant (thường qua seed khi khởi động backend).' : invariantHint} className={`rounded-lg border px-3 py-2 ${summary.inactive ? 'border-border bg-surface text-text-muted' : summary.valid ? 'border-primary/20 bg-primary-light text-primary-dark' : 'border-danger/20 bg-danger-light text-danger-dark'}`}>Invariant catalog: <strong>{summary.inactive ? 'Chưa kích hoạt' : summary.valid ? 'Đạt' : 'Không đạt'}</strong></span></div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-text-muted" /><input aria-label="Tìm nhiệm vụ" className={`${inputClass} !pl-9 sm:w-64`} placeholder="Tìm tên hoặc mã…" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Lọc nhóm" className={`${inputClass} !w-auto`} value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">Tất cả nhóm</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Lọc trạng thái" className={`${inputClass} !w-auto`} value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="ON">Đang bật</option><option value="OFF">Đang tắt</option></select></div><div className="flex gap-2"><Button size="sm" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}><RefreshCw size={14} className={catalog.isFetching ? 'animate-spin' : ''} />Làm mới</Button><Button size="sm" variant="primary" onClick={() => openEditor()}><Plus size={14} />Tạo nhiệm vụ</Button></div></div>
      {catalog.isPending ? <div role="status" aria-label="Đang tải catalog" className="space-y-3 rounded-xl border border-border bg-surface p-4">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-subtle" />)}</div> : catalog.data && <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card"><table className="w-full text-left text-xs"><thead className="bg-surface-subtle text-text-muted"><tr>{['Nhiệm vụ', 'Nhóm', 'Mục tiêu', 'Phần thưởng', 'Điều kiện cấp', 'Trọng số', 'Trạng thái', 'Thao tác'].map((h, i) => <th key={h} title={i === 5 ? 'Trọng số tương đối trong pool của từng slot; không phải xác suất nhận cố định.' : undefined} className={`whitespace-nowrap px-4 py-3 font-semibold ${i > 1 && i < 6 ? 'hidden xl:table-cell' : i === 1 ? 'hidden md:table-cell' : ''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map(item => <tr key={item.id} className="hover:bg-surface-subtle/60"><td className="min-w-40 px-4 py-3"><button className="text-left font-bold hover:text-primary-hover" onClick={() => openEditor(item.id)}>{item.name}</button><p className="mt-1 text-[11px] text-text-muted">{item.code}</p>{!supportedPreset(item) && <p className="mt-1 text-[11px] text-danger-dark">Mapping chưa hỗ trợ</p>}</td><td className="hidden px-4 py-3 md:table-cell"><span className="whitespace-nowrap rounded-full bg-info-light px-2 py-1 text-[11px]">{categoryLabels[item.category]}</span></td><td className="hidden max-w-56 px-4 py-3 xl:table-cell">{objective(item)}</td><td className="hidden px-4 py-3 xl:table-cell"><p className="whitespace-nowrap font-semibold">{item.rewardCoin} Coin · {item.rewardXp} XP</p>{item.rewardItemCode && <p className="text-text-muted"><RewardItemLabel code={item.rewardItemCode} /></p>}</td><td className="hidden px-4 py-3 xl:table-cell">{eligibilityLabels[item.eligibilityRule]}</td><td className="hidden px-4 py-3 xl:table-cell">{item.weight}</td><td className="px-4 py-3"><ActiveBadge active={item.isActive} /></td><td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" onClick={() => openEditor(item.id)}>Sửa</Button><Button size="sm" disabled={catalog.isError || (!item.isActive && !supportedPreset(item))} onClick={() => openActivation(item)}>{item.isActive ? 'Tắt' : 'Bật'}</Button></div></td></tr>)}</tbody></table>{!visible.length && <div className="space-y-3 p-12 text-center text-sm text-text-muted"><p>{items.length ? 'Không có nhiệm vụ phù hợp bộ lọc.' : 'Catalog chưa có template.'}</p>{items.length ? <Button size="sm" onClick={() => { setSearch(''); setCategory('ALL'); setStatus('ALL'); }}>Xóa bộ lọc</Button> : <Button size="sm" variant="primary" disabled={catalog.isError} onClick={() => openEditor()}>Tạo nhiệm vụ đầu tiên</Button>}</div>}</div>}
      <p className="text-[11px] text-text-muted">{invariantHint}</p>
    </>}
    {activation && <ConfirmModal title={activation.isActive ? 'Tắt nhiệm vụ?' : 'Bật nhiệm vụ?'} busy={busy} confirmDisabled={blocked} onClose={() => { if (!busy) { setActivation(null); setActivationError(''); } }} onConfirm={() => void activate()} confirmLabel={activation.isActive ? 'Xác nhận tắt' : 'Xác nhận bật'}>
      <p className="font-bold">{activation.name}</p><p className="text-xs text-text-muted">{activation.code} · Phiên bản {activation.version}</p><p className="flex items-center gap-2 text-xs">Trạng thái: <ActiveBadge active={activation.isActive} />→<ActiveBadge active={!activation.isActive} /></p><p>{activation.rewardCoin} Coin · {activation.rewardXp} XP{activation.rewardItemCode && <span className="block text-xs"><RewardItemLabel code={activation.rewardItemCode} /></span>}</p><p className="text-xs text-text-muted">Áp dụng cho các bộ nhiệm vụ được cấp sau thao tác, kể cả người học chưa nhận bộ hôm nay. Bộ đã cấp giữ nguyên.</p>{after && <p className={`rounded-lg p-3 text-xs ${after.valid || after.inactive ? 'bg-primary-light' : 'bg-danger-light text-danger-dark'}`}>Dự kiến sau thao tác: {after.core} mẫu cốt lõi và {after.slotFive} mẫu slot 5 không có điều kiện cấp · {after.inactive ? 'catalog chưa kích hoạt (không còn mẫu đang bật)' : `invariant ${after.valid ? 'đạt' : 'không đạt'}`}. Backend kiểm tra lại dưới khóa catalog.</p>}
      {activationError && <ErrorBanner message={activationError}>{blocked && <><Button size="sm" disabled={busy} onClick={() => void refreshActivation()}>Kiểm tra trạng thái server</Button><Button size="sm" disabled={busy} onClick={() => setActivation(null)}>Đóng</Button></>}</ErrorBanner>}
    </ConfirmModal>}
  </div>;
}
