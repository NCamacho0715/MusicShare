from unittest.mock import MagicMock, patch
from lambdas.vencimientos.handler import lambda_handler as vencimientos_handler

def test_vencimientos_alertas_y_transicion():
    # Setup mock active loans
    prestamos_activos = [
        {
            "id": "p-vencido",
            "instrumento_id": "inst-1",
            "solicitante_id": "usr-1",
            "fecha_vencimiento": "2020-01-01T00:00:00Z", # Past date
            "notificacion_vencimiento_enviada": False
        },
        {
            "id": "p-al-dia",
            "instrumento_id": "inst-2",
            "solicitante_id": "usr-2",
            "fecha_vencimiento": "2099-01-01T00:00:00Z", # Far future
            "notificacion_vencimiento_enviada": False
        }
    ]

    mock_repo = MagicMock()
    mock_repo.list_all.return_value = prestamos_activos
    mock_sns = MagicMock()

    with patch("lambdas.vencimientos.handler.PrestamosRepository", return_value=mock_repo):
        with patch("lambdas.vencimientos.handler.SNSService", return_value=mock_sns):
            summary = vencimientos_handler({}, None)
            assert summary["revisados"] == 2
            assert summary["vencidos"] == 1
            mock_repo.update.assert_called_with("p-vencido", {
                "estado": "vencido",
                "notificacion_vencimiento_enviada": True
            })
            mock_sns.publish_notification.assert_called_once()
