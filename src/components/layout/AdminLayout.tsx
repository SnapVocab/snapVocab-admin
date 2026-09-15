import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPaletteModal } from './CommandPaletteModal';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentWordTitle?: string;
  activeNav?: string;
  onNavigate?: (navId: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentWordTitle,
  activeNav: controlledActiveNav,
  onNavigate: controlledOnNavigate,
}) => {
  const [internalActiveNav, setInternalActiveNav] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const currentNav = controlledActiveNav !== undefined ? controlledActiveNav : internalActiveNav;
  const handleNavigate = controlledOnNavigate || setInternalActiveNav;

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
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
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar Navigation (with responsive mobile drawer) */}
      <Sidebar
        activeNav={currentNav}
        onNavigate={handleNavigate}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace View */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header
          currentWordTitle={currentWordTitle}
          activeNav={currentNav}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

