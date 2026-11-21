import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.errors import AppException, BadRequestError
from shared.models.instrumento import InstrumentoUpdate
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        instrumento_id = path_params.get("id")
        if not instrumento_id:
            raise BadRequestError("Falta el parámetro de ruta 'id'")

        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        instrumento_in = InstrumentoUpdate(**body)
        updates = {k: v for k, v in instrumento_in.model_dump().items() if v is not None}

        repo = InstrumentosRepository()
        updated = repo.update(instrumento_id, updates)
        return success_response(200, data=updated, message="Instrumento actualizado exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except PydanticValidationError as e:
        return error_response(422, "VALIDATION_ERROR", "Error de validación", details=e.errors())
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al actualizar instrumento: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
