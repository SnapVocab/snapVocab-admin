import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * One primary per area. `danger` confirms an irreversible action; `danger-outline` only opens that confirmation.
 * Hover styles use `enabled:` so a disabled button never reacts.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary-solid text-white shadow-sm enabled:hover:bg-primary-solid-hover',
  secondary: 'bg-surface text-text border border-border-strong enabled:hover:bg-surface-subtle',
  ghost: 'bg-transparent text-text-muted enabled:hover:bg-surface-subtle enabled:hover:text-text',
  danger: 'bg-danger-solid text-white shadow-sm enabled:hover:bg-danger-solid-hover',
  'danger-outline': 'bg-surface text-danger-dark border border-danger/40 enabled:hover:bg-danger-light',
};

const SIZE: Record<ButtonSize, { box: string; iconOnly: string; icon: number }> = {
  sm: { box: 'h-8 px-3 text-xs', iconOnly: 'h-8 w-8', icon: 14 },
  md: { box: 'h-9 px-3.5 text-[13px]', iconOnly: 'h-9 w-9', icon: 16 },
  lg: { box: 'h-10 px-4 text-sm', iconOnly: 'h-10 w-10', icon: 16 },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon; replaced by a spinner while loading. */
  icon?: React.ReactElement<{ size?: number }>;
  loading?: boolean;
  /** Shown instead of the label while loading, e.g. "Đang lưu…". */
  loadingText?: string;
  /** Required for icon-only buttons: becomes the accessible name and the tooltip. */
  label?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  label,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}) => {
  const s = SIZE[size];
  const iconOnly = !children;
  const sizedIcon = icon && React.cloneElement(icon, { size: s.icon });
  const spinner = <Loader2 size={s.icon} className="animate-spin motion-reduce:animate-none" />;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? label : rest['aria-label']}
      title={rest.title ?? label}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        iconOnly ? s.iconOnly : s.box,
        className,
      )}
      {...rest}
    >
      {iconOnly ? (
        loading ? spinner : sizedIcon
      ) : (
        <>
          {/* Label keeps its space while loading so the button never changes width. */}
          <span className={cn('inline-flex items-center gap-1.5', loading && 'invisible')}>
            {sizedIcon}
            {children}
          </span>
          {loading && (
            <span className="absolute inset-0 inline-flex items-center justify-center gap-1.5">
              {spinner}
              {loadingText ?? children}
            </span>
          )}
        </>
      )}
    </button>
  );
};
