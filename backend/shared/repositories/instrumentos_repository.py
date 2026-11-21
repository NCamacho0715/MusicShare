import uuid
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from shared.aws_clients import get_dynamodb_resource
from shared.config import Config
from shared.dates import now_iso
from shared.errors import NotFoundError

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
        update_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for k, v in updates.items():
            if v is not None:
                update_parts.append(f"#{k} = :{k}")
                expr_attr_names[f"#{k}"] = k
                expr_attr_values[f":{k}"] = v

        if not update_parts:
            return current

        update_expr = "SET " + ", ".join(update_parts)
        res = self.table.update_item(
            Key={"id": instrumento_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )
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
        if propietario_id:
            res = self.table.query(
                IndexName="propietario_id-index",
                KeyConditionExpression=Key("propietario_id").eq(propietario_id)
            )
            items = res.get("Items", [])
            if estado:
                items = [i for i in items if i.get("estado") == estado]
            if categoria:
                items = [i for i in items if i.get("categoria") == categoria]
            return items

        if estado:
            res = self.table.query(
                IndexName="estado-index",
                KeyConditionExpression=Key("estado").eq(estado)
            )
            items = res.get("Items", [])
            if categoria:
                items = [i for i in items if i.get("categoria") == categoria]
            return items

        if categoria:
            res = self.table.query(
                IndexName="categoria-index",
                KeyConditionExpression=Key("categoria").eq(categoria)
            )
            return res.get("Items", [])

        res = self.table.scan()
        return res.get("Items", [])
