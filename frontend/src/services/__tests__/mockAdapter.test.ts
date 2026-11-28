import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysIsoDate } from '../../utils/formatters';
import {
  buildMockAuthHeaders,
  DEMO_USER_PASSWORD,
  getActiveAuthToken,
  getActiveUserSession,
  mockAdapter,
  setActiveUserSession,
} from '../index';

describe('mockAdapter & httpClient headers', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    setActiveUserSession(null);
    await mockAdapter.resetDemoData?.();
  });

  it('builds mock auth headers from active user session', async () => {
    const users = await mockAdapter.listUsers();
    const musician = users.find((u) => u.role === 'musician')!;
    setActiveUserSession(musician);

    const headers = buildMockAuthHeaders();
    expect(headers['X-User-Id']).toBe(musician.id);
    expect(headers['X-User-Role']).toBe('musico');
    expect(headers['X-User-Name']).toBe(encodeURIComponent(musician.name));
    expect(headers['X-User-Email']).toBe(musician.email);
  });

  it('supports user CRUD and blocks deleting users with active loans', async () => {
    const created = await mockAdapter.createUser({
      firstName: 'Laura',
      lastName: 'Martínez',
      email: 'laura.martinez@musicshare.org',
      role: 'student',
      phone: '+573001112233',
    });
    expect(created.name).toBe('Laura Martínez');
    expect(created.role).toBe('student');

    const updated = await mockAdapter.updateUser(created.id, {
      firstName: 'Laura Sofía',
      role: 'owner',
      status: 'inactivo',
    });
    expect(updated.name).toBe('Laura Sofía Martínez');
    expect(updated.role).toBe('owner');
    expect(updated.status).toBe('inactivo');

    await mockAdapter.deleteUser(created.id);
    await expect(mockAdapter.getUser(created.id)).rejects.toMatchObject({ status: 404 });

    // usr-musician-1 has active loans in seed data
    await expect(mockAdapter.deleteUser('usr-musician-1')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('supports full instrument CRUD and blocks deleting an instrument with active loan', async () => {
    const users = await mockAdapter.listUsers();
    const owner = users.find((u) => u.role === 'owner')!;
    setActiveUserSession(owner);

    const created = await mockAdapter.createInstrument({
      name: 'Flauta Traversa de Estudio',
      category: 'viento',
      brand: 'Yamaha YFL-222',
      description: 'Flauta plateada en excelente estado con estuche rígido.',
      condition: 'excelente',
      location: 'Sala Central',
      imageUrl: './images/saxofon-alto.jpg',
    });

    expect(created.id).toBeTruthy();
    expect(created.status).toBe('disponible');
    expect(created.ownerId).toBe(owner.id);

    const fetched = await mockAdapter.getInstrument(created.id);
    expect(fetched.name).toBe('Flauta Traversa de Estudio');

    const updated = await mockAdapter.updateInstrument(created.id, {
      name: 'Flauta Traversa Profesional',
      condition: 'bueno',
    });
    expect(updated.name).toBe('Flauta Traversa Profesional');
    expect(updated.condition).toBe('bueno');

    await mockAdapter.deleteInstrument(created.id);
    await expect(mockAdapter.getInstrument(created.id)).rejects.toThrow(
      /no encontrado/i,
    );

    // inst-2 has an active loan in seed data
    await expect(mockAdapter.deleteInstrument('inst-2')).rejects.toThrow(
      /préstamo activo/i,
    );
  });

  it('requests a loan (status prestado) and returns it in good condition (status disponible)', async () => {
    const users = await mockAdapter.listUsers();
    const musician = users.find((u) => u.role === 'musician')!;
    setActiveUserSession(musician);

    const loan = await mockAdapter.requestLoan({
      instrumentId: 'inst-1',
      startDate: addDaysIsoDate(0),
      dueDate: addDaysIsoDate(7),
    });

    expect(loan.status).toBe('activo');
    expect(loan.borrowerId).toBe(musician.id);

    const loanedInstrument = await mockAdapter.getInstrument('inst-1');
    expect(loanedInstrument.status).toBe('prestado');

    const returned = await mockAdapter.returnLoan(loan.id, {
      status: 'devuelto',
    });
    expect(returned.status).toBe('devuelto');
    expect(returned.returnedAt).toBeTruthy();

    const availableInstrument = await mockAdapter.getInstrument('inst-1');
    expect(availableInstrument.status).toBe('disponible');
  });

  it('marks instrument as mantenimiento and creates an SQS damage_maintenance alert when returned damaged', async () => {
    const users = await mockAdapter.listUsers();
    const musician = users.find((u) => u.role === 'musician')!;
    setActiveUserSession(musician);

    const loan = await mockAdapter.requestLoan({
      instrumentId: 'inst-5',
      startDate: addDaysIsoDate(0),
      dueDate: addDaysIsoDate(5),
    });

    const returned = await mockAdapter.returnLoan(loan.id, {
      status: 'dañado',
      damageNotes: 'La tecla Do central quedó atascada tras el traslado.',
    });

    expect(returned.status).toBe('dañado');
    expect(returned.damageNotes).toContain('tecla Do central');

    const damagedInstrument = await mockAdapter.getInstrument('inst-5');
    expect(damagedInstrument.status).toBe('mantenimiento');
    expect(damagedInstrument.condition).toBe('dañado');

    const alerts = await mockAdapter.listAlerts({ type: 'damage_maintenance' });
    const generated = alerts.find((a) => a.loanId === loan.id);
    expect(generated).toBeDefined();
    expect(generated?.source).toBe('sqs');
    expect(generated?.severity).toBe('critical');
    expect(generated?.recipientUserId).toBe(damagedInstrument.ownerId);
  });

  it('runs due date checks for due_soon/overdue loans without creating duplicate alerts', async () => {
    const users = await mockAdapter.listUsers();
    const musician = users.find((u) => u.role === 'musician')!;
    setActiveUserSession(musician);

    // Create a loan due tomorrow (due_soon) and another overdue
    const dueSoonLoan = await mockAdapter.requestLoan({
      instrumentId: 'inst-1',
      startDate: addDaysIsoDate(-3),
      dueDate: addDaysIsoDate(1),
    });

    const overdueLoan = await mockAdapter.requestLoan({
      instrumentId: 'inst-4',
      startDate: addDaysIsoDate(-10),
      dueDate: addDaysIsoDate(-1),
    });

    // requestLoan already evaluates due loans; second run should not duplicate
    const secondRunAlerts = await mockAdapter.runDueDateCheck();
    expect(secondRunAlerts).toHaveLength(0);

    const allAlerts = await mockAdapter.listAlerts();
    const dueSoonAlerts = allAlerts.filter(
      (a) => a.loanId === dueSoonLoan.id && a.type === 'due_soon',
    );
    const overdueAlerts = allAlerts.filter(
      (a) => a.loanId === overdueLoan.id && a.type === 'overdue',
    );

    expect(dueSoonAlerts).toHaveLength(1);
    expect(dueSoonAlerts[0].source).toBe('eventbridge');
    expect(overdueAlerts).toHaveLength(1);
    expect(overdueAlerts[0].source).toBe('eventbridge');
  });

  it('logs in with valid credentials, rejects invalid credentials with 401, and clears session on logout', async () => {
    const session = await mockAdapter.login({
      email: 'MATEO.RIOS@musicshare.org',
      password: DEMO_USER_PASSWORD,
    });

    expect(session.user.email).toBe('mateo.rios@musicshare.org');
    expect(session.token).toBeTruthy();
    expect(getActiveUserSession()?.id).toBe(session.user.id);
    expect(getActiveAuthToken()).toBe(session.token);

    const headers = buildMockAuthHeaders();
    expect(headers.Authorization).toBe(`Bearer ${session.token}`);
    expect(headers['X-User-Id']).toBe(session.user.id);

    await expect(
      mockAdapter.login({
        email: 'mateo.rios@musicshare.org',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({ status: 401 });

    await mockAdapter.logout();
    expect(getActiveUserSession()).toBeNull();
    expect(getActiveAuthToken()).toBeNull();
    expect(buildMockAuthHeaders()).toEqual({});
  });

  it('registers a new user, blocks duplicate email with 409, and persists credentials for subsequent login', async () => {
    const registered = await mockAdapter.register({
      name: 'Lucía Vargas',
      email: 'lucia.vargas@musicshare.org',
      password: 'claveSegura99',
      role: 'owner',
      phone: '+57 300 123 4567',
    });

    expect(registered.user.name).toBe('Lucía Vargas');
    expect(registered.user.role).toBe('owner');
    expect(registered.token).toBeTruthy();
    expect(getActiveUserSession()?.id).toBe(registered.user.id);

    await expect(
      mockAdapter.register({
        name: 'Otra Lucía',
        email: 'LUCIA.VARGAS@musicshare.org',
        password: 'otraClave123',
        role: 'musician',
      }),
    ).rejects.toMatchObject({ status: 409 });

    await mockAdapter.logout();
    const reLogged = await mockAdapter.login({
      email: 'lucia.vargas@musicshare.org',
      password: 'claveSegura99',
    });
    expect(reLogged.user.id).toBe(registered.user.id);
  });
});
