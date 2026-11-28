import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.auth_headers import extract_auth_context, is_admin
from shared.errors import AppException, BadRequestError, ForbiddenError, NotFoundError
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
        updates = {
            k: v for k, v in instrumento_in.model_dump(exclude_unset=True).items()
            if v is not None
        }

        repo = InstrumentosRepository()
        instrumento = repo.get_by_id(instrumento_id)
        if not instrumento:
            raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")

        user_id, user_role = extract_auth_context(event)
        if user_id and user_id != instrumento.get("propietario_id") and not is_admin(user_role):
            raise ForbiddenError("Solo el propietario o un administrador puede editar este instrumento")

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
