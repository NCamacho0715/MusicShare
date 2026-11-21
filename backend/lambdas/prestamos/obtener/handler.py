import logging
from shared.errors import AppException, BadRequestError, NotFoundError
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

        repo = PrestamosRepository()
        prestamo = repo.get_by_id(prestamo_id)
        if not prestamo:
            raise NotFoundError(f"Préstamo con id {prestamo_id} no encontrado")

        return success_response(200, data=prestamo)
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al obtener préstamo: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
