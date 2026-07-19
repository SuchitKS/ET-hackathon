import os
os.environ["QDRANT_URL"] = ""
os.environ["QDRANT_API_KEY"] = ""

from api.main import app
from fastapi.testclient import TestClient
import json

client = TestClient(app)
client.post("/ingest")

print("\n--- Testing POST /api/work-order ---")
resp = client.post("/api/work-order", json={
    "equipment_tag": "P-101",
    "description": "Fix the seal leak",
    "priority": "high",
    "requester": "System generated"
})
print(json.dumps(resp.json(), indent=2))
