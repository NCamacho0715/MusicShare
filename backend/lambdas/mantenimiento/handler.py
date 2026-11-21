import json
import logging
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.services.sns_service import SNSService

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Handler activated by SQS to process damaged instrument reports.
    Changes instrument state to 'en_mantenimiento' and sends an SNS notification.
    Ensures idempotency.
    """
    logger.info(f"Procesando lote de eventos SQS: {len(event.get('Records', []))} registros")
    instrumentos_repo = InstrumentosRepository()
    sns_service = SNSService()

    procesados = 0
    errores = 0

    for record in event.get("Records", []):
        try:
            body = record.get("body", "{}")
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            instrumento_id = data.get("instrumento_id")
            prestamo_id = data.get("prestamo_id")
            event_id = data.get("event_id")

            if not instrumento_id:
                logger.warning(f"Mensaje SQS sin instrumento_id: {data}")
                continue

            # Fetch instrument
            instrumento = instrumentos_repo.get_by_id(instrumento_id)
            if not instrumento:
                logger.warning(f"Instrumento {instrumento_id} no encontrado en DynamoDB")
                continue

            # Idempotent state change
            if instrumento.get("estado") != "en_mantenimiento":
                instrumentos_repo.update(instrumento_id, {"estado": "en_mantenimiento"})
                logger.info(f"Instrumento {instrumento_id} marcado como 'en_mantenimiento'")
            else:
                logger.info(f"Instrumento {instrumento_id} ya se encontraba 'en_mantenimiento' (idempotente)")

            # Publish notification to SNS
            notification_data = {
                "event_id": event_id,
                "prestamo_id": prestamo_id,
                "instrumento_id": instrumento_id,
                "instrumento_nombre": instrumento.get("nombre"),
                "instrumento_marca": instrumento.get("marca"),
                "propietario_id": instrumento.get("propietario_id"),
                "mensaje": f"El instrumento '{instrumento.get('nombre')}' ha sido reportado con daño y puesto en mantenimiento."
            }
            sns_service.publish_notification(
                subject="Alerta: Instrumento Dañado puesto en Mantenimiento",
                message_data=notification_data,
                tipo_evento="instrumento_daniado"
            )

            procesados += 1
        except Exception as e:
            logger.error(f"Error procesando registro SQS {record.get('messageId')}: {str(e)}", exc_info=True)
            errores += 1

    return {
        "status": "success",
        "procesados": procesados,
        "errores": errores
    }
