from unittest.mock import MagicMock
import pytest
from shared.errors import BadRequestError, ConflictError
from shared.services.prestamos_service import PrestamosService

def test_create_prestamo_success():
    prestamos_repo = MagicMock()
    instrumentos_repo = MagicMock()
    usuarios_repo = MagicMock()
    sqs_service = MagicMock()

    usuarios_repo.get_by_id.return_value = {"id": "usr-1", "nombre": "Carlos"}
    instrumentos_repo.get_by_id.return_value = {"id": "inst-1", "estado": "disponible", "propietario_id": "usr-prop"}
    prestamos_repo.create.return_value = {"id": "p-1", "estado": "solicitado"}

    service = PrestamosService(
        prestamos_repo=prestamos_repo,
        instrumentos_repo=instrumentos_repo,
        usuarios_repo=usuarios_repo,
        sqs_service=sqs_service
    )

    data = {
        "instrumento_id": "inst-1",
        "solicitante_id": "usr-1",
        "propietario_id": "usr-prop",
        "fecha_inicio": "2026-11-20T10:00:00Z",
        "fecha_vencimiento": "2026-11-27T10:00:00Z"
    }
    result = service.create_prestamo(data)
    assert result["id"] == "p-1"
    assert result["estado"] == "solicitado"
    prestamos_repo.create.assert_called_once()

def test_create_prestamo_instrumento_no_disponible():
    prestamos_repo = MagicMock()
    instrumentos_repo = MagicMock()
    usuarios_repo = MagicMock()

    usuarios_repo.get_by_id.return_value = {"id": "usr-1"}
    instrumentos_repo.get_by_id.return_value = {"id": "inst-1", "estado": "prestado"}

    service = PrestamosService(
        prestamos_repo=prestamos_repo,
        instrumentos_repo=instrumentos_repo,
        usuarios_repo=usuarios_repo
    )

    with pytest.raises(ConflictError):
        service.create_prestamo({
            "instrumento_id": "inst-1",
            "solicitante_id": "usr-1",
            "fecha_inicio": "2026-11-20T10:00:00Z",
            "fecha_vencimiento": "2026-11-27T10:00:00Z"
        })

def test_transition_solicitado_to_activo():
    prestamos_repo = MagicMock()
    instrumentos_repo = MagicMock()
    sqs_service = MagicMock()

    prestamos_repo.get_by_id.return_value = {"id": "p-1", "estado": "solicitado", "instrumento_id": "inst-1"}
    instrumentos_repo.get_by_id.return_value = {"id": "inst-1", "estado": "disponible"}
    prestamos_repo.update.return_value = {"id": "p-1", "estado": "activo"}

    service = PrestamosService(
        prestamos_repo=prestamos_repo,
        instrumentos_repo=instrumentos_repo,
        sqs_service=sqs_service
    )

    updated = service.transition_estado("p-1", "activo")
    assert updated["estado"] == "activo"
    instrumentos_repo.update.assert_called_with("inst-1", {"estado": "prestado"})


def test_transition_solicitado_to_activo_conflict_when_not_disponible():
    prestamos_repo = MagicMock()
    instrumentos_repo = MagicMock()

    prestamos_repo.get_by_id.return_value = {"id": "p-1", "estado": "solicitado", "instrumento_id": "inst-1"}
    instrumentos_repo.get_by_id.return_value = {"id": "inst-1", "estado": "prestado"}

    service = PrestamosService(
        prestamos_repo=prestamos_repo,
        instrumentos_repo=instrumentos_repo,
    )

    with pytest.raises(ConflictError):
        service.transition_estado("p-1", "activo")


def test_create_prestamo_invalid_date_range():
    service = PrestamosService(
        prestamos_repo=MagicMock(),
        instrumentos_repo=MagicMock(),
        usuarios_repo=MagicMock(),
    )

    with pytest.raises(BadRequestError):
        service.create_prestamo({
            "instrumento_id": "inst-1",
            "solicitante_id": "usr-1",
            "propietario_id": "usr-2",
            "fecha_inicio": "2026-11-27T00:00:00Z",
            "fecha_vencimiento": "2026-11-20T00:00:00Z",
        })

def test_transition_activo_to_daniado_triggers_sqs():
    prestamos_repo = MagicMock()
    instrumentos_repo = MagicMock()
    sqs_service = MagicMock()

    prestamos_repo.get_by_id.return_value = {
        "id": "p-1",
        "estado": "activo",
        "instrumento_id": "inst-1",
        "solicitante_id": "usr-solicitante"
    }
    prestamos_repo.update.return_value = {"id": "p-1", "estado": "dañado"}

    service = PrestamosService(
        prestamos_repo=prestamos_repo,
        instrumentos_repo=instrumentos_repo,
        sqs_service=sqs_service
    )

    updated = service.transition_estado("p-1", "dañado", {"observaciones": "Cuerda rota"})
    assert updated["estado"] == "dañado"
    update_payload = prestamos_repo.update.call_args[0][1]
    assert update_payload["fecha_devolucion"]
    sqs_service.send_damage_event.assert_called_once()
    event_arg = sqs_service.send_damage_event.call_args[0][0]
    assert event_arg["tipo_evento"] == "instrumento_daniado"
    assert event_arg["instrumento_id"] == "inst-1"
    assert event_arg["observaciones"] == "Cuerda rota"

def test_transition_invalida():
    prestamos_repo = MagicMock()
    prestamos_repo.get_by_id.return_value = {"id": "p-1", "estado": "devuelto"}

    service = PrestamosService(prestamos_repo=prestamos_repo)
    with pytest.raises(BadRequestError):
        service.transition_estado("p-1", "activo")
