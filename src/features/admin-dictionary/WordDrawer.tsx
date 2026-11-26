import React, { useState } from 'react';
import { AlertCircle, ArchiveRestore, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmModal, Drawer, Field, SectionLabel, fieldControl } from '../../components/ui';
import {
  contentErrorText, meaningsByPos, POS_OPTIONS, toUpdateWord, toWordDraft, viGloss, WORD_GAP_LABEL, wordDraftErrors, wordGaps,
  type WordDraft,
} from '../../domains/admin-content/mappers';
import { useDeleteWord, useRestoreWord, useUpdateWord, useWordById, useWordLookup } from '../../domains/admin-content/queries';
import { formatDate } from '../../domains/admin-learners/mappers';
import { ApiClientError } from '../../lib/api-client';
import { cn } from '../../lib/utils';

const REASON_MAX = 500;

/**
 * One dictionary word: read (GET /api/words/{id}, or GET /api/words/lookup?q= for word-text links), edit
 * (PUT /api/admin/words/{id}), soft delete and restore. The word text itself is not editable: topic items, scans and
 * learners' saved words find the word by it.
 */
export function WordDrawer({ wordId = null, word = null, onClose, onChanged }: { wordId?: number | null; word?: string | null; onClose: () => void; onChanged?: (message: string) => void }) {
  const byId = useWordById(wordId);
  const lookup = useWordLookup(wordId === null ? word : null);
  const query = wordId !== null ? byId : lookup;
  const r = query.data;
  const id = r?.wordId ?? wordId ?? 0;
  const update = useUpdateWord(id);
  const del = useDeleteWord(id);
  const restore = useRestoreWord(id);
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'restore' | null>(null);
  const [reason, setReason] = useState('');
  const fallbackTitle = word ?? (wordId !== null ? `#${wordId}` : '');

  if (!r) {
    return (
      <Drawer title={fallbackTitle} onClose={onClose} width="lg">
        {query.isError ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-dark"><AlertCircle size={16} />Không tra được từ này.</p>
          : <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-subtle" />)}</div>}
      </Drawer>
    );
  }

  const deleted = Boolean(r.deletedAt);

  if (draft) {
    const errors = wordDraftErrors(draft);
    const set = <K extends keyof WordDraft>(k: K, v: WordDraft[K]) => setDraft({ ...draft, [k]: v });
    const setMeaning = (i: number, patch: Partial<WordDraft['meanings'][number]>) =>
      set('meanings', draft.meanings.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const conflict = update.error instanceof ApiClientError && update.error.code === 'VERSION_CONFLICT';
    const save = () => {
      setShowErrors(true);
      if (Object.keys(errors).length) return;
      update.mutate(toUpdateWord(draft, r.version ?? 0), { onSuccess: () => { setDraft(null); onChanged?.(`Đã lưu "${r.word}".`); } });
    };
    const reload = async () => {
      const fresh = await query.refetch();
      if (fresh.data) setDraft(toWordDraft(fresh.data));
      update.reset();
    };
    return (
      <Drawer title={`Sửa "${r.word}"`} subtitle="Lưu ghi thẳng vào từ điển: tra cứu, gợi ý và scan dùng bản mới ngay." onClose={() => setDraft(null)} width="lg" busy={update.isPending}
        footer={<><Button onClick={() => setDraft(null)} disabled={update.isPending} data-autofocus>Hủy</Button><Button variant="primary" loading={update.isPending} loadingText="Đang lưu…" onClick={save}>Lưu</Button></>}>
        <ListEditor title="Phát âm (IPA)" values={draft.ipa.map((p) => p.ipa)} placeholder="/ˈæpəl/" mono
          errors={showErrors ? draft.ipa.map((_, i) => errors[`ipa.${i}`]) : []}
          extra={(i) => (
            <input aria-label={`Vùng phát âm ${i + 1}`} className={cn(fieldControl, 'w-24')} placeholder="US" value={draft.ipa[i].region}
              onChange={(e) => set('ipa', draft.ipa.map((x, j) => (j === i ? { ...x, region: e.target.value } : x)))} />
          )}
          onChange={(v) => set('ipa', v.map((ipa, i) => ({ ipa, region: draft.ipa[i]?.region ?? '' })))} />
        <ListEditor title="Bản dịch tiếng Việt" values={draft.vi} onChange={(v) => set('vi', v)} placeholder="quả táo"
          errors={showErrors ? draft.vi.map((_, i) => errors[`vi.${i}`]) : []} />
        <section className="space-y-2">
          <SectionLabel>Định nghĩa</SectionLabel>
          {draft.meanings.map((m, i) => (
            <div key={m.id ?? `new-${i}`} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-[150px_90px_1fr_auto]">
                <Field label="Từ loại">
                  <select className={fieldControl} value={m.pos} onChange={(e) => setMeaning(i, { pos: e.target.value })}>
                    <option value="">(không rõ)</option>
                    {POS_OPTIONS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Ngôn ngữ"><select className={fieldControl} value={m.lang} onChange={(e) => setMeaning(i, { lang: e.target.value as 'vi' | 'en' })}><option value="vi">vi</option><option value="en">en</option></select></Field>
                <Field label="Định nghĩa" required error={showErrors ? errors[`meanings.${i}`] : undefined}><input className={fieldControl} value={m.definition} onChange={(e) => setMeaning(i, { definition: e.target.value })} /></Field>
                <div className="flex items-end"><Button size="sm" variant="ghost" icon={<Trash2 />} label={`Xóa định nghĩa ${i + 1}`} onClick={() => set('meanings', draft.meanings.filter((_, j) => j !== i))} /></div>
              </div>
              <Field label="Ví dụ"><input className={fieldControl} value={m.example} onChange={(e) => setMeaning(i, { example: e.target.value })} /></Field>
            </div>
          ))}
          <Button size="sm" icon={<Plus />} onClick={() => set('meanings', [...draft.meanings, { id: null, pos: '', lang: 'vi', definition: '', example: '' }])}>Thêm định nghĩa</Button>
          <p className="text-xs text-text-muted">Một định nghĩa có thể dùng chung cho nhiều từ; sửa ở đây chỉ đổi cho từ này (máy chủ tách bản riêng).</p>
        </section>
        {update.isError && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-lg bg-danger-light p-3 text-xs text-danger-dark">
            <span>{contentErrorText(update.error, 'Từ này')}</span>
            {conflict && <Button size="sm" icon={<RotateCw />} onClick={() => void reload()}>Tải bản mới</Button>}
          </div>
        )}
      </Drawer>
    );
  }

  const gaps = wordGaps(r);
  const vi = viGloss(r);
  const viFromDefinitions = !r.translations.some((t) => t.langCode === 'vi') && vi.length > 0;
  const others = r.translations.filter((t) => t.langCode !== 'vi');
  const reasonError = reason.trim() && (reason.trim().length < 10 || reason.trim().length > REASON_MAX) ? `Lý do 10–${REASON_MAX} ký tự, hoặc để trống.` : null;
  return (
    <Drawer title={r.word} subtitle={`${r.meanings.length} định nghĩa · ${r.pronunciations.length} phát âm · ${r.translations.length} bản dịch`} onClose={onClose} width="lg"
      footer={deleted ? (
        <Button icon={<ArchiveRestore />} variant="primary" onClick={() => setConfirm('restore')}>Khôi phục</Button>
      ) : (<>
        <Button variant="danger-outline" icon={<Trash2 />} onClick={() => setConfirm('delete')}>Xóa mềm</Button>
        <Button icon={<Pencil />} onClick={() => { update.reset(); setShowErrors(false); setDraft(toWordDraft(r)); }}>Sửa từ</Button>
      </>)}>
      {deleted && (
        <p role="note" className="rounded-lg border border-warning/40 bg-warning-light px-3 py-2 text-xs text-warning-dark">
          <strong>Đã xóa mềm</strong> lúc {formatDate(r.deletedAt!)}. Từ không còn hiện trong tra cứu, gợi ý và kết quả scan; người học đã lưu vẫn mở được. Khôi phục để dùng lại.
        </p>
      )}
      {gaps.length > 0 && <div className="flex flex-wrap gap-1.5">{gaps.map((g) => <Badge key={g} tone="warning">{WORD_GAP_LABEL[g]}</Badge>)}</div>}

      <section className="space-y-2">
        <SectionLabel>Phát âm</SectionLabel>
        {r.pronunciations.length ? (
          <ul className="flex flex-wrap gap-2">{r.pronunciations.map((p, i) => <li key={i} className="rounded-lg border border-border px-2.5 py-1 text-xs"><span className="font-mono">{p.ipa}</span>{p.region && <span className="ml-1.5 text-text-muted">{p.region}</span>}</li>)}</ul>
        ) : <p className="text-xs text-text-muted">Chưa có IPA. App sẽ đọc bằng TTS.</p>}
      </section>

      <section className="space-y-2">
        <SectionLabel>Nghĩa tiếng Việt</SectionLabel>
        {vi.length ? <><p className="text-sm font-semibold">{vi.slice(0, 4).join(' · ')}</p>{viFromDefinitions && <p className="text-xs text-text-muted">Lấy từ định nghĩa tiếng Việt (chưa có bản dịch tiếng Việt).</p>}</>
          : <p className="text-xs text-text-muted">Chưa có nghĩa tiếng Việt.</p>}
      </section>

      <section className="space-y-3">
        <SectionLabel>Định nghĩa theo từ loại</SectionLabel>
        {r.meanings.length === 0 && <p className="text-xs text-text-muted">Chưa có định nghĩa.</p>}
        {meaningsByPos(r).map(([pos, ms]) => (
          <div key={pos} className="space-y-1.5">
            <Badge tone="info">{pos}</Badge>
            <ol className="list-decimal space-y-2 pl-5 text-body">
              {ms.map((m, i) => (
                <li key={i}>
                  <span className="mr-1.5 rounded bg-surface-subtle px-1 font-mono text-2xs text-text-muted">{m.definitionLang ?? '?'}</span>
                  <span>{m.definition}</span>
                  {m.example?.trim() && (
                    <span className="mt-1 block rounded border-l-2 border-primary/50 bg-surface-subtle/70 px-2.5 py-1 text-xs italic text-text">
                      “{m.example.trim()}”
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      {r.relations.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>Quan hệ</SectionLabel>
          <ul className="flex flex-wrap gap-1.5 text-xs">{r.relations.slice(0, 24).map((x, i) => <li key={i} className="rounded-full border border-border px-2 py-0.5"><span className="text-text-muted">{x.relationType}:</span> {x.relatedWord}</li>)}</ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>{`Bản dịch ngôn ngữ khác · ${others.length}`}</SectionLabel>
          <p className="text-xs text-text-muted">{others.slice(0, 12).map((t) => `${t.langCode}: ${t.translation}`).join(' · ')}{others.length > 12 && ' …'}</p>
        </section>
      )}

      <section className="space-y-1.5 rounded-lg border border-border p-3 text-xs text-text-muted">
        <SectionLabel>Ảnh hưởng khi sửa hoặc xóa</SectionLabel>
        <p>Mục từ trong các chủ đề là bản sao lấy lúc thêm, nên không đổi theo từ điển. Sửa hoặc xóa ở đây đổi kết quả tra cứu, gợi ý khi thêm mục từ và ánh xạ nhãn scan từ lần gọi sau.</p>
      </section>

      {confirm === 'delete' && (
        <ConfirmModal title={`Xóa mềm "${r.word}"?`} tone="danger" confirmLabel="Xóa mềm" busy={del.isPending} confirmDisabled={Boolean(reasonError)}
          onClose={() => { setConfirm(null); del.reset(); }}
          onConfirm={() => del.mutate(reason.trim() || null, { onSuccess: () => { setConfirm(null); setReason(''); onChanged?.(`Đã xóa mềm "${r.word}".`); } })}>
          <ul className="list-disc space-y-1 pl-4 text-text-muted">
            <li>Tra cứu, gợi ý và scan không còn thấy từ này.</li>
            <li>Người học đã lưu vẫn giữ và mở được; mục từ trong chủ đề không đổi.</li>
            <li>Khôi phục được bất cứ lúc nào (mục "Đã xóa mềm" của Từ điển).</li>
          </ul>
          <Field label="Lý do (không bắt buộc)" error={reasonError ?? undefined} hint="Ghi vào nhật ký hoạt động.">
            <textarea rows={2} maxLength={REASON_MAX} className={fieldControl} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {del.isError && <p role="alert" className="text-danger-dark">{contentErrorText(del.error, 'Từ này')}</p>}
        </ConfirmModal>
      )}
      {confirm === 'restore' && (
        <ConfirmModal title={`Khôi phục "${r.word}"?`} tone="info" confirmLabel="Khôi phục" busy={restore.isPending}
          onClose={() => { setConfirm(null); restore.reset(); }}
          onConfirm={() => restore.mutate(undefined, { onSuccess: () => { setConfirm(null); onChanged?.(`Đã khôi phục "${r.word}".`); } })}>
          <p className="text-text-muted">Từ hiện lại trong tra cứu, gợi ý và scan ngay.</p>
          {restore.isError && <p role="alert" className="text-danger-dark">{contentErrorText(restore.error, 'Từ này')}</p>}
        </ConfirmModal>
      )}
    </Drawer>
  );
}

function ListEditor({ title, values, onChange, placeholder, mono, errors = [], extra }: {
  title: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; mono?: boolean;
  errors?: (string | undefined)[]; extra?: (i: number) => React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <SectionLabel>{title}</SectionLabel>
      {values.map((v, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2">
            <input aria-label={`${title} ${i + 1}`} aria-invalid={errors[i] ? true : undefined} className={`${fieldControl} ${mono ? 'font-mono' : ''}`} value={v} placeholder={placeholder} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
            {extra?.(i)}
            <Button size="sm" variant="ghost" icon={<Trash2 />} label={`Xóa ${title} ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))} />
          </div>
          {errors[i] && <p className="text-xs text-danger-dark">{errors[i]}</p>}
        </div>
      ))}
      <Button size="sm" icon={<Plus />} onClick={() => onChange([...values, ''])}>Thêm</Button>
    </section>
  );
}
