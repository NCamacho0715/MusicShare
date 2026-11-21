import { Calendar, Info } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import { ApiError, musicShareService } from '../../services/index';
import type { Instrument, Loan } from '../../types/models';
import {
  addDaysIsoDate,
  formatDate,
  toIsoDateInput,
} from '../../utils/formatters';
import {
  extractZodFieldErrors,
  loanRequestSchema,
} from '../../utils/validators';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface LoanRequestModalProps {
  instrument: Instrument;
  open: boolean;
  onClose: () => void;
  onSuccess: (loan: Loan) => void;
  initialStartDate?: string;
  initialDueDate?: string;
}

export function LoanRequestModal({
  instrument,
  open,
  onClose,
  onSuccess,
  initialStartDate,
  initialDueDate,
}: LoanRequestModalProps) {
  const { currentUser, refreshAlertsCount } = useUser();
  const { showToast } = useToast();

  const today = toIsoDateInput();
  const [startDate, setStartDate] = useState(initialStartDate || today);
  const [dueDate, setDueDate] = useState(
    initialDueDate || addDaysIsoDate(7),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const nextStart = initialStartDate || toIsoDateInput();
      const nextDue = initialDueDate || addDaysIsoDate(7);
      setStartDate(nextStart);
      setDueDate(nextDue >= nextStart ? nextDue : nextStart);
      setFieldErrors({});
      setSubmitError(null);
    }
  }, [open, initialStartDate, initialDueDate]);

  const loanDays = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return null;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${dueDate}T00:00:00`);
    const diff = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff >= 0 ? diff : null;
  }, [startDate, dueDate]);

  const handleStartDateChange = (nextStart: string) => {
    setStartDate(nextStart);
    if (dueDate < nextStart) {
      setDueDate(nextStart);
    }
    setFieldErrors((prev) => ({ ...prev, startDate: '', dueDate: '' }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const parsed = loanRequestSchema.safeParse({
      instrumentId: instrument.id,
      startDate,
      dueDate,
    });

    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    if (!currentUser) {
      setSubmitError('Debes iniciar sesión para solicitar un préstamo.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const createdLoan = await musicShareService.requestLoan({
        instrumentId: instrument.id,
        startDate: parsed.data.startDate,
        dueDate: parsed.data.dueDate,
        borrowerId: currentUser.id,
      });
      await refreshAlertsCount();
      showToast(
        `Préstamo confirmado hasta el ${formatDate(createdLoan.dueDate)}.`,
        'success',
      );
      onSuccess(createdLoan);
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No pudimos registrar tu solicitud. Intenta nuevamente.';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar solicitud de préstamo"
      description="El instrumento quedará reservado a tu nombre y pasarás a ver la fecha límite en Mis Préstamos."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="rounded-xl border border-dark-cocoa/12 bg-surface-muted p-4 text-sm">
          <p className="font-serif text-lg font-semibold text-dark-cocoa">
            {instrument.name}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1.5 text-ink-muted sm:grid-cols-2">
            <p>
              <span className="font-semibold text-dark-cocoa">Custodio:</span>{' '}
              {instrument.ownerName || 'Comunidad'}
            </p>
            <p>
              <span className="font-semibold text-dark-cocoa">Solicitante:</span>{' '}
              {currentUser?.name ?? 'Usuario activo'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="loan-start-date"
              className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
            >
              Fecha de inicio
            </label>
            <input
              id="loan-start-date"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.startDate)}
              className={`input-editorial tabular-data text-sm ${
                fieldErrors.startDate ? 'border-danger' : ''
              }`}
            />
            {fieldErrors.startDate && (
              <p className="mt-1.5 text-xs font-medium text-danger-ink">
                {fieldErrors.startDate}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="loan-due-date"
              className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
            >
              Fecha de devolución
            </label>
            <input
              id="loan-due-date"
              type="date"
              min={startDate || today}
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
              }}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.dueDate)}
              className={`input-editorial tabular-data text-sm ${
                fieldErrors.dueDate ? 'border-danger' : ''
              }`}
            />
            {fieldErrors.dueDate && (
              <p className="mt-1.5 text-xs font-medium text-danger-ink">
                {fieldErrors.dueDate}
              </p>
            )}
          </div>
        </div>

        {loanDays !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-dark-cocoa/12 bg-pool-blue/30 px-3.5 py-2.5 text-sm text-dark-cocoa">
            <Calendar
              className="h-4 w-4 shrink-0 text-pool-blue-deep"
              aria-hidden="true"
            />
            <span className="tabular-data">
              Duración prevista:{' '}
              <strong>
                {loanDays === 0
                  ? 'Mismo día'
                  : loanDays === 1
                    ? '1 día'
                    : `${loanDays} días`}
              </strong>{' '}
              ({formatDate(startDate)} — {formatDate(dueDate)})
            </span>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
          <p>
            Recibirás recordatorios automáticos antes del vencimiento y podrás
            registrar la devolución desde tu panel de préstamos.
          </p>
        </div>

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-sm font-medium text-danger-ink"
          >
            {submitError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Confirmar préstamo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
