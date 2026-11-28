import { resolveInstrumentImageUrl } from '../config/env';
import { ApiError } from '../types/api';
import type { MusicShareService } from '../types/api';
import type {
  AlertFilters,
  AlertNotification,
  AuthSession,
  CreateInstrumentInput,
  CreateLoanInput,
  CreateUserInput,
  Instrument,
  InstrumentCategory,
  InstrumentCondition,
  InstrumentFilters,
  InstrumentStatus,
  Loan,
  LoanFilters,
  LoanStatus,
  LoginInput,
  RegisterInput,
  ReturnLoanInput,
  UpdateInstrumentInput,
  UpdateUserInput,
  UploadedImageResult,
  User,
  UserRole,
} from '../types/models';
import { getDueDateStatus } from '../utils/formatters';
import {
  getActiveUserSession,
  httpDataRequest,
  httpRequest,
  setActiveUserSession,
} from './httpClient';
import { compressImageToDataUrl } from './mockStorage';

// --- Modelos directos devueltos por el backend Serverless (Python / DynamoDB) ---
interface BackendUsuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rol: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface BackendInstrumento {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: string;
  descripcion?: string;
  ubicacion?: string;
  condicion?: string;
  estado: string;
  propietario_id: string;
  imagen_key?: string;
  created_at: string;
  updated_at: string;
}

interface BackendPrestamo {
  id: string;
  instrumento_id: string;
  solicitante_id: string;
  propietario_id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  fecha_devolucion?: string;
  estado: string;
  observaciones?: string;
  notificacion_vencimiento_enviada: boolean;
  created_at: string;
  updated_at: string;
}

interface BackendPresignedUpload {
  upload_url: string;
  key: string;
  bucket: string;
  public_url?: string;
}

// Claves de almacenamiento local para persistencia de estado de alertas en UI
const READ_ALERTS_STORAGE_KEY = 'musicshare_read_alerts_v1';

function getReadAlertIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_ALERTS_STORAGE_KEY);
    if (raw) {
      return new Set(JSON.parse(raw) as string[]);
    }
  } catch {
    // Ignore storage issues
  }
  return new Set();
}

function saveReadAlertId(id: string): void {
  try {
    const ids = getReadAlertIds();
    ids.add(id);
    localStorage.setItem(READ_ALERTS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage issues
  }
}

function saveAllReadAlertIds(newIds: string[]): void {
  try {
    const ids = getReadAlertIds();
    for (const id of newIds) {
      ids.add(id);
    }
    localStorage.setItem(READ_ALERTS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage issues
  }
}

// --- Mapeadores Backend ↔ Frontend ---

function toFrontendRole(rol?: string): UserRole {
  const r = (rol || '').trim().toLowerCase();
  if (r === 'estudiante' || r === 'student') return 'student';
  if (r === 'propietario' || r === 'owner') return 'owner';
  if (r === 'administrador' || r === 'admin') return 'admin';
  return 'musician';
}

function toBackendRole(role: UserRole): string {
  switch (role) {
    case 'student':
      return 'estudiante';
    case 'owner':
      return 'propietario';
    case 'admin':
      return 'administrador';
    case 'musician':
    default:
      return 'musico';
  }
}

function toFrontendUser(u: BackendUsuario): User {
  const fullName = u.apellido
    ? `${u.nombre} ${u.apellido}`.trim()
    : u.nombre;

  return {
    id: u.id,
    name: fullName,
    firstName: u.nombre,
    lastName: u.apellido,
    email: u.correo,
    role: toFrontendRole(u.rol),
    phone: u.telefono,
    status: u.estado === 'inactivo' ? 'inactivo' : 'activo',
    createdAt: u.created_at,
  };
}

function normalizeCategory(raw?: string): InstrumentCategory {
  const normalized = (raw || 'otros')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const validCategories: InstrumentCategory[] = [
    'cuerdas',
    'viento',
    'percusion',
    'teclados',
    'amplificacion',
    'otros',
  ];

  return validCategories.includes(normalized as InstrumentCategory)
    ? (normalized as InstrumentCategory)
    : 'otros';
}

function toBackendInstrumentStatus(status?: InstrumentStatus): string | undefined {
  if (!status) return undefined;
  if (status === 'mantenimiento') return 'en_mantenimiento';
  if (status === 'retirado') return 'inactivo';
  return status;
}

function toFrontendInstrument(i: BackendInstrumento, ownerName?: string): Instrument {
  const category = normalizeCategory(i.categoria);

  let status: InstrumentStatus = 'disponible';
  const est = (i.estado || '').toLowerCase();
  if (est === 'en_mantenimiento' || est === 'mantenimiento') {
    status = 'mantenimiento';
  } else if (est === 'prestado') {
    status = 'prestado';
  } else if (est === 'inactivo' || est === 'retirado') {
    status = 'retirado';
  } else {
    status = 'disponible';
  }

  const condRaw = (i.condicion || '').toLowerCase().trim();
  let condition: InstrumentCondition = status === 'mantenimiento' ? 'dañado' : 'bueno';
  if (condRaw === 'excelente' || condRaw === 'bueno' || condRaw === 'regular') {
    condition = condRaw;
  } else if (condRaw === 'dañado' || condRaw === 'daniado') {
    condition = 'dañado';
  }

  const imageUrl = resolveInstrumentImageUrl(undefined, i.imagen_key);

  return {
    id: i.id,
    name: i.nombre,
    category,
    brand: i.marca || undefined,
    model: i.modelo || undefined,
    description: i.descripcion || '',
    condition,
    status,
    ownerId: i.propietario_id,
    ownerName,
    imageUrl,
    imageKey: i.imagen_key,
    location: i.ubicacion || undefined,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}

function toFrontendLoan(
  p: BackendPrestamo,
  instrument?: Instrument,
  borrower?: User,
  owner?: User,
): Loan {
  let status: LoanStatus = 'activo';
  const est = (p.estado || '').toLowerCase();
  if (est === 'solicitado') {
    status = 'solicitado';
  } else if (est === 'vencido') {
    status = 'vencido';
  } else if (est === 'devuelto') {
    status = 'devuelto';
  } else if (est === 'dañado' || est === 'daniado') {
    status = 'dañado';
  } else if (est === 'cancelado') {
    status = 'cancelado';
  } else {
    status = 'activo';
  }

  return {
    id: p.id,
    instrumentId: p.instrumento_id,
    instrumentName: instrument?.name || `Instrumento #${p.instrumento_id.slice(-6)}`,
    instrumentImageUrl: instrument?.imageUrl,
    borrowerId: p.solicitante_id,
    borrowerName: borrower?.name || p.solicitante_id,
    ownerId: p.propietario_id,
    ownerName: owner?.name || p.propietario_id,
    startDate: p.fecha_inicio.slice(0, 10),
    dueDate: p.fecha_vencimiento.slice(0, 10),
    returnedAt: p.fecha_devolucion,
    status,
    damageNotes: status === 'dañado' ? p.observaciones || undefined : undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// Cache en memoria para enriquecer entidades relacionadas (siempre desde backend real)
let usersCache: User[] = [];
let usersCacheLoaded = false;
let instrumentsCache: Instrument[] = [];
const knownAlertIds = new Set<string>();
let alertsBaselineInitialized = false;

async function ensureUsersCache(force = false): Promise<User[]> {
  if (usersCacheLoaded && !force) {
    return usersCache;
  }
  try {
    const raw = await httpDataRequest<BackendUsuario[]>('/usuarios');
    usersCache = raw.map(toFrontendUser);
    usersCacheLoaded = true;
    return usersCache;
  } catch {
    return usersCache;
  }
}

async function ensureInstrumentsCache(): Promise<Instrument[]> {
  try {
    const raw = await httpDataRequest<BackendInstrumento[]>('/instrumentos');
    const users = await ensureUsersCache();
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    instrumentsCache = raw.map((i) => toFrontendInstrument(i, userMap.get(i.propietario_id)));
    return instrumentsCache;
  } catch {
    return instrumentsCache;
  }
}

async function uploadFileToInstrumentS3(
  instrumentId: string,
  file: File,
): Promise<{ key: string; publicUrl: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'imagen.jpg';
  const uniqueFilename = `${Date.now()}-${safeName}`;

  const presigned = await httpDataRequest<BackendPresignedUpload>(
    `/instrumentos/${encodeURIComponent(instrumentId)}/imagen-url`,
    {
      method: 'POST',
      body: {
        nombre_archivo: uniqueFilename,
        content_type: file.type || 'image/jpeg',
      },
    },
  );

  const putResponse = await fetch(presigned.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!putResponse.ok) {
    throw new ApiError({
      status: putResponse.status,
      message: 'El instrumento se guardó, pero falló la subida de la fotografía a S3.',
    });
  }

  const publicUrl =
    presigned.public_url || resolveInstrumentImageUrl(undefined, presigned.key);
  return {
    key: presigned.key,
    publicUrl,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInstrumentMaintenance(instrumentId: string): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const inst = await httpDataRequest<BackendInstrumento>(
        `/instrumentos/${encodeURIComponent(instrumentId)}`,
      );
      if (inst.estado === 'en_mantenimiento') {
        return;
      }
    } catch {
      // Ignorar errores transitorios mientras SQS procesa
    }
    await delay(400);
  }
}

export const apiAdapter: MusicShareService = {
  mode: 'api',

  // --- Autenticación y Usuarios ---

  async login(input: LoginInput): Promise<AuthSession> {
    const users = await this.listUsers();
    const emailToMatch = input.email.trim().toLowerCase();
    const matchedUser = users.find((u) => u.email.toLowerCase() === emailToMatch);

    if (!matchedUser) {
      throw new ApiError({
        status: 401,
        message: `No se encontró ningún usuario registrado con el correo "${input.email}". Por favor verifica tu correo o regístrate.`,
      });
    }

    const token = `simulated-token-${matchedUser.id}`;
    setActiveUserSession(matchedUser, token);
    return {
      user: matchedUser,
      token,
    };
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'MusicShare';

    const user = await this.createUser({
      firstName,
      lastName,
      email: input.email,
      phone: input.phone,
      role: input.role,
      status: 'activo',
    });

    const token = `simulated-token-${user.id}`;
    setActiveUserSession(user, token);

    return {
      user,
      token,
    };
  },

  async logout(): Promise<void> {
    setActiveUserSession(null, null);
  },

  async listUsers(): Promise<User[]> {
    const raw = await httpDataRequest<BackendUsuario[]>('/usuarios');
    usersCache = raw.map(toFrontendUser);
    usersCacheLoaded = true;
    return usersCache;
  },

  async getUser(id: string): Promise<User> {
    const raw = await httpDataRequest<BackendUsuario>(`/usuarios/${encodeURIComponent(id)}`);
    return toFrontendUser(raw);
  },

  async createUser(input: CreateUserInput): Promise<User> {
    const payload = {
      nombre: input.firstName.trim(),
      apellido: input.lastName.trim(),
      correo: input.email.trim().toLowerCase(),
      telefono: input.phone?.trim() || undefined,
      rol: toBackendRole(input.role),
      estado: input.status ?? 'activo',
    };

    const createdBackend = await httpDataRequest<BackendUsuario>('/usuarios', {
      method: 'POST',
      body: payload,
    });

    const user = toFrontendUser(createdBackend);
    usersCache = [...usersCache.filter((u) => u.id !== user.id), user];
    usersCacheLoaded = true;
    return user;
  },

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const payload: Record<string, unknown> = {};
    if (input.firstName !== undefined) payload.nombre = input.firstName.trim();
    if (input.lastName !== undefined) payload.apellido = input.lastName.trim();
    if (input.email !== undefined) payload.correo = input.email.trim().toLowerCase();
    if (input.phone !== undefined) payload.telefono = input.phone.trim();
    if (input.role !== undefined) payload.rol = toBackendRole(input.role);
    if (input.status !== undefined) payload.estado = input.status;

    const updatedBackend = await httpDataRequest<BackendUsuario>(
      `/usuarios/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: payload,
      },
    );

    const updated = toFrontendUser(updatedBackend);
    usersCache = usersCache.map((u) => (u.id === updated.id ? updated : u));
    const active = getActiveUserSession();
    if (active && active.id === updated.id) {
      setActiveUserSession(updated);
    }
    return updated;
  },

  async deleteUser(id: string): Promise<void> {
    await httpRequest<void>(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    usersCache = usersCache.filter((u) => u.id !== id);
  },

  // --- Instrumentos ---

  async listInstruments(filters?: InstrumentFilters): Promise<Instrument[]> {
    const queryParams: Record<string, string | undefined> = {};

    if (filters?.ownerId) {
      queryParams.propietario_id = filters.ownerId;
    }
    if (filters?.category && filters.category !== 'all') {
      queryParams.categoria = filters.category;
    }
    if (filters?.status && filters.status !== 'all') {
      queryParams.estado = toBackendInstrumentStatus(filters.status);
    }

    const raw = await httpDataRequest<BackendInstrumento[]>('/instrumentos', {
      query: queryParams,
    });

    const users = await ensureUsersCache();
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    let items = raw.map((i) => toFrontendInstrument(i, userMap.get(i.propietario_id)));

    if (filters?.q && filters.q.trim().length > 0) {
      const q = filters.q.toLowerCase().trim();
      items = items.filter(
        (inst) =>
          inst.name.toLowerCase().includes(q) ||
          inst.brand?.toLowerCase().includes(q) ||
          inst.model?.toLowerCase().includes(q) ||
          inst.description.toLowerCase().includes(q) ||
          inst.category.toLowerCase().includes(q) ||
          inst.ownerName?.toLowerCase().includes(q) ||
          inst.location?.toLowerCase().includes(q),
      );
    }

    instrumentsCache = items;
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getInstrument(id: string): Promise<Instrument> {
    const raw = await httpDataRequest<BackendInstrumento>(`/instrumentos/${encodeURIComponent(id)}`);
    const users = await ensureUsersCache();
    const user = users.find((u) => u.id === raw.propietario_id);
    return toFrontendInstrument(raw, user?.name);
  },

  async createInstrument(input: CreateInstrumentInput): Promise<Instrument> {
    const activeUser = getActiveUserSession();
    if (!activeUser) {
      throw new ApiError({
        status: 401,
        message: 'Debes iniciar sesión para publicar un instrumento.',
      });
    }

    const brandValue = input.brand?.trim() || 'Estándar';
    const modelValue = input.model?.trim() || brandValue;

    const payload: Record<string, unknown> = {
      nombre: input.name.trim(),
      marca: brandValue,
      modelo: modelValue,
      categoria: input.category,
      descripcion: input.description.trim(),
      ubicacion: input.location?.trim() || undefined,
      condicion: input.condition,
      estado: 'disponible',
      propietario_id: activeUser.id,
      imagen_key: input.imageKey || undefined,
    };

    const createdBackend = await httpDataRequest<BackendInstrumento>('/instrumentos', {
      method: 'POST',
      body: payload,
    });

    let finalBackend = createdBackend;
    if (input.imageFile) {
      const uploaded = await uploadFileToInstrumentS3(createdBackend.id, input.imageFile);
      finalBackend = { ...createdBackend, imagen_key: uploaded.key };
    }

    const created = toFrontendInstrument(finalBackend, activeUser.name);
    void ensureInstrumentsCache();
    return created;
  },

  async updateInstrument(id: string, input: UpdateInstrumentInput): Promise<Instrument> {
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.nombre = input.name.trim();
    if (input.brand !== undefined) {
      payload.marca = input.brand.trim() || 'Estándar';
    }
    if (input.model !== undefined) {
      payload.modelo = input.model.trim() || input.brand?.trim() || 'Estándar';
    } else if (input.brand !== undefined) {
      payload.modelo = input.brand.trim() || 'Estándar';
    }
    if (input.category !== undefined) payload.categoria = input.category;
    if (input.description !== undefined) payload.descripcion = input.description.trim();
    if (input.location !== undefined) payload.ubicacion = input.location.trim();
    if (input.condition !== undefined) payload.condicion = input.condition;
    if (input.status !== undefined) {
      payload.estado = toBackendInstrumentStatus(input.status);
    }
    if (input.imageKey !== undefined && !input.imageFile) {
      payload.imagen_key = input.imageKey;
    }

    let updatedBackend = await httpDataRequest<BackendInstrumento>(
      `/instrumentos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: payload,
      },
    );

    if (input.imageFile) {
      const uploaded = await uploadFileToInstrumentS3(id, input.imageFile);
      updatedBackend = { ...updatedBackend, imagen_key: uploaded.key };
    }

    const users = await ensureUsersCache();
    const owner = users.find((u) => u.id === updatedBackend.propietario_id);
    const updated = toFrontendInstrument(updatedBackend, owner?.name);
    void ensureInstrumentsCache();
    return updated;
  },

  async deleteInstrument(id: string): Promise<void> {
    await httpRequest<void>(`/instrumentos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    void ensureInstrumentsCache();
  },

  async uploadInstrumentImage(file: File): Promise<UploadedImageResult> {
    let imageUrl: string;
    try {
      imageUrl = await compressImageToDataUrl(file, 900, 0.82);
    } catch {
      imageUrl = URL.createObjectURL(file);
    }
    return {
      imageUrl,
      file,
    };
  },

  // --- Préstamos (Lógica de Negocio y Transiciones de Estado del Backend) ---

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    const queryParams: Record<string, string | undefined> = {};

    if (filters?.instrumentId) {
      queryParams.instrumento_id = filters.instrumentId;
    }
    if (filters?.borrowerId) {
      queryParams.solicitante_id = filters.borrowerId;
    }
    if (filters?.ownerId) {
      queryParams.propietario_id = filters.ownerId;
    }
    if (filters?.status && filters.status !== 'all') {
      queryParams.estado = filters.status;
    }

    const raw = await httpDataRequest<BackendPrestamo[]>('/prestamos', {
      query: queryParams,
    });

    const [users, instruments] = await Promise.all([
      ensureUsersCache(),
      ensureInstrumentsCache(),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const instMap = new Map(instruments.map((i) => [i.id, i]));

    return raw
      .map((p) =>
        toFrontendLoan(
          p,
          instMap.get(p.instrumento_id),
          userMap.get(p.solicitante_id),
          userMap.get(p.propietario_id),
        ),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getLoan(id: string): Promise<Loan> {
    const raw = await httpDataRequest<BackendPrestamo>(`/prestamos/${encodeURIComponent(id)}`);
    const [users, instruments] = await Promise.all([
      ensureUsersCache(),
      ensureInstrumentsCache(),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const instMap = new Map(instruments.map((i) => [i.id, i]));

    return toFrontendLoan(
      raw,
      instMap.get(raw.instrumento_id),
      userMap.get(raw.solicitante_id),
      userMap.get(raw.propietario_id),
    );
  },

  async requestLoan(input: CreateLoanInput): Promise<Loan> {
    const activeUser = getActiveUserSession();
    const solicitanteId = input.borrowerId || activeUser?.id;

    if (!solicitanteId) {
      throw new ApiError({
        status: 401,
        message: 'Debes iniciar sesión para solicitar un préstamo.',
      });
    }

    const instrument = await this.getInstrument(input.instrumentId);

    const fechaInicio = input.startDate.includes('T')
      ? input.startDate
      : `${input.startDate}T00:00:00Z`;

    const fechaVencimiento = input.dueDate.includes('T')
      ? input.dueDate
      : `${input.dueDate}T23:59:59Z`;

    const createPayload = {
      instrumento_id: input.instrumentId,
      solicitante_id: solicitanteId,
      propietario_id: instrument.ownerId,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVencimiento,
      observaciones: 'Préstamo solicitado desde la plataforma web MusicShare',
    };

    // 1. Crear el préstamo (estado inicial "solicitado")
    const createdRaw = await httpDataRequest<BackendPrestamo>('/prestamos', {
      method: 'POST',
      body: createPayload,
    });

    // 2. Activar el préstamo ("solicitado" -> "activo", instrumento pasa a "prestado")
    let activeLoanRaw: BackendPrestamo;
    try {
      activeLoanRaw = await httpDataRequest<BackendPrestamo>(
        `/prestamos/${encodeURIComponent(createdRaw.id)}`,
        {
          method: 'PUT',
          body: { estado: 'activo' },
        },
      );
    } catch (err) {
      // Revertir préstamo en estado solicitado si falló la activación
      await httpRequest<void>(`/prestamos/${encodeURIComponent(createdRaw.id)}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      throw err;
    }

    const users = await ensureUsersCache();
    const borrower = users.find((u) => u.id === activeLoanRaw.solicitante_id) ?? activeUser ?? undefined;
    const owner = users.find((u) => u.id === activeLoanRaw.propietario_id);
    void ensureInstrumentsCache();

    return toFrontendLoan(activeLoanRaw, instrument, borrower, owner);
  },

  async approveLoan(id: string): Promise<Loan> {
    const updatedRaw = await httpDataRequest<BackendPrestamo>(
      `/prestamos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: { estado: 'activo' },
      },
    );

    const [users, instruments] = await Promise.all([
      ensureUsersCache(),
      ensureInstrumentsCache(),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const instMap = new Map(instruments.map((i) => [i.id, i]));

    return toFrontendLoan(
      updatedRaw,
      instMap.get(updatedRaw.instrumento_id),
      userMap.get(updatedRaw.solicitante_id),
      userMap.get(updatedRaw.propietario_id),
    );
  },

  async cancelLoan(id: string): Promise<Loan> {
    const updatedRaw = await httpDataRequest<BackendPrestamo>(
      `/prestamos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: { estado: 'cancelado' },
      },
    );

    const [users, instruments] = await Promise.all([
      ensureUsersCache(),
      ensureInstrumentsCache(),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const instMap = new Map(instruments.map((i) => [i.id, i]));

    return toFrontendLoan(
      updatedRaw,
      instMap.get(updatedRaw.instrumento_id),
      userMap.get(updatedRaw.solicitante_id),
      userMap.get(updatedRaw.propietario_id),
    );
  },

  async returnLoan(id: string, input: ReturnLoanInput): Promise<Loan> {
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> =
      input.status === 'devuelto'
        ? {
            estado: 'devuelto',
            fecha_devolucion: nowIso,
            observaciones: 'Devuelto en buen estado',
          }
        : {
            estado: 'dañado',
            fecha_devolucion: nowIso,
            observaciones: input.damageNotes?.trim() || 'Instrumento devuelto con daños reportados',
          };

    const updatedRaw = await httpDataRequest<BackendPrestamo>(
      `/prestamos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: updatePayload,
      },
    );

    if (input.status === 'dañado') {
      await waitForInstrumentMaintenance(updatedRaw.instrumento_id);
    }

    const [users, instruments] = await Promise.all([
      ensureUsersCache(),
      ensureInstrumentsCache(),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const instMap = new Map(instruments.map((i) => [i.id, i]));

    return toFrontendLoan(
      updatedRaw,
      instMap.get(updatedRaw.instrumento_id),
      userMap.get(updatedRaw.solicitante_id),
      userMap.get(updatedRaw.propietario_id),
    );
  },

  async deleteLoan(id: string): Promise<void> {
    await httpRequest<void>(`/prestamos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    void ensureInstrumentsCache();
  },

  // --- Alertas y Notificaciones (Sincronizadas con el estado real del Backend) ---

  async listAlerts(filters?: AlertFilters): Promise<AlertNotification[]> {
    const [rawLoans, rawInstruments, users] = await Promise.all([
      httpDataRequest<BackendPrestamo[]>('/prestamos'),
      httpDataRequest<BackendInstrumento[]>('/instrumentos'),
      ensureUsersCache(),
    ]);

    const readIds = getReadAlertIds();
    const alerts: AlertNotification[] = [];
    const now = new Date();

    const instMap = new Map(rawInstruments.map((i) => [i.id, i]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Buscar el préstamo dañado más reciente por instrumento para enriquecer las alertas
    const latestDamagedLoanByInst = new Map<string, BackendPrestamo>();
    const sortedLoansDesc = [...rawLoans].sort((a, b) =>
      (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at),
    );
    for (const loan of sortedLoansDesc) {
      const est = (loan.estado || '').toLowerCase();
      if ((est === 'dañado' || est === 'daniado') && !latestDamagedLoanByInst.has(loan.instrumento_id)) {
        latestDamagedLoanByInst.set(loan.instrumento_id, loan);
      }
    }

    // 1. Alertas por Mantenimiento y Daños (flujo SQS -> Lambda Mantenimiento -> SNS)
    for (const inst of rawInstruments) {
      if (inst.estado === 'en_mantenimiento') {
        const alertId = `alert-maint-${inst.id}`;
        const damagedLoan = latestDamagedLoanByInst.get(inst.id);
        const borrower = damagedLoan ? userMap.get(damagedLoan.solicitante_id) : undefined;
        const damageDetail = damagedLoan?.observaciones
          ? ` Reporte: "${damagedLoan.observaciones}"${borrower ? ` (por ${borrower.name})` : ''}.`
          : '';

        alerts.push({
          id: alertId,
          type: 'damage_maintenance',
          severity: 'critical',
          source: 'sqs',
          channel: 'sns_email',
          loanId: damagedLoan?.id,
          instrumentId: inst.id,
          recipientUserId: inst.propietario_id,
          title: `Revisión requerida: ${inst.nombre}`,
          message: `El instrumento "${inst.nombre}" (${inst.marca}) pasó a estado En mantenimiento tras reportarse un daño.${damageDetail}`,
          read: readIds.has(alertId),
          createdAt: inst.updated_at || now.toISOString(),
        });
      }
    }

    // 2. Alertas por Vencimientos de Préstamos (EventBridge -> Lambda Vencimientos -> SNS)
    for (const loan of rawLoans) {
      const est = (loan.estado || '').toLowerCase();
      if (est !== 'activo' && est !== 'vencido') {
        continue;
      }

      const inst = instMap.get(loan.instrumento_id);
      const owner = userMap.get(loan.propietario_id);
      const instName = inst?.nombre || `Instrumento #${loan.instrumento_id.slice(-4)}`;
      const dueDateStr = loan.fecha_vencimiento.slice(0, 10);
      const dueStatus = getDueDateStatus(dueDateStr, now);

      if (est === 'vencido' || dueStatus.isOverdue) {
        const alertId = `alert-overdue-${loan.id}`;
        alerts.push({
          id: alertId,
          type: 'overdue',
          severity: 'critical',
          source: 'eventbridge',
          channel: 'sns_email',
          loanId: loan.id,
          instrumentId: loan.instrumento_id,
          recipientUserId: loan.solicitante_id,
          title: `Préstamo vencido: ${instName}`,
          message: `${dueStatus.label}. Coordina la entrega con ${owner?.name ?? 'el propietario'} lo antes posible.`,
          read: readIds.has(alertId),
          createdAt: loan.updated_at || now.toISOString(),
        });
      } else if (dueStatus.isDueSoon) {
        const alertId = `alert-due-soon-${loan.id}`;
        alerts.push({
          id: alertId,
          type: 'due_soon',
          severity: 'warning',
          source: 'eventbridge',
          channel: 'sns_email',
          loanId: loan.id,
          instrumentId: loan.instrumento_id,
          recipientUserId: loan.solicitante_id,
          title: `Devolución próxima: ${instName}`,
          message: `${dueStatus.label} (fecha límite: ${dueDateStr}). Recuerda devolver el instrumento en buen estado.`,
          read: readIds.has(alertId),
          createdAt: loan.created_at || now.toISOString(),
        });
      }
    }

    if (!alertsBaselineInitialized) {
      for (const a of alerts) {
        knownAlertIds.add(a.id);
      }
      alertsBaselineInitialized = true;
    }

    let filtered = alerts;
    if (filters?.userId) {
      filtered = filtered.filter((a) => a.recipientUserId === filters.userId);
    }
    if (filters?.type && filters.type !== 'all') {
      filtered = filtered.filter((a) => a.type === filters.type);
    }
    if (filters?.unreadOnly) {
      filtered = filtered.filter((a) => !a.read);
    }

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async markAlertRead(id: string): Promise<AlertNotification> {
    saveReadAlertId(id);
    const allAlerts = await this.listAlerts();
    const alert = allAlerts.find((a) => a.id === id);
    if (alert) {
      return { ...alert, read: true };
    }
    return {
      id,
      type: 'due_soon',
      severity: 'info',
      source: 'eventbridge',
      channel: 'in_app',
      recipientUserId: '',
      title: 'Alerta leída',
      message: '',
      read: true,
      createdAt: new Date().toISOString(),
    };
  },

  async markAllAlertsRead(userId?: string): Promise<void> {
    const alerts = await this.listAlerts({ userId });
    saveAllReadAlertIds(alerts.map((a) => a.id));
  },

  async runDueDateCheck(): Promise<AlertNotification[]> {
    const previous = new Set(knownAlertIds);
    const current = await this.listAlerts();
    const newlyDiscovered = current.filter(
      (a) => (a.type === 'due_soon' || a.type === 'overdue') && !previous.has(a.id),
    );
    for (const a of current) {
      knownAlertIds.add(a.id);
    }
    return newlyDiscovered;
  },
};
