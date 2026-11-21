import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Music2, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import { getRoleLabel, getUserInitials } from '../../utils/formatters';

const NAV_ITEMS = [
  { to: '/', label: 'Catálogo', end: true },
  { to: '/loans', label: 'Mis Préstamos', end: false },
  { to: '/instruments/new', label: 'Publicar', end: false },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    currentUser,
    users,
    switchUser,
    logout,
    unreadAlertsCount,
    openAlertDrawer,
  } = useUser();

  const [scrolled, setScrolled] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY > 40 : false,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !scrolled;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    showToast('Sesión cerrada.', 'info');
    navigate('/login', { replace: true });
  }

  const initials = currentUser ? getUserInitials(currentUser.name) : 'MS';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 h-20 transition-colors duration-200 ${
        isTransparent
          ? 'bg-transparent text-canvas'
          : 'bg-canvas/95 text-dark-cocoa backdrop-blur-md border-b border-dark-cocoa/12 shadow-cocoa-sm'
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        {/* Marca */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 rounded-[var(--radius-control)] py-1"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] transition-colors ${
              isTransparent
                ? 'bg-solar-yellow text-dark-cocoa'
                : 'bg-dark-cocoa text-solar-yellow'
            }`}
          >
            <Music2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">
            MusicShare
          </span>
        </Link>

        {/* Navegación Desktop */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-1.5"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 font-sans text-sm font-semibold transition-colors ${
                  isTransparent
                    ? isActive
                      ? 'bg-canvas/20 text-canvas backdrop-blur-xs'
                      : 'text-canvas/90 hover:bg-canvas/15 hover:text-canvas'
                    : isActive
                      ? 'bg-pool-blue text-dark-cocoa'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentUser ? (
            <>
              <button
                type="button"
                onClick={openAlertDrawer}
                aria-label={
                  unreadAlertsCount > 0
                    ? `Abrir alertas (${unreadAlertsCount} sin leer)`
                    : 'Abrir alertas'
                }
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  isTransparent
                    ? 'text-canvas hover:bg-canvas/15'
                    : 'text-dark-cocoa hover:bg-surface-muted'
                }`}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadAlertsCount > 0 ? (
                  <span className="tabular-data absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-solar-yellow px-1 font-sans text-xs font-bold text-dark-cocoa shadow-cocoa-sm">
                    {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                  </span>
                ) : null}
              </button>

              {/* Usuario autenticado y Selector rápido Desktop */}
              <div
                className={`hidden sm:flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1 transition-colors border ${
                  isTransparent
                    ? 'border-canvas/30 bg-dark-cocoa/45 text-canvas backdrop-blur-sm'
                    : 'border-dark-cocoa/15 bg-surface-muted text-dark-cocoa'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pool-blue font-sans text-xs font-bold text-dark-cocoa"
                >
                  {initials}
                </span>

                <select
                  aria-label="Cambiar usuario activo"
                  title="Cambiar usuario activo (Simulación de headers)"
                  value={currentUser.id}
                  onChange={(e) => {
                    switchUser(e.target.value);
                    const selected = users.find((u) => u.id === e.target.value);
                    if (selected) {
                      showToast(`Cambiado a: ${selected.name} (${getRoleLabel(selected.role)})`, 'info');
                    }
                  }}
                  className={`bg-transparent font-sans text-xs font-semibold focus:outline-none cursor-pointer pr-1 ${
                    isTransparent ? 'text-canvas' : 'text-dark-cocoa'
                  }`}
                >
                  {users.map((u) => (
                    <option
                      key={u.id}
                      value={u.id}
                      className="bg-surface text-dark-cocoa py-1 font-sans text-xs"
                    >
                      {u.name} · {getRoleLabel(u.role)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-sans text-xs font-semibold transition-colors cursor-pointer ${
                  isTransparent
                    ? 'text-canvas/90 hover:bg-canvas/15 hover:text-canvas'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
                }`}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-solar-yellow px-4 py-2 font-sans text-xs font-semibold text-dark-cocoa hover:bg-solar-yellow-hover transition-colors"
            >
              Iniciar sesión
            </Link>
          )}

          {/* Botón Menú Móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden cursor-pointer ${
              isTransparent
                ? 'text-canvas hover:bg-canvas/15'
                : 'text-dark-cocoa hover:bg-surface-muted'
            }`}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Panel Menú Móvil */}
      {mobileMenuOpen ? (
        <div className="border-b border-dark-cocoa/12 bg-canvas px-4 py-4 text-dark-cocoa shadow-cocoa-md md:hidden">
          <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-[var(--radius-control)] px-3.5 py-2.5 font-sans text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-pool-blue text-dark-cocoa'
                      : 'text-dark-cocoa hover:bg-surface-muted'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {currentUser ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-dark-cocoa/10 pt-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pool-blue font-sans text-xs font-bold text-dark-cocoa"
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm font-semibold text-dark-cocoa">
                    {currentUser.name}
                  </p>
                  <p className="font-sans text-xs text-ink-muted">
                    {getRoleLabel(currentUser.role)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-dark-cocoa/20 bg-surface px-3 py-2 font-sans text-xs font-semibold text-dark-cocoa hover:bg-surface-muted cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
