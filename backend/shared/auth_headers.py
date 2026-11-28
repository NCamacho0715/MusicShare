from typing import Any, Dict, Optional, Tuple

ROLE_ALIASES = {
    "owner": "propietario",
    "propietario": "propietario",
    "admin": "administrador",
    "administrador": "administrador",
    "musician": "musico",
    "musico": "musico",
    "músico": "musico",
    "student": "estudiante",
    "estudiante": "estudiante",
}


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    cleaned = role.strip().lower()
    return ROLE_ALIASES.get(cleaned, cleaned)


def is_admin(role: Optional[str]) -> bool:
    return normalize_role(role) == "administrador"


def extract_auth_context(event: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts simulated authentication headers X-User-Id and X-User-Role from API Gateway event.
    Headers can be case-insensitive in API Gateway.
    """
    headers = event.get("headers") or {}
    # Lowercase dictionary keys for case-insensitive lookup
    normalized_headers = {k.lower(): v for k, v in headers.items()}

    user_id = normalized_headers.get("x-user-id")
    if isinstance(user_id, str):
        user_id = user_id.strip() or None

    user_role = normalize_role(normalized_headers.get("x-user-role"))

    return user_id, user_role
