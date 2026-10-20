import React from 'react';

/**
 * design.md P5: a MOCK screen says once, at the top, which of its numbers are sample data and what they wait for.
 * Render it only when the screen's fixture flag is on, so the notice disappears with the real API.
 */
export const SampleDataNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="note" className="rounded-md border border-info/30 bg-info-light/60 px-3 py-2 text-xs leading-relaxed text-info-dark">
    <strong className="font-semibold">Dữ liệu mẫu.</strong> {children}
  </p>
);
