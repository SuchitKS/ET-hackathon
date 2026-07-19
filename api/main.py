"""FastAPI app: exposes /ingest, /query, /generate-workorder, and /health endpoints.

Run locally with:
    uvicorn api.main:app --reload --port 8000

Then:
    curl -X POST http://localhost:8000/ingest
    curl -X POST http://localhost:8000/query -H "Content-Type: application/json" \\
         -d '{"query": "What is the history of V-204?"}'
    curl -X POST http://localhost:8000/generate-workorder -H "Content-Type: application/json" \\
         -d '{"equipment_tag": "PL-07", "description": "Coating reapplication at support point PR-3"}'
"""
import sys
import os
from dotenv import load_dotenv
load_dotenv()

import uuid
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
# pyrefly: ignore [missing-import]
from starlette.requests import Request
from pydantic import BaseModel
from typing import Optional
import shutil
import json
import traceback

from ingestion.pipeline import ingest_corpus, ingest_single_file
from ingestion.entity_extraction import extract_entities
from agents.supervisor import route_query
from agents.workorder_generator import (
    generate_work_order, render_work_order_json, render_work_order_pdf, GENERATED_DIR,
)

app = FastAPI(title="Suryanagar Refinery Knowledge Intelligence API")

# CORS — allow any origin for hackathon demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Any unhandled exception raised inside a route (a Neo4j hiccup, a missing
# Qdrant collection, a bad LLM call, ...) would otherwise be caught by
# Starlette's outermost error middleware, which sits *outside* CORSMiddleware
# — so the resulting 500 goes out with no Access-Control-Allow-Origin header,
# and the browser reports it as a CORS failure instead of the real error.
# Registering a handler here means FastAPI's own ExceptionMiddleware (which
# sits *inside* CORSMiddleware) catches it instead, so the response flows
# back out through CORS normally and the frontend gets a real, readable
# error message instead of a misleading "blocked by CORS policy".
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": f"{type(exc).__name__}: {exc}"},
    )
@app.on_event("shutdown")
async def shutdown_event():
    if STATE["kg"] is not None:
        STATE["kg"].close()

CORPUS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "corpus")

# Serve generated PDFs as static files
os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")

from graph.knowledge_graph import KnowledgeGraph
from retrieval.vector_store import VectorStore

# Instantiate drivers immediately so they connect to the persistent databases
STATE = {
    "kg": KnowledgeGraph(),
    "vs": VectorStore()
}

class QueryRequest(BaseModel):
    query: str


class WorkOrderRequest(BaseModel):
    equipment_tag: str
    description: str
    priority: Optional[str] = "medium"
    requester: Optional[str] = "System Generated"


@app.post("/ingest")
def ingest():
    kg, vs, report = ingest_corpus(CORPUS_DIR)
    STATE["kg"] = kg
    STATE["vs"] = vs
    return {"status": "ok", "summary": kg.summary(), "files_ingested": len(report)}


@app.get("/api/graph")
def get_graph():
    if STATE["kg"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}
    return STATE["kg"].to_graph_data()


@app.get("/api/dashboard")
def get_dashboard():
    if STATE["kg"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}
    return STATE["kg"].get_dashboard_metrics()


@app.get("/api/alerts")
def get_alerts():
    return [
        {
            "id": "alert-1",
            "type": "warning",
            "message": "High probability of seal failure on P-102 within 72 hours based on vibration anomalies and maintenance history.",
            "asset": "P-102"
        },
        {
            "id": "alert-2",
            "type": "info",
            "message": "Upcoming compliance audit for V-204 in 14 days. 2 inspection documents missing.",
            "asset": "V-204"
        }
    ]


@app.get("/api/documents")
def get_documents():
    docs = []
    # If the database is completely empty (no nodes), this will just return an empty array
    for data in STATE["kg"].get_all_documents():
        node = data["id"]
        dt = data.get("doc_type")
        frontend_kind = "other"
        if dt == "work_order":
            frontend_kind = "work_order"
        elif dt == "inspection_report":
            frontend_kind = "inspection"
        elif dt == "sop_permit":
            frontend_kind = "procedure"
        elif dt == "pid_drawing":
            frontend_kind = "pid"
            
        docs.append({
            "id": node,
            "name": data.get("filename", node),
            "kind": frontend_kind,
            "status": "linked",
            "uploadedAt": "2026-07-18T10:00:00Z",
            "sizeKb": 150
        })
    return docs


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if STATE["kg"] is None or STATE["vs"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}
        
    upload_dir = os.path.join(CORPUS_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    filepath = os.path.join(upload_dir, file.filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc_type = "incident_report"
    lower_name = file.filename.lower()
    if "wo" in lower_name or "work" in lower_name:
        doc_type = "work_order"
    elif "insp" in lower_name:
        doc_type = "inspection_report"
    elif "sop" in lower_name or "permit" in lower_name:
        doc_type = "sop_permit"
    elif "pid" in lower_name:
        doc_type = "pid_drawing"
        
    # We pass use_llm=False for speed in synchronous endpoint
    ingest_single_file(filepath, doc_type, STATE["kg"], STATE["vs"], use_llm=False)
    
    frontend_kind = "other"
    if doc_type == "work_order":
        frontend_kind = "work_order"
    elif doc_type == "inspection_report":
        frontend_kind = "inspection"
    elif doc_type == "sop_permit":
        frontend_kind = "procedure"
    elif doc_type == "pid_drawing":
        frontend_kind = "pid"
    
    return {
        "id": file.filename,
        "name": file.filename,
        "kind": frontend_kind,
        "status": "linked",
        "uploadedAt": "2026-07-18T10:00:00Z",
        "sizeKb": 150
    }


@app.post("/api/chat")
def chat(req: QueryRequest):
    if STATE["kg"] is None or STATE["vs"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}

    start_time = time.time()
    
    # route_query returns a dict containing answer, intent, sources, etc.
    raw_result = route_query(req.query, STATE["kg"], STATE["vs"])
    
    latency_ms = int((time.time() - start_time) * 1000)
    intent = raw_result.get("intent", "retrieval")
    
    agent = intent
    if intent == "retrieval_fallback":
        agent = "retrieval"
        
    trace_summary = f"Routed to {agent.upper()} agent"
    if agent == "workorder":
        trace_summary += " \u2014 generated work order."
    elif agent == "rca":
        trace_summary += " \u2014 traversed failure history and computed metrics."
    elif agent == "compliance":
        trace_summary += " \u2014 scanned equipment against compliance checklists."
    else:
        trace_summary += " \u2014 queried hybrid vector/graph index."
        
    citations = []
    seen_docs = set()
    
    def get_snippet(doc_id):
        for i, parent_id in enumerate(STATE["vs"].parent_doc_ids):
            if parent_id == doc_id:
                return STATE["vs"].texts[i][:150]
        return "Source document snippet..."

    sources_list = raw_result.get("sources", [])
    if isinstance(sources_list, list):
        for s in sources_list:
            if isinstance(s, dict):
                doc_id = s.get("doc_id")
            else:
                doc_id = s
            if doc_id and doc_id not in seen_docs:
                seen_docs.add(doc_id)
                citations.append({
                    "id": doc_id,
                    "label": doc_id,
                    "snippet": get_snippet(doc_id)
                })
                
    if "checklist" in raw_result:
        for item in raw_result["checklist"]:
            doc_id = item.get("source_doc")
            if doc_id and doc_id not in seen_docs:
                seen_docs.add(doc_id)
                citations.append({
                    "id": doc_id,
                    "label": doc_id,
                    "snippet": get_snippet(doc_id)
                })

    finding = None
    if agent == "rca" and "metrics" in raw_result:
        metrics = raw_result["metrics"]
        headline = "No incident patterns found"
        if metrics.get("recurring_patterns"):
            p = metrics["recurring_patterns"][0]
            headline = f"Recurring {p['failure_mode']} ({p['count']} occurrences)"
            
        finding = {
            "headline": headline,
            "metricValue": str(metrics.get("total_downtime_hours", 0)),
            "metricLabel": "hours downtime",
            "detail": f"Total impact: {metrics.get('total_labour_hours', 0)} labour hours, {metrics.get('incident_count', 0)} total incidents."
        }
        
    chat_response = {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "agent": agent,
        "latencyMs": latency_ms,
        "text": raw_result.get("answer", ""),
        "citations": citations,
        "timestamp": datetime.now().isoformat() + "Z",
        "traceSummary": trace_summary
    }
    
    # If the work order generator created a PDF, attach the URL
    if raw_result.get("pdf_path"):
        filename = os.path.basename(raw_result["pdf_path"])
        chat_response["text"] += f"\n\n[Download Work Order PDF](/generated/{filename})"

    if finding:
        chat_response["finding"] = finding
        
    return chat_response


@app.post("/api/chat/stream")
def chat_stream(req: QueryRequest):
    if STATE["kg"] is None or STATE["vs"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}

    start_time = time.time()
    raw_result = route_query(req.query, STATE["kg"], STATE["vs"], stream=True)
    latency_ms = int((time.time() - start_time) * 1000)
    
    intent = raw_result.get("intent", "retrieval")
    agent = "retrieval" if intent == "retrieval_fallback" else intent

    trace_summary = f"Routed to {agent.upper()} agent"
    if agent == "workorder":
        trace_summary += " \u2014 generated work order."
    elif agent == "rca":
        trace_summary += " \u2014 traversed failure history and computed metrics."
    elif agent == "compliance":
        trace_summary += " \u2014 scanned equipment against compliance checklists."
    else:
        trace_summary += " \u2014 queried hybrid vector/graph index."

    entities = extract_entities(req.query)
    tracked_asset = entities["equipment"][0] if entities["equipment"] else None

    citations = []
    seen_docs = set()
    
    def get_snippet(doc_id):
        for i, parent_id in enumerate(STATE["vs"].parent_doc_ids):
            if parent_id == doc_id:
                return STATE["vs"].texts[i][:150]
        return "Source document snippet..."

    sources_list = raw_result.get("sources", [])
    if isinstance(sources_list, list):
        for s in sources_list:
            doc_id = s.get("doc_id") if isinstance(s, dict) else s
            if doc_id and doc_id not in seen_docs:
                seen_docs.add(doc_id)
                citations.append({
                    "id": doc_id, "label": doc_id, "snippet": get_snippet(doc_id)
                })

    finding = None
    if agent == "rca" and "metrics" in raw_result:
        metrics = raw_result["metrics"]
        headline = "No incident patterns found"
        if metrics.get("recurring_patterns"):
            p = metrics["recurring_patterns"][0]
            headline = f"Recurring {p['failure_mode']} ({p['count']} occurrences)"
            
        finding = {
            "headline": headline,
            "metricValue": str(metrics.get("total_downtime_hours", 0)),
            "metricLabel": "hours downtime",
            "detail": f"Total impact: {metrics.get('total_labour_hours', 0)} labour hours, {metrics.get('incident_count', 0)} total incidents."
        }

    def generate_chunks():
        # First yield the metadata so the UI can set up the message
        meta = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "agent": agent,
            "latencyMs": latency_ms,
            "citations": citations,
            "timestamp": datetime.now().isoformat() + "Z",
            "traceSummary": trace_summary
        }
        if tracked_asset:
            meta["trackedAsset"] = tracked_asset
        if finding:
            meta["finding"] = finding

        yield f"data: {json.dumps({'meta': meta})}\n\n"

        # Once we're here, the response has already started (status 200 +
        # headers are committed) — an exception raised past this point can't
        # turn into a clean 500 anymore, it would just cut the connection and
        # leave the frontend with a silently truncated answer. Catch it and
        # send a visible note instead.
        try:
            if "answer_stream" in raw_result:
                for chunk in raw_result["answer_stream"]:
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
            else:
                # Fallback if agent doesn't stream (e.g. rca, compliance)
                yield f"data: {json.dumps({'text': raw_result.get('answer', '')})}\n\n"
        except Exception as e:
            traceback.print_exc()
            yield f"data: {json.dumps({'text': f'\\n\\n_The response was interrupted: {type(e).__name__}: {e}_'})}\n\n"
            
        if raw_result.get("pdf_path"):
            filename = os.path.basename(raw_result["pdf_path"])
            text_str = f"\\n\\n[Download Work Order PDF](/generated/{filename})"
            yield f"data: {json.dumps({'text': text_str})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")


@app.post("/query")
def query(req: QueryRequest):
    if STATE["kg"] is None or STATE["vs"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}

    result = route_query(req.query, STATE["kg"], STATE["vs"])

    # If a PDF was generated, convert the local path to a download URL
    if result.get("pdf_path"):
        filename = os.path.basename(result["pdf_path"])
        result["pdf_url"] = f"/generated/{filename}"

    return result


@app.post("/api/work-order")
def create_work_order(req: WorkOrderRequest):
    if STATE["kg"] is None or STATE["vs"] is None:
        return {"error": "Corpus not ingested yet. Call POST /ingest first."}

    wo_data = generate_work_order(
        equipment_tag=req.equipment_tag,
        description=req.description,
        priority=req.priority,
        requester=req.requester,
        kg=STATE["kg"],
        vs=STATE["vs"],
    )

    wo_json = render_work_order_json(wo_data)
    try:
        pdf_path = render_work_order_pdf(wo_data)
        pdf_filename = os.path.basename(pdf_path)
        pdf_url = f"/generated/{pdf_filename}"
    except RuntimeError:
        pdf_path = None
        pdf_url = None

    return {
        "id": wo_data["wo_number"],
        "asset": req.equipment_tag,
        "title": wo_data.get("title", f"Work Order for {req.equipment_tag}"),
        "rootCause": wo_data.get("description", req.description),
        "recommendedAction": " \u2022 " + "\n \u2022 ".join(wo_data.get("steps", [])[:3]),
        "downtimeAvoidedHrs": 24, # Static fallback or parse from finding
        "linkedDocs": wo_data.get("related_documents", []),
        "generatedAt": datetime.now().strftime("%Y-%m-%d"),
        "pdfUrl": pdf_url,
    }


@app.get("/download/{filename}")
def download_pdf(filename: str):
    """Direct PDF download endpoint."""
    filepath = os.path.join(GENERATED_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="application/pdf", filename=filename)
    return {"error": "File not found"}


@app.get("/health")
def health():
    return {"status": "ok", "ingested": STATE["kg"] is not None}
