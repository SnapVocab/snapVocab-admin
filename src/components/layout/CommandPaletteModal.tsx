import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  BookOpen,
  Camera,
  AlertTriangle,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  FolderTree,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'Trang Điều Hướng' | 'Tác Vụ Nhanh';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  navId: string;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (navId: string) => void;
}

const COMMAND_LIST: CommandItem[] = [
  // Quick Actions (Top priority)
  {
    id: 'cmd-p1',
    category: 'Tác Vụ Nhanh',
    title: 'Xử lý báo cáo lỗi Scan (P1 khẩn cấp)',
    subtitle: 'Mở trang Báo cáo lỗi từ người học',
    icon: <AlertTriangle size={16} className="text-danger" />,
    navId: 'reports',
  },
  {
    id: 'cmd-queue',
    category: 'Tác Vụ Nhanh',
    title: 'Duyệt hàng đợi AI Review Queue (18 ảnh)',
    subtitle: 'Thẩm định kết quả nhận diện camera vật thể',
    icon: <Sparkles size={16} className="text-snapy" />,
    navId: 'ai-queue',
  },
  {
    id: 'cmd-content-review',
    category: 'Tác Vụ Nhanh',
    title: 'Duyệt 380 từ vựng chờ xuất bản',
    subtitle: 'Mở Content Studio kiểm tra phiên âm IPA và audio TTS',
    icon: <BookOpen size={16} className="text-primary" />,
    navId: 'content-studio',
  },
  {
    id: 'cmd-streak-tool',
    category: 'Tác Vụ Nhanh',
    title: 'Khôi phục Streak chuỗi học tập',
    subtitle: 'Mở công cụ hỗ trợ người học bị đứt chuỗi do sự cố',
    icon: <Users size={16} className="text-amber-500" />,
    navId: 'learners',
  },
  // Navigation pages
  {
    id: 'nav-dashboard',
    category: 'Trang Điều Hướng',
    title: 'Dashboard Quản Trị & Vận Hành',
    subtitle: 'Tổng quan hệ thống, Action Center và KPI',
    icon: <LayoutDashboard size={16} />,
    navId: 'dashboard',
  },
  {
    id: 'nav-content-studio',
    category: 'Trang Điều Hướng',
    title: 'Content Studio',
    subtitle: 'Quản lý từ vựng song ngữ, âm thanh TTS và hình ảnh minh họa',
    icon: <BookOpen size={16} />,
    navId: 'content-studio',
  },
  {
    id: 'nav-topics',
    category: 'Trang Điều Hướng',
    title: 'Topics & Decks',
    subtitle: 'Cây phân cấp chủ đề học tập và bộ flashcard',
    icon: <FolderTree size={16} />,
    navId: 'topics',
  },
  {
    id: 'nav-ai-scan',
    category: 'Trang Điều Hướng',
    title: 'AI Scan Monitor & Review Queue',
    subtitle: 'Giám sát Gemini Vision và chất lượng nhận diện',
    icon: <Camera size={16} />,
    navId: 'ai-queue',
  },
  {
    id: 'nav-shop',
    category: 'Trang Điều Hướng',
    title: 'Cửa Hàng & Kinh Tế Ảo',
    subtitle: 'Dòng tiền Coins/Gems, vật phẩm và hàng rào an toàn',
    icon: <ShoppingBag size={16} />,
    navId: 'shop',
  },
  {
    id: 'nav-learners',
    category: 'Trang Điều Hướng',
    title: 'Quản Lý Người Học (Learner 360)',
    subtitle: 'Thông tin học viên, tiến độ SRS và chuỗi Streak',
    icon: <Users size={16} />,
    navId: 'learners',
  },
  {
    id: 'nav-analytics',
    category: 'Trang Điều Hướng',
    title: 'Phân Tích Chuyên Sâu (Analytics)',
    subtitle: 'Cohorts, retention và tỷ lệ học ghi nhớ',
    icon: <BarChart3 size={16} />,
    navId: 'analytics',
  },
  {
    id: 'nav-reports',
    category: 'Trang Điều Hướng',
    title: 'Báo Cáo Sự Cố & Khiếu Nại',
    subtitle: 'Danh sách khiếu nại chất lượng từ vựng và AI',
    icon: <AlertTriangle size={16} />,
    navId: 'reports',
  },
  {
    id: 'nav-settings',
    category: 'Trang Điều Hướng',
    title: 'Cấu Hình Hệ Thống (Settings)',
    subtitle: 'Quản lý kết nối SS-17, Cloudflare R2 và tài nguyên',
    icon: <Settings size={16} />,
    navId: 'settings',
  },
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
        onNavigate(selectedItem.navId);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette: Tìm kiếm nhanh lệnh và trang tác nghiệp"
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-elevated overflow-hidden transition-all transform scale-100 flex flex-col max-h-[80vh]"
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
            placeholder="Tìm nhanh trang, lệnh hoặc tác vụ... (gõ để lọc)"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-light focus:outline-none"
            aria-label="Tìm kiếm lệnh trong Command Palette"
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
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-surface-subtle border border-border rounded text-text-muted select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              Không tìm thấy lệnh hoặc trang nào khớp với "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.navId);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-primary-light text-primary font-semibold'
                      : 'hover:bg-surface-subtle text-text'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-surface-subtle text-text-muted border border-border'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-surface-subtle text-text-muted border border-border/80'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-transform ${
                      isSelected ? 'translate-x-0.5 text-primary opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-surface-subtle border-t border-border flex items-center justify-between text-[11px] text-text-muted select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono font-bold bg-surface border border-border px-1 py-0.5 rounded text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="font-mono font-bold bg-surface border border-border px-1 py-0.5 rounded text-[10px]">
                ↓
              </kbd>{' '}
              để di chuyển
            </span>
            <span>
              <kbd className="font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-[10px]">
                Enter
              </kbd>{' '}
              để chọn
            </span>
          </div>
          <span>
            <kbd className="font-mono font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-[10px]">
              Esc
            </kbd>{' '}
            để đóng
          </span>
        </div>
      </div>
    </div>
  );
};
