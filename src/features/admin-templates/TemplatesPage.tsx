import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button, SourceError } from '../../components/ui';
import { useTopicItems, useTopicSchema } from '../../domains/admin-content/queries';
import { templatesEditable } from '../../domains/admin-templates/config';
import { topicsByTemplate } from '../../domains/admin-templates/mappers';
import { useSystemTopics, useTemplateSchemas } from '../../domains/admin-templates/queries';
import { navigate } from '../../lib/router';
import { ErrorBanner } from '../admin-missions/components';
import { TemplateEditor } from './TemplateEditor';
import { TemplateLibrary, type PreviewState } from './TemplateLibrary';
import { templateErrorMessage } from './ui';

const NONE: Record<string, unknown>[] = [];

function Loading() {
  return <div role="status" aria-label="Đang tải mẫu thẻ" className="space-y-3 rounded-lg border border-border bg-surface p-4">
    {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-subtle motion-reduce:animate-none" />)}
  </div>;
}

/**
 * `/templates` = library, `/templates/:id` = one template (deep link, F5 reopens it). The library stays mounted under
 * the editor, so its filter, scroll and the preview word survive the round trip.
 */
export function TemplatesPage({ sub, onDirtyChange = () => {} }: { sub?: string; onDirtyChange?: (dirty: boolean) => void }) {
  const openId = sub && /^\d+$/.test(sub) ? Number(sub) : null;
  const schemas = useTemplateSchemas();
  const system = useSystemTopics();
  const [pickedTopic, setPickedTopic] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const opener = useRef<HTMLElement | null>(null);

  // Default preview: the first child of the first root, the first topic that holds words.
  const first = system.branches.find((b) => b.children.length)?.children[0] ?? system.branches[0]?.root ?? null;
  const topic = system.topics.find((t) => t.id === pickedTopic) ?? first;
  const items = useTopicItems(topic?.id ?? null);
  const topicSchema = useTopicSchema(topic?.id ?? null);
  const list = items.data?.data ?? NONE;
  const preview: PreviewState = {
    branches: system.branches,
    topic,
    schemaId: topicSchema.data?.schemaId ?? null,
    items: list,
    index: Math.min(index, Math.max(0, list.length - 1)),
    loading: items.isPending || topicSchema.isPending,
    setTopic: (id) => { setPickedTopic(id); setIndex(0); },
    setIndex,
  };

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = openId === null ? listScroll.current : 0;
    if (openId === null && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  }, [openId]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const all = useMemo(() => schemas.data ?? [], [schemas.data]);
  const byTemplate = useMemo(() => topicsByTemplate(system.topics), [system.topics]);
  const owner = openId === null ? undefined : all.find((s) => s.templates.some((t) => t.id === openId));
  const template = owner?.templates.find((t) => t.id === openId);
  const forks = all.filter((s) => !s.isSystem).length;
  const topicsReady = !system.isPending && !system.isError;

  const back = useCallback(() => navigate('/templates'), []);
  const open = (id: number, button: HTMLElement) => {
    listScroll.current = scroller.current?.scrollTop ?? 0;
    opener.current = button;
    navigate(`/templates/${id}`);
  };
  const refresh = () => { void schemas.refetch(); system.refetch(); void items.refetch(); };

  return <div ref={scroller} className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
    {toast && <div role="status" className="fixed right-6 top-6 z-40 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-xs font-medium text-text shadow-elevated"><Check size={16} className="text-primary-dark" />{toast}</div>}

    {schemas.isError && <ErrorBanner message={`${schemas.data ? 'Đang hiển thị dữ liệu đã tải trước đó. ' : 'Không tải được mẫu thẻ. '}${templateErrorMessage(schemas.error)}`}>
      <Button size="sm" disabled={schemas.isFetching} onClick={() => void schemas.refetch()}>Thử lại</Button>
    </ErrorBanner>}
    {system.isError && <SourceError what="danh sách chủ đề (số chủ đề đang dùng mẫu)" onRetry={system.refetch} />}
    {items.isError && <SourceError what="mục từ của chủ đề xem thử" onRetry={() => void items.refetch()} />}

    <div hidden={openId !== null} className="space-y-4">
      {schemas.isPending ? <Loading /> : schemas.data && <TemplateLibrary schemas={all} topics={system.topics} topicsReady={topicsReady} preview={preview}
        updatedAt={schemas.dataUpdatedAt} refreshing={schemas.isFetching} onRefresh={refresh} onOpen={open} />}
    </div>

    {openId !== null && (schemas.isPending ? <Loading /> : !template || !owner ? (
      <div className="space-y-3">
        <Button icon={<ArrowLeft />} onClick={back}>Quay lại danh sách</Button>
        {schemas.data && <p className="rounded-lg bg-info-light p-3 text-xs text-info-dark">Không tìm thấy mẫu thẻ #{openId}.</p>}
      </div>
    ) : (
      <TemplateEditor key={template.id} template={template} schema={owner} quizTopics={byTemplate.get(template.id) ?? []} topicsReady={topicsReady}
        systemTopics={system.topics.length} forks={forks} preview={preview} editable={templatesEditable} refreshing={schemas.isFetching}
        onRefresh={refresh} onBack={back} onSaved={setToast} onDirtyChange={onDirtyChange} />
    ))}
  </div>;
}
