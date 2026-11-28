import json
import logging
from pydantic import ValidationError as PydanticValidationError
from shared.errors import AppException
from shared.models.usuario import UsuarioCreate
from shared.repositories.usuarios_repository import UsuariosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        usuario_in = UsuarioCreate(**body)
        repo = UsuariosRepository()
        created = repo.create(usuario_in.model_dump())
        return success_response(status_code=201, data=created, message="Usuario creado exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except PydanticValidationError as e:
        return error_response(422, "VALIDATION_ERROR", "Error de validación", details=e.errors())
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al crear usuario: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
