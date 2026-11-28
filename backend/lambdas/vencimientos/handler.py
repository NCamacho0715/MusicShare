import logging
from shared.dates import days_until, is_past, now_iso
from shared.repositories.instrumentos_repository import InstrumentosRepository
from shared.repositories.prestamos_repository import PrestamosRepository
from shared.repositories.usuarios_repository import UsuariosRepository
from shared.services.sns_service import SNSService

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Scheduled Lambda activated by EventBridge (daily).
    Scans active loans, checks due dates, transitions expired loans to 'vencido',
    and publishes SNS alerts for upcoming or expired loans without duplicates.
    """
    logger.info("Iniciando revisión de vencimientos de préstamos...")
    prestamos_repo = PrestamosRepository()
    sns_service = SNSService()

    prestamos_activos = prestamos_repo.list_all(estado="activo")
    logger.info(f"Se encontraron {len(prestamos_activos)} préstamos activos")

    total_revisados = len(prestamos_activos)
    total_vencidos = 0
    total_alertados_proximos = 0

    for prestamo in prestamos_activos:
        prestamo_id = prestamo["id"]
        fecha_vencimiento = prestamo.get("fecha_vencimiento")
        ya_notificado = prestamo.get("notificacion_vencimiento_enviada", False)

        if not fecha_vencimiento:
            continue

        instrumento_nombre = None
        solicitante_correo = None
        try:
            inst = InstrumentosRepository().get_by_id(prestamo["instrumento_id"])
            if inst:
                instrumento_nombre = inst.get("nombre")
        except Exception:
            pass
        try:
            usr = UsuariosRepository().get_by_id(prestamo["solicitante_id"])
            if usr:
                solicitante_correo = usr.get("correo")
        except Exception:
            pass

        # Case 1: Loan is expired (fecha_vencimiento < now)
        if is_past(fecha_vencimiento):
            logger.info(f"Préstamo {prestamo_id} vencido (vencimiento: {fecha_vencimiento})")
            prestamos_repo.update(prestamo_id, {
                "estado": "vencido",
                "notificacion_vencimiento_enviada": True
            })

            sns_service.publish_notification(
                subject="Alerta: Préstamo Vencido",
                message_data={
                    "prestamo_id": prestamo_id,
                    "instrumento_id": prestamo["instrumento_id"],
                    "instrumento_nombre": instrumento_nombre,
                    "solicitante_id": prestamo["solicitante_id"],
                    "solicitante_correo": solicitante_correo,
                    "fecha_vencimiento": fecha_vencimiento,
                    "mensaje": f"El préstamo {prestamo_id} ha vencido el {fecha_vencimiento}."
                },
                tipo_evento="prestamo_vencido"
            )
            total_vencidos += 1

        # Case 2: Loan is due soon (within next 3 days) and not already notified
        elif days_until(fecha_vencimiento) <= 3.0 and not ya_notificado:
            logger.info(f"Préstamo {prestamo_id} próximo a vencer (en {days_until(fecha_vencimiento):.1f} días)")
            prestamos_repo.update(prestamo_id, {
                "notificacion_vencimiento_enviada": True
            })

            sns_service.publish_notification(
                subject="Aviso: Préstamo Próximo a Vencer",
                message_data={
                    "prestamo_id": prestamo_id,
                    "instrumento_id": prestamo["instrumento_id"],
                    "instrumento_nombre": instrumento_nombre,
                    "solicitante_id": prestamo["solicitante_id"],
                    "solicitante_correo": solicitante_correo,
                    "fecha_vencimiento": fecha_vencimiento,
                    "mensaje": f"El préstamo {prestamo_id} vencerá el {fecha_vencimiento}."
                },
                tipo_evento="prestamo_proximo_a_vencer"
            )
            total_alertados_proximos += 1

    summary = {
        "revisados": total_revisados,
        "vencidos": total_vencidos,
        "alertados_proximos": total_alertados_proximos,
        "timestamp": now_iso()
    }
    logger.info(f"Revisión de vencimientos finalizada: {summary}")
    return summary
