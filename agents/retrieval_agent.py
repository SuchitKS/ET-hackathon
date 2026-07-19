"""Retrieval agent: hybrid search + LLM synthesis, with source citations
and confidence scores.

If the LLM call fails (e.g. Grok API unreachable), falls back to returning the
raw retrieved evidence so the pipeline still demos end-to-end.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from retrieval.hybrid_search import hybrid_search
from agents.llm_client import call_llm, call_llm_stream

SYSTEM_PROMPT = (
    "You are an industrial knowledge assistant for Suryanagar Refinery. "
    "Answer the question using ONLY the provided source documents. "
    "For every claim, cite the source filename and confidence score in square brackets, "
    "e.g. [wo_2026_0142_v204_corrosion_repair.xlsx (0.95)]. "
    "If the sources don't fully answer the question, say what's missing rather than guessing."
)


def format_context(results: list, max_chars_per_doc: int = 800) -> str:
    blocks = []
    for r in results:
        snippet = r["text"][:max_chars_per_doc]
        source_type = r.get("source", "unknown")
        score = r.get("score", 0)
        blocks.append(
            f"--- Source: {r['doc_id']} ({r['metadata'].get('doc_type', 'unknown')}) "
            f"[match: {source_type}, confidence: {score:.2f}] ---\n{snippet}"
        )
    return "\n\n".join(blocks)


def answer_query(query: str, kg, vs, top_k: int = 8, stream: bool = False):
    results, query_entities = hybrid_search(query, kg, vs, top_k=top_k)

    if not results:
        if stream:
            return {"answer_stream": iter(["No relevant documents found in the corpus for this query."]), "sources": [], "query_entities": query_entities}
        return {
            "answer": "No relevant documents found in the corpus for this query.",
            "sources": [],
            "query_entities": query_entities,
        }

    context = format_context(results)
    user_prompt = f"SOURCES:\n{context}\n\nQUESTION: {query}\n\nANSWER (with citations and confidence scores):"

    if stream:
        def _safe_stream():
            # call_llm_stream() is a generator function: calling it never runs
            # a single line of its body (not even the API-key check) — it just
            # returns a generator object. The real work, and any RuntimeError
            # it raises, only happens once this is iterated, which happens
            # later inside the SSE loop in api/main.py. Catching here, around
            # the actual iteration, is what makes the fallback reachable.
            try:
                yield from call_llm_stream(SYSTEM_PROMPT, user_prompt)
            except RuntimeError as e:
                yield (
                    f"[LLM unavailable, showing raw retrieved evidence instead: {e}]\n\n"
                    + "\n\n".join(
                        f"[{r['doc_id']} ({r.get('score', 0):.2f})] {r['text'][:300]}..."
                        for r in results
                    )
                )

        return {
            "answer_stream": _safe_stream(),
            "sources": [{"doc_id": r["doc_id"], "confidence": round(r.get("score", 0), 3), "match_type": r.get("source", "unknown")} for r in results],
            "query_entities": query_entities,
        }

    try:
        answer = call_llm(SYSTEM_PROMPT, user_prompt)
    except RuntimeError as e:
        # LLM unavailable -- fall back to raw evidence so the demo still works
        answer = (
            f"[LLM unavailable, showing raw retrieved evidence instead: {e}]\n\n"
            + "\n\n".join(
                f"[{r['doc_id']} ({r.get('score', 0):.2f})] {r['text'][:300]}..."
                for r in results
            )
        )

    return {
        "answer": answer,
        "sources": [
            {"doc_id": r["doc_id"], "confidence": round(r.get("score", 0), 3),
             "match_type": r.get("source", "unknown")}
            for r in results
        ],
        "query_entities": query_entities,
    }
