import os
os.environ["QDRANT_URL"] = ""
os.environ["QDRANT_API_KEY"] = ""

from api.main import app
from fastapi.testclient import TestClient
import json

client = TestClient(app)
client.post("/ingest")

print("\n--- Testing Retrieval Intent ---")
resp = client.post("/api/chat", json={"query": "What are the specs for P-101?"})
print(json.dumps(resp.json(), indent=2))

print("\n--- Testing RCA Intent ---")
resp = client.post("/api/chat", json={"query": "why did V-204 fail?"})
print(json.dumps(resp.json(), indent=2))

print("\n--- Testing Compliance Intent ---")
resp = client.post("/api/chat", json={"query": "check compliance"})
print(json.dumps(resp.json(), indent=2))
