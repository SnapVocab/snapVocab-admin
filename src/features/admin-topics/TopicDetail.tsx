import React, { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronRight, FolderPlus, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge, Button, Drawer, SectionLabel, StatCell, StripCell, SummaryStrip, toolbarControl } from '../../components/ui';
import { coverage, duplicateWords, GAP_LABEL, itemGaps, itemSummary, offSchemaFields, type Gap, type ItemSummary } from '../../domains/admin-content/mappers';
import { useTopicItems, useTopics, useTopicSchema } from '../../domains/admin-content/queries';
import type { AttrValues, CollectionDTO, SchemaAttributeGroupDTO, TopicDTO, TopicItemData } from '../../domains/admin-content/types';
import { formatDate } from '../../domains/admin-learners/mappers';
import { cn, foldVi } from '../../lib/utils';

/** Actions the UI is designed for but the backend does not expose yet (design.md §4.1). */
const NEEDS_API = {
  editTopic: 'Cần API PUT /api/topics/{id} (máy chủ chưa có)',
  deleteTopic: 'Cần API xóa mềm chủ đề (máy chủ chưa có)',
  draft: 'Cần trường trạng thái Nháp/Phát hành ở máy chủ',
  editItem: 'Cần API PUT /api/topics/{topicId}/items/{itemId} (máy chủ chưa có)',
  deleteItem: 'Cần API DELETE mục từ (máy chủ chưa có)',
};
const GAP_DOT: Record<Gap, string> = { meaning: 'bg-danger', translation: 'bg-warning', phonetic: 'bg-neutral-400', example: 'bg-info' };
type Filter = Gap | 'COMPLETE' | 'DUP' | 'OFF' | 'ALL';
/** Short strip labels so all eight numbers fit beside the tree; full wording stays in GAP_LABEL (tooltips, rows). */
const SHORT: Record<Gap, string> = { meaning: 'Thiếu nghĩa', translation: 'Thiếu dịch', phonetic: 'Thiếu IPA', example: 'Thiếu ví dụ' };

interface Props {
  collection: CollectionDTO;
  topic: TopicDTO;
  parent: TopicDTO | null;
  onOpenChild: (child: TopicDTO) => void;
  onAddItem: (groups: SchemaAttributeGroupDTO[], existing: ItemSummary[]) => void;
  onAddChild: () => void;
  onChangeTemplate: () => void;
}

export function TopicDetail({ collection, topic, parent, onOpenChild, onAddItem, onAddChild, onChangeTemplate }: Props) {
  const items = useTopicItems(topic.id);
  const schema = useTopicSchema(topic.id);
  const children = useTopics(collection.id, topic.id, !!topic.hasChildren);
  const [gap, setGap] = useState<Filter>('ALL');
  const [level, setLevel] = useState('ALL');
  const [q, setQ] = useState('');
  const [inspect, setInspect] = useState<TopicItemData | null>(null);

  const groups = schema.data?.groups ?? [];
  const rows = useMemo(
    () => (items.data?.data ?? []).map((raw) => ({ raw, s: itemSummary(raw), off: offSchemaFields(raw, schema.data?.groups ?? []) })),
    [items.data, schema.data],
  );
  const cov = coverage(rows.map((r) => r.s));
  const dups = duplicateWords(rows.map((r) => r.s));
  const isDup = (s: ItemSummary) => dups.has(s.word.trim().toLowerCase());
  const offCount = rows.filter((r) => r.off.length).length;
  const offFields = [...new Set(rows.flatMap((r) => r.off))];
  const toggle = (f: Filter) => setGap(gap === f ? 'ALL' : f);
  const levels = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(({ s }) => s.level && counts.set(s.level, (counts.get(s.level) ?? 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  const needle = foldVi(q.trim());
  const visible = rows.filter(({ s, off }) => {
    const gaps = itemGaps(s);
    const pass = gap === 'ALL' || (gap === 'COMPLETE' ? gaps.length === 0 : gap === 'DUP' ? isDup(s) : gap === 'OFF' ? off.length > 0 : gaps.includes(gap));
    return pass
      && (level === 'ALL' || s.level === level)
      && (!needle || foldVi(`${s.word} ${s.translation ?? ''}`).includes(needle));
  });
  const isRoot = parent === null;

  return (
    <div className="min-w-0 space-y-4">
      {/* HEADER — what this topic is, how learners see it, and what can be done to it. */}
      <header className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span>{collection.name}</span>
          {parent && <><ChevronRight size={12} /><span>{parent.name}</span></>}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{topic.name}{topic.translation && <span className="ml-2 text-base font-normal text-text-muted">{topic.translation}</span>}</h2>
            {(topic.description || topic.descriptionTranslation) && <p className="mt-1 max-w-3xl text-body text-text-muted">{topic.descriptionTranslation ?? topic.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="text-text-muted" title={NEEDS_API.draft}>Người học đang thấy chủ đề này</span>
              <button type="button" onClick={onChangeTemplate} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-medium text-text hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
                <Layers size={12} />Mẫu thẻ: {topic.activeTemplateName ?? 'chưa gán'} <span className="ml-1 text-text-muted underline">Đổi</span>
              </button>
              {schema.data?.schemaName && <span className="text-text-muted">Schema {schema.data.schemaName}{schema.data.shared && `, dùng chung ${schema.data.usageCount} chủ đề`}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Pencil />} disabled title={NEEDS_API.editTopic}>Sửa</Button>
            <Button size="sm" variant="danger-outline" icon={<Trash2 />} disabled title={NEEDS_API.deleteTopic}>Xóa</Button>
            {isRoot && <Button size="sm" icon={<FolderPlus />} onClick={onAddChild}>Thêm chủ đề con</Button>}
            <Button size="sm" variant="primary" icon={<Plus />} disabled={!groups.length} onClick={() => onAddItem(groups, rows.map((r) => r.s))}>Thêm mục từ</Button>
          </div>
        </div>
      </header>

      {/* CHILD TOPICS — part-of-speech roots hold topics, not items. */}
      {topic.hasChildren && (
        <section className="space-y-2 rounded-lg border border-border bg-surface p-4">
          <SectionLabel>{`Chủ đề con${children.data ? ` (${children.data.meta.total})` : ''}`}</SectionLabel>
          {children.isPending ? <div className="h-16 animate-pulse rounded bg-surface-subtle" /> : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {children.data?.data.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onOpenChild(c)} className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
                    <span className="min-w-0"><span className="block truncate text-body font-medium">{c.name}</span><span className="block truncate text-xs text-text-muted">{c.translation ?? '—'}<span className="text-text-light"> · {c.activeTemplateName ?? 'chưa gán mẫu'}</span></span></span>
                    <ChevronRight size={14} className="shrink-0 text-text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ITEMS — coverage strip doubles as filter; level distribution comes from the items themselves. */}
      {items.isError ? (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-body text-danger-dark">
          <span className="flex items-center gap-2"><AlertCircle size={16} />Không tải được mục từ của chủ đề.</span>
          <Button size="sm" onClick={() => void items.refetch()}>Thử lại</Button>
        </div>
      ) : items.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-surface-subtle" />
      ) : (rows.length > 0 || !topic.hasChildren) && (
        <>
          <SummaryStrip label="Độ phủ dữ liệu của mục từ">
            <StatCell value={items.data.meta.total.toLocaleString('vi-VN')} label="Mục từ" />
            <StripCell value={cov.complete} label="Đủ dữ liệu" dot="bg-primary" active={gap === 'COMPLETE'} onClick={() => toggle('COMPLETE')} />
            {(Object.keys(GAP_LABEL) as Gap[]).map((g) => (
              <StripCell key={g} value={cov.by[g]} label={SHORT[g]} dot={GAP_DOT[g]} active={gap === g} onClick={() => toggle(g)} />
            ))}
            <StripCell value={rows.filter((r) => isDup(r.s)).length} label="Trùng" dot="bg-snapy" active={gap === 'DUP'} onClick={() => toggle('DUP')} />
            <StripCell value={offCount} label="Lệch schema" dot="bg-text" active={gap === 'OFF'} onClick={() => toggle('OFF')} />
          </SummaryStrip>

          {offCount > 0 && (
            <p role="note" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-light px-3 py-2 text-xs text-warning-dark">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              <span>
                {offCount} mục lưu giá trị ở thuộc tính không có trong schema {schema.data?.schemaName} ({offFields.join(', ')}). App vẫn nhận qua API, nhưng form và kiểm tra theo schema không thấy.
                Cần backend chuyển dữ liệu về đúng thuộc tính (VD <code className="font-mono">main.meaning</code> → <code className="font-mono">meaning.meaning</code>).
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search size={14} className="absolute left-3 top-3 text-text-muted" />
              <input type="search" aria-label="Tìm trong chủ đề" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ hoặc bản dịch…" className={`${toolbarControl} w-full pl-9`} />
            </div>
            {levels.length > 0 && (
              <select aria-label="Lọc cấp độ" value={level} onChange={(e) => setLevel(e.target.value)} className={`${toolbarControl} cursor-pointer`}>
                <option value="ALL">Mọi cấp độ</option>
                {levels.map(([lv]) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            )}
            <span className="text-xs text-text-muted">{visible.length}/{rows.length} mục</span>
            {levels.length > 0 && (
              <span className="ml-auto flex flex-wrap gap-x-2 text-xs text-text-muted" title="Thuộc tính main.level của mục từ">
                Cấp độ: {levels.map(([lv, n]) => <span key={lv}><strong className="text-text">{lv}</strong> {n}</span>)}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-subtle/60 text-text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Từ</th><th className="px-3 py-2 font-medium">Phiên âm</th><th className="px-3 py-2 font-medium">Bản dịch</th>
                  <th className="hidden px-3 py-2 font-medium 2xl:table-cell">Giải nghĩa</th><th className="px-3 py-2 font-medium">Cấp độ</th>
                  <th className="px-3 py-2 text-right font-medium">Ví dụ</th><th className="px-4 py-2 font-medium">Độ phủ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map(({ raw, s }) => {
                  const gaps = itemGaps(s);
                  return (
                    <tr key={s.id} onClick={() => setInspect(raw)} className="cursor-pointer hover:bg-surface-subtle/60">
                      <td className="whitespace-nowrap px-4 py-2 text-body font-semibold">{s.word}{isDup(s) && <Badge tone="warning" className="ml-1.5 align-middle">Trùng</Badge>}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-text-muted">{s.phonetic ?? '—'}</td>
                      <td className="px-3 py-2"><div className="max-w-40 truncate" title={s.translation ?? undefined}>{s.translation ?? <span className="text-text-light">—</span>}</div></td>
                      <td className="hidden px-3 py-2 text-text-muted 2xl:table-cell"><div className="max-w-72 truncate" title={s.meaning ?? undefined}>{s.meaning ?? '—'}</div></td>
                      <td className="px-3 py-2 font-medium tabular-nums">{s.level ?? <span className="font-normal text-text-light">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.examples}</td>
                      <td className="px-4 py-2">
                        {gaps.length === 0 ? <span className="text-primary-dark">Đủ</span> : (
                          <span className="flex items-center gap-1" title={gaps.map((g) => GAP_LABEL[g]).join(' · ')}>
                            {gaps.map((g) => <span key={g} className={cn('h-2 w-2 rounded-full', GAP_DOT[g])} />)}
                            <span className="text-text-muted">{gaps.length}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-10 text-center text-sm text-text-muted">Chủ đề chưa có mục từ nào.</p>}
            {rows.length > 0 && visible.length === 0 && <p className="p-10 text-center text-sm text-text-muted">Không có mục từ phù hợp bộ lọc.</p>}
          </div>
        </>
      )}

      {inspect && <ItemInspector item={inspect} groups={groups} onClose={() => setInspect(null)} />}
    </div>
  );
}

/** Every value of the item, grouped and labelled by the topic schema. Read-only until item update/delete exist. */
function ItemInspector({ item, groups, onClose }: { item: TopicItemData; groups: SchemaAttributeGroupDTO[]; onClose: () => void }) {
  const s = itemSummary(item);
  return (
    <Drawer title={s.word} subtitle={`Mục #${s.id} · thêm ${formatDate(s.createdAt)}`} onClose={onClose}
      footer={<>
        <Button icon={<Trash2 />} variant="danger-outline" disabled title={NEEDS_API.deleteItem}>Xóa mục</Button>
        <Button icon={<Pencil />} disabled title={NEEDS_API.editItem}>Sửa mục</Button>
      </>}>
      {groups.map((g) => {
        const value = item[g.name];
        const rows: AttrValues[] = Array.isArray(value) ? value as AttrValues[] : value ? [value as AttrValues] : [];
        return (
          <section key={g.groupId} className="space-y-2">
            <SectionLabel>{g.label ?? g.name}</SectionLabel>
            {rows.length === 0 ? <p className="text-xs text-text-muted">Trống.</p> : rows.map((row, i) => (
              <dl key={i} className={cn('grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-xs', g.multiple && 'rounded-lg border border-border p-2.5')}>
                {g.attributes.filter((a) => row[a.name]).map((a) => (
                  <React.Fragment key={a.attributeId}>
                    <dt className="text-text-muted">{a.label ?? a.name}</dt>
                    <dd className={cn('break-words', a.name === 'phonetic' && 'font-mono')}>{row[a.name]}</dd>
                  </React.Fragment>
                ))}
                {Object.entries(row).filter(([k, v]) => v && !g.attributes.some((a) => a.name === k)).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-warning-dark" title="Thuộc tính không có trong schema của chủ đề">{k} <span className="text-xs">(ngoài schema)</span></dt>
                    <dd className="break-words">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            ))}
          </section>
        );
      })}
      <p className="text-xs text-text-muted">Sửa và xóa mục từ cần API mới; hiện mục chỉ thêm được.</p>
    </Drawer>
  );
}
