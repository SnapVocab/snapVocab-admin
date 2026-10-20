import React from 'react';

/** Section rule inside a block or an editor: "Cơ bản ─────". Sentence case; the rule does the separating. */
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="flex items-center gap-3 text-xs font-semibold text-text-muted after:h-px after:flex-1 after:bg-border">
    {children}
  </h3>
);
