import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Lock, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { ApiClientError } from '../../lib/api-client';
import { createMissionTemplate, getMissionTemplate, getMissionTemplates, patchTemplate } from '../../domains/admin-missions/api';
import { categoryLabels, createPayload, eligibilityHints, eligibilityLabels, emptyForm, formDiff, matchPreset, objective, poolShortage, presets, savePayload, supportedPreset, toForm, validateForm } from '../../domains/admin-missions/mappers';
import { missionKeys, useMissionTemplate } from '../../domains/admin-missions/queries';
import type { MissionForm, MissionTemplate } from '../../domains/admin-missions/types';
import { ActiveBadge, ConfirmModal, ErrorBanner, Field } from './components';
import { categoryIcons, errorMessage, inputClass, isApiError } from './ui';
import { RewardItemLabel, RewardItemPicker } from './RewardItemPicker';
import { adminShopKeys } from '../../domains/shop/queries';

interface EditorProps {
  id?: number; onBack: (notice?: string) => void; onSaved: (item: MissionTemplate) => void;
  onActivate: (item: MissionTemplate) => void; onDirtyChange: (dirty: boolean) => void;
}
export function MissionEditor(props: EditorProps) {
  const detail = useMissionTemplate(props.id);
  if (props.id && !detail.data) return <div className="space-y-4"><Button size="sm" onClick={() => props.onBack()}><ArrowLeft size={14} />Danh sách</Button>{detail.isPending ? <div role="status" className="animate-pulse rounded-xl bg-surface-subtle p-12">Đang tải template…</div> : <ErrorBanner message={errorMessage(detail.error)}><Button size="sm" onClick={() => void detail.refetch()}>Thử lại</Button></ErrorBanner>}</div>;
  return <MissionEditorForm {...props} initial={detail.data} fresh={detail.data} refreshFailed={detail.isError} onRefresh={() => void detail.refetch()} />;
}
interface FormProps extends EditorProps { initial?: MissionTemplate; fresh?: MissionTemplate; refreshFailed: boolean; onRefresh: () => void }
function MissionEditorForm({ initial, fresh, refreshFailed, onRefresh, onBack, onSaved, onActivate, onDirtyChange }: FormProps) {
  const client = useQueryClient();
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
        if (e.code === 'REWARD_ITEM_NOT_ELIGIBLE') { setErrors(x => ({ ...x, rewardItemCode: 'Chọn item PUBLISHED hợp lệ.' })); void client.invalidateQueries({ queryKey: adminShopKeys.all }); }
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
        else { setUncertain(false); setError('Chưa tìm thấy mã trên server. Có thể tạo lại; backend vẫn kiểm tra mã trùng.'); }
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
  const CategoryIcon = categoryIcons[form.category];
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
  const numericInput = (key: 'targetValue' | 'rewardCoin' | 'rewardXp' | 'weight' | 'minQuizAccuracyPercent' | 'rewardItemFallbackCoin', label: string, hint?: string, min = 0, max = 2147483647) => <Field label={label} error={errors[key]} hint={hint} required={key !== 'minQuizAccuracyPercent'}><input className={inputClass} type="number" step={1} min={min} max={max} value={form[key]} onChange={e => change(key, e.target.value)} /></Field>;
  return <div ref={root} className="space-y-4">
    <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6"><div className="flex items-center gap-3"><Button size="sm" disabled={busy} onClick={() => dirty ? setConfirm('leave') : onBack()} aria-label="Quay lại danh sách"><ArrowLeft size={16} /></Button><div><h1 className="text-xl font-extrabold tracking-tight">{original ? form.name || 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ'}</h1><div className="mt-1 flex items-center gap-2 text-xs text-text-muted"><ActiveBadge active={original?.isActive ?? false} />{original ? `Phiên bản ${original.version}` : 'Tạo mới luôn ở trạng thái Tắt'}</div></div></div>
      <div className="flex gap-2">{original && <Button size="sm" disabled={busy || dirty || conflict || uncertain || (!original.isActive && !supported)} onClick={() => onActivate(original)}>{original.isActive ? 'Tắt nhiệm vụ' : 'Bật nhiệm vụ'}</Button>}<Button size="sm" variant="primary" disabled={busy || conflict || uncertain || (!!original && !dirty)} onClick={() => void save()}><Save size={14} />{busy ? 'Đang lưu…' : original ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button></div>
    </div>
    <p className="text-xs text-text-muted">Thay đổi áp dụng cho các bộ nhiệm vụ được cấp sau khi lưu, kể cả người học chưa nhận bộ hôm nay. Bộ đã cấp giữ nguyên.{dirty && ' Có thay đổi chưa lưu: lưu thành công trước khi bật/tắt.'}</p>
    {stale && dirty && !conflict && <ErrorBanner message={`Server đã có phiên bản ${fresh!.version}; bản đang sửa là ${original!.version}. Lưu sẽ bị từ chối do xung đột. Nội dung đang nhập vẫn được giữ.`}><Button size="sm" disabled={busy} onClick={() => void compareServer()}>So sánh với bản mới</Button></ErrorBanner>}
    {refreshFailed && <ErrorBanner message="Không làm mới được dữ liệu template; đang hiển thị bản đã tải trước đó."><Button size="sm" disabled={busy} onClick={onRefresh}>Thử lại</Button></ErrorBanner>}
    {error && <ErrorBanner message={error}>{uncertain && <Button size="sm" disabled={busy} onClick={() => void reconcile()}>Kiểm tra kết quả trên server</Button>}{conflict && <Button size="sm" disabled={busy} onClick={() => void compareServer()}>So sánh với bản mới</Button>}</ErrorBanner>}
    {!supported && <ErrorBanner message="Mapping của template này chưa được UI MVP hỗ trợ. Không tự chuyển enum; cần xác minh producer trước khi bật." />}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <fieldset disabled={busy || conflict || uncertain} className="min-w-0 space-y-4">
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card"><div className="flex items-baseline justify-between gap-2"><h2 className="text-sm font-bold">Thông tin nhiệm vụ</h2><p className="text-[11px] text-text-muted"><span aria-hidden="true" className="text-danger-dark">*</span> Bắt buộc</p></div>
          <Field label="Mã nhiệm vụ" error={errors.code} hint={original ? 'Mã bất biến sau khi tạo.' : `${form.code.length}/64 ký tự`} required addon={original && <span className="absolute right-2 top-1.5 flex items-center gap-1 text-text-muted"><Lock size={14} /><button type="button" aria-label="Sao chép mã" title="Sao chép mã" className="rounded p-1 hover:bg-surface" onClick={() => void navigator.clipboard?.writeText(original.code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })}>{copied ? <Check size={14} className="text-primary-dark" /> : <Copy size={14} />}</button></span>}><input maxLength={64} className={`${inputClass} ${original ? '!pr-16' : ''}`} disabled={!!original} value={form.code} onChange={e => change('code', e.target.value)} /></Field>
          <Field label="Tên hiển thị" error={errors.name} hint={`${form.name.length}/100 ký tự`} required><input maxLength={100} className={inputClass} value={form.name} onChange={e => change('name', e.target.value)} /></Field>
          <Field label="Mô tả" error={errors.description} hint={`${form.description.length}/255 ký tự`} required><textarea maxLength={255} rows={3} className={inputClass} value={form.description} onChange={e => change('description', e.target.value)} /></Field>
        </section>
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="text-sm font-bold">Hành động và mục tiêu</h2>
          <Field label="Mẫu hành động" hint={presetNote || 'Đổi mẫu sẽ đặt lại mục tiêu và bộ lọc quiz theo mẫu mới.'}><select className={inputClass} value={selectedPreset?.key ?? (supported ? 'CUSTOM' : '')} disabled={!supported} onChange={e => choosePreset(e.target.value)}>
            {!supported && <option value="">Mapping chưa hỗ trợ</option>}{supported && !selectedPreset && <option value="CUSTOM" disabled>Quiz tùy chỉnh</option>}{presets.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></Field>
          <p className="text-xs text-text-muted">Nhóm: {categoryLabels[form.category]}</p>
          {numericInput('targetValue', `Mục tiêu (${supported?.unit ?? 'lần'})`, undefined, 1)}
          {form.triggerEvent === 'QUIZ_COMPLETED' && <div className="grid gap-3 sm:grid-cols-2"><Field label="Số câu của quiz" error={errors.quizRequestedCount}><select className={inputClass} value={form.quizRequestedCount} onChange={e => change('quizRequestedCount', e.target.value)}><option value="">Không lọc số câu</option>{[5, 10, 20].map(n => <option key={n} value={n}>{n} câu</option>)}</select></Field>{numericInput('minQuizAccuracyPercent', 'Độ chính xác tối thiểu (%)', 'Để trống nếu không lọc độ chính xác.', 1, 100)}</div>}
          {form.triggerEvent === 'QUIZ_COMPLETED' && <p className="rounded-lg bg-info-light p-3 text-xs text-text-muted">Không có điều kiện cấp không bảo đảm learner có đủ nội dung để làm quiz 5/10/20 câu.</p>}
          {form.triggerEvent === 'TOPIC_ITEM_CREATED' && <p className="rounded-lg bg-info-light p-3 text-xs text-text-muted">Chỉ tính từ người học tự thêm vào topic của mình (không tính fork/import), có đủ từ và bản dịch để dùng cho quiz, và chưa từng được tính trước đây. Mỗi từ chỉ tăng một nhiệm vụ thêm từ, kể cả khi bộ hôm nay có nhiều nhiệm vụ loại này.</p>}
          {form.triggerEvent === 'BOOSTER_USED' && <p className="text-xs text-text-muted">Đếm lần kích hoạt booster thành công, không đếm lượt mua.</p>}
          {form.triggerEvent === 'LEARNING_ACTIVITY_RECORDED' && <p className="text-xs text-text-muted">Đếm hoạt động học trong ngày, không phải số ngày streak. Hiện luồng quiz ghi nhận learning event.</p>}
        </section>
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="text-sm font-bold">Phần thưởng</h2><div className="grid gap-3 sm:grid-cols-2">{numericInput('rewardCoin', 'Coin')}{numericInput('rewardXp', 'XP', 'XP thưởng nhiệm vụ không được booster nhân.')}</div>
          <RewardItemPicker value={form.rewardItemCode} savedCode={original?.rewardItemCode} disabled={busy || conflict || uncertain} onChange={code => setForm(f => ({ ...f, rewardItemCode: code, rewardItemFallbackCoin: code ? f.rewardItemFallbackCoin : '' }))} />
          {errors.rewardItemCode && <p role="alert" className="text-xs text-danger-dark">{errors.rewardItemCode}</p>}
          {form.rewardItemCode && numericInput('rewardItemFallbackCoin', 'Coin dự phòng', 'Người học nhận số Coin này thay item khi đã sở hữu vật phẩm trang trí, booster đã đạt số lượng tối đa, hoặc item đang DRAFT lúc nhận thưởng. Nhập 0 nếu không bù Coin.')}
        </section>
        <section className="space-y-2 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="text-sm font-bold">Điều kiện cấp</h2><p className="text-sm font-semibold">{eligibilityLabels[form.eligibilityRule]}</p><p className="text-xs text-text-muted">{eligibilityHints[form.eligibilityRule]} Điều kiện cấp ảnh hưởng việc nhiệm vụ được chọn, không bảo đảm điều kiện hoàn thành. Giá trị theo mẫu hành động.</p></section>
        <details className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer text-sm font-bold">Cấu hình nâng cao</summary><div className="mt-4 space-y-3">{numericInput('weight', 'Trọng số', 'Trọng số tương đối trong pool từng slot; không phải phần trăm được cấp.', 1)}<p className="break-all text-xs text-text-muted">{form.category} / {form.triggerEvent} / {form.eligibilityRule}</p></div></details>
      </fieldset>
      <aside className="space-y-4 lg:sticky lg:top-20"><div className="rounded-xl border border-border bg-surface p-4 shadow-card"><p className="mb-4 text-xs font-bold text-text-muted">XEM TRƯỚC NỘI DUNG</p><div className="mb-3 flex items-center gap-2"><span className="rounded-xl bg-primary-light p-2 text-primary-dark"><CategoryIcon size={20} /></span><h2 className="font-bold">{form.name || 'Tên nhiệm vụ'}</h2></div><p className="break-words text-sm text-text-muted">{form.description || 'Mô tả nhiệm vụ sẽ hiển thị ở đây.'}</p><p className="mt-3 text-xs">{objectiveText}</p><div className="mt-4 rounded-lg bg-reward-light p-3 text-xs font-bold">{form.rewardCoin || '0'} Coin · {form.rewardXp || '0'} XP{form.rewardItemCode && <p className="mt-1"><RewardItemLabel code={form.rewardItemCode} /></p>}</div></div>
      </aside>
    </div>
    {confirm === 'leave' && <ConfirmModal title="Rời trang chưa lưu?" busy={busy} onClose={closeConfirm} onConfirm={() => onBack()} confirmLabel="Bỏ thay đổi và quay lại"><p>Nội dung đang nhập sẽ bị bỏ.</p></ConfirmModal>}
    {confirm === 'reload' && server && <ConfirmModal title="So sánh với bản trên server" busy={busy} onClose={closeConfirm} onConfirm={() => { load(server); closeConfirm(); }} confirmLabel="Dùng bản server, bỏ nội dung đang nhập">
      <p className="text-xs text-text-muted">Bản đang sửa: phiên bản {original?.version} · Server: phiên bản {server.version}{server.isActive !== original?.isActive && ` · trạng thái server: ${server.isActive ? 'Đang bật' : 'Đang tắt'}`}</p>
      {diff.length ? <div className="max-h-72 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="bg-surface-subtle text-text-muted"><tr><th className="px-3 py-2">Trường</th><th className="px-3 py-2">Đang nhập</th><th className="px-3 py-2">Server</th></tr></thead><tbody className="divide-y divide-border">{diff.map(d => <tr key={d.key}><td className="px-3 py-2 font-semibold">{d.label}</td><td className="break-words px-3 py-2">{d.draft}</td><td className="break-words px-3 py-2">{d.server}</td></tr>)}</tbody></table></div>
        : <p>Nội dung đang nhập trùng bản trên server; chỉ cập nhật phiên bản.</p>}
      <p className="text-xs text-text-muted">Muốn giữ phần của mình: đóng hộp thoại, chép lại các giá trị cần giữ, rồi dùng bản server và nhập lại.</p>
    </ConfirmModal>}
  </div>;
}
