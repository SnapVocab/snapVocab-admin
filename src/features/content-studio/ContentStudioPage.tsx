import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  EyeOff
} from 'lucide-react';
import { WordList } from './WordList';
import { WordEditor } from './WordEditor';
import { MobileSimulator } from '../../components/preview/MobileSimulator';
import { INITIAL_VOCABULARY } from '../../domains/vocabulary/mock-data';
import { CardViewModel, VocabStatus } from '../../domains/flashcard/types';

interface ContentStudioPageProps {
  onWordChange?: (wordName: string) => void;
}

const STORAGE_KEY = 'snapvocab_studio_cards_v1';

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export const ContentStudioPage: React.FC<ContentStudioPageProps> = ({ onWordChange }) => {
  // Safe initial state load from LocalStorage
  const [vocabulary, setVocabulary] = useState<CardViewModel[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load vocabulary from localStorage:', e);
    }
    return INITIAL_VOCABULARY;
  });

  const [selectedWordId, setSelectedWordId] = useState<string>(() => {
    return vocabulary[0]?.id || '';
  });

  // Responsive panel visibility
  const [showWordList, setShowWordList] = useState(true);
  const [showMobileSimulator, setShowMobileSimulator] = useState(true);

  // Persistence status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCard = vocabulary.find((w) => w.id === selectedWordId) || vocabulary[0];

  // Save to localStorage directly
  const persistToStorage = useCallback((data: CardViewModel[]) => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Error writing to localStorage', err);
      setSaveStatus('error');
    }
  }, []);

  // Debounced auto-save whenever vocabulary changes
  const queueAutoSave = useCallback((updatedVocabulary: CardViewModel[]) => {
    setSaveStatus('dirty');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistToStorage(updatedVocabulary);
    }, 700);
  }, [persistToStorage]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Warn if user tries to close page while dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu trong Content Studio.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Manual save handler & keyboard shortcut (Ctrl+S / Cmd+S)
  const handleManualSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    persistToStorage(vocabulary);
  }, [vocabulary, persistToStorage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Reset to initial mock data
  const handleResetToInitial = () => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn khôi phục dữ liệu mẫu gốc? Mọi thay đổi lưu tạm trên trình duyệt sẽ được làm mới.'
    );
    if (confirmed) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
      setVocabulary(INITIAL_VOCABULARY);
      setSelectedWordId(INITIAL_VOCABULARY[0]?.id || '');
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      if (onWordChange && INITIAL_VOCABULARY[0]) {
        onWordChange(INITIAL_VOCABULARY[0].word);
      }
    }
  };

  const handleSelectWord = (id: string) => {
    setSelectedWordId(id);
    const card = vocabulary.find((w) => w.id === id);
    if (card && onWordChange) {
      onWordChange(card.word);
    }
  };

  const handleUpdateCard = (updated: CardViewModel) => {
    const updatedList = vocabulary.map((item) =>
      item.id === updated.id ? updated : item
    );
    setVocabulary(updatedList);
    queueAutoSave(updatedList);
    if (onWordChange) {
      onWordChange(updated.word);
    }
  };

  const handleStatusTransition = (newStatus: VocabStatus, reason: string) => {
    if (!currentCard) return;

    const auditEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `TRANSITION_TO_${newStatus.toUpperCase()}`,
      changedBy: 'Admin Lead',
      reason,
      previousStatus: currentCard.status,
      nextStatus: newStatus,
    };

    const updatedCard: CardViewModel = {
      ...currentCard,
      status: newStatus,
      lastUpdated: new Date().toISOString(),
      auditHistory: [auditEntry, ...(currentCard.auditHistory || [])],
    };

    handleUpdateCard(updatedCard);
  };

  const handleAddNewWord = () => {
    const newId = `vocab-${Date.now().toString().slice(-4)}`;
    const newCard: CardViewModel = {
      id: newId,
      word: 'từ vựng mới',
      phonetic: '/.../',
      partOfSpeech: 'noun',
      cefr: 'A2',
      status: 'draft',
      source: 'DICT',
      topicName: 'Từ vựng chung',
      lastUpdated: new Date().toISOString(),
      audio: {
        sourceType: 'tts',
        voice: 'en-US',
        speed: 1.0,
        pitch: 1.0,
      },
      meanings: [
        {
          id: `m-${Date.now()}`,
          partOfSpeech: 'noun',
          definitionVi: 'Nhập nghĩa tiếng Việt tại đây...',
          examples: [
            {
              id: `ex-${Date.now()}`,
              en: 'This is a sample sentence.',
              vi: 'Đây là một câu ví dụ mẫu.',
            },
          ],
        },
      ],
      tags: ['mới'],
      auditHistory: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'CREATE_DRAFT',
          changedBy: 'Admin Lead',
          reason: 'Tạo bản nháp từ mới trong Content Studio',
          nextStatus: 'draft',
        },
      ],
    };

    const updatedList = [newCard, ...vocabulary];
    setVocabulary(updatedList);
    setSelectedWordId(newId);
    queueAutoSave(updatedList);
    if (onWordChange) {
      onWordChange(newCard.word);
    }
  };

  if (!currentCard) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Chưa có từ vựng nào trong kho dữ liệu.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none bg-background">
      {/* Studio Global Action & Persistence Bar */}
      <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between shrink-0 text-xs">
        {/* Left: Panel toggles & breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWordList(!showWordList)}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              showWordList
                ? 'bg-surface-subtle text-text border-border'
                : 'bg-primary-light text-primary border-primary/30 font-bold'
            }`}
            title={showWordList ? 'Thu gọn danh sách từ' : 'Mở rộng danh sách từ'}
            aria-label="Chuyển đổi danh sách từ"
          >
            {showWordList ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            <span className="hidden sm:inline font-medium">Danh sách từ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMobileSimulator(!showMobileSimulator)}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              showMobileSimulator
                ? 'bg-surface-subtle text-text border-border'
                : 'bg-primary-light text-primary border-primary/30 font-bold'
            }`}
            title={showMobileSimulator ? 'Ẩn Mobile Simulator' : 'Hiện Mobile Simulator'}
            aria-label="Chuyển đổi Mobile Simulator"
          >
            {showMobileSimulator ? <Smartphone size={15} /> : <EyeOff size={15} />}
            <span className="hidden sm:inline font-medium">Mobile Preview</span>
          </button>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          <span className="text-text-muted hidden md:inline">
            Đang biên tập: <strong className="text-text font-bold font-mono">{currentCard.word}</strong>
          </span>
        </div>

        {/* Right: Auto-save status, Save Button, Reset Button */}
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs">
            {saveStatus === 'saving' && (
              <span className="text-amber-600 flex items-center gap-1 font-medium">
                <Loader2 size={13} className="animate-spin text-amber-500" />
                <span>Đang lưu...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>
                  Đã lưu tự động{' '}
                  {lastSavedAt
                    ? lastSavedAt.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : ''}
                </span>
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Có thay đổi chưa lưu</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-danger flex items-center gap-1 font-medium bg-danger-light px-2 py-0.5 rounded-md border border-danger/20">
                <AlertCircle size={13} />
                <span>Lỗi lưu dữ liệu</span>
              </span>
            )}
          </div>

          {/* Manual Save Button (Ctrl+S) */}
          <button
            type="button"
            onClick={handleManualSave}
            title="Lưu thay đổi ngay lập tức (Ctrl+S)"
            aria-label="Lưu ngay"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
          >
            <Save size={13} />
            <span className="hidden sm:inline">Lưu ngay</span>
            <span className="text-[10px] text-primary-light/80 font-mono hidden md:inline">(Ctrl+S)</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetToInitial}
            title="Khôi phục dữ liệu gốc SnapVocab"
            aria-label="Khôi phục mẫu gốc"
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-subtle transition-all"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 3-Column Flexible Workspace Container */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0">
        {/* Column 1: Word List */}
        {showWordList && (
          <div className="w-72 shrink-0 h-full overflow-hidden transition-all animate-in slide-in-from-left-2 duration-150">
            <WordList
              words={vocabulary}
              selectedId={selectedWordId}
              onSelectWord={handleSelectWord}
              onAddNewWord={handleAddNewWord}
            />
          </div>
        )}

        {/* Column 2: Word Editor (Flexible remaining space, never clipped) */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <WordEditor
            card={currentCard}
            onUpdateCard={handleUpdateCard}
            onStatusTransition={handleStatusTransition}
          />
        </div>

        {/* Column 3: Live Mobile Simulator */}
        {showMobileSimulator && (
          <div className="w-[380px] shrink-0 h-full overflow-hidden transition-all animate-in slide-in-from-right-2 duration-150">
            <MobileSimulator card={currentCard} />
          </div>
        )}
      </div>
    </div>
  );
};

