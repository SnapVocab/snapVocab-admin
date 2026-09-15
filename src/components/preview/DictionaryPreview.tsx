import React, { useState } from 'react';
import { Volume2, Bookmark, CheckCircle2, BookOpen, ExternalLink, Sparkles, Tag } from 'lucide-react';
import { CardViewModel, CEFRLevel } from '../../domains/flashcard/types';

interface DictionaryPreviewProps {
  card: CardViewModel;
}

const CEFR_COLORS: Record<CEFRLevel, { bg: string; text: string; border: string }> = {
  A1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  A2: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  B1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  B2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  C1: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  C2: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export const DictionaryPreview: React.FC<DictionaryPreviewProps> = ({ card }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const cefrStyle = CEFR_COLORS[card.cefr] || CEFR_COLORS.B1;

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If custom audio file with blob URL is available
    if (card.audio?.sourceType === 'custom' && card.audio?.url) {
      try {
        const audio = new Audio(card.audio.url);
        setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        audio.play().catch(() => setIsPlayingAudio(false));
        return;
      } catch (err) {
        console.error('Audio playback error', err);
      }
    }

    // Otherwise Web Speech API TTS
    if ('speechSynthesis' in window && card.word) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = card.audio?.voice || 'en-US';
      utterance.rate = card.audio?.speed || 1.0;
      utterance.pitch = card.audio?.pitch || 1.0;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-2 py-1 text-left space-y-3.5 select-none scrollbar-thin">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${cefrStyle.bg} ${cefrStyle.text} ${cefrStyle.border}`}
          >
            {card.cefr}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-subtle text-text-muted border border-border">
            {card.partOfSpeech || 'từ vựng'}
          </span>
          {card.source === 'SCAN' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-snapy-light text-snapy border border-snapy/20">
              AI SCAN
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Lưu vào sổ tay từ vựng"
          className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface transition-colors"
        >
          <Bookmark size={15} />
        </button>
      </div>

      {/* Headword Section */}
      <div className="bg-surface rounded-xl p-3.5 border border-border/80 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-2xl font-black text-text tracking-tight font-sans">
              {card.word || <span className="text-text-muted italic">Từ vựng mới</span>}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-medium text-text-muted">
                {card.phonetic || '/.../'}
              </span>
              <span className="text-[10px] text-text-light font-medium">
                ({card.audio?.voice === 'en-GB' ? 'UK' : 'US'})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePronounce}
            aria-label="Nghe phát âm"
            className={`p-2 rounded-full border transition-all ${
              isPlayingAudio
                ? 'bg-primary text-white border-primary shadow-sm scale-105 animate-pulse'
                : 'bg-primary-light text-primary border-primary/20 hover:scale-105'
            }`}
          >
            <Volume2 size={16} />
          </button>
        </div>

        {card.topicName && (
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-muted">
            <span>Chủ đề: <strong className="text-text font-medium">{card.topicName}</strong></span>
            <span className="text-[10px] text-primary font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> Chuẩn SRS
            </span>
          </div>
        )}
      </div>

      {/* Image Preview if available */}
      {card.media?.imageUrl && (
        <div className="w-full h-32 rounded-xl overflow-hidden border border-border bg-surface-subtle relative group shadow-xs">
          <img
            src={card.media.imageUrl}
            alt={card.word}
            className="w-full h-full object-cover"
          />
          {card.media.aiConfidence && (
            <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono bg-black/75 text-white px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
              <Sparkles size={10} className="text-amber-300" />
              {(card.media.aiConfidence * 100).toFixed(0)}% khớp AI
            </span>
          )}
        </div>
      )}

      {/* Meanings & Examples List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-text uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-primary" />
            Các tầng nghĩa ({card.meanings.length})
          </span>
        </div>

        {card.meanings.map((meaning, mIdx) => (
          <div
            key={meaning.id || mIdx}
            className="bg-surface rounded-xl p-3 border border-border/70 space-y-2 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-light text-primary font-bold text-[10px] flex items-center justify-center font-mono">
                {mIdx + 1}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-subtle text-text-muted border border-border">
                {meaning.partOfSpeech || card.partOfSpeech}
              </span>
            </div>

            {/* Vietnamese Definition */}
            <p className="text-xs font-bold text-text leading-relaxed pl-1">
              {meaning.definitionVi || <span className="text-text-muted italic">Chưa có định nghĩa</span>}
            </p>

            {/* English Definition */}
            {meaning.definitionEn && (
              <div className="bg-surface-subtle/80 p-2 rounded-lg border border-border/50 text-[11px] text-text leading-relaxed">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                  Định nghĩa tiếng Anh:
                </span>
                {meaning.definitionEn}
              </div>
            )}

            {/* Bilingual Examples */}
            {meaning.examples && meaning.examples.length > 0 && (
              <div className="pt-1.5 border-t border-border/60 space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Ví dụ ngữ cảnh ({meaning.examples.length}):
                </span>
                {meaning.examples.map((ex, eIdx) => (
                  <div key={ex.id || eIdx} className="bg-surface-subtle/40 p-2 rounded-lg space-y-0.5">
                    <p className="text-[11px] font-medium text-text italic">
                      "{ex.en}"
                    </p>
                    <p className="text-[11px] text-text-muted">
                      👉 {ex.vi}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tags & Keywords */}
      {card.tags && card.tags.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-text-muted mb-1.5">
            <Tag size={12} />
            <span>Thẻ từ khóa</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface border border-border text-text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
