import React, { useState } from 'react';
import { ShopItemListPage } from './shop-list/ShopItemListPage';
import { ShopItemEditorPage } from './shop-editor/ShopItemEditorPage';
import { CheckCircle2 } from 'lucide-react';

interface ShopEconomyPageProps {
  onNavigate?: (navId: string) => void;
  onWordChange?: (wordName: string) => void;
}

export const ShopEconomyPage: React.FC<ShopEconomyPageProps> = () => {
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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 space-y-4 select-none min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-text text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header — only shown in List view. In Editor view, Editor owns its clean header */}
      {!editorState.isOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <span>Cửa Hàng</span>
            </div>
            <h1 className="text-xl font-extrabold text-text tracking-tight">
              Quản Lý Cửa Hàng
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Danh mục vật phẩm học tập: Chủ đề, Khung Avatar và XP Booster.
            </p>
          </div>
        </div>
      )}

      {/* MAIN WORKFLOW: SHOP ITEM EDITOR OR SHOP ITEM LIST */}
      {editorState.isOpen ? (
        <ShopItemEditorPage
          mode={editorState.mode}
          itemId={editorState.itemId}
          onBack={() => setEditorState({ isOpen: false, mode: 'create' })}
          onToast={showToast}
        />
      ) : (
        <ShopItemListPage
          onCreateItem={() => setEditorState({ isOpen: true, mode: 'create' })}
          onEditItem={(id) => setEditorState({ isOpen: true, mode: 'edit', itemId: id })}
          onToast={showToast}
        />
      )}
    </div>
  );
};
