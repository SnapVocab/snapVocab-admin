import React, { useState } from 'react';
import { ConfirmModal, Field, fieldControl } from '../../components/ui';
import { contentErrorText, nameError } from '../../domains/admin-content/mappers';
import {
  useCreateCollection, useCreateTopic, useDeleteCollection, useDeleteTopic, useHideTopic, useSchema, useSetTemplate, useTopicSchema,
  useUpdateCollection, useUpdateTopic,
} from '../../domains/admin-content/queries';
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

/**
 * New topic under `parent` (or at the root), or, with `topic`, edit that system topic's texts (PUT /api/admin/topics/{id}).
 * Schema and card template default to DEFAULT_ENGLISH on create; parent, schema and template do not change on edit.
 */
export function TopicDialog({ collection, parent, topic, onClose, onDone }: { collection: CollectionDTO; parent: TopicDTO | null; topic?: TopicDTO; onClose: () => void; onDone: (t: TopicDTO) => void }) {
  const create = useCreateTopic(collection.id);
  const update = useUpdateTopic(topic?.id ?? 0, collection.id);
  const m = topic ? update : create;
  const [form, setForm] = useState({ name: topic?.name ?? '', translation: topic?.translation ?? '', description: topic?.description ?? '', descriptionTranslation: topic?.descriptionTranslation ?? '' });
  const [touched, setTouched] = useState(false);
  const error = nameError(form.name);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blank = (v: string) => v.trim() || null;
  const submit = () => {
    setTouched(true);
    if (error) return;
    const body = { name: form.name.trim(), translation: blank(form.translation), description: blank(form.description), descriptionTranslation: blank(form.descriptionTranslation) };
    if (topic) update.mutate(body, { onSuccess: onDone });
    else create.mutate({ ...body, parentId: parent?.id ?? null }, { onSuccess: onDone });
  };
  return (
    <ConfirmModal title={topic ? `Sửa chủ đề ${topic.name}` : parent ? `Thêm chủ đề con trong ${parent.name}` : `Thêm chủ đề gốc vào ${collection.name}`} tone="primary"
      confirmLabel={topic ? 'Lưu' : 'Tạo chủ đề'} busy={m.isPending} maxWidth="lg" onClose={onClose} onConfirm={submit}
      description={topic ? 'Người học thấy tên và mô tả mới ngay. Mục từ, mẫu thẻ và tiến độ học giữ nguyên.' : 'Dùng schema DEFAULT_ENGLISH và mẫu thẻ mặc định; đổi mẫu thẻ sau khi tạo.'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên (tiếng Anh)" required error={touched ? error ?? undefined : undefined}>
          <input className={fieldControl} value={form.name} maxLength={100} onChange={set('name')} onBlur={() => setTouched(true)} />
        </Field>
        <Field label="Tên tiếng Việt"><input className={fieldControl} value={form.translation} onChange={set('translation')} /></Field>
        <Field label="Mô tả (tiếng Anh)"><textarea rows={2} className={fieldControl} value={form.description} onChange={set('description')} /></Field>
        <Field label="Mô tả tiếng Việt"><textarea rows={2} className={fieldControl} value={form.descriptionTranslation} onChange={set('descriptionTranslation')} /></Field>
      </div>
      {m.isError && <p role="alert" className="text-danger-dark">{contentErrorText(m.error)}</p>}
    </ConfirmModal>
  );
}

/**
 * POST /api/admin/topics/{id}/hide (OQ-CNT-01, PO 2026-11-26): the soft delete. The topic and its subtopics leave the
 * catalog, new cards, Quiz and AI stories; learners keep reviewing what they studied. Restorable from "Đã ẩn".
 */
export function HideTopicDialog({ collection, topic, onClose, onDone }: { collection: CollectionDTO; topic: TopicDTO; onClose: () => void; onDone: () => void }) {
  const hide = useHideTopic(topic.id, collection.id);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const n = reason.trim().length;
  const reasonError = n < 10 ? 'Tối thiểu 10 ký tự.' : n > 500 ? 'Tối đa 500 ký tự.' : null;
  return (
    <ConfirmModal title={`Ẩn chủ đề ${topic.name}?`} tone="danger" confirmLabel="Ẩn chủ đề" busy={hide.isPending} onClose={onClose}
      onConfirm={() => { setTouched(true); if (!reasonError) hide.mutate(reason.trim(), { onSuccess: onDone }); }}>
      <ul className="list-disc space-y-1 pl-4 text-text-muted">
        <li>Người học không còn thấy chủ đề{topic.hasChildren ? ' và các chủ đề con' : ''} trong danh mục; không học từ mới, không làm Quiz hay tạo truyện AI từ chủ đề này.</li>
        <li>Thẻ người học đã học vẫn được ôn theo lịch; tiến độ, streak và XP giữ nguyên.</li>
        <li>Khôi phục bất cứ lúc nào ở mục "Đã ẩn". Không có gì bị xóa.</li>
      </ul>
      <Field label="Lý do" required error={touched ? reasonError ?? undefined : undefined} hint="10–500 ký tự, hiện trong mục Đã ẩn và nhật ký hoạt động.">
        <textarea rows={2} maxLength={500} className={fieldControl} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} />
      </Field>
      {hide.isError && <p role="alert" className="text-danger-dark">{contentErrorText(hide.error)}</p>}
    </ConfirmModal>
  );
}

/**
 * DELETE /api/admin/topics/{id}: purge, offered from "Đã ẩn". Only a topic without subtopics that no learner studied
 * (else 409, nothing changes). The topic and all its items go for good; the reason goes to the activity log.
 */
export function DeleteTopicDialog({ collection, topic, itemCount, onClose, onDone }: { collection: CollectionDTO; topic: TopicDTO; itemCount: number | null; onClose: () => void; onDone: () => void }) {
  const del = useDeleteTopic(topic.id, collection.id);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const n = reason.trim().length;
  const reasonError = n < 10 ? 'Tối thiểu 10 ký tự.' : n > 500 ? 'Tối đa 500 ký tự.' : null;
  const hasChildren = Boolean(topic.hasChildren);
  return (
    <ConfirmModal title={`Xóa chủ đề ${topic.name}?`} tone="danger" confirmLabel="Xóa vĩnh viễn" busy={del.isPending}
      confirmDisabled={hasChildren} onClose={onClose}
      onConfirm={() => { setTouched(true); if (!reasonError) del.mutate(reason.trim(), { onSuccess: onDone }); }}>
      {hasChildren ? (
        <p className="rounded-lg bg-warning-light p-3 text-warning-dark">Chủ đề còn chủ đề con. Xóa các chủ đề con trước.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-4 text-text-muted">
          <li>Xóa chủ đề{itemCount !== null ? ` và ${itemCount} mục từ` : ' và mọi mục từ'} của nó, không hoàn tác được.</li>
          <li>Nếu đã có người học học chủ đề này (thẻ ôn, Quiz, truyện AI), máy chủ từ chối và không xóa gì.</li>
          <li>Từ người học đã lưu vào chủ đề riêng của họ là bản sao, không bị ảnh hưởng.</li>
        </ul>
      )}
      <Field label="Lý do" required error={touched ? reasonError ?? undefined : undefined} hint="10–500 ký tự, ghi vào nhật ký hoạt động.">
        <textarea rows={2} maxLength={500} className={fieldControl} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} disabled={hasChildren} />
      </Field>
      {del.isError && <p role="alert" className="text-danger-dark">{contentErrorText(del.error)}</p>}
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
      description="Đổi trường mà Quiz của chủ đề này lấy làm từ, nghĩa và ví dụ. Thẻ học trên ứng dụng vẫn vẽ bằng mẫu mặc định của schema (màn Mẫu thẻ). Mục từ và tiến độ học giữ nguyên.">
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
