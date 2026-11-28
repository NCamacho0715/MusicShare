import type {
  AlertType,
  InstrumentCategory,
  InstrumentCondition,
  InstrumentStatus,
  Loan,
  LoanStatus,
  UserRole,
} from '../types/models';

const CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  cuerdas: 'Cuerdas',
  viento: 'Viento',
  percusion: 'Percusión',
  teclados: 'Teclados',
  amplificacion: 'Amplificación',
  otros: 'Otros',
};

const STATUS_LABELS: Record<InstrumentStatus, string> = {
  disponible: 'Disponible',
  prestado: 'En préstamo',
  mantenimiento: 'En mantenimiento',
  retirado: 'Retirado',
};

const CONDITION_LABELS: Record<InstrumentCondition, string> = {
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  dañado: 'Dañado',
};

const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  solicitado: 'Solicitado',
  activo: 'Activo',
  vencido: 'Vencido',
  devuelto: 'Devuelto',
  dañado: 'Devuelto con daño',
  cancelado: 'Cancelado',
};

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Estudiante',
  musician: 'Músico',
  owner: 'Propietario',
  admin: 'Administrador',
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  due_soon: 'Vencimiento próximo',
  overdue: 'Préstamo vencido',
  damage_maintenance: 'Mantenimiento por daño',
};

function parseCalendarDate(isoDateOrTimestamp: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateOrTimestamp)) {
    const [year, month, day] = isoDateOrTimestamp.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(isoDateOrTimestamp);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toIsoDateInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIsoDate(days: number, baseDate: Date = new Date()): string {
  const copy = startOfLocalDay(baseDate);
  copy.setDate(copy.getDate() + days);
  return toIsoDateInput(copy);
}

export function formatDate(isoDateOrTimestamp?: string): string {
  if (!isoDateOrTimestamp) return '—';
  const date = parseCalendarDate(isoDateOrTimestamp);
  if (Number.isNaN(date.getTime())) return isoDateOrTimestamp;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(isoTimestamp?: string): string {
  if (!isoTimestamp) return '—';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDueDateStatus(
  dueDateIso: string,
  now: Date = new Date(),
): { daysDiff: number; label: string; isOverdue: boolean; isDueSoon: boolean } {
  const today = startOfLocalDay(now).getTime();
  const due = startOfLocalDay(parseCalendarDate(dueDateIso)).getTime();
  const daysDiff = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    const absDays = Math.abs(daysDiff);
    return {
      daysDiff,
      label: absDays === 1 ? 'Vencido hace 1 día' : `Vencido hace ${absDays} días`,
      isOverdue: true,
      isDueSoon: false,
    };
  }

  if (daysDiff === 0) {
    return {
      daysDiff,
      label: 'Vence hoy',
      isOverdue: false,
      isDueSoon: true,
    };
  }

  if (daysDiff <= 3) {
    return {
      daysDiff,
      label: daysDiff === 1 ? 'Vence mañana' : `Vence en ${daysDiff} días`,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    daysDiff,
    label: `Vence en ${daysDiff} días`,
    isOverdue: false,
    isDueSoon: false,
  };
}

export function isLoanOverdue(
  loan: Pick<Loan, 'status' | 'dueDate'>,
  now: Date = new Date(),
): boolean {
  if (loan.status === 'vencido') return true;
  if (loan.status !== 'activo') return false;
  return getDueDateStatus(loan.dueDate, now).isOverdue;
}

export function getCategoryLabel(category: InstrumentCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function getInstrumentStatusLabel(status: InstrumentStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getConditionLabel(condition: InstrumentCondition): string {
  return CONDITION_LABELS[condition] ?? condition;
}

export function getLoanStatusLabel(status: LoanStatus, overdue = false): string {
  if (status === 'activo' && overdue) return 'Vencido';
  return LOAN_STATUS_LABELS[status] ?? status;
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getAlertTypeLabel(type: AlertType): string {
  return ALERT_TYPE_LABELS[type] ?? type;
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
