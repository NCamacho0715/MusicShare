import type {
  AlertNotification,
  Instrument,
  Loan,
  User,
} from '../types/models';
import { addDaysIsoDate } from '../utils/formatters';

export const DEMO_USER_PASSWORD = 'music123';

export interface MockDatabaseState {
  users: User[];
  credentials: Record<string, string>;
  instruments: Instrument[];
  loans: Loan[];
  alerts: AlertNotification[];
}

export function createSeedState(now: Date = new Date()): MockDatabaseState {
  const nowIso = now.toISOString();

  const users: User[] = [
    {
      id: 'usr-musician-1',
      name: 'Mateo Ríos',
      email: 'mateo.rios@musicshare.org',
      role: 'musician',
      phone: '+57 310 555 0142',
      createdAt: addDaysIsoDate(-60, now) + 'T10:00:00.000Z',
    },
    {
      id: 'usr-owner-1',
      name: 'Clara Mendoza',
      email: 'clara.mendoza@musicshare.org',
      role: 'owner',
      phone: '+57 311 555 0198',
      createdAt: addDaysIsoDate(-90, now) + 'T09:00:00.000Z',
    },
    {
      id: 'usr-admin-1',
      name: 'Sofía Delgado',
      email: 'admin@musicshare.org',
      role: 'admin',
      phone: '+57 315 555 0100',
      createdAt: addDaysIsoDate(-120, now) + 'T08:30:00.000Z',
    },
  ];

  const instruments: Instrument[] = [
    {
      id: 'inst-1',
      name: 'Guitarra Acústica Dreadnought',
      category: 'cuerdas',
      brand: 'Yamaha FG800',
      description:
        'Tapa maciza de abeto con acción cómoda y entonación estable. Incluye funda acolchada y cejilla para ensayos o presentaciones.',
      condition: 'excelente',
      status: 'disponible',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      imageUrl: './images/guitarra-acustica.jpg',
      location: 'Sala Comunitaria Norte',
      createdAt: addDaysIsoDate(-35, now) + 'T14:00:00.000Z',
      updatedAt: nowIso,
    },
    {
      id: 'inst-2',
      name: 'Saxofón Alto Eb',
      category: 'viento',
      brand: 'Jupiter JAS500',
      description:
        'Llaves ajustadas recientemente y zapatillas en buen estado. Se entrega con boquilla estándar, arnés y estuche rígido.',
      condition: 'bueno',
      status: 'prestado',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      imageUrl: './images/saxofon-alto.jpg',
      location: 'Conservatorio Local',
      createdAt: addDaysIsoDate(-42, now) + 'T11:20:00.000Z',
      updatedAt: nowIso,
    },
    {
      id: 'inst-3',
      name: 'Violín Clásico 4/4',
      category: 'cuerdas',
      brand: 'Stentor Student II',
      description:
        'Instrumento completo con arco de crin, resina y barbada ergonómica. Ideal para repertorio de cámara y práctica diaria.',
      condition: 'bueno',
      status: 'prestado',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      imageUrl: './images/violin-clasico.jpg',
      location: 'Casa de la Cultura',
      createdAt: addDaysIsoDate(-50, now) + 'T16:15:00.000Z',
      updatedAt: nowIso,
    },
    {
      id: 'inst-4',
      name: 'Cajón Peruano de Abedul',
      category: 'percusion',
      brand: 'Meinl Headliner',
      description:
        'Cuerpo resonante en abedul con bordona interna ajustable. Graves definidos y agudos secos para formatos acústicos.',
      condition: 'excelente',
      status: 'disponible',
      ownerId: 'usr-admin-1',
      ownerName: 'Sofía Delgado',
      imageUrl: './images/cajon-peruano.jpg',
      location: 'Centro Juvenil Sur',
      createdAt: addDaysIsoDate(-28, now) + 'T13:00:00.000Z',
      updatedAt: nowIso,
    },
    {
      id: 'inst-5',
      name: 'Piano de Escenario 88 Teclas',
      category: 'teclados',
      brand: 'Roland FP-30X',
      description:
        'Teclado contrapesado PHA-4 con pedal de sustain incluido. Listo para estudio, acompañamiento coral o presentaciones.',
      condition: 'excelente',
      status: 'disponible',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      imageUrl: './images/piano-escenario.jpg',
      location: 'Sala Comunitaria Norte',
      createdAt: addDaysIsoDate(-18, now) + 'T10:45:00.000Z',
      updatedAt: nowIso,
    },
    {
      id: 'inst-6',
      name: 'Amplificador a Válvulas 15W',
      category: 'amplificacion',
      brand: 'Vox AC15C1',
      description:
        'Combo de 15W con parlante Celestion de 12". Actualmente en revisión técnica por ruido intermitente en el potenciómetro de ganancia.',
      condition: 'dañado',
      status: 'mantenimiento',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      imageUrl: './images/amplificador-valvulas.jpg',
      location: 'Taller de Luthier y Electrónica',
      createdAt: addDaysIsoDate(-75, now) + 'T15:30:00.000Z',
      updatedAt: nowIso,
    },
  ];

  const loans: Loan[] = [
    // Préstamo activo próximo a vencer (en 2 días)
    {
      id: 'loan-1',
      instrumentId: 'inst-2',
      instrumentName: 'Saxofón Alto Eb',
      instrumentImageUrl: './images/saxofon-alto.jpg',
      borrowerId: 'usr-musician-1',
      borrowerName: 'Mateo Ríos',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      startDate: addDaysIsoDate(-10, now),
      dueDate: addDaysIsoDate(2, now),
      status: 'activo',
      createdAt: addDaysIsoDate(-10, now) + 'T10:00:00.000Z',
      updatedAt: nowIso,
    },
    // Préstamo activo vencido (hace 2 días)
    {
      id: 'loan-2',
      instrumentId: 'inst-3',
      instrumentName: 'Violín Clásico 4/4',
      instrumentImageUrl: './images/violin-clasico.jpg',
      borrowerId: 'usr-musician-1',
      borrowerName: 'Mateo Ríos',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      startDate: addDaysIsoDate(-16, now),
      dueDate: addDaysIsoDate(-2, now),
      status: 'activo',
      createdAt: addDaysIsoDate(-16, now) + 'T09:30:00.000Z',
      updatedAt: nowIso,
    },
    // Préstamo histórico devuelto en buen estado
    {
      id: 'loan-3',
      instrumentId: 'inst-1',
      instrumentName: 'Guitarra Acústica Dreadnought',
      instrumentImageUrl: './images/guitarra-acustica.jpg',
      borrowerId: 'usr-musician-1',
      borrowerName: 'Mateo Ríos',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      startDate: addDaysIsoDate(-28, now),
      dueDate: addDaysIsoDate(-21, now),
      returnedAt: addDaysIsoDate(-21, now) + 'T17:15:00.000Z',
      status: 'devuelto',
      createdAt: addDaysIsoDate(-28, now) + 'T12:00:00.000Z',
      updatedAt: addDaysIsoDate(-21, now) + 'T17:15:00.000Z',
    },
    // Préstamo histórico devuelto con daño -> disparó SQS + SNS
    {
      id: 'loan-4',
      instrumentId: 'inst-6',
      instrumentName: 'Amplificador a Válvulas 15W',
      instrumentImageUrl: './images/amplificador-valvulas.jpg',
      borrowerId: 'usr-musician-1',
      borrowerName: 'Mateo Ríos',
      ownerId: 'usr-owner-1',
      ownerName: 'Clara Mendoza',
      startDate: addDaysIsoDate(-20, now),
      dueDate: addDaysIsoDate(-12, now),
      returnedAt: addDaysIsoDate(-12, now) + 'T18:40:00.000Z',
      status: 'dañado',
      damageNotes:
        'Chasquido fuerte al girar la perilla de volumen del canal Top Boost; posible válvula microfónica.',
      createdAt: addDaysIsoDate(-20, now) + 'T11:00:00.000Z',
      updatedAt: addDaysIsoDate(-12, now) + 'T18:40:00.000Z',
    },
  ];

  const alerts: AlertNotification[] = [
    {
      id: 'alert-overdue-loan-2',
      type: 'overdue',
      severity: 'critical',
      source: 'eventbridge',
      channel: 'sns_email',
      loanId: 'loan-2',
      instrumentId: 'inst-3',
      recipientUserId: 'usr-musician-1',
      title: 'Préstamo vencido: Violín Clásico 4/4',
      message:
        'La fecha de devolución venció hace 2 días. Coordina la entrega con Clara Mendoza lo antes posible.',
      read: false,
      createdAt: addDaysIsoDate(-1, now) + 'T08:00:00.000Z',
    },
    {
      id: 'alert-due-soon-loan-1',
      type: 'due_soon',
      severity: 'warning',
      source: 'eventbridge',
      channel: 'sns_email',
      loanId: 'loan-1',
      instrumentId: 'inst-2',
      recipientUserId: 'usr-musician-1',
      title: 'Devolución próxima: Saxofón Alto Eb',
      message:
        'Tu préstamo vence en 2 días. Recuerda entregar boquilla y estuche completos.',
      read: false,
      createdAt: nowIso,
    },
    {
      id: 'alert-damage-loan-4',
      type: 'damage_maintenance',
      severity: 'critical',
      source: 'sqs',
      channel: 'sns_email',
      loanId: 'loan-4',
      instrumentId: 'inst-6',
      recipientUserId: 'usr-owner-1',
      title: 'Revisión requerida: Amplificador a Válvulas 15W',
      message:
        'Devuelto con reporte de daño: "Chasquido fuerte al girar la perilla de volumen del canal Top Boost; posible válvula microfónica." El instrumento pasó a estado En mantenimiento.',
      read: false,
      createdAt: addDaysIsoDate(-12, now) + 'T18:41:00.000Z',
    },
  ];

  const credentials: Record<string, string> = {};
  for (const user of users) {
    credentials[user.email.toLowerCase()] = DEMO_USER_PASSWORD;
  }

  return { users, credentials, instruments, loans, alerts };
}
