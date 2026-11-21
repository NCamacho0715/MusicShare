import json
from unittest.mock import MagicMock, patch
from lambdas.usuarios.crear.handler import lambda_handler as crear_usuario
from lambdas.instrumentos.crear.handler import lambda_handler as crear_instrumento
from lambdas.instrumentos.imagen.handler import lambda_handler as generar_imagen_url
from lambdas.prestamos.crear.handler import lambda_handler as crear_prestamo
from lambdas.prestamos.actualizar.handler import lambda_handler as actualizar_prestamo
from lambdas.mantenimiento.handler import lambda_handler as mantenimiento_handler
from lambdas.vencimientos.handler import lambda_handler as vencimientos_handler

def test_complete_end_to_end_flow():
    """
    E2E flow test as specified in Section 10 of PLAN_BACKEND.md:
    1. Crear usuario
    2. Crear instrumento
    3. Generar URL de imagen y registrar clave
    4. Crear y activar préstamo
    5. Devolver préstamo
    6. Marcar otro préstamo como dañado y verificar evento SQS
    7. Ejecutar mantenimiento y verificar estado en_mantenimiento + SNS
    8. Crear préstamo vencido y verificar alerta EventBridge
    """
    # In-memory storage to simulate DB state throughout the e2e flow
    db_usuarios = {}
    db_instrumentos = {}
    db_prestamos = {}

    class MockUsuariosRepo:
        def create(self, data):
            u_id = data.get("id", "usr-e2e-1")
            data["id"] = u_id
            db_usuarios[u_id] = data
            return data
        def get_by_id(self, u_id):
            return db_usuarios.get(u_id)

    class MockInstrumentosRepo:
        def create(self, data):
            i_id = data.get("id", "inst-e2e-1")
            data["id"] = i_id
            db_instrumentos[i_id] = data
            return data
        def get_by_id(self, i_id):
            return db_instrumentos.get(i_id)
        def update(self, i_id, updates):
            db_instrumentos[i_id].update(updates)
            return db_instrumentos[i_id]

    class MockPrestamosRepo:
        def create(self, data):
            p_id = data.get("id", f"p-e2e-{len(db_prestamos)+1}")
            data["id"] = p_id
            db_prestamos[p_id] = data
            return data
        def get_by_id(self, p_id):
            return db_prestamos.get(p_id)
        def update(self, p_id, updates):
            db_prestamos[p_id].update(updates)
            return db_prestamos[p_id]
        def list_all(self, estado=None, **kwargs):
            if estado:
                return [p for p in db_prestamos.values() if p.get("estado") == estado]
            return list(db_prestamos.values())

    mock_sqs = MagicMock()
    mock_sns = MagicMock()
    mock_s3 = MagicMock()
    mock_s3.generate_upload_url.return_value = {
        "upload_url": "http://localhost:4566/musicshare-instrument-images/inst-e2e-1/foto.jpg?presigned",
        "key": "instrumentos/inst-e2e-1/foto.jpg",
        "bucket": "musicshare-instrument-images"
    }

    with patch("lambdas.usuarios.crear.handler.UsuariosRepository", MockUsuariosRepo), \
         patch("lambdas.instrumentos.crear.handler.InstrumentosRepository", MockInstrumentosRepo), \
         patch("lambdas.instrumentos.imagen.handler.InstrumentosRepository", MockInstrumentosRepo), \
         patch("lambdas.instrumentos.imagen.handler.S3Service", return_value=mock_s3), \
         patch("shared.services.prestamos_service.UsuariosRepository", MockUsuariosRepo), \
         patch("shared.services.prestamos_service.InstrumentosRepository", MockInstrumentosRepo), \
         patch("shared.services.prestamos_service.PrestamosRepository", MockPrestamosRepo), \
         patch("shared.services.prestamos_service.SQSService", return_value=mock_sqs), \
         patch("lambdas.prestamos.actualizar.handler.PrestamosRepository", MockPrestamosRepo), \
         patch("lambdas.mantenimiento.handler.InstrumentosRepository", MockInstrumentosRepo), \
         patch("lambdas.mantenimiento.handler.SNSService", return_value=mock_sns), \
         patch("lambdas.vencimientos.handler.PrestamosRepository", MockPrestamosRepo), \
         patch("lambdas.vencimientos.handler.SNSService", return_value=mock_sns):

        # Step 1: Crear usuario
        usr_resp = crear_usuario({
            "body": json.dumps({
                "nombre": "Carlos",
                "apellido": "Musico",
                "correo": "carlos.musico@e2e.test",
                "rol": "musico"
            })
        }, None)
        assert usr_resp["statusCode"] == 201
        usr_id = json.loads(usr_resp["body"])["data"]["id"]

        # Step 2: Crear instrumento
        inst_resp = crear_instrumento({
            "body": json.dumps({
                "nombre": "Violonchelo Yamaha",
                "marca": "Yamaha",
                "modelo": "VC5S",
                "categoria": "Cuerdas",
                "propietario_id": usr_id
            })
        }, None)
        assert inst_resp["statusCode"] == 201
        inst_id = json.loads(inst_resp["body"])["data"]["id"]
        assert db_instrumentos[inst_id]["estado"] == "disponible"

        # Step 3: Generar URL de imagen
        img_resp = generar_imagen_url({
            "pathParameters": {"id": inst_id},
            "body": json.dumps({"nombre_archivo": "violonchelo.jpg"})
        }, None)
        assert img_resp["statusCode"] == 200
        assert db_instrumentos[inst_id]["imagen_key"] == "instrumentos/inst-e2e-1/foto.jpg"

        # Step 4: Crear préstamo y activarlo
        p_resp = crear_prestamo({
            "body": json.dumps({
                "instrumento_id": inst_id,
                "solicitante_id": usr_id,
                "propietario_id": usr_id,
                "fecha_inicio": "2026-11-20T10:00:00Z",
                "fecha_vencimiento": "2026-11-30T10:00:00Z"
            })
        }, None)
        assert p_resp["statusCode"] == 201
        p_id = json.loads(p_resp["body"])["data"]["id"]

        # Activar préstamo
        act_resp = actualizar_prestamo({
            "pathParameters": {"id": p_id},
            "body": json.dumps({"estado": "activo"})
        }, None)
        assert act_resp["statusCode"] == 200
        assert db_instrumentos[inst_id]["estado"] == "prestado"

        # Step 5: Devolver préstamo
        dev_resp = actualizar_prestamo({
            "pathParameters": {"id": p_id},
            "body": json.dumps({"estado": "devuelto"})
        }, None)
        assert dev_resp["statusCode"] == 200
        assert db_instrumentos[inst_id]["estado"] == "disponible"

        # Step 6: Segundo préstamo y marcarlo como dañado
        p2_resp = crear_prestamo({
            "body": json.dumps({
                "instrumento_id": inst_id,
                "solicitante_id": usr_id,
                "propietario_id": usr_id,
                "fecha_inicio": "2026-11-20T10:00:00Z",
                "fecha_vencimiento": "2026-11-25T10:00:00Z"
            })
        }, None)
        p2_id = json.loads(p2_resp["body"])["data"]["id"]

        # Activar
        actualizar_prestamo({
            "pathParameters": {"id": p2_id},
            "body": json.dumps({"estado": "activo"})
        }, None)

        # Marcar como dañado -> triggers SQS send
        dan_resp = actualizar_prestamo({
            "pathParameters": {"id": p2_id},
            "body": json.dumps({"estado": "dañado"})
        }, None)
        assert dan_resp["statusCode"] == 200
        mock_sqs.send_damage_event.assert_called_once()
        sent_event = mock_sqs.send_damage_event.call_args[0][0]
        assert sent_event["tipo_evento"] == "instrumento_daniado"

        # Step 7: Ejecutar mantenimiento (simula procesamiento de cola SQS)
        sqs_event = {
            "Records": [
                {
                    "messageId": "msg-sqs-001",
                    "body": json.dumps(sent_event)
                }
            ]
        }
        mant_result = mantenimiento_handler(sqs_event, None)
        assert mant_result["procesados"] == 1
        assert db_instrumentos[inst_id]["estado"] == "en_mantenimiento"
        mock_sns.publish_notification.assert_called()

        # Step 8: Préstamo vencido y revisión de vencimientos
        # Set instrument to disponible and create a past-due active loan
        db_instrumentos[inst_id]["estado"] = "disponible"
        p3_resp = crear_prestamo({
            "body": json.dumps({
                "instrumento_id": inst_id,
                "solicitante_id": usr_id,
                "propietario_id": usr_id,
                "fecha_inicio": "2020-01-01T00:00:00Z",
                "fecha_vencimiento": "2020-01-10T00:00:00Z"
            })
        }, None)
        p3_id = json.loads(p3_resp["body"])["data"]["id"]
        actualizar_prestamo({
            "pathParameters": {"id": p3_id},
            "body": json.dumps({"estado": "activo"})
        }, None)

        # Disparar revisión de vencimientos (EventBridge)
        venc_summary = vencimientos_handler({}, None)
        assert venc_summary["vencidos"] >= 1
        assert db_prestamos[p3_id]["estado"] == "vencido"
        assert db_prestamos[p3_id]["notificacion_vencimiento_enviada"] is True
