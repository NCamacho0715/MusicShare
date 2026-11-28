import logging
from shared.errors import AppException
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        query_params = event.get("queryStringParameters") or {}
        instrumento_id = query_params.get("instrumento_id")
        solicitante_id = query_params.get("solicitante_id")
        propietario_id = query_params.get("propietario_id")
        estado = query_params.get("estado")

        repo = PrestamosRepository()
        prestamos = repo.list_all(
            instrumento_id=instrumento_id,
            solicitante_id=solicitante_id,
            propietario_id=propietario_id,
            estado=estado
        )
        return success_response(200, data=prestamos)
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al buscar préstamos: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
