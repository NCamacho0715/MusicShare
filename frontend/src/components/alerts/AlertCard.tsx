import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  Inbox,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AlertNotification } from '../../types/models';
import { formatDateTime, getAlertTypeLabel } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface AlertCardProps {
  alert: AlertNotification;
  onMarkRead?: (alertId: string) => void;
  markingRead?: boolean;
}

export function AlertCard({
  alert,
  onMarkRead,
  markingRead = false,
}: AlertCardProps) {
  const typeConfig = (() => {
    switch (alert.type) {
      case 'overdue':
        return {
          icon: AlertCircle,
          badgeVariant: 'overdue' as const,
          iconWrapperClass: 'bg-danger-soft text-danger-ink border border-danger/20',
        };
      case 'damage_maintenance':
        return {
          icon: Wrench,
          badgeVariant: 'maintenance' as const,
          iconWrapperClass: 'bg-warning-soft text-warning-ink border border-warning-ink/20',
        };
      case 'due_soon':
      default:
        return {
          icon: Clock,
          badgeVariant: 'warning' as const,
          iconWrapperClass: 'bg-warning-soft/60 text-warning-ink border border-warning-ink/15',
        };
    }
  })();

  const Icon = typeConfig.icon;
  const sourceLabel =
    alert.source === 'sqs' ? 'Reporte de devolución' : 'Revisión programada';
  const SourceIcon = alert.source === 'sqs' ? Inbox : CalendarClock;

  return (
    <article
      className={`card-editorial p-4 sm:p-5 transition-colors ${
        alert.read ? 'bg-surface/85 border-dark-cocoa/10' : 'bg-surface border-dark-cocoa/25'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-4">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${typeConfig.iconWrapperClass}`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </span>

        <div className="flex-1 min-w-0 w-full space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={typeConfig.badgeVariant}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {getAlertTypeLabel(alert.type)}
              </Badge>

              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-muted border border-dark-cocoa/10 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                <SourceIcon
                  className="w-3.5 h-3.5 shrink-0 text-pool-blue-deep"
                  aria-hidden="true"
                />
                <span>{sourceLabel}</span>
              </span>

              {!alert.read && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-pool-blue-deep">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-pool-blue-deep"
                    aria-hidden="true"
                  />
                  <span>Sin leer</span>
                </span>
              )}
            </div>

            <time
              dateTime={alert.createdAt}
              className="tabular-data text-xs font-semibold text-ink-muted"
            >
              {formatDateTime(alert.createdAt)}
            </time>
          </div>

          <div className="space-y-1">
            <h2
              className={`font-serif text-lg font-semibold leading-snug ${
                alert.read ? 'text-dark-cocoa/85' : 'text-dark-cocoa'
              }`}
            >
              {alert.title}
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[70ch]">
              {alert.message}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              {alert.instrumentId && (
                <Link
                  to={`/instruments/${alert.instrumentId}`}
                  className="inline-flex items-center gap-1 text-pool-blue-deep hover:text-dark-cocoa hover:underline underline-offset-4"
                >
                  Ver instrumento
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
              {alert.loanId && (
                <Link
                  to="/loans"
                  className="inline-flex items-center gap-1 text-dark-cocoa/80 hover:text-dark-cocoa hover:underline underline-offset-4"
                >
                  Ir a préstamos
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {!alert.read && onMarkRead && (
              <Button
                variant="secondary"
                size="sm"
                loading={markingRead}
                onClick={() => onMarkRead(alert.id)}
                leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
              >
                Marcar leída
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
