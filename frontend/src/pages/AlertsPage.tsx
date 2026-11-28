import { AlertCircle, Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCard } from '../components/alerts/AlertCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { musicShareService } from '../services';
import type { AlertNotification } from '../types/models';

type AlertFilterGroup = 'all' | 'due' | 'maintenance';

export function AlertsPage() {
  const { currentUser, loadingUsers, refreshAlertsCount } = useUser();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [filterGroup, setFilterGroup] = useState<AlertFilterGroup>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingDue, setCheckingDue] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingAlertId, setMarkingAlertId] = useState<string | null>(null);

  const scopedUserId =
    currentUser?.role === 'admin' ? undefined : currentUser?.id;

  const loadAlerts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const items = await musicShareService.listAlerts({
        userId: scopedUserId,
      });
      setAlerts(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar las alertas en este momento.',
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, scopedUserId]);

  useEffect(() => {
    if (!loadingUsers && currentUser) {
      void loadAlerts();
    }
  }, [loadingUsers, currentUser, loadAlerts]);

  const counts = useMemo(() => {
    let due = 0;
    let maintenance = 0;
    let unread = 0;

    for (const item of alerts) {
      if (!item.read) unread += 1;
      if (item.type === 'due_soon' || item.type === 'overdue') {
        due += 1;
      } else if (item.type === 'damage_maintenance') {
        maintenance += 1;
      }
    }

    return {
      all: alerts.length,
      due,
      maintenance,
      unread,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filterGroup === 'all') return alerts;
    if (filterGroup === 'due') {
      return alerts.filter(
        (item) => item.type === 'due_soon' || item.type === 'overdue',
      );
    }
    return alerts.filter((item) => item.type === 'damage_maintenance');
  }, [alerts, filterGroup]);

  const handleRunDueDateCheck = async () => {
    if (!currentUser) return;
    setCheckingDue(true);

    try {
      const created = await musicShareService.runDueDateCheck();
      const updatedList = await musicShareService.listAlerts({
        userId: scopedUserId,
      });
      setAlerts(updatedList);
      await refreshAlertsCount();

      const activeDueCount = updatedList.filter(
        (item) => item.type === 'due_soon' || item.type === 'overdue',
      ).length;
      const unreadCount = updatedList.filter((item) => !item.read).length;

      if (created.length > 0) {
        showToast(
          `Revisión completada: se generaron ${created.length} alertas nuevas (${unreadCount} sin leer).`,
          'info',
        );
      } else {
        showToast(
          `Revisión completada: sin alertas nuevas; ${activeDueCount} alertas de vencimiento vigentes (${unreadCount} sin leer).`,
          'info',
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'No se pudo ejecutar la revisión de vencimientos.',
        'error',
      );
    } finally {
      setCheckingDue(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser || counts.unread === 0) return;
    setMarkingAll(true);

    try {
      await musicShareService.markAllAlertsRead(scopedUserId);
      setAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
      await refreshAlertsCount();
      showToast('Todas las alertas quedaron marcadas como leídas.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'No fue posible marcar las alertas como leídas.',
        'error',
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    setMarkingAlertId(alertId);

    try {
      const updated = await musicShareService.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((item) => (item.id === alertId ? updated : item)),
      );
      await refreshAlertsCount();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'No pudimos actualizar el estado de la alerta.',
        'error',
      );
    } finally {
      setMarkingAlertId(null);
    }
  };

  const filterTabs: Array<{ id: AlertFilterGroup; label: string; count: number }> = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'due', label: 'Vencimientos', count: counts.due },
    { id: 'maintenance', label: 'Mantenimiento', count: counts.maintenance },
  ];

  const isBusy = loadingUsers || loading;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-dark-cocoa tracking-tight leading-tight">
            Alertas y seguimiento automático
          </h1>
          <p className="text-base text-ink-muted max-w-[65ch]">
            Notificaciones generadas por vencimientos próximos o vencidos y reportes de mantenimiento tras una devolución con daño.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="md"
            loading={checkingDue}
            onClick={() => void handleRunDueDateCheck()}
            leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            Simular revisión de vencimientos
          </Button>
          <Button
            variant="secondary"
            size="md"
            loading={markingAll}
            disabled={counts.unread === 0 || isBusy}
            onClick={() => void handleMarkAllRead()}
            leftIcon={<CheckCheck className="w-4 h-4" aria-hidden="true" />}
          >
            Marcar todas como leídas
          </Button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Filtrar alertas por tipo"
        className="flex flex-wrap items-center gap-2 border-b border-dark-cocoa/12 pb-3"
      >
        {filterTabs.map((tab) => {
          const isSelected = filterGroup === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setFilterGroup(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-pool-blue text-dark-cocoa border border-dark-cocoa/20'
                  : 'bg-surface text-ink-muted border border-dark-cocoa/12 hover:bg-surface-muted hover:text-dark-cocoa'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`tabular-data inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs ${
                  isSelected
                    ? 'bg-dark-cocoa text-canvas'
                    : 'bg-surface-muted text-dark-cocoa'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {isBusy ? (
        <ListSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="card-editorial p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-danger/30 bg-danger-soft/35"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-danger-ink mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-dark-cocoa">
                No pudimos cargar las alertas
              </p>
              <p className="text-sm text-danger-ink">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadAlerts()}
            leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            Reintentar
          </Button>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-pool-blue-deep" aria-hidden="true" />}
          title={
            filterGroup === 'all'
              ? 'No tienes alertas pendientes'
              : 'No hay alertas en esta categoría'
          }
          description={
            filterGroup === 'all'
              ? 'Las notificaciones de vencimiento y reportes de daño aparecerán aquí automáticamente cuando existan novedades.'
              : 'Prueba cambiando el filtro a Todas o ejecuta una revisión manual de vencimientos.'
          }
          action={
            filterGroup !== 'all' ? (
              <Button variant="secondary" onClick={() => setFilterGroup('all')}>
                Ver todas las alertas
              </Button>
            ) : (
              <Button
                variant="secondary"
                loading={checkingDue}
                onClick={() => void handleRunDueDateCheck()}
              >
                Simular revisión de vencimientos
              </Button>
            )
          }
        />
      ) : (
        <div role="tabpanel" className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              markingRead={markingAlertId === alert.id}
              onMarkRead={(id) => void handleMarkRead(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
