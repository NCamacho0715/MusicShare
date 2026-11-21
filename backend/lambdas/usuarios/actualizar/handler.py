import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.errors import AppException, BadRequestError
from shared.models.usuario import UsuarioUpdate
from shared.repositories.usuarios_repository import UsuariosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        usuario_id = path_params.get("id")
        if not usuario_id:
            raise BadRequestError("Falta el parámetro de ruta 'id'")

        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        usuario_in = UsuarioUpdate(**body)
        updates = {k: v for k, v in usuario_in.model_dump().items() if v is not None}
        
        repo = UsuariosRepository()
        updated = repo.update(usuario_id, updates)
        return success_response(200, data=updated, message="Usuario actualizado exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except PydanticValidationError as e:
        return error_response(422, "VALIDATION_ERROR", "Error de validación", details=e.errors())
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al actualizar usuario: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
