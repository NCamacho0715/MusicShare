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

  it('correctly maps all 4 backend user roles from GET /usuarios and performs login', async () => {
    const mockBackendUsers = [
      {
        id: 'usr-estudiante-001',
        nombre: 'Carlos',
        apellido: 'Pérez',
        correo: 'carlos.perez@musica.edu.co',
        telefono: '+573001234567',
        rol: 'estudiante',
        estado: 'activo',
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
      },
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
      {
        id: 'usr-admin-001',
        nombre: 'Sebastián',
        apellido: 'Administrador',
        correo: 'admin@musicshare.local',
        telefono: '+573200001122',
        rol: 'administrador',
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
    expect(users).toHaveLength(4);
    expect(users[0].role).toBe('student');
    expect(users[1].role).toBe('musician');
    expect(users[2].role).toBe('owner');
    expect(users[3].role).toBe('admin');

    const session = await apiAdapter.login({
      email: 'carlos.perez@musica.edu.co',
      password: 'password123',
    });
    expect(session.user.id).toBe('usr-estudiante-001');
    expect(session.user.role).toBe('student');
  });

  it('supports CRUD on /usuarios via createUser, updateUser and deleteUser', async () => {
    const calls: Array<{ url: string; method: string; body?: any }> = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        const method = init?.method || 'GET';
        const body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
        calls.push({ url: urlStr, method, body });

        if (method === 'POST' && urlStr.endsWith('/usuarios')) {
          return new Response(
            JSON.stringify({
              data: {
                id: 'usr-new-1',
                ...body,
                created_at: '2026-11-27T10:00:00Z',
                updated_at: '2026-11-27T10:00:00Z',
              },
            }),
            { status: 201 },
          );
        }
        if (method === 'PUT' && urlStr.includes('/usuarios/usr-new-1')) {
          return new Response(
            JSON.stringify({
              data: {
                id: 'usr-new-1',
                nombre: body.nombre,
                apellido: 'Actualizada',
                correo: 'laura@musicshare.org',
                rol: body.rol,
                estado: 'activo',
                created_at: '2026-11-27T10:00:00Z',
                updated_at: '2026-11-27T11:00:00Z',
              },
            }),
            { status: 200 },
          );
        }
        if (method === 'DELETE' && urlStr.includes('/usuarios/usr-new-1')) {
          return new Response(JSON.stringify({ message: 'Eliminado' }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    );

    const created = await apiAdapter.createUser({
      firstName: 'Laura',
      lastName: 'Martínez',
      email: 'Laura@MusicShare.org',
      role: 'student',
    });
    expect(created.id).toBe('usr-new-1');
    expect(created.role).toBe('student');
    expect(calls[0].body.rol).toBe('estudiante');
    expect(calls[0].body.correo).toBe('laura@musicshare.org');

    const updated = await apiAdapter.updateUser('usr-new-1', {
      firstName: 'Laura María',
      role: 'owner',
    });
    expect(updated.role).toBe('owner');
    expect(calls[1].body.rol).toBe('propietario');

    await apiAdapter.deleteUser('usr-new-1');
    expect(calls[2].method).toBe('DELETE');
  });

  it('creates an instrument and uploads its image to S3 presigned URL', async () => {
    setActiveUserSession({
      id: 'usr-propietario-001',
      name: 'Academia Filarmónica',
      email: 'contacto@filarmonicabogota.com',
      role: 'owner',
      createdAt: '2026-11-20T10:00:00Z',
    });

    const mockCreated = {
      id: 'inst-guitarra-001',
      nombre: 'Guitarra Clásica Yamaha C40',
      marca: 'Yamaha',
      modelo: 'C40',
      categoria: 'cuerdas',
      descripcion: 'Guitarra acústica de estudio, excelente estado.',
      ubicacion: 'Sala Norte',
      condicion: 'excelente',
      estado: 'disponible',
      propietario_id: 'usr-propietario-001',
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T12:00:00Z',
    };

    let createBody: any = null;
    let s3Uploaded = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        const method = init?.method || 'GET';

        if (urlStr.endsWith('/instrumentos') && method === 'POST') {
          createBody = JSON.parse(init!.body as string);
          return new Response(JSON.stringify({ data: mockCreated }), { status: 201 });
        }
        if (urlStr.includes('/instrumentos/inst-guitarra-001/imagen-url') && method === 'POST') {
          return new Response(
            JSON.stringify({
              data: {
                upload_url: 'http://localhost:4566/musicshare-instrument-images/instrumentos/inst-guitarra-001/foto.jpg?sig=1',
                key: 'instrumentos/inst-guitarra-001/foto.jpg',
                bucket: 'musicshare-instrument-images',
                public_url: 'http://localhost:4566/musicshare-instrument-images/instrumentos/inst-guitarra-001/foto.jpg',
              },
            }),
            { status: 200 },
          );
        }
        if (urlStr.includes('?sig=1') && method === 'PUT') {
          s3Uploaded = true;
          return new Response(null, { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    );

    const file = new File(['fake-jpeg'], 'foto.jpg', { type: 'image/jpeg' });
    const instrument = await apiAdapter.createInstrument({
      name: 'Guitarra Clásica Yamaha C40',
      category: 'cuerdas',
      brand: 'Yamaha',
      model: 'C40',
      location: 'Sala Norte',
      description: 'Guitarra acústica de estudio, excelente estado.',
      condition: 'excelente',
      imageUrl: 'data:image/jpeg;base64,abc',
      imageFile: file,
    });

    expect(createBody.nombre).toBe('Guitarra Clásica Yamaha C40');
    expect(createBody.modelo).toBe('C40');
    expect(createBody.ubicacion).toBe('Sala Norte');
    expect(createBody.condicion).toBe('excelente');
    expect(s3Uploaded).toBe(true);
    expect(instrument.imageKey).toBe('instrumentos/inst-guitarra-001/foto.jpg');
    expect(instrument.imageUrl).toContain('instrumentos/inst-guitarra-001/foto.jpg');
  });

  it('maps retirado <-> inactivo and mantenimiento <-> en_mantenimiento on updateInstrument', async () => {
    setActiveUserSession({
      id: 'usr-propietario-001',
      name: 'Academia Filarmónica',
      email: 'contacto@filarmonicabogota.com',
      role: 'owner',
      createdAt: '2026-11-20T10:00:00Z',
    });

    let putBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PUT' && init.body) {
          putBody = JSON.parse(init.body as string);
          return new Response(
            JSON.stringify({
              data: {
                id: 'inst-1',
                nombre: 'Piano',
                marca: 'Roland',
                modelo: 'FP-30',
                categoria: 'teclados',
                estado: 'inactivo',
                propietario_id: 'usr-propietario-001',
                created_at: '2026-11-20T10:00:00Z',
                updated_at: '2026-11-20T12:00:00Z',
              },
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    );

    const updated = await apiAdapter.updateInstrument('inst-1', {
      status: 'retirado',
      location: 'Bodega Central',
    });

    expect(putBody.estado).toBe('inactivo');
    expect(putBody.ubicacion).toBe('Bodega Central');
    expect(updated.status).toBe('retirado');
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

  it('triggers maintenance flow and polls instrument status when loan is returned with damage', async () => {
    const mockDamagedLoan = {
      id: 'prestamo-001',
      instrumento_id: 'inst-1',
      solicitante_id: 'usr-musico-001',
      propietario_id: 'usr-propietario-001',
      fecha_inicio: '2026-11-20T00:00:00Z',
      fecha_vencimiento: '2026-11-27T23:59:59Z',
      fecha_devolucion: '2026-11-27T14:00:00Z',
      estado: 'dañado',
      observaciones: 'Arco roto accidentalmente',
      notificacion_vencimiento_enviada: false,
      created_at: '2026-11-20T12:00:00Z',
      updated_at: '2026-11-20T14:00:00Z',
    };

    let putPayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        if (init?.method === 'PUT' && init?.body) {
          putPayload = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ data: mockDamagedLoan }), { status: 200 });
        }
        if (urlStr.includes('/instrumentos/inst-1')) {
          return new Response(
            JSON.stringify({
              data: {
                id: 'inst-1',
                nombre: 'Violín',
                marca: 'Cremona',
                modelo: 'SV-175',
                categoria: 'cuerdas',
                estado: 'en_mantenimiento',
                propietario_id: 'usr-propietario-001',
                created_at: '2026-11-20T10:00:00Z',
                updated_at: '2026-11-20T14:00:00Z',
              },
            }),
            { status: 200 },
          );
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
    expect(putPayload.fecha_devolucion).toBeTruthy();
    expect(putPayload.observaciones).toBe('Arco roto accidentalmente');
    expect(returned.status).toBe('dañado');
    expect(returned.damageNotes).toBe('Arco roto accidentalmente');
  });
});
