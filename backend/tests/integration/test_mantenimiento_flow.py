from unittest.mock import MagicMock
from lambdas.mantenimiento.handler import lambda_handler as mantenimiento_handler

def test_mantenimiento_procesar_danio():
    event = {
        "Records": [
            {
                "messageId": "msg-001",
                "body": '{"event_id": "evt-1", "prestamo_id": "p-1", "instrumento_id": "inst-1", "tipo_evento": "instrumento_daniado"}'
            }
        ]
    }

    mock_repo = MagicMock()
    mock_repo.get_by_id.return_value = {
        "id": "inst-1",
        "nombre": "Violín",
        "marca": "Yamaha",
        "estado": "prestado",
        "propietario_id": "usr-prop"
    }
    mock_sns = MagicMock()

    with MagicMock() as mock_context:
        from unittest.mock import patch
        with patch("lambdas.mantenimiento.handler.InstrumentosRepository", return_value=mock_repo):
            with patch("lambdas.mantenimiento.handler.SNSService", return_value=mock_sns):
                result = mantenimiento_handler(event, mock_context)
                assert result["status"] == "success"
                assert result["procesados"] == 1
                mock_repo.update.assert_called_with("inst-1", {"estado": "en_mantenimiento"})
                mock_sns.publish_notification.assert_called_once()
