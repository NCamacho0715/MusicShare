export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[var(--radius-control)] bg-surface-subtle ${className}`}
    />
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando instrumentos"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="card-editorial overflow-hidden flex flex-col"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-2 pt-3 border-t border-dark-cocoa/10 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando elementos"
      className="flex flex-col gap-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="card-editorial flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
        >
          <Skeleton className="h-28 w-full shrink-0 rounded-[var(--radius-control)] sm:w-36" />
          <div className="flex flex-1 flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-1 flex gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
