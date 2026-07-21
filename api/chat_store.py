"""MongoDB-backed conversation store.

Stores chat sessions in a `strata.conversations` collection.
Each document represents one session and contains an array of messages.
"""
import os
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


def get_or_create_session(session_id: str) -> dict:
    """Return the conversation doc for *session_id*, creating it if needed."""
    db = _get_db()
    col = db["conversations"]
    doc = col.find_one({"session_id": session_id})
    if doc is None:
        doc = {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc),
            "messages": [],
        }
        col.insert_one(doc)
    return doc


def append_message(session_id: str, message: dict, operator: str | None = None) -> None:
    """Push a message dict onto the session's messages array."""
    db = _get_db()
    col = db["conversations"]

    # Auto-title from first user message
    update = {
        "$push": {"messages": message},
        "$setOnInsert": {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc),
            "operator": operator,
        },
    }
    
    # Set title from first user message if not already set
    if message.get("role") == "user":
        update["$setOnInsert"]["title"] = message.get("text", "")[:60]

    # Upsert: create the session if it doesn't exist yet
    col.update_one(
        {"session_id": session_id},
        update,
        upsert=True,
    )


def list_conversations(operator: str | None = None) -> list[dict]:
    """List all conversations, optionally filtered by operator."""
    db = _get_db()
    col = db["conversations"]
    
    query = {}
    if operator:
        query["operator"] = operator
        
    cursor = col.find(
        query,
        {"session_id": 1, "title": 1, "created_at": 1, "operator": 1, "_id": 0}
    ).sort("created_at", -1).limit(50)
    
    # Convert datetime objects to ISO strings for JSON serialization
    results = []
    for doc in cursor:
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        results.append(doc)
        
    return results


def get_messages(session_id: str) -> list[dict]:
    """Return all messages for a session, or an empty list."""
    db = _get_db()
    col = db["conversations"]
    doc = col.find_one({"session_id": session_id})
    if doc is None:
        return []
    return doc.get("messages", [])


def get_recent_context(session_id: str, n: int = 5) -> str:
    """Return the last *n* messages formatted as a conversation context string.

    This is prepended to the LLM prompt so the model understands follow-ups
    like "What about P-101?" after asking about V-204.
    """
    messages = get_messages(session_id)
    if not messages:
        return ""

    recent = messages[-n:]
    lines = []
    for msg in recent:
        role = msg.get("role", "user").upper()
        text = msg.get("text", "")
        # Truncate very long assistant answers to keep context window manageable
        if len(text) > 400:
            text = text[:400] + "..."
        lines.append(f"{role}: {text}")

    return "\n".join(lines)


def get_last_tracked_asset(session_id: str) -> str | None:
    """Return the most recently tracked asset in this session."""
    messages = get_messages(session_id)
    for msg in reversed(messages):
        if msg.get("trackedAsset"):
            return msg["trackedAsset"]
    return None
