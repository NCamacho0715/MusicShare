import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiAdapter } from '../apiAdapter';
import { setActiveUserSession } from '../httpClient';

describe('apiAdapter Integration with Serverless Backend', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActiveUserSession(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly maps backend users from GET /usuarios and performs login', async () => {
    const mockBackendUsers = [
      {
        id: 'usr-musico-001',
        nombre: 'Ana',
        apellido: 'Gómez',
        correo: 'ana.gomez@musicshare.org',
        telefono: '+573109876543',
        rol: 'musico',
        estado: 'activo',
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
      },
      {
        id: 'usr-propietario-001',
        nombre: 'Academia',
        apellido: 'Filarmónica',
        correo: 'contacto@filarmonicabogota.com',
        telefono: '+573155554433',
        rol: 'propietario',
        estado: 'activo',
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/usuarios')) {
        return new Response(JSON.stringify({ data: mockBackendUsers }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: { message: 'Not found' } }), {
        status: 404,
      });
    });

    const users = await apiAdapter.listUsers();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe('Ana Gómez');
    expect(users[0].role).toBe('musician');
    expect(users[1].name).toBe('Academia Filarmónica');
    expect(users[1].role).toBe('owner');

    const session = await apiAdapter.login({
      email: 'ana.gomez@musicshare.org',
      password: 'password123',
    });
    expect(session.user.id).toBe('usr-musico-001');
    expect(session.token).toContain('usr-musico-001');
  });

  it('correctly creates an instrument via POST /instrumentos matching backend schema', async () => {
    const mockCreated = {
      id: 'inst-guitarra-001',
      nombre: 'Guitarra Clásica Yamaha C40',
      marca: 'Yamaha',
      modelo: 'C40',
      categoria: 'cuerdas',
      descripcion: 'Guitarra acústica de estudio, excelente estado.',
      estado: 'disponible',
      propietario_id: 'usr-propietario-001',
      imagen_key: 'instrumentos/inst-guitarra-001/foto.jpg',
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T12:00:00Z',
    };

    let capturedBody: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (init?.body && typeof init.body === 'string') {
          capturedBody = JSON.parse(init.body);
        }
        return new Response(JSON.stringify({ data: mockCreated }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const instrument = await apiAdapter.createInstrument({
      name: 'Guitarra Clásica Yamaha C40',
      category: 'cuerdas',
      brand: 'Yamaha',
      description: 'Guitarra acústica de estudio, excelente estado.',
      condition: 'excelente',
      imageUrl: 'http://localhost:4566/musicshare-instrument-images/instrumentos/inst-guitarra-001/foto.jpg',
    });

    expect(capturedBody).toBeTruthy();
    expect(capturedBody.nombre).toBe('Guitarra Clásica Yamaha C40');
    expect(capturedBody.marca).toBe('Yamaha');
    expect(capturedBody.estado).toBe('disponible');

    expect(instrument.id).toBe('inst-guitarra-001');
    expect(instrument.name).toBe('Guitarra Clásica Yamaha C40');
    expect(instrument.category).toBe('cuerdas');
    expect(instrument.status).toBe('disponible');
  });

  it('executes loan creation and activates it on the backend', async () => {
    const mockInstrument = {
      id: 'inst-1',
      nombre: 'Violín 4/4',
      marca: 'Cremona',
      modelo: 'SV-175',
      categoria: 'cuerdas',
      descripcion: 'Violín profesional',
      estado: 'disponible',
      propietario_id: 'usr-propietario-001',
      created_at: '2026-11-20T10:00:00Z',
      updated_at: '2026-11-20T10:00:00Z',
    };

    const mockCreatedLoan = {
      id: 'prestamo-001',
      instrumento_id: 'inst-1',
      solicitante_id: 'usr-musico-001',
      propietario_id: 'usr-propietario-001',
      fecha_inicio: '2026-11-20T00:00:00Z',
      fecha_vencimiento: '2026-11-27T23:59:59Z',
      estado: 'solicitado',
      observaciones: 'Préstamo solicitado',
      notificacion_vencimiento_enviada: false,
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T12:00:00Z',
    };

    const mockActivatedLoan = {
      ...mockCreatedLoan,
      estado: 'activo',
    };

    setActiveUserSession({
      id: 'usr-musico-001',
      name: 'Ana Gómez',
      email: 'ana.gomez@musicshare.org',
      role: 'musician',
      createdAt: '2026-11-20T10:00:00Z',
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        const method = init?.method || 'GET';

        if (urlStr.includes('/instrumentos/inst-1')) {
          return new Response(JSON.stringify({ data: mockInstrument }), { status: 200 });
        }
        if (urlStr.includes('/prestamos') && method === 'POST') {
          return new Response(JSON.stringify({ data: mockCreatedLoan }), { status: 201 });
        }
        if (urlStr.includes('/prestamos/prestamo-001') && method === 'PUT') {
          return new Response(JSON.stringify({ data: mockActivatedLoan }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    );

    const loan = await apiAdapter.requestLoan({
      instrumentId: 'inst-1',
      startDate: '2026-11-20',
      dueDate: '2026-11-27',
    });

    expect(loan.id).toBe('prestamo-001');
    expect(loan.status).toBe('activo');
  });

  it('triggers maintenance flow when loan is returned with damage', async () => {
    const mockDamagedLoan = {
      id: 'prestamo-001',
      instrumento_id: 'inst-1',
      solicitante_id: 'usr-musico-001',
      propietario_id: 'usr-propietario-001',
      fecha_inicio: '2026-11-20T00:00:00Z',
      fecha_vencimiento: '2026-11-27T23:59:59Z',
      estado: 'dañado',
      observaciones: 'Arco roto accidentalmente',
      notificacion_vencimiento_enviada: false,
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T14:00:00Z',
    };

    let putPayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PUT' && init?.body) {
          putPayload = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ data: mockDamagedLoan }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    );

    const returned = await apiAdapter.returnLoan('prestamo-001', {
      status: 'dañado',
      damageNotes: 'Arco roto accidentalmente',
    });

    expect(putPayload).toBeTruthy();
    expect(putPayload.estado).toBe('dañado');
    expect(putPayload.observaciones).toBe('Arco roto accidentalmente');
    expect(returned.status).toBe('dañado');
  });
});
