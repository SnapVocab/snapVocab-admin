import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'reward';

/** Light fill, dark text, soft border. Text tones are contrast-checked in tests/ui-tokens.test.ts. */
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-subtle text-neutral-600 border-border',
  info: 'bg-info-light text-info-dark border-info/30',
  success: 'bg-primary-light text-primary-dark border-primary/30',
  warning: 'bg-warning-light text-warning-dark border-warning/40',
  danger: 'bg-danger-light text-danger-dark border-danger/30',
  // Economy/reward states only (design.md §3: gold is reserved for the virtual economy).
  reward: 'bg-reward-light text-reward-dark border-reward/40',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Only when it speeds up recognition; the text label is always required. */
  icon?: React.ReactElement<{ size?: number }>;
}

/** Describes a state; never interactive. Modules map their own statuses to a tone (see ShopItemStatusBadge). */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', icon, className, children, ...rest }) => (
  <span
    className={cn(
      'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap',
      TONE[tone],
      className,
    )}
    {...rest}
  >
    {icon && React.cloneElement(icon, { size: 12 })}
    {children}
  </span>
);
