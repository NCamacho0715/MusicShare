import { resolveInstrumentImageUrl } from '../config/env';
import type { MusicShareService } from '../types/api';
import type {
  AlertFilters,
  AlertNotification,
  AuthSession,
  CreateInstrumentInput,
  CreateLoanInput,
  Instrument,
  InstrumentFilters,
  Loan,
  LoanFilters,
  LoginInput,
  RegisterInput,
  ReturnLoanInput,
  UpdateInstrumentInput,
  UploadedImageResult,
  UploadUrlResponse,
  User,
} from '../types/models';
import { httpRequest, setActiveUserSession } from './httpClient';
import { compressImageToDataUrl } from './mockStorage';

function normalizeInstrument(instrument: Instrument): Instrument {
  return {
    ...instrument,
    imageUrl: resolveInstrumentImageUrl(instrument.imageUrl, instrument.imageKey),
  };
}

export const apiAdapter: MusicShareService = {
  mode: 'api',

  async login(input: LoginInput): Promise<AuthSession> {
    const session = await httpRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: {
        email: input.email.trim(),
        password: input.password,
      },
    });
    setActiveUserSession(session.user, session.token ?? null);
    return session;
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    const session = await httpRequest<AuthSession>('/auth/register', {
      method: 'POST',
      body: {
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
        role: input.role,
        phone: input.phone?.trim() || undefined,
      },
    });
    setActiveUserSession(session.user, session.token ?? null);
    return session;
  },

  async logout(): Promise<void> {
    setActiveUserSession(null, null);
  },

  async listUsers(): Promise<User[]> {
    return httpRequest<User[]>('/users');
  },

  async getUser(id: string): Promise<User> {
    return httpRequest<User>(`/users/${encodeURIComponent(id)}`);
  },

  async listInstruments(filters?: InstrumentFilters): Promise<Instrument[]> {
    const items = await httpRequest<Instrument[]>('/instruments', {
      query: {
        q: filters?.q,
        category: filters?.category,
        status: filters?.status,
        ownerId: filters?.ownerId,
      },
    });
    return items.map(normalizeInstrument);
  },

  async getInstrument(id: string): Promise<Instrument> {
    const item = await httpRequest<Instrument>(`/instruments/${encodeURIComponent(id)}`);
    return normalizeInstrument(item);
  },

  async createInstrument(input: CreateInstrumentInput): Promise<Instrument> {
    const created = await httpRequest<Instrument>('/instruments', {
      method: 'POST',
      body: input,
    });
    return normalizeInstrument(created);
  },

  async updateInstrument(id: string, input: UpdateInstrumentInput): Promise<Instrument> {
    const updated = await httpRequest<Instrument>(`/instruments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: input,
    });
    return normalizeInstrument(updated);
  },

  async deleteInstrument(id: string): Promise<void> {
    await httpRequest<void>(`/instruments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async uploadInstrumentImage(file: File): Promise<UploadedImageResult> {
    try {
      const presigned = await httpRequest<UploadUrlResponse>('/instruments/upload-url', {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: file.type || 'image/jpeg',
        },
      });

      const uploadResponse = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed (${uploadResponse.status})`);
      }

      return {
        imageKey: presigned.imageKey,
        imageUrl: resolveInstrumentImageUrl(presigned.publicUrl, presigned.imageKey),
      };
    } catch {
      // Fallback limpio: base64 comprimido si Floci/API Gateway aún no expone presigned URL
      const dataUrl = await compressImageToDataUrl(file, 900, 0.82);
      return {
        imageUrl: dataUrl,
      };
    }
  },

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    return httpRequest<Loan[]>('/loans', {
      query: {
        borrowerId: filters?.borrowerId,
        ownerId: filters?.ownerId,
        status: filters?.status,
      },
    });
  },

  async getLoan(id: string): Promise<Loan> {
    return httpRequest<Loan>(`/loans/${encodeURIComponent(id)}`);
  },

  async requestLoan(input: CreateLoanInput): Promise<Loan> {
    return httpRequest<Loan>('/loans', {
      method: 'POST',
      body: input,
    });
  },

  async returnLoan(id: string, input: ReturnLoanInput): Promise<Loan> {
    return httpRequest<Loan>(`/loans/${encodeURIComponent(id)}/return`, {
      method: 'PATCH',
      body: input,
    });
  },

  async deleteLoan(id: string): Promise<void> {
    await httpRequest<void>(`/loans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listAlerts(filters?: AlertFilters): Promise<AlertNotification[]> {
    return httpRequest<AlertNotification[]>('/alerts', {
      query: {
        userId: filters?.userId,
        type: filters?.type,
        unreadOnly: filters?.unreadOnly,
      },
    });
  },

  async markAlertRead(id: string): Promise<AlertNotification> {
    return httpRequest<AlertNotification>(`/alerts/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAlertsRead(userId?: string): Promise<void> {
    await httpRequest<void>('/alerts/read-all', {
      method: 'PATCH',
      query: { userId },
    });
  },

  async runDueDateCheck(): Promise<AlertNotification[]> {
    return httpRequest<AlertNotification[]>('/alerts/check-due', {
      method: 'POST',
    });
  },
};
