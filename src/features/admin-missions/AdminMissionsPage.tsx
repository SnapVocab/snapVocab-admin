import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { getMissionTemplate, setTemplateActive } from '../../domains/admin-missions/api';
import { catalogSummary, categoryLabels, dailyOutlook, eligibilityLabels, invariantHint, missionGroup, objective, poolShortage, supportedPreset, type MissionGroup } from '../../domains/admin-missions/mappers';
import { missionKeys, useMissionTemplates } from '../../domains/admin-missions/queries';
import type { MissionTemplate } from '../../domains/admin-missions/types';
import { Badge, Button, PageHeader, StripCell, StripNote, SummaryStrip, toolbarControl } from '../../components/ui';
import { ApiClientError } from '../../lib/api-client';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ActiveBadge, ErrorBanner } from './components';
import { errorMessage, isApiError } from './ui';
import { MissionEditor } from './MissionEditor';
import { RewardItemLabel } from './RewardItemPicker';
import { MissionCard, MissionTile, RewardLine } from './MissionCard';
import { navigate } from '../../lib/router';
import { useToast } from '../../components/ui/Toast';

const GROUPS: { key: MissionGroup; label: string; dot: string }[] = [
  { key: 'CORE', label: 'Cốt lõi · slot 1–4', dot: 'bg-primary' },
  { key: 'SLOT5', label: 'Slot 5', dot: 'bg-snapy' },
  { key: 'GATED', label: 'Có điều kiện cấp', dot: 'bg-info' },
  { key: 'OFF', label: 'Đang tắt', dot: 'bg-neutral-300' },
];
const range = ([a, b]: [number, number]) => (a === b ? `${a}` : `${a}–${b}`);

/** What a group means for learners today, computed from the catalog; `bad` when it breaks the daily set. */
function outcome(group: MissionGroup, s: ReturnType<typeof catalogSummary>): { text: string; bad?: boolean } {
  if (group === 'CORE') {
    if (s.core < 4) return { text: `Thiếu ${4 - s.core} mẫu: slot 1–4 không đủ, người học không có điều kiện cấp sẽ không nhận được bộ nhiệm vụ.`, bad: true };
    return { text: s.core === 4
      ? '4 mẫu cho 4 slot: người học nhận đủ cả 4 mẫu mỗi ngày, không xoay vòng.'
      : `${s.core} mẫu cho 4 slot: mỗi ngày chọn 4 theo trọng số, ưu tiên mẫu không trùng hôm qua.` };
  }
  if (group === 'SLOT5') {
    if (!s.slotFive) return s.core >= 5 ? { text: 'Chưa có mẫu slot 5: slot 5 lấy thêm 1 mẫu cốt lõi.' } : { text: 'Chưa có mẫu slot 5 và không dư mẫu cốt lõi để bù.', bad: true };
    return { text: s.slotFive === 1
      ? 'Người học không có điều kiện cấp nào luôn nhận mẫu này ở slot 5.'
      : `Slot 5 xoay giữa ${s.slotFive} mẫu này, cộng các mẫu có điều kiện khi người học đủ điều kiện.` };
  }
  if (group === 'GATED') return { text: 'Chỉ được chọn khi người học đủ điều kiện cấp; khi đó xoay cùng các mẫu cùng slot.' };
  return { text: 'Không được cấp cho người học.' };
}

/** `sub` is the route segment after /missions: undefined = list, "new" = create, numeric id = edit. */
export function AdminMissionsPage({ onDirtyChange, sub }: { onDirtyChange: (dirty: boolean) => void; sub?: string }) {
  const catalog = useMissionTemplates(); const client = useQueryClient();
  // The editor lives in the URL, so F5 and shared links reopen the same template.
  const editor = sub === 'new' ? { id: undefined } : sub && /^\d+$/.test(sub) ? { id: Number(sub) } : null;
  // Bumped after a toggle from inside the editor so it reloads the new version.
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('ALL'); const [group, setGroup] = useState<MissionGroup | 'ALL'>('ALL');
  const [activation, setActivation] = useState<MissionTemplate | null>(null);
  const [activationError, setActivationError] = useState(''); const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false); const flight = useRef(false);
  const { show: showToast, node: toastNode } = useToast(); const listScroll = useRef(0); const scroller = useRef<HTMLDivElement>(null);
  const editing = !!editor;
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = editing ? 0 : listScroll.current; }, [editing]);
  useEffect(() => { if (busy) onDirtyChange(true); return () => { if (busy) onDirtyChange(false); }; }, [busy, onDirtyChange]);
  const items = catalog.data ?? [];
  const summary = catalogSummary(items);
  const outlook = dailyOutlook(items);
  const toggled = (target: MissionTemplate) => items.map(i => i.id === target.id ? { ...i, isActive: !target.isActive } : i);
  const after = activation && catalog.data ? catalogSummary(toggled(activation)) : undefined;
  function closeEditor(notice?: string) { navigate('/missions'); onDirtyChange(false); if (notice) showToast(notice, true); }
  function openEditor(id?: number) { listScroll.current = scroller.current?.scrollTop ?? 0; navigate(id ? `/missions/${id}` : '/missions/new'); }
  function openActivation(item: MissionTemplate) { setActivation(item); setActivationError(''); setBlocked(false); }
  async function activate() {
    if (!activation || flight.current || blocked) return;
    flight.current = true; setBusy(true); setActivationError('');
    try {
      const item = await setTemplateActive(activation.id, { version: activation.version, isActive: !activation.isActive });
      client.setQueryData(missionKeys.detail(item.id), item);
      await client.invalidateQueries({ queryKey: missionKeys.list });
      setActivation(null); showToast(item.isActive ? 'Đã bật nhiệm vụ.' : 'Đã tắt nhiệm vụ.');
      if (editor) setRevision(r => r + 1);
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
      setActivation(null); setBlocked(false); showToast(`Trạng thái server: ${current.isActive ? 'Đang bật' : 'Đang tắt'}.`);
      void client.invalidateQueries({ queryKey: missionKeys.list });
      if (editor) setRevision(r => r + 1);
    } catch (e) {
      if (isApiError(e, 'MISSION_TEMPLATE_NOT_FOUND')) { setActivation(null); void client.invalidateQueries({ queryKey: missionKeys.list }); closeEditor(errorMessage(e)); }
      else setActivationError(errorMessage(e));
    } finally { flight.current = false; setBusy(false); }
  }
  const visible = items.filter(i => (category === 'ALL' || i.category === category) && (group === 'ALL' || missionGroup(i) === group) && `${i.name} ${i.code}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const clearFilters = () => { setSearch(''); setCategory('ALL'); setGroup('ALL'); };
  // The rule passing is the normal state (plain text); only a failure gets a badge.
  const invariant = summary.inactive ? <span className="font-medium text-text-muted">Chưa kích hoạt</span> : summary.valid ? <span className="font-medium text-primary-dark">Đạt</span> : <Badge tone="danger" className="w-fit">Không đạt</Badge>;

  return <div ref={scroller} className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
    {toastNode}
    {editor ? <MissionEditor key={`${editor.id ?? 'new'}-${revision}`} id={editor.id} onDirtyChange={onDirtyChange} onBack={closeEditor} onSaved={item => { navigate(`/missions/${item.id}`, { replace: true }); onDirtyChange(false); showToast('Đã lưu nhiệm vụ.'); }} onActivate={openActivation} /> : <>
      <PageHeader title="Nhiệm vụ hằng ngày"
        description="Mỗi ngày mỗi người học nhận 5 nhiệm vụ: slot 1–4 từ nhóm học cốt lõi, slot 5 từ Duy trì hoặc Cửa hàng."
        actions={<Button variant="primary" icon={<Plus />} disabled={catalog.isError && !catalog.data} onClick={() => openEditor()}>Tạo nhiệm vụ</Button>} />
      {catalog.isError && <ErrorBanner message={`${catalog.data ? 'Dữ liệu đang hiển thị là bản đã tải trước đó. ' : ''}${errorMessage(catalog.error)}`}><Button size="sm" onClick={() => void catalog.refetch()}>Thử lại</Button></ErrorBanner>}
      {catalog.data && summary.inactive && <p title="Không bật được từng mẫu khi catalog trống, vì sau mỗi thao tác catalog phải đủ cấp 5 nhiệm vụ. Máy chủ chèn các mẫu mặc định khi khởi động." className="rounded-lg border border-info/30 bg-info-light p-3 text-xs text-info-dark">Chưa có mẫu nào đang bật nên người học chưa nhận nhiệm vụ. Catalog cần được khởi tạo từ phía máy chủ trước.</p>}

      {/* SUMMARY STRIP — counts per outcome group (each filters the table), the catalog rule and the daily reward band. */}
      {catalog.data && <SummaryStrip label="Tóm tắt catalog">
        <StripCell value={items.length} label="Mẫu nhiệm vụ" active={group === 'ALL'} onClick={() => setGroup('ALL')} />
        {GROUPS.map(g => <StripCell key={g.key} value={items.filter(i => missionGroup(i) === g.key).length} label={g.label} dot={g.dot} active={group === g.key} onClick={() => setGroup(group === g.key ? 'ALL' : g.key)} />)}
        <StripNote title={invariantHint}>
          <span>Đủ 5 nhiệm vụ mỗi ngày</span>{invariant}
        </StripNote>
        <StripNote push title="Tổng thưởng của bộ 5 nhiệm vụ, thấp nhất–cao nhất theo catalog đang bật (mọi tổ hợp điều kiện cấp).">
          <span>Thưởng mỗi người/ngày</span>
          {outlook.coin && outlook.xp
            ? <span className="flex items-baseline gap-3 text-sm font-semibold text-text tabular-nums"><span>{range(outlook.coin)} Coin</span><span>{range(outlook.xp)} XP</span></span>
            : <span className="font-semibold text-text">—</span>}
        </StripNote>
      </SummaryStrip>}

      {/* A LEARNER'S DAY — the same algorithm as the backend, rendered as the mobile cards. */}
      {catalog.data && !summary.inactive && <section aria-label="Một ngày của người học" className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold text-text">Một ngày của người học</h2>
          <span className="text-xs text-text-muted">Ví dụ cho người học không có booster hay vật phẩm mua được; bộ thật chọn theo trọng số.</span>
        </div>
        {outlook.example ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {outlook.slots.map((slot, i) => <div key={slot.label} className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs text-text-muted">
              <span className="truncate"><span className="font-medium text-text">Slot {i + 1}</span> {slot.label}</span>
              <span className="shrink-0" title={slot.reachable.map(t => t.name).join(', ')}>{slot.reachable.length} mẫu</span>
            </div>
            <MissionCard mission={outlook.example![i]} compact />
            {slot.fallback && <p className="text-xs text-text-muted">Không có mẫu nhóm này đang bật: lấy mẫu cốt lõi.</p>}
          </div>)}
        </div> : <ErrorBanner message="Catalog đang bật không đủ để cấp 5 nhiệm vụ cho người học không có điều kiện cấp." />}
      </section>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-sm flex-1"><Search size={14} className="absolute left-3 top-3 text-text-muted" /><input type="search" aria-label="Tìm nhiệm vụ" className={`${toolbarControl} w-full pl-9`} placeholder="Tìm tên hoặc mã…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select aria-label="Lọc nhóm" className={`${toolbarControl} cursor-pointer`} value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">Tất cả nhóm</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <Button icon={<RefreshCw />} label="Làm mới" loading={catalog.isFetching} onClick={() => void catalog.refetch()} />
      </div>

      {catalog.isPending ? <div role="status" aria-label="Đang tải catalog" className="space-y-3 rounded-lg border border-border bg-surface p-4">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded bg-surface-subtle" />)}</div> : catalog.data && <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-subtle/60 text-text-muted"><tr>{['Nhiệm vụ', 'Nhóm', 'Mục tiêu', 'Phần thưởng', 'Điều kiện cấp', 'Trọng số', 'Trạng thái', ''].map((h, i) => <th key={i} title={i === 5 ? 'Trọng số tương đối trong pool của từng slot; không phải xác suất nhận cố định.' : undefined} className={`whitespace-nowrap px-4 py-2 font-medium ${i === 5 ? 'text-right' : ''} ${i > 1 && i < 6 ? 'hidden xl:table-cell' : i === 1 ? 'hidden md:table-cell' : ''}`}>{h}</th>)}</tr></thead>
          {GROUPS.map(g => {
            const rows = visible.filter(i => missionGroup(i) === g.key);
            if (!rows.length) return null;
            const o = outcome(g.key, summary);
            return <tbody key={g.key} className="divide-y divide-border border-b border-border last:border-b-0">
              <tr className="bg-surface-subtle/40"><td colSpan={8} className="px-4 py-2">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-text"><span className={cn('h-1.5 w-1.5 rounded-full', g.dot)} />{g.label}<span className="font-normal text-text-light">{rows.length}</span></span>
                  <span className={cn('text-xs', o.bad ? 'font-medium text-danger-dark' : 'text-text-muted')}>{o.text}</span>
                </span>
              </td></tr>
              {rows.map(item => <tr key={item.id} className="hover:bg-surface-subtle/60">
                <td className="min-w-48 px-4 py-2.5"><div className="flex items-center gap-3"><MissionTile category={item.category} size="sm" /><div className="min-w-0"><button className="text-left text-body font-medium text-text hover:underline" onClick={() => openEditor(item.id)}>{item.name}</button><p className="font-mono text-2xs text-text-light">{item.code}</p>{!supportedPreset(item) && <p className="mt-0.5 text-xs text-danger-dark">Cấu hình này chưa được màn quản trị hỗ trợ</p>}</div></div></td>
                <td className="hidden px-4 py-2.5 text-text-muted md:table-cell">{categoryLabels[item.category]}</td>
                <td className="hidden max-w-56 px-4 py-2.5 xl:table-cell">{objective(item)}</td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 tabular-nums xl:table-cell"><span className="font-medium">{item.rewardCoin}</span> Coin<span className="ml-2 font-medium">{item.rewardXp}</span> XP{item.rewardItemCode && <p className="mt-0.5 whitespace-normal text-text-muted"><RewardItemLabel code={item.rewardItemCode} /></p>}</td>
                <td className="hidden px-4 py-2.5 xl:table-cell">{eligibilityLabels[item.eligibilityRule]}</td>
                <td className="hidden px-4 py-2.5 text-right tabular-nums xl:table-cell">{item.weight}</td>
                <td className={cn('px-4 py-2.5', item.isActive ? 'text-text-muted' : 'text-text-light')}>{item.isActive ? 'Đang bật' : 'Đang tắt'}</td>
                <td className="px-4 py-2.5"><div className="flex justify-end gap-2"><Button size="sm" disabled={catalog.isError || (!item.isActive && !supportedPreset(item))} onClick={() => openActivation(item)}>{item.isActive ? 'Tắt' : 'Bật'}</Button><Button size="sm" onClick={() => openEditor(item.id)}>Sửa</Button></div></td>
              </tr>)}
            </tbody>;
          })}
        </table>
        {!visible.length && <div className="space-y-3 p-12 text-center text-sm text-text-muted"><p>{items.length ? 'Không có nhiệm vụ phù hợp bộ lọc.' : 'Catalog chưa có mẫu nhiệm vụ nào.'}</p>{items.length ? <Button size="sm" onClick={clearFilters}>Xóa bộ lọc</Button> : <Button size="sm" variant="primary" disabled={catalog.isError} onClick={() => openEditor()}>Tạo nhiệm vụ đầu tiên</Button>}</div>}
      </div>}
    </>}
    {activation && <ConfirmModal title={activation.isActive ? 'Tắt nhiệm vụ?' : 'Bật nhiệm vụ?'} tone={activation.isActive ? 'warning' : 'primary'} maxWidth="lg" busy={busy} confirmDisabled={blocked} onClose={() => { if (!busy) { setActivation(null); setActivationError(''); } }} onConfirm={() => void activate()} confirmLabel={activation.isActive ? 'Xác nhận tắt' : 'Xác nhận bật'}>
      <p className="font-bold">{activation.name}</p><p className="text-xs text-text-muted">{activation.code} · Phiên bản {activation.version}</p><p className="flex items-center gap-2 text-xs">Trạng thái: <ActiveBadge active={activation.isActive} />→<ActiveBadge active={!activation.isActive} /></p><p><RewardLine coin={activation.rewardCoin} xp={activation.rewardXp} />{activation.rewardItemCode && <span className="block text-xs"><RewardItemLabel code={activation.rewardItemCode} /></span>}</p><p className="text-xs text-text-muted">Áp dụng cho các bộ nhiệm vụ được cấp sau thao tác, kể cả người học chưa nhận bộ hôm nay. Bộ đã cấp giữ nguyên.</p>{after && <p className={`rounded-md p-3 text-xs ${after.valid || after.inactive ? 'bg-surface-subtle text-text' : 'bg-danger-light text-danger-dark'}`}>Sau thao tác còn {after.core} mẫu cốt lõi và {after.slotFive} mẫu slot 5 không có điều kiện cấp: {after.inactive ? 'không còn mẫu nào đang bật' : after.valid ? 'vẫn đủ cấp 5 nhiệm vụ mỗi ngày' : 'không đủ cấp 5 nhiệm vụ mỗi ngày'}. Máy chủ kiểm tra lại khi thực hiện.</p>}
      {activationError && <ErrorBanner message={activationError}>{blocked && <><Button size="sm" disabled={busy} onClick={() => void refreshActivation()}>Kiểm tra trạng thái server</Button><Button size="sm" disabled={busy} onClick={() => setActivation(null)}>Đóng</Button></>}</ErrorBanner>}
    </ConfirmModal>}
  </div>;
}
