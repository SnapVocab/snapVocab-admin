import React, { useState } from 'react';
import { ConfirmModal, Field, fieldControl } from '../../components/ui';
import { nameError } from '../../domains/admin-content/mappers';
import { useCreateCollection, useCreateTopic, useDeleteCollection, useSchema, useSetTemplate, useTopicSchema, useUpdateCollection } from '../../domains/admin-content/queries';
import type { CollectionDTO, TopicDTO } from '../../domains/admin-content/types';
import { ApiClientError } from '../../lib/api-client';

const errorText = (e: unknown) =>
  e instanceof ApiClientError && e.statusCode === 403 ? 'Tài khoản không có quyền quản trị (ROLE_ADMIN).' : e instanceof Error ? e.message : 'Thao tác thất bại.';

/** Create (no `collection`) or rename a system collection. */
export function CollectionDialog({ collection, onClose, onDone }: { collection?: CollectionDTO; onClose: () => void; onDone: (c: CollectionDTO) => void }) {
  const create = useCreateCollection();
  const update = useUpdateCollection(collection?.id ?? 0);
  const m = collection ? update : create;
  const [name, setName] = useState(collection?.name ?? '');
  const [translation, setTranslation] = useState(collection?.translation ?? '');
  const [touched, setTouched] = useState(false);
  const error = nameError(name);
  const submit = () => {
    setTouched(true);
    if (error) return;
    const body = { name: name.trim(), translation: translation.trim() || null };
    if (collection) update.mutate(body, { onSuccess: onDone });
    else create.mutate({ ...body, type: 'SYSTEM' }, { onSuccess: onDone });
  };
  return (
    <ConfirmModal title={collection ? `Đổi tên ${collection.name}` : 'Tạo collection hệ thống'} tone="primary"
      confirmLabel={collection ? 'Lưu' : 'Tạo collection'} busy={m.isPending} onClose={onClose} onConfirm={submit}
      description={collection ? undefined : 'Collection hệ thống hiện cho mọi người học trong mục Chủ đề.'}>
      <Field label="Tên (tiếng Anh)" required error={touched ? error ?? undefined : undefined} hint="2–100 ký tự. VD: Animals">
        <input className={fieldControl} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
      </Field>
      <Field label="Tên tiếng Việt" hint="Người học thấy dòng này bên dưới tên.">
        <input className={fieldControl} value={translation} onChange={(e) => setTranslation(e.target.value)} />
      </Field>
      {m.isError && <p role="alert" className="text-danger-dark">{errorText(m.error)}</p>}
    </ConfirmModal>
  );
}

/**
 * The backend deletes a collection HARD, cascading to every topic and item (not the soft delete the spec asks for).
 * Until that changes, only an empty collection may be deleted from here.
 */
export function DeleteCollectionDialog({ collection, rootCount, onClose, onDone }: { collection: CollectionDTO; rootCount: number; onClose: () => void; onDone: () => void }) {
  const del = useDeleteCollection(collection.id);
  const blocked = rootCount > 0;
  return (
    <ConfirmModal title={`Xóa ${collection.name}?`} tone="danger" confirmLabel="Xóa vĩnh viễn" busy={del.isPending} confirmDisabled={blocked}
      onClose={onClose} onConfirm={() => del.mutate(undefined, { onSuccess: onDone })}>
      {blocked ? (
        <p className="rounded-lg bg-warning-light p-3 text-warning-dark">
          Collection còn {rootCount} chủ đề gốc. Backend hiện <strong>xóa cứng</strong> kèm toàn bộ chủ đề và mục từ (không phải xóa mềm như spec), nên chỉ cho xóa collection rỗng. Cần API xóa mềm.
        </p>
      ) : (
        <p className="text-text-muted">Collection không có chủ đề nào. Xóa không hoàn tác được.</p>
      )}
      {del.isError && <p role="alert" className="text-danger-dark">{errorText(del.error)}</p>}
    </ConfirmModal>
  );
}

/** New topic under `parent` (or at the root). Schema and card template default to DEFAULT_ENGLISH on the backend. */
export function TopicDialog({ collection, parent, onClose, onDone }: { collection: CollectionDTO; parent: TopicDTO | null; onClose: () => void; onDone: (t: TopicDTO) => void }) {
  const create = useCreateTopic(collection.id);
  const [form, setForm] = useState({ name: '', translation: '', description: '', descriptionTranslation: '' });
  const [touched, setTouched] = useState(false);
  const error = nameError(form.name);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blank = (v: string) => v.trim() || null;
  return (
    <ConfirmModal title={parent ? `Thêm chủ đề con trong ${parent.name}` : `Thêm chủ đề gốc vào ${collection.name}`} tone="primary"
      confirmLabel="Tạo chủ đề" busy={create.isPending} maxWidth="lg" onClose={onClose}
      onConfirm={() => { setTouched(true); if (!error) create.mutate({ name: form.name.trim(), translation: blank(form.translation), description: blank(form.description), descriptionTranslation: blank(form.descriptionTranslation), parentId: parent?.id ?? null }, { onSuccess: onDone }); }}
      description="Dùng schema DEFAULT_ENGLISH và mẫu thẻ mặc định; đổi mẫu thẻ sau khi tạo.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên (tiếng Anh)" required error={touched ? error ?? undefined : undefined}>
          <input className={fieldControl} value={form.name} maxLength={100} onChange={set('name')} onBlur={() => setTouched(true)} />
        </Field>
        <Field label="Tên tiếng Việt"><input className={fieldControl} value={form.translation} onChange={set('translation')} /></Field>
        <Field label="Mô tả (tiếng Anh)"><textarea rows={2} className={fieldControl} value={form.description} onChange={set('description')} /></Field>
        <Field label="Mô tả tiếng Việt"><textarea rows={2} className={fieldControl} value={form.descriptionTranslation} onChange={set('descriptionTranslation')} /></Field>
      </div>
      {create.isError && <p role="alert" className="text-danger-dark">{errorText(create.error)}</p>}
    </ConfirmModal>
  );
}

/** Pick the card template among the templates of the topic's schema (PUT /api/topics/{id}/active-template/{templateId}). */
export function TemplateDialog({ topic, collectionId, onClose, onDone }: { topic: TopicDTO; collectionId: number; onClose: () => void; onDone: () => void }) {
  const topicSchema = useTopicSchema(topic.id);
  const schema = useSchema(topicSchema.data?.schemaId);
  const setTemplate = useSetTemplate(topic.id, collectionId);
  const [picked, setPicked] = useState<number | null>(topic.activeTemplateId);
  const templates = schema.data?.templates ?? [];
  return (
    <ConfirmModal title={`Mẫu thẻ của ${topic.name}`} tone="primary" confirmLabel="Áp dụng" busy={setTemplate.isPending}
      confirmDisabled={!picked || picked === topic.activeTemplateId} onClose={onClose}
      onConfirm={() => picked && setTemplate.mutate(picked, { onSuccess: onDone })}
      description="Đổi cách người học thấy thẻ của mọi mục trong chủ đề này. Mục từ và tiến độ học giữ nguyên.">
      {schema.isPending || topicSchema.isPending ? <p className="text-text-muted">Đang tải mẫu thẻ…</p> : templates.length === 0 ? (
        <p className="text-text-muted">Schema của chủ đề chưa có mẫu thẻ nào.</p>
      ) : (
        <div role="radiogroup" aria-label="Mẫu thẻ" className="space-y-1.5">
          {templates.map((t) => (
            <label key={t.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 ${picked === t.id ? 'border-primary-solid bg-primary-light' : 'border-border'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="template" checked={picked === t.id} onChange={() => setPicked(t.id)} className="accent-primary-solid" />
                <span className="font-semibold">{t.name}</span>
                {t.code && <span className="font-mono text-2xs text-text-muted">{t.code}</span>}
              </span>
              {t.id === topic.activeTemplateId && <span className="text-xs font-semibold text-primary-dark">Đang dùng</span>}
            </label>
          ))}
        </div>
      )}
      {setTemplate.isError && <p role="alert" className="text-danger-dark">{errorText(setTemplate.error)}</p>}
    </ConfirmModal>
  );
}
