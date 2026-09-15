import React, { useState } from 'react';
import {
  Send,
  CheckCircle,
  Archive,
  History,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Tag,
  BookOpen,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  CardViewModel,
  VocabStatus,
  CEFRLevel,
  CardSource,
  CardMeaning,
  CardExample,
} from '../../domains/flashcard/types';
import { AudioPreviewTester } from './AudioPreviewTester';
import { AuditModal } from './AuditModal';

interface WordEditorProps {
  card: CardViewModel;
  onUpdateCard: (updated: CardViewModel) => void;
  onStatusTransition: (newStatus: VocabStatus, reason: string) => void;
}

const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'idiom',
  'phrase',
];

const CEFR_OPTIONS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SOURCE_OPTIONS: CardSource[] = ['DICT', 'SCAN', 'TOPIC', 'AI'];

export const WordEditor: React.FC<WordEditorProps> = ({
  card,
  onUpdateCard,
  onStatusTransition,
}) => {
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<VocabStatus>(card.status);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [showReadinessChecklist, setShowReadinessChecklist] = useState(false);

  // Field change helper
  const handleFieldChange = <K extends keyof CardViewModel>(
    field: K,
    value: CardViewModel[K]
  ) => {
    onUpdateCard({
      ...card,
      [field]: value,
      lastUpdated: new Date().toISOString(),
    });
  };

  // Meanings handlers (Multi-meaning support)
  const handleMeaningChange = (index: number, updatedMeaning: CardMeaning) => {
    const updatedMeanings = [...card.meanings];
    updatedMeanings[index] = updatedMeaning;
    handleFieldChange('meanings', updatedMeanings);
  };

  const handleAddMeaning = () => {
    const newMeaning: CardMeaning = {
      id: `m-${Date.now()}`,
      partOfSpeech: card.partOfSpeech || 'noun',
      definitionVi: '',
      definitionEn: '',
      examples: [
        {
          id: `ex-${Date.now()}`,
          en: '',
          vi: '',
        },
      ],
    };
    handleFieldChange('meanings', [...card.meanings, newMeaning]);
  };

  const handleRemoveMeaning = (index: number) => {
    if (card.meanings.length <= 1) return;
    const updated = card.meanings.filter((_, idx) => idx !== index);
    handleFieldChange('meanings', updated);
  };

  const handleMoveMeaning = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= card.meanings.length) return;
    const updated = [...card.meanings];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    handleFieldChange('meanings', updated);
  };

  const handleAddExample = (meaningIndex: number) => {
    const meaning = card.meanings[meaningIndex];
    if (!meaning) return;

    const newEx: CardExample = {
      id: `ex-${Date.now()}`,
      en: '',
      vi: '',
    };

    handleMeaningChange(meaningIndex, {
      ...meaning,
      examples: [...meaning.examples, newEx],
    });
  };

  const handleRemoveExample = (meaningIndex: number, exIndex: number) => {
    const meaning = card.meanings[meaningIndex];
    if (!meaning) return;

    const updatedExamples = meaning.examples.filter((_, idx) => idx !== exIndex);
    handleMeaningChange(meaningIndex, {
      ...meaning,
      examples: updatedExamples,
    });
  };

  // Status transitions
  const handleInitiateStatusChange = (next: VocabStatus) => {
    setTargetStatus(next);
    setShowAuditModal(true);
  };

  const handleConfirmAudit = (reason: string) => {
    setShowAuditModal(false);
    onStatusTransition(targetStatus, reason);
  };

  // Readiness Checklist calculations
  const isWordValid = Boolean(card.word && card.word.trim().length > 0);
  const isPhoneticValid = Boolean(card.phonetic && card.phonetic.trim().length > 0);
  const isDefValid = Boolean(card.meanings[0]?.definitionVi && card.meanings[0].definitionVi.trim().length >= 3);
  const hasBilingualExample = Boolean(
    card.meanings.some((m) => m.examples?.some((ex) => ex.en.trim() && ex.vi.trim()))
  );
  const hasAudio = Boolean(
    card.audio && (card.audio.sourceType === 'tts' ? card.audio.voice : card.audio.url)
  );

  const checklistItems = [
    { label: 'Từ vựng chính xác', passed: isWordValid, required: true },
    { label: 'Định nghĩa tiếng Việt đầy đủ', passed: isDefValid, required: true },
    { label: 'Phiên âm IPA chuẩn', passed: isPhoneticValid, required: true },
    { label: 'Ít nhất 1 ví dụ song ngữ', passed: hasBilingualExample, required: true },
    { label: 'Cấu hình âm thanh chuẩn', passed: hasAudio, required: false },
  ];

  const passedCount = checklistItems.filter((i) => i.passed).length;
  const readyForPublish = isWordValid && isDefValid && isPhoneticValid && hasBilingualExample;

  return (
    <div className="h-full flex flex-col bg-surface select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-3.5 px-5 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-text font-mono tracking-tight">
                {card.word || 'Từ vựng mới'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  card.status === 'published'
                    ? 'bg-primary-light text-primary border border-primary/20'
                    : card.status === 'review'
                    ? 'bg-info-light text-info border border-info/20'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {card.status === 'published'
                  ? 'Đã xuất bản'
                  : card.status === 'review'
                  ? 'Chờ kiểm duyệt'
                  : 'Bản nháp'}
              </span>
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              Mã: <span className="font-mono font-medium">{card.id}</span> · Cập nhật:{' '}
              {new Date(card.lastUpdated).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Readiness Checklist Toggle */}
          <button
            type="button"
            onClick={() => setShowReadinessChecklist(!showReadinessChecklist)}
            aria-label="Xem tiêu chí sẵn sàng xuất bản"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              readyForPublish
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {readyForPublish ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>Tiêu chí đạt: {passedCount}/{checklistItems.length}</span>
            {showReadinessChecklist ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Audit History Toggle */}
          <button
            type="button"
            onClick={() => setShowAuditHistory(!showAuditHistory)}
            aria-label="Xem nhật ký kiểm toán"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showAuditHistory
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'border-border text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
          >
            <History size={14} />
            <span>Audit Log ({card.auditHistory?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Collapsible Readiness Checklist Panel */}
      {showReadinessChecklist && (
        <div className="p-3.5 px-5 bg-surface-subtle/80 border-b border-border text-xs space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between font-bold text-text">
            <span>Tiêu chí chuẩn hóa dữ liệu từ điển</span>
            <span className="text-text-muted text-[11px] font-normal">
              Bắt buộc đạt tối thiểu 4/4 tiêu chí để xuất bản
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                  item.passed
                    ? 'bg-surface text-emerald-700 border-emerald-200'
                    : 'bg-surface text-danger border-danger/20 font-medium'
                }`}
              >
                {item.passed ? (
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-danger shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Audit History Drawer if open */}
        {showAuditHistory && (
          <div className="p-4 bg-surface-subtle rounded-xl border border-border space-y-3 mb-2 animate-in fade-in">
            <div className="text-xs font-bold text-text flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span>Nhật ký kiểm toán (Audit Trail)</span>
              </div>
              <span className="text-[11px] text-text-muted">Ghi nhận toàn bộ thao tác vận hành</span>
            </div>
            {card.auditHistory && card.auditHistory.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {card.auditHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 bg-surface rounded-lg border border-border/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="font-bold text-text">{rec.changedBy}</span>
                      <span className="font-mono text-[11px]">
                        {new Date(rec.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-text font-medium italic">"{rec.reason}"</p>
                    <div className="text-[11px] text-text-muted">
                      Hành động: <span className="font-mono font-bold text-primary">{rec.action}</span>
                      {rec.previousStatus && rec.nextStatus && (
                        <span> ({rec.previousStatus} ➔ {rec.nextStatus})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">Chưa có bản ghi kiểm toán nào.</p>
            )}
          </div>
        )}

        {/* Section 1: Basic Identity */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-text flex items-center justify-between">
              <span>Từ vựng chính (Word) *</span>
              {!isWordValid && (
                <span className="text-[11px] text-danger font-medium">Bắt buộc nhập</span>
              )}
            </label>
            <input
              type="text"
              value={card.word}
              onChange={(e) => handleFieldChange('word', e.target.value)}
              placeholder="Ví dụ: resilient, apple, accomplish..."
              className={`w-full text-sm font-bold p-2.5 rounded-xl border bg-surface text-text focus:outline-none focus:ring-2 ${
                !isWordValid
                  ? 'border-danger focus:ring-danger/20'
                  : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text">Từ loại chính (Part of Speech)</label>
            <select
              value={card.partOfSpeech}
              onChange={(e) => handleFieldChange('partOfSpeech', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-surface text-text font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {PARTS_OF_SPEECH.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text">Trình độ chuẩn (CEFR)</label>
            <select
              value={card.cefr}
              onChange={(e) => handleFieldChange('cefr', e.target.value as CEFRLevel)}
              className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {CEFR_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Phonetic & Source */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-text flex items-center justify-between">
              <span>Phiên âm quốc tế IPA (Phonetic) *</span>
              {!isPhoneticValid && (
                <span className="text-[11px] text-amber-600 font-medium">Khuyến nghị điền</span>
              )}
            </label>
            <input
              type="text"
              value={card.phonetic}
              onChange={(e) => handleFieldChange('phonetic', e.target.value)}
              placeholder="/rɪˈzɪl.jənt/"
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text">Nguồn dữ liệu (Source)</label>
            <select
              value={card.source}
              onChange={(e) => handleFieldChange('source', e.target.value as CardSource)}
              className="w-full text-xs font-semibold p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {SOURCE_OPTIONS.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Audio Tester Component */}
        <AudioPreviewTester
          word={card.word}
          config={card.audio}
          onChange={(newAudio) => handleFieldChange('audio', newAudio)}
        />

        {/* Section 4: Image Media URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text flex items-center justify-between">
            <span>Ảnh minh họa (Illustration / Media URL)</span>
            <span className="text-[11px] text-text-muted">CDN SnapVocab hoặc Unsplash</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={card.media?.imageUrl || ''}
              onChange={(e) =>
                handleFieldChange('media', {
                  ...card.media,
                  imageUrl: e.target.value,
                })
              }
              placeholder="https://images.unsplash.com/..."
              className="flex-1 text-xs p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {card.media?.imageUrl && (
              <a
                href={card.media.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl border border-border text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
                title="Mở ảnh gốc trong tab mới"
                aria-label="Mở ảnh gốc"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>

        {/* Section 5: MULTI-MEANING & DEFINITIONS */}
        <div className="space-y-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              <span>Quản lý các tầng nghĩa ({card.meanings.length})</span>
            </div>

            <button
              type="button"
              onClick={handleAddMeaning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-light text-primary hover:bg-primary hover:text-white transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>Thêm tầng nghĩa mới</span>
            </button>
          </div>

          {/* List of Meanings */}
          <div className="space-y-4">
            {card.meanings.map((meaning, mIdx) => (
              <div
                key={meaning.id || mIdx}
                className="p-4 bg-surface-subtle/50 rounded-2xl border border-border space-y-3.5 relative"
              >
                {/* Meaning Header Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-border/70">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center font-mono">
                      {mIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-text">
                      Tầng nghĩa #{mIdx + 1}
                    </span>

                    {/* Meaning specific part of speech */}
                    <select
                      value={meaning.partOfSpeech || card.partOfSpeech}
                      onChange={(e) =>
                        handleMeaningChange(mIdx, {
                          ...meaning,
                          partOfSpeech: e.target.value,
                        })
                      }
                      className="text-xs p-1 px-2 rounded-lg border border-border bg-surface text-text font-semibold focus:outline-none"
                    >
                      {PARTS_OF_SPEECH.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move meaning up/down */}
                    <button
                      type="button"
                      disabled={mIdx === 0}
                      onClick={() => handleMoveMeaning(mIdx, 'up')}
                      className="p-1 rounded text-text-muted hover:text-text hover:bg-surface disabled:opacity-30"
                      title="Di chuyển lên"
                      aria-label="Di chuyển lên"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={mIdx === card.meanings.length - 1}
                      onClick={() => handleMoveMeaning(mIdx, 'down')}
                      className="p-1 rounded text-text-muted hover:text-text hover:bg-surface disabled:opacity-30"
                      title="Di chuyển xuống"
                      aria-label="Di chuyển xuống"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Remove meaning */}
                    {card.meanings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMeaning(mIdx)}
                        className="p-1 rounded text-text-muted hover:text-danger hover:bg-surface ml-1"
                        title="Xóa tầng nghĩa này"
                        aria-label="Xóa tầng nghĩa"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Vietnamese Definition */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text flex items-center justify-between">
                    <span>Định nghĩa tiếng Việt {mIdx === 0 ? '*' : ''}</span>
                    {mIdx === 0 && !isDefValid && (
                      <span className="text-[11px] text-danger font-medium">Bắt buộc nhập</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={meaning.definitionVi}
                    onChange={(e) =>
                      handleMeaningChange(mIdx, {
                        ...meaning,
                        definitionVi: e.target.value,
                      })
                    }
                    placeholder="Định nghĩa tiếng Việt dễ hiểu, súc tích cho người học..."
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* English Definition */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text">
                    Định nghĩa tiếng Anh (English Definition)
                  </label>
                  <textarea
                    rows={2}
                    value={meaning.definitionEn || ''}
                    onChange={(e) =>
                      handleMeaningChange(mIdx, {
                        ...meaning,
                        definitionEn: e.target.value,
                      })
                    }
                    placeholder="English dictionary definition..."
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Bilingual Examples for this meaning */}
                <div className="space-y-2 pt-2 border-t border-border/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text">
                      Câu ví dụ song ngữ ({meaning.examples?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddExample(mIdx)}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover"
                    >
                      <Plus size={13} />
                      <span>Thêm ví dụ</span>
                    </button>
                  </div>

                  {meaning.examples && meaning.examples.length > 0 ? (
                    <div className="space-y-2">
                      {meaning.examples.map((ex, exIdx) => (
                        <div
                          key={ex.id || exIdx}
                          className="p-2.5 bg-surface rounded-xl border border-border space-y-2 relative group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-text-muted shrink-0">
                              #{exIdx + 1} EN:
                            </span>
                            <input
                              type="text"
                              value={ex.en}
                              onChange={(e) => {
                                const updated = [...meaning.examples];
                                updated[exIdx] = { ...ex, en: e.target.value };
                                handleMeaningChange(mIdx, { ...meaning, examples: updated });
                              }}
                              placeholder="English sentence in real-world context..."
                              className="flex-1 text-xs p-2 rounded-lg bg-surface-subtle border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExample(mIdx, exIdx)}
                              className="text-text-muted hover:text-danger p-1 rounded hover:bg-surface-subtle"
                              title="Xóa ví dụ này"
                              aria-label="Xóa ví dụ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-text-muted shrink-0">
                              #{exIdx + 1} VI:
                            </span>
                            <input
                              type="text"
                              value={ex.vi}
                              onChange={(e) => {
                                const updated = [...meaning.examples];
                                updated[exIdx] = { ...ex, vi: e.target.value };
                                handleMeaningChange(mIdx, { ...meaning, examples: updated });
                              }}
                              placeholder="Dịch nghĩa tiếng Việt mượt mà..."
                              className="flex-1 text-xs p-2 rounded-lg bg-surface-subtle border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted italic bg-surface/50 p-2 rounded-lg border border-dashed border-border text-center">
                      Chưa có câu ví dụ nào cho tầng nghĩa này. Bấm "Thêm ví dụ" để bổ sung.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Tags & Metadata */}
        <div className="space-y-1.5 pt-3 border-t border-border">
          <label className="text-xs font-bold text-text flex items-center gap-1.5">
            <Tag size={14} className="text-text-muted" />
            <span>Thẻ từ khóa & Nhãn chủ đề (phân tách bằng dấu phẩy)</span>
          </label>
          <input
            type="text"
            value={card.tags.join(', ')}
            onChange={(e) =>
              handleFieldChange(
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              )
            }
            placeholder="toeic, business, daily, kitchen, food..."
            className="w-full text-xs p-2.5 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Bottom Action / State Machine Bar */}
      <div className="p-3.5 px-5 border-t border-border bg-surface-subtle/70 flex items-center justify-between shrink-0">
        <div className="text-xs text-text-muted flex items-center gap-2">
          <span className="font-semibold text-text">Quy trình xuất bản:</span>
          <span className="font-mono text-xs font-bold text-primary">
            {card.status === 'draft' && 'Bản nháp ➔ Gửi Kiểm duyệt'}
            {card.status === 'review' && 'Kiểm duyệt ➔ Xuất bản'}
            {card.status === 'published' && 'Đã xuất bản (Trực tiếp)'}
            {card.status === 'archived' && 'Đã lưu trữ / Ẩn'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {card.status !== 'draft' && (
            <button
              type="button"
              onClick={() => handleInitiateStatusChange('draft')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface border border-border transition-all"
            >
              Về Bản nháp
            </button>
          )}

          {card.status === 'draft' && (
            <button
              type="button"
              onClick={() => handleInitiateStatusChange('review')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-info text-white hover:bg-info-hover shadow-xs transition-all"
            >
              <Send size={14} />
              <span>Gửi Kiểm duyệt (Review)</span>
            </button>
          )}

          {card.status === 'review' && (
            <button
              type="button"
              onClick={() => handleInitiateStatusChange('published')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-xs transition-all"
            >
              <CheckCircle size={15} />
              <span>Duyệt & Xuất bản (Publish)</span>
            </button>
          )}

          {card.status === 'published' && (
            <button
              type="button"
              onClick={() => handleInitiateStatusChange('archived')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-light border border-danger/30 transition-all"
            >
              <Archive size={14} />
              <span>Lưu trữ (Archive)</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Reason Modal with Validation Checklist */}
      <AuditModal
        isOpen={showAuditModal}
        word={card.word}
        card={card}
        currentStatus={card.status}
        targetStatus={targetStatus}
        onConfirm={handleConfirmAudit}
        onCancel={() => setShowAuditModal(false)}
      />
    </div>
  );
};

