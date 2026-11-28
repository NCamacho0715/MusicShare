import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'category'
  | 'available'
  | 'loaned'
  | 'maintenance'
  | 'overdue'
  | 'neutral'
  | 'warning'
  | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  category: 'bg-pool-blue text-dark-cocoa',
  available: 'bg-pool-blue text-dark-cocoa',
  loaned: 'bg-surface-muted text-dark-cocoa border border-dark-cocoa/20',
  maintenance: 'bg-warning-soft text-warning-ink',
  warning: 'bg-warning-soft text-warning-ink',
  overdue: 'bg-danger-soft text-danger-ink',
  danger: 'bg-danger-soft text-danger-ink',
  neutral: 'bg-surface-subtle text-dark-cocoa',
};

const DOT_CLASSES: Partial<Record<BadgeVariant, string>> = {
  available: 'bg-pool-blue-deep',
  loaned: 'bg-dark-cocoa/65',
  maintenance: 'bg-warning-ink',
  overdue: 'bg-danger-ink',
  danger: 'bg-danger-ink',
  warning: 'bg-warning-ink',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  const dotClass = DOT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs font-semibold leading-none whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {dotClass ? (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`}
        />
      ) : null}
      {children}
    </span>
  );
}
