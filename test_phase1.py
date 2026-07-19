import os
from dotenv import load_dotenv
load_dotenv()
os.environ["QDRANT_URL"] = ""
os.environ["QDRANT_API_KEY"] = ""

from api.main import app
from fastapi.testclient import TestClient
import json

client = TestClient(app)
client.post("/ingest")
graph = client.get("/api/graph").json()

print(f"Nodes: {len(graph.get('nodes', []))}")
print(f"Edges: {len(graph.get('edges', []))}")
if graph.get('nodes'):
    print("Sample Node:", json.dumps(graph['nodes'][0], indent=2))
if graph.get('edges'):
    print("Sample Edge:", json.dumps(graph['edges'][0], indent=2))
