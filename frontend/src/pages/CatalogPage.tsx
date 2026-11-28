import { AlertCircle, Music2, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroSection } from '../components/instruments/HeroSection';
import { InstrumentCard } from '../components/instruments/InstrumentCard';
import { InstrumentFilters } from '../components/instruments/InstrumentFilters';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { CardGridSkeleton } from '../components/ui/Skeleton';
import { ApiError, musicShareService } from '../services/index';
import type {
  Instrument,
  InstrumentCategory,
  InstrumentStatus,
} from '../types/models';

export function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<InstrumentCategory | 'all'>('all');
  const [status, setStatus] = useState<InstrumentStatus | 'all'>('all');

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await musicShareService.listInstruments({
        q: debouncedQuery.trim() || undefined,
        category,
        status,
      });
      setInstruments(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No pudimos cargar el catálogo de instrumentos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, category, status]);

  useEffect(() => {
    void loadInstruments();
  }, [loadInstruments]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || category !== 'all' || status !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setCategory('all');
    setStatus('all');
  };

  return (
    <div>
      <HeroSection />

      <section
        id="catalogo"
        aria-labelledby="catalogo-heading"
        className="scroll-mt-20 pt-10 sm:pt-14"
      >
        <InstrumentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          category={category}
          onCategoryChange={setCategory}
          status={status}
          onStatusChange={setStatus}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8 md:py-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="catalogo-heading"
                className="font-serif text-3xl font-medium tracking-[-0.015em] text-dark-cocoa sm:text-4xl"
              >
                Catálogo comunitario
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted tabular-data">
                {loading
                  ? 'Consultando disponibilidad...'
                  : instruments.length === 1
                    ? '1 instrumento encontrado'
                    : `${instruments.length} instrumentos encontrados`}
              </p>
            </div>

            <Link
              to="/instruments/new"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-[var(--radius-control)] border border-dark-cocoa/20 bg-surface px-4 py-2 text-sm font-semibold text-dark-cocoa transition-colors hover:border-dark-cocoa/35 hover:bg-surface-muted sm:self-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Publicar instrumento</span>
            </Link>
          </div>

          {loading ? (
            <CardGridSkeleton count={6} />
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-4 rounded-2xl border border-danger/30 bg-danger-soft/50 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-danger-ink"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-serif text-lg font-semibold text-danger-ink">
                    Error al cargar el catálogo
                  </h3>
                  <p className="mt-0.5 text-sm text-danger-ink/90">{error}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                onClick={() => void loadInstruments()}
              >
                Reintentar
              </Button>
            </div>
          ) : instruments.length === 0 ? (
            <EmptyState
              icon={<Music2 className="h-7 w-7" aria-hidden="true" />}
              title={
                hasActiveFilters
                  ? 'Ningún instrumento coincide con estos filtros'
                  : 'Aún no hay instrumentos publicados'
              }
              description={
                hasActiveFilters
                  ? 'Prueba limpiando los filtros o buscando por otra categoría o palabra clave.'
                  : 'Comparte el primer instrumento de tu comunidad para iniciar los préstamos.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClearFilters}
                  >
                    Limpiar filtros
                  </Button>
                ) : (
                  <Link to="/instruments/new" className="btn-primary text-sm">
                    Publicar instrumento
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {instruments.map((instrument) => (
                <InstrumentCard key={instrument.id} instrument={instrument} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
