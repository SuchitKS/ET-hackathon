"""Compliance agent: structured checklist comparison against OISD/PESO/Factory Act
requirements, plus rule-based gap detection over the graph and LLM summarisation.

Three concrete checks:
1. Regulatory checklist comparison — for each OISD/PESO/Factory Act requirement,
   search the corpus for matching coverage and report covered/partial/not_covered.
2. Dangling references -- a document mentions a doc ID (e.g. "WO-2026-0142")
   that doesn't correspond to any ingested document. This catches decisions
   made informally (emails) that were never formally logged.
3. Keyword flags -- known fragmentation phrases in the corpus surfaced directly.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.entity_extraction import extract_entities
from agents.llm_client import call_llm
from agents.compliance_rules import REGULATORY_REQUIREMENTS

SYSTEM_PROMPT = (
    "You are a compliance assistant for an industrial plant. Given a set of "
    "regulatory checklist results and flagged documentation gaps, summarise them "
    "clearly for an auditor, citing source filenames. Structure your response as:\n"
    "1. REGULATORY COMPLIANCE STATUS (requirement-by-requirement)\n"
    "2. DOCUMENTATION GAPS (dangling references, fragmentation flags)\n"
    "3. RECOMMENDED ACTIONS"
)

FRAGMENTATION_PHRASES = [
    "not found in the maintenance system",
    "documentation gap",
    "not filed",
    "was not filed",
    "no formal work order",
    "pending closure",
    "partially compliant",
]


def _get_unique_docs(vs) -> list:
    """Get unique (parent_doc_id, full_text) pairs from the chunked vector store."""
    seen = set()
    docs = []
    for doc_id, text, parent_id in zip(vs.doc_ids, vs.texts, vs.parent_doc_ids):
        if parent_id not in seen:
            seen.add(parent_id)
            full_text = vs.get_full_text(parent_id)
            docs.append((parent_id, full_text))
    return docs


def run_checklist_comparison(kg, vs) -> list:
    """Compare corpus coverage against regulatory requirements.

    Returns a list of dicts, one per requirement:
    {regulation, clause, requirement, status, matched_text, source_doc, confidence}
    """
    results = []

    for req in REGULATORY_REQUIREMENTS:
        # Search the vector store for this requirement
        search_query = f"{req['regulation']} {req['clause']} {req['requirement']}"
        hits = vs.search(search_query, top_k=3, dedupe_by_parent=True)

        if not hits:
            results.append({
                "regulation": req["regulation"],
                "clause": req["clause"],
                "requirement": req["requirement"],
                "status": "not_covered",
                "matched_text": None,
                "source_doc": None,
                "confidence": 0.0,
            })
            continue

        best_hit = hits[0]
        score = best_hit["score"]

        # Also check if the regulation is explicitly mentioned in the text
        text_lower = best_hit["text"].lower()
        reg_mentioned = req["regulation"].lower() in text_lower

        # Determine coverage status
        if score > 0.3 and reg_mentioned:
            status = "covered"
        elif score > 0.15 or reg_mentioned:
            status = "partial"
        else:
            status = "not_covered"

        # Extract a relevant snippet for the matched text
        matched_snippet = best_hit["text"][:300]

        results.append({
            "regulation": req["regulation"],
            "clause": req["clause"],
            "requirement": req["requirement"],
            "status": status,
            "matched_text": matched_snippet,
            "source_doc": best_hit["doc_id"],
            "confidence": round(score, 3),
        })

    return results


def find_dangling_references(kg, vs) -> list:
    """Documents that reference a doc ID with no corresponding ingested file."""
    known_official_ids = set()
    for data in kg.get_all_documents():
        if data.get("official_id"):
            known_official_ids.add(data["official_id"])

    gaps = []
    seen_refs = set()
    for parent_doc_id, full_text in _get_unique_docs(vs):
        entities = extract_entities(full_text)
        for ref in entities["document_refs"]:
            ref_key = f"{parent_doc_id}:{ref}"
            if ref not in known_official_ids and ref_key not in seen_refs:
                seen_refs.add(ref_key)
                gaps.append({"in_document": parent_doc_id, "dangling_reference": ref})
    return gaps


def find_fragmentation_flags(vs) -> list:
    """Documents whose text contains known fragmentation/gap language."""
    flags = []
    seen = set()
    for parent_doc_id, full_text in _get_unique_docs(vs):
        lower = full_text.lower()
        for phrase in FRAGMENTATION_PHRASES:
            if phrase in lower:
                flag_key = f"{parent_doc_id}:{phrase}"
                if flag_key not in seen:
                    seen.add(flag_key)
                    flags.append({"document": parent_doc_id, "flagged_phrase": phrase})
    return flags


def run_compliance_scan(kg, vs) -> dict:
    checklist = run_checklist_comparison(kg, vs)
    dangling = find_dangling_references(kg, vs)
    flagged = find_fragmentation_flags(vs)

    # Summary counts
    covered = sum(1 for r in checklist if r["status"] == "covered")
    partial = sum(1 for r in checklist if r["status"] == "partial")
    not_covered = sum(1 for r in checklist if r["status"] == "not_covered")

    context_lines = []

    # Checklist results
    context_lines.append("REGULATORY CHECKLIST RESULTS:")
    for r in checklist:
        status_emoji = {"covered": "✅", "partial": "⚠️", "not_covered": "❌"}.get(r["status"], "?")
        context_lines.append(
            f"  {status_emoji} {r['regulation']} §{r['clause']}: {r['requirement']} "
            f"— {r['status'].upper()}"
            + (f" (source: {r['source_doc']}, confidence: {r['confidence']})" if r["source_doc"] else "")
        )

    context_lines.append(f"\nSummary: {covered} covered, {partial} partial, {not_covered} not covered "
                          f"out of {len(checklist)} requirements")

    # Dangling references
    if dangling:
        context_lines.append("\nDANGLING REFERENCES:")
        for d in dangling:
            context_lines.append(f"  - {d['in_document']} references {d['dangling_reference']}, "
                                  f"which has no matching ingested document.")

    # Fragmentation flags
    if flagged:
        context_lines.append("\nFRAGMENTATION FLAGS:")
        for f in flagged:
            context_lines.append(f"  - {f['document']} contains flagged language: \"{f['flagged_phrase']}\"")

    user_prompt = "\n".join(context_lines) + \
                  "\n\nSummarise these as a compliance gap report for an auditor."

    try:
        answer = call_llm(SYSTEM_PROMPT, user_prompt)
    except RuntimeError as e:
        answer = f"[LLM unavailable, showing raw compliance data instead: {e}]\n\n" + "\n".join(context_lines)

    return {
        "answer": answer,
        "checklist": checklist,
        "dangling": dangling,
        "flagged": flagged,
        "summary": {
            "covered": covered,
            "partial": partial,
            "not_covered": not_covered,
            "total_requirements": len(checklist),
        },
    }
