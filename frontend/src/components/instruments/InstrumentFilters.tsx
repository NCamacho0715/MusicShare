import { RotateCcw, Search, X } from 'lucide-react';
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_STATUSES,
  type InstrumentCategory,
  type InstrumentStatus,
} from '../../types/models';
import {
  getCategoryLabel,
  getInstrumentStatusLabel,
} from '../../utils/formatters';
import { Button } from '../ui/Button';

export interface InstrumentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  category: InstrumentCategory | 'all';
  onCategoryChange: (value: InstrumentCategory | 'all') => void;
  status: InstrumentStatus | 'all';
  onStatusChange: (value: InstrumentStatus | 'all') => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function InstrumentFilters({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onClear,
  hasActiveFilters,
}: InstrumentFiltersProps) {
  return (
    <div className="sticky top-20 z-20 border-y border-dark-cocoa/12 bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por nombre, marca, ubicación o propietario..."
                aria-label="Buscar instrumentos"
                className="input-editorial pr-10 pl-11 text-sm [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-dark-cocoa"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="sm:w-52">
              <select
                value={status}
                onChange={(e) =>
                  onStatusChange(e.target.value as InstrumentStatus | 'all')
                }
                aria-label="Filtrar por disponibilidad"
                className="input-editorial text-sm font-medium"
              >
                <option value="all">Todos los activos</option>
                {INSTRUMENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {getInstrumentStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                onClick={onClear}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>

        <div
          className="mt-3 flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por categoría"
        >
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => onCategoryChange('all')}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              category === 'all'
                ? 'border-dark-cocoa/25 bg-pool-blue text-dark-cocoa shadow-cocoa-sm'
                : 'border-dark-cocoa/15 bg-surface text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
            }`}
          >
            Todas
          </button>

          {INSTRUMENT_CATEGORIES.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(item)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-dark-cocoa/25 bg-pool-blue text-dark-cocoa shadow-cocoa-sm'
                    : 'border-dark-cocoa/15 bg-surface text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
                }`}
              >
                {getCategoryLabel(item)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
