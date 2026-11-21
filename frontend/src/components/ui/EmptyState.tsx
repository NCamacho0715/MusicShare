import type { ReactNode } from 'react';
import { Music } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`card-editorial flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pool-blue/60 text-dark-cocoa">
        {icon ?? <Music className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="font-serif text-xl font-semibold text-dark-cocoa">{title}</h3>
      <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
