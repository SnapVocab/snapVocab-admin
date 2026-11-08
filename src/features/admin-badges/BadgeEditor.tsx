import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Copy, Lock, RefreshCw, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, ConfirmModal, Field, SectionLabel, fieldControl } from '../../components/ui';
import { getAdminBadge, patchAdminBadge } from '../../domains/admin-badges/api';
import {
  EMBLEM_LABELS, applyForm, contentPatch, formatCount, groupCatalog, isKnownEmblem, metricInfo, previewShelf, reviewIssues,
  REWARD_MAX, rewardLabel, ruleSentence, statusReason, toForm, validateBadgeForm,
} from '../../domains/admin-badges/catalog';
import { badgeKeys } from '../../domains/admin-badges/queries';
import type { AdminBadge, BadgeForm } from '../../domains/admin-badges/types';
import { formatShopItemTypeLabel, formatVnDateTime } from '../../domains/shop/mappers';
import { ApiClientError } from '../../lib/api-client';
import { cn } from '../../lib/utils';
import { ErrorBanner } from '../admin-missions/components';
import { RewardItemPicker } from '../admin-missions/RewardItemPicker';
import { TargetHistory } from '../activity-log/TargetHistory';
import { BadgeArtifact } from './BadgeArtifact';
import { badgeArt } from './badgeArt';
import { badgeErrorMessage } from './ui';

const FIELD_LABEL: Record<keyof BadgeForm, string> = {
  name: 'Tên', description: 'Mô tả', iconKey: 'Biểu tượng', sortOrder: 'Thứ tự', rewardCoin: 'Coin thưởng', rewardXp: 'XP thưởng',
  rewardItemCode: 'Vật phẩm thưởng',
};
const shown = (f: BadgeForm, k: keyof BadgeForm) => (k === 'iconKey' ? EMBLEM_LABELS[f.iconKey] ?? f.iconKey : f[k] ?? 'Không có');

/** Shelf position on the Thành tựu screen once this badge is on (series ordered by min(sortOrder), UI-BDG-07). */
function shelfRank(all: AdminBadge[], b: AdminBadge) {
  const shelves = groupCatalog(all.map((x) => (x.id === b.id ? { ...b, isActive: true } : x)).filter((x) => x.isActive));
  return { at: shelves.findIndex((g) => g.metric === b.metric) + 1, of: shelves.length };
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="m-0 min-w-0 break-words text-body">{children}</dd>
  </div>
);

interface EditorProps {
  badge: AdminBadge;
  /** Whole catalog with this badge's latest detail merged in: drives the shelf preview and the shelf order. */
  all: AdminBadge[];
  /** P2 controls (MOCK until PATCH ships, config.ts); false = the P1 read-only view. */
  editable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: (notice?: string) => void;
  onSaved: (b: AdminBadge) => void;
  onToggle: (b: AdminBadge) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * One badge in the builder layout (design.md §5.5): what earns it (locked), what learners read (P2: editable), its
 * shelf order; right rail = the app preview, who a change reaches, lifecycle. Code, metric and threshold never change.
 */
export function BadgeEditor({ badge, all, editable, refreshing, onRefresh, onBack, onSaved, onToggle, onDirtyChange }: EditorProps) {
  const client = useQueryClient();
  const [original, setOriginal] = useState(badge);
  const [form, setForm] = useState(() => toForm(badge));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toForm(badge)));
  const [errors, setErrors] = useState<Partial<Record<keyof BadgeForm, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'reload' | null>(null);
  const [server, setServer] = useState<AdminBadge | null>(null);
  const [copied, setCopied] = useState(false);
  const flight = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(form) !== baseline;

  function load(b: AdminBadge) {
    const next = toForm(b);
    setOriginal(b); setForm(next); setBaseline(JSON.stringify(next));
    setErrors({}); setError(''); setConflict(false); setUncertain(false);
  }
  // Read-only (P1) always shows the latest GET. Editing: a refetch or a Bật/Tắt brought a newer version; adopt it while
  // the form is clean, otherwise say so before Save fails.
  const stale = badge.id === original.id && (badge.version ?? 0) > (original.version ?? 0);
  const adopt = editable ? (stale || badge.isActive !== original.isActive) && !dirty && !busy && !conflict && !uncertain : badge !== original;
  if (adopt) load(badge); // adjust state during render; false again right after

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [badge.id]);
  useEffect(() => { onDirtyChange(dirty || busy); return () => onDirtyChange(false); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);

  const draft = editable ? applyForm(original, form) : original;
  const info = metricInfo(original.metric);
  const shelf = previewShelf(all.map((x) => (x.id === draft.id ? draft : x)), draft);
  // Illustrated art replaces the drawn emblem, so its icon is neither shown nor validated.
  const hasArt = !!badgeArt(original.code);
  const rankNow = shelfRank(all, original);
  const rankDraft = shelfRank(all, draft);
  const reason = statusReason(original);
  const thresholdMissing = reviewIssues(draft).some((t) => t.startsWith('Mô tả'));
  // PD-BDG-14: the last milestone of a series pays a frame + XP; earlier ones pay Coin + XP.
  const lastTier = shelf.length > 1 && shelf[shelf.length - 1].id === draft.id;

  const change = (key: keyof BadgeForm, value: string) => { setForm((f) => ({ ...f, [key]: value })); setErrors((e) => ({ ...e, [key]: undefined })); };
  const focusInvalid = () => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  const copyCode = () => void navigator.clipboard?.writeText(original.code)
    .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })
    .catch(() => undefined);
  const missing = (e: unknown) => {
    if (!(e instanceof ApiClientError) || e.code !== 'BADGE_NOT_FOUND') return false;
    void client.invalidateQueries({ queryKey: badgeKeys.list });
    onBack(badgeErrorMessage(e));
    return true;
  };

  async function save() {
    if (flight.current || conflict || uncertain) return;
    const invalid = validateBadgeForm(form);
    if (hasArt) delete invalid.iconKey;
    setErrors(invalid);
    if (Object.keys(invalid).length) { setError('Kiểm tra các trường được đánh dấu trước khi lưu.'); focusInvalid(); return; }
    const patch = contentPatch(original, form);
    if (!patch) { load(original); return; }
    flight.current = true; setBusy(true); setError('');
    try {
      const next = await patchAdminBadge(original.id, patch);
      load(next);
      client.setQueryData(badgeKeys.detail(next.id), next);
      void client.invalidateQueries({ queryKey: badgeKeys.list });
      onSaved(next);
    } catch (e) {
      if (missing(e)) return;
      setError(badgeErrorMessage(e));
      if (e instanceof ApiClientError) { setErrors(e.fieldErrors); setConflict(e.code === 'VERSION_CONFLICT'); focusInvalid(); }
      if (!(e instanceof ApiClientError) || e.statusCode >= 500 || e.statusCode === 0) {
        setUncertain(true);
        setError('Chưa xác định được kết quả lưu. Nội dung đang nhập được giữ nguyên; kiểm tra trên máy chủ trước khi gửi lại.');
      }
    } finally { flight.current = false; setBusy(false); }
  }

  /** After a lost response: never resend blindly (design.md §5.9). */
  async function reconcile() {
    if (flight.current) return;
    flight.current = true; setBusy(true);
    try {
      const current = await getAdminBadge(original.id);
      client.setQueryData(badgeKeys.detail(current.id), current);
      if (!contentPatch(current, form)) { load(current); onSaved(current); }
      else if (current.version !== original.version) { setUncertain(false); setConflict(true); setError(badgeErrorMessage(new ApiClientError('', 'VERSION_CONFLICT', 409, { currentVersion: current.version ?? undefined }))); }
      else { setUncertain(false); setError('Máy chủ chưa ghi nhận thay đổi. Có thể lưu lại.'); }
    } catch (e) { if (!missing(e)) setError(badgeErrorMessage(e)); }
    finally { flight.current = false; setBusy(false); }
  }

  async function compare() {
    if (flight.current) return;
    flight.current = true; setBusy(true);
    try { setServer(await getAdminBadge(original.id)); setConfirm('reload'); }
    catch (e) { if (!missing(e)) setError(badgeErrorMessage(e)); }
    finally { flight.current = false; setBusy(false); }
  }
  const diff = server ? (Object.keys(FIELD_LABEL) as (keyof BadgeForm)[]).filter((k) => shown(form, k) !== shown(toForm(server), k)) : [];

  return (
    <div ref={root} className="space-y-4">
      {/* STICKY HEADER — back, name, state, version; the one primary action is Lưu */}
      <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button disabled={busy} icon={<ArrowLeft />} label="Quay lại danh sách" onClick={() => (dirty ? setConfirm('leave') : onBack())} />
          <BadgeArtifact code={draft.code} metric={draft.metric} iconKey={draft.iconKey} size={40} />
          <div className="min-w-0">
            <h1 ref={heading} tabIndex={-1} className="flex items-center gap-2.5 text-xl font-semibold tracking-tight focus:outline-none">
              <span className="truncate">{draft.name}</span>
              {!original.isActive && <Badge tone="neutral">Đang tắt</Badge>}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted" aria-live="polite">
              <span className="font-mono">{original.code}</span>
              {original.version !== null && <span>Phiên bản {original.version}</span>}
              {reason && <span>{reason}</span>}
              {dirty && <Badge tone="warning">Có thay đổi chưa lưu</Badge>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw />} label="Làm mới" loading={refreshing} disabled={busy} onClick={onRefresh} />
          {editable && <>
            <Button disabled={busy || dirty || conflict || uncertain} title={dirty ? 'Lưu hoặc bỏ thay đổi trước khi bật/tắt' : undefined} onClick={() => onToggle(original)}>
              {original.isActive ? 'Tắt huy hiệu' : 'Bật huy hiệu'}
            </Button>
            <Button variant="primary" icon={<Save />} loading={busy} disabled={!dirty || conflict || uncertain} onClick={() => void save()}>Lưu thay đổi</Button>
          </>}
        </div>
      </div>

      {editable && <p className="text-xs text-text-muted">Sửa nội dung áp dụng cho cả người đã đạt khi ứng dụng tải lại; ngày đạt giữ nguyên và không hiện thông báo huy hiệu mới.{dirty && ' Lưu trước khi bật/tắt.'}</p>}
      {stale && dirty && !conflict && <ErrorBanner message={`Máy chủ đã có phiên bản ${badge.version}; bản đang sửa là ${original.version}. Lưu sẽ bị từ chối. Nội dung đang nhập vẫn được giữ.`}><Button size="sm" disabled={busy} onClick={() => void compare()}>So sánh với bản mới</Button></ErrorBanner>}
      {error && <ErrorBanner message={error}>
        {uncertain && <Button size="sm" disabled={busy} onClick={() => void reconcile()}>Kiểm tra trên máy chủ</Button>}
        {conflict && <Button size="sm" disabled={busy} onClick={() => void compare()}>So sánh với bản mới</Button>}
      </ErrorBanner>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* BUILDER — locked condition, what learners read, order */}
        <fieldset disabled={busy || conflict || uncertain} className="min-w-0 rounded-lg border border-border bg-surface">
          <section className="space-y-3 px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex-1"><SectionLabel>Điều kiện đạt</SectionLabel></div>
              <span className="flex items-center gap-1 text-xs text-text-muted"><Lock size={12} />Khóa sau khi tạo</span>
            </div>
            <p className="text-base font-semibold">{ruleSentence(original)}</p>
            <dl className="m-0 space-y-2">
              <Row label="Chuỗi">{info?.title ?? 'Chỉ số chưa hỗ trợ'}<span className="ml-2 font-mono text-2xs text-text-light">{original.metric}</span></Row>
              <Row label="Ngưỡng"><span className="tabular-nums">≥ {formatCount(original.threshold)}{info ? ` ${info.unit}` : ''}</span></Row>
              <Row label="Mã">
                <span className="inline-flex items-center gap-1"><span className="font-mono text-xs">{original.code}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6" icon={copied ? <Check /> : <Copy />} label="Sao chép mã" onClick={copyCode} />
                </span>
              </Row>
              <Row label="Cách đếm">{info ? <span className="text-text-muted">{info.rule}</span> : <span className="text-warning-dark">Admin chưa có tên chuỗi, đơn vị và cách đếm cho chỉ số “{original.metric}”; huy hiệu chỉ xem được.</span>}</Row>
            </dl>
            <p className="text-xs text-text-muted">Muốn đổi ngưỡng thì thêm mốc mới rồi tắt mốc cũ: người đã có mốc cũ vẫn giữ nó và có thể nhận thêm mốc mới.</p>
          </section>

          <section className="space-y-4 border-t border-border px-5 py-4">
            <SectionLabel>Hiển thị cho người học</SectionLabel>
            {editable ? <>
              <Field label="Tên" required error={errors.name} hint={`${form.name.trim().length}/100 ký tự`}>
                <input className={fieldControl} maxLength={100} value={form.name} onChange={(e) => change('name', e.target.value)} />
              </Field>
              <Field label="Mô tả, câu điều kiện người học đọc" required error={errors.description} hint={`${form.description.trim().length}/255 ký tự. Giữ đúng ý nghĩa và điều kiện thật của huy hiệu.`}>
                <textarea rows={2} maxLength={255} className={fieldControl} value={form.description} onChange={(e) => change('description', e.target.value)} />
              </Field>
              {thresholdMissing && (
                <p role="status" className="flex gap-1.5 rounded-md border border-warning/40 bg-warning-light px-2 py-1.5 text-xs text-warning-dark">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>Mô tả không nêu ngưỡng {formatCount(original.threshold)}, người học có thể hiểu sai điều kiện. Gợi ý để rà lại, không chặn lưu.</span>
                </p>
              )}
              {!hasArt && <IconPicker value={form.iconKey} metric={original.metric} error={errors.iconKey} onChange={(key) => change('iconKey', key)} />}
            </> : (
              <dl className="m-0 space-y-3">
                <Row label="Tên">{original.name}</Row>
                <Row label="Mô tả">{original.description}</Row>
                {!hasArt && <Row label="Biểu tượng">
                  {isKnownEmblem(original.iconKey) ? EMBLEM_LABELS[original.iconKey] : 'Không có trong ứng dụng'}
                  <span className="ml-2 font-mono text-2xs text-text-light">{original.iconKey}</span>
                  {!isKnownEmblem(original.iconKey) && <span className="mt-1 block text-xs text-warning-dark">Người học thấy huy chương mặc định vì ứng dụng không có biểu tượng “{original.iconKey}”.</span>}
                </Row>}
              </dl>
            )}
          </section>

          <section className="space-y-3 border-t border-border px-5 py-4">
            <SectionLabel>Phần thưởng</SectionLabel>
            <p className="text-xs text-text-muted">Cộng một lần khi người học nhận huy hiệu. Đổi phần thưởng chỉ áp dụng cho người nhận sau khi lưu; người đã nhận giữ phần thưởng cũ, không cộng bù. XP này không tính vào bảng xếp hạng.</p>
            {editable ? <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Coin" error={errors.rewardCoin} hint={`0–${formatCount(REWARD_MAX)}`}>
                  <input type="number" min={0} max={REWARD_MAX} step={1} className={fieldControl} value={form.rewardCoin} onChange={(e) => change('rewardCoin', e.target.value)} />
                </Field>
                <Field label="XP" error={errors.rewardXp} hint={`0–${formatCount(REWARD_MAX)}, không nhân Booster`}>
                  <input type="number" min={0} max={REWARD_MAX} step={1} className={fieldControl} value={form.rewardXp} onChange={(e) => change('rewardXp', e.target.value)} />
                </Field>
              </div>
              {lastTier && !form.rewardItemCode && <p role="status" className="text-xs text-warning-dark">Mốc cuối của chuỗi: theo quy ước thưởng 1 khung (avatar hoặc thẻ) cùng XP.</p>}
              <RewardItemPicker value={form.rewardItemCode} savedCode={original.rewardItemCode} types={['AVATAR_FRAME', 'CARD_FRAME']} unsold
                savedHint="khung đã lưu trữ vẫn được cấp cho người đạt huy hiệu; chọn khung khác thì cần khung đã phát hành."
                onChange={(code) => { setForm((f) => ({ ...f, rewardItemCode: code })); setErrors((e) => ({ ...e, rewardItemCode: undefined })); }} />
              {errors.rewardItemCode && <p role="alert" className="text-xs text-danger-dark">{errors.rewardItemCode}</p>}
            </> : <p className="text-body">{rewardLabel(original)}</p>}
          </section>

          <section className="space-y-2 border-t border-border px-5 pb-5 pt-4">
            <SectionLabel>Thứ tự</SectionLabel>
            {editable
              ? <Field label="Thứ tự hiển thị" error={errors.sortOrder} hint="Số nhỏ nhất của chuỗi quyết định vị trí kệ; số này còn là thứ tự phụ trên Hồ sơ khi nhiều huy hiệu đạt cùng lúc. Trong kệ, mốc luôn xếp theo ngưỡng.">
                <input type="number" step={1} className={cn(fieldControl, 'w-32')} value={form.sortOrder} onChange={(e) => change('sortOrder', e.target.value)} />
              </Field>
              : <p className="text-body tabular-nums">{original.sortOrder}<span className="ml-3 text-xs text-text-muted">Số nhỏ nhất của chuỗi quyết định vị trí kệ; trong kệ, mốc xếp theo ngưỡng.</span></p>}
          </section>
        </fieldset>

        {/* RIGHT RAIL — fixed order: preview → impact → lifecycle */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20" aria-label="Xem trước trên ứng dụng">
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <SectionLabel>Xem trước trên ứng dụng</SectionLabel>
            <p className="text-xs text-text-muted">Thẻ trên lưới Thành tựu</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F7F8FA] p-2">
              <AppCard badge={draft} unit={info?.unit} earned />
              <AppCard badge={draft} unit={info?.unit} />
            </div>
            <p className="text-xs text-text-muted">Màn chi tiết khi chạm vào thẻ (người chưa đạt)</p>
            <div className="grid justify-items-center gap-2 rounded-lg border border-border p-3 text-center">
              <BadgeArtifact code={draft.code} metric={draft.metric} iconKey={draft.iconKey} state="locked" size={88} />
              <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-2xs font-bold uppercase text-neutral-600">Đang khóa</span>
              <p className="text-base font-bold">{draft.name}</p>
              <p className="text-xs text-text-muted">{draft.description}</p>
              {rewardLabel(draft) !== 'Không có' && (
                <div className="w-full rounded-lg border border-border bg-neutral-50 p-2 text-left">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-text-muted">Phần thưởng khi đạt</span><AppRewardChips badge={draft} /></div>
                  {draft.rewardItemCode && <p className="mt-1.5 text-xs"><span className="font-semibold">{draft.rewardItem?.name ?? draft.rewardItemCode}</span>{draft.rewardItem && <span className="text-text-muted"> · {formatShopItemTypeLabel(draft.rewardItem.type)}</span>}</p>}
                </div>
              )}
              <div className="w-full rounded-lg border border-border p-2 text-left">
                <p className="flex justify-between text-xs"><span className="text-text-muted">Tiến độ chinh phục</span><span className="font-semibold tabular-nums">0 / {formatCount(draft.threshold)}{info?.unit ? ` ${info.unit}` : ''}</span></p>
                <div className="mt-1.5 h-2 rounded-full bg-neutral-100" />
              </div>
              {info?.sheetNote && <p className="w-full rounded-md bg-surface-subtle p-2 text-left text-xs text-text-muted">{info.sheetNote}</p>}
            </div>
            <p className="text-xs text-text-muted">Chuỗi “{info?.title ?? draft.metric}” trên lưới, theo thứ tự ngưỡng</p>
            <div className="flex items-end justify-center gap-4 overflow-x-auto rounded-lg bg-surface-subtle px-2 pb-1.5 pt-3">
              {shelf.map((b) => (
                <div key={b.id} className={cn('grid justify-items-center gap-1 text-xs tabular-nums', b.id === draft.id ? 'font-semibold text-text' : 'text-text-muted')}>
                  <BadgeArtifact code={b.code} metric={b.metric} iconKey={b.iconKey} size={40} focused={b.id === draft.id} />
                  {formatCount(b.threshold)}
                </div>
              ))}
            </div>
            {!original.isActive && <p className="text-xs text-text-muted">Người học chưa đạt hiện không thấy huy hiệu này; xem trước là khi huy hiệu được bật.</p>}
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
            <SectionLabel>Tác động</SectionLabel>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-text-muted">Người đã đạt</dt>
              <dd>{original.earnerCount === null ? 'Chưa có số liệu' : <span className="tabular-nums">{formatCount(original.earnerCount)} người</span>}<span className="block text-text-muted">Thấy nội dung mới nhất khi ứng dụng tải lại; vẫn giữ huy hiệu nếu nó bị tắt.</span></dd>
              <dt className="text-text-muted">Người chưa đạt</dt>
              <dd>{original.isActive ? 'Thấy huy hiệu kèm tiến độ; nhận khi đủ ngưỡng và ứng dụng đồng bộ.' : 'Không thấy huy hiệu đang tắt.'}</dd>
              <dt className="text-text-muted">Vị trí</dt>
              <dd>
                {rankDraft.at > 0 ? <>Thứ <span className="tabular-nums">{rankDraft.at}/{rankDraft.of}</span> trên màn Thành tựu{!original.isActive && ' khi bật'}</> : '—'}
                {editable && rankDraft.at !== rankNow.at && <span className="block font-medium text-warning-dark">Đổi từ thứ {rankNow.at} sau khi lưu.</span>}
              </dd>
            </dl>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
            <SectionLabel>Vòng đời</SectionLabel>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-text-muted">Tạo</dt><dd className="tabular-nums">{formatVnDateTime(original.createdAt)}</dd>
              <dt className="text-text-muted">Sửa gần nhất</dt><dd className="tabular-nums">{formatVnDateTime(original.updatedAt)}{original.version !== null && `, phiên bản ${original.version}`}</dd>
              <dt className="text-text-muted">ID</dt><dd className="tabular-nums">{original.id}</dd>
            </dl>
            <TargetHistory target={{ type: 'BADGE', id: String(original.id) }} />
          </div>
        </aside>
      </div>

      {confirm === 'leave' && (
        <ConfirmModal title="Rời trang chưa lưu?" confirmLabel="Bỏ thay đổi và quay lại" onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); onBack(); }}>
          <p>Nội dung đang nhập sẽ bị bỏ.</p>
        </ConfirmModal>
      )}
      {confirm === 'reload' && server && (
        <ConfirmModal title="So sánh với bản trên máy chủ" confirmLabel="Dùng bản máy chủ, bỏ nội dung đang nhập" maxWidth="lg"
          onClose={() => { setConfirm(null); setServer(null); }} onConfirm={() => { client.setQueryData(badgeKeys.detail(server.id), server); load(server); setConfirm(null); setServer(null); }}>
          <p className="text-text-muted">Bản đang sửa: phiên bản {original.version}. Máy chủ: phiên bản {server.version}{server.isActive !== original.isActive && `, ${server.isActive ? 'đang bật' : 'đang tắt'}`}.</p>
          {diff.length ? (
            <table className="w-full text-left text-xs">
              <thead className="text-text-muted"><tr><th className="py-1 pr-3 font-medium">Trường</th><th className="py-1 pr-3 font-medium">Đang nhập</th><th className="py-1 font-medium">Máy chủ</th></tr></thead>
              <tbody className="divide-y divide-border">{diff.map((k) => <tr key={k}><td className="py-1.5 pr-3 font-medium">{FIELD_LABEL[k]}</td><td className="break-words py-1.5 pr-3">{shown(form, k)}</td><td className="break-words py-1.5">{shown(toForm(server), k)}</td></tr>)}</tbody>
            </table>
          ) : <p>Nội dung đang nhập trùng bản trên máy chủ; chỉ phiên bản thay đổi.</p>}
          <p className="text-text-muted">Muốn giữ phần của mình: đóng hộp thoại, chép lại giá trị cần giữ, rồi dùng bản máy chủ và nhập lại.</p>
        </ConfirmModal>
      )}
    </div>
  );
}

/** The five emblems the app can draw (achievements_ui.md §3), shown on this series' medal shape. */
function IconPicker({ value, metric, error, onChange }: { value: string; metric: string; error?: string; onChange: (key: string) => void }) {
  const name = useId();
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-text">Biểu tượng<span aria-hidden className="text-danger-dark"> *</span></legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(EMBLEM_LABELS).map(([key, label]) => (
          <label key={key} className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 pb-1.5 pt-2 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info',
            value === key ? 'border-text bg-surface-subtle font-medium text-text' : 'border-border text-text-muted hover:bg-surface-subtle')}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="sr-only" />
            <BadgeArtifact metric={metric} iconKey={key} size={36} />
            {label}
          </label>
        ))}
      </div>
      {!isKnownEmblem(value) && <p className="text-xs text-warning-dark">Đang dùng “{value}”: ứng dụng không có biểu tượng này nên người học thấy huy chương mặc định. Chọn một biểu tượng ở trên.</p>}
      {error && <p className="text-xs text-danger-dark">{error}</p>}
    </fieldset>
  );
}

const APP_CHIP = 'rounded border px-1 text-2xs font-bold';
const FRAME_CHIP: Record<string, string> = { AVATAR_FRAME: 'Khung avatar', CARD_FRAME: 'Khung thẻ' };

/** The app's reward chips (SnapVocab reward-chips.tsx): Coin, XP, frame type. */
function AppRewardChips({ badge }: { badge: AdminBadge }) {
  return (
    <span className="inline-flex flex-wrap justify-center gap-1">
      {badge.rewardCoin > 0 && <span className={cn(APP_CHIP, 'border-amber-200 bg-amber-50 text-amber-700')}>+{badge.rewardCoin} Coin</span>}
      {badge.rewardXp > 0 && <span className={cn(APP_CHIP, 'border-sky-200 bg-sky-50 text-sky-700')}>+{badge.rewardXp} XP</span>}
      {badge.rewardItemCode && <span className={cn(APP_CHIP, 'border-purple-200 bg-purple-50 text-purple-700')}>{FRAME_CHIP[badge.rewardItem?.type ?? ''] ?? 'Vật phẩm'}</span>}
    </span>
  );
}

/** One card of the app's 2-column achievements grid (SnapVocab achievements-screen.tsx BadgeCard); no rarity (PD-BDG-14). */
function AppCard({ badge, unit, earned = false }: { badge: AdminBadge; unit?: string; earned?: boolean }) {
  return (
    <figure className="m-0 grid justify-items-center gap-1.5 rounded-xl border-2 border-b-4 border-neutral-200 bg-white p-2 text-center">
      <BadgeArtifact code={badge.code} metric={badge.metric} iconKey={badge.iconKey} state={earned ? 'earned' : 'locked'} size={64} />
      <p className="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-text">{badge.name}</p>
      <AppRewardChips badge={badge} />
      {earned
        ? <p className="w-full rounded-md border border-primary/40 bg-primary-light py-0.5 text-2xs font-bold uppercase text-primary-dark">Đã mở khóa</p>
        : (
          <div className="w-full text-left">
            <p className="flex justify-between text-2xs"><span className="text-text-muted">Tiến độ</span><span className="font-semibold tabular-nums">0 / {formatCount(badge.threshold)}</span></p>
            <div className="mt-1 h-1.5 rounded-full bg-neutral-100" />
          </div>
        )}
      <figcaption className="sr-only">{earned ? 'Đã đạt' : `Chưa đạt${unit ? `, ngưỡng ${formatCount(badge.threshold)} ${unit}` : ''}`}</figcaption>
    </figure>
  );
}
