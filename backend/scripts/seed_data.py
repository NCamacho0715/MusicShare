import os
import sys

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from shared.repositories.usuarios_repository import UsuariosRepository
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.dates import now_iso

def seed():
    print("Iniciando carga de datos de prueba (Seed Data)...")
    usuarios_repo = UsuariosRepository()
    instrumentos_repo = InstrumentosRepository()
    prestamos_repo = PrestamosRepository()

    # 1. Usuarios
    users_data = [
        {
            "id": "usr-estudiante-001",
            "nombre": "Carlos",
            "apellido": "Pérez",
            "correo": "carlos.perez@musica.edu.co",
            "telefono": "+573001234567",
            "rol": "estudiante",
            "estado": "activo"
        },
        {
            "id": "usr-musico-001",
            "nombre": "Ana",
            "apellido": "Gómez",
            "correo": "ana.gomez@musicshare.org",
            "telefono": "+573109876543",
            "rol": "musico",
            "estado": "activo"
        },
        {
            "id": "usr-propietario-001",
            "nombre": "Academia Filarmónica",
            "apellido": "Bogotá",
            "correo": "contacto@filarmonicabogota.com",
            "telefono": "+573155554433",
            "rol": "propietario",
            "estado": "activo"
        },
        {
            "id": "usr-admin-001",
            "nombre": "Sebastián",
            "apellido": "Administrador",
            "correo": "admin@musicshare.local",
            "telefono": "+573200001122",
            "rol": "administrador",
            "estado": "activo"
        }
    ]

    for u in users_data:
        try:
            usuarios_repo.create(u)
            print(f" -> Usuario creado: {u['nombre']} ({u['rol']})")
        except Exception as e:
            print(f" -> Usuario {u['correo']} ya existía o error: {e}")

    # 2. Instrumentos
    instruments_data = [
        {
            "id": "inst-guitarra-001",
            "nombre": "Guitarra Clásica Yamaha C40",
            "marca": "Yamaha",
            "modelo": "C40",
            "categoria": "Cuerdas",
            "descripcion": "Guitarra acústica de estudio, excelente estado.",
            "estado": "disponible",
            "propietario_id": "usr-propietario-001"
        },
        {
            "id": "inst-teclado-001",
            "nombre": "Teclado Sensitivo Roland GO:KEYS",
            "marca": "Roland",
            "modelo": "GO:KEYS 61",
            "categoria": "Teclados",
            "descripcion": "Teclado de 61 teclas con conexión Bluetooth y sonidos profesionales.",
            "estado": "disponible",
            "propietario_id": "usr-propietario-001"
        },
        {
            "id": "inst-violin-001",
            "nombre": "Violín Cremona SV-175 4/4",
            "marca": "Cremona",
            "modelo": "SV-175",
            "categoria": "Cuerdas",
            "descripcion": "Violín profesional con arco y estuche rígido.",
            "estado": "disponible",
            "propietario_id": "usr-musico-001"
        }
    ]

    for inst in instruments_data:
        try:
            instrumentos_repo.create(inst)
            print(f" -> Instrumento creado: {inst['nombre']}")
        except Exception as e:
            print(f" -> Instrumento {inst['id']} ya existía o error: {e}")

    # 3. Préstamo de prueba
    loan_data = {
        "id": "prestamo-demo-001",
        "instrumento_id": "inst-guitarra-001",
        "solicitante_id": "usr-estudiante-001",
        "propietario_id": "usr-propietario-001",
        "fecha_inicio": now_iso(),
        "fecha_vencimiento": "2026-12-31T23:59:59Z",
        "estado": "solicitado",
        "observaciones": "Préstamo de prueba para prácticas de ensamble."
    }

    try:
        prestamos_repo.create(loan_data)
        print(f" -> Préstamo de prueba creado: {loan_data['id']}")
    except Exception as e:
        print(f" -> Préstamo {loan_data['id']} ya existía o error: {e}")

    print("Carga de datos de prueba finalizada exitosamente.")

if __name__ == "__main__":
    seed()
