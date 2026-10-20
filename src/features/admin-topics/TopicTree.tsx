import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { Button, toolbarControl } from '../../components/ui';
import { useTopics } from '../../domains/admin-content/queries';
import type { TopicDTO } from '../../domains/admin-content/types';
import { cn, foldVi } from '../../lib/utils';

interface TreeProps {
  collectionId: number;
  rootId: number | null;
  childId: number | null;
  onOpen: (root: TopicDTO, child?: TopicDTO) => void;
  onAdd: (parent: TopicDTO | null) => void;
}

const matches = (t: TopicDTO, q: string) => !q || foldVi(`${t.name} ${t.translation ?? ''}`).includes(foldVi(q));

function Node({ topic, depth, selected, open, onToggle, onOpen, onAdd }: {
  topic: TopicDTO; depth: number; selected: boolean; open?: boolean; onToggle?: () => void; onOpen: () => void; onAdd?: () => void;
}) {
  return (
    <div className={cn('group flex items-center gap-1 rounded-md pr-1', selected ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/70')} style={{ paddingLeft: depth * 16 }}>
      {onToggle ? (
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Thu gọn' : 'Mở'} ${topic.name}`} className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : <span className="w-[22px]" />}
      <button type="button" onClick={onOpen} aria-current={selected ? 'true' : undefined} className="min-w-0 flex-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info rounded">
        <span className={cn('block truncate text-body', selected ? 'font-semibold text-text' : 'text-text')}>{topic.name}</span>
        {topic.translation && <span className="block truncate text-xs text-text-muted">{topic.translation}</span>}
      </button>
      {onAdd && (
        <button type="button" onClick={onAdd} aria-label={`Thêm chủ đề con trong ${topic.name}`} title="Thêm chủ đề con" className="rounded p-1 text-text-muted opacity-0 hover:text-text focus-visible:opacity-100 group-hover:opacity-100">
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

/** Real content is two levels deep (part of speech → topic), so children get no "add child" of their own. */
function Children({ collectionId, parent, childId, q, onOpen }: { collectionId: number; parent: TopicDTO; childId: number | null; q: string; onOpen: (c: TopicDTO) => void }) {
  const kids = useTopics(collectionId, parent.id);
  if (kids.isPending) return <p className="py-1 pl-10 text-xs text-text-muted">Đang tải…</p>;
  if (kids.isError) return <p className="py-1 pl-10 text-xs text-danger-dark">Không tải được chủ đề con.</p>;
  const shown = kids.data.data.filter((t) => matches(t, q) || matches(parent, q));
  return <>{shown.map((c) => <Node key={c.id} topic={c} depth={1} selected={c.id === childId} onOpen={() => onOpen(c)} />)}</>;
}

/** Collection → root topics → children (lazy). Real data from GET /api/collections/{id}/topics?parentId=. */
export function TopicTree({ collectionId, rootId, childId, onOpen, onAdd }: TreeProps) {
  const roots = useTopics(collectionId, null);
  const [open, setOpen] = useState<Set<number>>(() => new Set(rootId ? [rootId] : []));
  const [q, setQ] = useState('');
  const toggle = (id: number) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // A deep link to a child opens its root.
  if (rootId && childId && !open.has(rootId)) setOpen((s) => new Set(s).add(rootId));

  return (
    <nav aria-label="Cây chủ đề" className="flex min-h-0 flex-col rounded-lg border border-border bg-surface">
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text">Chủ đề {roots.data && <span className="font-normal text-text-muted">{roots.data.meta.total} gốc</span>}</span>
          <Button size="sm" variant="ghost" icon={<Plus />} label="Thêm chủ đề gốc" onClick={() => onAdd(null)} />
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
          <input type="search" aria-label="Lọc chủ đề" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lọc tên chủ đề…" className={`${toolbarControl} h-8 w-full pl-8 text-xs`} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {roots.isPending && Array.from({ length: 8 }, (_, i) => <div key={i} className="m-1 h-8 animate-pulse rounded bg-surface-subtle" />)}
        {roots.isError && <p className="p-3 text-xs text-danger-dark">Không tải được danh sách chủ đề.</p>}
        {roots.data?.data.length === 0 && <p className="p-3 text-xs text-text-muted">Collection chưa có chủ đề nào.</p>}
        {roots.data?.data.map((r) => (
          <div key={r.id}>
            {(matches(r, q) || open.has(r.id)) && (
              <Node topic={r} depth={0} selected={r.id === rootId && !childId} open={open.has(r.id)}
                onToggle={r.hasChildren ? () => toggle(r.id) : undefined} onOpen={() => onOpen(r)} onAdd={() => onAdd(r)} />
            )}
            {open.has(r.id) && <Children collectionId={collectionId} parent={r} childId={r.id === rootId ? childId : null} q={q} onOpen={(c) => onOpen(r, c)} />}
          </div>
        ))}
        {roots.data && roots.data.meta.total > roots.data.data.length && (
          <p className="p-2 text-xs text-warning-dark">Đang hiện {roots.data.data.length}/{roots.data.meta.total} chủ đề gốc.</p>
        )}
      </div>
    </nav>
  );
}
