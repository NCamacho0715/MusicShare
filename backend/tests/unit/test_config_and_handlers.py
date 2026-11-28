import json
from unittest.mock import MagicMock, patch
from lambdas.instrumentos.actualizar.handler import lambda_handler as actualizar_instrumento
from lambdas.instrumentos.crear.handler import lambda_handler as crear_instrumento
from lambdas.instrumentos.eliminar.handler import lambda_handler as eliminar_instrumento
from lambdas.usuarios.eliminar.handler import lambda_handler as eliminar_usuario
from shared.config import Config


def test_config_rewrites_localhost_to_floci_inside_lambda(monkeypatch):
    monkeypatch.setenv("AWS_ENDPOINT_URL", "http://localhost:4566")
    monkeypatch.setenv("AWS_LAMBDA_FUNCTION_NAME", "musicshare-instrumentos_buscar")
    monkeypatch.setenv("DANOS_QUEUE_URL", "http://localhost:4566/000000000000/musicshare-danos-queue")
    monkeypatch.delenv("PUBLIC_S3_ENDPOINT_URL", raising=False)

    assert Config.get_aws_endpoint_url() == "http://floci:4566"
    assert Config.get_public_s3_endpoint_url() == "http://localhost:4566"
    assert (
        Config.get_danos_queue_url()
        == "http://floci:4566/000000000000/musicshare-danos-queue"
    )


def test_config_returns_none_in_production(monkeypatch):
    monkeypatch.setenv("AWS_ENDPOINT_URL", "")
    monkeypatch.setenv("AWS_LAMBDA_FUNCTION_NAME", "musicshare-instrumentos_buscar")

    assert Config.get_aws_endpoint_url() is None
    assert Config.get_public_s3_endpoint_url() is None


def test_crear_instrumento_uses_x_user_id_header_fallback():
    with patch("lambdas.instrumentos.crear.handler.InstrumentosRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.create.side_effect = lambda d: {**d, "id": "inst-hdr-1"}
        mock_repo_cls.return_value = mock_repo

        event = {
            "headers": {"X-User-Id": "usr-hdr-1", "X-User-Role": "owner"},
            "body": json.dumps({
                "nombre": "Bajo Eléctrico",
                "marca": "Fender",
                "modelo": "Jazz Bass",
                "categoria": "cuerdas",
                "ubicacion": "Sala Norte",
                "condicion": "excelente",
            }),
        }
        resp = crear_instrumento(event, None)
        assert resp["statusCode"] == 201
        data = json.loads(resp["body"])["data"]
        assert data["propietario_id"] == "usr-hdr-1"
        assert data["ubicacion"] == "Sala Norte"
        assert data["condicion"] == "excelente"


def test_actualizar_instrumento_enforces_ownership_and_allows_admin():
    with patch("lambdas.instrumentos.actualizar.handler.InstrumentosRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_id.return_value = {
            "id": "inst-1",
            "propietario_id": "usr-owner-1",
            "estado": "disponible",
        }
        mock_repo.update.return_value = {
            "id": "inst-1",
            "propietario_id": "usr-owner-1",
            "estado": "inactivo",
        }
        mock_repo_cls.return_value = mock_repo

        forbidden_resp = actualizar_instrumento(
            {
                "pathParameters": {"id": "inst-1"},
                "headers": {"X-User-Id": "usr-otro", "X-User-Role": "musician"},
                "body": json.dumps({"estado": "inactivo"}),
            },
            None,
        )
        assert forbidden_resp["statusCode"] == 403

        admin_resp = actualizar_instrumento(
            {
                "pathParameters": {"id": "inst-1"},
                "headers": {"X-User-Id": "usr-admin-1", "X-User-Role": "admin"},
                "body": json.dumps({"estado": "inactivo", "imagen_key": ""}),
            },
            None,
        )
        assert admin_resp["statusCode"] == 200
        mock_repo.update.assert_called_with("inst-1", {"estado": "inactivo", "imagen_key": ""})


def test_eliminar_instrumento_rejects_active_loan_with_409():
    with (
        patch("lambdas.instrumentos.eliminar.handler.InstrumentosRepository") as mock_inst_cls,
        patch("lambdas.instrumentos.eliminar.handler.PrestamosRepository") as mock_prest_cls,
    ):
        mock_inst_cls.return_value.get_by_id.return_value = {
            "id": "inst-1",
            "propietario_id": "usr-owner-1",
        }
        mock_prest_cls.return_value.list_all.return_value = [
            {"id": "p-1", "estado": "activo"}
        ]

        resp = eliminar_instrumento(
            {
                "pathParameters": {"id": "inst-1"},
                "headers": {"X-User-Id": "usr-owner-1", "X-User-Role": "propietario"},
            },
            None,
        )
        assert resp["statusCode"] == 409


def test_eliminar_usuario_rejects_active_loan_with_409():
    with (
        patch("lambdas.usuarios.eliminar.handler.PrestamosRepository") as mock_prest_cls,
        patch("lambdas.usuarios.eliminar.handler.InstrumentosRepository") as mock_inst_cls,
    ):
        mock_prest_cls.return_value.list_all.side_effect = [
            [{"id": "p-1", "estado": "activo"}],
            [],
        ]
        mock_inst_cls.return_value.list_all.return_value = []

        resp = eliminar_usuario({"pathParameters": {"id": "usr-1"}}, None)
        assert resp["statusCode"] == 409
