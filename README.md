# STRATA
Industrial knowledge-intelligence prototype — ingest documents, build a linked knowledge graph + vector-backed retrieval, and surface LLM-driven agents (Supervisor → specialist agents) to answer questions, run RCA, and generate work orders.

What problem this solves
- Turns unstructured engineering documents into a searchable, linkable knowledge base and actionable outputs (findings, work orders) by combining document ingestion, vector retrieval, a Neo4j knowledge graph, and LLM-based agents.

Badges / Compatibility
- Python: 3.10+ (repository code uses modern union types like `X | None`)
- Frontend: Node 18+ recommended (Vite + esbuild toolchain)
- License / CI: none detected in this repository

Architecture overview
- Flow: Ingestion → Vector Store + Knowledge Graph → Supervisor → Specialist Agents → Frontend

Mermaid diagram (recommended rendering)
```mermaid
flowchart LR
  A[Documents (PDF / DOCX / P&IDs)] -->|ingest| B[Ingestion Pipeline]
  B --> C[Vector Store (Qdrant / embeddings)]
  B --> D[Knowledge Graph (Neo4j)]
  C --> E[Supervisor / Routing]
  D --> E
  E --> F[Retrieval Agent]
  E --> G[RCA Agent]
  E --> H[Compliance Agent]
  E --> I[Work Order Generator]
  F -->|evidence| J[Assistant Responses]
  G -->|finding / metrics| I
  I --> K[Generated JSON & PDF (generated/)]
  J --> L[Frontend (Vite + React)]
  L -->|SSE / REST| E
```

ASCII fallback diagram
```
[Documents] --> [Ingestion Pipeline] --> { Vector Store (Qdrant) }
                                      \
                                       --> { Knowledge Graph (Neo4j) }
                                                 |
                                                 v
                                           [Supervisor]
                                              |
              --------------------------------+-------------------------
              |               |              |                        |
         [Retrieval]       [RCA]         [Compliance]         [Work Order Generator]
              |               |              |                        |
              +---------------+--------------+------------------------+
                                              |
                                           [Frontend]
```

Key features
- Document ingestion pipeline with format-specific extractors and optional LLM-assisted entity extraction (ingestion/pipeline.py, ingestion/llm_entity_extraction.py).
- Vector-backed retrieval (Qdrant) with chunking, embedding (sentence-transformers) and deduplication (retrieval/vector_store.py).
- Neo4j-backed knowledge graph modeling equipment, documents, failure events, and topology (graph/knowledge_graph.py).
- LLM client wrapper (Grok / xAI-compatible) with JSON parsing + streaming (agents/llm_client.py).
- Supervisor + specialist agents (agents/supervisor.py, agents/retrieval_agent.py, agents/rca_agent.py, agents/compliance_agent.py).
- Work order generator that produces structured JSON and a professional PDF (agents/workorder_generator.py, PDF via reportlab).
- Streaming chat SSE endpoint and per-session conversation persistence in MongoDB (api/chat_store.py).

Repository layout (top-level)
```
agents/                 # LLM-driven agents + supervisor + llm client + workorder generator
api/                    # FastAPI app & HTTP endpoints (api/main.py is entrypoint)
corpus/                 # Corpus and upload dir (used by ingestion)
frontend/               # Vite + React demo app (mock data; seam: frontend/src/lib/api.ts)
graph/                  # Neo4j knowledge graph adapter (graph/knowledge_graph.py)
ingestion/              # Ingestion pipeline & entity extraction
retrieval/              # Vector store adapter & hybrid search (retrieval/vector_store.py)
tests/                  # Tests (if present)
requirements.txt        # Python dependencies
frontend/package.json   # Frontend dependencies & scripts
check_models.py         # Model/schema checking helper
start.ps1               # Windows helper script for dev
generated/              # Runtime: PDF output for generated work orders
```

Prerequisites
- Python 3.10+
- Node 18+ (recommended) for frontend
- Neo4j (optional but required for persistent knowledge graph) — default: bolt://localhost:7687
- Qdrant (optional; vector store) — optional: in-memory fallback available if QDRANT_URL is not set
- MongoDB (for conversation persistence) — required for chat history persistence
- .env at project root to provide credentials (python-dotenv is used)

Setup & run (verified commands)

Backend
```bash
python -m venv .venv
# Unix
source .venv/bin/activate
# Windows PowerShell
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Run the API (confirmed entrypoint: api/main.py)
uvicorn api.main:app --reload --port 8000
```

Frontend (demo)
```bash
cd frontend
npm install
npm run dev
# UI opens at http://localhost:5173 (mock data by default)
```

Quick demo steps
1. Start backend (see Backend steps above). Ensure MONGO_URL, NEO4J, and Qdrant are available if you want full functionality.
2. Build the index and graph:
```bash
curl -X POST http://localhost:8000/ingest
```
3. Query:
```bash
curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" \
  -d '{"query": "What is the history of V-204?"}'
```
4. Generate a work order:
```bash
curl -X POST http://localhost:8000/api/work-order -H "Content-Type: application/json" \
  -d '{"equipment_tag": "PL-07", "description": "Coating reapplication at support point PR-3"}'
```

Frontend integration note
- The frontend currently uses mock data; the seam to swap to live endpoints is frontend/src/lib/api.ts. The backend exposes the endpoints the frontend expects (e.g. /api/graph, /api/chat, /api/chat/stream, /api/documents, /api/documents/upload, /api/work-order, /api/conversations, /api/alerts).

Configuration (exact env var names verified from code)
| Env var | Required? | Purpose |
|---|---:|---|
| XAI_API_KEY | required | LLM API key used by agents/llm_client.py (calls error if missing) |
| XAI_BASE_URL | optional | LLM API base (default: https://api.x.ai/v1) |
| XAI_MODEL | optional | LLM model name (default: grok-3-mini-fast) |
| XAI_VISION_MODEL | optional | Vision model name for image prompts |
| QDRANT_URL | optional | Qdrant endpoint; if absent, code uses in-memory Qdrant |
| QDRANT_API_KEY | optional | Qdrant Cloud API key |
| QDRANT_COLLECTION | optional | Vector collection name (default: suryanagar_docs) |
| EMBEDDING_MODEL | optional | sentence-transformers model name (default: all-MiniLM-L6-v2) |
| NEO4J_URI | optional | Neo4j URI (default: bolt://localhost:7687) |
| NEO4J_USER | optional | Neo4j user (default: neo4j) |
| NEO4J_PASSWORD | optional | Neo4j password (default: password) |
| MONGO_URL | required for chat persistence | MongoDB connection URL for conversation store |

Example usage flow (Supervisor → agent → work order)
- POST /ingest to populate the vector index & Neo4j graph.
- Send a query to /api/chat or /api/chat/stream; Supervisor (agents/supervisor.py) classifies and routes:
  - retrieval -> vector + graph hybrid evidence returned
  - rca -> computes failure metrics and may return a "finding"
  - workorder -> agents/workorder_generator.generate_work_order() produces JSON and a rendered PDF (saved in generated/)
- Generated PDFs are served from /generated/<filename> and downloadable via /download/<filename>.

Current limitations / TODOs (visible in code)
- Frontend defaults to mock data; replace frontend/src/lib/api.ts functions to call the real backend (the file is prepared for this swap).
- No authentication/authorization: CORS is permissive in api/main.py (acceptable for a demo).
- In-memory Qdrant fallback is non-persistent; run Qdrant and set QDRANT_URL / QDRANT_API_KEY for persistence.
- LLM usage depends on XAI_API_KEY; missing key causes runtime errors in LLM calls (agents/llm_client.py raises if XAI_API_KEY is not set).
- Graph layout and the UI will need clustering/virtualization for large graphs (frontend/README.md notes this).

Contributing & license
- No LICENSE or CONTRIBUTING file was found. Add a LICENSE file if you want to open-source the repo or to specify contribution terms.

If you’d like, I can:
- Commit this README.md into the repository for you.
- Add a small docker-compose to spin up Neo4j, Qdrant, and MongoDB for local development.
- Replace frontend mocks (frontend/src/lib/api.ts) with a ready-to-commit version that points at the local backend and includes basic error handling.
