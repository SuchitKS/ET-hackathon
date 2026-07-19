# STRATA — Industrial Knowledge Intelligence

Frontend only, built ahead of the backend so the team has something real to plug into.
Runs entirely on mock data right now — every place that will eventually call the API is
already isolated in one file (see "Connecting the backend" below).

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. Three views, switchable from the top nav:

- **Ask** — chat interface. Preloaded with the Pump P-102 scenario. Type a new question and
  watch it live: a Supervisor node classifies intent, routes to one of the three specialist
  agents (Retrieval / RCA / Compliance), that agent "works," then the cited answer lands.
  Every past answer has a "View agent routing" toggle to replay the same trace. The RCA
  finding includes a working "Generate work order" flow with a full document preview.
- **Graph** — the interactive knowledge graph, laid out as a deterministic radial diagram
  (equipment centered, everything else on rings by connection distance — not a bouncing
  force simulation). Click any node to see its details and light up its connections.
- **Documents** — drag-and-drop upload zone plus the list of already-ingested documents,
  each showing which pipeline stage it's at (queued → extracting → linked to graph). Drop
  a file and watch it move through the same stages.

## Project structure

```
src/
├── types/index.ts          # Shared TypeScript interfaces — the contract with the backend.
│                              Match your FastAPI response models to these.
├── data/mockData.ts         # Pump P-102 scenario: graph nodes/edges, chat transcript,
│                              work order, ingested document list.
├── lib/
│   ├── api.ts                # <-- THE SEAM. Every function returns mock data today.
│   │                           Swap each for a real fetch() call — components don't change.
│   └── utils.ts               # predictAgent() — keyword stand-in for the real Supervisor's
│                                LLM classification call, drives the live routing animation.
├── hooks/
│   └── useGraphLayout.ts    # Deterministic BFS/radial layout — turns nodes+edges into x/y.
├── components/
│   ├── layout/TopNav.tsx     # Top bar, view switcher
│   ├── ask/                   # Chat thread, message bubbles, citations, the finding card,
│   │                            and AgentPipeline — the Supervisor → agents trace visual
│   ├── graph/                  # Graph canvas, node chips, edge rendering, detail panel
│   ├── documents/                # Upload dropzone, ingestion status list
│   ├── workorder/                 # Generated work-order modal
│   └── ui/                         # Shared primitives (Button, Tag)
```

## Connecting the backend

Everything funnels through `src/lib/api.ts` — each function has a `TODO` marking exactly
what to replace:

| Function | Replace with |
|---|---|
| `fetchGraph()` | `GET /api/graph` → Neo4j query result, shaped as `GraphData` |
| `fetchChatHistory()` | `GET /api/chat/history` |
| `sendQuestion(text)` | `POST /api/chat` → routed through the Supervisor → specialist agents |
| `generateWorkOrder()` | `POST /api/work-order` → RCA agent's finding, formatted |
| `fetchDocuments()` | `GET /api/documents` |
| `uploadDocument(file)` | `POST /api/documents/upload` (multipart) — should return immediately with `status: "queued"`; wire up polling or a websocket for status updates in place of `simulateIngestion()` in `DocumentsView.tsx` |

Response shapes are already defined in `src/types/index.ts` — if the backend returns JSON
matching those interfaces, no component code changes, only `api.ts`.

`predictAgent()` in `src/lib/utils.ts` is a keyword stand-in for the Supervisor's real LLM
classification call — once `/api/chat` returns the actually-routed agent, the live pipeline
animation can target that instead (the component already accepts `agent` as a prop either way).

## Design notes

- Dark, warm, technical — a tool for engineers, not a consumer app — but typography and
  color are deliberately restrained: normal-case sans throughout, monospace reserved only
  for genuine data (equipment tags, doc IDs, timestamps, the big numeral), not shouted in
  caps everywhere. That was a real note from an earlier pass — worth keeping in mind if you
  extend this: mono + uppercase + letter-spacing everywhere reads as trying too hard, not
  as premium.
- The knowledge graph uses a hand-built radial layout, not a force simulation — deterministic
  positions avoid the label-overlap problems a physics-based layout produces at this node
  density, and it reads more like a designed schematic.
- The agent pipeline trace (`AgentPipeline.tsx`) is the centerpiece feature: it's what makes
  the Supervisor → specialist-agent routing actually visible instead of just being an
  architecture-diagram claim. Worth keeping front and center in the demo.
- Fully keyboard-focusable, respects `prefers-reduced-motion`.

## Known limits (fine for a hackathon, worth knowing)

- Graph layout is recomputed on data load, not incrementally — fine at this node count,
  would need clustering/virtualization well before a few hundred nodes.
- No auth, no persistence, no real file parsing on upload — wire that up alongside the
  real backend.
- `predictAgent()` is a simple keyword match, not a real classifier — swap it out once the
  real Supervisor endpoint exists so the UI reflects the model's actual routing decision.
