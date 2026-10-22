import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Copy, Lock, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, SectionLabel, TextLink } from '../../components/ui';
import { auditUsesFixtures } from '../../domains/admin-audit/config';
import { historyPath } from '../../domains/admin-audit/mappers';
import { CoinIcon, XpIcon } from '../../components/brand/BrandIcons';
import { MAX_COIN_PER_DAY, formatVnDateTime } from '../../domains/shop/mappers';
import { MissionCard, MissionTile } from './MissionCard';
import { ApiClientError } from '../../lib/api-client';
import { createMissionTemplate, getMissionTemplate, getMissionTemplates, patchTemplate } from '../../domains/admin-missions/api';
import { CLIENTS, SLOTS, categoryLabels, createPayload, dailyOutlook, eligibilityHints, isCore, eligibilityLabels, emptyForm, formDiff, matchPreset, objective, poolShortage, presets, savePayload, supportedPreset, toForm, validateForm } from '../../domains/admin-missions/mappers';
import { missionKeys, useMissionTemplate, useMissionTemplates } from '../../domains/admin-missions/queries';
import type { MissionForm, MissionTemplate } from '../../domains/admin-missions/types';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ActiveBadge, ErrorBanner, Field } from './components';
import { errorMessage, inputClass, isApiError } from './ui';
import { RewardItemPicker } from './RewardItemPicker';
import { adminShopKeys } from '../../domains/shop/queries';

interface EditorProps {
  id?: number; onBack: (notice?: string) => void; onSaved: (item: MissionTemplate) => void;
  onActivate: (item: MissionTemplate) => void; onDirtyChange: (dirty: boolean) => void;
}
export function MissionEditor(props: EditorProps) {
  const detail = useMissionTemplate(props.id);
  if (props.id && !detail.data) return <div className="space-y-4"><Button size="sm" onClick={() => props.onBack()}><ArrowLeft size={14} />Danh sách</Button>{detail.isPending ? <div role="status" className="animate-pulse rounded-lg bg-surface-subtle p-12">Đang tải template…</div> : <ErrorBanner message={errorMessage(detail.error)}><Button size="sm" onClick={() => void detail.refetch()}>Thử lại</Button></ErrorBanner>}</div>;
  return <MissionEditorForm {...props} initial={detail.data} fresh={detail.data} refreshFailed={detail.isError} onRefresh={() => void detail.refetch()} />;
}
interface FormProps extends EditorProps { initial?: MissionTemplate; fresh?: MissionTemplate; refreshFailed: boolean; onRefresh: () => void }
function MissionEditorForm({ initial, fresh, refreshFailed, onRefresh, onBack, onSaved, onActivate, onDirtyChange }: FormProps) {
  const client = useQueryClient(); const list = useMissionTemplates();
  const [original, setOriginal] = useState<MissionTemplate | undefined>(initial);
  const [form, setForm] = useState<MissionForm>(() => initial ? toForm(initial) : emptyForm());
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial ? toForm(initial) : emptyForm()));
  const [errors, setErrors] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const flight = useRef(false);
  const [confirm, setConfirm] = useState<'leave' | 'reload' | null>(null);
  const [conflict, setConflict] = useState(false); const [uncertain, setUncertain] = useState(false); const [copied, setCopied] = useState(false);
  const [presetNote, setPresetNote] = useState(''); const [server, setServer] = useState<MissionTemplate | null>(null); const root = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(form) !== baseline;
  function load(item: MissionTemplate) { const next = toForm(item); setOriginal(item); setForm(next); setBaseline(JSON.stringify(next)); setErrors({}); setError(''); setConflict(false); setUncertain(false); setPresetNote(''); }
  // Background refetch found a newer version: adopt it while the form is clean, otherwise warn before Save conflicts.
  const stale = !!fresh && !!original && fresh.id === original.id && fresh.version > original.version;
  if (stale && !dirty && !busy && !conflict && !uncertain) load(fresh!); // adjust-state-during-render; stale is false right after
  const focusInvalid = () => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  useEffect(() => { onDirtyChange(dirty || busy); return () => onDirtyChange(false); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);
  // Template removed on server: nothing left to edit, return to list.
  function missing(e: unknown) {
    if (!isApiError(e, 'MISSION_TEMPLATE_NOT_FOUND')) return false;
    void client.invalidateQueries({ queryKey: missionKeys.list }); onBack(errorMessage(e)); return true;
  }
  function change<K extends keyof MissionForm>(key: K, value: MissionForm[K]) { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); }
  async function save() {
    if (flight.current || conflict || uncertain) return;
    const invalid = validateForm(form); setErrors(invalid); if (Object.keys(invalid).length) { setError('Kiểm tra các trường được đánh dấu trước khi lưu.'); focusInvalid(); return; }
    flight.current = true; setBusy(true); setError('');
    try {
      const item = original ? await patchTemplate(original.id, savePayload(form, original)) : await createMissionTemplate(createPayload(form));
      load(item); client.setQueryData(missionKeys.detail(item.id), item); void client.invalidateQueries({ queryKey: missionKeys.list }); onSaved(item);
    } catch (e) {
      if (missing(e)) return;
      setError(errorMessage(e));
      if (e instanceof ApiClientError) {
        setErrors(e.fieldErrors); setConflict(e.code === 'VERSION_CONFLICT'); focusInvalid();
        if (e.code === 'MISSION_TEMPLATE_CODE_EXISTS') setErrors(x => ({ ...x, code: 'Mã nhiệm vụ đã tồn tại.' }));
        if (e.code === 'REWARD_ITEM_NOT_ELIGIBLE') { setErrors(x => ({ ...x, rewardItemCode: 'Chọn một vật phẩm đã phát hành.' })); void client.invalidateQueries({ queryKey: adminShopKeys.all }); }
        const catalog = client.getQueryData<MissionTemplate[]>(missionKeys.list);
        if (e.code === 'MISSION_POOL_INSUFFICIENT' && original && catalog) setError(`${errorMessage(e)} ${poolShortage(catalog.map(i => i.id === original.id ? { ...i, ...createPayload(form) } : i))}`.trim());
      }
      if (!(e instanceof ApiClientError) || e.statusCode >= 500 || e.statusCode === 0) {
        setUncertain(true); setError('Chưa xác định được kết quả lưu. Nội dung đang nhập được giữ nguyên. Kiểm tra trạng thái server trước khi gửi lại.');
      }
    } finally { flight.current = false; setBusy(false); }
  }
  async function reconcile() {
    if (flight.current) return; flight.current = true; setBusy(true);
    try {
      if (original) {
        const current = await getMissionTemplate(original.id);
        // Preserve draft when server has a different version; reload requires explicit confirmation.
        if (JSON.stringify(createPayload(form)) === JSON.stringify(createPayload(toForm(current)))) { load(current); onSaved(current); }
        else { setConflict(current.version !== original.version); setUncertain(false); setError(current.version !== original.version ? 'Server có phiên bản khác. Tải bản mới để đối chiếu; nội dung đang nhập vẫn được giữ.' : 'Server chưa ghi nhận thay đổi. Có thể lưu lại.'); }
      } else {
        const items = await getMissionTemplates(); const existing = items.find(i => i.code === form.code.trim());
        if (existing) { setError('Đã tìm thấy mã này trên server. Tải bản trên server để kiểm tra kết quả; bản đang nhập được giữ cho đến khi xác nhận.'); setOriginal(existing); setConflict(true); setUncertain(false); }
        else { setUncertain(false); setError('Chưa tìm thấy mã trên server. Có thể tạo lại; máy chủ vẫn kiểm tra mã trùng.'); }
      }
    } catch (e) { if (!missing(e)) setError(errorMessage(e)); } finally { flight.current = false; setBusy(false); }
  }
  async function compareServer() {
    if (!original || flight.current) return; flight.current = true; setBusy(true);
    try { setServer(await getMissionTemplate(original.id)); setConfirm('reload'); }
    catch (e) { if (!missing(e)) setError(errorMessage(e)); }
    finally { flight.current = false; setBusy(false); }
  }
  function closeConfirm() { setConfirm(null); setServer(null); }
  const diff = server ? formDiff(form, toForm(server)) : [];
  const supported = supportedPreset(form);
  const selectedPreset = matchPreset(form);
  const formErrors = validateForm(form);
  const objectiveText = formErrors.targetValue || formErrors.minQuizAccuracyPercent || formErrors.quizRequestedCount ? 'Mục tiêu chưa được cấu hình hợp lệ.' : objective(createPayload(form));
  function choosePreset(key: string) {
    const p = presets.find(x => x.key === key)!;
    const reset = [form.targetValue !== p.targetValue && `mục tiêu ${form.targetValue || 'trống'} → ${p.targetValue}`,
      form.quizRequestedCount !== p.quizRequestedCount && 'số câu quiz', form.minQuizAccuracyPercent !== p.minQuizAccuracyPercent && 'độ chính xác tối thiểu'].filter(Boolean);
    setPresetNote(reset.length ? `Đã đặt lại theo mẫu: ${reset.join(', ')}.` : '');
    setForm(f => ({ ...f, category: p.category, triggerEvent: p.triggerEvent, eligibilityRule: p.eligibilityRule, targetValue: p.targetValue, minQuizAccuracyPercent: p.minQuizAccuracyPercent, quizRequestedCount: p.quizRequestedCount })); setErrors({});
  }
  const numericInput = (key: 'targetValue' | 'rewardCoin' | 'rewardXp' | 'weight' | 'minQuizAccuracyPercent' | 'rewardItemFallbackCoin', label: string, hint?: string, min = 0, max = 2147483647, icon?: React.ReactNode) => <Field label={label} error={errors[key]} hint={hint} required={key !== 'minQuizAccuracyPercent'} addon={icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}><input className={`${inputClass} ${icon ? 'pl-9' : ''}`} type="number" step={1} min={min} max={max} value={form[key]} onChange={e => change(key, e.target.value)} /></Field>;

  // LiveOps impact: the daily set the catalog hands out, before and after this draft (same algorithm as the backend).
  const content = createPayload(form);
  const before = list.data ? dailyOutlook(list.data) : null;
  const projected = list.data && !formErrors.rewardCoin && !formErrors.rewardXp
    ? (original ? list.data.map(i => i.id === original.id ? { ...i, ...content, isActive: true } : i) : [...list.data, { ...content, id: Number.MAX_SAFE_INTEGER, isActive: true }])
    : null;
  const afterView = projected ? dailyOutlook(projected) : null;
  // The ceiling is the current app's (PD-DM-02); older apps keep the legacy set until they are gone.
  const afterCurrentTop = projected ? dailyOutlook(projected, [CLIENTS.current]).coin?.[1] ?? 0 : 0;
  const slotIndex = SLOTS.findIndex(s => s.categories.includes(form.category));
  const fallbackSlots = (afterView ?? before)?.slots.flatMap((s, i) => s.fallback ? [i + 1] : []) ?? [];
  const band = (o: { coin: [number, number] | null; xp: [number, number] | null } | null) => o?.coin && o.xp
    ? `${o.coin[0] === o.coin[1] ? o.coin[0] : o.coin.join('–')} Coin · ${o.xp[0] === o.xp[1] ? o.xp[0] : o.xp.join('–')} XP` : '—';

  return <div ref={root} className="space-y-4">
    <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Button disabled={busy} icon={<ArrowLeft />} label="Quay lại danh sách" onClick={() => dirty ? setConfirm('leave') : onBack()} />
        <div>
          <p className="text-xs text-text-muted">Nhiệm vụ hằng ngày / {original ? 'Sửa' : 'Tạo mới'}</p>
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">{original ? form.name || 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ'}<ActiveBadge active={original?.isActive ?? false} /></h1>
          <p className="text-xs text-text-muted" aria-live="polite">{original ? `Phiên bản ${original.version}` : 'Tạo mới luôn ở trạng thái Tắt'}{dirty && <> · <Badge tone="warning">Có thay đổi chưa lưu</Badge></>}</p>
        </div>
      </div>
      <div className="flex gap-2">{original && <Button disabled={busy || dirty || conflict || uncertain || (!original.isActive && !supported)} onClick={() => onActivate(original)}>{original.isActive ? 'Tắt nhiệm vụ' : 'Bật nhiệm vụ'}</Button>}<Button variant="primary" icon={<Save />} disabled={busy || conflict || uncertain || (!!original && !dirty)} onClick={() => void save()}>{busy ? 'Đang lưu…' : original ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button></div>
    </div>
    <p className="text-xs text-text-muted">Thay đổi áp dụng cho các bộ nhiệm vụ được cấp sau khi lưu, kể cả người học chưa nhận bộ hôm nay. Bộ đã cấp giữ nguyên.{dirty && ' Lưu thành công trước khi bật/tắt.'}</p>
    {stale && dirty && !conflict && <ErrorBanner message={`Server đã có phiên bản ${fresh!.version}; bản đang sửa là ${original!.version}. Lưu sẽ bị từ chối do xung đột. Nội dung đang nhập vẫn được giữ.`}><Button size="sm" disabled={busy} onClick={() => void compareServer()}>So sánh với bản mới</Button></ErrorBanner>}
    {refreshFailed && <ErrorBanner message="Không làm mới được dữ liệu template; đang hiển thị bản đã tải trước đó."><Button size="sm" disabled={busy} onClick={onRefresh}>Thử lại</Button></ErrorBanner>}
    {error && <ErrorBanner message={error}>{uncertain && <Button size="sm" disabled={busy} onClick={() => void reconcile()}>Kiểm tra kết quả trên server</Button>}{conflict && <Button size="sm" disabled={busy} onClick={() => void compareServer()}>So sánh với bản mới</Button>}</ErrorBanner>}
    {!supported && <ErrorBanner message="Màn quản trị chưa hỗ trợ cấu hình của mẫu này (nhóm, sự kiện đếm hoặc điều kiện cấp). Các giá trị được giữ nguyên; nhờ đội kỹ thuật kiểm tra trước khi bật." />}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* BUILDER — top to bottom in the order a mission is made */}
      <fieldset disabled={busy || conflict || uncertain} className="min-w-0 rounded-lg border border-border bg-surface">
        <section className="space-y-4 px-5 pb-3 pt-5">
          <div className="flex items-center gap-3"><div className="flex-1"><SectionLabel>Cơ bản</SectionLabel></div><p className="text-xs text-text-muted"><span aria-hidden="true" className="text-danger-dark">*</span> Bắt buộc</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã nhiệm vụ" error={errors.code} hint={original ? 'Mã bất biến sau khi tạo.' : `${form.code.length}/64 ký tự`} required addon={original && <span className="absolute right-2 top-1.5 flex items-center gap-1 text-text-muted"><Lock size={14} /><button type="button" aria-label="Sao chép mã" title="Sao chép mã" className="rounded p-1 hover:bg-surface" onClick={() => void navigator.clipboard?.writeText(original.code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })}>{copied ? <Check size={14} className="text-primary-dark" /> : <Copy size={14} />}</button></span>}><input maxLength={64} className={`${inputClass} font-mono ${original ? '!pr-16' : ''}`} disabled={!!original} value={form.code} onChange={e => change('code', e.target.value)} /></Field>
            <Field label="Tên hiển thị" error={errors.name} hint={`${form.name.length}/100 ký tự`} required><input maxLength={100} className={inputClass} value={form.name} onChange={e => change('name', e.target.value)} /></Field>
          </div>
          <Field label="Mô tả" error={errors.description} hint={`${form.description.length}/255 ký tự`} required><textarea maxLength={255} rows={2} className={inputClass} value={form.description} onChange={e => change('description', e.target.value)} /></Field>
        </section>
        <section className="space-y-4 px-5 py-3">
          <SectionLabel>Mục tiêu</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mẫu hành động" hint={presetNote || 'Đổi mẫu sẽ đặt lại mục tiêu và bộ lọc quiz theo mẫu mới.'}><select className={inputClass} value={selectedPreset?.key ?? (supported ? 'CUSTOM' : '')} disabled={!supported} onChange={e => choosePreset(e.target.value)}>
              {!supported && <option value="">Chưa hỗ trợ</option>}{supported && !selectedPreset && <option value="CUSTOM" disabled>Quiz tùy chỉnh</option>}{presets.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></Field>
            {numericInput('targetValue', `Mục tiêu (${supported?.unit ?? 'lần'})`, undefined, 1)}
          </div>
          <p className="flex items-center gap-2 text-xs text-text-muted"><MissionTile category={form.category} size="sm" />Nhóm {categoryLabels[form.category]}{slotIndex >= 0 && ` · vào slot ${slotIndex + 1} (${SLOTS[slotIndex].label})`}</p>
          {form.triggerEvent === 'QUIZ_COMPLETED' && <div className="grid gap-3 sm:grid-cols-2"><Field label="Số câu của quiz" error={errors.quizRequestedCount}><select className={inputClass} value={form.quizRequestedCount} onChange={e => change('quizRequestedCount', e.target.value)}><option value="">Không lọc số câu</option>{[5, 10, 20].map(n => <option key={n} value={n}>{n} câu</option>)}</select></Field>{numericInput('minQuizAccuracyPercent', 'Độ chính xác tối thiểu (%)', 'Để trống nếu không lọc độ chính xác.', 1, 100)}</div>}
          {form.triggerEvent === 'QUIZ_COMPLETED' && <p className="rounded-md bg-info-light p-3 text-xs text-text-muted">Mẫu không có điều kiện cấp có thể được giao cho người học chưa đủ từ để làm quiz 5/10/20 câu.</p>}
          {form.triggerEvent === 'TOPIC_ITEM_CREATED' && <p className="rounded-md bg-info-light p-3 text-xs text-text-muted">Chỉ tính từ người học tự thêm vào chủ đề của mình (không tính sao chép hay nhập hàng loạt), có đủ từ và bản dịch để dùng cho quiz, và chưa từng được tính trước đây. Mỗi từ chỉ tăng một nhiệm vụ thêm từ, kể cả khi bộ hôm nay có nhiều nhiệm vụ loại này.</p>}
          {form.triggerEvent === 'BOOSTER_USED' && <p className="text-xs text-text-muted">Đếm lần kích hoạt booster thành công, không đếm lượt mua.</p>}
          {form.triggerEvent === 'LEARNING_ACTIVITY_RECORDED' && <p className="text-xs text-text-muted">Đếm hoạt động học trong ngày, không phải số ngày streak. Hoạt động học gồm làm quiz, học hoặc ôn thẻ, và lưu từ đã quét.</p>}
          {form.triggerEvent === 'SRS_REVIEW_COMPLETED' && <p className="text-xs text-text-muted">Đếm số thẻ khác nhau được chấm trong ngày, cả thẻ mới lẫn thẻ đến hạn. Chấm lại cùng một thẻ trong ngày không tính thêm. Chỉ giao cho người dùng bản app có nút cho loại nhiệm vụ này; người dùng app cũ không nhận mẫu này.</p>}
          {form.triggerEvent === 'SCAN_WORD_SAVED' && <p className="text-xs text-text-muted">Đếm từ người học lưu từ màn kết quả quét vào chủ đề của mình: từ phải có trong kết quả lượt quét đó và đủ bản dịch để dùng cho quiz. Mỗi từ chỉ tính một lần cho mỗi lượt quét. Chỉ giao cho người dùng bản app có nút cho loại nhiệm vụ này; người dùng app cũ không nhận mẫu này.</p>}
        </section>
        <section className="space-y-4 px-5 py-3">
          <SectionLabel>Phần thưởng</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">{numericInput('rewardCoin', 'Coin', undefined, 0, 2147483647, <CoinIcon size={16} />)}{numericInput('rewardXp', 'XP', 'XP thưởng nhiệm vụ không được booster nhân.', 0, 2147483647, <XpIcon size={18} />)}</div>
          <RewardItemPicker value={form.rewardItemCode} savedCode={original?.rewardItemCode} disabled={busy || conflict || uncertain} onChange={code => setForm(f => ({ ...f, rewardItemCode: code, rewardItemFallbackCoin: code ? f.rewardItemFallbackCoin : '' }))} />
          {errors.rewardItemCode && <p role="alert" className="text-xs text-danger-dark">{errors.rewardItemCode}</p>}
          {form.rewardItemCode && numericInput('rewardItemFallbackCoin', 'Coin dự phòng', 'Người học nhận số Coin này thay vật phẩm khi đã sở hữu vật phẩm trang trí, booster đã đạt số lượng tối đa, hoặc vật phẩm còn là bản nháp lúc nhận thưởng. Nhập 0 nếu không bù Coin.', 0, 2147483647, <CoinIcon size={16} />)}
        </section>
        <section className="space-y-2 px-5 py-3">
          <SectionLabel>Điều kiện cấp</SectionLabel>
          <p className="text-sm font-semibold">{eligibilityLabels[form.eligibilityRule]}</p>
          <p className="text-xs text-text-muted">{eligibilityHints[form.eligibilityRule]} Điều kiện cấp ảnh hưởng việc nhiệm vụ được chọn, không bảo đảm điều kiện hoàn thành. Giá trị theo mẫu hành động.</p>
        </section>
        <details className="px-5 pb-5 pt-3"><summary className="cursor-pointer text-xs font-semibold text-text-muted">Cấu hình nâng cao</summary><div className="mt-3 space-y-3">{numericInput('weight', 'Trọng số', 'Trọng số tương đối trong pool từng slot; không phải phần trăm được cấp.', 1)}<p className="break-all text-xs text-text-muted">Mã kỹ thuật: <span className="font-mono">{form.category} / {form.triggerEvent} / {form.eligibilityRule}</span></p></div></details>
      </fieldset>

      {/* RIGHT RAIL — learner preview, catalog impact, lifecycle */}
      <aside className="space-y-4 xl:sticky xl:top-20">
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <SectionLabel>Xem trước trên ứng dụng</SectionLabel>
          <div className="rounded-lg bg-[#F7F8FA] p-3"><MissionCard mission={{ ...form, targetValue: Number(form.targetValue) || 0, rewardCoin: Number(form.rewardCoin) || 0, rewardXp: Number(form.rewardXp) || 0 }} /></div>
          <p className="text-xs text-text-muted">Hoàn thành khi: <span className="font-semibold text-text">{objectiveText}</span></p>
        </div>
        <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
          <SectionLabel>Tác động lên bộ 5 nhiệm vụ</SectionLabel>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-text-muted">Vị trí</dt>
            <dd>{slotIndex >= 0 ? `Slot ${slotIndex + 1} · ${SLOTS[slotIndex].label}` : '—'}{isCore(form.category) && fallbackSlots.length > 0 && <span className="text-text-muted">; nhóm cốt lõi còn lấp slot {fallbackSlots.join(', ')} (chưa có mẫu riêng)</span>}</dd>
            <dt className="text-text-muted">Cấp cho</dt>
            <dd>{form.eligibilityRule === 'NONE' ? 'Mọi người học' : `Chỉ người học ${eligibilityLabels[form.eligibilityRule].toLowerCase()}`}</dd>
            <dt className="text-text-muted">Thưởng/ngày</dt>
            <dd>{!list.data ? <span className="text-text-muted">{list.isError ? 'Không tải được catalog để tính.' : 'Đang tính…'}</span>
              : <><span className="tabular-nums">{band(before)}</span>{afterView && band(afterView) !== band(before) && <> → <strong className="tabular-nums">{band(afterView)}</strong></>}<span className="block text-text-muted">{original?.isActive ? 'Sau khi lưu' : 'Nếu bật nhiệm vụ này'}{afterView && band(afterView) === band(before) ? ': không đổi' : ''}</span></>}</dd>
          </dl>
          {afterCurrentTop > MAX_COIN_PER_DAY && <p role="status" className="flex gap-1.5 rounded-md border border-warning/40 bg-warning-light px-2 py-1.5 text-warning-dark"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Vượt {MAX_COIN_PER_DAY} Coin/ngày, mức kinh tế đã duyệt; Cửa hàng đang quy giá ra ngày theo mức này. Gợi ý để rà lại, không chặn lưu.</span></p>}
          {afterView?.insufficient && !before?.insufficient && <p role="status" className="flex gap-1.5 rounded-md border border-danger/30 bg-danger-light px-2 py-1.5 text-danger-dark"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Sau thay đổi, một số người học không đủ 5 nhiệm vụ. Backend sẽ từ chối khi bật hoặc lưu.</span></p>}
        </div>
        {original && <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
          <SectionLabel>Vòng đời</SectionLabel>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-text-muted">Tạo</dt><dd className="tabular-nums">{formatVnDateTime(original.createdAt)}</dd>
            <dt className="text-text-muted">Sửa gần nhất</dt><dd className="tabular-nums">{formatVnDateTime(original.updatedAt)}, phiên bản {original.version}</dd>
            <dt className="text-text-muted">ID</dt><dd className="tabular-nums">{original.id}</dd>
          </dl>
          <p className="border-t border-border pt-2 text-text-muted">
            Chưa có nhật ký ai sửa gì: cần audit log phía máy chủ.
            {auditUsesFixtures && <> <TextLink to={historyPath({ type: 'MISSION_TEMPLATE', id: String(original.id) })}>Xem nhật ký mẫu</TextLink></>}
          </p>
        </div>}
      </aside>
    </div>
    {confirm === 'leave' && <ConfirmModal title="Rời trang chưa lưu?" maxWidth="lg" busy={busy} onClose={closeConfirm} onConfirm={() => onBack()} confirmLabel="Bỏ thay đổi và quay lại"><p>Nội dung đang nhập sẽ bị bỏ.</p></ConfirmModal>}
    {confirm === 'reload' && server && <ConfirmModal title="So sánh với bản trên server" maxWidth="lg" busy={busy} onClose={closeConfirm} onConfirm={() => { load(server); closeConfirm(); }} confirmLabel="Dùng bản server, bỏ nội dung đang nhập">
      <p className="text-xs text-text-muted">Bản đang sửa: phiên bản {original?.version} · Server: phiên bản {server.version}{server.isActive !== original?.isActive && ` · trạng thái server: ${server.isActive ? 'Đang bật' : 'Đang tắt'}`}</p>
      {diff.length ? <div className="max-h-72 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="bg-surface-subtle text-text-muted"><tr><th className="px-3 py-2">Trường</th><th className="px-3 py-2">Đang nhập</th><th className="px-3 py-2">Server</th></tr></thead><tbody className="divide-y divide-border">{diff.map(d => <tr key={d.key}><td className="px-3 py-2 font-semibold">{d.label}</td><td className="break-words px-3 py-2">{d.draft}</td><td className="break-words px-3 py-2">{d.server}</td></tr>)}</tbody></table></div>
        : <p>Nội dung đang nhập trùng bản trên server; chỉ cập nhật phiên bản.</p>}
      <p className="text-xs text-text-muted">Muốn giữ phần của mình: đóng hộp thoại, chép lại các giá trị cần giữ, rồi dùng bản server và nhập lại.</p>
    </ConfirmModal>}
  </div>;
}
