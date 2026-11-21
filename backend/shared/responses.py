import json
from decimal import Decimal
from typing import Any, Dict, Optional

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)

def success_response(status_code: int = 200, data: Any = None, message: Optional[str] = None) -> Dict[str, Any]:
    body = {}
    if message is not None:
        body["message"] = message
    if data is not None:
        body["data"] = data
    if not body:
        body = {"success": True}

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-User-Id,X-User-Role,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }

def error_response(status_code: int, error_code: str, message: str, details: Any = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {
        "error": {
            "code": error_code,
            "message": message
        }
    }
    if details is not None:
        body["error"]["details"] = details

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-User-Id,X-User-Role,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }
