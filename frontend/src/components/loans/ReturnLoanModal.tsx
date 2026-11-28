import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import { musicShareService } from '../../services';
import type { Loan } from '../../types/models';
import { formatDate } from '../../utils/formatters';
import { extractZodFieldErrors, returnLoanSchema } from '../../utils/validators';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ReturnLoanModalProps {
  loan: Loan | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedLoan: Loan) => void;
}

export function ReturnLoanModal({
  loan,
  open,
  onClose,
  onSuccess,
}: ReturnLoanModalProps) {
  const { refreshAlertsCount } = useUser();
  const { showToast } = useToast();

  const [status, setStatus] = useState<'devuelto' | 'dañado'>('devuelto');
  const [damageNotes, setDamageNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus('devuelto');
      setDamageNotes('');
      setFieldErrors({});
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, loan?.id]);

  if (!loan) {
    return null;
  }

  const handleSelectStatus = (nextStatus: 'devuelto' | 'dañado') => {
    setStatus(nextStatus);
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const parsed = returnLoanSchema.safeParse({
      status,
      damageNotes: status === 'dañado' ? damageNotes : undefined,
    });

    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const updatedLoan = await musicShareService.returnLoan(loan.id, parsed.data);
      await refreshAlertsCount();

      if (parsed.data.status === 'dañado') {
        showToast(
          'Devolución con daño registrada. Se envió una alerta de mantenimiento.',
          'warning',
        );
      } else {
        showToast(
          'Devolución confirmada. El instrumento vuelve a estar disponible.',
          'success',
        );
      }

      onSuccess(updatedLoan);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible registrar la devolución. Intenta nuevamente.';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const damageNotesId = `damage-notes-${loan.id}`;
  const damageErrorId = `damage-notes-error-${loan.id}`;

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Registrar devolución"
      description={`Confirma el estado de entrega de ${loan.instrumentName ?? 'este instrumento'}.`}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="rounded-[var(--radius-control)] bg-surface-muted border border-dark-cocoa/12 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-serif text-base font-semibold text-dark-cocoa">
              {loan.instrumentName ?? 'Instrumento comunitario'}
            </p>
            <p className="text-ink-muted">
              Propietario: <span className="font-semibold text-dark-cocoa">{loan.ownerName ?? 'Propietario'}</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-ink-muted">Fecha límite</p>
            <p className="tabular-data font-semibold text-dark-cocoa">
              {formatDate(loan.dueDate)}
            </p>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-dark-cocoa">
            Estado al momento de la entrega
          </legend>

          <div
            role="radiogroup"
            aria-label="Estado de devolución del instrumento"
            className="grid grid-cols-1 gap-3"
          >
            <button
              type="button"
              role="radio"
              aria-checked={status === 'devuelto'}
              onClick={() => handleSelectStatus('devuelto')}
              className={`w-full text-left rounded-[var(--radius-card)] p-4 border transition-colors cursor-pointer ${
                status === 'devuelto'
                  ? 'border-dark-cocoa bg-pool-blue/25'
                  : 'border-dark-cocoa/15 bg-surface hover:bg-surface-muted/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    status === 'devuelto'
                      ? 'bg-pool-blue text-dark-cocoa'
                      : 'bg-surface-muted text-pool-blue-deep'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-dark-cocoa">
                    Devolver en buen estado
                  </p>
                  <p className="text-sm text-ink-muted leading-snug">
                    El instrumento regresa sin novedades y volverá a figurar como{' '}
                    <strong className="font-semibold text-dark-cocoa">Disponible</strong>{' '}
                    en el catálogo.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={status === 'dañado'}
              onClick={() => handleSelectStatus('dañado')}
              className={`w-full text-left rounded-[var(--radius-card)] p-4 border transition-colors cursor-pointer ${
                status === 'dañado'
                  ? 'border-danger/60 bg-warning-soft/45'
                  : 'border-dark-cocoa/15 bg-surface hover:bg-surface-muted/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    status === 'dañado'
                      ? 'bg-warning-soft text-warning-ink'
                      : 'bg-surface-muted text-warning-ink'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-dark-cocoa">
                    Reportar devolución con daño
                  </p>
                  <p className="text-sm text-ink-muted leading-snug">
                    El instrumento pasará a{' '}
                    <strong className="font-semibold text-dark-cocoa">En mantenimiento</strong>{' '}
                    y se enviará una alerta automática al propietario y al administrador.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </fieldset>

        {status === 'dañado' && (
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={damageNotesId}
                className="block text-sm font-semibold text-dark-cocoa"
              >
                Detalle del daño observado
              </label>
              <span className="tabular-data text-xs text-ink-muted">
                {damageNotes.trim().length}/500
              </span>
            </div>

            <textarea
              id={damageNotesId}
              rows={3}
              maxLength={500}
              value={damageNotes}
              onChange={(event) => {
                setDamageNotes(event.target.value);
                if (fieldErrors.damageNotes) {
                  setFieldErrors({});
                }
              }}
              aria-invalid={Boolean(fieldErrors.damageNotes)}
              aria-describedby={fieldErrors.damageNotes ? damageErrorId : undefined}
              placeholder="Describe qué falla o daño presenta (mín. 8 caracteres) para agilizar la revisión técnica..."
              className={`input-editorial min-h-[96px] py-2.5 resize-y ${
                fieldErrors.damageNotes ? '!border-danger' : ''
              }`}
            />

            {fieldErrors.damageNotes ? (
              <p id={damageErrorId} className="text-sm font-semibold text-danger-ink">
                {fieldErrors.damageNotes}
              </p>
            ) : (
              <p className="text-xs text-ink-muted flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pool-blue-deep" aria-hidden="true" />
                <span>
                  Obligatorio (mín. 8 caracteres). Este reporte se adjuntará a la alerta automática para{' '}
                  {loan.ownerName ?? 'el propietario'} y administración.
                </span>
              </p>
            )}
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="rounded-[var(--radius-control)] bg-danger-soft border border-danger/30 px-3.5 py-2.5 text-sm font-semibold text-danger-ink"
          >
            {submitError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-dark-cocoa/10">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={status === 'dañado' ? 'danger' : 'primary'}
            loading={submitting}
          >
            {status === 'dañado'
              ? 'Reportar daño y devolver'
              : 'Confirmar devolución'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
