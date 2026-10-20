import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Plus } from 'lucide-react';
import { NAV } from './nav';

interface CommandItem {
  id: string;
  category: 'Trang' | 'Tác vụ';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  path: string;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

/** Real destinations only: every page in the nav, plus create actions that deep-link into the editors. */
const COMMAND_LIST: CommandItem[] = [
  ...(NAV.some((i) => i.id === 'shop')
    ? [{ id: 'new-shop-item', category: 'Tác vụ' as const, title: 'Tạo vật phẩm mới', subtitle: 'Cửa hàng & Vật phẩm', icon: <Plus size={16} />, path: '/shop/new' }]
    : []),
  ...(NAV.some((i) => i.id === 'missions')
    ? [{ id: 'new-mission', category: 'Tác vụ' as const, title: 'Tạo nhiệm vụ', subtitle: 'Nhiệm vụ hằng ngày', icon: <Plus size={16} />, path: '/missions/new' }]
    : []),
  ...NAV.map((i) => ({ id: `nav-${i.id}`, category: 'Trang' as const, title: i.label, subtitle: i.section, icon: <i.Icon size={16} />, path: i.path })),
];

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items by query
  const filteredItems = COMMAND_LIST.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Focus input when opened & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        onNavigate(selectedItem.path);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Chuyển nhanh tới trang hoặc tác vụ"
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-lg shadow-elevated overflow-hidden transition-all transform scale-100 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Đi tới trang hoặc tác vụ…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-light focus:outline-none"
            aria-label="Tìm trang hoặc tác vụ"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-text-muted hover:text-text p-1 rounded"
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-2xs font-mono font-bold bg-surface-subtle border border-border rounded text-text-muted select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-1.5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              Không tìm thấy trang hay tác vụ nào khớp với "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${isSelected ? 'bg-surface-subtle' : ''}`}
                >
                  <span className="shrink-0 text-text-muted">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-body text-text">{item.title}</span>
                  <span className="shrink-0 text-xs text-text-light">{item.category === 'Tác vụ' ? `Tác vụ · ${item.subtitle}` : item.subtitle}</span>
                  <ArrowRight size={13} className={`shrink-0 text-text-muted ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-surface-subtle border-t border-border flex items-center justify-between text-xs text-text-muted select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono font-bold bg-surface border border-border px-1 py-0.5 rounded text-2xs">
                ↑
              </kbd>{' '}
              <kbd className="font-mono font-bold bg-surface border border-border px-1 py-0.5 rounded text-2xs">
                ↓
              </kbd>{' '}
              để di chuyển
            </span>
            <span>
              <kbd className="font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-2xs">
                Enter
              </kbd>{' '}
              để chọn
            </span>
          </div>
          <span>
            <kbd className="font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-2xs">
              Esc
            </kbd>{' '}
            để đóng
          </span>
        </div>
      </div>
    </div>
  );
};
