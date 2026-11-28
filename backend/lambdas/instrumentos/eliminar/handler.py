import logging
from shared.auth_headers import extract_auth_context, is_admin
from shared.errors import AppException, BadRequestError, ConflictError, ForbiddenError, NotFoundError
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.services.s3_service import S3Service
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        instrumento_id = path_params.get("id")
        if not instrumento_id:
            raise BadRequestError("Falta el parámetro de ruta 'id'")

        repo = InstrumentosRepository()
        instrumento = repo.get_by_id(instrumento_id)
        if not instrumento:
            raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")

        user_id, user_role = extract_auth_context(event)
        if user_id and user_id != instrumento.get("propietario_id") and not is_admin(user_role):
            raise ForbiddenError("Solo el propietario o un administrador puede eliminar este instrumento")

        prestamos_repo = PrestamosRepository()
        prestamos = prestamos_repo.list_all(instrumento_id=instrumento_id)
        if any(p.get("estado") in ("activo", "vencido") for p in prestamos):
            raise ConflictError("No puedes eliminar un instrumento que tiene un préstamo activo")

        # If instrument has an image key, delete from S3 as well
        if instrumento.get("imagen_key"):
            try:
                s3_service = S3Service()
                s3_service.delete_file(instrumento["imagen_key"])
            except Exception as e:
                logger.warning(f"No se pudo eliminar la imagen de S3: {str(e)}")

        repo.delete(instrumento_id)
        return success_response(200, message=f"Instrumento {instrumento_id} eliminado exitosamente")
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al eliminar instrumento: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
