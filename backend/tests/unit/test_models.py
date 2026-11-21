import pytest
from pydantic import ValidationError
from shared.models.usuario import UsuarioCreate, UsuarioUpdate, RolUsuario, EstadoUsuario
from shared.models.instrumento import InstrumentoCreate, InstrumentoUpdate, EstadoInstrumento
from shared.models.prestamo import PrestamoCreate, PrestamoUpdate, EstadoPrestamo

def test_usuario_create_valid():
    data = {
        "nombre": "Juan",
        "apellido": "Díaz",
        "correo": "juan.diaz@test.com",
        "rol": "musico"
    }
    user = UsuarioCreate(**data)
    assert user.nombre == "Juan"
    assert user.correo == "juan.diaz@test.com"
    assert user.rol == RolUsuario.MUSICO
    assert user.estado == EstadoUsuario.ACTIVO

def test_usuario_create_invalid_email():
    with pytest.raises(ValidationError):
        UsuarioCreate(nombre="A", apellido="B", correo="correo-invalido", rol="estudiante")

def test_usuario_create_invalid_rol():
    with pytest.raises(ValidationError):
        UsuarioCreate(nombre="A", apellido="B", correo="a@b.com", rol="astronauta")

def test_instrumento_create_valid():
    inst = InstrumentoCreate(
        nombre="Saxofón Alto",
        marca="Yamaha",
        modelo="YAS-280",
        categoria="Viento",
        propietario_id="usr-123"
    )
    assert inst.estado == EstadoInstrumento.DISPONIBLE
    assert inst.categoria == "Viento"

def test_prestamo_create_valid():
    prestamo = PrestamoCreate(
        instrumento_id="inst-1",
        solicitante_id="usr-1",
        propietario_id="usr-2",
        fecha_inicio="2026-11-20T10:00:00Z",
        fecha_vencimiento="2026-11-27T10:00:00Z"
    )
    assert prestamo.instrumento_id == "inst-1"

def test_prestamo_create_invalid_date():
    with pytest.raises(ValidationError):
        PrestamoCreate(
            instrumento_id="inst-1",
            solicitante_id="usr-1",
            propietario_id="usr-2",
            fecha_inicio="20-11-2026",
            fecha_vencimiento="fecha_invalida"
        )
