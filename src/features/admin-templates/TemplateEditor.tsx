import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, Columns2, ListPlus, Lock, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, ConfirmModal, Field, SectionLabel, TextLink, fieldControl } from '../../components/ui';
import type { SchemaAttributeDTO, TopicDTO } from '../../domains/admin-content/types';
import { makeDefault, updateTemplate } from '../../domains/admin-templates/api';
import { templatesUseFixtures } from '../../domains/admin-templates/config';
import {
  ALIGN_LABEL, COLOR_PALETTE, QUIZ_ROLES, ROLES, ROLE_LABEL, SIDE_LABEL, addElement, coverageNotes, draftElements, fieldCoverage, modeProblem,
  moveElement, quizChecks, removeElement, renderIssues, sameDraft, toDraft, toUpdate, updateElement, validateDraft, type FieldCoverage,
} from '../../domains/admin-templates/mappers';
import { templateKeys } from '../../domains/admin-templates/queries';
import { FONT_PX, cardSections, findAttribute, fontKey, type FontKey } from '../../domains/admin-templates/render';
import type { Alignment, CardSide, DraftElement, SchemaDTO, SemanticRole, TemplateDTO, TemplateDraft, TemplateFieldDTO } from '../../domains/admin-templates/types';
import { formatVnDateTime } from '../../domains/shop/mappers';
import { cn } from '../../lib/utils';
import { ErrorBanner } from '../admin-missions/components';
import { CardFace, PreviewSource, SideSwitch } from './CardPreview';
import type { PreviewState } from './TemplateLibrary';
import { templateErrorMessage } from './ui';

const n = (v: number) => v.toLocaleString('vi-VN');
const NONE: Record<string, unknown>[] = [];
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="m-0 min-w-0 break-words text-body">{children}</dd>
  </div>
);

interface EditorProps {
  template: TemplateDTO;
  schema: SchemaDTO;
  /** Topics whose Quiz uses this template (`activeTemplateId`). */
  quizTopics: TopicDTO[];
  topicsReady: boolean;
  systemTopics: number;
  /** Learner forks: copies an edit here does not reach. */
  forks: number;
  preview: PreviewState;
  /** Write controls (MOCK until the write API ships, config.ts); false = read-only. */
  editable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onSaved: (message: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * One template in the builder layout (design.md §5.5): name, then each side as the element list the backend stores
 * (sections, column break, fields) with what each field shows on the preview topic; right rail = the app's card,
 * checks (Quiz, display, data), who a change reaches, lifecycle.
 */
export function TemplateEditor({ template, schema, quizTopics, topicsReady, systemTopics, forks, preview, editable, refreshing, onRefresh, onBack, onSaved, onDirtyChange }: EditorProps) {
  const client = useQueryClient();
  const [original, setOriginal] = useState(template);
  const [draft, setDraft] = useState(() => toDraft(template));
  const [baseline, setBaseline] = useState(() => toDraft(template));
  const [selected, setSelected] = useState<string | null>(null);
  const [side, setSide] = useState<CardSide>('FRONT');
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'default' | null>(null);
  const flight = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = editable && !sameDraft(draft, baseline);

  function load(t: TemplateDTO) {
    setOriginal(t); setDraft(toDraft(t)); setBaseline(toDraft(t)); setErrors([]); setFieldErrors({});
  }
  // A refetch (after a save, a default switch or Làm mới) brings a new object; adopt it while nothing is being edited.
  if (template !== original && !dirty && !busy) load(template);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [template.id]);
  useEffect(() => { onDirtyChange(dirty || busy); return () => onDirtyChange(false); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);

  const elements = useMemo(() => draftElements(draft), [draft]);
  const sections = cardSections(elements, schema);
  const sameSchema = preview.schemaId === schema.id;
  const items = sameSchema ? preview.items : NONE;
  const item = sameSchema ? preview.items[preview.index] ?? null : null;
  const quiz = quizChecks(elements);
  const issues = renderIssues(elements, schema);
  const coverage = useMemo(() => fieldCoverage(elements, schema, items), [elements, schema, items]);
  const byKey = new Map(coverage.map((c) => [c.key, c]));
  const notes = coverageNotes(coverage);
  const defaultTemplate = schema.templates.find((t) => t.isDefault);
  // What the app prints as each section title (it renames, or drops a section without fields).
  const sectionNames = new Map([...sections.front, ...sections.back].map((s) => [s.key, s.name]));

  const change = (next: TemplateDraft) => { setDraft(next); setErrors([]); };
  const focusInvalid = () => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  async function run(write: () => Promise<unknown>, message: string) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setErrors([]);
    try {
      await write();
      await client.invalidateQueries({ queryKey: templateKeys.schemas });
      onSaved(templatesUseFixtures ? `${message} trên bản nháp; mất khi tải lại trang.` : `${message}.`);
    } catch (e) {
      setErrors([templateErrorMessage(e)]);
    } finally { flight.current = false; setBusy(false); }
  }

  function save() {
    const v = validateDraft(draft);
    setFieldErrors(v.fields);
    if (v.errors.length) { setErrors(v.errors); focusInvalid(); return; }
    const body = toUpdate(draft, original.version);
    void run(async () => { await updateTemplate(original.id, body); setBaseline(draft); }, 'Đã lưu mẫu thẻ');
  }

  return (
    <div ref={root} className="space-y-4">
      {/* STICKY HEADER: back, name, default flag; the one primary action is Lưu */}
      <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button disabled={busy} icon={<ArrowLeft />} label="Quay lại danh sách" onClick={() => (dirty ? setConfirm('leave') : onBack())} />
          <div className="min-w-0">
            <h1 ref={heading} tabIndex={-1} className="flex items-center gap-2.5 text-xl font-semibold tracking-tight focus:outline-none">
              <span className="truncate">{draft.name.trim() || original.name}</span>
              {original.isDefault && <Badge tone="info">Mặc định</Badge>}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted" aria-live="polite">
              <span className="font-mono">{original.code ?? `#${original.id}`}</span>
              <span>{schema.name}</span>
              {original.version !== null && <span>Phiên bản {original.version}</span>}
              {dirty && <Badge tone="warning">Có thay đổi chưa lưu</Badge>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw />} label="Làm mới" loading={refreshing} disabled={busy} onClick={onRefresh} />
          {editable && <>
            {!original.isDefault && <Button disabled={busy || dirty} title={dirty ? 'Lưu hoặc bỏ thay đổi trước' : undefined} onClick={() => setConfirm('default')}>Đặt làm mặc định</Button>}
            <Button variant="primary" icon={<Save />} loading={busy} disabled={!dirty} onClick={save}>Lưu thay đổi</Button>
          </>}
        </div>
      </div>

      {errors.length > 0 && (
        <ErrorBanner message={errors.length === 1 ? errors[0] : 'Chưa lưu được:'}>
          {errors.length > 1 && <ul className="list-disc space-y-0.5 pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </ErrorBanner>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={busy} className="min-w-0 rounded-lg border border-border bg-surface">
          <section className="space-y-3 px-5 pb-4 pt-5">
            <SectionLabel>Cơ bản</SectionLabel>
            {editable && (
              <Field label="Tên mẫu" required error={fieldErrors.name} hint={`${draft.name.trim().length}/255 ký tự`}>
                <input className={fieldControl} maxLength={255} value={draft.name} onChange={(e) => { change({ ...draft, name: e.target.value }); setFieldErrors((f) => ({ ...f, name: '' })); }} />
              </Field>
            )}
            <dl className="m-0 space-y-2">
              {!editable && <Row label="Tên">{original.name}</Row>}
              <Row label="Mã">
                <span className="font-mono text-xs">{original.code ?? '—'}</span>
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-muted"><Lock size={12} />Khóa: máy chủ khởi tạo và migrate mẫu hệ thống theo mã</span>
              </Row>
              <Row label="Schema">{schema.name}<span className="ml-2 font-mono text-2xs text-text-light">{schema.code}</span></Row>
              <Row label="Mặc định">{original.isDefault ? 'Có: ứng dụng vẽ mọi thẻ học của schema bằng mẫu này' : <span className="text-text-muted">Không{defaultTemplate ? `; mẫu mặc định là “${defaultTemplate.name}”` : ''}</span>}</Row>
            </dl>
          </section>

          {(['FRONT', 'BACK'] as const).map((s) => (
            <Structure key={s} side={s} list={s === 'FRONT' ? draft.front : draft.back} schema={schema} coverage={byKey} total={items.length} sectionNames={sectionNames}
              topicName={sameSchema ? preview.topic?.name : undefined} editable={editable} selected={selected} errors={fieldErrors}
              onSelect={(key) => { setSelected(key === selected ? null : key); setSide(s); }}
              onMove={(key, by) => change(moveElement(draft, s, key, by))}
              onRemove={(key) => { change(removeElement(draft, s, key)); if (selected === key) setSelected(null); }}
              onAdd={(kind, attribute) => { const r = addElement(draft, s, kind, attribute); change(r.draft); setSelected(r.key); setSide(s); }}
              onPatch={(key, patch) => change(updateElement(draft, s, key, patch))} />
          ))}

          <details className="border-t border-border px-5 py-3 text-xs">
            <summary className="cursor-pointer font-medium text-text-muted">Dữ liệu kỹ thuật: thân yêu cầu lưu (JSON)</summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-surface-subtle p-3 font-mono text-2xs leading-relaxed">{JSON.stringify(toUpdate(draft, original.version), null, 2)}</pre>
          </details>
        </fieldset>

        {/* RIGHT RAIL: fixed order preview → checks → impact → lifecycle */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20" aria-label="Xem trước và kiểm tra">
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <SectionLabel>Xem trước trên ứng dụng</SectionLabel>
            <SideSwitch side={side} onChange={setSide} />
            <CardFace side={side} sections={side === 'FRONT' ? sections.front : sections.back} item={item} onFlip={() => setSide(side === 'FRONT' ? 'BACK' : 'FRONT')} />
            <PreviewSource compact branches={preview.branches} topicId={preview.topic?.id ?? null} onTopic={preview.setTopic}
              items={preview.items} index={preview.index} onIndex={preview.setIndex} loading={preview.loading} />
            {!item && <p className="text-xs text-text-muted">{sameSchema ? 'Chủ đề chưa có mục từ' : 'Chủ đề dùng schema khác'}: thẻ in giá trị mẫu của ứng dụng.</p>}
            {!original.isDefault && <p className="text-xs text-text-muted">Ứng dụng đang vẽ thẻ học bằng “{defaultTemplate?.name ?? 'mẫu mặc định'}”; mẫu này chỉ hiện khi được đặt làm mặc định.</p>}
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
            <SectionLabel>Kiểm tra</SectionLabel>
            <ul className="space-y-1">
              {quiz.map((q) => (
                <li key={q.mode} className="flex gap-1.5" title={q.problem?.code}>
                  {q.ok ? <Check size={14} className="mt-px shrink-0 text-primary-dark" aria-label="chạy được" /> : <X size={14} className="mt-px shrink-0 text-danger-dark" aria-label="lỗi" />}
                  <span><span className={q.ok ? 'text-text' : 'font-medium text-danger-dark'}>Quiz {q.label}</span>{q.problem && <span className="block text-danger-dark">{modeProblem(q)}</span>}</span>
                </li>
              ))}
            </ul>
            {issues.map((i) => <p key={i} className="flex gap-1.5 text-warning-dark"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{i}</p>)}
            {items.length > 0 && <>
              <p className="border-t border-border pt-2 font-medium text-text">Trên “{preview.topic?.name}”, {n(items.length)} mục</p>
              {notes.length ? notes.map((t) => <p key={t} className="text-text-muted">{t}</p>) : <p className="text-text-muted">Mọi trường hiện đủ dữ liệu.</p>}
            </>}
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
            <SectionLabel>Tác động</SectionLabel>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-text-muted">Thẻ học</dt>
              <dd>{original.isDefault
                ? <>Mọi thẻ học của schema {schema.name}: <span className="tabular-nums">{topicsReady ? n(systemTopics) : '—'}</span> chủ đề hệ thống và chủ đề người học dùng schema này, khi ứng dụng tải lại.</>
                : 'Không: ứng dụng chỉ vẽ mẫu mặc định.'}</dd>
              <dt className="text-text-muted">Quiz</dt>
              <dd>
                {!topicsReady ? '—' : quizTopics.length ? <>
                  <span className="tabular-nums">{n(quizTopics.length)}</span> chủ đề chọn mẫu này
                  <span className="block text-text-muted">{quizTopics.slice(0, 6).map((t) => t.name).join(', ')}{quizTopics.length > 6 ? `, và ${n(quizTopics.length - 6)} chủ đề khác` : ''}</span>
                </> : 'Chưa chủ đề nào chọn mẫu này.'}
                <TextLink to="/topics" className="mt-1">Đổi mẫu ở màn Chủ đề</TextLink>
              </dd>
              {quizTopics.length > 0 && <>
                <dt className="text-text-muted">Nhiệm vụ</dt>
                <dd>Từ người học lưu chỉ được tính khi mục có đủ {ROLE_LABEL.TARGET_WORD} và {ROLE_LABEL.NATIVE_TRANSLATION} theo mẫu của chủ đề.</dd>
              </>}
              {schema.isSystem && <>
                <dt className="text-text-muted">Bản riêng</dt>
                <dd><span className="tabular-nums">{n(forks)}</span> schema người học đã tách giữ bản cũ của mẫu.</dd>
              </>}
            </dl>
          </div>

          <div className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs">
            <SectionLabel>Vòng đời</SectionLabel>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-text-muted">Tạo</dt><dd className="tabular-nums">{formatVnDateTime(original.createdAt)}</dd>
              <dt className="text-text-muted">Sửa gần nhất</dt><dd className="tabular-nums">{formatVnDateTime(original.updatedAt)}</dd>
              <dt className="text-text-muted">ID</dt><dd className="tabular-nums">{original.id}</dd>
            </dl>
            <p className="border-t border-border pt-2 text-text-muted">Chưa có nhật ký ai sửa gì: cần audit log phía máy chủ.</p>
          </div>
        </aside>
      </div>

      {confirm === 'leave' && (
        <ConfirmModal title="Rời trang chưa lưu?" confirmLabel="Bỏ thay đổi và quay lại" onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); onBack(); }}>
          <p>Nội dung đang sửa sẽ bị bỏ.</p>
        </ConfirmModal>
      )}
      {confirm === 'default' && (
        <ConfirmModal title={`Đặt “${original.name}” làm mẫu mặc định?`} tone="primary" confirmLabel="Đặt làm mặc định" busy={busy}
          onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); void run(() => makeDefault(original), 'Đã đặt làm mẫu mặc định'); }}>
          <p>Khi tải lại, ứng dụng vẽ mọi thẻ học của schema {schema.name} bằng mẫu này{topicsReady ? `: ${n(systemTopics)} chủ đề hệ thống và chủ đề người học dùng schema này` : ''}. {defaultTemplate ? `“${defaultTemplate.name}” thôi là mặc định.` : ''}</p>
          <p className="text-text-muted">Quiz không đổi: mỗi chủ đề vẫn dùng mẫu nó đã chọn.</p>
          {(issues.length > 0 || quiz.some((q) => !q.ok)) && (
            <div className="rounded-md border border-warning/40 bg-warning-light p-2 text-xs text-warning-dark">
              <p className="font-medium">Mẫu này đang có vấn đề người học sẽ thấy:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">{[...quiz.filter((q) => !q.ok).map((q) => `Quiz ${q.label}: ${modeProblem(q)}`), ...issues].map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

// ---- One side: the stored element list ---------------------------------------------------------------------------------

type Kind = 'FIELD' | 'SECTION_BREAK' | 'COLUMN_BREAK';

function Structure({ side, list, schema, coverage, total, sectionNames, topicName, editable, selected, errors, onSelect, onMove, onRemove, onAdd, onPatch }: {
  side: CardSide; list: DraftElement[]; schema: SchemaDTO; coverage: Map<string, FieldCoverage>; total: number; sectionNames: Map<string, string>; topicName?: string;
  editable: boolean; selected: string | null; errors: Record<string, string>;
  onSelect: (key: string) => void; onMove: (key: string, by: -1 | 1) => void; onRemove: (key: string) => void;
  onAdd: (kind: Kind, attribute?: SchemaAttributeDTO) => void; onPatch: (key: string, patch: Partial<DraftElement>) => void;
}) {
  const current = list.find((e) => e.key === selected);
  const fields = list.filter((e) => e.type === 'FIELD').length;
  const firstSection = list.findIndex((e) => e.type === 'SECTION_BREAK');
  return (
    <section className="space-y-2 border-t border-border px-5 py-4" aria-label={SIDE_LABEL[side]}>
      <div className="flex items-center gap-3">
        <div className="flex-1"><SectionLabel>{SIDE_LABEL[side]}</SectionLabel></div>
        <span className="text-xs tabular-nums text-text-muted">{fields} trường</span>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-xs">
          <thead className="whitespace-nowrap bg-surface-subtle/60 text-text-muted">
            <tr>
              <th scope="col" className="min-w-[168px] px-3 py-1.5 font-medium">Phần tử</th>
              <th scope="col" className="px-3 py-1.5 font-medium">Thuộc tính</th>
              <th scope="col" className="px-3 py-1.5 font-medium">Vai trò</th>
              <th scope="col" className="px-3 py-1.5 font-medium">Hiển thị</th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium" title={topicName ? `Số thẻ hiện giá trị trên “${topicName}”` : undefined}>Có trên thẻ</th>
              {editable && <th scope="col" className="px-2 py-1.5"><span className="sr-only">Thao tác</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 && <tr><td colSpan={editable ? 6 : 5} className="px-3 py-4 text-center text-text-muted">Mặt này chưa có phần tử nào.</td></tr>}
            {list.map((e, i) => {
              const isSel = e.key === selected;
              const indent = e.type !== 'SECTION_BREAK' && firstSection >= 0 && i > firstSection;
              const pick = editable ? <button type="button" aria-pressed={isSel} className="text-left font-medium text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info" onClick={() => onSelect(e.key)}>{label(e, schema)}</button> : <span className="font-medium text-text">{label(e, schema)}</span>;
              return (
                <tr key={e.key} className={cn(isSel && 'bg-surface-subtle', e.type === 'SECTION_BREAK' && !isSel && 'bg-surface-subtle/40')}>
                  {e.type === 'FIELD' && e.field ? <FieldCells f={e.field} schema={schema} cov={coverage.get(e.key)} total={total} indent={indent} pick={pick} error={errors[e.key]} /> : (
                    <>
                      <td colSpan={4} className={cn('px-3 py-1.5', indent && 'pl-7')}>
                        {pick}
                        <span className="ml-2 text-text-muted">{e.type === 'SECTION_BREAK' ? (e.repeatable ? 'phần, lặp theo dòng' : 'phần') : 'các trường phía sau sang cột phải'}</span>
                        {e.type === 'SECTION_BREAK' && <SectionNote stored={e.sectionLabel ?? ''} shown={sectionNames.get(e.key)} />}
                        {errors[e.key] && <span className="block text-danger-dark">{errors[e.key]}</span>}
                      </td>
                      <td />
                    </>
                  )}
                  {editable && (
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <Button variant="ghost" size="sm" className="h-7 w-7" icon={<ArrowUp />} label="Lên" disabled={i === 0} onClick={() => onMove(e.key, -1)} />
                      <Button variant="ghost" size="sm" className="h-7 w-7" icon={<ArrowDown />} label="Xuống" disabled={i === list.length - 1} onClick={() => onMove(e.key, 1)} />
                      <Button variant="ghost" size="sm" className="h-7 w-7" icon={<Trash2 />} label={`Xóa ${label(e, schema)}`} onClick={() => onRemove(e.key)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle/40 px-3 py-2">
            <select aria-label={`Thêm trường vào ${SIDE_LABEL[side].toLowerCase()}`} className={cn(fieldControl, 'h-8 w-auto py-0 text-xs')} value=""
              onChange={(ev) => { const a = schema.groups.flatMap((g) => g.attributes).find((x) => x.attributeId === Number(ev.target.value)); if (a) onAdd('FIELD', a); }}>
              <option value="">Thêm trường…</option>
              {schema.groups.map((g) => (
                <optgroup key={g.groupId} label={g.label ?? g.name}>
                  {g.attributes.map((a) => <option key={a.attributeId} value={a.attributeId}>{a.label ?? a.name} ({g.name}.{a.name})</option>)}
                </optgroup>
              ))}
            </select>
            <Button size="sm" icon={<ListPlus />} onClick={() => onAdd('SECTION_BREAK')}>Phần</Button>
            <Button size="sm" icon={<Columns2 />} onClick={() => onAdd('COLUMN_BREAK')}>Ngắt cột</Button>
          </div>
        )}
      </div>
      {editable && current && <Settings e={current} schema={schema} error={errors[current.key]} onPatch={(p) => onPatch(current.key, p)} />}
    </section>
  );
}

function SectionNote({ stored, shown }: { stored: string; shown?: string }) {
  if (shown === undefined) return <span className="block text-warning-dark">Phần không có trường nên ứng dụng bỏ qua.</span>;
  if (shown === stored) return null;
  return <span className="block text-text-muted">Ứng dụng in tiêu đề “{shown || 'không tên'}”{stored ? ': tên này trùng tên mặc định nên ứng dụng lấy tên nhóm dữ liệu' : ''}.</span>;
}

function label(e: DraftElement, schema: SchemaDTO): string {
  if (e.type === 'SECTION_BREAK') return e.sectionLabel?.trim() || 'Phần không tên';
  if (e.type === 'COLUMN_BREAK') return 'Ngắt cột';
  const a = e.field ? findAttribute(schema, e.field.schemaAttributeId).attribute : undefined;
  return e.field?.fieldLabel?.trim() || a?.label || 'Trường dữ liệu';
}

function FieldCells({ f, schema, cov, total, indent, pick, error }: {
  f: TemplateFieldDTO; schema: SchemaDTO; cov?: FieldCoverage; total: number; indent: boolean; pick: React.ReactNode; error?: string;
}) {
  const { attribute, groupName } = findAttribute(schema, f.schemaAttributeId);
  const key = fontKey(f.fontSize);
  const flags = [f.hideIfEmpty && 'ẩn khi trống', f.audioAction && 'nút phát âm'].filter(Boolean).join(', ');
  return (
    <>
      <td className={cn('px-3 py-1.5', indent && 'pl-7')}>
        {pick}
        {error && <span className="block text-danger-dark">{error}</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs text-text-muted" title={attribute?.label ?? undefined}>{attribute ? `${groupName}.${attribute.name}` : `#${f.schemaAttributeId}`}</td>
      <td className="whitespace-nowrap px-3 py-1.5">
        {f.semanticRole ? <>{ROLE_LABEL[f.semanticRole]}{QUIZ_ROLES.includes(f.semanticRole) && <span className="ml-1 text-text-muted">· Quiz</span>}</> : <span className="text-text-light">—</span>}
      </td>
      <td className="px-3 py-1.5 text-text-muted">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className="h-3 w-3 rounded-sm border border-border" style={{ background: f.color ?? '#111827' }} />
          {key} {FONT_PX[key]}px, {ALIGN_LABEL[f.alignment ?? 'LEFT']}
        </span>
        {flags && <span className="block">{flags}</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
        {cov && total ? <>
          <span className={cov.shown === 0 ? 'text-text-light' : 'text-text'}>{n(cov.shown)}/{n(total)}</span>
          {cov.dash > 0 && <span className="block text-warning-dark">“—” trên {n(cov.dash)}</span>}
          {cov.misplaced > 0 && <span className="block text-warning-dark" title={`Giá trị nằm ngoài ${cov.path}`}>lệch nhóm {n(cov.misplaced)}</span>}
        </> : <span className="text-text-light">—</span>}
      </td>
    </>
  );
}

function Settings({ e, schema, error, onPatch }: { e: DraftElement; schema: SchemaDTO; error?: string; onPatch: (p: Partial<DraftElement>) => void }) {
  if (e.type === 'COLUMN_BREAK') {
    return <p className="rounded-md bg-surface-subtle px-3 py-2 text-xs text-text-muted">Ngắt cột chia phần đang chứa nó thành hai cột: các trường đứng trước ở cột trái, các trường phía sau ở cột phải. Một phần mới bắt đầu lại từ cột trái.</p>;
  }
  if (e.type === 'SECTION_BREAK') {
    return (
      <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
        <Field label="Tên phần" error={error} hint="Để trống thì thẻ không in tiêu đề phần.">
          <input className={fieldControl} maxLength={100} value={e.sectionLabel ?? ''} onChange={(ev) => onPatch({ sectionLabel: ev.target.value })} />
        </Field>
        <label className="flex items-start gap-2 self-center text-xs text-text">
          <input type="checkbox" className="mt-0.5 accent-primary-solid" checked={!!e.repeatable} onChange={(ev) => onPatch({ repeatable: ev.target.checked })} />
          <span>Lặp theo từng dòng<span className="block text-text-muted">Ứng dụng tự lặp khi phần có trường của nhóm nhiều dòng (ví dụ câu).</span></span>
        </label>
      </div>
    );
  }
  const f = e.field!;
  const set = (p: Partial<TemplateFieldDTO>) => onPatch({ field: { ...f, ...p } });
  const { attribute, groupName } = findAttribute(schema, f.schemaAttributeId);
  const colors = COLOR_PALETTE.includes(f.color ?? '') || !f.color ? COLOR_PALETTE : [...COLOR_PALETTE, f.color];
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nhãn trên thẻ" error={error} hint="Để trống thì thẻ dùng nhãn của thuộc tính.">
          <input className={fieldControl} maxLength={255} value={f.fieldLabel ?? ''} onChange={(ev) => set({ fieldLabel: ev.target.value })} />
        </Field>
        <Field label="Vai trò" hint="Quiz đọc Từ vựng chính, Bản dịch / Nghĩa và Câu ví dụ theo vai trò, không theo tên thuộc tính.">
          <select className={fieldControl} value={f.semanticRole ?? ''} onChange={(ev) => set({ semanticRole: (ev.target.value || null) as SemanticRole | null })}>
            <option value="">Không có vai trò</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}{QUIZ_ROLES.includes(r) ? ' (Quiz)' : ''}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Choice legend="Cỡ chữ" value={fontKey(f.fontSize)} options={(['S', 'M', 'L', 'XL'] as FontKey[]).map((k) => [k, `${k} ${FONT_PX[k]}px`])} onChange={(k) => set({ fontSize: FONT_PX[k as FontKey] })} />
        <Choice legend="Căn lề" value={f.alignment ?? 'LEFT'} options={(['LEFT', 'CENTER', 'RIGHT'] as Alignment[]).map((a) => [a, ALIGN_LABEL[a]])} onChange={(a) => set({ alignment: a as Alignment })} />
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-text">Màu chữ</legend>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <label key={c} title={c} className={cn('flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info', (f.color ?? '#111827') === c ? 'border-text' : 'border-border')}>
                <input type="radio" name={`color-${e.key}`} className="sr-only" checked={(f.color ?? '#111827') === c} onChange={() => set({ color: c })} aria-label={c} />
                <span className="h-4 w-4 rounded-sm" style={{ background: c }} />
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary-solid" checked={f.hideIfEmpty} onChange={(ev) => set({ hideIfEmpty: ev.target.checked })} />Ẩn khi trống (không thì thẻ in “—”)</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary-solid" checked={f.audioAction} onChange={(ev) => set({ audioAction: ev.target.checked })} />Nút phát âm cạnh giá trị</label>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-text-muted"><Lock size={12} />Thuộc tính {groupName}.{attribute?.name} ({attribute?.label}) khóa trên trường này; muốn đổi thì xóa trường rồi thêm trường mới.</p>
    </div>
  );
}

function Choice({ legend, value, options, onChange }: { legend: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-text">{legend}</legend>
      <div className="flex rounded-lg border border-border p-0.5">
        {options.map(([v, text]) => (
          <label key={v} className={cn('cursor-pointer rounded-md px-2.5 py-1 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info', value === v ? 'bg-surface-subtle font-semibold text-text' : 'text-text-muted hover:text-text')}>
            <input type="radio" className="sr-only" checked={value === v} onChange={() => onChange(v)} />{text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
