import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { CommandPaletteModal } from './CommandPaletteModal';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePath: string;
  /** Shell navigation (sidebar, palette); the caller asks about unsaved work first. */
  onNavigate: (path: string) => void;
}

/**
 * Sidebar + page. No top bar: the page title already names the screen and the sidebar shows where it lives,
 * so a breadcrumb bar would only repeat them; quick search sits at the top of the sidebar (Ctrl/Cmd+K).
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activePath, onNavigate }) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-text">
      <Sidebar activePath={activePath} onNavigate={onNavigate} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
      <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
      <CommandPaletteModal isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={onNavigate} />
    </div>
  );
};
