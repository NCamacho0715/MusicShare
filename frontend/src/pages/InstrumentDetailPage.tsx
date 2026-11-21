import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MapPin,
  Music2,
  Pencil,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoanRequestModal } from '../components/instruments/LoanRequestModal';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { InstrumentImage } from '../components/ui/InstrumentImage';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ApiError, musicShareService } from '../services/index';
import type { Instrument, InstrumentStatus, Loan } from '../types/models';
import {
  addDaysIsoDate,
  formatDate,
  getCategoryLabel,
  getConditionLabel,
  getInstrumentStatusLabel,
  toIsoDateInput,
} from '../utils/formatters';

function getStatusBadgeVariant(status: InstrumentStatus): BadgeVariant {
  switch (status) {
    case 'disponible':
      return 'available';
    case 'prestado':
      return 'loaned';
    case 'mantenimiento':
      return 'maintenance';
    case 'retirado':
    default:
      return 'neutral';
  }
}

export function InstrumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { showToast } = useToast();

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toIsoDateInput();
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDaysIsoDate(7));
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadInstrument = useCallback(async () => {
    if (!id) {
      setError('Identificador de instrumento no válido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await musicShareService.getInstrument(id);
      setInstrument(data);

      if (data.status === 'prestado') {
        try {
          const loans = await musicShareService.listLoans({ status: 'activo' });
          const current = loans.find((loan) => loan.instrumentId === data.id) ?? null;
          setActiveLoan(current);
        } catch {
          setActiveLoan(null);
        }
      } else {
        setActiveLoan(null);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No pudimos cargar la ficha del instrumento.';
      setError(message);
      setInstrument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadInstrument();
  }, [loadInstrument]);

  const canManage = Boolean(
    instrument &&
      currentUser &&
      (currentUser.id === instrument.ownerId || currentUser.role === 'admin'),
  );

  const handleConfirmDelete = async () => {
    if (!instrument) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await musicShareService.deleteInstrument(instrument.id);
      showToast(`"${instrument.name}" fue retirado del catálogo.`, 'success');
      setDeleteModalOpen(false);
      navigate('/');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo retirar el instrumento.';
      setDeleteError(message);
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-10">
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !instrument) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:px-8">
        <EmptyState
          icon={<Music2 className="h-7 w-7" aria-hidden="true" />}
          title="No encontramos este instrumento"
          description={
            error ||
            'Es posible que haya sido retirado del catálogo o que el enlace ya no esté disponible.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="btn-primary text-sm">
                Volver al catálogo
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadInstrument()}
              >
                Reintentar
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-ink-muted transition-colors hover:text-dark-cocoa"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Volver al catálogo</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Columna izquierda: Fotografía y ficha técnica */}
        <div className="space-y-6 lg:col-span-7">
          <div className="card-editorial overflow-hidden">
            <InstrumentImage
              src={instrument.imageUrl}
              alt={instrument.name}
              category={instrument.category}
              aspectClass="aspect-[16/10]"
            />
          </div>

          <section className="card-editorial space-y-6 p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="category">
                  {getCategoryLabel(instrument.category)}
                </Badge>
                <Badge variant={getStatusBadgeVariant(instrument.status)}>
                  {getInstrumentStatusLabel(instrument.status)}
                </Badge>
              </div>

              <h1 className="mt-4 font-serif text-3xl font-medium leading-tight tracking-[-0.015em] text-dark-cocoa sm:text-4xl">
                {instrument.name}
              </h1>

              {instrument.brand && (
                <p className="mt-1.5 text-base font-medium text-ink-muted">
                  {instrument.brand}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-4 border-t border-dark-cocoa/10 pt-5 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-muted/70 p-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Estado de conservación
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-dark-cocoa">
                  <ShieldCheck
                    className="h-4 w-4 text-pool-blue-deep"
                    aria-hidden="true"
                  />
                  <span>{getConditionLabel(instrument.condition)}</span>
                </dd>
              </div>

              <div className="rounded-xl bg-surface-muted/70 p-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Propietario / Custodio
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-dark-cocoa">
                  <UserIcon
                    className="h-4 w-4 text-pool-blue-deep"
                    aria-hidden="true"
                  />
                  <span>{instrument.ownerName || 'Comunidad MusicShare'}</span>
                </dd>
              </div>

              <div className="rounded-xl bg-surface-muted/70 p-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Ubicación de entrega
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-dark-cocoa">
                  <MapPin
                    className="h-4 w-4 text-pool-blue-deep"
                    aria-hidden="true"
                  />
                  <span>{instrument.location || 'Por coordinar'}</span>
                </dd>
              </div>

              <div className="rounded-xl bg-surface-muted/70 p-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Publicado en catálogo
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-dark-cocoa tabular-data">
                  <Calendar
                    className="h-4 w-4 text-pool-blue-deep"
                    aria-hidden="true"
                  />
                  <span>{formatDate(instrument.createdAt)}</span>
                </dd>
              </div>
            </dl>

            <div className="border-t border-dark-cocoa/10 pt-5">
              <h2 className="font-serif text-xl font-semibold text-dark-cocoa">
                Descripción y notas de cuidado
              </h2>
              <p className="mt-2.5 max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-ink-muted">
                {instrument.description}
              </p>
            </div>
          </section>
        </div>

        {/* Columna derecha: Panel de solicitud de préstamo y acciones de dueño/admin */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:col-span-5">
          <div className="card-editorial space-y-5 p-6">
            <div>
              <h2 className="font-serif text-2xl font-medium text-dark-cocoa">
                {instrument.status === 'disponible'
                  ? 'Solicitar préstamo'
                  : 'Estado de disponibilidad'}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {instrument.status === 'disponible'
                  ? 'Préstamo comunitario sin costo de alquiler. Elige tus fechas tentativas y confirma la solicitud.'
                  : 'Consulta la disponibilidad actual antes de programar tu ensayo.'}
              </p>
            </div>

            {instrument.status === 'disponible' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="detail-start-date"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
                    >
                      Fecha de inicio
                    </label>
                    <input
                      id="detail-start-date"
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartDate(val);
                        if (dueDate < val) setDueDate(val);
                      }}
                      className="input-editorial tabular-data text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="detail-due-date"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
                    >
                      Devolución prevista
                    </label>
                    <input
                      id="detail-due-date"
                      type="date"
                      min={startDate || today}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="input-editorial tabular-data text-sm"
                    />
                  </div>
                </div>

                {currentUser?.id === instrument.ownerId && (
                  <p className="rounded-lg border border-dark-cocoa/12 bg-pool-blue/25 px-3.5 py-2.5 text-xs leading-relaxed text-dark-cocoa">
                    Eres el propietario de este instrumento. Puedes gestionarlo
                    más abajo o probar el flujo de solicitud con tu usuario
                    activo.
                  </p>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setLoanModalOpen(true)}
                >
                  Solicitar préstamo
                </Button>
              </div>
            ) : instrument.status === 'prestado' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-dark-cocoa/15 bg-surface-muted p-4 text-sm text-dark-cocoa">
                  <p className="font-semibold">
                    Actualmente se encuentra en préstamo.
                  </p>
                  {activeLoan && (
                    <p className="mt-1 text-ink-muted tabular-data">
                      Devolución prevista el{' '}
                      <strong className="text-dark-cocoa">
                        {formatDate(activeLoan.dueDate)}
                      </strong>
                      .
                    </p>
                  )}
                </div>

                <Link to="/" className="btn-secondary w-full text-sm">
                  Explorar instrumentos disponibles
                </Link>
              </div>
            ) : instrument.status === 'mantenimiento' ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-warning-ink/25 bg-warning-soft/55 p-4 text-sm text-warning-ink">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="leading-relaxed">
                    Este instrumento está en revisión o mantenimiento y volverá a
                    habilitarse cuando termine su puesta a punto.
                  </p>
                </div>

                <Link to="/" className="btn-secondary w-full text-sm">
                  Explorar instrumentos disponibles
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-dark-cocoa/15 bg-surface-muted p-4 text-sm text-ink-muted">
                  Este instrumento fue retirado del catálogo comunitario y ya no
                  admite solicitudes.
                </div>
                <Link to="/" className="btn-secondary w-full text-sm">
                  Volver al catálogo
                </Link>
              </div>
            )}
          </div>

          {canManage && (
            <div className="card-editorial space-y-3 p-6">
              <h3 className="font-serif text-lg font-semibold text-dark-cocoa">
                Gestión del instrumento
              </h3>
              <p className="text-xs leading-relaxed text-ink-muted">
                Actualiza la ficha, cambia el estado de disponibilidad o retira
                el instrumento del banco comunitario.
              </p>
              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => navigate(`/instruments/${instrument.id}/edit`)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex-1"
                  leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteModalOpen(true);
                  }}
                >
                  Retirar instrumento
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <LoanRequestModal
        instrument={instrument}
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        initialStartDate={startDate}
        initialDueDate={dueDate}
        onSuccess={() => {
          void loadInstrument();
        }}
      />

      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Retirar instrumento del catálogo"
        description="Esta acción eliminará la ficha del catálogo comunitario."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            ¿Seguro que deseas retirar{' '}
            <strong className="text-dark-cocoa">{instrument.name}</strong>? Si
            tiene un préstamo activo, deberás esperar a que se registre la
            devolución.
          </p>

          {deleteError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-sm font-medium text-danger-ink"
            >
              {deleteError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              Confirmar retiro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
