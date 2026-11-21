import { useEffect, useState } from 'react';
import {
  AudioLines,
  Drum,
  Guitar,
  Music2,
  Piano,
  Wind,
} from 'lucide-react';
import type { InstrumentCategory } from '../../types/models';
import { getCategoryLabel } from '../../utils/formatters';

export interface InstrumentImageProps {
  src?: string | null;
  alt: string;
  category?: InstrumentCategory;
  className?: string;
  aspectClass?: string;
}

const CATEGORY_ICONS: Record<InstrumentCategory, typeof Guitar> = {
  cuerdas: Guitar,
  viento: Wind,
  percusion: Drum,
  teclados: Piano,
  amplificacion: AudioLines,
  otros: Music2,
};

export function InstrumentImage({
  src,
  alt,
  category,
  className = '',
  aspectClass = 'aspect-[4/3]',
}: InstrumentImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const trimmedSrc = src?.trim();
  const showFallback = !trimmedSrc || hasError;
  const IconComponent = category ? CATEGORY_ICONS[category] : Music2;

  return (
    <div
      className={`relative overflow-hidden bg-surface-muted ${aspectClass} ${className}`}
    >
      {showFallback ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-pool-blue/25 px-4 text-center text-dark-cocoa"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/85 border border-dark-cocoa/12">
            <IconComponent className="h-6 w-6 text-dark-cocoa" aria-hidden="true" />
          </div>
          {category ? (
            <span className="font-sans text-xs font-semibold text-dark-cocoa/80">
              {getCategoryLabel(category)}
            </span>
          ) : null}
        </div>
      ) : (
        <img
          src={trimmedSrc}
          alt={alt}
          loading="lazy"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
