import os
os.environ["QDRANT_URL"] = ""
os.environ["QDRANT_API_KEY"] = ""

from api.main import app
from fastapi.testclient import TestClient
import json

client = TestClient(app)
client.post("/ingest")

docs = client.get("/api/documents").json()
print(f"Documents count: {len(docs)}")
print("Sample document:", json.dumps(docs[0], indent=2))

print("\nUploading test document...")
with open("test_upload.txt", "w") as f:
    f.write("This is a test maintenance report for V-204.")

with open("test_upload.txt", "rb") as f:
    resp = client.post("/api/documents/upload", files={"file": ("test_upload.txt", f, "text/plain")})

print("Upload response:", json.dumps(resp.json(), indent=2))

docs_after = client.get("/api/documents").json()
print(f"\nDocuments count after upload: {len(docs_after)}")
print("Is new file in docs?", any(d["name"] == "test_upload.txt" for d in docs_after))

graph = client.get("/api/graph").json()
print("Is new file in graph nodes?", any(n["id"] == "test_upload.txt" for n in graph["nodes"]))
