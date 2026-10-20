import React, { useState } from 'react';
import { AlertTriangle, BookOpen, Plus, Trash2 } from 'lucide-react';
import { Button, Drawer, Field, SectionLabel, fieldControl } from '../../components/ui';
import { lookupWord } from '../../domains/admin-content/api';
import { duplicateOf, emptyDraft, fillFromLookup, toCreatePayload, validateDraft, type ItemDraft, type ItemSummary } from '../../domains/admin-content/mappers';
import { useAddItem } from '../../domains/admin-content/queries';
import type { SchemaAttributeDTO, SchemaAttributeGroupDTO, TopicDTO } from '../../domains/admin-content/types';

/** Long-text attributes of DEFAULT_ENGLISH get a textarea; everything else a single line. */
const LONG = new Set(['meaning', 'definition', 'definition_translation', 'content', 'example']);
const hintFor = (a: SchemaAttributeDTO) =>
  a.dataType === 'AUDIO' ? 'URL file âm thanh (để trống: app đọc bằng TTS).' : a.dataType === 'IMAGE' ? 'URL ảnh.' : undefined;

interface Props {
  topic: TopicDTO;
  groups: SchemaAttributeGroupDTO[];
  existing: ItemSummary[];
  onClose: () => void;
  onDone: (word: string) => void;
}

/** POST /api/topics/{id}/items with a form generated from the topic schema (TopicService.addTopicItem). */
export function AddItemDrawer({ topic, groups, existing, onClose, onDone }: Props) {
  const add = useAddItem(topic.id);
  const [draft, setDraft] = useState<ItemDraft>(() => emptyDraft(groups));
  const [showErrors, setShowErrors] = useState(false);
  const [lookup, setLookup] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const errors = validateDraft(groups, draft);
  const word = draft.main?.[0]?.word ?? '';
  const dup = duplicateOf(existing, word);
  const dirty = JSON.stringify(draft) !== JSON.stringify(emptyDraft(groups));

  const setValue = (group: string, row: number, attr: string, value: string) =>
    setDraft((d) => ({ ...d, [group]: d[group].map((r, i) => (i === row ? { ...r, [attr]: value } : r)) }));
  const addRow = (g: SchemaAttributeGroupDTO) =>
    setDraft((d) => ({ ...d, [g.name]: [...d[g.name], Object.fromEntries(g.attributes.map((a) => [a.name, '']))] }));
  const removeRow = (g: string, row: number) => setDraft((d) => ({ ...d, [g]: d[g].filter((_, i) => i !== row) }));

  async function prefill() {
    setLookup({ busy: true, note: null });
    try {
      const r = await lookupWord(word.trim());
      if (!r.exists) return setLookup({ busy: false, note: `Từ điển chưa có "${word.trim()}".` });
      const { draft: next, filledFields } = fillFromLookup(draft, r);
      setDraft(next);
      setLookup({ busy: false, note: filledFields.length ? `Đã điền: ${filledFields.join(', ')}. Kiểm tra lại trước khi lưu.` : 'Không còn ô trống nào để điền.' });
    } catch {
      setLookup({ busy: false, note: 'Không tra được từ điển.' });
    }
  }

  const submit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    add.mutate(toCreatePayload(groups, draft), { onSuccess: () => onDone(word.trim()) });
  };
  const close = () => { if (!dirty || window.confirm('Bỏ mục từ đang nhập?')) onClose(); };

  return (
    <Drawer
      title={`Thêm mục từ vào ${topic.name}`}
      subtitle="Người học thấy mục này ngay sau khi lưu (chưa có Nháp/Phát hành)."
      busy={add.isPending}
      onClose={close}
      footer={<>
        <Button onClick={close} disabled={add.isPending} data-autofocus>Hủy</Button>
        <Button variant="primary" icon={<Plus />} loading={add.isPending} loadingText="Đang lưu…" onClick={submit}>Thêm vào chủ đề</Button>
      </>}
    >
      {groups.map((g) => (
        <section key={g.groupId} className="space-y-3">
          <SectionLabel>{g.label ?? g.name}</SectionLabel>
          {draft[g.name].map((row, i) => (
            <div key={i} className={g.multiple ? 'space-y-2 rounded-lg border border-border p-3' : 'grid gap-3 sm:grid-cols-2'}>
              {g.multiple && (
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                  <span>{g.label ?? g.name} {i + 1}</span>
                  <Button size="sm" variant="ghost" icon={<Trash2 />} label={`Xóa ${g.label ?? g.name} ${i + 1}`} onClick={() => removeRow(g.name, i)} />
                </div>
              )}
              {g.attributes.map((a) => {
                const key = `${g.name}.${i}.${a.name}`;
                const long = LONG.has(a.name);
                const control = long
                  ? <textarea rows={2} className={fieldControl} value={row[a.name] ?? ''} onChange={(e) => setValue(g.name, i, a.name, e.target.value)} />
                  : <input className={fieldControl} value={row[a.name] ?? ''} onChange={(e) => setValue(g.name, i, a.name, e.target.value)} />;
                return (
                  <div key={a.attributeId} className={long && !g.multiple ? 'sm:col-span-2' : undefined}>
                    <Field label={a.label ?? a.name} required={a.required} hint={hintFor(a)} error={showErrors ? errors[key] : undefined}>{control}</Field>
                    {g.name === 'main' && a.name === 'word' && (
                      <div className="mt-1.5 space-y-1.5">
                        <Button size="sm" icon={<BookOpen />} loading={lookup.busy} disabled={!word.trim()} onClick={() => void prefill()}>Điền từ từ điển</Button>
                        {lookup.note && <p className="text-xs text-text-muted">{lookup.note}</p>}
                        {dup && <p role="status" className="flex items-center gap-1.5 text-xs text-warning-dark"><AlertTriangle size={13} />Chủ đề đã có "{dup.word}". Thêm nữa sẽ tạo thẻ trùng cho người học.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {g.multiple && <Button size="sm" icon={<Plus />} onClick={() => addRow(g)}>Thêm {(g.label ?? g.name).toLowerCase()}</Button>}
        </section>
      ))}
      {add.isError && <p role="alert" className="rounded-lg bg-danger-light p-3 text-xs text-danger-dark">Không thêm được: {add.error.message}</p>}
    </Drawer>
  );
}
