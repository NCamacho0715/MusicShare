import uuid
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from shared.aws_clients import get_dynamodb_resource
from shared.config import Config
from shared.dates import now_iso
from shared.errors import NotFoundError

class PrestamosRepository:
    def __init__(self, table_name: Optional[str] = None):
        self.dynamodb = get_dynamodb_resource()
        self.table_name = table_name or Config.PRESTAMOS_TABLE
        self.table = self.dynamodb.Table(self.table_name)

    def get_by_id(self, prestamo_id: str) -> Optional[Dict[str, Any]]:
        res = self.table.get_item(Key={"id": prestamo_id})
        return res.get("Item")

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        timestamp = now_iso()
        item = {
            "id": data.get("id") or str(uuid.uuid4()),
            "instrumento_id": data["instrumento_id"],
            "solicitante_id": data["solicitante_id"],
            "propietario_id": data["propietario_id"],
            "fecha_inicio": data["fecha_inicio"],
            "fecha_vencimiento": data["fecha_vencimiento"],
            "fecha_devolucion": data.get("fecha_devolucion"),
            "estado": data.get("estado", "solicitado"),
            "observaciones": data.get("observaciones"),
            "notificacion_vencimiento_enviada": data.get("notificacion_vencimiento_enviada", False),
            "created_at": timestamp,
            "updated_at": timestamp
        }
        item = {k: v for k, v in item.items() if v is not None}
        self.table.put_item(Item=item)
        return item

    def update(self, prestamo_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_by_id(prestamo_id)
        if not current:
            raise NotFoundError(f"Préstamo con id {prestamo_id} no encontrado")

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
            Key={"id": prestamo_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )
        return res.get("Attributes", {})

    def delete(self, prestamo_id: str) -> bool:
        current = self.get_by_id(prestamo_id)
        if not current:
            raise NotFoundError(f"Préstamo con id {prestamo_id} no encontrado")
        self.table.delete_item(Key={"id": prestamo_id})
        return True

    def list_all(
        self,
        instrumento_id: Optional[str] = None,
        solicitante_id: Optional[str] = None,
        propietario_id: Optional[str] = None,
        estado: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if instrumento_id:
            res = self.table.query(
                IndexName="instrumento_id-index",
                KeyConditionExpression=Key("instrumento_id").eq(instrumento_id)
            )
            items = res.get("Items", [])
            if estado:
                items = [i for i in items if i.get("estado") == estado]
            return items

        if solicitante_id:
            res = self.table.query(
                IndexName="solicitante_id-index",
                KeyConditionExpression=Key("solicitante_id").eq(solicitante_id)
            )
            items = res.get("Items", [])
            if estado:
                items = [i for i in items if i.get("estado") == estado]
            return items

        if propietario_id:
            res = self.table.query(
                IndexName="propietario_id-index",
                KeyConditionExpression=Key("propietario_id").eq(propietario_id)
            )
            items = res.get("Items", [])
            if estado:
                items = [i for i in items if i.get("estado") == estado]
            return items

        if estado:
            res = self.table.query(
                IndexName="estado-index",
                KeyConditionExpression=Key("estado").eq(estado)
            )
            return res.get("Items", [])

        res = self.table.scan()
        return res.get("Items", [])
