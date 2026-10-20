import React from 'react';
import { initials } from '../../domains/admin-learners/mappers';

/** Uploaded avatar, else initials on one neutral tint: colour is kept for states, not for telling people apart. */
export function LearnerAvatar({ name, url, size = 32 }: { id?: number; name: string; url: string | null; size?: number }) {
  return url ? (
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-full bg-surface-subtle font-semibold text-text-muted" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}
