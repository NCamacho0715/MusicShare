import uuid
from typing import Any, Dict, List, Optional
from boto3.dynamodb.conditions import Key
from shared.aws_clients import get_dynamodb_resource
from shared.config import Config
from shared.dates import now_iso
from shared.errors import ConflictError, NotFoundError

class UsuariosRepository:
    def __init__(self, table_name: Optional[str] = None):
        self.dynamodb = get_dynamodb_resource()
        self.table_name = table_name or Config.USUARIOS_TABLE
        self.table = self.dynamodb.Table(self.table_name)

    def get_by_id(self, usuario_id: str) -> Optional[Dict[str, Any]]:
        res = self.table.get_item(Key={"id": usuario_id})
        return res.get("Item")

    def get_by_email(self, correo: str) -> Optional[Dict[str, Any]]:
        res = self.table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("correo").eq(correo)
        )
        items = res.get("Items", [])
        return items[0] if items else None

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_by_email(data["correo"])
        if existing:
            raise ConflictError(f"Ya existe un usuario registrado con el correo {data['correo']}")

        timestamp = now_iso()
        item = {
            "id": data.get("id") or str(uuid.uuid4()),
            "nombre": data["nombre"],
            "apellido": data["apellido"],
            "correo": data["correo"],
            "telefono": data.get("telefono"),
            "rol": data["rol"],
            "estado": data.get("estado", "activo"),
            "created_at": timestamp,
            "updated_at": timestamp
        }
        # Filter None values for DynamoDB compatibility
        item = {k: v for k, v in item.items() if v is not None}
        self.table.put_item(Item=item)
        return item

    def update(self, usuario_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        current = self.get_by_id(usuario_id)
        if not current:
            raise NotFoundError(f"Usuario con id {usuario_id} no encontrado")

        if "correo" in updates and updates["correo"] != current.get("correo"):
            existing = self.get_by_email(updates["correo"])
            if existing and existing["id"] != usuario_id:
                raise ConflictError(f"El correo {updates['correo']} ya está en uso por otro usuario")

        updates["updated_at"] = now_iso()
        
        # Build update expression
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
            Key={"id": usuario_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )
        return res.get("Attributes", {})

    def delete(self, usuario_id: str) -> bool:
        current = self.get_by_id(usuario_id)
        if not current:
            raise NotFoundError(f"Usuario con id {usuario_id} no encontrado")
        self.table.delete_item(Key={"id": usuario_id})
        return True

    def list_all(self, rol: Optional[str] = None) -> List[Dict[str, Any]]:
        if rol:
            res = self.table.query(
                IndexName="rol-index",
                KeyConditionExpression=Key("rol").eq(rol)
            )
            return res.get("Items", [])
        res = self.table.scan()
        return res.get("Items", [])
