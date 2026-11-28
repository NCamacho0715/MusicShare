import uuid
from typing import Any, Dict, Optional
from shared.dates import now_iso, parse_iso
from shared.errors import BadRequestError, ConflictError, NotFoundError
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.repositories.usuarios_repository import UsuariosRepository
from shared.services.sqs_service import SQSService

VALID_TRANSITIONS = {
    "solicitado": ["activo", "cancelado"],
    "activo": ["devuelto", "dañado", "vencido"],
    "vencido": ["devuelto", "dañado"],
    "devuelto": [],
    "dañado": [],
    "cancelado": []
}

class PrestamosService:
    def __init__(
        self,
        prestamos_repo: Optional[PrestamosRepository] = None,
        instrumentos_repo: Optional[InstrumentosRepository] = None,
        usuarios_repo: Optional[UsuariosRepository] = None,
        sqs_service: Optional[SQSService] = None
    ):
        self.prestamos_repo = prestamos_repo or PrestamosRepository()
        self.instrumentos_repo = instrumentos_repo or InstrumentosRepository()
        self.usuarios_repo = usuarios_repo or UsuariosRepository()
        self.sqs_service = sqs_service or SQSService()

    def create_prestamo(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # Validate date range
        if parse_iso(data["fecha_vencimiento"]) < parse_iso(data["fecha_inicio"]):
            raise BadRequestError("La fecha de vencimiento debe ser igual o posterior a la fecha de inicio")

        # Validate solicitante exists
        solicitante = self.usuarios_repo.get_by_id(data["solicitante_id"])
        if not solicitante:
            raise NotFoundError(f"El solicitante con id {data['solicitante_id']} no existe")

        # Validate instrumento exists and is available
        instrumento = self.instrumentos_repo.get_by_id(data["instrumento_id"])
        if not instrumento:
            raise NotFoundError(f"El instrumento con id {data['instrumento_id']} no existe")

        if instrumento.get("estado") != "disponible":
            raise ConflictError(f"El instrumento no está disponible (estado actual: {instrumento.get('estado')})")

        # Set propietario_id from instrument if not provided or ensure consistency
        if not data.get("propietario_id"):
            data["propietario_id"] = instrumento["propietario_id"]

        data["estado"] = "solicitado"
        return self.prestamos_repo.create(data)

    def transition_estado(self, prestamo_id: str, nuevo_estado: str, updates: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        prestamo = self.prestamos_repo.get_by_id(prestamo_id)
        if not prestamo:
            raise NotFoundError(f"Préstamo con id {prestamo_id} no encontrado")

        actual_estado = prestamo["estado"]
        if nuevo_estado == actual_estado:
            # Idempotent or no-op transition
            if updates:
                return self.prestamos_repo.update(prestamo_id, updates)
            return prestamo

        allowed = VALID_TRANSITIONS.get(actual_estado, [])
        if nuevo_estado not in allowed:
            raise BadRequestError(
                f"Transición no permitida: de '{actual_estado}' a '{nuevo_estado}'. "
                f"Transiciones válidas: {allowed}"
            )

        updates = dict(updates or {})
        updates["estado"] = nuevo_estado
        instrumento_id = prestamo["instrumento_id"]

        if nuevo_estado == "activo":
            # Verify instrument is still disponible before marking prestado
            instrumento = self.instrumentos_repo.get_by_id(instrumento_id)
            if not instrumento:
                raise NotFoundError(f"El instrumento con id {instrumento_id} no existe")
            if instrumento.get("estado") != "disponible":
                raise ConflictError(f"El instrumento no está disponible (estado actual: {instrumento.get('estado')})")
            self.instrumentos_repo.update(instrumento_id, {"estado": "prestado"})
        elif nuevo_estado == "devuelto":
            # Instrument returns to disponible
            if not updates.get("fecha_devolucion"):
                updates["fecha_devolucion"] = now_iso()
            self.instrumentos_repo.update(instrumento_id, {"estado": "disponible"})
        elif nuevo_estado == "dañado":
            if not updates.get("fecha_devolucion"):
                updates["fecha_devolucion"] = now_iso()
            observaciones = updates.get("observaciones") or prestamo.get("observaciones") or ""
            # Send SQS message to trigger maintenance workflow
            event_payload = {
                "event_id": f"evt-{uuid.uuid4()}",
                "prestamo_id": prestamo_id,
                "instrumento_id": instrumento_id,
                "usuario_id": prestamo["solicitante_id"],
                "observaciones": observaciones,
                "tipo_evento": "instrumento_daniado"
            }
            self.sqs_service.send_damage_event(event_payload)
        elif nuevo_estado == "cancelado":
            # No change to instrument if it was only solicitado
            pass

        return self.prestamos_repo.update(prestamo_id, updates)
