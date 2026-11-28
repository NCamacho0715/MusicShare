from datetime import datetime, timedelta, timezone
import os
import sys

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from shared.aws_clients import get_s3_client  # noqa: E402
from shared.config import Config  # noqa: E402
from shared.repositories.instrumentos_repository import InstrumentosRepository  # noqa: E402
from shared.repositories.prestamos_repository import PrestamosRepository  # noqa: E402
from shared.repositories.usuarios_repository import UsuariosRepository  # noqa: E402


def _iso_offset(days: int, hour: int = 12) -> str:
    dt = (datetime.now(timezone.utc) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_images_bucket(s3_client, bucket_name: str) -> None:
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except Exception:
        region = Config.get_aws_region()
        if region == "us-east-1":
            s3_client.create_bucket(Bucket=bucket_name)
        else:
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": region},
            )


def _upload_seed_image(s3_client, bucket_name: str, images_dir: str, instrumento_id: str, filename: str) -> str | None:
    key = f"instrumentos/{instrumento_id}/{filename}"
    local_path = os.path.join(images_dir, filename)
    if not os.path.exists(local_path):
        print(f" -> [WARN] Imagen semilla no encontrada en {local_path}")
        return None
    s3_client.upload_file(
        local_path,
        bucket_name,
        key,
        ExtraArgs={"ContentType": "image/jpeg"},
    )
    return key


def seed():
    print("Iniciando carga de datos de prueba (Seed Data)...")
    usuarios_repo = UsuariosRepository()
    instrumentos_repo = InstrumentosRepository()
    prestamos_repo = PrestamosRepository()
    s3_client = get_s3_client()
    bucket_name = Config.INSTRUMENTS_BUCKET
    images_dir = os.path.abspath(os.path.join(backend_path, "..", "frontend", "public", "images"))

    _ensure_images_bucket(s3_client, bucket_name)

    # 1. Usuarios (4 roles MVP)
    users_data = [
        {
            "id": "usr-estudiante-001",
            "nombre": "Carlos",
            "apellido": "Pérez",
            "correo": "carlos.perez@musica.edu.co",
            "telefono": "+573001234567",
            "rol": "estudiante",
            "estado": "activo",
        },
        {
            "id": "usr-musico-001",
            "nombre": "Ana",
            "apellido": "Gómez",
            "correo": "ana.gomez@musicshare.org",
            "telefono": "+573109876543",
            "rol": "musico",
            "estado": "activo",
        },
        {
            "id": "usr-propietario-001",
            "nombre": "Academia Filarmónica",
            "apellido": "Bogotá",
            "correo": "contacto@filarmonicabogota.com",
            "telefono": "+573155554433",
            "rol": "propietario",
            "estado": "activo",
        },
        {
            "id": "usr-admin-001",
            "nombre": "Sebastián",
            "apellido": "Administrador",
            "correo": "admin@musicshare.local",
            "telefono": "+573200001122",
            "rol": "administrador",
            "estado": "activo",
        },
    ]

    for u in users_data:
        existing = usuarios_repo.get_by_id(u["id"]) or usuarios_repo.get_by_email(u["correo"])
        if existing:
            print(f" -> Usuario existente: {existing['nombre']} ({existing['rol']})")
            continue
        usuarios_repo.create(u)
        print(f" -> Usuario creado: {u['nombre']} ({u['rol']})")

    # 2. Instrumentos (categorías canónicas en minúsculas + fotos en S3)
    instruments_data = [
        {
            "id": "inst-guitarra-001",
            "nombre": "Guitarra Clásica Yamaha C40",
            "marca": "Yamaha",
            "modelo": "C40",
            "categoria": "cuerdas",
            "descripcion": "Guitarra acústica de estudio con tapa de abeto, acción cómoda y funda acolchada.",
            "ubicacion": "Sala Comunitaria Norte",
            "condicion": "excelente",
            "estado": "disponible",
            "propietario_id": "usr-propietario-001",
            "image_file": "guitarra-acustica.jpg",
        },
        {
            "id": "inst-teclado-001",
            "nombre": "Teclado Sensitivo Roland GO:KEYS",
            "marca": "Roland",
            "modelo": "GO:KEYS 61",
            "categoria": "teclados",
            "descripcion": "Teclado de 61 teclas con conexión Bluetooth, pedal de sustain y sonidos profesionales.",
            "ubicacion": "Sala Comunitaria Norte",
            "condicion": "excelente",
            "estado": "disponible",
            "propietario_id": "usr-propietario-001",
            "image_file": "piano-escenario.jpg",
        },
        {
            "id": "inst-cajon-001",
            "nombre": "Cajón Peruano de Abedul",
            "marca": "Meinl",
            "modelo": "Headliner",
            "categoria": "percusion",
            "descripcion": "Cuerpo resonante en abedul con bordona interna ajustable para formatos acústicos.",
            "ubicacion": "Centro Juvenil Sur",
            "condicion": "excelente",
            "estado": "disponible",
            "propietario_id": "usr-admin-001",
            "image_file": "cajon-peruano.jpg",
        },
        {
            "id": "inst-saxofon-001",
            "nombre": "Saxofón Alto Eb Jupiter",
            "marca": "Jupiter",
            "modelo": "JAS500",
            "categoria": "viento",
            "descripcion": "Llaves ajustadas recientemente y zapatillas en buen estado. Incluye arnés y estuche rígido.",
            "ubicacion": "Conservatorio Local",
            "condicion": "bueno",
            "estado": "prestado",
            "propietario_id": "usr-propietario-001",
            "image_file": "saxofon-alto.jpg",
        },
        {
            "id": "inst-violin-001",
            "nombre": "Violín Cremona SV-175 4/4",
            "marca": "Cremona",
            "modelo": "SV-175",
            "categoria": "cuerdas",
            "descripcion": "Violín completo con arco de crin, resina, barbada ergonómica y estuche rígido.",
            "ubicacion": "Casa de la Cultura",
            "condicion": "bueno",
            "estado": "prestado",
            "propietario_id": "usr-musico-001",
            "image_file": "violin-clasico.jpg",
        },
        {
            "id": "inst-amplificador-001",
            "nombre": "Amplificador a Válvulas 15W",
            "marca": "Vox",
            "modelo": "AC15C1",
            "categoria": "amplificacion",
            "descripcion": "Combo de 15W con parlante Celestion de 12 pulgadas en revisión técnica de potenciómetro.",
            "ubicacion": "Taller de Luthier y Electrónica",
            "condicion": "dañado",
            "estado": "en_mantenimiento",
            "propietario_id": "usr-propietario-001",
            "image_file": "amplificador-valvulas.jpg",
        },
    ]

    for inst_spec in instruments_data:
        inst = {k: v for k, v in inst_spec.items() if k != "image_file"}
        image_file = inst_spec["image_file"]
        uploaded_key = _upload_seed_image(s3_client, bucket_name, images_dir, inst["id"], image_file)
        if uploaded_key:
            inst["imagen_key"] = uploaded_key

        existing = instrumentos_repo.get_by_id(inst["id"])
        if existing:
            sync_updates = {}
            if existing.get("categoria") != inst["categoria"]:
                sync_updates["categoria"] = inst["categoria"]
            if not existing.get("ubicacion") and inst.get("ubicacion"):
                sync_updates["ubicacion"] = inst["ubicacion"]
            if not existing.get("condicion") and inst.get("condicion"):
                sync_updates["condicion"] = inst["condicion"]
            if not existing.get("imagen_key") and inst.get("imagen_key"):
                sync_updates["imagen_key"] = inst["imagen_key"]
            if inst["id"] == "inst-violin-001" and not prestamos_repo.get_by_id("prestamo-demo-002"):
                sync_updates["estado"] = "prestado"
            if sync_updates:
                instrumentos_repo.update(inst["id"], sync_updates)
                print(f" -> Instrumento sincronizado: {inst['nombre']}")
            else:
                print(f" -> Instrumento existente: {existing['nombre']}")
            continue

        instrumentos_repo.create(inst)
        print(f" -> Instrumento creado: {inst['nombre']} (S3: {uploaded_key})")

    # 3. Préstamos de prueba (cubre próximo a vencer, vencido, devuelto y dañado)
    loans_data = [
        {
            "id": "prestamo-demo-001",
            "instrumento_id": "inst-saxofon-001",
            "solicitante_id": "usr-musico-001",
            "propietario_id": "usr-propietario-001",
            "fecha_inicio": _iso_offset(-5, 10),
            "fecha_vencimiento": _iso_offset(2, 23),
            "estado": "activo",
            "observaciones": "Préstamo activo próximo a vencer para ensayos de banda sinfónica.",
        },
        {
            "id": "prestamo-demo-002",
            "instrumento_id": "inst-violin-001",
            "solicitante_id": "usr-estudiante-001",
            "propietario_id": "usr-musico-001",
            "fecha_inicio": _iso_offset(-12, 9),
            "fecha_vencimiento": _iso_offset(-2, 18),
            "estado": "activo",
            "observaciones": "Préstamo activo vencido listo para revisión de EventBridge.",
        },
        {
            "id": "prestamo-demo-003",
            "instrumento_id": "inst-guitarra-001",
            "solicitante_id": "usr-musico-001",
            "propietario_id": "usr-propietario-001",
            "fecha_inicio": _iso_offset(-18, 10),
            "fecha_vencimiento": _iso_offset(-10, 23),
            "fecha_devolucion": _iso_offset(-10, 17),
            "estado": "devuelto",
            "observaciones": "Devuelto en excelente estado tras concierto comunitario.",
        },
        {
            "id": "prestamo-demo-004",
            "instrumento_id": "inst-amplificador-001",
            "solicitante_id": "usr-estudiante-001",
            "propietario_id": "usr-propietario-001",
            "fecha_inicio": _iso_offset(-15, 11),
            "fecha_vencimiento": _iso_offset(-7, 23),
            "fecha_devolucion": _iso_offset(-7, 18),
            "estado": "dañado",
            "observaciones": "Chasquido intermitente en potenciómetro de ganancia; enviado a mantenimiento.",
        },
    ]

    for loan in loans_data:
        existing_loan = prestamos_repo.get_by_id(loan["id"])
        if existing_loan:
            # Migrar el préstamo semilla antiguo si aún apunta al esquema previo
            if (
                loan["id"] == "prestamo-demo-001"
                and existing_loan.get("estado") == "solicitado"
                and existing_loan.get("observaciones") == "Préstamo de prueba para prácticas de ensamble."
            ):
                prestamos_repo.delete(loan["id"])
                prestamos_repo.create(loan)
                print(f" -> Préstamo migrado: {loan['id']} ({loan['estado']})")
            else:
                print(f" -> Préstamo existente: {loan['id']} ({existing_loan.get('estado')})")
            continue
        prestamos_repo.create(loan)
        print(f" -> Préstamo creado: {loan['id']} ({loan['estado']})")

    print("Carga de datos de prueba finalizada exitosamente.")


if __name__ == "__main__":
    seed()
