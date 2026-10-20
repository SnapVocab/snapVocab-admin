import React, { useEffect } from 'react';
import { useAuth } from '../../domains/auth/use-auth';
import { LoginPage } from '../../features/auth/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status, isAdmin } = useAuth();

  // Sync URL when authenticated and currently on /login
  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        const targetPath =
          returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
            ? returnTo
            : '/';
        window.history.replaceState({}, '', targetPath);
      }
    }
  }, [status, isAdmin]);

  // 1. Session Restoration / Booting State
  if (status === 'booting') {
    return (
      <div
        className="flex min-h-screen w-full select-none flex-col items-center justify-center gap-3 bg-surface p-8 text-center text-text-muted"
        role="status"
        aria-label="Đang kiểm tra phiên đăng nhập"
      >
        <img src="/brand/snapy.png" alt="" className="h-10 w-auto motion-safe:animate-pulse" />
        <span className="text-xs">Đang kiểm tra phiên đăng nhập…</span>
      </div>
    );
  }

  // 2. Unauthenticated or not ROLE_ADMIN -> Show LoginPage
  if (status !== 'authenticated' || !isAdmin) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      const returnTo = window.location.pathname + window.location.search;
      const search =
        returnTo && returnTo !== '/'
          ? `?returnTo=${encodeURIComponent(returnTo)}`
          : '';
      window.history.replaceState({}, '', `/login${search}`);
    }

    return (
      <LoginPage
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const returnTo = params.get('returnTo');
            const targetPath =
              returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
                ? returnTo
                : '/';
            window.history.replaceState({}, '', targetPath);
          }
        }}
      />
    );
  }

  // 3. Authenticated as Admin -> Render protected admin hierarchy
  return <>{children}</>;
};
