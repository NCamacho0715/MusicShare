import logging
from shared.errors import AppException, BadRequestError, ConflictError
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.repositories.prestamos_repository import PrestamosRepository
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

        prestamos_repo = PrestamosRepository()
        como_solicitante = prestamos_repo.list_all(solicitante_id=usuario_id)
        como_propietario = prestamos_repo.list_all(propietario_id=usuario_id)
        if any(p.get("estado") in ("activo", "vencido") for p in como_solicitante + como_propietario):
            raise ConflictError("No puedes eliminar un usuario con préstamos activos.")

        instrumentos_repo = InstrumentosRepository()
        instrumentos_propios = instrumentos_repo.list_all(propietario_id=usuario_id)
        if any(i.get("estado") == "prestado" for i in instrumentos_propios):
            raise ConflictError("No puedes eliminar un usuario que tiene instrumentos actualmente prestados.")

        repo = UsuariosRepository()
        repo.delete(usuario_id)
        return success_response(200, message=f"Usuario {usuario_id} eliminado exitosamente")
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al eliminar usuario: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
