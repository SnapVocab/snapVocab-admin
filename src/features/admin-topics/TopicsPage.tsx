import React, { useState } from 'react';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, PageHeader } from '../../components/ui';
import { useSystemCollections, useTopics } from '../../domains/admin-content/queries';
import type { ItemSummary } from '../../domains/admin-content/mappers';
import type { CollectionDTO, SchemaAttributeGroupDTO, TopicDTO } from '../../domains/admin-content/types';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { TopicTree } from './TopicTree';
import { TopicDetail } from './TopicDetail';
import { AddItemDrawer } from './AddItemDrawer';
import { CollectionDialog, DeleteCollectionDialog, TemplateDialog, TopicDialog } from './dialogs';
import { useToast } from '../../components/ui/Toast';

type Dialog =
  | { kind: 'collection'; collection?: CollectionDTO }
  | { kind: 'deleteCollection' }
  | { kind: 'topic'; parent: TopicDTO | null }
  | { kind: 'template'; topic: TopicDTO }
  | { kind: 'item'; topic: TopicDTO; groups: SchemaAttributeGroupDTO[]; existing: ItemSummary[] };

const num = (s?: string) => (s && /^\d+$/.test(s) ? Number(s) : null);

/**
 * `rest` = route segments after /topics: [collectionId, rootId?, childId?], so F5 and shared links reopen the topic.
 * NOW scope: real collections/topics/items endpoints; edit/delete of topics and items are shown as "cần API".
 */
export function TopicsPage({ rest }: { rest: string[] }) {
  const collections = useSystemCollections();
  const list = collections.data ?? [];
  const collection = list.find((c) => c.id === num(rest[0])) ?? list[0] ?? null;
  const rootId = collection && num(rest[0]) === collection.id ? num(rest[1]) : null;
  const childId = rootId ? num(rest[2]) : null;
  const roots = useTopics(collection?.id ?? null, null);
  const kids = useTopics(collection?.id ?? null, rootId, rootId !== null);
  const root = roots.data?.data.find((t) => t.id === rootId) ?? null;
  const child = kids.data?.data.find((t) => t.id === childId) ?? null;
  const topic = child ?? root;

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { show: flash, node: toastNode } = useToast();
  const go = (c: CollectionDTO | null, r?: TopicDTO | null, ch?: TopicDTO | null) =>
    navigate(['/topics', c?.id, r?.id, ch?.id].filter((x) => x !== undefined && x !== null).join('/'));

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      {toastNode}
      <PageHeader title="Chủ đề"
        description="Nội dung hệ thống mà người học duyệt và lưu. Sửa hoặc xóa chủ đề và mục từ chưa có API nên đang bị khóa."
        actions={<Button icon={<Plus />} onClick={() => setDialog({ kind: 'collection' })}>Tạo collection</Button>} />

      {collections.isError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-body text-danger-dark">
          <span className="flex items-center gap-2"><AlertCircle size={16} />Không tải được danh sách collection.</span>
          <Button size="sm" onClick={() => void collections.refetch()}>Thử lại</Button>
        </div>
      )}

      {/* COLLECTIONS — system collections as tabs; actions apply to the selected one. */}
      {list.length > 0 && collection && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Collection hệ thống" className="inline-flex flex-wrap rounded-lg border border-border bg-surface p-0.5">
            {list.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={c.id === collection.id} onClick={() => go(c)}
                className={cn('h-8 rounded-md px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', c.id === collection.id ? 'bg-text text-white' : 'text-text-muted hover:text-text')}>
                {c.name}{c.translation && <span className={cn('ml-1.5 text-xs font-normal', c.id === collection.id ? 'text-white/70' : 'text-text-light')}>{c.translation}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" icon={<Pencil />} onClick={() => setDialog({ kind: 'collection', collection })}>Đổi tên</Button>
            <Button size="sm" variant="danger-outline" icon={<Trash2 />} onClick={() => setDialog({ kind: 'deleteCollection' })}>Xóa</Button>
          </div>
        </div>
      )}

      {collection && (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-11rem)]">
            <TopicTree key={collection.id} collectionId={collection.id} rootId={rootId} childId={childId}
              onOpen={(r, c) => go(collection, r, c)} onAdd={(parent) => setDialog({ kind: 'topic', parent })} />
          </div>
          {topic ? (
            <TopicDetail key={topic.id} collection={collection} topic={topic} parent={child ? root : null}
              onOpenChild={(c) => go(collection, root, c)}
              onAddItem={(groups, existing) => setDialog({ kind: 'item', topic, groups, existing })}
              onAddChild={() => setDialog({ kind: 'topic', parent: topic })}
              onChangeTemplate={() => setDialog({ kind: 'template', topic })} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border-strong text-sm text-text-muted">
              {rootId && (roots.isPending || kids.isPending) ? 'Đang mở chủ đề…' : 'Chọn một chủ đề ở cây bên trái.'}
            </div>
          )}
        </div>
      )}

      {dialog?.kind === 'collection' && (
        <CollectionDialog collection={dialog.collection} onClose={() => setDialog(null)}
          onDone={(c) => { setDialog(null); flash(dialog.collection ? 'Đã đổi tên collection.' : 'Đã tạo collection.'); if (!dialog.collection) go(c); }} />
      )}
      {dialog?.kind === 'deleteCollection' && collection && (
        <DeleteCollectionDialog collection={collection} rootCount={roots.data?.meta.total ?? 1} onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); flash('Đã xóa collection.'); go(null); }} />
      )}
      {dialog?.kind === 'topic' && collection && (
        <TopicDialog collection={collection} parent={dialog.parent} onClose={() => setDialog(null)}
          onDone={(t) => { setDialog(null); flash('Đã tạo chủ đề.'); go(collection, dialog.parent ?? t, dialog.parent ? t : null); }} />
      )}
      {dialog?.kind === 'template' && collection && (
        <TemplateDialog topic={dialog.topic} collectionId={collection.id} onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); flash('Đã đổi mẫu thẻ.'); }} />
      )}
      {dialog?.kind === 'item' && (
        <AddItemDrawer topic={dialog.topic} groups={dialog.groups} existing={dialog.existing} onClose={() => setDialog(null)}
          onDone={(w) => { setDialog(null); flash(`Đã thêm "${w}".`); }} />
      )}
    </div>
  );
}
