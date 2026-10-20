import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RotateCw, Search } from 'lucide-react';
import { Button, PageHeader, StripCell, StripNote, SummaryStrip, toolbarControl } from '../../components/ui';
import { viGloss, WORD_GAP_LABEL, wordGaps, type WordGap } from '../../domains/admin-content/mappers';
import { useWordPage } from '../../domains/admin-content/queries';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { WordDrawer } from './WordDrawer';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PAGE_SIZE = 30;
const GAP_DOT: Record<WordGap, string> = { vi: 'bg-danger', ipa: 'bg-warning', meaning: 'bg-danger', example: 'bg-info' };

/**
 * NOW (read): GET /api/words/suggest (prefix, alphabetical, paged) + POST /api/words/lookup for the page.
 * MOCK (write): editing lives in WordDrawer; soft delete and usage counts need API (F-ADM-04).
 * `rest[0]` = an open word, so the detail survives F5 and can be linked.
 */
export function DictionaryPage({ rest }: { rest: string[] }) {
  const openWord = rest[0] ? decodeURIComponent(rest[0]) : null;
  const [letter, setLetter] = useState('a');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [gap, setGap] = useState<WordGap | 'ALL'>('ALL');
  useEffect(() => {
    const t = window.setTimeout(() => { setQ(search.trim()); setPage(0); setGap('ALL'); }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  // The suggest endpoint requires a prefix, so browsing is by letter; typing narrows it.
  const prefix = q || letter;
  const words = useWordPage(prefix, page, PAGE_SIZE);
  const rows = words.data?.rows ?? [];
  const count = (g: WordGap) => rows.filter((r) => r.lookup && wordGaps(r.lookup).includes(g)).length;
  const visible = gap === 'ALL' ? rows : rows.filter((r) => r.lookup && wordGaps(r.lookup).includes(gap));
  const pickLetter = (l: string) => { setLetter(l); setSearch(''); setQ(''); setPage(0); setGap('ALL'); };
  const open = (w: string) => navigate(`/dictionary/${encodeURIComponent(w)}`);

  return (
    <div className="h-full min-w-0 space-y-4 overflow-y-auto bg-background p-4 text-text sm:p-6">
      <PageHeader title="Từ điển"
        description="Từ điển gốc Anh–Việt. Cột “Nghĩa tiếng Việt” lấy bản dịch tiếng Việt, nếu không có thì lấy định nghĩa tiếng Việt." />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search size={14} className="absolute left-3 top-3 text-text-muted" />
          <input type="search" aria-label="Tìm từ theo tiền tố" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm từ (bắt đầu bằng…)" className={`${toolbarControl} w-full pl-9`} />
        </div>
        <Button icon={<RotateCw />} label="Làm mới" loading={words.isFetching} onClick={() => void words.refetch()} />
      </div>
      <nav aria-label="Duyệt theo chữ cái" className="flex flex-wrap gap-1">
        {LETTERS.map((l) => (
          <button key={l} type="button" aria-pressed={!q && letter === l} onClick={() => pickLetter(l)}
            className={cn('h-7 w-7 rounded-md text-xs font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info', !q && letter === l ? 'bg-text text-white' : 'bg-surface text-text-muted hover:text-text border border-border')}>
            {l}
          </button>
        ))}
      </nav>

      {words.data && (
        <SummaryStrip label="Độ phủ của trang hiện tại">
          <StripCell value={rows.length} label="Từ trong trang" active={gap === 'ALL'} onClick={() => setGap('ALL')} />
          {(Object.keys(WORD_GAP_LABEL) as WordGap[]).map((g) => (
            <StripCell key={g} value={count(g)} label={WORD_GAP_LABEL[g]} dot={GAP_DOT[g]} active={gap === g} onClick={() => setGap(gap === g ? 'ALL' : g)} />
          ))}
          <StripNote push title="Tổng số từ trong từ điển bắt đầu bằng tiền tố này">
            <span>Khớp “{prefix}”</span>
            <strong className="text-sm text-text tabular-nums">{words.data.meta.total.toLocaleString('vi-VN')} từ</strong>
          </StripNote>
        </SummaryStrip>
      )}

      {words.isError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-body text-danger-dark">
          <span className="flex items-center gap-2"><AlertCircle size={16} />Không tải được từ điển.</span>
          <Button size="sm" onClick={() => void words.refetch()}>Thử lại</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-subtle/60 text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Từ</th><th className="px-3 py-2 font-medium">IPA</th><th className="px-3 py-2 font-medium">Từ loại</th>
              <th className="px-3 py-2 font-medium">Nghĩa tiếng Việt</th><th className="hidden px-3 py-2 font-medium xl:table-cell">Định nghĩa tiếng Anh</th><th className="px-4 py-2 font-medium">Độ phủ</th>
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-border', words.isPlaceholderData && 'opacity-60')}>
            {words.isPending
              ? Array.from({ length: 10 }, (_, i) => <tr key={i}><td colSpan={6} className="px-4 py-2.5"><div className="h-6 animate-pulse rounded bg-surface-subtle" /></td></tr>)
              : visible.map(({ id, word, lookup }) => {
                  const gaps = lookup ? wordGaps(lookup) : [];
                  const pos = [...new Set(lookup?.meanings.map((m) => m.pos).filter(Boolean))];
                  const vi = lookup ? viGloss(lookup) : [];
                  const en = lookup?.meanings.find((m) => m.definitionLang === 'en')?.definition;
                  return (
                    <tr key={id} onClick={() => open(word)} className="cursor-pointer hover:bg-surface-subtle/60">
                      <td className="px-4 py-2">
                        <a href={`/dictionary/${encodeURIComponent(word)}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(word); }} className="text-body font-semibold text-text hover:underline">{word}</a>
                      </td>
                      <td className="px-3 py-2 font-mono text-text-muted">{lookup?.pronunciations[0]?.ipa ?? '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{pos.length ? pos.slice(0, 3).join(', ') : '—'}</td>
                      <td className="px-3 py-2"><div className="max-w-44 truncate">{vi.length ? vi.join(', ') : <span className="text-text-light">—</span>}</div></td>
                      <td className="hidden px-3 py-2 text-text-muted xl:table-cell"><div className="max-w-96 truncate" title={en}>{en ?? '—'}</div></td>
                      <td className="px-4 py-2">
                        {!lookup ? <span className="text-text-light">Chưa tra được</span> : gaps.length === 0 ? <span className="text-primary-dark">Đủ</span> : (
                          <span className="flex items-center gap-1" title={gaps.map((g) => WORD_GAP_LABEL[g]).join(' · ')}>
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
        {words.data && visible.length === 0 && <p className="p-10 text-center text-sm text-text-muted">{rows.length ? 'Không có từ phù hợp bộ lọc trong trang này.' : `Không có từ nào bắt đầu bằng “${prefix}”.`}</p>}
        {words.data && rows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3 text-xs text-text-muted sm:flex-row">
            <span>Trang <strong className="text-text">{page + 1}</strong> / {words.data.meta.pages.toLocaleString('vi-VN')} · {PAGE_SIZE} từ/trang, xếp theo chữ cái</span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" icon={<ChevronLeft />} disabled={page === 0} onClick={() => { setPage((p) => p - 1); setGap('ALL'); }}>Trước</Button>
              <Button size="sm" disabled={page + 1 >= words.data.meta.pages} onClick={() => { setPage((p) => p + 1); setGap('ALL'); }}>Sau <ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </div>

      {openWord && <WordDrawer key={openWord} word={openWord} onClose={() => navigate('/dictionary')} />}
    </div>
  );
}
