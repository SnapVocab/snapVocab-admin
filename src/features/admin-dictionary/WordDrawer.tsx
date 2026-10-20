import React, { useState } from 'react';
import { AlertCircle, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, Drawer, Field, SampleDataNotice, SectionLabel, fieldControl } from '../../components/ui';
import { meaningsByPos, viGloss, WORD_GAP_LABEL, wordGaps } from '../../domains/admin-content/mappers';
import { useWordLookup } from '../../domains/admin-content/queries';
import type { LookupResultDTO } from '../../domains/admin-content/types';

/**
 * MOCK writes (F-ADM-04 has no API yet): an edit is kept in this session only, keyed by word, and every view of it
 * says so. Reads are real (GET /api/words/lookup).
 */
const sessionEdits = new Map<string, LookupResultDTO>();

type Draft = { ipa: string[]; vi: string[]; meanings: { pos: string; lang: 'vi' | 'en'; definition: string; example: string }[] };
const toDraft = (r: LookupResultDTO): Draft => ({
  ipa: r.pronunciations.map((p) => p.ipa),
  vi: r.translations.filter((t) => t.langCode === 'vi').map((t) => t.translation),
  meanings: r.meanings.map((m) => ({ pos: m.pos ?? '', lang: m.definitionLang === 'en' ? 'en' : 'vi', definition: m.definition, example: m.example ?? '' })),
});
const applyDraft = (r: LookupResultDTO, d: Draft): LookupResultDTO => ({
  ...r,
  pronunciations: d.ipa.filter((v) => v.trim()).map((ipa, i) => ({ ipa: ipa.trim(), region: r.pronunciations[i]?.region ?? null })),
  translations: [...r.translations.filter((t) => t.langCode !== 'vi'), ...d.vi.filter((v) => v.trim()).map((translation) => ({ langCode: 'vi', translation: translation.trim() }))],
  meanings: d.meanings.filter((m) => m.definition.trim()).map((m) => ({ definition: m.definition.trim(), definitionLang: m.lang, example: m.example.trim() || null, pos: m.pos.trim() || null, subPos: null, links: null })),
});

export function WordDrawer({ word, onClose }: { word: string; onClose: () => void }) {
  const lookup = useWordLookup(word);
  const [, rerender] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const edited = sessionEdits.get(word);
  const r = edited ?? lookup.data;

  if (!r) {
    return (
      <Drawer title={word} onClose={onClose} width="lg">
        {lookup.isError ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-dark"><AlertCircle size={16} />Không tra được từ này.</p>
          : <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-subtle" />)}</div>}
      </Drawer>
    );
  }

  if (draft) {
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
    const save = () => { sessionEdits.set(word, applyDraft(r, draft)); setDraft(null); rerender((n) => n + 1); };
    return (
      <Drawer title={`Sửa "${word}"`} subtitle="Bản sửa mẫu: chỉ giữ trong phiên này" onClose={() => setDraft(null)} width="lg"
        footer={<><Button onClick={() => setDraft(null)} data-autofocus>Hủy</Button><Button variant="primary" onClick={save}>Lưu bản sửa (mẫu)</Button></>}>
        <SampleDataNotice>Chưa có API ghi từ điển (đề xuất <code className="font-mono">PUT /api/admin/words/{'{id}'}</code>). Lưu ở đây chỉ để kiểm chứng giao diện sửa; không ghi vào máy chủ.</SampleDataNotice>
        <ListEditor title="Phát âm (IPA)" values={draft.ipa} onChange={(v) => set('ipa', v)} placeholder="/ˈæpəl/" mono />
        <ListEditor title="Bản dịch tiếng Việt" values={draft.vi} onChange={(v) => set('vi', v)} placeholder="quả táo" />
        <section className="space-y-2">
          <SectionLabel>Định nghĩa</SectionLabel>
          {draft.meanings.map((m, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-[120px_90px_1fr_auto]">
                <Field label="Từ loại"><input className={fieldControl} value={m.pos} onChange={(e) => set('meanings', draft.meanings.map((x, j) => (j === i ? { ...x, pos: e.target.value } : x)))} /></Field>
                <Field label="Ngôn ngữ"><select className={fieldControl} value={m.lang} onChange={(e) => set('meanings', draft.meanings.map((x, j) => (j === i ? { ...x, lang: e.target.value as 'vi' | 'en' } : x)))}><option value="vi">vi</option><option value="en">en</option></select></Field>
                <Field label="Định nghĩa" required><input className={fieldControl} value={m.definition} onChange={(e) => set('meanings', draft.meanings.map((x, j) => (j === i ? { ...x, definition: e.target.value } : x)))} /></Field>
                <div className="flex items-end"><Button size="sm" variant="ghost" icon={<Trash2 />} label={`Xóa định nghĩa ${i + 1}`} onClick={() => set('meanings', draft.meanings.filter((_, j) => j !== i))} /></div>
              </div>
              <Field label="Ví dụ"><input className={fieldControl} value={m.example} onChange={(e) => set('meanings', draft.meanings.map((x, j) => (j === i ? { ...x, example: e.target.value } : x)))} /></Field>
            </div>
          ))}
          <Button size="sm" icon={<Plus />} onClick={() => set('meanings', [...draft.meanings, { pos: '', lang: 'vi', definition: '', example: '' }])}>Thêm định nghĩa</Button>
        </section>
      </Drawer>
    );
  }

  const gaps = wordGaps(r);
  const vi = viGloss(r);
  const viFromDefinitions = !r.translations.some((t) => t.langCode === 'vi') && vi.length > 0;
  const others = r.translations.filter((t) => t.langCode !== 'vi');
  return (
    <Drawer title={r.word} subtitle={`${r.meanings.length} định nghĩa · ${r.pronunciations.length} phát âm · ${r.translations.length} bản dịch`} onClose={onClose} width="lg"
      footer={<>
        <Button variant="danger-outline" icon={<Trash2 />} disabled title="Cần API xóa mềm từ điển; xóa cứng làm hỏng mục từ đang tham chiếu">Xóa mềm</Button>
        <Button icon={<Pencil />} onClick={() => setDraft(toDraft(r))}>Sửa từ</Button>
      </>}>
      {edited && (
        <p role="note" className="flex items-center justify-between gap-2 rounded-lg border border-info/30 bg-info-light px-3 py-2 text-xs text-info-dark">
          <span>Đang xem <strong>bản sửa mẫu</strong> trong phiên, chưa ghi vào máy chủ.</span>
          <Button size="sm" icon={<Undo2 />} onClick={() => { sessionEdits.delete(word); rerender((n) => n + 1); }}>Bỏ bản sửa</Button>
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
            <ol className="list-decimal space-y-1.5 pl-5 text-body">
              {ms.map((m, i) => <li key={i}><span className="mr-1.5 rounded bg-surface-subtle px-1 font-mono text-2xs text-text-muted">{m.definitionLang ?? '?'}</span>{m.definition}{m.example && <span className="mt-0.5 block text-xs text-text-muted">“{m.example}”</span>}</li>)}
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

      <section className="space-y-2 rounded-lg border border-dashed border-border-strong p-3">
        <SectionLabel>Ảnh hưởng khi sửa</SectionLabel>
        <p className="text-xs text-text-muted">Sẽ hiện: số mục từ trong chủ đề hệ thống dùng từ này, số người học đã lưu và nhãn scan ánh xạ tới từ này, để biết phạm vi trước khi sửa hay xóa. Cần API đếm mức dùng (đánh giá §3.3).</p>
      </section>
    </Drawer>
  );
}

function ListEditor({ title, values, onChange, placeholder, mono }: { title: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; mono?: boolean }) {
  return (
    <section className="space-y-2">
      <SectionLabel>{title}</SectionLabel>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label={`${title} ${i + 1}`} className={`${fieldControl} ${mono ? 'font-mono' : ''}`} value={v} placeholder={placeholder} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button size="sm" variant="ghost" icon={<Trash2 />} label={`Xóa ${title} ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" icon={<Plus />} onClick={() => onChange([...values, ''])}>Thêm</Button>
    </section>
  );
}
