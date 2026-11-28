import logging
from shared.errors import AppException, NotFoundError
from shared.repositories.usuarios_repository import UsuariosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        usuario_id = path_params.get("id")
        repo = UsuariosRepository()

        if usuario_id:
            usuario = repo.get_by_id(usuario_id)
            if not usuario:
                raise NotFoundError(f"Usuario con id {usuario_id} no encontrado")
            return success_response(200, data=usuario)
        else:
            query_params = event.get("queryStringParameters") or {}
            rol = query_params.get("rol")
            usuarios = repo.list_all(rol=rol)
            return success_response(200, data=usuarios)
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al buscar usuarios: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
