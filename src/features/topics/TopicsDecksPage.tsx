import React, { useState, useMemo } from 'react';
import {
  Collection,
  Topic,
  TopicItem,
  SystemDeck,
  DeckNote,
  TopicsTab,
  TopicFilterState,
  BatchImportRow,
  CardTemplateType,
} from '../../domains/topics/types';
import { VocabStatus } from '../../domains/flashcard/types';
import {
  INITIAL_COLLECTIONS,
  INITIAL_TOPICS,
  INITIAL_TOPIC_ITEMS,
  INITIAL_SYSTEM_DECKS,
  MOCK_DECK_NOTES,
} from '../../domains/topics/mock-data';
import {
  computeTopicMetrics,
  filterTopicItems,
} from '../../domains/topics/selectors';
import { TopicMetricsRibbon } from './components/TopicMetricsRibbon';
import { TopicTreeNavigator } from './components/TopicTreeNavigator';
import { TopicDetailView } from './components/TopicDetailView';
import { SystemDecksView } from './components/SystemDecksView';
import { BatchImportSection } from './components/BatchImportSection';
import { TopicModal } from './components/TopicModal';
import { DeckModal } from './components/DeckModal';
import { AddWordToTopicModal } from './components/AddWordToTopicModal';
import {
  FolderTree,
  Layers,
  FileSpreadsheet,
  RotateCw,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface TopicsDecksPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const TopicsDecksPage: React.FC<TopicsDecksPageProps> = ({
  onNavigate,
  onWordChange,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TopicsTab>('collections-topics');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Vừa cập nhật');

  // Domain States
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [topicItems, setTopicItems] = useState<TopicItem[]>(INITIAL_TOPIC_ITEMS);
  const [systemDecks, setSystemDecks] = useState<SystemDeck[]>(INITIAL_SYSTEM_DECKS);
  const [deckNotes] = useState<DeckNote[]>(MOCK_DECK_NOTES);

  // Active Selection & Filters
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    INITIAL_TOPICS[1]?.id || INITIAL_TOPICS[0]?.id || ''
  );
  const [topicFilter, setTopicFilter] = useState<TopicFilterState>({
    collectionId: 'all',
    searchQuery: '',
    cefrLevel: 'all',
    status: 'all',
    partOfSpeech: 'all',
  });

  // Modal States
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicToArchiveId, setTopicToArchiveId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [modalDefaultParentId, setModalDefaultParentId] = useState<string | undefined>();
  const [modalDefaultCollectionId, setModalDefaultCollectionId] = useState<string | undefined>();

  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<SystemDeck | null>(null);
  const [prefilledDeckTopic, setPrefilledDeckTopic] = useState<Topic | null>(null);

  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);

  // Compute Metrics
  const metrics = useMemo(
    () => computeTopicMetrics(collections, topics, topicItems, systemDecks),
    [collections, topics, topicItems, systemDecks]
  );

  // Current selected Topic & Collection
  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];
  const currentCollection = collections.find((c) => c.id === currentTopic?.collectionId);
  const parentTopic = currentTopic?.parentId
    ? topics.find((t) => t.id === currentTopic.parentId)
    : undefined;

  // Filtered items for current topic
  const filteredItems = useMemo(
    () => filterTopicItems(topicItems, currentTopic?.id, topicFilter),
    [topicItems, currentTopic, topicFilter]
  );

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }, 400);
  };

  // Open in Content Studio handler
  const handleOpenInStudio = (word: string) => {
    if (onWordChange) {
      onWordChange(word);
    }
    if (onNavigate) {
      onNavigate('content-studio');
    }
  };

  // Topic Handlers
  const handleOpenCreateTopic = (parentId?: string, collectionId?: string) => {
    setEditingTopic(null);
    setModalDefaultParentId(parentId);
    setModalDefaultCollectionId(collectionId);
    setIsTopicModalOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setModalDefaultParentId(topic.parentId);
    setModalDefaultCollectionId(topic.collectionId);
    setIsTopicModalOpen(true);
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopicToArchiveId(topicId);
  };

  const handleConfirmArchiveTopic = () => {
    if (!topicToArchiveId) return;
    setTopics((prev) =>
      prev.map((t) => (t.id === topicToArchiveId ? { ...t, status: 'archived' } : t))
    );
    setTopicToArchiveId(null);
  };

  const handleSaveTopic = (topicData: Partial<Topic>) => {
    if (topicData.id) {
      // Update
      setTopics((prev) =>
        prev.map((t) => (t.id === topicData.id ? ({ ...t, ...topicData } as Topic) : t))
      );
    } else {
      // Create new
      const newTopic: Topic = {
        id: `top-${Date.now().toString().slice(-4)}`,
        collectionId: topicData.collectionId || collections[0]?.id || 'col-default',
        collectionName: topicData.collectionName || 'Collection',
        parentId: topicData.parentId,
        name: topicData.name || 'New Topic',
        nameVi: topicData.nameVi || 'Chủ đề mới',
        slug: topicData.slug || 'new-topic',
        description: topicData.description || '',
        targetCefr: topicData.targetCefr || 'B1',
        icon: topicData.icon || '📁',
        wordCount: 0,
        activeLearnersCount: 0,
        status: topicData.status || 'published',
        orderIndex: topics.length + 1,
      };
      setTopics((prev) => [...prev, newTopic]);
      setSelectedTopicId(newTopic.id);
    }
  };

  // Vocabulary Items Handlers
  const handleAddWordToTopic = (
    wordData: Omit<TopicItem, 'id' | 'addedAt' | 'orderIndex'>
  ) => {
    const newItem: TopicItem = {
      ...wordData,
      id: `ti-${Date.now().toString().slice(-5)}`,
      addedAt: new Date().toISOString(),
      orderIndex: topicItems.length + 1,
    };

    setTopicItems((prev) => [newItem, ...prev]);

    // Update topic word count
    setTopics((prev) =>
      prev.map((t) =>
        t.id === wordData.topicId ? { ...t, wordCount: t.wordCount + 1 } : t
      )
    );
  };

  const handleRemoveWordFromTopic = (itemId: string) => {
    const item = topicItems.find((i) => i.id === itemId);
    setTopicItems((prev) => prev.filter((i) => i.id !== itemId));

    if (item) {
      setTopics((prev) =>
        prev.map((t) =>
          t.id === item.topicId
            ? { ...t, wordCount: Math.max(0, t.wordCount - 1) }
            : t
        )
      );
    }
  };

  const handleBulkStatusChange = (itemIds: string[], newStatus: VocabStatus) => {
    setTopicItems((prev) =>
      prev.map((item) =>
        itemIds.includes(item.id) ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleBulkRemove = (itemIds: string[]) => {
    setTopicItems((prev) => prev.filter((item) => !itemIds.includes(item.id)));
  };

  // System Deck Handlers
  const handleOpenCreateDeck = (topic?: Topic) => {
    setEditingDeck(null);
    setPrefilledDeckTopic(topic || null);
    setIsDeckModalOpen(true);
  };

  const handleSaveDeck = (deckData: Partial<SystemDeck>) => {
    if (deckData.id) {
      setSystemDecks((prev) =>
        prev.map((d) => (d.id === deckData.id ? ({ ...d, ...deckData } as SystemDeck) : d))
      );
    } else {
      const newDeck: SystemDeck = {
        id: `deck-${Date.now().toString().slice(-4)}`,
        title: deckData.title || 'New Deck',
        titleVi: deckData.titleVi || 'Bộ bài mới',
        description: deckData.description || '',
        icon: deckData.icon || '📦',
        templateId: deckData.templateId || 'CLASSIC',
        templateName: deckData.templateName || 'Classic Flashcard Layout',
        targetCefr: deckData.targetCefr || 'B1',
        sourceTopicId: deckData.sourceTopicId,
        sourceTopicName: deckData.sourceTopicName,
        sourceCollectionId: deckData.sourceCollectionId,
        sourceCollectionName: deckData.sourceCollectionName,
        noteCount: deckData.noteCount || 20,
        activeLearners: 0,
        completionRate: 0,
        isRecommended: deckData.isRecommended ?? true,
        isSystemDefault: deckData.isSystemDefault ?? false,
        status: 'published',
        lastUpdated: new Date().toISOString(),
      };
      setSystemDecks((prev) => [newDeck, ...prev]);
    }
  };

  const handleUpdateDeckTemplate = (deckId: string, newTemplate: CardTemplateType) => {
    const templateNames: Record<CardTemplateType, string> = {
      CLASSIC: 'Classic Flashcard Layout',
      LISTENING: 'Audio-First Listening Focus',
      VISUAL_IMAGE: 'Visual Image Hero Layout',
      CLOZE_TYPING: 'Cloze Deletion & Typing Practice',
      MINIMAL: 'Minimal Zen Reader',
    };

    setSystemDecks((prev) =>
      prev.map((d) =>
        d.id === deckId
          ? {
              ...d,
              templateId: newTemplate,
              templateName: templateNames[newTemplate],
              lastUpdated: new Date().toISOString(),
            }
          : d
      )
    );
  };

  const handleCloneDeck = (deck: SystemDeck) => {
    const cloned: SystemDeck = {
      ...deck,
      id: `deck-${Date.now().toString().slice(-4)}`,
      title: `${deck.title} (Bản sao)`,
      titleVi: `${deck.titleVi} (Bản sao)`,
      activeLearners: 0,
      completionRate: 0,
      isSystemDefault: false,
      lastUpdated: new Date().toISOString(),
    };
    setSystemDecks((prev) => [cloned, ...prev]);
  };

  // Batch Import Commit Handler
  const handleCommitBatchImport = (topicId: string, validRows: BatchImportRow[]) => {
    const newItems: TopicItem[] = validRows.map((r, idx) => ({
      id: `ti-imp-${Date.now().toString().slice(-4)}-${idx}`,
      topicId,
      word: r.word,
      phonetic: r.phonetic || `/${r.word.toLowerCase()}/`,
      partOfSpeech: r.partOfSpeech,
      cefr: r.cefr,
      definitionVi: r.definitionVi,
      exampleEn: r.exampleEn,
      exampleVi: r.exampleVi,
      status: 'published',
      source: 'TOPIC',
      tags: ['batch-import'],
      addedAt: new Date().toISOString(),
      orderIndex: topicItems.length + idx + 1,
    }));

    setTopicItems((prev) => [...newItems, ...prev]);

    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, wordCount: t.wordCount + newItems.length }
          : t
      )
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Header Action Bar */}
      <div className="p-4 bg-surface border-b border-border space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-text tracking-tight">
                Quản Trị Chủ Đề & Bộ Thẻ Học (Topics & Decks Console)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-bold border border-primary/20">
                Learning Domain SS-05 & SS-08
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Cấu trúc phân cấp Collections & Topics, Quản lý từ vựng theo chủ đề, và Bộ bài mẫu hệ thống (Curated Decks)
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-text-muted shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-medium">{lastUpdated}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-text-muted hover:text-text transition-all shadow-xs ${
                isRefreshing ? 'animate-spin text-primary' : ''
              }`}
              title="Làm mới dữ liệu thống kê"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* High-Density Metric Ribbon */}
        <TopicMetricsRibbon metrics={metrics} onNavigateTab={setActiveTab} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-t border-border/60 pt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('collections-topics')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'collections-topics'
                ? 'bg-primary-light text-primary font-bold shadow-xs'
                : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
          >
            <FolderTree size={14} />
            <span>Cây Chủ Đề & Danh Mục Từ Vựng ({topics.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system-decks')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'system-decks'
                ? 'bg-reward-light text-[#9A7000] font-bold shadow-xs'
                : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
          >
            <Layers size={14} />
            <span>Kho Bộ Bài Mẫu & Card Template ({systemDecks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch-operations')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'batch-operations'
                ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Nhập Liệu Hàng Loạt & Đồng Bộ EAV</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'collections-topics' && (
          <div className="h-full w-full flex overflow-hidden">
            {/* Left Column: Tree Navigator (320px) */}
            <div className="w-80 shrink-0 h-full overflow-hidden">
              <TopicTreeNavigator
                collections={collections}
                topics={topics}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
                onOpenCreateTopic={handleOpenCreateTopic}
                onOpenCreateCollection={() => handleOpenCreateTopic()}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
              />
            </div>

            {/* Right Column: Topic Detail & Items Table (Flex-1) */}
            <div className="flex-1 h-full overflow-hidden">
              <TopicDetailView
                currentCollection={currentCollection}
                currentTopic={currentTopic}
                parentTopic={parentTopic}
                items={filteredItems}
                filter={topicFilter}
                onFilterChange={(newF) => setTopicFilter((prev) => ({ ...prev, ...newF }))}
                onOpenInStudio={handleOpenInStudio}
                onRemoveItem={handleRemoveWordFromTopic}
                onBulkStatusChange={handleBulkStatusChange}
                onBulkRemove={handleBulkRemove}
                onOpenAddWordModal={() => setIsAddWordModalOpen(true)}
                onOpenEditTopicModal={handleEditTopic}
                onOpenCreateDeckModal={(t) => handleOpenCreateDeck(t)}
              />
            </div>
          </div>
        )}

        {activeTab === 'system-decks' && (
          <SystemDecksView
            decks={systemDecks}
            deckNotes={deckNotes}
            onOpenCreateDeck={() => handleOpenCreateDeck()}
            onUpdateDeckTemplate={handleUpdateDeckTemplate}
            onOpenInStudio={handleOpenInStudio}
            onCloneDeck={handleCloneDeck}
          />
        )}

        {activeTab === 'batch-operations' && (
          <BatchImportSection
            topics={topics}
            existingItems={topicItems}
            selectedTopicId={selectedTopicId}
            onCommitImport={handleCommitBatchImport}
          />
        )}
      </div>

      {/* Modals */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        onSaveTopic={handleSaveTopic}
        collections={collections}
        topics={topics}
        editingTopic={editingTopic}
        defaultParentId={modalDefaultParentId}
        defaultCollectionId={modalDefaultCollectionId}
      />

      <DeckModal
        isOpen={isDeckModalOpen}
        onClose={() => setIsDeckModalOpen(false)}
        onSaveDeck={handleSaveDeck}
        topics={topics}
        editingDeck={editingDeck}
        prefilledTopic={prefilledDeckTopic}
      />

      <AddWordToTopicModal
        isOpen={isAddWordModalOpen}
        onClose={() => setIsAddWordModalOpen(false)}
        currentTopic={currentTopic}
        onAddWord={handleAddWordToTopic}
      />

      {/* Archive Topic Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(topicToArchiveId)}
        tone="warning"
        title="Lưu trữ chủ đề này?"
        description="Bạn có chắc chắn muốn lưu trữ chủ đề này? Hành động soft-delete sẽ ẩn chủ đề khỏi danh mục chọn mới nhưng vẫn bảo toàn đầy đủ các thẻ từ vựng và tiến độ học của học viên."
        confirmLabel="Lưu trữ chủ đề"
        cancelLabel="Hủy"
        confirmVariant="danger"
        onConfirm={handleConfirmArchiveTopic}
        onClose={() => setTopicToArchiveId(null)}
      />
    </div>
  );
};
