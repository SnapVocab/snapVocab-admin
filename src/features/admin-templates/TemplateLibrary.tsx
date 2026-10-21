import React, { useMemo, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { Badge, Bar, Button, PageHeader, Panel, SampleDataNotice, StripCell, StripNote, SummaryStrip } from '../../components/ui';
import { offSchemaFields } from '../../domains/admin-content/mappers';
import type { DataType, TopicDTO, TopicItemData } from '../../domains/admin-content/types';
import { templatesEditable, templatesUseFixtures } from '../../domains/admin-templates/config';
import { ROLE_LABEL, SIDE_LABEL, attributeFill, matchesFilter, placements, summarize, topicsByTemplate, type TemplateSummary } from '../../domains/admin-templates/mappers';
import type { TopicBranch } from '../../domains/admin-templates/queries';
import { cardSections } from '../../domains/admin-templates/render';
import type { LibraryFilter, SchemaDTO } from '../../domains/admin-templates/types';
import { CardFace, PreviewSource } from './CardPreview';

type Item = Record<string, unknown>;
const n = (v: number) => v.toLocaleString('vi-VN');
const time = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const TYPE_LABEL: Record<DataType, string> = { TEXT: 'Chữ', AUDIO: 'Âm thanh', IMAGE: 'Ảnh', NUMBER: 'Số', BOOLEAN: 'Đúng/Sai', DATE: 'Ngày' };

export interface PreviewState {
  branches: TopicBranch[];
  topic: TopicDTO | null;
  /** Schema of the preview topic; templates of another schema preview with the app's sample values. */
  schemaId: number | null;
  items: Item[];
  index: number;
  loading: boolean;
  setTopic: (id: number) => void;
  setIndex: (i: number) => void;
}

/**
 * Mẫu thẻ (templates_ui.md §4): strip = counts that filter the gallery; gallery = each system template drawn by the
 * app's renderer on a real word, with where it is used and what breaks; matrix = which schema attribute each template
 * puts on which side, against the data the preview topic actually has.
 */
export function TemplateLibrary({ schemas, topics, topicsReady, preview, updatedAt, refreshing, onRefresh, onOpen }: {
  schemas: SchemaDTO[];
  topics: TopicDTO[];
  topicsReady: boolean;
  preview: PreviewState;
  updatedAt?: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (id: number, opener: HTMLElement) => void;
}) {
  const [filter, setFilter] = useState<LibraryFilter>('ALL');
  const system = schemas.filter((s) => s.isSystem);
  const forks = schemas.length - system.length;
  const byTemplate = useMemo(() => topicsByTemplate(topics), [topics]);
  const summaries = useMemo(() => system.flatMap((s) => summarize(s, byTemplate).map((x) => ({ schema: s, x }))), [system, byTemplate]);
  const count = (f: LibraryFilter) => summaries.filter(({ x }) => matchesFilter(x, f)).length;
  const pick = (f: LibraryFilter) => setFilter(filter === f ? 'ALL' : f);
  const item = preview.items[preview.index] ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Mẫu thẻ"
        description="Ứng dụng vẽ thẻ học bằng mẫu mặc định của schema. Mẫu mà từng chủ đề chọn chỉ quyết định trường nào Quiz lấy làm từ, nghĩa và ví dụ."
        actions={<>
          {updatedAt ? <span className="hidden text-xs tabular-nums text-text-muted sm:inline">Cập nhật {time(updatedAt)}</span> : null}
          <Button icon={<RefreshCw />} label="Làm mới" loading={refreshing} onClick={onRefresh} />
        </>} />
      {templatesUseFixtures && (
        <SampleDataNotice>
          Sửa mẫu và đổi mẫu mặc định chạy trên bản nháp trong trình duyệt và mất khi tải lại, vì chưa có API ghi mẫu thẻ
          (đề xuất <code className="font-mono">PUT /api/admin/templates/{'{id}'}</code>). Danh sách mẫu, cấu trúc, chủ đề đang dùng và nội dung xem trước là dữ liệu thật.
        </SampleDataNotice>
      )}

      <SummaryStrip label="Tóm tắt mẫu thẻ">
        <StripCell value={summaries.length} label="Mẫu hệ thống" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        <StripCell value={count('DEFAULT')} label="Vẽ thẻ học" dot="bg-primary" active={filter === 'DEFAULT'} onClick={() => pick('DEFAULT')} />
        <StripCell value={count('QUIZ')} label="Quiz đang dùng" dot="bg-info" active={filter === 'QUIZ'} onClick={() => pick('QUIZ')} />
        <StripCell value={count('UNUSED')} label="Chưa dùng ở đâu" dot="bg-neutral-300" active={filter === 'UNUSED'} onClick={() => pick('UNUSED')} />
        <StripCell value={count('ISSUES')} label="Cần rà" dot="bg-warning" active={filter === 'ISSUES'} onClick={() => pick('ISSUES')} />
        <StripNote title="Chủ đề của các collection hệ thống, gồm cả chủ đề gốc">
          <span>Chủ đề hệ thống</span>
          <span className="text-sm font-semibold tabular-nums text-text">{topicsReady ? n(topics.length) : '—'}</span>
        </StripNote>
        <StripNote push title="Người học tách schema của chủ đề để tùy biến; sửa mẫu hệ thống không áp vào các bản này">
          <span>Bản riêng của người học</span>
          <span className="text-sm font-semibold tabular-nums text-text">{n(forks)} schema</span>
        </StripNote>
      </SummaryStrip>

      <PreviewSource branches={preview.branches} topicId={preview.topic?.id ?? null} onTopic={preview.setTopic}
        items={preview.items} index={preview.index} onIndex={preview.setIndex} loading={preview.loading} />

      {summaries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-12 text-center text-sm text-text-muted">Chưa có schema hệ thống nào có mẫu thẻ.</p>
      ) : (
        <div className="space-y-3">
          {summaries.filter(({ x }) => matchesFilter(x, filter)).map(({ schema, x }) => (
            <TemplateCard key={x.template.id} schema={schema} s={x} item={schema.id === preview.schemaId ? item : null} topicsReady={topicsReady} onOpen={onOpen} />
          ))}
        </div>
      )}
      {summaries.length > 0 && count(filter) === 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
          <p>Không có mẫu nào ở nhóm này.</p>
          <Button size="sm" onClick={() => setFilter('ALL')}>Xóa bộ lọc</Button>
        </div>
      )}

      {system.map((schema) => <FieldMatrix key={schema.id} schema={schema} items={schema.id === preview.schemaId ? preview.items : []} topic={preview.topic} />)}
    </div>
  );
}

function TemplateCard({ schema, s, item, topicsReady, onOpen }: { schema: SchemaDTO; s: TemplateSummary; item: Item | null; topicsReady: boolean; onOpen: (id: number, opener: HTMLElement) => void }) {
  const t = s.template;
  const { front, back } = cardSections(t.elements, schema);
  return (
    <article aria-label={t.name} className="grid gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-3">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
              <button type="button" className="text-left hover:underline" onClick={(e) => onOpen(t.id, e.currentTarget)}>{t.name}</button>
              {t.isDefault && <Badge tone="info">Mặc định</Badge>}
            </h2>
            <p className="font-mono text-2xs text-text-light">{t.code ?? `#${t.id}`}</p>
          </div>
          <Button size="sm" aria-label={`${templatesEditable ? 'Sửa' : 'Xem'} mẫu ${t.name}`} onClick={(e) => onOpen(t.id, e.currentTarget)}>{templatesEditable ? 'Sửa' : 'Xem'}</Button>
        </header>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-text-muted">Thẻ học</dt>
          <dd>{t.isDefault ? `Mọi thẻ học của schema ${schema.name}` : <span className="text-text-muted">Ứng dụng chưa vẽ mẫu này: chỉ mẫu mặc định được vẽ</span>}</dd>
          <dt className="text-text-muted">Quiz</dt>
          <dd className="tabular-nums">{!topicsReady ? '—' : s.topics.length ? `${n(s.topics.length)} chủ đề chọn mẫu này` : <span className="text-text-muted">Chưa chủ đề nào chọn</span>}</dd>
          <dt className="text-text-muted">Kiểu Quiz</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-0.5">
            {s.quiz.map((q) => (
              <span key={q.mode} title={q.problem?.code} className={q.ok ? 'text-text' : 'font-medium text-danger-dark'}>
                {q.ok ? <Check size={12} className="mr-0.5 inline" aria-label="chạy được" /> : <X size={12} className="mr-0.5 inline" aria-label="lỗi" />}{q.label}
              </span>
            ))}
          </dd>
          {(['FRONT', 'BACK'] as const).map((side) => (
            <React.Fragment key={side}>
              <dt className="text-text-muted">{SIDE_LABEL[side]}</dt>
              <dd>
                {s.faces[side].once.join(', ') || (s.faces[side].repeated.length ? '' : <span className="text-text-light">Trống</span>)}
                {s.faces[side].repeated.length > 0 && <span className="text-text-muted">{s.faces[side].once.length ? '; ' : ''}lặp theo dòng: {s.faces[side].repeated.join(', ')}</span>}
              </dd>
            </React.Fragment>
          ))}
        </dl>
        {s.issues.length > 0 && (
          <ul className="space-y-1 border-t border-border pt-2.5 text-xs text-warning-dark">
            {s.issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        )}
      </div>

      {/* The app's card at its own width (340px), scaled down; the face scrolls in the app, so long backs are cut here. */}
      <div className="flex gap-3 overflow-x-auto" aria-hidden>
        {(['FRONT', 'BACK'] as const).map((side) => (
          <div key={side} className="h-[262px] w-[211px] shrink-0 overflow-hidden rounded-[18px] bg-surface-subtle">
            <div style={{ zoom: 0.62 }} className="w-[340px]"><CardFace side={side} sections={side === 'FRONT' ? front : back} item={item} className="shadow-none" /></div>
          </div>
        ))}
      </div>
    </article>
  );
}

/** Attribute × template: where each schema field goes, against the data of the preview topic (own group only). */
function FieldMatrix({ schema, items, topic }: { schema: SchemaDTO; items: Item[]; topic: TopicDTO | null }) {
  const templates = [...schema.templates].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id);
  const extra = useMemo(() => {
    const seen = new Map<string, number>();
    for (const it of items) for (const k of offSchemaFields(it as TopicItemData, schema.groups)) seen.set(k, (seen.get(k) ?? 0) + 1);
    return seen;
  }, [items, schema.groups]);
  const attrCount = schema.groups.reduce((s, g) => s + g.attributes.length, 0);
  const cols = 3 + templates.length;
  return (
    <Panel title="Trường dữ liệu trên thẻ" bodyClassName="p-0"
      meta={`${schema.name}, ${attrCount} thuộc tính${topic && items.length ? `; dữ liệu đếm trên “${topic.name}”, ${n(items.length)} mục` : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="whitespace-nowrap border-y border-border bg-surface-subtle/60 text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Thuộc tính</th>
              <th scope="col" className="px-3 py-2 font-medium">Kiểu</th>
              <th scope="col" className="w-36 px-3 py-2 text-right font-medium" title="Mục có giá trị trong đúng nhóm của thuộc tính">Có dữ liệu</th>
              {templates.map((t) => <th key={t.id} scope="col" className="px-3 py-2 font-medium">{t.name}</th>)}
            </tr>
          </thead>
          {[...schema.groups].sort((a, b) => a.position - b.position).map((g) => {
            const off = [...extra.entries()].filter(([k]) => k.startsWith(`${g.name}.`));
            return (
              <tbody key={g.groupId} className="divide-y divide-border border-b border-border last:border-b-0">
                <tr className="bg-surface-subtle/40">
                  <th scope="rowgroup" colSpan={cols} className="px-4 py-1.5 text-left font-normal">
                    <span className="text-body font-semibold text-text">{g.label ?? g.name}</span>
                    {g.multiple && <span className="ml-2 text-text-muted">nhiều dòng mỗi mục</span>}
                    <span className="ml-2 font-mono text-2xs text-text-light">{g.name}</span>
                  </th>
                </tr>
                {[...g.attributes].sort((a, b) => a.position - b.position).map((a) => {
                  const fill = attributeFill(items, g.name, g.multiple, a);
                  return (
                    <tr key={a.attributeId} className="hover:bg-surface-subtle/60">
                      <td className="px-4 py-2">
                        <span className="text-body font-medium text-text">{a.label ?? a.name}</span>{a.required && <span className="text-danger-dark" title="Bắt buộc khi thêm mục từ"> *</span>}
                        <span className="ml-2 font-mono text-2xs text-text-light">{g.name}.{a.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-muted">{TYPE_LABEL[a.dataType] ?? a.dataType}</td>
                      <td className="px-3 py-2">
                        {items.length ? <>
                          <span className={fill === 0 ? 'block text-right tabular-nums text-text-light' : 'block text-right tabular-nums'}>{n(fill)}/{n(items.length)}</span>
                          {fill > 0 && <span className="ml-auto mt-1 block w-24"><Bar value={fill} max={items.length} /></span>}
                        </> : <span className="block text-right text-text-light">—</span>}
                      </td>
                      {templates.map((t) => {
                        const at = placements(t, a.attributeId);
                        return (
                          <td key={t.id} className="px-3 py-2">
                            {at.length ? at.map((p, i) => (
                              <span key={i} className={p.conflict ? 'block font-medium text-danger-dark' : 'block text-text'} title={p.conflict ? 'Vai trò này gán cho nhiều thuộc tính: Quiz báo lỗi' : p.label}>
                                {SIDE_LABEL[p.side]}{p.role ? `, ${ROLE_LABEL[p.role]}` : ''}
                              </span>
                            )) : <span className="text-text-light">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {off.map(([k, c]) => (
                  <tr key={k} className="bg-warning-light/40">
                    <td className="px-4 py-2">
                      <span className="text-body font-medium text-text">{k.split('.')[1]}</span>
                      <span className="ml-2 font-mono text-2xs text-text-light">{k}</span>
                      <Badge tone="warning" className="ml-2">Ngoài schema</Badge>
                    </td>
                    <td className="px-3 py-2 text-text-muted">Chữ</td>
                    <td className="px-3 py-2 text-right tabular-nums">{n(c)}/{n(items.length)}</td>
                    <td colSpan={templates.length} className="px-3 py-2 text-text-muted">
                      Không mẫu nào gắn thuộc tính này; ứng dụng chỉ hiện nó khi một trường cùng tên dò sang nhóm này. Cần migrate vào schema.
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </Panel>
  );
}
