import unicodedata
import uuid
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from shared.aws_clients import get_dynamodb_resource
from shared.config import Config
from shared.dates import now_iso
from shared.errors import NotFoundError


def _normalize_text(value: str) -> str:
    nfkd = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch)).strip().lower()


class InstrumentosRepository:
    def __init__(self, table_name: Optional[str] = None):
        self.dynamodb = get_dynamodb_resource()
        self.table_name = table_name or Config.INSTRUMENTOS_TABLE
        self.table = self.dynamodb.Table(self.table_name)

    def get_by_id(self, instrumento_id: str) -> Optional[Dict[str, Any]]:
        res = self.table.get_item(Key={"id": instrumento_id})
        return res.get("Item")

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        timestamp = now_iso()
        item = {
            "id": data.get("id") or str(uuid.uuid4()),
            "nombre": data["nombre"],
            "marca": data["marca"],
            "modelo": data["modelo"],
            "categoria": data["categoria"],
            "descripcion": data.get("descripcion"),
            "ubicacion": data.get("ubicacion"),
            "condicion": data.get("condicion", "bueno"),
            "estado": data.get("estado", "disponible"),
            "propietario_id": data["propietario_id"],
            "imagen_key": data.get("imagen_key"),
            "created_at": timestamp,
            "updated_at": timestamp
        }
        item = {k: v for k, v in item.items() if v is not None}
        self.table.put_item(Item=item)
        return item

    def update(self, instrumento_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_by_id(instrumento_id)
        if not current:
            raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")

        updates["updated_at"] = now_iso()
        set_parts = []
        remove_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for k, v in updates.items():
            if k == "imagen_key" and v == "":
                remove_parts.append("#imagen_key")
                expr_attr_names["#imagen_key"] = "imagen_key"
            elif v is not None:
                set_parts.append(f"#{k} = :{k}")
                expr_attr_names[f"#{k}"] = k
                expr_attr_values[f":{k}"] = v

        if not set_parts and not remove_parts:
            return current

        expr_clauses = []
        if set_parts:
            expr_clauses.append("SET " + ", ".join(set_parts))
        if remove_parts:
            expr_clauses.append("REMOVE " + ", ".join(remove_parts))
        update_expr = " ".join(expr_clauses)

        kwargs: Dict[str, Any] = {
            "Key": {"id": instrumento_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeNames": expr_attr_names,
            "ReturnValues": "ALL_NEW",
        }
        if expr_attr_values:
            kwargs["ExpressionAttributeValues"] = expr_attr_values

        res = self.table.update_item(**kwargs)
        return res.get("Attributes", {})

    def delete(self, instrumento_id: str) -> bool:
        current = self.get_by_id(instrumento_id)
        if not current:
            raise NotFoundError(f"Instrumento con id {instrumento_id} no encontrado")
        self.table.delete_item(Key={"id": instrumento_id})
        return True

    def list_all(
        self,
        propietario_id: Optional[str] = None,
        estado: Optional[str] = None,
        categoria: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        categoria_norm = _normalize_text(categoria) if categoria else None

        if propietario_id:
            res = self.table.query(
                IndexName="propietario_id-index",
                KeyConditionExpression=Key("propietario_id").eq(propietario_id)
            )
            items = res.get("Items", [])
            if estado:
                items = [i for i in items if i.get("estado") == estado]
            if categoria_norm:
                items = [i for i in items if _normalize_text(i.get("categoria", "")) == categoria_norm]
            return items

        if estado:
            res = self.table.query(
                IndexName="estado-index",
                KeyConditionExpression=Key("estado").eq(estado)
            )
            items = res.get("Items", [])
            if categoria_norm:
                items = [i for i in items if _normalize_text(i.get("categoria", "")) == categoria_norm]
            return items

        if categoria:
            res = self.table.query(
                IndexName="categoria-index",
                KeyConditionExpression=Key("categoria").eq(categoria)
            )
            items = res.get("Items", [])
            if items:
                return items
            scan_res = self.table.scan()
            return [
                i for i in scan_res.get("Items", [])
                if _normalize_text(i.get("categoria", "")) == categoria_norm
            ]

        res = self.table.scan()
        return res.get("Items", [])
