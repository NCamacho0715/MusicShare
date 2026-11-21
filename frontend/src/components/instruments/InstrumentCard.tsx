import { ArrowRight, MapPin, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Instrument, InstrumentStatus } from '../../types/models';
import {
  getCategoryLabel,
  getInstrumentStatusLabel,
} from '../../utils/formatters';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { InstrumentImage } from '../ui/InstrumentImage';

export interface InstrumentCardProps {
  instrument: Instrument;
}

function getStatusBadgeVariant(status: InstrumentStatus): BadgeVariant {
  switch (status) {
    case 'disponible':
      return 'available';
    case 'prestado':
      return 'loaned';
    case 'mantenimiento':
      return 'maintenance';
    case 'retirado':
    default:
      return 'neutral';
  }
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  return (
    <article className="card-editorial-interactive group flex flex-col overflow-hidden">
      <Link
        to={`/instruments/${instrument.id}`}
        className="block overflow-hidden focus-visible:outline-offset-[-2px]"
      >
        <InstrumentImage
          src={instrument.imageUrl}
          alt={instrument.name}
          category={instrument.category}
          aspectClass="aspect-[4/3]"
          className="transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="category">
            {getCategoryLabel(instrument.category)}
          </Badge>
          <Badge variant={getStatusBadgeVariant(instrument.status)}>
            {getInstrumentStatusLabel(instrument.status)}
          </Badge>
        </div>

        <h3 className="mt-3 font-serif text-xl font-semibold leading-snug tracking-[-0.01em] text-dark-cocoa">
          <Link
            to={`/instruments/${instrument.id}`}
            className="decoration-dark-cocoa/40 underline-offset-4 hover:underline"
          >
            {instrument.name}
          </Link>
        </h3>

        {instrument.brand && (
          <p className="mt-0.5 text-sm font-medium text-ink-muted">
            {instrument.brand}
          </p>
        )}

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {instrument.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-dark-cocoa/10 pt-4">
          <div className="min-w-0 space-y-1 text-xs text-ink-muted">
            <p className="flex items-center gap-1.5 truncate">
              <UserIcon
                className="h-3.5 w-3.5 shrink-0 text-dark-cocoa/70"
                aria-hidden="true"
              />
              <span className="truncate">
                {instrument.ownerName || 'Comunidad MusicShare'}
              </span>
            </p>
            {instrument.location && (
              <p className="flex items-center gap-1.5 truncate">
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-dark-cocoa/70"
                  aria-hidden="true"
                />
                <span className="truncate">{instrument.location}</span>
              </p>
            )}
          </div>

          <Link
            to={`/instruments/${instrument.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-dark-cocoa/20 bg-surface px-3 py-2 text-sm font-semibold text-dark-cocoa transition-colors hover:border-dark-cocoa/35 hover:bg-surface-muted"
          >
            <span>Ver ficha</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
