import React, { useState } from 'react';
import { Search, Plus, CheckCircle2, Clock, FileText, Sparkles, Layers } from 'lucide-react';
import { CardViewModel, CEFRLevel, VocabStatus } from '../../domains/flashcard/types';

interface WordListProps {
  words: CardViewModel[];
  selectedId: string;
  onSelectWord: (id: string) => void;
  onAddNewWord: () => void;
}

const CEFR_BADGES: Record<CEFRLevel, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-50 text-teal-700 border-teal-200',
  B1: 'bg-amber-50 text-amber-700 border-amber-200',
  B2: 'bg-orange-50 text-orange-700 border-orange-200',
  C1: 'bg-purple-50 text-purple-700 border-purple-200',
  C2: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_ICONS: Record<VocabStatus, { icon: React.ReactNode; color: string; tooltip: string }> = {
  published: {
    icon: <CheckCircle2 size={13} />,
    color: 'text-primary',
    tooltip: 'Đã xuất bản',
  },
  review: {
    icon: <Clock size={13} />,
    color: 'text-info',
    tooltip: 'Chờ kiểm duyệt',
  },
  draft: {
    icon: <FileText size={13} />,
    color: 'text-text-muted',
    tooltip: 'Bản nháp',
  },
  archived: {
    icon: <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />,
    color: 'text-danger',
    tooltip: 'Đã lưu trữ',
  },
};

export const WordList: React.FC<WordListProps> = ({
  words,
  selectedId,
  onSelectWord,
  onAddNewWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VocabStatus>('all');
  const [cefrFilter, setCefrFilter] = useState<'all' | CEFRLevel>('all');

  const filteredWords = words.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.meanings.some((m) =>
        m.definitionVi.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesCefr = cefrFilter === 'all' || w.cefr === cefrFilter;
    return matchesSearch && matchesStatus && matchesCefr;
  });

  return (
    <div className="h-full flex flex-col bg-surface border-r border-border select-none" role="region" aria-label="Danh sách từ vựng">
      {/* Header & New Word CTA */}
      <div className="p-3.5 border-b border-border space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-text uppercase tracking-wider">
              Kho từ vựng
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {words.length} mục ({words.filter((w) => w.status === 'review').length} chờ duyệt)
            </div>
          </div>
          <button
            type="button"
            onClick={onAddNewWord}
            aria-label="Thêm từ vựng mới"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>Thêm từ</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-text-light" />
          <input
            type="text"
            placeholder="Tìm theo từ, nghĩa tiếng Việt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Tìm kiếm từ vựng"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-border bg-surface-subtle/60 text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-surface"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5 scrollbar-none" role="tablist">
          {(['all', 'review', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              type="button"
              role="tab"
              aria-selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-text text-white shadow-xs'
                  : 'text-text-muted hover:bg-surface-subtle hover:text-text'
              }`}
            >
              {st === 'all'
                ? 'Tất cả'
                : st === 'review'
                ? 'Chờ duyệt'
                : st === 'published'
                ? 'Đã phát hành'
                : 'Bản nháp'}
            </button>
          ))}
        </div>
      </div>

      {/* CEFR Secondary Filter Bar */}
      <div className="px-3.5 py-1.5 border-b border-border/60 bg-surface-subtle/50 flex items-center justify-between text-xs text-text-muted shrink-0">
        <span className="font-medium">Khung CEFR:</span>
        <div className="flex items-center gap-1">
          {(['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setCefrFilter(lvl)}
              aria-label={`Lọc cấp độ ${lvl}`}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                cefrFilter === lvl
                  ? 'bg-primary-light text-primary border border-primary/20'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Word List Scrollable Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60" role="listbox">
        {filteredWords.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            Không tìm thấy từ vựng phù hợp
          </div>
        ) : (
          filteredWords.map((item) => {
            const isSelected = item.id === selectedId;
            const primaryMeaning = item.meanings[0]?.definitionVi || 'Chưa có định nghĩa';
            const cefrBadge = CEFR_BADGES[item.cefr];
            const statusInfo = STATUS_ICONS[item.status];

            return (
              <div
                key={item.id}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                aria-label={`Từ vựng: ${item.word}, cấp độ ${item.cefr}, ${statusInfo.tooltip}`}
                onClick={() => onSelectWord(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWord(item.id);
                  }
                }}
                className={`p-3.5 cursor-pointer transition-all outline-none focus:bg-primary-light/30 ${
                  isSelected
                    ? 'bg-primary-light/40 border-l-4 border-primary pl-2.5'
                    : 'hover:bg-surface-subtle/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text tracking-tight font-sans">
                      {item.word}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-bold ${cefrBadge}`}
                    >
                      {item.cefr}
                    </span>
                    {item.meanings.length > 1 && (
                      <span className="text-[10px] font-semibold text-text-muted bg-surface border border-border px-1 rounded">
                        {item.meanings.length} nghĩa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Source tag */}
                    {item.source === 'SCAN' && (
                      <span className="text-[10px] font-bold text-snapy bg-snapy-light px-1.5 py-0.5 rounded border border-snapy/20">
                        SCAN
                      </span>
                    )}
                    {item.source === 'AI' && (
                      <span className="text-[10px] font-bold text-info bg-info-light px-1.5 py-0.5 rounded border border-info/20">
                        AI
                      </span>
                    )}
                    {/* Status icon */}
                    <span className={statusInfo.color} title={statusInfo.tooltip}>
                      {statusInfo.icon}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-mono text-text-muted mb-1">
                  {item.phonetic} · <span className="italic font-sans">{item.partOfSpeech}</span>
                </div>

                <div className="text-xs text-text-muted line-clamp-1">
                  {primaryMeaning}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

