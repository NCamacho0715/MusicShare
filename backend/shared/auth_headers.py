from typing import Any, Dict, Optional, Tuple

def extract_auth_context(event: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts simulated authentication headers X-User-Id and X-User-Role from API Gateway event.
    Headers can be case-insensitive in API Gateway.
    """
    headers = event.get("headers") or {}
    # Lowercase dictionary keys for case-insensitive lookup
    normalized_headers = {k.lower(): v for k, v in headers.items()}
    
    user_id = normalized_headers.get("x-user-id")
    user_role = normalized_headers.get("x-user-role")
    
    return user_id, user_role
