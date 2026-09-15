import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';

interface HeaderProps {
  currentWordTitle?: string;
  activeNav?: string;
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentWordTitle,
  activeNav = 'dashboard',
  onToggleSidebar,
  onOpenCommandPalette,
}) => {
  const renderBreadcrumb = () => {
    switch (activeNav) {
      case 'dashboard':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">Overview</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text">Dashboard Quản Trị</span>
          </>
        );
      case 'analytics':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">Overview</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text">Analytics & Cohorts</span>
          </>
        );
      case 'content-studio':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">Learning</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text">
              {currentWordTitle ? `Content Studio: ${currentWordTitle}` : 'Content Studio'}
            </span>
          </>
        );
      case 'topics':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">Learning</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text">Topics & Decks</span>
          </>
        );
      case 'templates':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">Learning</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text">Card Templates</span>
          </>
        );
      case 'ai-queue':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">AI Studio</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-snapy">Review Queue (18)</span>
          </>
        );
      case 'shop':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">LiveOps</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-[#9A7000]">Shop & Economy</span>
          </>
        );
      case 'learners':
        return (
          <>
            <span className="hidden sm:inline text-text-muted">People</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-primary">Learners 360</span>
          </>
        );
      default:
        return (
          <>
            <span className="hidden sm:inline text-text-muted">SnapVocab Admin</span>
            <span className="hidden sm:inline text-text-light">/</span>
            <span className="font-semibold text-text capitalize">{activeNav.replace('-', ' ')}</span>
          </>
        );
    }
  };

  return (
    <header className="h-12 border-b border-border bg-surface px-3 sm:px-4 flex items-center justify-between select-none shrink-0 gap-2">
      {/* Left: Hamburger (mobile/tablet) + Dynamic Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Mở menu thanh bên"
          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-subtle lg:hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 truncate">{renderBreadcrumb()}</div>
      </div>

      {/* Center: Command Palette Trigger Button (Semantic button, no alert) */}
      <div className="flex-1 max-w-sm mx-2 sm:mx-6">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Mở tìm kiếm nhanh Command Palette (phím tắt Cmd+K hoặc Ctrl+K)"
          className="w-full pl-8 pr-12 py-1 rounded-md text-xs border border-border bg-surface-subtle/60 text-text-muted hover:bg-surface hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary relative flex items-center transition-all text-left"
        >
          <Search size={13} className="absolute left-2.5 text-text-light" />
          <span className="truncate">Tìm kiếm từ vựng, deck, lệnh...</span>
          <kbd className="absolute right-2 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-surface border border-border rounded text-text-muted">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Operational Health & Alerts */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-subtle text-text-muted border border-border text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Snapshot: Demo v1.2</span>
        </div>

        <button
          type="button"
          className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-surface-subtle relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="Xem thông báo hệ thống"
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-snapy" />
        </button>
      </div>
    </header>
  );
};

