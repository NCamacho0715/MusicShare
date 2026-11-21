import json
import logging
from shared.errors import AppException, BadRequestError, NotFoundError
from shared.repositories.instrumentos_repository import InstrumentosRepository
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

        raw_body = event.get("body") or "{}"
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        nombre_archivo = body.get("nombre_archivo") or "imagen.jpg"

        repo = InstrumentosRepository()
        instrumento = repo.get_by_id(instrumento_id)
        if not instrumento:
            raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")

        s3_service = S3Service()
        presigned_data = s3_service.generate_upload_url(instrumento_id, nombre_archivo)

        # Update instrument record with image key
        repo.update(instrumento_id, {"imagen_key": presigned_data["key"]})

        return success_response(200, data=presigned_data, message="URL prefirmada generada exitosamente")
    except json.JSONDecodeError:
        return error_response(400, "BAD_REQUEST", "JSON inválido en el cuerpo de la petición")
    except AppException as e:
        return error_response(e.status_code, e.error_code, e.message, details=e.details)
    except Exception as e:
        logger.error(f"Error inesperado al generar URL de imagen: {str(e)}", exc_info=True)
        return error_response(500, "INTERNAL_ERROR", f"Error interno: {str(e)}")
