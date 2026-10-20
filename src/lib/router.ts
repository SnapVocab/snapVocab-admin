import { useSyncExternalStore } from 'react';

/**
 * Minimal History API router (design.md TD-ADS-01): no dependency, path only.
 * Production hosting must serve index.html for unknown paths (SPA fallback); Vite dev already does.
 */
let current = typeof window === 'undefined' ? '/' : window.location.pathname;
const listeners = new Set<() => void>();
/** Asked before browser back/forward leaves the page; false keeps the operator where they are. */
let leaveGuard: (() => boolean) | null = null;

function commit(path: string) {
  current = path;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // ponytail: a refused back/forward is undone with pushState, so the forward stack is lost.
    if (leaveGuard && !leaveGuard()) {
      window.history.pushState(null, '', current);
      return;
    }
    commit(window.location.pathname);
  });
}

export function setLeaveGuard(guard: (() => boolean) | null) {
  leaveGuard = guard;
}

/** Programmatic navigation. Shell links ask the leave guard themselves; pages navigate after their own checks. */
export function navigate(path: string, { replace = false } = {}) {
  if (path === current) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  commit(path);
}

export const usePathname = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => '/',
  );
