import { resolveInstrumentImageUrl } from '../config/env';
import { ApiError } from '../types/api';
import type { MusicShareService } from '../types/api';
import type {
  AlertFilters,
  AlertNotification,
  AuthSession,
  CreateInstrumentInput,
  CreateLoanInput,
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
  UploadedImageResult,
  UploadUrlResponse,
  User,
  UserRole,
} from '../types/models';
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

function toFrontendUser(u: BackendUsuario): User {
  let role: UserRole = 'musician';
  const r = (u.rol || '').toLowerCase();
  if (r === 'propietario' || r === 'owner') {
    role = 'owner';
  } else if (r === 'administrador' || r === 'admin') {
    role = 'admin';
  } else {
    role = 'musician';
  }

  const fullName = u.apellido
    ? `${u.nombre} ${u.apellido}`.trim()
    : u.nombre;

  return {
    id: u.id,
    name: fullName,
    email: u.correo,
    role,
    phone: u.telefono,
    createdAt: u.created_at,
  };
}

function toFrontendInstrument(i: BackendInstrumento, ownerName?: string): Instrument {
  // Categorías normalizadas a minúsculas
  const catRaw = (i.categoria || 'otros').toLowerCase().trim();
  const validCategories: InstrumentCategory[] = [
    'cuerdas',
    'viento',
    'percusion',
    'teclados',
    'amplificacion',
    'otros',
  ];
  const category: InstrumentCategory = validCategories.includes(catRaw as InstrumentCategory)
    ? (catRaw as InstrumentCategory)
    : 'otros';

  // Estado del backend a status del frontend
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

  const condition: InstrumentCondition =
    est === 'en_mantenimiento' ? 'dañado' : 'bueno';

  const imageUrl = resolveInstrumentImageUrl(undefined, i.imagen_key);

  return {
    id: i.id,
    name: i.nombre,
    category,
    brand: i.marca,
    description: i.descripcion || '',
    condition,
    status,
    ownerId: i.propietario_id,
    ownerName,
    imageUrl,
    imageKey: i.imagen_key,
    location: 'Bogotá, Colombia',
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
  if (est === 'devuelto') {
    status = 'devuelto';
  } else if (est === 'dañado' || est === 'daniado') {
    status = 'dañado';
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
    damageNotes: p.observaciones || undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// Cache en memoria para enriquecer entidades relacionadas
let usersCache: User[] = [
  {
    id: 'usr-musico-001',
    name: 'Ana Gómez',
    email: 'ana.gomez@musicshare.org',
    role: 'musician',
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'usr-propietario-001',
    name: 'Academia Filarmónica Bogotá',
    email: 'contacto@filarmonicabogota.com',
    role: 'owner',
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'usr-admin-001',
    name: 'Sebastián Administrador',
    email: 'admin@musicshare.local',
    role: 'admin',
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'usr-estudiante-001',
    name: 'Carlos Pérez',
    email: 'carlos.perez@musica.edu.co',
    role: 'musician',
    createdAt: '2026-11-20T10:00:00Z',
  },
];

const FALLBACK_INSTRUMENTS: Instrument[] = [
  {
    id: 'inst-guitarra-001',
    name: 'Guitarra Clásica Yamaha C40',
    category: 'cuerdas',
    brand: 'Yamaha C40',
    description: 'Guitarra acústica de estudio, excelente estado y cuerdas de nylon.',
    condition: 'excelente',
    status: 'disponible',
    ownerId: 'usr-propietario-001',
    ownerName: 'Academia Filarmónica Bogotá',
    imageUrl: './images/guitarra-acustica.jpg',
    location: 'Bogotá, Colombia',
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'inst-teclado-001',
    name: 'Teclado Sensitivo Roland GO:KEYS',
    category: 'teclados',
    brand: 'Roland GO:KEYS 61',
    description: 'Teclado de 61 teclas con conexión Bluetooth y sonidos profesionales.',
    condition: 'excelente',
    status: 'disponible',
    ownerId: 'usr-propietario-001',
    ownerName: 'Academia Filarmónica Bogotá',
    imageUrl: './images/teclado-sensitivo.jpg',
    location: 'Bogotá, Colombia',
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'inst-violin-001',
    name: 'Violín Cremona SV-175 4/4',
    category: 'cuerdas',
    brand: 'Cremona SV-175',
    description: 'Violín profesional con arco de pernambuco y estuche rígido.',
    condition: 'bueno',
    status: 'disponible',
    ownerId: 'usr-musico-001',
    ownerName: 'Ana Gómez',
    imageUrl: './images/violin-estudio.jpg',
    location: 'Bogotá, Colombia',
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
];

let instrumentsCache: Instrument[] = FALLBACK_INSTRUMENTS;

async function ensureUsersCache(): Promise<User[]> {
  try {
    const raw = await httpDataRequest<BackendUsuario[]>('/usuarios');
    usersCache = raw.map(toFrontendUser);
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

export const apiAdapter: MusicShareService = {
  mode: 'api',

  // --- Autenticación y Usuarios ---

  async login(input: LoginInput): Promise<AuthSession> {
    const users = await ensureUsersCache();
    const emailToMatch = input.email.trim().toLowerCase();

    let matchedUser = users.find((u) => u.email.toLowerCase() === emailToMatch);

    // Si aún no hay usuarios en caché, recargar de /usuarios
    if (!matchedUser) {
      const refreshed = await this.listUsers();
      matchedUser = refreshed.find((u) => u.email.toLowerCase() === emailToMatch);
    }

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
    const nombre = nameParts[0] || 'Usuario';
    const apellido = nameParts.slice(1).join(' ') || 'MusicShare';

    // Mapear rol de frontend a rol de backend
    let rolBackend = 'musico';
    if (input.role === 'owner') {
      rolBackend = 'propietario';
    } else if (input.role === 'admin') {
      rolBackend = 'administrador';
    }

    const payload = {
      nombre,
      apellido,
      correo: input.email.trim().toLowerCase(),
      telefono: input.phone?.trim() || '+573000000000',
      rol: rolBackend,
      estado: 'activo',
    };

    const createdBackend = await httpDataRequest<BackendUsuario>('/usuarios', {
      method: 'POST',
      body: payload,
    });

    const user = toFrontendUser(createdBackend);
    const token = `simulated-token-${user.id}`;
    setActiveUserSession(user, token);

    // Refrescar caché
    void ensureUsersCache();

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
    return usersCache;
  },

  async getUser(id: string): Promise<User> {
    const raw = await httpDataRequest<BackendUsuario>(`/usuarios/${encodeURIComponent(id)}`);
    return toFrontendUser(raw);
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
      queryParams.estado =
        filters.status === 'mantenimiento' ? 'en_mantenimiento' : filters.status;
    }

    let items: Instrument[] = [];
    try {
      const raw = await httpDataRequest<BackendInstrumento[]>('/instrumentos', {
        query: queryParams,
      });

      const users = await ensureUsersCache();
      const userMap = new Map(users.map((u) => [u.id, u.name]));
      items = raw.map((i) => toFrontendInstrument(i, userMap.get(i.propietario_id)));
    } catch (err) {
      console.warn('Backend /instrumentos no disponible en este momento:', err);
      items = FALLBACK_INSTRUMENTS;
    }

    // Filtro de búsqueda textual en cliente si se especificó 'q'
    if (filters?.q && filters.q.trim().length > 0) {
      const q = filters.q.toLowerCase().trim();
      items = items.filter(
        (inst) =>
          inst.name.toLowerCase().includes(q) ||
          inst.brand?.toLowerCase().includes(q) ||
          inst.description.toLowerCase().includes(q) ||
          inst.category.toLowerCase().includes(q),
      );
    }

    instrumentsCache = items;
    return items;
  },

  async getInstrument(id: string): Promise<Instrument> {
    const raw = await httpDataRequest<BackendInstrumento>(`/instrumentos/${encodeURIComponent(id)}`);
    const users = await ensureUsersCache();
    const user = users.find((u) => u.id === raw.propietario_id);
    return toFrontendInstrument(raw, user?.name);
  },

  async createInstrument(input: CreateInstrumentInput): Promise<Instrument> {
    const activeUser = getActiveUserSession();
    const propietarioId = activeUser?.id || 'usr-propietario-001';

    const payload = {
      nombre: input.name.trim(),
      marca: input.brand?.trim() || 'Estándar',
      modelo: input.brand?.trim() || 'Modelo Base',
      categoria: input.category,
      descripcion: input.description.trim(),
      estado: 'disponible',
      propietario_id: propietarioId,
      imagen_key: input.imageKey || null,
    };

    const createdBackend = await httpDataRequest<BackendInstrumento>('/instrumentos', {
      method: 'POST',
      body: payload,
    });

    const created = toFrontendInstrument(createdBackend, activeUser?.name);
    void ensureInstrumentsCache();
    return created;
  },

  async updateInstrument(id: string, input: UpdateInstrumentInput): Promise<Instrument> {
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.nombre = input.name.trim();
    if (input.brand !== undefined) {
      payload.marca = input.brand.trim();
      payload.modelo = input.brand.trim();
    }
    if (input.category !== undefined) payload.categoria = input.category;
    if (input.description !== undefined) payload.descripcion = input.description.trim();
    if (input.status !== undefined) {
      payload.estado =
        input.status === 'mantenimiento' ? 'en_mantenimiento' : input.status;
    }
    if (input.imageKey !== undefined) payload.imagen_key = input.imageKey;

    const updatedBackend = await httpDataRequest<BackendInstrumento>(
      `/instrumentos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: payload,
      },
    );

    const activeUser = getActiveUserSession();
    const updated = toFrontendInstrument(updatedBackend, activeUser?.name);
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
    // Si la imagen supera o no tiene ID de instrumento aún, generar Data URL comprimida
    try {
      const dataUrl = await compressImageToDataUrl(file, 900, 0.82);
      return {
        imageUrl: dataUrl,
      };
    } catch {
      return {
        imageUrl: URL.createObjectURL(file),
      };
    }
  },

  // --- Préstamos (Lógica de Negocio y Transiciones de Estado del Backend) ---

  async listLoans(filters?: LoanFilters): Promise<Loan[]> {
    const queryParams: Record<string, string | undefined> = {};

    if (filters?.borrowerId) {
      queryParams.solicitante_id = filters.borrowerId;
    }
    if (filters?.ownerId) {
      queryParams.propietario_id = filters.ownerId;
    }
    if (filters?.status && filters.status !== 'all') {
      queryParams.estado = filters.status;
    }

    try {
      const raw = await httpDataRequest<BackendPrestamo[]>('/prestamos', {
        query: queryParams,
      });

      const [users, instruments] = await Promise.all([
        ensureUsersCache(),
        ensureInstrumentsCache(),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const instMap = new Map(instruments.map((i) => [i.id, i]));

      return raw.map((p) =>
        toFrontendLoan(
          p,
          instMap.get(p.instrumento_id),
          userMap.get(p.solicitante_id),
          userMap.get(p.propietario_id),
        ),
      );
    } catch (err) {
      console.warn('Backend /prestamos no disponible en este momento:', err);
      return [];
    }
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

    // Consultar el instrumento para obtener el propietario exacto
    const instrument = await this.getInstrument(input.instrumentId);

    // Formatear fechas a ISO 8601 estricto con UTC 'Z' requerido por el backend
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

    // 1. Crear el préstamo (en backend se crea con estado "solicitado")
    const createdRaw = await httpDataRequest<BackendPrestamo>('/prestamos', {
      method: 'POST',
      body: createPayload,
    });

    // 2. Transicionar a "activo": El servicio del backend marca automáticamente el instrumento como "prestado"
    let activeLoanRaw = createdRaw;
    try {
      activeLoanRaw = await httpDataRequest<BackendPrestamo>(
        `/prestamos/${encodeURIComponent(createdRaw.id)}`,
        {
          method: 'PUT',
          body: {
            estado: 'activo',
          },
        },
      );
    } catch {
      // Si la transición ya se aplicó o falla, usar el creado
    }

    void ensureInstrumentsCache();

    return toFrontendLoan(activeLoanRaw, instrument, activeUser ?? undefined);
  },

  async returnLoan(id: string, input: ReturnLoanInput): Promise<Loan> {
    const nowIso = new Date().toISOString();

    let updatePayload: Record<string, unknown>;

    if (input.status === 'devuelto') {
      // Devolución regular: transiciona a "devuelto" y el backend marca el instrumento "disponible"
      updatePayload = {
        estado: 'devuelto',
        fecha_devolucion: nowIso,
        observaciones: 'Devuelto en buen estado',
      };
    } else {
      // Devolución con daño: transiciona a "dañado", envía evento SQS y dispara Lambda Mantenimiento + SNS
      updatePayload = {
        estado: 'dañado',
        observaciones: input.damageNotes || 'Instrumento devuelto con daños reportados',
      };
    }

    const updatedRaw = await httpDataRequest<BackendPrestamo>(
      `/prestamos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: updatePayload,
      },
    );

    void ensureInstrumentsCache();

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
  },

  // --- Alertas y Notificaciones (Sincronizadas con el estado real del Backend) ---

  async listAlerts(filters?: AlertFilters): Promise<AlertNotification[]> {
    const [rawLoans, rawInstruments] = await Promise.all([
      httpDataRequest<BackendPrestamo[]>('/prestamos').catch(() => [] as BackendPrestamo[]),
      httpDataRequest<BackendInstrumento[]>('/instrumentos').catch(() => [] as BackendInstrumento[]),
    ]);

    const readIds = getReadAlertIds();
    const alerts: AlertNotification[] = [];
    const now = new Date();

    const instMap = new Map(rawInstruments.map((i) => [i.id, i]));

    // 1. Alertas por Mantenimiento y Daños (Originadas por flujo SQS → Lambda Mantenimiento → SNS)
    for (const inst of rawInstruments) {
      if (inst.estado === 'en_mantenimiento') {
        const alertId = `alert-maint-${inst.id}`;
        alerts.push({
          id: alertId,
          type: 'damage_maintenance',
          severity: 'critical',
          source: 'sqs',
          channel: 'sns_email',
          instrumentId: inst.id,
          recipientUserId: inst.propietario_id,
          title: `Instrumento en Mantenimiento: ${inst.nombre}`,
          message: `El instrumento "${inst.nombre}" (${inst.marca}) ha sido reportado con daños y está actualmente en revisión técnica.`,
          read: readIds.has(alertId),
          createdAt: inst.updated_at || now.toISOString(),
        });
      }
    }

    // 2. Alertas por Vencimientos de Préstamos (Originadas por EventBridge → Lambda Vencimientos → SNS)
    for (const loan of rawLoans) {
      if (loan.estado !== 'activo' && loan.estado !== 'vencido') {
        continue;
      }

      const inst = instMap.get(loan.instrumento_id);
      const instName = inst?.nombre || `Instrumento #${loan.instrumento_id.slice(-4)}`;
      const dueDate = new Date(loan.fecha_vencimiento);
      const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

      if (loan.estado === 'vencido' || diffDays < 0) {
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
          title: `Préstamo Vencido: ${instName}`,
          message: `El plazo de devolución para "${instName}" venció el ${loan.fecha_vencimiento.slice(0, 10)}. Por favor realiza la entrega lo antes posible.`,
          read: readIds.has(alertId),
          createdAt: loan.updated_at || now.toISOString(),
        });
      } else if (diffDays <= 2.0) {
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
          title: `Próximo Vencimiento: ${instName}`,
          message: `El préstamo de "${instName}" vencerá en ${Math.max(1, Math.ceil(diffDays))} día(s) (fecha límite: ${loan.fecha_vencimiento.slice(0, 10)}).`,
          read: readIds.has(alertId),
          createdAt: loan.created_at || now.toISOString(),
        });
      }
    }

    // Filtrar según los filtros solicitados por la vista
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

    // Ordenar de más recientes a más antiguas
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
    // Consulta en vivo el estado actual de vencimientos
    return this.listAlerts();
  },
};
