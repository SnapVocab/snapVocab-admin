import React from 'react';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '../../domains/auth/use-auth';
import { Wordmark } from '../brand/BrandIcons';
import { cn } from '../../lib/utils';
import { NAV, SECTIONS, type NavItem, type NavScope } from './nav';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
  onOpenCommandPalette: () => void;
}

/** Dev/demo builds only (release shows NOW screens alone): a quiet word, the tooltip says what it means. */
const SCOPE_TAG: Partial<Record<NavScope, { label: string; title: string }>> = {
  MOCK: { label: 'mẫu', title: 'Đã thiết kế lại, đang chạy dữ liệu mẫu (backend chưa có)' },
  LEGACY: { label: 'cũ', title: 'Bản mock cũ, chưa thiết kế lại' },
};

const SHORTCUT = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

export const Sidebar: React.FC<SidebarProps> = ({ activePath, onNavigate, onOpenCommandPalette }) => {
  const { user, logout } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Quản trị viên';

  return (
    <aside className="flex h-screen w-60 shrink-0 select-none flex-col border-r border-border bg-surface">
      <div className="space-y-3 px-3 pb-3 pt-4">
        <Wordmark className="px-1.5" />
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label={`Chuyển nhanh tới trang hoặc tác vụ (${SHORTCUT})`}
          className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 text-left text-xs text-text-muted hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
        >
          <Search size={13} className="shrink-0" />
          <span className="flex-1 truncate">Tìm trang, tác vụ…</span>
          <kbd className="font-sans text-2xs text-text-light">{SHORTCUT}</kbd>
        </button>
      </div>

      <nav aria-label="Điều hướng chính" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {SECTIONS.map((section) => {
          const items = NAV.filter((i) => i.section === section);
          if (!items.length) return null;
          return (
            <div key={section} className="space-y-0.5">
              <div className="px-2 pb-1 text-xs font-medium text-text-light">{section}</div>
              {items.map((item: NavItem) => {
                const active = activePath === item.path;
                const tag = SCOPE_TAG[item.scope];
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      // Keep new-tab and modifier clicks native; plain clicks route in-app.
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      onNavigate(item.path);
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info',
                      active ? 'bg-surface-subtle font-semibold text-text' : 'text-text-muted hover:bg-surface-subtle/70 hover:text-text',
                    )}
                  >
                    <item.Icon size={16} className={active ? 'text-text' : 'text-text-light'} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {tag && <span title={tag.title} className="text-2xs font-normal text-text-light">{tag.label}</span>}
                  </a>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-text-muted">
        <span className="truncate" title={user?.email}>{name}</span>
        <button type="button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất" className="rounded p-1 hover:bg-surface-subtle hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
};
