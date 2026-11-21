import { AlertTriangle, ArrowUpRight, Calendar, Clock, User, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Loan } from '../../types/models';
import {
  formatDate,
  getDueDateStatus,
  getLoanStatusLabel,
  isLoanOverdue,
} from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { InstrumentImage } from '../ui/InstrumentImage';

export interface LoanCardProps {
  loan: Loan;
  /** Contexto visual para mostrar propietario, prestatario o ambos */
  counterpartyRole?: 'owner' | 'borrower' | 'both';
  /** Acción al pulsar "Registrar devolución" en préstamos activos */
  onReturn?: (loan: Loan) => void;
}

export function LoanCard({
  loan,
  counterpartyRole = 'owner',
  onReturn,
}: LoanCardProps) {
  const isActive = loan.status === 'activo';
  const overdue = isLoanOverdue(loan);
  const dueStatus = isActive ? getDueDateStatus(loan.dueDate) : null;
  const statusLabel = getLoanStatusLabel(loan.status, overdue);

  const badgeVariant = (() => {
    if (loan.status === 'devuelto') return 'available' as const;
    if (loan.status === 'dañado') return 'maintenance' as const;
    if (overdue) return 'overdue' as const;
    if (dueStatus?.isDueSoon) return 'warning' as const;
    return 'loaned' as const;
  })();

  const instrumentTitle = loan.instrumentName ?? 'Instrumento comunitario';

  return (
    <article className="card-editorial p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <Link
          to={`/instruments/${loan.instrumentId}`}
          className="w-full sm:w-36 md:w-40 shrink-0 rounded-[var(--radius-control)] overflow-hidden block focus-visible:outline-2"
          aria-label={`Ver ficha de ${instrumentTitle}`}
        >
          <InstrumentImage
            src={loan.instrumentImageUrl}
            alt={instrumentTitle}
            aspectClass="aspect-[4/3]"
            className="w-full"
          />
        </Link>

        <div className="flex-1 min-w-0 w-full flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl font-semibold text-dark-cocoa leading-snug tracking-tight">
                <Link
                  to={`/instruments/${loan.instrumentId}`}
                  className="inline-flex items-center gap-1.5 hover:underline underline-offset-4 decoration-pool-blue-deep/60"
                >
                  <span className="truncate">{instrumentTitle}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
                </Link>
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                {(counterpartyRole === 'owner' || counterpartyRole === 'both') &&
                  loan.ownerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-pool-blue-deep" aria-hidden="true" />
                      Propietario: <strong className="font-semibold text-dark-cocoa">{loan.ownerName}</strong>
                    </span>
                  )}
                {(counterpartyRole === 'borrower' || counterpartyRole === 'both') &&
                  loan.borrowerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-pool-blue-deep" aria-hidden="true" />
                      Prestatario: <strong className="font-semibold text-dark-cocoa">{loan.borrowerName}</strong>
                    </span>
                  )}
              </div>
            </div>

            <Badge variant={badgeVariant}>{statusLabel}</Badge>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-dark-cocoa/10 pt-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold text-ink-muted">Inicio</dt>
                <dd className="tabular-data font-semibold text-dark-cocoa">
                  {formatDate(loan.startDate)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold text-ink-muted">Devolución prevista</dt>
                <dd className="tabular-data font-semibold text-dark-cocoa">
                  {formatDate(loan.dueDate)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isActive && dueStatus ? (
                <>
                  {dueStatus.isOverdue ? (
                    <AlertTriangle
                      className="w-4 h-4 shrink-0 text-danger-ink"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock
                      className={
                        dueStatus.isDueSoon
                          ? 'w-4 h-4 shrink-0 text-warning-ink'
                          : 'w-4 h-4 shrink-0 text-pool-blue-deep'
                      }
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <dt className="text-xs font-semibold text-ink-muted">Plazo</dt>
                    <dd
                      className={`tabular-data font-semibold ${
                        dueStatus.isOverdue
                          ? 'text-danger-ink'
                          : dueStatus.isDueSoon
                            ? 'text-warning-ink'
                            : 'text-dark-cocoa'
                      }`}
                    >
                      {dueStatus.label}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-semibold text-ink-muted">Devuelto</dt>
                    <dd className="tabular-data font-semibold text-dark-cocoa">
                      {formatDate(loan.returnedAt)}
                    </dd>
                  </div>
                </>
              )}
            </div>
          </dl>

          {loan.damageNotes && (
            <div className="border-t border-dark-cocoa/10 pt-3 text-sm text-dark-cocoa flex items-start gap-2.5">
              <Wrench className="w-4 h-4 shrink-0 text-warning-ink mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                <span className="font-semibold text-warning-ink">Reporte de daño: </span>
                {loan.damageNotes}
              </p>
            </div>
          )}

          {isActive && onReturn && (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <Button variant="primary" size="md" onClick={() => onReturn(loan)}>
                Registrar devolución
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
