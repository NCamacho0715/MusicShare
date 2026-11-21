import logging
from shared.errors import AppException, NotFoundError
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.responses import error_response, success_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        instrumento_id = path_params.get("id")
        repo = InstrumentosRepository()

        if instrumento_id:
            instrumento = repo.get_by_id(instrumento_id)
            if not instrumento:
                raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")
            return success_response(200, data=instrumento)
        else:
            query_params = event.get("queryStringParameters") or {}
            propietario_id = query_params.get("propietario_id")
            estado = query_params.get("estado")
            categoria = query_params.get("categoria")
            instrumentos = repo.list_all(
                propietario_id=propietario_id,
                estado=estado,
                categoria=categoria
            )
            return success_response(200, data=instrumentos)
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al buscar instrumentos: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
