import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-dark-cocoa text-canvas">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <Link to="/" className="inline-flex items-center gap-2 font-serif text-lg font-semibold text-canvas">
            <Music2 className="h-5 w-5 text-solar-yellow" aria-hidden="true" />
            <span>MusicShare</span>
          </Link>
          <p className="font-sans text-sm text-canvas/80">
            Banco comunitario de instrumentos musicales para músicos, estudiantes y academias.
          </p>
        </div>

        <nav
          aria-label="Enlaces del pie de página"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm font-medium text-canvas/90"
        >
          <Link to="/" className="hover:text-solar-yellow transition-colors">
            Catálogo
          </Link>
          <Link to="/loans" className="hover:text-solar-yellow transition-colors">
            Mis Préstamos
          </Link>
          <Link to="/alerts" className="hover:text-solar-yellow transition-colors">
            Alertas
          </Link>
          <Link to="/instruments/new" className="hover:text-solar-yellow transition-colors">
            Publicar instrumento
          </Link>
        </nav>
      </div>
    </footer>
  );
}
