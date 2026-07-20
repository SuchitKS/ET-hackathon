"""Architecture agent: answer questions about process flow topology,
equipment connections, and P&ID structure using the CONNECTS_TO edges
in the knowledge graph.

Handles queries like:
- "What is downstream of V-204?"
- "What connects to E-305?"
- "Trace the flow from the tank to the distillation tower"
- "What safety devices are on C-110?"
"""
import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.entity_extraction import extract_entities
from agents.llm_client import call_llm

SYSTEM_PROMPT = (
    "You are a process engineering assistant for Suryanagar Refinery. "
    "Given equipment connection data from P&ID drawings, answer the user's "
    "question about process flow, equipment connectivity, or plant architecture. "
    "ALWAYS cite the P&ID drawing filename as the source. "
    "Present connections as a clear flow path using arrows (→) to show direction.\n\n"
    "CRITICAL: You MUST format your response using EXACTLY these Markdown headings:\n"
    "### Connection Summary\n"
    "(Brief answer to the question)\n\n"
    "### Flow Path\n"
    "(Equipment connections shown as a directed path)\n\n"
    "### P&ID Source\n"
    "(Which drawing(s) this information comes from)"
)


def _detect_direction(query: str) -> str:
    """Detect whether the user is asking about upstream or downstream flow."""
    lower = query.lower()
    upstream_kw = ["upstream", "feeds into", "what feeds", "flow to", "upstream of",
                   "before", "input to", "supply to"]
    downstream_kw = ["downstream", "connected to", "connects to", "flow from",
                     "downstream of", "after", "output of", "trace the flow"]

    up_score = sum(1 for kw in upstream_kw if kw in lower)
    down_score = sum(1 for kw in downstream_kw if kw in lower)

    if up_score > down_score:
        return "upstream"
    elif down_score > up_score:
        return "downstream"
    # Default: search both directions
    return "both"


def _get_pid_summaries(tag: str, vs) -> list:
    """Find P&ID diagram summaries mentioning this equipment tag."""
    summaries = []
    try:
        # Search for the tag in the vector store, filtered to P&ID docs
        results = vs.search(tag, top_k=5)
        for r in results:
            meta = r.get("metadata", {})
            if meta.get("doc_type") == "pid_drawing":
                summaries.append({
                    "doc_id": r.get("doc_id", "unknown"),
                    "text": r.get("text", "")[:500],
                })
    except Exception:
        pass
    return summaries


def run_architecture_query(query: str, kg, vs) -> dict:
    """Answer an architecture/connectivity question using graph topology.

    Steps:
    1. Extract equipment tag(s) from the query
    2. Detect direction (upstream/downstream/both)
    3. Query the knowledge graph for connected equipment
    4. Pull P&ID diagram summaries for context
    5. Synthesise a natural-language answer via LLM
    """
    # Extract equipment tags from the query
    query_entities = extract_entities(query)
    equipment_tags = query_entities["equipment"]

    if not equipment_tags:
        return {
            "answer": (
                "I couldn't identify a specific equipment tag in your question. "
                "Please mention an equipment tag (e.g., V-204, P-101, E-305, C-110) "
                "so I can look up its connections in the P&ID drawings."
            ),
            "sources": [],
        }

    tag = equipment_tags[0]
    direction = _detect_direction(query)

    # Query the graph for connections
    downstream = []
    upstream = []
    if direction in ("downstream", "both"):
        downstream = kg.get_downstream(tag, hops=3)
    if direction in ("upstream", "both"):
        upstream = kg.get_upstream(tag, hops=3)

    # Get P&ID document summaries mentioning this tag
    pid_summaries = _get_pid_summaries(tag, vs)

    # Also get documents mentioning this equipment for source citations
    source_docs = kg.documents_mentioning(tag)
    pid_sources = [d for d in source_docs if d.startswith("pid_")]

    # Build context for the LLM
    context_parts = [f"Equipment tag: {tag}", f"Query direction: {direction}"]

    if downstream:
        flow = " → ".join([tag] + [d["tag"] for d in downstream])
        context_parts.append(f"\nDownstream equipment (from graph CONNECTS_TO edges):")
        context_parts.append(f"  Flow path: {flow}")
        for d in downstream:
            context_parts.append(f"  - {d['tag']} ({d['hops']} hop(s) away)")

    if upstream:
        flow = " → ".join([u["tag"] for u in reversed(upstream)] + [tag])
        context_parts.append(f"\nUpstream equipment (from graph CONNECTS_TO edges):")
        context_parts.append(f"  Flow path: {flow}")
        for u in upstream:
            context_parts.append(f"  - {u['tag']} ({u['hops']} hop(s) away)")

    if not downstream and not upstream:
        context_parts.append(
            "\nNo CONNECTS_TO edges found for this equipment in the graph. "
            "The P&ID may not have been ingested yet, or this equipment has "
            "no recorded connections."
        )

    if pid_summaries:
        context_parts.append("\nP&ID diagram summaries mentioning this equipment:")
        for ps in pid_summaries:
            context_parts.append(f"  Source: {ps['doc_id']}")
            context_parts.append(f"  {ps['text']}")

    if pid_sources:
        context_parts.append(f"\nP&ID source drawings: {', '.join(pid_sources)}")

    context = "\n".join(context_parts)

    user_prompt = (
        f"USER QUESTION: {query}\n\n"
        f"GRAPH DATA:\n{context}\n\n"
        f"Answer the user's question about equipment connectivity and process flow "
        f"based on the graph data above. Cite the P&ID drawing filename(s) as sources."
    )

    try:
        answer = call_llm(SYSTEM_PROMPT, user_prompt)
    except RuntimeError as e:
        # LLM unavailable — return raw graph data as the answer
        answer = (
            f"[LLM unavailable: {e}]\n\n"
            f"### Raw Graph Data for {tag}\n\n"
        )
        if downstream:
            answer += f"**Downstream:** {' → '.join([tag] + [d['tag'] for d in downstream])}\n\n"
        if upstream:
            answer += f"**Upstream:** {' → '.join([u['tag'] for u in reversed(upstream)] + [tag])}\n\n"
        if pid_sources:
            answer += f"**Sources:** {', '.join(pid_sources)}\n"

    return {
        "answer": answer,
        "sources": pid_sources or source_docs,
        "downstream": downstream,
        "upstream": upstream,
    }
