from datetime import datetime, timezone, timedelta
from shared.dates import now_iso, parse_iso, is_past, days_until

def test_now_iso_format():
    iso_str = now_iso()
    assert iso_str.endswith("Z")
    dt = parse_iso(iso_str)
    assert dt.tzinfo is not None

def test_is_past():
    past_date = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    future_date = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    assert is_past(past_date) is True
    assert is_past(future_date) is False

def test_days_until():
    future_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    diff = days_until(future_date)
    assert 4.9 < diff < 5.1
