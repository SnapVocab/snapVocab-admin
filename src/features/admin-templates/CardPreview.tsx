import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Volume2 } from 'lucide-react';
import { Button, toolbarControl } from '../../components/ui';
import type { TopicBranch } from '../../domains/admin-templates/queries';
import { fieldView, resolveTargetWord, sectionInstances, ttsUrl, type CardField, type CardSection } from '../../domains/admin-templates/render';
import type { CardSide } from '../../domains/admin-templates/types';
import { cn } from '../../lib/utils';

type Item = Record<string, unknown>;

/** Speaks like the app: the same TTS URL. A browser may refuse it (autoplay, referrer); then nothing plays. */
function speak(text: string) {
  if (text) void new Audio(ttsUrl(text)).play().catch(() => undefined);
}

const ALIGN = { LEFT: 'items-start text-left', CENTER: 'items-center text-center', RIGHT: 'items-end text-right', JUSTIFY: 'items-start text-justify' } as const;
const JUSTIFY = { LEFT: 'justify-start', CENTER: 'justify-center', RIGHT: 'justify-end', JUSTIFY: 'justify-start' } as const;

function FieldBlock({ field, item, row, repeatable }: { field: CardField; item: Item | null; row: number; repeatable: boolean }) {
  const v = fieldView(field, item, row, repeatable);
  if (v.kind === 'hidden') return null;
  const align = ALIGN[field.align] ?? ALIGN.LEFT;
  if (v.kind === 'image') {
    return (
      <div className={cn('my-1.5 flex w-full flex-col', align)}>
        {v.label && <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-neutral-400">{v.label}</p>}
        <div className="h-48 w-full overflow-hidden rounded-[22px] border border-neutral-200 bg-neutral-100 p-1">
          <img src={v.src} alt="" className="h-full w-full rounded-[18px] object-cover" />
        </div>
      </div>
    );
  }
  if (v.kind === 'audio') {
    return (
      <div className={cn('my-1.5 flex w-full', JUSTIFY[field.align] ?? 'justify-start')}>
        <button type="button" onClick={(e) => { e.stopPropagation(); speak(v.speak); }}
          className="flex items-center gap-2 rounded-2xl border-2 border-b-[3px] border-lime-200/90 border-b-lime-300 bg-lime-50 px-4 py-2.5">
          <Volume2 size={18} color="#4D7C0F" />
          <span className="text-xs font-black tracking-wide text-lime-800">{v.label}</span>
        </button>
      </div>
    );
  }
  return (
    <div className={cn('my-1.5 flex w-full flex-col', align)}>
      {v.label && <p className={cn('mb-1 text-[10px] font-bold uppercase tracking-[1px]', v.targetWord ? 'text-[#3C8C00]' : 'text-neutral-400')}>{v.label}</p>}
      <div className={cn('flex w-full items-center gap-2.5', JUSTIFY[field.align] ?? 'justify-start')}>
        <span style={{ fontSize: v.px, color: field.color, textAlign: field.align.toLowerCase() as React.CSSProperties['textAlign'] }}
          className={cn('min-w-0 break-words leading-tight', v.phonetic ? 'font-semibold tracking-wide' : v.targetWord ? 'font-black tracking-tight' : 'font-bold')}>
          {v.text}
        </span>
        {v.audioButton && (
          <button type="button" aria-label={`Phát âm ${v.speak}`} onClick={(e) => { e.stopPropagation(); speak(v.speak); }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-b-[3px] border-lime-300 border-b-lime-400 bg-lime-100">
            <Volume2 size={15} color="#4D7C0F" />
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ section, item }: { section: CardSection; item: Item | null }) {
  const rows = Array.from({ length: sectionInstances(section, item) }, (_, i) => i);
  const field = (f: CardField, row: number) => <FieldBlock key={`${f.key}-${row}`} field={f} item={item} row={row} repeatable={section.repeatable} />;
  return (
    <div className="my-2 w-full">
      {section.name.trim() && (
        <div className="mb-3 flex items-center gap-2.5">
          <span className="h-px flex-1 bg-neutral-100" />
          <span className="flex items-center gap-1.5 rounded-full bg-[#F0FCE4] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#3C8C00]">{section.name}</span>
          </span>
          <span className="h-px flex-1 bg-neutral-100" />
        </div>
      )}
      {rows.map((row) => (
        <div key={row} className={cn('w-full', row > 0 && 'mt-3 border-t border-dashed border-neutral-200/80 pt-3')}>
          {section.columns === 2 ? (
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-3">{section.fields.filter((f) => f.column === 1).map((f) => field(f, row))}</div>
              <div className="flex flex-1 flex-col gap-3">{section.fields.filter((f) => f.column === 2).map((f) => field(f, row))}</div>
            </div>
          ) : <div className="flex w-full flex-col justify-center gap-3">{section.fields.map((f) => field(f, row))}</div>}
        </div>
      ))}
    </div>
  );
}

/**
 * One face of the app's flashcard (card-renderer FlipCardContainer + CardFace + CardSectionRenderer), drawn from the
 * same sections and resolver. Fonts are the admin's Inter, not the app's Nunito.
 */
export function CardFace({ side, sections, item, onFlip, className }: {
  side: CardSide; sections: CardSection[]; item: Item | null; onFlip?: () => void; className?: string;
}) {
  const front = side === 'FRONT';
  const body = (
    <div className="flex min-h-[420px] flex-col px-5 pb-4 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', front ? 'bg-primary' : 'bg-reward')} />
          <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-neutral-500">{front ? 'Mặt trước' : 'Mặt sau'}</span>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-500">THẺ TỪ VỰNG</span>
      </div>
      <div className={cn('flex flex-1 flex-col pb-3', front ? 'justify-center' : 'justify-start')}>
        {sections.map((s) => <Section key={s.key} section={s} item={item} />)}
      </div>
      {onFlip && (
        <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-neutral-100 pt-3">
          <RotateCw size={12} color="#8B91A5" />
          <span className="text-[10px] font-semibold text-neutral-400">Chạm để lật thẻ</span>
        </div>
      )}
    </div>
  );
  const shell = 'w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white text-left text-neutral-800 shadow-xl shadow-slate-900/10';
  return onFlip
    ? <div role="button" tabIndex={0} aria-label={`${front ? 'Mặt trước' : 'Mặt sau'}, bấm để lật`} onClick={onFlip}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); } }}
      className={cn(shell, 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', className)}>{body}</div>
    : <div className={cn(shell, className)}>{body}</div>;
}

/** The app's two-tab side switch above its card preview (card-preview-view.tsx). */
export function SideSwitch({ side, onChange }: { side: CardSide; onChange: (s: CardSide) => void }) {
  return (
    <div role="group" aria-label="Mặt thẻ" className="flex rounded-lg bg-surface-subtle p-1">
      {(['FRONT', 'BACK'] as const).map((s) => (
        <button key={s} type="button" aria-pressed={side === s} onClick={() => onChange(s)}
          className={cn('flex-1 rounded-md py-1.5 text-xs font-semibold', side === s ? 'bg-surface text-text shadow-card' : 'text-text-muted hover:text-text')}>
          {s === 'FRONT' ? 'Mặt trước' : 'Mặt sau'}
        </button>
      ))}
    </div>
  );
}

/** Which real topic and word the previews and data counts use. */
export function PreviewSource({ branches, topicId, onTopic, items, index, onIndex, loading, compact }: {
  branches: TopicBranch[]; topicId: number | null; onTopic: (id: number) => void;
  items: Item[]; index: number; onIndex: (i: number) => void; loading: boolean; compact?: boolean;
}) {
  const words = items.map((it) => resolveTargetWord(it) || '—');
  return (
    <div className={cn('flex flex-wrap items-center gap-2', compact && 'gap-1.5')}>
      {!compact && <span className="text-xs text-text-muted">Xem thử với</span>}
      <select aria-label="Chủ đề xem thử" className={cn(toolbarControl, compact ? 'w-full' : 'max-w-[280px]')} value={topicId ?? ''} onChange={(e) => onTopic(Number(e.target.value))}>
        {topicId === null && <option value="">Đang tải chủ đề…</option>}
        {branches.map((b) => (
          b.children.length
            ? <optgroup key={b.root.id} label={`${b.root.name}${b.root.translation ? ` (${b.root.translation})` : ''}`}>{b.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            : <option key={b.root.id} value={b.root.id}>{b.root.name}</option>
        ))}
      </select>
      <div className={cn('flex items-center gap-1', compact && 'w-full')}>
        <Button size={compact ? 'sm' : 'md'} icon={<ChevronLeft />} label="Từ trước" disabled={index <= 0} onClick={() => onIndex(index - 1)} />
        <select aria-label="Từ xem thử" className={cn(toolbarControl, compact ? 'h-8 min-w-0 flex-1' : 'w-44')} value={items.length ? index : ''} disabled={!items.length} onChange={(e) => onIndex(Number(e.target.value))}>
          {!items.length && <option value="">{loading ? 'Đang tải…' : 'Chủ đề chưa có mục từ'}</option>}
          {words.map((w, i) => <option key={i} value={i}>{w}</option>)}
        </select>
        <Button size={compact ? 'sm' : 'md'} icon={<ChevronRight />} label="Từ sau" disabled={index >= items.length - 1} onClick={() => onIndex(index + 1)} />
      </div>
      {!compact && items.length > 0 && <span className="text-xs tabular-nums text-text-muted">{items.length.toLocaleString('vi-VN')} mục</span>}
    </div>
  );
}
