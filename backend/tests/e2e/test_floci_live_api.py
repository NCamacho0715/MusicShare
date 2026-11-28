import json
import os
from pathlib import Path
import time
import uuid

import pytest
import requests

from shared.aws_clients import get_boto3_client


def _resolve_api_base_url() -> str:
    env_url = os.environ.get("MUSICSHARE_API_BASE_URL", "").strip()
    if env_url:
        return env_url.rstrip("/")

    tfstate_path = (
        Path(__file__).resolve().parents[2] / "infrastructure" / "terraform.tfstate"
    )
    if tfstate_path.exists():
        try:
            state = json.loads(tfstate_path.read_text(encoding="utf-8"))
            outputs = state.get("outputs", {})
            invoke_val = outputs.get("api_gateway_invoke_url", {}).get("value")
            if invoke_val:
                return str(invoke_val).strip().rstrip("/")
            api_id = outputs.get("api_id", {}).get("value")
            if api_id:
                return f"http://localhost:4566/restapis/{api_id}/local/_user_request_"
        except Exception:
            pass
    return ""


def _require_live_floci() -> str:
    api_base = _resolve_api_base_url()
    if not api_base:
        pytest.skip("No se encontró URL de API Gateway en terraform.tfstate")

    try:
        health = requests.get("http://localhost:4566/_floci/health", timeout=3)
        if health.status_code >= 500:
            pytest.skip("Floci no está saludable")
    except requests.RequestException:
        pytest.skip("Floci no disponible en http://localhost:4566")

    return api_base


def test_live_floci_end_to_end_flows():
    api_base = _require_live_floci()
    suffix = uuid.uuid4().hex[:8]

    created_loans: list[str] = []
    created_instruments: list[str] = []
    created_users: list[str] = []

    try:
        # 1. Preflight CORS OPTIONS
        opt_resp = requests.options(f"{api_base}/instrumentos", timeout=15)
        assert opt_resp.status_code == 200
        assert opt_resp.headers.get("Access-Control-Allow-Origin") == "*"
        allow_headers = opt_resp.headers.get("Access-Control-Allow-Headers", "")
        assert "X-User-Name" in allow_headers
        assert "X-User-Email" in allow_headers
        assert "PATCH" in opt_resp.headers.get("Access-Control-Allow-Methods", "")

        # 2. CRUD /usuarios + conflicto 409
        owner_resp = requests.post(
            f"{api_base}/usuarios",
            json={
                "nombre": "Laura",
                "apellido": "E2E",
                "correo": f"owner.{suffix}@musicshare.test",
                "telefono": "+573001112233",
                "rol": "propietario",
                "estado": "activo",
            },
            timeout=20,
        )
        assert owner_resp.status_code == 201, owner_resp.text
        owner_id = owner_resp.json()["data"]["id"]
        created_users.append(owner_id)

        dup_resp = requests.post(
            f"{api_base}/usuarios",
            json={
                "nombre": "Dup",
                "apellido": "E2E",
                "correo": f"owner.{suffix}@musicshare.test",
                "rol": "musico",
            },
            timeout=20,
        )
        assert dup_resp.status_code == 409

        borrower_resp = requests.post(
            f"{api_base}/usuarios",
            json={
                "nombre": "Mateo",
                "apellido": "E2E",
                "correo": f"borrower.{suffix}@musicshare.test",
                "rol": "estudiante",
            },
            timeout=20,
        )
        assert borrower_resp.status_code == 201, borrower_resp.text
        borrower_id = borrower_resp.json()["data"]["id"]
        created_users.append(borrower_id)

        upd_usr = requests.put(
            f"{api_base}/usuarios/{owner_id}",
            json={"telefono": "+573119998877"},
            timeout=20,
        )
        assert upd_usr.status_code == 200
        assert upd_usr.json()["data"]["telefono"] == "+573119998877"

        list_usr = requests.get(f"{api_base}/usuarios", timeout=20)
        assert list_usr.status_code == 200
        assert any(u["id"] == owner_id for u in list_usr.json()["data"])

        # 3. CRUD /instrumentos + autorizacion + subida S3
        owner_headers = {"X-User-Id": owner_id, "X-User-Role": "propietario"}
        borrower_headers = {"X-User-Id": borrower_id, "X-User-Role": "estudiante"}

        inst_resp = requests.post(
            f"{api_base}/instrumentos",
            headers=owner_headers,
            json={
                "nombre": f"Guitarra Live {suffix}",
                "marca": "Yamaha",
                "modelo": "C40",
                "categoria": "cuerdas",
                "descripcion": "Instrumento de prueba E2E real contra Floci.",
                "ubicacion": "Sala Norte",
                "condicion": "excelente",
            },
            timeout=20,
        )
        assert inst_resp.status_code == 201, inst_resp.text
        inst_id = inst_resp.json()["data"]["id"]
        created_instruments.append(inst_id)

        # Filtro por categoria
        cat_resp = requests.get(f"{api_base}/instrumentos?categoria=cuerdas", timeout=20)
        assert cat_resp.status_code == 200
        assert any(i["id"] == inst_id for i in cat_resp.json()["data"])

        # Bloqueo 403 al editar con otro usuario
        forb_resp = requests.put(
            f"{api_base}/instrumentos/{inst_id}",
            headers=borrower_headers,
            json={"nombre": "Intento No Autorizado"},
            timeout=20,
        )
        assert forb_resp.status_code == 403

        # Edicion legitima (nombre, ubicacion, estado inactivo -> disponible)
        edit_resp = requests.put(
            f"{api_base}/instrumentos/{inst_id}",
            headers=owner_headers,
            json={
                "nombre": f"Guitarra Editada {suffix}",
                "ubicacion": "Sala Sur",
                "estado": "inactivo",
            },
            timeout=20,
        )
        assert edit_resp.status_code == 200
        assert edit_resp.json()["data"]["ubicacion"] == "Sala Sur"
        assert edit_resp.json()["data"]["estado"] == "inactivo"

        reactivate_resp = requests.put(
            f"{api_base}/instrumentos/{inst_id}",
            headers=owner_headers,
            json={"estado": "disponible"},
            timeout=20,
        )
        assert reactivate_resp.status_code == 200

        # Presigned URL + PUT directo a S3 + GET verificacion
        img_url_resp = requests.post(
            f"{api_base}/instrumentos/{inst_id}/imagen-url",
            headers=owner_headers,
            json={"nombre_archivo": "foto-e2e.png", "content_type": "image/png"},
            timeout=20,
        )
        assert img_url_resp.status_code == 200, img_url_resp.text
        img_data = img_url_resp.json()["data"]
        assert img_data["upload_url"].startswith("http://localhost:4566/")
        assert img_data["public_url"].startswith("http://localhost:4566/")

        png_payload = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-e2e"
        s3_put = requests.put(
            img_data["upload_url"],
            data=png_payload,
            headers={"Content-Type": "image/png"},
            timeout=15,
        )
        assert s3_put.status_code in (200, 204), s3_put.text

        s3_get = requests.get(img_data["public_url"], timeout=15)
        assert s3_get.status_code == 200
        assert s3_get.content == png_payload

        # 4. Prestamo normal + bloqueo DELETE con prestamo activo
        loan1_resp = requests.post(
            f"{api_base}/prestamos",
            json={
                "instrumento_id": inst_id,
                "solicitante_id": borrower_id,
                "propietario_id": owner_id,
                "fecha_inicio": "2026-11-27T00:00:00Z",
                "fecha_vencimiento": "2026-12-05T23:59:59Z",
            },
            timeout=20,
        )
        assert loan1_resp.status_code == 201, loan1_resp.text
        loan1_id = loan1_resp.json()["data"]["id"]
        created_loans.append(loan1_id)

        act1 = requests.put(
            f"{api_base}/prestamos/{loan1_id}",
            json={"estado": "activo"},
            timeout=20,
        )
        assert act1.status_code == 200

        del_inst_conflict = requests.delete(
            f"{api_base}/instrumentos/{inst_id}",
            headers=owner_headers,
            timeout=20,
        )
        assert del_inst_conflict.status_code == 409

        del_usr_conflict = requests.delete(
            f"{api_base}/usuarios/{owner_id}",
            timeout=20,
        )
        assert del_usr_conflict.status_code == 409

        ret1 = requests.put(
            f"{api_base}/prestamos/{loan1_id}",
            json={"estado": "devuelto"},
            timeout=20,
        )
        assert ret1.status_code == 200
        inst_after_ret = requests.get(f"{api_base}/instrumentos/{inst_id}", timeout=20).json()["data"]
        assert inst_after_ret["estado"] == "disponible"

        # 5. Flujo Asincrono 1: Dano -> SQS -> Lambda Mantenimiento -> DynamoDB + SNS
        loan2_resp = requests.post(
            f"{api_base}/prestamos",
            json={
                "instrumento_id": inst_id,
                "solicitante_id": borrower_id,
                "propietario_id": owner_id,
                "fecha_inicio": "2026-11-27T00:00:00Z",
                "fecha_vencimiento": "2026-12-05T23:59:59Z",
            },
            timeout=20,
        )
        assert loan2_resp.status_code == 201
        loan2_id = loan2_resp.json()["data"]["id"]
        created_loans.append(loan2_id)

        assert (
            requests.put(
                f"{api_base}/prestamos/{loan2_id}",
                json={"estado": "activo"},
                timeout=20,
            ).status_code
            == 200
        )

        dmg_resp = requests.put(
            f"{api_base}/prestamos/{loan2_id}",
            json={"estado": "dañado", "observaciones": "Clavija quebrada E2E"},
            timeout=20,
        )
        assert dmg_resp.status_code == 200

        maintained = False
        for _ in range(30):
            inst_state = requests.get(f"{api_base}/instrumentos/{inst_id}", timeout=15).json()["data"]
            if inst_state.get("estado") == "en_mantenimiento":
                assert inst_state.get("condicion") == "dañado"
                maintained = True
                break
            time.sleep(0.5)
        assert maintained, "La cola SQS no disparó musicshare-mantenimiento a tiempo"

        # 6. Flujo Asincrono 2: EventBridge -> Lambda Vencimientos
        events_client = get_boto3_client("events")
        targets = events_client.list_targets_by_rule(
            Rule="musicshare-revisar-vencimientos-rule"
        ).get("Targets", [])
        assert any("vencimientos" in t.get("Arn", "") for t in targets)

        inst2_resp = requests.post(
            f"{api_base}/instrumentos",
            headers=owner_headers,
            json={
                "nombre": f"Teclado Vencimiento {suffix}",
                "marca": "Roland",
                "modelo": "FP-30",
                "categoria": "teclados",
                "descripcion": "Instrumento para probar Lambda de vencimientos.",
            },
            timeout=20,
        )
        assert inst2_resp.status_code == 201
        inst2_id = inst2_resp.json()["data"]["id"]
        created_instruments.append(inst2_id)

        loan3_resp = requests.post(
            f"{api_base}/prestamos",
            json={
                "instrumento_id": inst2_id,
                "solicitante_id": borrower_id,
                "propietario_id": owner_id,
                "fecha_inicio": "2020-01-01T00:00:00Z",
                "fecha_vencimiento": "2020-01-05T00:00:00Z",
            },
            timeout=20,
        )
        assert loan3_resp.status_code == 201
        loan3_id = loan3_resp.json()["data"]["id"]
        created_loans.append(loan3_id)

        assert (
            requests.put(
                f"{api_base}/prestamos/{loan3_id}",
                json={"estado": "activo"},
                timeout=20,
            ).status_code
            == 200
        )

        lambda_client = get_boto3_client("lambda")
        inv_resp = lambda_client.invoke(
            FunctionName="musicshare-vencimientos",
            InvocationType="RequestResponse",
            Payload=b"{}",
        )
        summary = json.loads(inv_resp["Payload"].read().decode("utf-8"))
        assert summary["vencidos"] >= 1

        loan3_after = requests.get(f"{api_base}/prestamos/{loan3_id}", timeout=20).json()["data"]
        assert loan3_after["estado"] == "vencido"
        assert loan3_after["notificacion_vencimiento_enviada"] is True

    finally:
        for lid in created_loans:
            try:
                requests.delete(f"{api_base}/prestamos/{lid}", timeout=10)
            except Exception:
                pass
        for iid in created_instruments:
            try:
                requests.delete(
                    f"{api_base}/instrumentos/{iid}",
                    headers={"X-User-Id": "admin", "X-User-Role": "administrador"},
                    timeout=10,
                )
            except Exception:
                pass
        for uid in created_users:
            try:
                requests.delete(f"{api_base}/usuarios/{uid}", timeout=10)
            except Exception:
                pass
