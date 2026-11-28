export type UserRole = 'student' | 'musician' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  phone?: string;
  status?: 'activo' | 'inactivo';
  createdAt: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  status?: 'activo' | 'inactivo';
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  status?: 'activo' | 'inactivo';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
}

export const INSTRUMENT_CATEGORIES = [
  'cuerdas',
  'viento',
  'percusion',
  'teclados',
  'amplificacion',
  'otros',
] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

export const INSTRUMENT_STATUSES = [
  'disponible',
  'prestado',
  'mantenimiento',
  'retirado',
] as const;

export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];

export const INSTRUMENT_CONDITIONS = [
  'excelente',
  'bueno',
  'regular',
  'dañado',
] as const;

export type InstrumentCondition = (typeof INSTRUMENT_CONDITIONS)[number];

export interface Instrument {
  id: string;
  name: string;
  category: InstrumentCategory;
  brand?: string;
  model?: string;
  description: string;
  condition: InstrumentCondition;
  status: InstrumentStatus;
  ownerId: string;
  ownerName?: string;
  imageUrl: string;
  imageKey?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export const LOAN_STATUSES = [
  'solicitado',
  'activo',
  'vencido',
  'devuelto',
  'dañado',
  'cancelado',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export interface Loan {
  id: string;
  instrumentId: string;
  instrumentName?: string;
  instrumentImageUrl?: string;
  borrowerId: string;
  borrowerName?: string;
  ownerId: string;
  ownerName?: string;
  startDate: string;
  dueDate: string;
  returnedAt?: string;
  status: LoanStatus;
  damageNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'due_soon' | 'overdue' | 'damage_maintenance';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertSource = 'eventbridge' | 'sqs';
export type AlertChannel = 'sns_email' | 'sns_sms' | 'in_app';

export interface AlertNotification {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  source: AlertSource;
  channel: AlertChannel;
  loanId?: string;
  instrumentId?: string;
  recipientUserId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface InstrumentFilters {
  q?: string;
  category?: InstrumentCategory | 'all';
  status?: InstrumentStatus | 'all';
  ownerId?: string;
}

export interface CreateInstrumentInput {
  name: string;
  category: InstrumentCategory;
  brand?: string;
  model?: string;
  description: string;
  condition: InstrumentCondition;
  location?: string;
  imageUrl: string;
  imageKey?: string;
  imageFile?: File;
}

export interface UpdateInstrumentInput {
  name?: string;
  category?: InstrumentCategory;
  brand?: string;
  model?: string;
  description?: string;
  condition?: InstrumentCondition;
  status?: InstrumentStatus;
  location?: string;
  imageUrl?: string;
  imageKey?: string;
  imageFile?: File;
}

export interface LoanFilters {
  instrumentId?: string;
  borrowerId?: string;
  ownerId?: string;
  status?: LoanStatus | 'all';
}

export interface CreateLoanInput {
  instrumentId: string;
  startDate: string;
  dueDate: string;
  borrowerId?: string;
}

export interface ReturnLoanInput {
  status: 'devuelto' | 'dañado';
  damageNotes?: string;
}

export interface AlertFilters {
  userId?: string;
  type?: AlertType | 'all';
  unreadOnly?: boolean;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
}

export interface UploadedImageResult {
  imageUrl: string;
  imageKey?: string;
  file?: File;
}
