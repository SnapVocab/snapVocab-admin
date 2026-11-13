import React from 'react';
import { ShopItemListPage } from './shop-list/ShopItemListPage';
import { ShopItemEditorPage } from './shop-editor/ShopItemEditorPage';
import { Plus } from 'lucide-react';
import { Button, PageHeader } from '../../components/ui';
import { navigate } from '../../lib/router';
import { useToast } from '../../components/ui/Toast';

interface ShopEconomyPageProps {
  /** Route segment after /shop: undefined = list, "new" = create, numeric id = edit. */
  sub?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export const ShopEconomyPage: React.FC<ShopEconomyPageProps> = ({ sub, onDirtyChange }) => {
  // The editor lives in the URL, so F5 and shared links reopen the same item.
  const editorState: { isOpen: boolean; mode: 'create' | 'edit'; itemId?: number } =
    sub === 'new' ? { isOpen: true, mode: 'create' }
      : sub && /^\d+$/.test(sub) ? { isOpen: true, mode: 'edit', itemId: Number(sub) }
      : { isOpen: false, mode: 'create' };

  const { show: showToast, node: toastNode } = useToast();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 space-y-4 min-w-0 text-text">
      {toastNode}

      {/* Page Header — only shown in List view. In Editor view, Editor owns its clean header */}
      {!editorState.isOpen && (
        <PageHeader
          title="Cửa hàng & Vật phẩm"
          description="Giá quy ra ngày: số ngày người học làm đủ 5 nhiệm vụ để mua được (tối đa 85 Coin mỗi ngày)."
          actions={
            <Button variant="primary" icon={<Plus />} onClick={() => navigate('/shop/new')}>
              Tạo vật phẩm mới
            </Button>
          }
        />
      )}

      {/* MAIN WORKFLOW: SHOP ITEM EDITOR OR SHOP ITEM LIST */}
      {editorState.isOpen && (
        <ShopItemEditorPage
          // Remount on create -> edit so the editor loads the saved draft by id.
          key={`${editorState.mode}-${editorState.itemId ?? 'new'}`}
          mode={editorState.mode}
          itemId={editorState.itemId}
          onBack={() => navigate('/shop')}
          onSaved={(item) => {
            if (editorState.mode === 'create') navigate(`/shop/${item.id}`, { replace: true });
          }}
          onToast={showToast}
          onDirtyChange={onDirtyChange}
        />
      )}
      {/* Stays mounted behind the editor so search, filters and page survive a round trip. */}
      <div hidden={editorState.isOpen}>
        <ShopItemListPage
          onCreateItem={() => navigate('/shop/new')}
          onEditItem={(id) => navigate(`/shop/${id}`)}
          onToast={showToast}
        />
      </div>
    </div>
  );
};
