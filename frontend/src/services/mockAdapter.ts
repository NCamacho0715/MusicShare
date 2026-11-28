import { ApiError, type MusicShareService } from '../types/api';
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
} from '../types/models';
import { getActiveUserSession, setActiveUserSession } from './httpClient';
import { DEMO_USER_PASSWORD } from './mockSeed';
import {
  compressImageToDataUrl,
  evaluateDueLoans,
  loadMockDatabase,
  resetMockDatabase,
  saveMockDatabase,
} from './mockStorage';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function resolveActingUser(users: User[], fallbackRole: User['role'] = 'musician'): User {
  const active = getActiveUserSession();
  if (active) return active;
  return users.find((u) => u.role === fallbackRole) ?? users[0];
}

export const mockAdapter: MusicShareService = {
  mode: 'mock',

  async login(input: LoginInput): Promise<AuthSession> {
    const db = loadMockDatabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    const expectedPassword =
      db.credentials[normalizedEmail] ?? (user ? DEMO_USER_PASSWORD : undefined);

    if (!user || expectedPassword !== input.password) {
      throw new ApiError({
        status: 401,
        message: 'Correo o contraseña incorrectos.',
      });
    }

    const token = `mock-token-${user.id}-${Date.now().toString(36)}`;
    setActiveUserSession(user, token);
    return { user, token };
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    const db = loadMockDatabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const exists = db.users.some((u) => u.email.toLowerCase() === normalizedEmail);

    if (exists) {
      throw new ApiError({
        status: 409,
        message: 'Ya existe una cuenta registrada con este correo.',
      });
    }

    const nowIso = new Date().toISOString();
    const createdUser: User = {
      id: generateId('usr'),
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role,
      phone: input.phone?.trim() || undefined,
      createdAt: nowIso,
    };

    db.users.push(createdUser);
    db.credentials[normalizedEmail] = input.password;
    saveMockDatabase(db);

    const token = `mock-token-${createdUser.id}-${Date.now().toString(36)}`;
    setActiveUserSession(createdUser, token);
    return { user: createdUser, token };
  },

  async logout(): Promise<void> {
    setActiveUserSession(null, null);
  },

  async listUsers(): Promise<User[]> {
    const db = loadMockDatabase();
    return db.users;
  },

  async getUser(id: string): Promise<User> {
    const db = loadMockDatabase();
    const found = db.users.find((u) => u.id === id);
    if (!found) {
      throw new ApiError({ status: 404, message: 'Usuario no encontrado' });
    }
    return found;
  },

  async createUser(input: CreateUserInput): Promise<User> {
    const db = loadMockDatabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new ApiError({
        status: 409,
        message: 'Ya existe un usuario registrado con este correo.',
      });
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const created: User = {
      id: generateId('usr'),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: normalizedEmail,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      status: input.status ?? 'activo',
      createdAt: new Date().toISOString(),
    };
    db.users.push(created);
    db.credentials[normalizedEmail] = DEMO_USER_PASSWORD;
    saveMockDatabase(db);
    return created;
  },

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const db = loadMockDatabase();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new ApiError({ status: 404, message: 'Usuario no encontrado' });
    }

    const existing = db.users[index];
    const nextEmail = input.email ? input.email.trim().toLowerCase() : existing.email;
    if (
      nextEmail !== existing.email.toLowerCase() &&
      db.users.some((u) => u.id !== id && u.email.toLowerCase() === nextEmail)
    ) {
      throw new ApiError({
        status: 409,
        message: 'Este correo ya está en uso por otro usuario.',
      });
    }

    const firstName =
      input.firstName !== undefined
        ? input.firstName.trim()
        : existing.firstName ?? existing.name.split(/\s+/)[0] ?? '';
    const lastName =
      input.lastName !== undefined
        ? input.lastName.trim()
        : existing.lastName ?? existing.name.split(/\s+/).slice(1).join(' ');

    const updated: User = {
      ...existing,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || existing.name,
      email: nextEmail,
      role: input.role ?? existing.role,
      phone: input.phone !== undefined ? input.phone.trim() || undefined : existing.phone,
      status: input.status ?? existing.status ?? 'activo',
    };

    db.users[index] = updated;
    saveMockDatabase(db);
    const active = getActiveUserSession();
    if (active && active.id === updated.id) {
      setActiveUserSession(updated);
    }
    return updated;
  },

  async deleteUser(id: string): Promise<void> {
    const db = loadMockDatabase();
    const existing = db.users.find((u) => u.id === id);
    if (!existing) {
      throw new ApiError({ status: 404, message: 'Usuario no encontrado' });
    }
    const hasActiveLoan = db.loans.some(
      (l) =>
        (l.status === 'activo' || l.status === 'vencido') &&
        (l.borrowerId === id || l.ownerId === id),
    );
    if (hasActiveLoan) {
      throw new ApiError({
        status: 409,
        message: 'No puedes eliminar un usuario con préstamos activos.',
      });
    }
    db.users = db.users.filter((u) => u.id !== id);
    saveMockDatabase(db);
  },

  async listInstruments(filters?: InstrumentFilters): Promise<Instrument[]> {
    const db = loadMockDatabase();
    const query = filters?.q?.trim().toLowerCase() ?? '';

    return db.instruments
      .filter((inst) => {
        if (filters?.category && filters.category !== 'all' && inst.category !== filters.category) {
          return false;
        }
        if (filters?.status && filters.status !== 'all') {
          if (inst.status !== filters.status) return false;
        } else if (inst.status === 'retirado') {
          // Ocultar retirados del catálogo por defecto salvo filtro explícito
          return false;
        }
        if (filters?.ownerId && inst.ownerId !== filters.ownerId) {
          return false;
        }
        if (query) {
          const haystack = `${inst.name} ${inst.brand ?? ''} ${inst.model ?? ''} ${inst.description} ${inst.ownerName ?? ''} ${inst.location ?? ''}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getInstrument(id: string): Promise<Instrument> {
    const db = loadMockDatabase();
    const found = db.instruments.find((inst) => inst.id === id);
    if (!found) {
      throw new ApiError({ status: 404, message: 'Instrumento no encontrado' });
    }
    return found;
  },

  async createInstrument(input: CreateInstrumentInput): Promise<Instrument> {
    const db = loadMockDatabase();
    const actingUser = resolveActingUser(db.users, 'owner');
    const nowIso = new Date().toISOString();

    const created: Instrument = {
      id: generateId('inst'),
      name: input.name.trim(),
      category: input.category,
      brand: input.brand?.trim() || undefined,
      model: input.model?.trim() || undefined,
      description: input.description.trim(),
      condition: input.condition,
      status: 'disponible',
      ownerId: actingUser.id,
      ownerName: actingUser.name,
      imageUrl: input.imageUrl,
      imageKey: input.imageKey,
      location: input.location?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.instruments.unshift(created);
    saveMockDatabase(db);
    return created;
  },

  async updateInstrument(id: string, input: UpdateInstrumentInput): Promise<Instrument> {
    const db = loadMockDatabase();
    const index = db.instruments.findIndex((inst) => inst.id === id);
    if (index === -1) {
      throw new ApiError({ status: 404, message: 'Instrumento no encontrado' });
    }

    const existing = db.instruments[index];
    const updated: Instrument = {
      ...existing,
      ...input,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      brand: input.brand !== undefined ? input.brand.trim() || undefined : existing.brand,
      model: input.model !== undefined ? input.model.trim() || undefined : existing.model,
      description:
        input.description !== undefined ? input.description.trim() : existing.description,
      location:
        input.location !== undefined ? input.location.trim() || undefined : existing.location,
      updatedAt: new Date().toISOString(),
    };

    db.instruments[index] = updated;
    // Sync display fields on active loans if instrument metadata changed
    db.loans = db.loans.map((loan) =>
      loan.instrumentId === id
        ? {
            ...loan,
            instrumentName: updated.name,
            instrumentImageUrl: updated.imageUrl,
          }
        : loan,
    );

    saveMockDatabase(db);
    return updated;
  },

  async deleteInstrument(id: string): Promise<void> {
    const db = loadMockDatabase();
    const target = db.instruments.find((inst) => inst.id === id);
    if (!target) {
      throw new ApiError({ status: 404, message: 'Instrumento no encontrado' });
    }

    const hasActiveLoan = db.loans.some(
      (loan) => loan.instrumentId === id && loan.status === 'activo',
    );
    if (hasActiveLoan) {
      throw new ApiError({
        status: 409,
        message: 'No puedes retirar un instrumento que tiene un préstamo activo.',
      });
    }

    db.instruments = db.instruments.filter((inst) => inst.id !== id);
    saveMockDatabase(db);
  },

  async uploadInstrumentImage(file: File): Promise<UploadedImageResult> {
    const imageUrl = await compressImageToDataUrl(file, 900, 0.82);
    return {
      imageUrl,
      imageKey: `mock/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`,
    };
  },

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    const db = loadMockDatabase();
    return db.loans
      .filter((loan) => {
        if (filters?.instrumentId && loan.instrumentId !== filters.instrumentId) {
          return false;
        }
        if (filters?.borrowerId && loan.borrowerId !== filters.borrowerId) {
          return false;
        }
        if (filters?.ownerId && loan.ownerId !== filters.ownerId) {
          return false;
        }
        if (filters?.status && filters.status !== 'all' && loan.status !== filters.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getLoan(id: string): Promise<Loan> {
    const db = loadMockDatabase();
    const found = db.loans.find((loan) => loan.id === id);
    if (!found) {
      throw new ApiError({ status: 404, message: 'Préstamo no encontrado' });
    }
    return found;
  },

  async requestLoan(input: CreateLoanInput): Promise<Loan> {
    const db = loadMockDatabase();
    const instIndex = db.instruments.findIndex((i) => i.id === input.instrumentId);
    if (instIndex === -1) {
      throw new ApiError({ status: 404, message: 'Instrumento no encontrado' });
    }

    const instrument = db.instruments[instIndex];
    if (instrument.status !== 'disponible') {
      throw new ApiError({
        status: 409,
        message: 'Este instrumento no está disponible para préstamo en este momento.',
      });
    }

    const actingUser = resolveActingUser(db.users, 'musician');
    const borrower =
      (input.borrowerId ? db.users.find((u) => u.id === input.borrowerId) : undefined) ??
      actingUser;

    const nowIso = new Date().toISOString();
    const createdLoan: Loan = {
      id: generateId('loan'),
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      instrumentImageUrl: instrument.imageUrl,
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      ownerId: instrument.ownerId,
      ownerName: instrument.ownerName,
      startDate: input.startDate,
      dueDate: input.dueDate,
      status: 'activo',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.instruments[instIndex] = {
      ...instrument,
      status: 'prestado',
      updatedAt: nowIso,
    };
    db.loans.unshift(createdLoan);

    const evaluated = evaluateDueLoans(db);
    saveMockDatabase(evaluated.state);
    return createdLoan;
  },

  async approveLoan(id: string): Promise<Loan> {
    const db = loadMockDatabase();
    const index = db.loans.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new ApiError({ status: 404, message: 'Préstamo no encontrado' });
    }
    const existing = db.loans[index];
    const nowIso = new Date().toISOString();
    const updated: Loan = { ...existing, status: 'activo', updatedAt: nowIso };
    db.loans[index] = updated;

    const instIndex = db.instruments.findIndex((i) => i.id === existing.instrumentId);
    if (instIndex !== -1) {
      db.instruments[instIndex] = {
        ...db.instruments[instIndex],
        status: 'prestado',
        updatedAt: nowIso,
      };
    }
    saveMockDatabase(db);
    return updated;
  },

  async cancelLoan(id: string): Promise<Loan> {
    const db = loadMockDatabase();
    const index = db.loans.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new ApiError({ status: 404, message: 'Préstamo no encontrado' });
    }
    const existing = db.loans[index];
    const updated: Loan = {
      ...existing,
      status: 'cancelado',
      updatedAt: new Date().toISOString(),
    };
    db.loans[index] = updated;
    saveMockDatabase(db);
    return updated;
  },

  async returnLoan(id: string, input: ReturnLoanInput): Promise<Loan> {
    const db = loadMockDatabase();
    const loanIndex = db.loans.findIndex((l) => l.id === id);
    if (loanIndex === -1) {
      throw new ApiError({ status: 404, message: 'Préstamo no encontrado' });
    }

    const existingLoan = db.loans[loanIndex];
    if (existingLoan.status !== 'activo' && existingLoan.status !== 'vencido') {
      throw new ApiError({
        status: 409,
        message: 'Este préstamo ya fue cerrado anteriormente.',
      });
    }

    const nowIso = new Date().toISOString();
    const isDamaged = input.status === 'dañado';
    const cleanNotes = input.damageNotes?.trim() || undefined;

    const updatedLoan: Loan = {
      ...existingLoan,
      status: input.status,
      returnedAt: nowIso,
      damageNotes: isDamaged ? cleanNotes : undefined,
      updatedAt: nowIso,
    };
    db.loans[loanIndex] = updatedLoan;

    const instIndex = db.instruments.findIndex((i) => i.id === existingLoan.instrumentId);
    if (instIndex !== -1) {
      const inst = db.instruments[instIndex];
      db.instruments[instIndex] = {
        ...inst,
        status: isDamaged ? 'mantenimiento' : 'disponible',
        condition: isDamaged ? 'dañado' : inst.condition,
        updatedAt: nowIso,
      };
    }

    // Flujo SQS -> Lambda Mantenimiento -> SNS si el instrumento volvió dañado
    if (isDamaged) {
      const alert: AlertNotification = {
        id: generateId('alert-dmg'),
        type: 'damage_maintenance',
        severity: 'critical',
        source: 'sqs',
        channel: 'sns_email',
        loanId: updatedLoan.id,
        instrumentId: updatedLoan.instrumentId,
        recipientUserId: updatedLoan.ownerId,
        title: `Revisión requerida: ${updatedLoan.instrumentName ?? 'Instrumento'}`,
        message: `Devuelto con reporte de daño por ${updatedLoan.borrowerName ?? 'prestatario'}: "${cleanNotes ?? 'Sin detalle adicional'}". El instrumento pasó a estado En mantenimiento.`,
        read: false,
        createdAt: nowIso,
      };
      db.alerts.unshift(alert);
    }

    saveMockDatabase(db);
    return updatedLoan;
  },

  async deleteLoan(id: string): Promise<void> {
    const db = loadMockDatabase();
    const loan = db.loans.find((l) => l.id === id);
    if (!loan) {
      throw new ApiError({ status: 404, message: 'Préstamo no encontrado' });
    }

    if (loan.status === 'activo') {
      const instIndex = db.instruments.findIndex((i) => i.id === loan.instrumentId);
      if (instIndex !== -1) {
        db.instruments[instIndex] = {
          ...db.instruments[instIndex],
          status: 'disponible',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    db.loans = db.loans.filter((l) => l.id !== id);
    saveMockDatabase(db);
  },

  async listAlerts(filters?: AlertFilters): Promise<AlertNotification[]> {
    const initialDb = loadMockDatabase();
    const evaluated = evaluateDueLoans(initialDb);
    if (evaluated.createdAlerts.length > 0) {
      saveMockDatabase(evaluated.state);
    }

    return evaluated.state.alerts
      .filter((alert) => {
        if (filters?.userId && alert.recipientUserId !== filters.userId) {
          return false;
        }
        if (filters?.type && filters.type !== 'all' && alert.type !== filters.type) {
          return false;
        }
        if (filters?.unreadOnly && alert.read) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async markAlertRead(id: string): Promise<AlertNotification> {
    const db = loadMockDatabase();
    const index = db.alerts.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new ApiError({ status: 404, message: 'Alerta no encontrada' });
    }
    const updated: AlertNotification = { ...db.alerts[index], read: true };
    db.alerts[index] = updated;
    saveMockDatabase(db);
    return updated;
  },

  async markAllAlertsRead(userId?: string): Promise<void> {
    const db = loadMockDatabase();
    db.alerts = db.alerts.map((alert) =>
      !userId || alert.recipientUserId === userId ? { ...alert, read: true } : alert,
    );
    saveMockDatabase(db);
  },

  async runDueDateCheck(): Promise<AlertNotification[]> {
    const db = loadMockDatabase();
    const evaluated = evaluateDueLoans(db);
    if (evaluated.createdAlerts.length > 0) {
      saveMockDatabase(evaluated.state);
    }
    return evaluated.createdAlerts;
  },

  async resetDemoData(): Promise<void> {
    resetMockDatabase();
  },
};
