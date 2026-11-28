import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.auth_headers import extract_auth_context
from shared.errors import AppException
from shared.models.instrumento import InstrumentoCreate
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = dict(raw_body)

        user_id, _ = extract_auth_context(event)
        if not body.get("propietario_id") and user_id:
            body["propietario_id"] = user_id

        instrumento_in = InstrumentoCreate(**body)
        repo = InstrumentosRepository()
        created = repo.create(instrumento_in.model_dump())
        return success_response(201, data=created, message="Instrumento creado exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except PydanticValidationError as e:
        return error_response(422, "VALIDATION_ERROR", "Error de validación", details=e.errors())
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al crear instrumento: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
