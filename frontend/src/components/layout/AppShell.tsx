import { Outlet, useLocation } from 'react-router-dom';
import { AlertDrawer } from './AlertDrawer';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function AppShell() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-dark-cocoa">
      <Navbar />
      {/* En #/ el Hero inicia en y=0 para cubrir la Navbar transparente; en rutas internas reserva h-20 */}
      <main className={isHome ? 'flex-1' : 'flex-1 pt-20'}>
        <Outlet />
      </main>
      <Footer />
      <AlertDrawer />
    </div>
  );
}
