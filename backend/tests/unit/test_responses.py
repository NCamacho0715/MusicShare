import json
from decimal import Decimal
from shared.responses import success_response, error_response

def test_success_response():
    resp = success_response(200, data={"key": "value", "dec": Decimal("15.5")}, message="Exito")
    assert resp["statusCode"] == 200
    assert resp["headers"]["Content-Type"] == "application/json"
    body = json.loads(resp["body"])
    assert body["message"] == "Exito"
    assert body["data"]["key"] == "value"
    assert body["data"]["dec"] == 15.5

def test_error_response():
    resp = error_response(404, "NOT_FOUND", "Recurso no encontrado", details={"id": "123"})
    assert resp["statusCode"] == 404
    body = json.loads(resp["body"])
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["message"] == "Recurso no encontrado"
    assert body["error"]["details"]["id"] == "123"
