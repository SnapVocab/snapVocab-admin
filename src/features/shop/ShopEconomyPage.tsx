import React, { useState } from 'react';
import { ShopItemListPage } from './shop-list/ShopItemListPage';
import { ShopItemEditorPage } from './shop-editor/ShopItemEditorPage';
import { CheckCircle2 } from 'lucide-react';

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
        <div role="status" className="fixed top-5 right-5 z-50 bg-text text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header — only shown in List view. In Editor view, Editor owns its clean header */}
      {!editorState.isOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <span>Cửa hàng</span>
            </div>
            <h1 className="text-xl font-extrabold text-text tracking-tight">
              Quản lý cửa hàng
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Danh mục vật phẩm: Giao diện cửa hàng, Khung avatar và XP Booster.
            </p>
          </div>
        </div>
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
