import type {
  AlertFilters,
  AlertNotification,
  AuthSession,
  CreateInstrumentInput,
  CreateLoanInput,
  CreateUserInput,
  Instrument,
  InstrumentFilters,
  Loan,
  LoanFilters,
  LoginInput,
  RegisterInput,
  ReturnLoanInput,
  UpdateInstrumentInput,
  UpdateUserInput,
  UploadedImageResult,
  User,
} from './models';

export interface ApiErrorPayload {
  message: string;
  code?: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export interface MusicShareService {
  readonly mode: 'mock' | 'api';

  // Autenticación MVP
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  logout(): Promise<void>;

  // Usuarios (CRUD + Switcher)
  listUsers(): Promise<User[]>;
  getUser(id: string): Promise<User>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Instrumentos
  listInstruments(filters?: InstrumentFilters): Promise<Instrument[]>;
  getInstrument(id: string): Promise<Instrument>;
  createInstrument(input: CreateInstrumentInput): Promise<Instrument>;
  updateInstrument(id: string, input: UpdateInstrumentInput): Promise<Instrument>;
  deleteInstrument(id: string): Promise<void>;
  uploadInstrumentImage(file: File): Promise<UploadedImageResult>;

  // Préstamos
  listLoans(filters?: LoanFilters): Promise<Loan[]>;
  getLoan(id: string): Promise<Loan>;
  requestLoan(input: CreateLoanInput): Promise<Loan>;
  approveLoan(id: string): Promise<Loan>;
  cancelLoan(id: string): Promise<Loan>;
  returnLoan(id: string, input: ReturnLoanInput): Promise<Loan>;
  deleteLoan(id: string): Promise<void>;

  // Alertas (EventBridge+SNS / SQS+SNS)
  listAlerts(filters?: AlertFilters): Promise<AlertNotification[]>;
  markAlertRead(id: string): Promise<AlertNotification>;
  markAllAlertsRead(userId?: string): Promise<void>;
  runDueDateCheck(): Promise<AlertNotification[]>;

  // Utilidad demo (solo Mock)
  resetDemoData?(): Promise<void>;
}
