import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';

/**
 * The page toast (TD-ADS-05): one at a time, top right, gone after 3.5 s. A new message restarts the timer, so a
 * quick second toast is never cut short by the first one's timer. Render `node` once anywhere in the page.
 */
export function useToast(ms = 3500) {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(t);
  }, [toast, ms]);
  const show = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const node = toast && (
    <div role="status" className={`fixed right-6 top-6 z-40 flex items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-xs font-medium shadow-elevated ${toast.error ? 'border-danger/30 text-danger-dark' : 'border-border text-text'}`}>
      {toast.error ? <AlertCircle size={16} /> : <Check size={16} className="text-primary-dark" />}
      {toast.text}
    </div>
  );
  return { show, node };
}
