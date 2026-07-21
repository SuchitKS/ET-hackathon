"""MongoDB-backed persistent alert store.

Stores alerts in a `strata.alerts` collection.
Provides a stable identity and status lifecycle for alerts.
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from pymongo.mongo_client import MongoClient

_client = None
_db = None

def _get_db():
    """Lazy-init the MongoDB connection."""
    global _client, _db
    if _db is None:
        mongo_url = os.getenv("MONGO_URL")
        if not mongo_url:
            raise RuntimeError("MONGO_URL environment variable is not set")
        _client = MongoClient(mongo_url)
        _db = _client["strata"]
    return _db

def upsert_alert(alert_data: dict) -> dict:
    """
    Upsert an alert based on equipment_tag and message content.
    If it exists, return the existing alert (so status is preserved).
    If it does not exist, insert it with status='active'.
    """
    db = _get_db()
    col = db["alerts"]

    equipment_tag = alert_data.get("asset", "")
    message = alert_data.get("message", "")
    
    # Create a stable deduplication hash
    hash_input = f"{equipment_tag}::{message}".encode("utf-8")
    stable_hash = hashlib.sha256(hash_input).hexdigest()

    now = datetime.now(timezone.utc).isoformat()

    # Find existing
    existing = col.find_one({"dedup_hash": stable_hash})
    if existing:
        return existing

    # Create new
    new_alert = {
        "id": str(uuid.uuid4()),
        "dedup_hash": stable_hash,
        "type": alert_data.get("type", "warning"),
        "asset": equipment_tag,
        "message": message,
        "source": alert_data.get("source", "system"),
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "updated_by": None
    }
    
    col.insert_one(new_alert)
    return new_alert

def update_alert_status(alert_id: str, status: str, updated_by: str = None) -> bool:
    """Update the status of a specific alert."""
    db = _get_db()
    col = db["alerts"]
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = col.update_one(
        {"id": alert_id},
        {"$set": {
            "status": status,
            "updated_at": now,
            "updated_by": updated_by
        }}
    )
    return result.modified_count > 0

def get_alerts(include_resolved: bool = True) -> list[dict]:
    """
    Return all alerts, sorted with 'active' first, then 'monitoring', 
    then others last.
    """
    db = _get_db()
    col = db["alerts"]
    
    query = {}
    if not include_resolved:
        query["status"] = {"$in": ["active", "monitoring"]}
        
    alerts = list(col.find(query, {"_id": 0}))
    
    # Sort order defined in the spec
    status_weights = {
        "active": 0,
        "monitoring": 1,
        "false_positive": 2,
        "cleared": 3,
        "under_maintenance": 4
    }
    
    alerts.sort(key=lambda a: (status_weights.get(a.get("status", "active"), 99), a.get("created_at", "")))
    return alerts
