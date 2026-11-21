import { useEffect } from 'react';
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './context/ToastContext';
import { UserProvider, useUser } from './context/UserContext';
import { AlertsPage } from './pages/AlertsPage';
import { CatalogPage } from './pages/CatalogPage';
import { InstrumentDetailPage } from './pages/InstrumentDetailPage';
import { InstrumentFormPage } from './pages/InstrumentFormPage';
import { LoansPage } from './pages/LoansPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solar-yellow border-t-dark-cocoa" />
        <p className="font-serif text-lg font-medium text-dark-cocoa">Cargando MusicShare...</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { isAuthenticated, loadingUsers } = useUser();
  const location = useLocation();

  if (loadingUsers) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { isAuthenticated, loadingUsers } = useUser();

  if (loadingUsers) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <UserProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<CatalogPage />} />
                <Route path="/instruments/new" element={<InstrumentFormPage />} />
                <Route path="/instruments/:id" element={<InstrumentDetailPage />} />
                <Route path="/instruments/:id/edit" element={<InstrumentFormPage />} />
                <Route path="/loans" element={<LoansPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UserProvider>
      </ToastProvider>
    </HashRouter>
  );
}
