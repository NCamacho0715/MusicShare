import { ArrowDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function HeroSection() {
  const navigate = useNavigate();

  const handleExploreCatalog = () => {
    const catalogElement = document.getElementById('catalogo');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      aria-label="Presentación de MusicShare"
      className="relative flex min-h-[78vh] w-full items-end overflow-hidden bg-dark-cocoa md:min-h-[84vh] md:items-center"
    >
      <img
        src="./images/hero-studio.jpg"
        alt="Taller luminoso con instrumentos musicales listos para préstamo comunitario"
        className="absolute inset-0 h-full w-full object-cover object-right md:object-center"
      />

      {/* Doble scrim Dark Cocoa para legibilidad del titular y de la Navbar transparente */}
      <div className="hero-scrim-side absolute inset-0" aria-hidden="true" />
      <div className="hero-scrim-top absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-16 sm:px-6 md:px-8 md:pt-32">
        <div className="max-w-2xl">
          <h1 className="font-serif text-[2.25rem] font-medium leading-[1.12] tracking-[-0.02em] text-canvas text-balance sm:text-5xl">
            MusicShare
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-canvas/90 sm:text-lg">
            Un banco comunitario sin costo de alquiler. Encuentra guitarras,
            vientos, percusión y teclados disponibles o pon el tuyo en manos de
            quien lo&nbsp;necesita.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Button
              type="button"
              variant="primary"
              size="lg"
              leftIcon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
              onClick={handleExploreCatalog}
            >
              Explorar catálogo
            </Button>

            <Button
              type="button"
              variant="hero-outline"
              size="lg"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate('/instruments/new')}
            >
              Prestar un instrumento
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
