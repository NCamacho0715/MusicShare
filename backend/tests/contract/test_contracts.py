import json
from unittest.mock import MagicMock, patch
from lambdas.usuarios.crear.handler import lambda_handler as crear_usuario
from lambdas.usuarios.buscar.handler import lambda_handler as buscar_usuarios
from lambdas.instrumentos.crear.handler import lambda_handler as crear_instrumento

def test_contract_crear_usuario_validation_error():
    event = {
        "body": json.dumps({"nombre": "Test"}) # Missing required fields
    }
    resp = crear_usuario(event, None)
    assert resp["statusCode"] == 422
    body = json.loads(resp["body"])
    assert "error" in body
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "Content-Type" in resp["headers"]

def test_contract_buscar_usuario_not_found():
    with patch("lambdas.usuarios.buscar.handler.UsuariosRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_id.return_value = None
        mock_repo_cls.return_value = mock_repo

        event = {"pathParameters": {"id": "usr-inexistente"}}
        resp = buscar_usuarios(event, None)
        assert resp["statusCode"] == 404
        body = json.loads(resp["body"])
        assert body["error"]["code"] == "NOT_FOUND"

def test_contract_crear_instrumento_success():
    with patch("lambdas.instrumentos.crear.handler.InstrumentosRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.create.return_value = {
            "id": "inst-100",
            "nombre": "Batería Pearl",
            "marca": "Pearl",
            "modelo": "Export",
            "categoria": "Percusión",
            "estado": "disponible",
            "propietario_id": "usr-1"
        }
        mock_repo_cls.return_value = mock_repo

        event = {
            "body": json.dumps({
                "nombre": "Batería Pearl",
                "marca": "Pearl",
                "modelo": "Export",
                "categoria": "Percusión",
                "propietario_id": "usr-1"
            })
        }
        resp = crear_instrumento(event, None)
        assert resp["statusCode"] == 201
        body = json.loads(resp["body"])
        assert body["data"]["id"] == "inst-100"
        assert body["data"]["categoria"] == "Percusión"
