import React, { useState } from 'react';
import { ShopItemListPage } from './shop-list/ShopItemListPage';
import { ShopItemEditorPage } from './shop-editor/ShopItemEditorPage';
import { Check, ShoppingBag } from 'lucide-react';
import { PageHeader } from '../../components/ui';

interface ShopEconomyPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const ShopEconomyPage: React.FC<ShopEconomyPageProps> = ({ onDirtyChange }) => {
  // Navigation: Shop Items List <-> Shop Item Editor
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    itemId?: number;
  }>({ isOpen: false, mode: 'create' });

  // Success Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 space-y-4 min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed right-6 top-6 z-40 flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-4 py-3 text-xs font-bold text-primary-dark shadow-elevated">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header — only shown in List view. In Editor view, Editor owns its clean header */}
      {!editorState.isOpen && (
        <PageHeader
          eyebrow="Gamification"
          icon={<ShoppingBag />}
          title="Cửa hàng"
          description="Danh mục vật phẩm người học mua bằng Coin: Giao diện cửa hàng, Khung avatar và XP Booster."
        />
      )}

      {/* MAIN WORKFLOW: SHOP ITEM EDITOR OR SHOP ITEM LIST */}
      {editorState.isOpen && (
        <ShopItemEditorPage
          // Remount on create -> edit so the editor loads the saved draft by id.
          key={`${editorState.mode}-${editorState.itemId ?? 'new'}`}
          mode={editorState.mode}
          itemId={editorState.itemId}
          onBack={() => setEditorState({ isOpen: false, mode: 'create' })}
          onSaved={(item) => {
            if (editorState.mode === 'create') {
              setEditorState({ isOpen: true, mode: 'edit', itemId: item.id });
            }
          }}
          onToast={showToast}
          onDirtyChange={onDirtyChange}
        />
      )}
      {/* Stays mounted behind the editor so search, filters and page survive a round trip. */}
      <div hidden={editorState.isOpen}>
        <ShopItemListPage
          onCreateItem={() => setEditorState({ isOpen: true, mode: 'create' })}
          onEditItem={(id) => setEditorState({ isOpen: true, mode: 'edit', itemId: id })}
          onToast={showToast}
        />
      </div>
    </div>
  );
};
