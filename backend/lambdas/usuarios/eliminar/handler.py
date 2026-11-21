import logging
from shared.errors import AppException, BadRequestError
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

        repo = UsuariosRepository()
        repo.delete(usuario_id)
        return success_response(200, message=f"Usuario {usuario_id} eliminado exitosamente")
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al eliminar usuario: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
