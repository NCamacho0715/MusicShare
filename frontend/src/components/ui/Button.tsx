import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'hero-outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-solar-yellow text-dark-cocoa hover:bg-solar-yellow-hover shadow-cocoa-sm',
  secondary:
    'bg-surface text-dark-cocoa border border-dark-cocoa/20 hover:bg-surface-muted hover:border-dark-cocoa/35',
  ghost:
    'bg-transparent text-dark-cocoa hover:bg-surface-muted',
  danger:
    'bg-danger text-white hover:bg-danger-ink shadow-cocoa-sm',
  'hero-outline':
    'bg-surface/15 text-canvas border border-canvas/45 backdrop-blur-sm hover:bg-surface/25',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3.5 py-1.5 text-sm',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-sans font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 active:not-disabled:scale-[0.99] ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
