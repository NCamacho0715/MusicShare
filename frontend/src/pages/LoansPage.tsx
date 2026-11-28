import { AlertCircle, Music, PackageCheck, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoanCard } from '../components/loans/LoanCard';
import { ReturnLoanModal } from '../components/loans/ReturnLoanModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ApiError, musicShareService } from '../services';
import type { Loan } from '../types/models';
import { isLoanOverdue } from '../utils/formatters';

type LoansTab = 'active' | 'history' | 'lent';

function isOngoingLoanStatus(status: Loan['status']): boolean {
  return status === 'activo' || status === 'vencido' || status === 'solicitado';
}

function sortActiveFirst(loans: Loan[]): Loan[] {
  return [...loans].sort((a, b) => {
    const aActive = isOngoingLoanStatus(a.status) ? 0 : 1;
    const bActive = isOngoingLoanStatus(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    if (isOngoingLoanStatus(a.status) && isOngoingLoanStatus(b.status)) {
      const aOverdue = isLoanOverdue(a) ? 0 : 1;
      const bOverdue = isLoanOverdue(b) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return a.dueDate.localeCompare(b.dueDate);
    }

    return (b.returnedAt ?? b.updatedAt).localeCompare(a.returnedAt ?? a.updatedAt);
  });
}

export function LoansPage() {
  const navigate = useNavigate();
  const { currentUser, loadingUsers, refreshAlertsCount } = useUser();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<LoansTab>('active');
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [lentLoans, setLentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<Loan | null>(null);
  const [actionLoadingLoanId, setActionLoadingLoanId] = useState<string | null>(null);

  const canSeeLentTab =
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    lentLoans.length > 0;

  useEffect(() => {
    if (!canSeeLentTab && activeTab === 'lent') {
      setActiveTab('active');
    }
  }, [canSeeLentTab, activeTab]);

  const loadLoans = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      if (currentUser.role === 'admin') {
        const allLoans = await musicShareService.listLoans();
        setMyLoans(allLoans.filter((loan) => loan.borrowerId === currentUser.id));
        setLentLoans(sortActiveFirst(allLoans));
      } else {
        const [borrowed, owned] = await Promise.all([
          musicShareService.listLoans({ borrowerId: currentUser.id }),
          musicShareService.listLoans({ ownerId: currentUser.id }),
        ]);
        setMyLoans(borrowed);
        setLentLoans(sortActiveFirst(owned));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar tus préstamos en este momento.',
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleApproveLoan = async (loan: Loan) => {
    setActionLoadingLoanId(loan.id);
    try {
      await musicShareService.approveLoan(loan.id);
      showToast(`Préstamo de "${loan.instrumentName ?? 'instrumento'}" aprobado.`, 'success');
      await Promise.all([loadLoans(), refreshAlertsCount()]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo aprobar el préstamo.';
      showToast(msg, 'error');
    } finally {
      setActionLoadingLoanId(null);
    }
  };

  const handleCancelLoan = async (loan: Loan) => {
    setActionLoadingLoanId(loan.id);
    try {
      await musicShareService.cancelLoan(loan.id);
      showToast('Solicitud de préstamo cancelada.', 'info');
      await Promise.all([loadLoans(), refreshAlertsCount()]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cancelar la solicitud.';
      showToast(msg, 'error');
    } finally {
      setActionLoadingLoanId(null);
    }
  };

  useEffect(() => {
    if (!loadingUsers && currentUser) {
      void loadLoans();
    }
  }, [loadingUsers, currentUser, loadLoans]);

  const activeLoans = useMemo(
    () => sortActiveFirst(myLoans.filter((loan) => isOngoingLoanStatus(loan.status))),
    [myLoans],
  );

  const historyLoans = useMemo(
    () => sortActiveFirst(myLoans.filter((loan) => !isOngoingLoanStatus(loan.status))),
    [myLoans],
  );

  const tabs = useMemo(() => {
    const base: Array<{ id: LoansTab; label: string; count: number }> = [
      { id: 'active', label: 'Activos', count: activeLoans.length },
      { id: 'history', label: 'Historial', count: historyLoans.length },
    ];
    if (canSeeLentTab) {
      base.push({
        id: 'lent',
        label: 'Instrumentos prestados',
        count: lentLoans.length,
      });
    }
    return base;
  }, [activeLoans.length, historyLoans.length, canSeeLentTab, lentLoans.length]);

  const visibleLoans =
    activeTab === 'active'
      ? activeLoans
      : activeTab === 'history'
        ? historyLoans
        : lentLoans;

  const isBusy = loadingUsers || loading;

  const emptyCopy = (() => {
    if (activeTab === 'active') {
      return {
        title: 'No tienes préstamos activos',
        description:
          'Cuando solicites un instrumento del catálogo comunitario aparecerá aquí con su fecha límite de devolución.',
      };
    }
    if (activeTab === 'history') {
      return {
        title: 'Tu historial de devoluciones está vacío',
        description:
          'Aquí verás los instrumentos que ya hayas devuelto junto con su estado final de entrega.',
      };
    }
    return {
      title: 'Aún no hay préstamos de instrumentos registrados',
      description:
        currentUser?.role === 'admin'
          ? 'Cuando los músicos soliciten instrumentos del banco comunitario aparecerán aquí para seguimiento.'
          : 'Cuando un músico solicite alguno de tus instrumentos publicados podrás hacer seguimiento desde aquí.',
    };
  })();

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
      <header className="space-y-1.5">
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-dark-cocoa tracking-tight leading-tight">
          Mis préstamos y devoluciones
        </h1>
        <p className="text-base text-ink-muted max-w-[65ch]">
          Consulta tus entregas pendientes, revisa fechas límite y registra la devolución o cualquier incidencia del instrumento.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Secciones de préstamos"
        className="flex flex-wrap items-center gap-2 border-b border-dark-cocoa/12 pb-3"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.id)}
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
                No pudimos cargar la lista de préstamos
              </p>
              <p className="text-sm text-danger-ink">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadLoans()}
            leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            Reintentar
          </Button>
        </div>
      ) : visibleLoans.length === 0 ? (
        <EmptyState
          icon={
            activeTab === 'history' ? (
              <PackageCheck className="w-8 h-8 text-pool-blue-deep" aria-hidden="true" />
            ) : (
              <Music className="w-8 h-8 text-pool-blue-deep" aria-hidden="true" />
            )
          }
          title={emptyCopy.title}
          description={emptyCopy.description}
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Explorar catálogo
            </Button>
          }
        />
      ) : (
        <div role="tabpanel" className="space-y-4">
          {visibleLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              counterpartyRole={
                activeTab === 'lent'
                  ? currentUser?.role === 'admin'
                    ? 'both'
                    : 'borrower'
                  : 'owner'
              }
              actionLoading={actionLoadingLoanId === loan.id}
              onReturn={
                loan.status === 'activo' || loan.status === 'vencido'
                  ? (target) => setSelectedLoanForReturn(target)
                  : undefined
              }
              onApprove={
                loan.status === 'solicitado' &&
                currentUser &&
                (currentUser.role === 'admin' || loan.ownerId === currentUser.id)
                  ? (target) => void handleApproveLoan(target)
                  : undefined
              }
              onCancel={
                loan.status === 'solicitado' &&
                currentUser &&
                (currentUser.role === 'admin' ||
                  loan.borrowerId === currentUser.id ||
                  loan.ownerId === currentUser.id)
                  ? (target) => void handleCancelLoan(target)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <ReturnLoanModal
        loan={selectedLoanForReturn}
        open={Boolean(selectedLoanForReturn)}
        onClose={() => setSelectedLoanForReturn(null)}
        onSuccess={() => {
          void loadLoans();
        }}
      />
    </section>
  );
}
