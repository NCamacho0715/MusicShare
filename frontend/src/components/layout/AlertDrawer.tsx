import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Wrench,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import { musicShareService } from '../../services/index';
import type { AlertNotification, AlertType } from '../../types/models';
import { formatDateTime, getAlertTypeLabel } from '../../utils/formatters';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/Skeleton';

const ALERT_BADGE_MAP: Record<AlertType, BadgeVariant> = {
  due_soon: 'warning',
  overdue: 'danger',
  damage_maintenance: 'maintenance',
};

const ALERT_ICON_MAP: Record<AlertType, typeof Clock> = {
  due_soon: Clock,
  overdue: AlertTriangle,
  damage_maintenance: Wrench,
};

export function AlertDrawer() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    currentUser,
    isAlertDrawerOpen,
    closeAlertDrawer,
    refreshAlertsCount,
  } = useUser();

  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const userId = currentUser?.id;
  const userRole = currentUser?.role;

  const fetchAlerts = useCallback(async () => {
    if (!userId || !userRole) return;
    setLoading(true);
    setError(null);
    try {
      const data = await musicShareService.listAlerts({
        userId: userRole === 'admin' ? undefined : userId,
      });
      setAlerts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar tus alertas recientes.',
      );
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (!isAlertDrawerOpen || !currentUser) return;
    void fetchAlerts();
  }, [isAlertDrawerOpen, currentUser, fetchAlerts]);

  useEffect(() => {
    if (!isAlertDrawerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAlertDrawer();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAlertDrawerOpen, closeAlertDrawer]);

  async function handleMarkRead(alertId: string) {
    try {
      const updated = await musicShareService.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((item) => (item.id === alertId ? updated : item)),
      );
      await refreshAlertsCount();
    } catch {
      showToast('No pudimos marcar la alerta como leída.', 'error');
    }
  }

  async function handleMarkAllRead() {
    if (!currentUser) return;
    setMarkingAll(true);
    try {
      await musicShareService.markAllAlertsRead(
        currentUser.role === 'admin' ? undefined : currentUser.id,
      );
      setAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
      await refreshAlertsCount();
      showToast('Todas las alertas marcadas como leídas.', 'success');
    } catch {
      showToast('Error al actualizar las alertas.', 'error');
    } finally {
      setMarkingAll(false);
    }
  }

  if (!isAlertDrawerOpen || !currentUser) return null;

  const unreadCount = alerts.filter((a) => !a.read).length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Panel de alertas recientes"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeAlertDrawer}
        className="fixed inset-0 bg-dark-cocoa/45 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-dark-cocoa/12 bg-canvas text-dark-cocoa shadow-cocoa-lg">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-dark-cocoa/12 bg-surface px-6 py-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-xl font-semibold text-dark-cocoa">
                Alertas del sistema
              </h2>
              {unreadCount > 0 ? (
                <span className="tabular-data rounded-full bg-solar-yellow px-2.5 py-0.5 font-sans text-xs font-bold text-dark-cocoa">
                  {unreadCount} nuevas
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-sans text-xs text-ink-muted">
              Vencimientos automáticos y avisos de mantenimiento.
            </p>
          </div>

          <button
            type="button"
            onClick={closeAlertDrawer}
            aria-label="Cerrar panel de alertas"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-dark-cocoa cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Barra rápida */}
        {unreadCount > 0 ? (
          <div className="flex items-center justify-end border-b border-dark-cocoa/10 bg-surface-muted/60 px-6 py-2.5">
            <button
              type="button"
              disabled={markingAll}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-pool-blue-deep hover:underline disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Marcar todas como leídas</span>
            </button>
          </div>
        ) : null}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <ListSkeleton count={3} />
          ) : error ? (
            <div className="card-editorial p-5 text-center">
              <p className="font-sans text-sm text-danger-ink">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void fetchAlerts()}
              >
                Reintentar
              </Button>
            </div>
          ) : alerts.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="Sin alertas pendientes"
              description="No tienes recordatorios de devolución ni reportes de mantenimiento en este momento."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.slice(0, 8).map((alert) => {
                const IconComp = ALERT_ICON_MAP[alert.type];
                const sourceLabel =
                  alert.source === 'eventbridge'
                    ? 'Revisión programada'
                    : 'Reporte de devolución';

                return (
                  <article
                    key={alert.id}
                    className={`card-editorial p-4 transition-colors ${
                      alert.read ? 'opacity-75' : 'bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={ALERT_BADGE_MAP[alert.type]}>
                        <IconComp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{getAlertTypeLabel(alert.type)}</span>
                      </Badge>
                      <span className="tabular-data font-sans text-xs text-ink-muted">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-serif text-base font-semibold leading-snug text-dark-cocoa">
                      {alert.title}
                    </h3>
                    <p className="mt-1 font-sans text-sm leading-relaxed text-ink-muted">
                      {alert.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dark-cocoa/10 pt-2.5">
                      <span className="font-sans text-xs font-medium text-ink-muted">
                        {sourceLabel}
                      </span>

                      <div className="flex items-center gap-2">
                        {alert.instrumentId ? (
                          <Link
                            to={`/instruments/${alert.instrumentId}`}
                            onClick={closeAlertDrawer}
                            className="font-sans text-xs font-semibold text-pool-blue-deep hover:underline"
                          >
                            Ver instrumento
                          </Link>
                        ) : (
                          <Link
                            to="/loans"
                            onClick={closeAlertDrawer}
                            className="font-sans text-xs font-semibold text-pool-blue-deep hover:underline"
                          >
                            Ver préstamos
                          </Link>
                        )}

                        {!alert.read ? (
                          <button
                            type="button"
                            onClick={() => void handleMarkRead(alert.id)}
                            className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-surface-muted px-2.5 py-1 font-sans text-xs font-semibold text-dark-cocoa hover:bg-pool-blue/50 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Marcar leída</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dark-cocoa/12 bg-surface px-6 py-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              closeAlertDrawer();
              navigate('/alerts');
            }}
          >
            <span className="inline-flex items-center gap-2">
              <span>Ver todas las alertas</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
