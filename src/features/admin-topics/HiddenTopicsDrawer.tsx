import React from 'react';
import { AlertCircle, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button, Drawer } from '../../components/ui';
import { contentErrorText } from '../../domains/admin-content/mappers';
import { useRestoreTopic, type useHiddenTopics } from '../../domains/admin-content/queries';
import type { CollectionDTO, HiddenTopicDTO, TopicDTO } from '../../domains/admin-content/types';
import { formatDate } from '../../domains/admin-learners/mappers';

/**
 * "Đã ẩn" of one system collection (OQ-CNT-01): kept until an admin restores or purges a topic, never auto-deleted.
 * Purge only for a topic nobody studied and without subtopics (the server refuses otherwise).
 */
export function HiddenTopicsDrawer({ collection, query, onClose, onRestored, onPurge }: {
  collection: CollectionDTO; query: ReturnType<typeof useHiddenTopics>; onClose: () => void;
  onRestored: (name: string) => void; onPurge: (topic: TopicDTO) => void;
}) {
  const restore = useRestoreTopic(collection.id);
  const rows = query.data ?? [];
  const asTopic = (h: HiddenTopicDTO): TopicDTO => ({
    id: h.id, name: h.name, translation: h.translation, description: null, descriptionTranslation: null, parentId: h.parentId,
    activeTemplateId: null, activeTemplateName: null, activeTemplateCode: null, hasChildren: h.subtopics > 0, createdAt: '', updatedAt: '',
  });
  return (
    <Drawer title={`Chủ đề đã ẩn · ${collection.name}`} subtitle="Người học không thấy các chủ đề này; thẻ đã học vẫn được ôn. Giữ cho tới khi khôi phục hoặc xóa vĩnh viễn." onClose={onClose} width="lg">
      {query.isError && <p role="alert" className="flex items-center gap-2 text-sm text-danger-dark"><AlertCircle size={16} />Không tải được danh sách chủ đề đã ẩn.</p>}
      {query.isPending && <div className="h-24 animate-pulse rounded-lg bg-surface-subtle" />}
      {query.data && rows.length === 0 && <p className="text-sm text-text-muted">Collection này chưa có chủ đề nào bị ẩn.</p>}
      {restore.isError && <p role="alert" className="rounded-lg bg-danger-light p-3 text-xs text-danger-dark">{contentErrorText(restore.error)}</p>}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((h) => {
          const parentHidden = h.parentId !== null && rows.some((r) => r.id === h.parentId);
          const purgeBlock = h.learners > 0 ? `${h.learners} người học có dữ liệu học trong chủ đề này: chỉ ẩn, không xóa vĩnh viễn được.`
            : h.subtopics > 0 ? 'Còn chủ đề con: xóa vĩnh viễn các chủ đề con trước.' : null;
          return (
            <li key={h.id} className="space-y-1.5 px-3 py-2.5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-text">{h.parentName && <span className="font-normal text-text-muted">{h.parentName} › </span>}{h.name}
                    {h.translation && <span className="ml-1.5 font-normal text-text-muted">{h.translation}</span>}</p>
                  <p className="text-text-muted">Ẩn {formatDate(h.hiddenAt)}{h.hiddenBy ? ` bởi ${h.hiddenBy}` : ''} · {h.learners} người học có dữ liệu{h.subtopics > 0 ? ` · ${h.subtopics} chủ đề con ẩn cùng` : ''}</p>
                  {h.reason && <p className="text-text">Lý do: {h.reason}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" icon={<ArchiveRestore />} disabled={parentHidden || restore.isPending}
                    title={parentHidden ? 'Chủ đề cha đang ẩn: khôi phục chủ đề cha, chủ đề này hiện lại cùng nó' : undefined}
                    onClick={() => restore.mutate(h.id, { onSuccess: () => onRestored(h.name) })}>Khôi phục</Button>
                  <Button size="sm" variant="danger-outline" icon={<Trash2 />} disabled={Boolean(purgeBlock)} title={purgeBlock ?? undefined}
                    onClick={() => onPurge(asTopic(h))}>Xóa vĩnh viễn</Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
