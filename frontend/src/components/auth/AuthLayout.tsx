import type { ReactNode } from 'react';
import { Music2 } from 'lucide-react';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-canvas text-dark-cocoa lg:grid-cols-12">
      {/* Panel editorial izquierdo */}
      <aside className="relative hidden overflow-hidden lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:col-span-6 xl:p-14">
        <img
          src="./images/hero-studio.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="hero-scrim-side absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-dark-cocoa/30"
        />

        <div className="relative z-10 flex items-center gap-2.5 text-canvas">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-solar-yellow text-dark-cocoa shadow-cocoa-sm">
            <Music2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-2xl font-semibold tracking-tight">
            MusicShare
          </span>
        </div>

        <div className="relative z-10 max-w-md text-canvas">
          <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight text-balance">
            Instrumentos compartidos para que la música siga sonando.
          </h2>
          <p className="mt-3 font-sans text-base leading-relaxed text-canvas/90 text-pretty">
            Explora el catálogo comunitario, gestiona tus préstamos y cuida cada pieza junto a tu comunidad.
          </p>
        </div>
      </aside>

      {/* Panel derecho de formulario */}
      <main className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:col-span-7 xl:col-span-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-dark-cocoa text-solar-yellow">
              <Music2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight text-dark-cocoa">
              MusicShare
            </span>
          </div>

          <header className="mb-7">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-dark-cocoa">
              {title}
            </h1>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink-muted text-pretty">
              {subtitle}
            </p>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
