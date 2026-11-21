import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.errors import AppException, BadRequestError
from shared.models.prestamo import PrestamoUpdate
from shared.services.prestamos_service import PrestamosService
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        prestamo_id = path_params.get("id")
        if not prestamo_id:
            raise BadRequestError("Falta el parámetro de ruta 'id'")

        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        prestamo_in = PrestamoUpdate(**body)
        updates = {k: v for k, v in prestamo_in.model_dump().items() if v is not None}

        service = PrestamosService()
        if "estado" in updates:
            nuevo_estado = updates.pop("estado")
            updated = service.transition_estado(prestamo_id, nuevo_estado, updates)
        else:
            repo = PrestamosRepository()
            updated = repo.update(prestamo_id, updates)

        return success_response(200, data=updated, message="Préstamo actualizado exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except PydanticValidationError as e:
        return error_response(422, "VALIDATION_ERROR", "Error de validación", details=e.errors())
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al actualizar préstamo: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
