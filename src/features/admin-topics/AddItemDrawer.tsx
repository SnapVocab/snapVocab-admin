import React, { useState } from 'react';
import { AlertTriangle, BookOpen, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Drawer, Field, SectionLabel, fieldControl } from '../../components/ui';
import { lookupWord } from '../../domains/admin-content/api';
import {
  contentErrorText, draftFromItem, duplicateOf, emptyDraft, fillFromLookup, toCreatePayload, validateDraft, type ItemDraft, type ItemSummary,
} from '../../domains/admin-content/mappers';
import { useAddItem, useUpdateItem } from '../../domains/admin-content/queries';
import type { SchemaAttributeDTO, SchemaAttributeGroupDTO, TopicDTO, TopicItemData } from '../../domains/admin-content/types';

/** Long-text attributes of DEFAULT_ENGLISH get a textarea; everything else a single line. */
const LONG = new Set(['meaning', 'definition', 'definition_translation', 'content', 'example']);
const hintFor = (a: SchemaAttributeDTO) =>
  a.dataType === 'AUDIO' ? 'URL file âm thanh (để trống: app đọc bằng TTS).' : a.dataType === 'IMAGE' ? 'URL ảnh.' : undefined;

interface Props {
  topic: TopicDTO;
  groups: SchemaAttributeGroupDTO[];
  existing: ItemSummary[];
  /** Edit this item instead of adding one (PUT, same body; the item id and learners' SRS cards stay). */
  item?: TopicItemData;
  onClose: () => void;
  onDone: (word: string) => void;
}

/**
 * POST /api/topics/{id}/items with a form generated from the topic schema (TopicService.addTopicItem), or, with
 * `item`, PUT /api/topics/{id}/items/{itemId} prefilled from the item (draftFromItem moves off-group values home).
 */
export function AddItemDrawer({ topic, groups, existing, item, onClose, onDone }: Props) {
  const add = useAddItem(topic.id);
  const update = useUpdateItem(topic.id, item?.topicItemId ?? 0);
  const save = item ? update : add;
  const [initial] = useState(() => (item ? draftFromItem(groups, item) : { draft: emptyDraft(groups), moved: [], dropped: [] }));
  const [draft, setDraft] = useState<ItemDraft>(() => structuredClone(initial.draft));
  const [showErrors, setShowErrors] = useState(false);
  const [lookup, setLookup] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  const errors = validateDraft(groups, draft);
  const word = draft.main?.[0]?.word ?? '';
  const dup = duplicateOf(existing.filter((s) => s.id !== item?.topicItemId), word);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.draft);

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
    save.mutate(toCreatePayload(groups, draft), { onSuccess: () => onDone(word.trim()) });
  };
  const close = () => { if (!dirty || window.confirm(item ? 'Bỏ các thay đổi chưa lưu?' : 'Bỏ mục từ đang nhập?')) onClose(); };

  return (
    <Drawer
      title={item ? `Sửa mục từ "${word || '—'}"` : `Thêm mục từ vào ${topic.name}`}
      subtitle={item ? 'Lưu thay toàn bộ giá trị của mục; người học thấy bản mới ngay, tiến độ ôn giữ nguyên.' : 'Người học thấy mục này ngay sau khi lưu (chưa có Nháp/Phát hành).'}
      busy={save.isPending}
      onClose={close}
      footer={<>
        <Button onClick={close} disabled={save.isPending} data-autofocus>Hủy</Button>
        {item
          ? <Button variant="primary" icon={<Save />} loading={save.isPending} loadingText="Đang lưu…" onClick={submit}>Lưu mục từ</Button>
          : <Button variant="primary" icon={<Plus />} loading={save.isPending} loadingText="Đang lưu…" onClick={submit}>Thêm vào chủ đề</Button>}
      </>}
    >
      {initial.moved.length > 0 && (
        <p role="note" className="rounded-lg border border-info/30 bg-info-light px-3 py-2 text-xs text-info-dark">
          Dữ liệu lệch nhóm sẽ được lưu về đúng thuộc tính của schema: {initial.moved.join(', ')}.
        </p>
      )}
      {initial.dropped.length > 0 && (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning-light px-3 py-2 text-xs text-warning-dark">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          <span>Các giá trị sau không có thuộc tính nào trong schema để chứa và sẽ mất khi lưu: {initial.dropped.join(', ')}.</span>
        </p>
      )}
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
      {save.isError && <p role="alert" className="rounded-lg bg-danger-light p-3 text-xs text-danger-dark">{item ? 'Không lưu được' : 'Không thêm được'}: {contentErrorText(save.error)}</p>}
    </Drawer>
  );
}
