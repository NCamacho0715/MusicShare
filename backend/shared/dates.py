from datetime import datetime, timezone

def now_iso() -> str:
    """Returns current UTC timestamp formatted as ISO 8601 string ending with Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def parse_iso(iso_str: str) -> datetime:
    """Parses an ISO 8601 string to a timezone-aware datetime object."""
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    dt = datetime.fromisoformat(iso_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def is_past(iso_str: str) -> bool:
    """Checks if the given ISO 8601 timestamp is in the past compared to current UTC time."""
    dt = parse_iso(iso_str)
    return dt < datetime.now(timezone.utc)

def days_until(iso_str: str) -> float:
    """Returns the number of days until the given ISO 8601 timestamp (negative if in the past)."""
    dt = parse_iso(iso_str)
    diff = dt - datetime.now(timezone.utc)
    return diff.total_seconds() / 86400.0
